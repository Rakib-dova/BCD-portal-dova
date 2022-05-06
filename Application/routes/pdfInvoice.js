'use strict'
const express = require('express')
const router = express.Router()
const helper = require('./helpers/middleware')
const errorHelper = require('./helpers/error')
const logger = require('../lib/logger')
const constantsDefine = require('../constants')

const apiManager = require('../controllers/apiManager')
const pdfInvoiceController = require('../controllers/pdfInvoiceController.js')

const cbGetIndex = async (req, res, next) => {
  logger.info(constantsDefine.logMessage.INF000 + 'cbGetIndex')

  // TODO 請求書一覧情報取得

  res.render('pdfInvoiceList', {
    title: 'PDF請求書',
    engTitle: 'PDF INVOICING'
  })

  logger.info(constantsDefine.logMessage.INF001 + 'cbGetIndex')
}

const cbGetRegister = async (req, res, next) => {
  logger.info(constantsDefine.logMessage.INF000 + 'cbGetRegister')

  // 差出人情報の取得
  const accountInfo = await apiManager.accessTradeshift(req.user.accessToken, req.user.refreshToken, 'get', '/account')
  const sender = {
    sendTenantId: accountInfo.CompanyAccountId,
    sendCompany: accountInfo.CompanyName,
    sendPost: accountInfo.AddressLines.find((item) => {
      return item.scheme === 'zip'
    }).value,
    sendAddr1: accountInfo.AddressLines.find((item) => {
      return item.scheme === 'city'
    }).value,
    sendAddr2: accountInfo.AddressLines.find((item) => {
      return item.scheme === 'street'
    }).value,
    sendAddr3: accountInfo.AddressLines.find((item) => {
      return item.scheme === 'locality'
    }).value
  }
  // 企業ロゴ →ない場合はdummy画像
  let logoSrc
  typeof accountInfo.LogoURL === 'undefined'
    ? (logoSrc = '/image/ts-app-digitaltrade-func-icon-pdf_invoices.svg')
    : (logoSrc = accountInfo.LogoURL)

  res.render('pdfInvoice', {
    title: 'PDF請求書作成',
    engTitle: 'PDF INVOICING',
    sender: sender,
    logoSrc: logoSrc
  })

  logger.info(constantsDefine.logMessage.INF001 + 'cbGetRegister')
}

const pdfInvoicesEdit = async (req, res, next) => {
  logger.info(constantsDefine.logMessage.INF000 + 'cbGetRegister')

  // 表示する差出人情報の取得
  // TODO 表示するロゴ画像の取得
  const logoSrc = '/image/ts-app-digitaltrade-func-icon-pdf_invoices.svg'
  // TODO  表示する印影画像の取得
  const imprintSrc = '/image/ts-app-digitaltrade-func-icon-pdf_invoices.svg'

  // PDF請求書データの取得
  const pdfInvoiceListArr = await pdfInvoiceController.getpdfInvoiceList(req.user.tenantId)
  if (pdfInvoiceListArr instanceof Error) return next(errorHelper.create(500))

  res.render('pdfInvoice', {
    title: 'PDF請求書作成',
    engTitle: 'PDF INVOICING',
    logoSrc: logoSrc,
    imprintSrc: imprintSrc
  })

  logger.info(constantsDefine.logMessage.INF001 + 'cbGetRegister')
}

router.get('/list', helper.isAuthenticated, cbGetIndex)
router.get('/register', helper.isAuthenticated, cbGetRegister)
router.get('/edit/:incoiceId', helper.isAuthenticated, pdfInvoicesEdit)

router.get('/pdfInvoices', helper.isAuthenticated, cbGetIndex)
router.get('/pdfInvoices/:inoiceId', helper.isAuthenticated, cbGetIndex)
router.post('/pdfInvoices', helper.isAuthenticated, cbGetIndex)
router.put('/pdfInvoices/:incoiceId', helper.isAuthenticated, cbGetIndex)
router.delete('/pdfInvoices/:incoiceId', helper.isAuthenticated, cbGetIndex)

module.exports = {
  router: router,
  cbGetIndex: cbGetIndex
}
