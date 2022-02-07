'use strict'
const express = require('express')
const multer = require('multer')
const fs = require('fs')
const { v4: uuidv4 } = require('uuid')
const ts = require('../controllers/apihelper').tradeshiftApi()
const obc = require('../controllers/apihelper').bugyoApi()
const constants = require('../constants')
const customer = require('./helpers/customer')
const documents = require('./helpers/documents')
const billIssue = require('./helpers/billIssue')
const formats = require('./helpers/formats')
const messages = require('./helpers/messages')
const {
  User,
  Tenant,
  Format,
  Item,
  Error,
  Sequelize: { Op }
} = require('../models')
const { handler, currentTenantId } = require('./helpers/util')
require('date-utils')

// CSRF対策
const csrf = require('csurf')
const csrfProtection = csrf({ cookie: false })

const middleware = require('./helpers/middleware')

/**
 * 数値を指定の桁数まで0埋めした文字列として書式化する
 */
const zeroPadding = (value, length) => {
  return ('0'.repeat(length) + value).slice(-length)
}

/**
 * 請求Noを0埋め6桁に正規化する
 */
const normalizeInvoiceId = (id) => zeroPadding(id, constants.obc.ID_LENGTH)

/**
 * 発行済請求Noの次の番号を取得する
 */
const getUnissuedNo = async (tenantId) => {
  const user = await User.findByPk(tenantId)
  const last = user?.lastInvoiceNo
  return last && normalizeInvoiceId(Number.parseInt(last) + 1)
}

/**
 * Tradeshiftの接続済みテナントと紐付けされた得意先コードを取得する
 */
const getCustomerIds = async (ctx) => {
  const searchBody = customer.searchBody({ linkingOnly: true })
  const customers = await obc.exportCustomer(ctx, searchBody)
  return customer.convertFrom(customers).map((c) => c.customerId)
}

/**
 * 指定された得意先を請求先とする未発行請求Noを取得する
 */
const getInvoiceIds = async (ctx, customers, from, to) => {
  if (customers.length == 0) {
    return []
  }
  const searchBody = billIssue.searchBody({ from, to, customers, noOnly: true })
  const rawBills = await obc.exportBillIssue(ctx, searchBody)
  return billIssue.extractIds(rawBills)
}

/**
 * 前回エラーの請求Noを取得する
 */
const getErrors = async (tenantId, from, to) => {
  let condition = {
    userUuid: tenantId
  }
  let narrowing = null
  if (from && to) {
    narrowing = { [Op.between]: [from, to] }
  } else if (from) {
    narrowing = { [Op.gte]: from }
  } else if (to) {
    narrowing = { [Op.lte]: to }
  }

  if (narrowing) {
    condition = {
      [Op.and]: [condition, { invoiceNo: narrowing }]
    }
  }
  const errors = await Error.findAll({ where: condition })
  return Object.fromEntries(errors.map((entry) => [entry.invoiceNo, entry.message]))
}

/**
 * 得意先毎に紐付けされたフォーマットを反映する変換器を取得する
 */
const getConverters = async (ctx, userUuid) => {
  const converters = {}
  for (let format of await formats.list(ctx, true)) {
    converters[format.id] = billIssue.converter((key) => format.Items.some((item) => item.key == key))
  }
  const tenants = await Tenant.findAll({ where: { userUuId: userUuid } })

  const result = {}
  for (let tenant of tenants) {
    result[tenant.tenantUuid] = converters[tenant.formatId]
  }
  return result
}

/**
 * Tradeshiftから既存文書一覧を取得する
 */
const findAllDocuments = async (ctx) => {
  const result = {}

  let limit = constants.system.MAX_PAGE_SIZE
  let page = 0
  let totalPages = 1
  do {
    let documents = await ts.findDocuments(ctx, { page, limit })
    totalPages = documents.numPages
    page = documents.pageId + 1
    for (let document of documents.Document) {
      result[document.ID] = {
        outbox: document.State != 'DRAFT',
        created: false,
        documentId: document.DocumentId
      }
    }
  } while (page < totalPages)

  return result
}

/**
 * 添付ファイルのダウンロードURLを返す
 */
const attachmentUrl = (documentId, item) => {
  return `${ts.baseUrl()}/documents/attachment/${documentId}?name=${encodeURIComponent(
    item.Name
  )}&type=${encodeURIComponent(item.ContentType)}`
}

/**
 * 指定された文書に添付されたファイル一覧を取得する
 */
const getAttachments = async (ctx, documentId) => {
  const attachments = await ts.getAttachments(ctx, documentId)
  return attachments.DocumentAttachment.filter((item) => item.Type == 'attachment').map((item) => {
    return {
      name: item.Name,
      url: attachmentUrl(documentId, item)
    }
  })
}

/**
 * 一括発行の対象となる請求書を数える
 */
const countUnissued = (bills, converters, saved) => {
  return bills.reduce((result, bill) => {
    if (converters[bill.customerId] && !saved[bill.invoiceId]?.outbox) {
      return result + 1
    }
    return result
  }, 0)
}

/**
 * 奉行クラウドからTradeshiftへ請求書データを取り込む
 */
const importInvoices = async (ctx, tenantId, invoiceIds) => {
  if (invoiceIds.length == 0) {
    return { items: [] }
  }
  const searchBody = billIssue.searchBody({ invoiceIds, issueDate: new Date() })
  const rawBills = await obc.exportBillIssue(ctx, searchBody)
  const bills = billIssue.build(rawBills)
  const converters = await getConverters(ctx, tenantId)
  const saved = await findAllDocuments(ctx)

  // 請求書番号の昇順にソート
  bills.sort((lhs, rhs) => lhs.invoiceId.localeCompare(rhs.invoiceId))

  let items = []
  for (let bill of bills) {
    if (items.length == constants.system.MAX_SEND_SIZE) {
      return { items, count: countUnissued(bills, converters, saved) }
    }
    const convert = converters[bill.customerId]
    if (!convert) {
      continue
    }
    const document = documents.create(convert(bill), tenantId)
    const { documentId, outbox, created } = saved[bill.invoiceId] ?? {
      outbox: false,
      created: true,
      documentId: uuidv4()
    }
    let attachments = null
    let error = null
    if (outbox) {
      continue
    }
    try {
      await ts.updateDocument(ctx, documentId, document)
      if (!created) {
        attachments = await getAttachments(ctx, documentId)
      }
    } catch (e) {
      error = e.message
    }

    items.push({
      documentId: documentId,
      invoiceId: bill.invoiceId,
      issueDate: bill.issueDate,
      dueDate: bill.dueDate,
      totalAmount: bill.totalAmount,
      customerName: bill.customerName,
      attachments,
      error
    })
  }
  return { items }
}

/**
 * falsy でない小さな方の引数を返す
 */
const min = (lhs, rhs) => {
  if (lhs && rhs) {
    return lhs < rhs ? lhs : rhs
  }
  return lhs || rhs
}

const renderData = async (ctx, from, to) => {
  const tenantId = currentTenantId(ctx)
  const unissuedNo = await getUnissuedNo(tenantId)
  const popupNotice = !(from || to || unissuedNo)
  const unissuedFrom = unissuedNo || normalizeInvoiceId(1)
  const customerIds = await getCustomerIds(ctx)
  const targetIds = await getInvoiceIds(ctx, customerIds, from || unissuedFrom, to)
  const errors = await getErrors(tenantId, from, to)
  const allIds = [...new Set([...targetIds, ...Object.keys(errors)])].sort()
  const { items, count } = await importInvoices(ctx, tenantId, allIds)

  const displayFrom = from || min(items[0]?.invoiceId, unissuedFrom)
  const displayTo = to || items[items.length - 1]?.invoiceId || displayFrom
  const notice = []
  if (count > constants.system.MAX_SEND_SIZE) {
    notice.push({
      message: `対象の請求書が多いので最初の${constants.system.MAX_SEND_SIZE}件を表示しています。(全${count}件)`
    })
  }

  return {
    csrfToken: ctx.csrfToken(),
    docManagerUrl: `${ts.baseUrl()}/#/Tradeshift.DocumentManager`,
    total: items.length,
    timestamp: new Date().toFormat('YYYY年MM月DD日 HH24時MI分SS秒'),
    popupNotice,
    from: displayFrom,
    to: displayTo,
    invoices: items,
    notice,
    messages
  }
}

/**
 * 初期表示
 */
const display = async (req, res, next) => {
  const data = await renderData(req)
  await res.render('send_invoice.hbs', data)
}

/**
 * 範囲指定検索
 */
const displayWithRange = async (req, res, next) => {
  const data = await renderData(req, normalizeInvoiceId(req.body.from), normalizeInvoiceId(req.body.to))
  await res.render('send_invoice.hbs', data)
}

/**
 * 添付ファイル追加
 */
const addAttachment = async (req, res, next) => {
  // ドキュメントID
  const documentId = req.body.documentId
  // 添付ファイル
  const files = req.files[0]
  const stream = fs.createReadStream(files.path)
  await ts.updateAttachment(req, documentId, files.originalname, files.mimetype, stream)
  res.send({ status: 'ok', url: attachmentUrl(documentId, { Name: files.originalname, ContentType: files.mimetype }) })
}

/**
 * 添付ファイル削除
 */
const deleteAttachment = async (req, res, next) => {
  await ts.removeAttachment(req, req.params.documentId, req.params.filename)
  res.send({ status: 'ok', message: '添付ファイルを削除しました' })
}

/**
 * 請求書発行処理
 */
const send = async (req, res, next) => {
  const tenantId = currentTenantId(req)

  // 前回エラーをクリアする
  await Error.destroy({ where: { userUuid: tenantId } })

  let errors = {}
  let maxInvoiceId = null
  for (let { documentId, invoiceId, error } of req.body) {
    if (error) {
      // 取り込み時のエラーを登録
      await Error.create({
        userUuid: tenantId,
        invoiceNo: invoiceId,
        message: error
      })
      continue
    }

    // 請求書発行API
    try {
      await ts.sendDocument(req, documentId, uuidv4())
      if (!maxInvoiceId || invoiceId > maxInvoiceId) {
        maxInvoiceId = invoiceId
      }
    } catch (error) {
      // 発効時のエラーを登録
      await Error.create({
        userUuid: tenantId,
        invoiceNo: invoiceId,
        message: error.message
      })
      errors[documentId] = error.message
    }
  }
  // 発行済み請求書番号を更新
  if (maxInvoiceId) {
    await User.update(
      { lastInvoiceNo: maxInvoiceId },
      {
        where: {
          [Op.and]: {
            uuid: tenantId,
            lastInvoiceNo: { [Op.lt]: maxInvoiceId }
          }
        }
      }
    )
  }
  if (Object.keys(errors).length == 0) {
    res.send({ status: 'ok', message: '請求書の発行が完了しました。' })
  } else {
    res.send({ status: 'ng', message: '発行できなかった請求書があります。確認してください。', errors })
  }
}

const router = express.Router()
const upload = multer({ dest: 'uploads/' })

router.get('/', ...middleware, csrfProtection, handler(display))
router.post('/', ...middleware, csrfProtection, handler(displayWithRange))
router.post('/attachment', upload.array('file', 1), ...middleware, csrfProtection, handler(addAttachment))
router.delete('/attachment/:documentId/:filename', ...middleware, csrfProtection, handler(deleteAttachment))
router.post('/send', ...middleware, csrfProtection, handler(send))

module.exports = router
