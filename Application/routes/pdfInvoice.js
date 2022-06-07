'use strict'
const express = require('express')
const router = express.Router()
const axios = require('axios')
const multer = require('multer')
const upload = multer({ storage: multer.memoryStorage() })
const csrf = require('csurf')
const csrfProtection = csrf({ cookie: false })
const { v4: uuidV4 } = require('uuid')
const FileType = require('file-type')
const helper = require('./helpers/middleware')
const errorHelper = require('./helpers/error')
const logger = require('../lib/logger')
const constantsDefine = require('../constants')
const apiManager = require('../controllers/apiManager')
const pdfInvoiceController = require('../controllers/pdfInvoiceController.js')
const {
  generatePdf,
  renderInvoiceHTML
} = require('../lib/pdfGenerator')
const { formatDate } = require('../lib/utils')

const taxDatabase = [
  { type: 'tax10p', taxRate: 0.1 },
  { type: 'tax8p', taxRate: 0.08 }
]

const pdfInvoiceList = async (req, res, next) => {
  if (!req.user) return next(errorHelper.create(500)) // UTのエラー対策
  logger.info(constantsDefine.logMessage.INF000 + 'pdfInvoiceList')

  let invoiceRecords
  try {
    invoiceRecords = await pdfInvoiceController.findAllInvoices(req.user.tenantId)
  } catch (error) {
    console.log('error:\n', error)
    return next(errorHelper.create(500))
  }

  // console.log('==  invoiceRecords  ===================\n', invoiceRecords)

  const invoices = invoiceRecords.map((record) => record.dataValues)
  invoices.forEach((invoice) => {
    invoice.total = getTotal(invoice.PdfInvoiceLines, taxDatabase)
    invoice.updatedAt = formatDate(invoice.updatedAt, 'YYYY年MM月DD日')
    invoice.paymentDate = invoice.paymentDate ? formatDate(invoice.paymentDate, 'YYYY年MM月DD日') : ''
  })

  console.log('==  加工後 invoices  ===================\n', invoices)

  res.render('pdfInvoiceList', {
    title: 'PDF請求書',
    engTitle: 'PDF INVOICING',
    itemCount: invoices.length, // ページネーションで必要な情報
    invoices: JSON.stringify(invoices), // フロントエンドにデータを渡す為
    csrfToken: req.csrfToken()
  })

  logger.info(constantsDefine.logMessage.INF001 + 'pdfInvoiceList')
}

const pdfInvoiceRegister = async (req, res, next) => {
  if (!req.user) return next(errorHelper.create(500)) // UTのエラー対策
  logger.info(constantsDefine.logMessage.INF000 + 'pdfInvoiceRegister')

  // アカウント情報取得
  const { accountInfo, senderInfo } = await getAccountAndSenderInfo(req)
  if (!accountInfo || !senderInfo) return next(errorHelper.create(500))

  // 企業ロゴ設定
  const logoSrc = accountInfo.LogoURL ? accountInfo.LogoURL : null

  res.render('pdfInvoice', {
    title: 'PDF請求書作成',
    engTitle: 'REGISTER PDF INVOICE',
    invoice: JSON.stringify(senderInfo),
    lines: JSON.stringify([]),
    sealImpSrc: '/image/ts-app-digitaltrade-func-icon-pdf_stamp_select.svg',
    logoSrc,
    editing: true,
    csrfToken: req.csrfToken()
  })

  logger.info(constantsDefine.logMessage.INF001 + 'pdfInvoiceRegister')
}

const pdfInvoiceEdit = async (req, res, next) => {
  logger.info(constantsDefine.logMessage.INF000 + 'pdfInvoiceEdit')
  console.log('=== req.params.invoiceId =========: ', req.params.invoiceId)
  if (!req.params.invoiceId) return next(errorHelper.create(400))

  // アカウント情報取得
  const { accountInfo, senderInfo } = await getAccountAndSenderInfo(req)
  if (!accountInfo || !senderInfo) return next(errorHelper.create(500))

  // PDF請求書情報取得
  const { invoice, lines, sealImpRecord } = await getInvoiceInfo(req, senderInfo)
  if (!invoice || !lines || !sealImpRecord) return next(errorHelper.create(500))

  // console.log('=== sealImpRecord =========\n', sealImpRecord)
  console.log('=== invoice =========\n', invoice)
  console.log('=== lines =========\n', lines)
  console.log('=== sealImpRecord =========\n', sealImpRecord)

  // 印影設定
  const sealImpSrc = sealImpRecord.dataValues.image
    ? `data:image/png;base64,${sealImpRecord.dataValues.image.toString('base64')}`
    : '/image/ts-app-digitaltrade-func-icon-pdf_stamp_select.svg'
  // 企業ロゴ設定
  const logoSrc = accountInfo.LogoURL ? accountInfo.LogoURL : null

  res.render('pdfInvoice', {
    title: 'PDF請求書編集',
    engTitle: 'EDIT PDF INVOICE',
    invoice: JSON.stringify(invoice),
    lines: JSON.stringify(lines),
    sealImpSrc,
    logoSrc,
    editing: true,
    csrfToken: req.csrfToken()
  })

  logger.info(constantsDefine.logMessage.INF001 + 'pdfInvoiceEdit')
}

const pdfInvoiceShow = async (req, res, next) => {
  logger.info(constantsDefine.logMessage.INF000 + 'pdfInvoiceShow')
  if (!req.params.invoiceId) return next(errorHelper.create(400))

  // アカウント情報取得
  const { accountInfo, senderInfo } = await getAccountAndSenderInfo(req)
  if (!accountInfo || !senderInfo) return next(errorHelper.create(500))

  // PDF請求書情報取得
  const { invoice, lines, sealImpRecord } = await getInvoiceInfo(req, senderInfo)
  if (!invoice || !lines || !sealImpRecord) return next(errorHelper.create(500))

  // 印影設定
  const sealImpSrc = sealImpRecord.dataValues.image
    ? `data:image/png;base64,${sealImpRecord.dataValues.image.toString('base64')}`
    : null
  // 企業ロゴ設定
  const logoSrc = accountInfo.LogoURL ? accountInfo.LogoURL : null

  res.render('pdfInvoice', {
    title: 'PDF請求書',
    engTitle: 'PDF INVOICE',
    invoice: JSON.stringify(invoice),
    lines: JSON.stringify(lines),
    sealImpSrc,
    logoSrc,
    csrfToken: req.csrfToken()
  })
  logger.info(constantsDefine.logMessage.INF001 + 'pdfInvoiceShow')
}

const createPdfInvoice = async (req, res, next) => {
  if (!req.body.invoice || !req.body.lines) return next(errorHelper.create(400))
  const invoice = JSON.parse(req.body.invoice)
  const lines = JSON.parse(req.body.lines)
  if (!Array.isArray(lines)) return next(errorHelper.create(400))

  const invoiceId = uuidV4()
  invoice.sendTenantId = req.user.tenantId
  invoice.invoiceId = invoiceId
  lines.forEach((line, index) => {
    line.unitPrice = line.unitPrice ? line.unitPrice : null
    line.quantity = line.quantity ? Math.floor(line.quantity * 1000) / 1000 : null
    line.invoiceId = invoiceId
    line.lineIndex = index
  })

  let createdInvoice
  try {
    createdInvoice = await pdfInvoiceController.createInvoice(
      invoice,
      lines,
      req.file ? req.file.buffer : null
    )
  } catch (error) {
    console.log(error)
    return next(errorHelper.create(500))
  }
  console.log('==  createdInvoice  ===================\n', createdInvoice)

  return res.status(201).send({ invoice: createdInvoice })
}

const updatePdfInvoice = async (req, res, next) => {
  if (!req.params.invoiceId || !req.body.invoice || !req.body.lines) return next(errorHelper.create(400))
  const invoice = JSON.parse(req.body.invoice)
  const lines = JSON.parse(req.body.lines)
  if (!Array.isArray(lines)) return next(errorHelper.create(400))

  // 請求書情報の取得
  let invoiceRecord
  try {
    invoiceRecord = await pdfInvoiceController.findInvoice(req.params.invoiceId)
    console.log('==  invoiceRecord  ===================\n', invoiceRecord)
  } catch (error) {
    console.log(error)
    return next(errorHelper.create(500))
  }

  // 既に出力済みの場合は 400 を返す (不正リクエスト対策)
  if (invoiceRecord.dataValues.tmpFlg) return next(errorHelper.create(400))

  lines.forEach((line, index) => {
    line.unitPrice = line.unitPrice ? line.unitPrice : null
    line.quantity = line.quantity ? Math.floor(line.quantity * 1000) / 1000 : null
    line.invoiceId = req.params.invoiceId
    line.lineIndex = index
  })

  console.log('==  lines  ===================\n', lines)

  let updatedInvoice
  try {
    updatedInvoice = await pdfInvoiceController.updateInvoice(
      req.params.invoiceId,
      invoice,
      lines,
      req.file ? req.file.buffer : null
    )
    console.log('==  updatedInvoice  ===================\n', updatedInvoice) // [ 1 ]
  } catch (error) {
    console.log(error)
    return next(errorHelper.create(500))
  }

  return res.status(200).send({ result: updatedInvoice[0] })
}

const createAndOutputPdfInvoice = async (req, res, next) => {
  if (!req.body.invoice || !req.body.lines) return next(errorHelper.create(400))
  const invoice = JSON.parse(req.body.invoice)
  const lines = JSON.parse(req.body.lines)
  console.log('==  req.file  ===================\n', req.file)
  if (!Array.isArray(lines)) return next(errorHelper.create(400))

  // アカウント情報取得
  const { accountInfo, senderInfo } = await getAccountAndSenderInfo(req)
  if (!accountInfo || !senderInfo) return next(errorHelper.create(500))

  const invoiceId = uuidV4()
  invoice.sendTenantId = req.user.tenantId
  invoice.invoiceId = invoiceId
  invoice.tmpFlg = true
  invoice.outputDate = new Date()
  lines.forEach((line, index) => {
    line.unitPrice = line.unitPrice ? line.unitPrice : null
    line.quantity = line.quantity ? Math.floor(line.quantity * 1000) / 1000 : null
    line.invoiceId = invoiceId
    line.lineIndex = index
  })
  invoice.lines = lines
  const billingDate = new Date(invoice.billingDate)
  const paymentDate = new Date(invoice.paymentDate)
  const deliveryDate = new Date(invoice.deliveryDate)
  invoice.billingDate = formatDate(billingDate, 'YYYY年MM月DD日')
  invoice.paymentDate = formatDate(paymentDate, 'YYYY年MM月DD日')
  invoice.deliveryDate = formatDate(deliveryDate, 'YYYY年MM月DD日')

  // 印影取得
  let sealImp
  if (req.file) {
    if (req.file.mimetype !== 'image/png' && req.file.mimetype !== 'image/jpeg') return next(errorHelper.create(400))

    sealImp = {
      buffer: req.file.buffer,
      type: req.file.mimetype.replace('image/', '')
    }
  }
  // 企業ロゴ取得
  let logo
  if (accountInfo.LogoURL) {
    const response = await axios.get(accountInfo.LogoURL, { responseType: 'arraybuffer' })
    const buffer = Buffer.from(response.data, 'utf-8')
    const fileType = await FileType.fromBuffer(buffer)
    console.log('==  fileType  ===================: ', fileType)
    logo = {
      buffer,
      type: fileType.mime.replace('image/', '')
    }
  }

  console.log('==  invoice  ===================\n', invoice)
  console.log('==  lines  ===================\n', lines)

  const html = renderInvoiceHTML(invoice, sealImp, logo)
  // console.log('=====  生成されたHTML  =====\n', html)
  if (!html) return next(errorHelper.create(500))

  let pdfBuffer
  try {
    pdfBuffer = await generatePdf(html)
  } catch (error) {
    console.log('== PDF生成 ERROR ====================\n', error)
    req.flash('noti', ['PDF生成に失敗しました。', ''])
    return next(errorHelper.create(500))
  }
  console.log('== PDF生成完了 ====================')

  console.log('== PDF請求書レコード挿入 開始 ====================')
  invoice.billingDate = billingDate
  invoice.paymentDate = paymentDate
  invoice.deliveryDate = deliveryDate
  try {
    const createdInvoice = await pdfInvoiceController.createInvoice(
      invoice,
      lines,
      req.file ? req.file.buffer : null
    )
    console.log('==  createdInvoice  ===================\n', createdInvoice)
  } catch (error) {
    console.log(error)
    return next(errorHelper.create(500))
  }
  console.log('== PDF請求書レコード挿入 成功 ====================')

  res.set({ 'Content-Disposition': 'attachment;' })
  res.status(200).send(pdfBuffer)
}

const updateAndOutputPdfInvoice = async (req, res, next) => {
  logger.info(constantsDefine.logMessage.INF000 + 'updateAndOutputPdfInvoice')
  if (!req.params.invoiceId || !req.body.invoice || !req.body.lines) return next(errorHelper.create(400))
  const invoice = JSON.parse(req.body.invoice)
  const lines = JSON.parse(req.body.lines)
  console.log('==  req.file  ===================\n', req.file)
  if (!Array.isArray(lines)) return next(errorHelper.create(400))
  console.log('==  invoice  ===================: ', invoice)
  console.log('==  lines  ===================: ', lines)

  // 請求書情報の取得
  let invoiceRecord
  try {
    invoiceRecord = await pdfInvoiceController.findInvoice(req.params.invoiceId)
    // console.log('==  invoiceRecord  ===================\n', invoiceRecord)
  } catch (error) {
    console.log(error)
    return next(errorHelper.create(500))
  }

  // アカウント情報取得
  const { accountInfo, senderInfo } = await getAccountAndSenderInfo(req)
  if (!accountInfo || !senderInfo) return next(errorHelper.create(500))

  let sealImp
  if (req.file) {
    if (req.file.mimetype !== 'image/png' && req.file.mimetype !== 'image/jpeg') return next(errorHelper.create(400))

    sealImp = {
      buffer: req.file.buffer,
      type: req.file.mimetype.replace('image/', '')
    }
  } else {
    if (invoiceRecord.PdfSealImp.dataValues.image) {
      const fileType = await FileType.fromBuffer(invoiceRecord.PdfSealImp.dataValues.image)
      console.log('==  fileType  ===================: ', fileType)
      sealImp = {
        buffer: invoiceRecord.PdfSealImp.dataValues.image,
        type: fileType.mime.replace('image/', '')
      }
    }
  }

  // 企業ロゴ取得
  let logo
  if (accountInfo.LogoURL) {
    const response = await axios.get(accountInfo.LogoURL, { responseType: 'arraybuffer' })
    const buffer = Buffer.from(response.data, 'utf-8')
    const fileType = await FileType.fromBuffer(buffer)
    console.log('==  fileType  ===================: ', fileType)
    logo = {
      buffer,
      type: fileType.mime.replace('image/', '')
    }
  }

  lines.forEach((line, index) => {
    line.unitPrice = line.unitPrice ? line.unitPrice : null
    line.quantity = line.quantity ? Math.floor(line.quantity * 1000) / 1000 : null
    line.invoiceId = req.params.invoiceId
    line.lineIndex = index
  })
  invoice.lines = lines
  const billingDate = new Date(invoice.billingDate)
  const paymentDate = new Date(invoice.paymentDate)
  const deliveryDate = new Date(invoice.deliveryDate)
  invoice.billingDate = formatDate(billingDate, 'YYYY年MM月DD日')
  invoice.paymentDate = formatDate(paymentDate, 'YYYY年MM月DD日')
  invoice.deliveryDate = formatDate(deliveryDate, 'YYYY年MM月DD日')

  let pdfBuffer
  const html = renderInvoiceHTML(invoice, sealImp, logo)
  if (!html) return next(errorHelper.create(500))

  try {
    pdfBuffer = await generatePdf(html)
  } catch (error) {
    console.log('== PDF生成 ERROR ====================\n', error)
    req.flash('noti', ['PDF生成に失敗しました。', ''])
    return next(errorHelper.create(500))
  }
  console.log('== PDF生成完了 ====================')

  if (!invoiceRecord.dataValues.tmpFlg) {
    console.log('== PDF請求書レコード更新 開始 ====================')
    delete invoice.lines
    invoice.billingDate = billingDate
    invoice.paymentDate = paymentDate
    invoice.deliveryDate = deliveryDate
    invoice.tmpFlg = true
    invoice.outputDate = new Date()

    try {
      const updatedInvoice = await pdfInvoiceController.updateInvoice(
        req.params.invoiceId,
        invoice,
        lines,
        sealImp ? sealImp.buffer : null
      )
      console.log('==  updatedInvoice  ===================\n', updatedInvoice)
    } catch (error) {
      console.log(error)
      return next(errorHelper.create(500))
    }
    console.log('== PDF請求書レコード更新 成功 ====================')
  }

  res.set({ 'Content-Disposition': 'attachment;' })
  res.status(200).send(pdfBuffer)
  logger.info(constantsDefine.logMessage.INF001 + 'updateAndOutputPdfInvoice')
}

// const deletePdfInvoice = async (req, res, next) => {
//   if (!req.params.invoiceId) return next(errorHelper.create(400))

//   try {
//     const result = await pdfInvoiceController.deleteInvoice(req.params.invoiceId)
//     if (result === 0) {
//       req.flash('info', '指定の請求書は既に削除済みです。')
//       return res.status(200).send({ result: 0 })
//     }
//   } catch (error) {
//     console.error(error)
//     return next(errorHelper.create(500))
//   }

//   res.redirect('/pdfInvoices/list')
// }

const getAccountAndSenderInfo = async (req) => {
  let accountInfo
  try {
    accountInfo = await apiManager.accessTradeshift(req.user.accessToken, req.user.refreshToken, 'get', '/account')
    console.log('====  accountInfo  ====\n', accountInfo)
    if (accountInfo instanceof Error) return { accountInfo: null, senderInfo: null }
  } catch (error) {
    console.error(error)
    return { accountInfo: null, senderInfo: null }
  }

  const senderInfo = {
    sendCompany: accountInfo.CompanyName,
    sendPost: accountInfo.AddressLines.find((item) => item.scheme === 'zip')?.value || '',
    sendAddr1: accountInfo.AddressLines.find((item) => item.scheme === 'city')?.value || '',
    sendAddr2: accountInfo.AddressLines.find((item) => item.scheme === 'street')?.value || '',
    sendAddr3: accountInfo.AddressLines.find((item) => item.scheme === 'locality')?.value || ''
  }
  console.log('====  sender  ====\n', senderInfo)

  return { accountInfo, senderInfo }
}

const getInvoiceInfo = async (req, senderInfo) => {
  let invoiceRecord
  try {
    invoiceRecord = await pdfInvoiceController.findInvoice(req.params.invoiceId)
    // console.log('==  invoiceRecord  ===================\n', invoiceRecord)
    if (invoiceRecord instanceof Error) return { invoice: null, lines: null, sealImpRecord: null }
  } catch (error) {
    console.log(error)
    return { invoice: null, lines: null, sealImpRecord: null }
  }

  const invoice = { ...invoiceRecord.dataValues, ...senderInfo }
  // console.log('=== invoice =========\n', invoice)
  const lines = invoiceRecord.PdfInvoiceLines.map((line) => line.dataValues)
  // console.log('=== lines =========\n', lines)
  const sealImpRecord = invoiceRecord.dataValues.PdfSealImp
  delete invoice.PdfInvoiceLines
  delete invoice.PdfSealImp

  return { invoice, lines, sealImpRecord }
}

const getTotal = (lines, taxDatabase) => {
  let total = 0
  console.log('====  getTotal  =======', lines, taxDatabase)

  lines.forEach((line) => {
    let taxRate = 0
    const taxInfo = taxDatabase.find((tax) => tax.type === line.taxType)
    if (taxInfo) taxRate = taxInfo.taxRate
    total += Math.floor(line.unitPrice * line.quantity * (1 + taxRate))
  })

  return total
}

router.get('/list', csrfProtection, helper.bcdAuthenticate, pdfInvoiceList)
router.get('/register', csrfProtection, helper.bcdAuthenticate, pdfInvoiceRegister)
router.get('/edit/:invoiceId', csrfProtection, helper.bcdAuthenticate, pdfInvoiceEdit)
router.get('/show/:invoiceId', csrfProtection, helper.bcdAuthenticate, pdfInvoiceShow)

router.post('/', csrfProtection, helper.bcdAuthenticate, upload.single('sealImp'), createPdfInvoice)
router.put('/:invoiceId', csrfProtection, helper.bcdAuthenticate, upload.single('sealImp'), updatePdfInvoice)
router.post('/createAndOutput', csrfProtection, helper.bcdAuthenticate, upload.single('sealImp'), createAndOutputPdfInvoice)
router.post('/updateAndOutput/:invoiceId', csrfProtection, helper.bcdAuthenticate, upload.single('sealImp'), updateAndOutputPdfInvoice)
// router.delete('/:invoiceId', helper.bcdAuthenticate, deletePdfInvoice)

module.exports = {
  router,
  pdfInvoiceList,
  pdfInvoiceRegister,
  pdfInvoiceEdit,
  pdfInvoiceShow,
  createPdfInvoice,
  updatePdfInvoice,
  createAndOutputPdfInvoice,
  updateAndOutputPdfInvoice,
  getAccountAndSenderInfo,
  getInvoiceInfo
}
