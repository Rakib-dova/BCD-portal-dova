'use strict'
const express = require('express')
const router = express.Router()
const axios = require('axios')
const multer = require('multer')
const upload = multer({ storage: multer.memoryStorage() })
const { v4: uuidV4 } = require('uuid')
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
let filetype
(async () => {
  filetype = await import('file-type')
})()

const taxDatabase = [
  { type: 'tax10p', taxRate: 0.1 },
  { type: 'tax8p', taxRate: 0.08 }
]

const pdfInvoiceList = async (req, res, next) => {
  logger.info(constantsDefine.logMessage.INF000 + 'pdfInvoiceList')

  let invoiceRecords
  try {
    invoiceRecords = await pdfInvoiceController.findAllInvoices(req.user.tenantId)
  } catch (err) {
    console.error('err:\n', err)
    return next(errorHelper.create(500))
  }

  // console.log('==  invoiceRecords  ===================\n', invoiceRecords)

  const invoices = invoiceRecords.map((record) => record.dataValues)
  invoices.forEach((invoice) => {
    invoice.total = getTotal(invoice.PdfInvoiceLines, taxDatabase)
    invoice.updatedAt = formatDate(invoice.updatedAt, 'YYYY年MM月DD日')
    invoice.paymentDate = formatDate(invoice.paymentDate, 'YYYY年MM月DD日')
  })

  // console.log('==  加工後 invoices  ===================\n', invoices)

  res.render('pdfInvoiceList', {
    title: 'PDF請求書',
    engTitle: 'PDF INVOICING',
    listArr: invoices
  })

  logger.info(constantsDefine.logMessage.INF001 + 'pdfInvoiceList')
}

const pdfInvoiceRegister = async (req, res, next) => {
  logger.info(constantsDefine.logMessage.INF000 + 'pdfInvoiceRegister')

  // アカウント情報取得
  const { accountInfo, senderInfo } = await getAccountAndSenderInfo(req)
  if (!accountInfo || !senderInfo) return next(errorHelper.create(500))

  // 企業ロゴ設定
  const logoSrc = accountInfo.BackgroundURL ? accountInfo.BackgroundURL : null

  res.render('pdfInvoice', {
    title: 'PDF請求書作成',
    engTitle: 'REGISTER PDF INVOICE',
    invoice: JSON.stringify(senderInfo),
    lines: JSON.stringify([]),
    sealImpSrc: '/image/ts-app-digitaltrade-func-icon-pdf_invoices-seal.svg',
    logoSrc,
    editing: true
  })

  logger.info(constantsDefine.logMessage.INF001 + 'pdfInvoiceRegister')
}

const pdfInvoiceEdit = async (req, res, next) => {
  logger.info(constantsDefine.logMessage.INF000 + 'pdfInvoiceEdit')
  if (!req.params.invoiceId) return next(errorHelper.create(400))

  // アカウント情報取得
  const { accountInfo, senderInfo } = await getAccountAndSenderInfo(req)
  if (!accountInfo || !senderInfo) return next(errorHelper.create(500))

  // PDF請求書情報取得
  const { invoice, lines, sealImpRecord } = await getInvoiceInfo(req, senderInfo)
  if (!invoice || !lines || !sealImpRecord) return next(errorHelper.create(500))

  console.log('=== invoice =========\n', invoice)
  console.log('=== lines =========\n', lines)

  // 印影設定
  const sealImpSrc = sealImpRecord.dataValues.image
    ? `data:image/png;base64,${sealImpRecord.dataValues.image.toString('base64')}`
    : '/image/ts-app-digitaltrade-func-icon-pdf_invoices-seal.svg'
  // 企業ロゴ設定
  const logoSrc = accountInfo.BackgroundURL ? accountInfo.BackgroundURL : null

  res.render('pdfInvoice', {
    title: 'PDF請求書編集',
    engTitle: 'EDIT PDF INVOICE',
    invoice: JSON.stringify(invoice),
    lines: JSON.stringify(lines),
    sealImpSrc,
    logoSrc,
    editing: true
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
    : '/image/ts-app-digitaltrade-func-icon-pdf_invoices-seal.svg'
  // 企業ロゴ設定
  const logoSrc = accountInfo.BackgroundURL ? accountInfo.BackgroundURL : null

  res.render('pdfInvoice', {
    title: 'PDF請求書',
    engTitle: 'PDF INVOICE',
    invoice: JSON.stringify(invoice),
    lines: JSON.stringify(lines),
    sealImpSrc,
    logoSrc
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
    console.error(error)
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

  lines.forEach((line, index) => {
    line.invoiceId = req.params.invoiceId
    line.lineIndex = index
  })

  try {
    const updatedInvoice = await pdfInvoiceController.updateInvoice(
      req.params.invoiceId,
      invoice,
      lines,
      req.file ? req.file.buffer : null
    )
    console.log('==  updatedInvoice  ===================\n', updatedInvoice) // [ 1 ]
  } catch (error) {
    console.error(error)
    return next(errorHelper.create(500))
  }

  return res.status(201).send({ result: 1 })
}

const createAndOutputPdfInvoice = async (req, res, next) => {
  if (!req.body.invoice || !req.body.lines || !req.file) return next(errorHelper.create(400))
  const invoice = JSON.parse(req.body.invoice)
  const lines = JSON.parse(req.body.lines)
  console.log('==  req.file  ===================\n', req.file)
  if (!Array.isArray(lines)) return next(errorHelper.create(400))
  if (req.file.mimetype !== 'image/png' && req.file.mimetype !== 'image/jpeg') return next(errorHelper.create(400))

  // アカウント情報取得
  const { accountInfo, senderInfo } = await getAccountAndSenderInfo(req)
  if (!accountInfo || !senderInfo) return next(errorHelper.create(500))

  const invoiceId = uuidV4()
  invoice.sendTenantId = req.user.tenantId
  invoice.invoiceId = invoiceId
  invoice.tmpFlg = true
  invoice.outputDate = new Date()
  lines.forEach((line, index) => {
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
    sealImp = {
      buffer: req.file.buffer,
      type: req.file.mimetype.replace('image/', '')
    }
  }
  // 企業ロゴ取得
  let logo
  if (accountInfo.BackgroundURL) {
    const response = await axios.get(accountInfo.BackgroundURL, { responseType: 'arraybuffer' })
    const buffer = Buffer.from(response.data, 'utf-8')
    const fileType = await filetype.fileTypeFromBuffer(buffer)
    console.log('==  fileType  ===================: ', fileType)
    logo = {
      buffer,
      type: fileType.mime.replace('image/', '')
    }
  }

  console.log('==  invoice  ===================\n', invoice)
  console.log('==  lines  ===================\n', lines)

  const html = renderInvoiceHTML(invoice, sealImp, logo)
  console.log('=====  生成されたHTML  =====\n', html)
  if (!html) return next(errorHelper.create(500))

  let pdfBuffer
  try {
    pdfBuffer = await generatePdf(html)
  } catch (error) {
    console.log('== PDF生成 ERROR ====================\n', error)
    req.flash('noti', ['PDF生成に失敗しました。', ''])
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
    console.error(error)
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
    console.log('==  invoiceRecord  ===================\n', invoiceRecord)
  } catch (error) {
    console.error(error)
    return next(errorHelper.create(500))
  }

  // アカウント情報取得
  const { accountInfo, senderInfo } = await getAccountAndSenderInfo(req)
  if (!accountInfo || !senderInfo) return next(errorHelper.create(500))

  let sealImp
  if (req.file) {
    console.log('==  PDF出力 画像が添付されている場合  ===================')
    if (req.file.mimetype !== 'image/png' && req.file.mimetype !== 'image/jpeg') return next(errorHelper.create(400))

    sealImp = {
      buffer: req.file.buffer,
      type: req.file.mimetype.replace('image/', '')
    }
  } else {
    console.log('==  PDF出力 添付なし  ===================')
    if (invoiceRecord.PdfSealImp.dataValues.image) {
      const fileType = await filetype.fileTypeFromBuffer(invoiceRecord.PdfSealImp.dataValues.image)
      console.log('==  fileType  ===================: ', fileType)
      sealImp = {
        buffer: invoiceRecord.PdfSealImp.dataValues.image,
        type: fileType.mime.replace('image/', '')
      }
    }
  }

  // 企業ロゴ取得
  let logo
  if (accountInfo.BackgroundURL) {
    const response = await axios.get(accountInfo.BackgroundURL, { responseType: 'arraybuffer' })
    const buffer = Buffer.from(response.data, 'utf-8')
    const fileType = await filetype.fileTypeFromBuffer(buffer)
    console.log('==  fileType  ===================: ', fileType)
    logo = {
      buffer,
      type: fileType.mime.replace('image/', '')
    }
  }

  lines.forEach((line, index) => {
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
      console.error(error)
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
    if (accountInfo instanceof Error) return null
  } catch (error) {
    console.error(error)
    return null
  }
  const senderInfo = {
    sendCompany: accountInfo.CompanyName,
    sendPost: accountInfo.AddressLines.find((item) => item.scheme === 'zip').value,
    sendAddr1: accountInfo.AddressLines.find((item) => item.scheme === 'city').value,
    sendAddr2: accountInfo.AddressLines.find((item) => item.scheme === 'street').value,
    sendAddr3: accountInfo.AddressLines.find((item) => item.scheme === 'locality')?.value || ''
  }
  console.log('====  sender  ====\n', senderInfo)

  return { accountInfo, senderInfo }
}

const getInvoiceInfo = async (req, senderInfo) => {
  let invoiceRecord
  try {
    invoiceRecord = await pdfInvoiceController.findInvoice(req.params.invoiceId)
    console.log('==  invoiceRecord  ===================\n', invoiceRecord)
    if (invoiceRecord instanceof Error) return null
  } catch (error) {
    console.error(error)
    return null
  }

  const invoice = { ...invoiceRecord.dataValues, ...senderInfo }
  console.log('=== invoice =========\n', invoice)
  const lines = invoiceRecord.PdfInvoiceLines.map((line) => line.dataValues)
  console.log('=== lines =========\n', lines)
  const sealImpRecord = invoiceRecord.dataValues.PdfSealImp
  delete invoice.PdfInvoiceLines
  delete invoice.PdfSealImp

  return { invoice, lines, sealImpRecord }
}

const getTotal = (lines, taxDatabase) => {
  let total = 0

  lines.forEach((line) => {
    let taxRate = 0
    const taxInfo = taxDatabase.find((tax) => tax.type === line.taxType)
    if (taxInfo) taxRate = taxInfo.taxRate
    total += Math.floor(line.unitPrice * line.quantity * (1 + taxRate))
  })

  return total
}

const formatDate = (date, format) => {
  format = format.replace(/YYYY/, date.getFullYear())
  format = format.replace(/MM/, date.getMonth() + 1)
  format = format.replace(/DD/, date.getDate())
  return format
}

router.get('/list', helper.bcdAuthenticate, pdfInvoiceList)
router.get('/register', helper.bcdAuthenticate, pdfInvoiceRegister)
router.get('/edit/:invoiceId', helper.bcdAuthenticate, pdfInvoiceEdit)
router.get('/show/:invoiceId', helper.bcdAuthenticate, pdfInvoiceShow)

router.post('/', helper.bcdAuthenticate, upload.single('sealImp'), createPdfInvoice)
router.put('/:invoiceId', helper.bcdAuthenticate, upload.single('sealImp'), updatePdfInvoice)
router.post('/createAndOutput', helper.bcdAuthenticate, upload.single('sealImp'), createAndOutputPdfInvoice)
router.post('/updateAndOutput/:invoiceId', helper.bcdAuthenticate, upload.single('sealImp'), updateAndOutputPdfInvoice)
// router.delete('/:invoiceId', helper.bcdAuthenticate, deletePdfInvoice)

module.exports = {
  router: router
}
