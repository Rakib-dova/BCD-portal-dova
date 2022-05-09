'use strict'
const express = require('express')
const router = express.Router()
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });
const { v4: uuidV4 } = require('uuid')
const helper = require('./helpers/middleware')
const errorHelper = require('./helpers/error')
const logger = require('../lib/logger')
const constantsDefine = require('../constants')
const apiManager = require('../controllers/apiManager')
const pdfInvoiceController = require('../controllers/pdfInvoiceController.js')

const taxDatabase = [
  { type: 'tax10p', taxRate: 0.1 },
  { type: 'tax8p', taxRate: 0.08 }
]

const pdfInvoiceList = async (req, res, next) => {
  console.log('====  req.user.tenantId  ====\n', req.user.tenantId)
  logger.info(constantsDefine.logMessage.INF000 + 'pdfInvoiceList')

  let invoiceRecords
  try {
    invoiceRecords = await pdfInvoiceController.findAllInvoices(req.user.tenantId)
  } catch (err) {
    console.error('err:\n', err)
    return next(errorHelper.create(500))
  }

  console.log('==  invoiceRecords  ===================\n', invoiceRecords)

  const invoices = invoiceRecords.map((record) => record.dataValues)
  invoices.forEach((invoice) => {
    invoice.total = getTotal(invoice.PdfInvoiceLines, taxDatabase)
    invoice.updatedAt = formatDate(invoice.updatedAt, 'YYYY年MM月DD日')
    invoice.paymentDate = formatDate(invoice.paymentDate, 'YYYY年MM月DD日')
  })

  console.log('==  加工後 invoices  ===================\n', invoices)

  res.render('pdfInvoiceList', {
    title: 'PDF請求書',
    engTitle: 'PDF INVOICING',
    listArr: invoices
  })

  logger.info(constantsDefine.logMessage.INF001 + 'pdfInvoiceList')
}

const pdfInvoiceRegister = async (req, res, next) => {
  logger.info(constantsDefine.logMessage.INF000 + 'pdfInvoiceRegister')

  // 差出人情報の取得
  let accountInfo
  try {
    accountInfo = await apiManager.accessTradeshift(req.user.accessToken, req.user.refreshToken, 'get', '/account')
    console.log('====  accountInfo  ====\n', accountInfo)
    if (accountInfo instanceof Error) return next(errorHelper.create(500))
  } catch (error) {
    console.error(error)
    return next(errorHelper.create(500))
  }
  console.log('====  accountInfo  ====\n', accountInfo)
  const sender = {
    sendCompany: accountInfo.CompanyName,
    sendPost: accountInfo.AddressLines.find((item) => item.scheme === 'zip').value,
    sendAddr1: accountInfo.AddressLines.find((item) => item.scheme === 'city').value,
    sendAddr2: accountInfo.AddressLines.find((item) => item.scheme === 'street').value,
    sendAddr3: accountInfo.AddressLines.find((item) => item.scheme === 'locality')?.value || ''
  }
  console.log('====  sender  ====\n', sender)

  // 企業ロゴ →ない場合はdummy画像
  let logoSrc
  typeof accountInfo.LogoURL === 'undefined'
    ? (logoSrc = '/image/ts-app-digitaltrade-func-icon-pdf_invoices.svg')
    : (logoSrc = accountInfo.LogoURL)

  res.render('pdfInvoice', {
    title: 'PDF請求書作成',
    engTitle: 'REGISTER PDF INVOICE',
    invoice: JSON.stringify(sender),
    lines: JSON.stringify([]),
    logoSrc: logoSrc
  })

  logger.info(constantsDefine.logMessage.INF001 + 'pdfInvoiceRegister')
}

const pdfInvoiceEdit = async (req, res, next) => {
  logger.info(constantsDefine.logMessage.INF000 + 'pdfInvoiceEdit')
  if (!req.params.invoiceId) return next(errorHelper.create(400))

  // 差出人情報の取得
  let accountInfo
  try {
    accountInfo = await apiManager.accessTradeshift(req.user.accessToken, req.user.refreshToken, 'get', '/account')
    console.log('====  accountInfo  ====\n', accountInfo)
    if (accountInfo instanceof Error) return next(errorHelper.create(500))
  } catch (error) {
    console.error(error)
    return next(errorHelper.create(500))
  }
  const sender = {
    sendCompany: accountInfo.CompanyName,
    sendPost: accountInfo.AddressLines.find((item) => item.scheme === 'zip').value,
    sendAddr1: accountInfo.AddressLines.find((item) => item.scheme === 'city').value,
    sendAddr2: accountInfo.AddressLines.find((item) => item.scheme === 'street').value,
    sendAddr3: accountInfo.AddressLines.find((item) => item.scheme === 'locality')?.value || ''
  }
  console.log('====  sender  ====\n', sender)

  // 請求書情報の取得
  let invoiceRecord
  try {
    invoiceRecord = await pdfInvoiceController.findInvoice(req.params.invoiceId)
    console.log('==  invoiceRecord  ===================\n', invoiceRecord)
  } catch (error) {
    console.error(error)
    return next(errorHelper.create(500))
  }

  const invoice = { ...invoiceRecord.dataValues, ...sender }
  delete invoice.tmpFlg
  delete invoice.outputDate
  delete invoice.sendTenantId
  delete invoice.updatedAt
  delete invoice.createdAt
  delete invoice.total
  delete invoice.PdfInvoiceLines
  delete invoice.PdfSealImp
  console.log('=== 加工後 invoice =========\n', invoice)
  const lines = invoiceRecord.PdfInvoiceLines.map((line) => {
    delete line.dataValues.invoiceId
    return line.dataValues
  })
  console.log('=== 加工後 lines =========\n', lines)

  // 企業ロゴ →ない場合はdummy画像
  let logoSrc
  typeof accountInfo.LogoURL === 'undefined'
    ? (logoSrc = '/image/ts-app-digitaltrade-func-icon-pdf_invoices.svg')
    : (logoSrc = accountInfo.LogoURL)

  res.render('pdfInvoice', {
    title: 'PDF請求書編集',
    engTitle: 'EDIT PDF INVOICE',
    invoice: JSON.stringify(invoice),
    lines: JSON.stringify(lines),
    sealImp: invoiceRecord.PdfSealImp.image ? invoiceRecord.PdfSealImp.image.toString('base64') : null,
    logoSrc: logoSrc
  })

  logger.info(constantsDefine.logMessage.INF001 + 'pdfInvoiceEdit')
}

// const getAllPdfInvoices = async (req, res, next) => {
// }

// const getPdfInvoice = async (req, res, next) => {
// }

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

  return res.status(201).send({ result: 1 })
}

const updatePdfInvoice = async (req, res, next) => {
  if (
    !req.params.invoiceId ||
    !req.body.invoice ||
    !req.body.lines
  ) return next(errorHelper.create(400))
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

const deletePdfInvoice = async (req, res, next) => {
  if (!req.params.invoiceId) return next(errorHelper.create(400))

  try {
    const result = await pdfInvoiceController.deleteInvoice(req.params.invoiceId)
    if (result === 0) {
      req.flash('info', '指定の請求書は既に削除済みです。')
      return res.status(200).send({ result: 0 })
    }
  } catch (error) {
    console.error(error)
    return next(errorHelper.create(500))
  }

  return res.status(200).send({ result: 1 })
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

// router.get('/', helper.bcdAuthenticate, getAllPdfInvoices)
// router.get('/:invoiceId', helper.bcdAuthenticate, getPdfInvoice)
router.post('/', helper.bcdAuthenticate, upload.single('sealImp'), createPdfInvoice)
router.put('/:invoiceId', helper.bcdAuthenticate, upload.single('sealImp'), updatePdfInvoice)
router.delete('/:invoiceId', helper.bcdAuthenticate, deletePdfInvoice)

module.exports = {
  router: router
}
