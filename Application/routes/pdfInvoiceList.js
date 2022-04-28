'use strict'
const express = require('express')
const router = express.Router()
const helper = require('./helpers/middleware')
const errorHelper = require('./helpers/error')
const noticeHelper = require('./helpers/notice')
const logger = require('../lib/logger')
const validate = require('../lib/validate')
const constantsDefine = require('../constants')

const pdfInvoiceController = require('../controllers/pdfInvoiceController')

const cbGetIndex = async (req, res, next) => {
  logger.info(constantsDefine.logMessage.INF000 + 'cbGetIndex')

  req.session.userContext = 'LoggedIn'

  // ユーザ権限を取得
  req.session.userRole = req.dbUser.dataValues?.userRole
  const deleteFlag = req.contract.dataValues.deleteFlag
  const contractStatus = req.contract.dataValues.contractStatus
  const checkContractStatus = await helper.checkContractStatus(req.user.tenantId)

  if (checkContractStatus === null || checkContractStatus === 999) {
    return next(errorHelper.create(500))
  }

  if (!validate.isStatusForCancel(contractStatus, deleteFlag)) {
    return next(noticeHelper.create('cancelprocedure'))
  }

  // PDF請求書データの取得
  const pdfInvoiceListArr = await pdfInvoiceController.getpdfInvoiceList(req.user.tenantId)
  if (pdfInvoiceListArr instanceof Error) return next(errorHelper.create(500))

  res.render('pdfInvoiceList', {
    title: 'PDF請求書作成',
    engTitle: 'PDF INVOICING',
    btnNameForRegister: '新規登録',
    listArr: pdfInvoiceListArr,
    messageForNotItem: '現在、PDF請求書データはありません。新規登録するボタンから登録を行ってください。',
    // リスト表示カラム
    listNo: 'No',
    invoiceNumber: '請求書番号',
    invoiceDestinationCompanyName: '宛先',
    totalAmmout: '金額',
    updatedAt: '更新日',
    paymentDate: '支払期日',
    invoiceState: 'ステータス'
  })

  logger.info(constantsDefine.logMessage.INF001 + 'cbGetIndex')
}

router.get('/', helper.bcdAuthenticate, cbGetIndex)

module.exports = {
  router: router,
  cbGetIndex: cbGetIndex
}
