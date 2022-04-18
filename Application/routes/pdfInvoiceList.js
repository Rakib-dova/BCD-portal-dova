'use strict'
const express = require('express')
const router = express.Router()
const helper = require('./helpers/middleware')
const errorHelper = require('./helpers/error')
const noticeHelper = require('./helpers/notice')
const userController = require('../controllers/userController.js')
const contractController = require('../controllers/contractController.js')
const logger = require('../lib/logger')
const validate = require('../lib/validate')
const constantsDefine = require('../constants')
// TODO:DB設計後要実装
// const pdfInvoiceController = require('../controllers/pdfInvoiceController')

const cbGetIndex = async (req, res, next) => {
  logger.info(constantsDefine.logMessage.INF000 + 'cbGetIndex')
  // 認証情報取得処理
  if (!req.session || !req.user?.userId) {
    return next(errorHelper.create(500))
  }

  // DBからuserデータ取得
  const user = await userController.findOne(req.user.userId)
  // データベースエラーは、エラーオブジェクトが返る
  // user未登録の場合もエラーを上げる
  if (user instanceof Error || user === null) return next(errorHelper.create(500))

  // TX依頼後に改修、ユーザステイタスが0以外の場合、「404」エラーとする not 403
  if (user.dataValues?.userStatus !== 0) return next(errorHelper.create(404))

  // DBから契約情報取得
  const contract = await contractController.findOne(req.user.tenantId)
  // データベースエラーは、エラーオブジェクトが返る
  // 契約情報未登録の場合もエラーを上げる
  if (contract instanceof Error || contract === null) return next(errorHelper.create(500))

  req.session.userContext = 'LoggedIn'

  // ユーザ権限を取得
  req.session.userRole = user.dataValues?.userRole
  const deleteFlag = contract.dataValues.deleteFlag
  const contractStatus = contract.dataValues.contractStatus
  const checkContractStatus = await helper.checkContractStatus(req.user.tenantId)

  if (checkContractStatus === null || checkContractStatus === 999) {
    return next(errorHelper.create(500))
  }

  if (!validate.isStatusForCancel(contractStatus, deleteFlag)) {
    return next(noticeHelper.create('cancelprocedure'))
  }

  // PDF請求書データの取得
  // const pdfInvoiceListArr = await pdfInvoiceController.getpdfInvoiceList(contract.contractId)
  // pdfInvoiceControllerが実装されるまで以下の仮データを利用
  const pdfInvoiceListArr = [
    {
      no: 1,
      invoiceNumber: '12345',
      invoiceDestinationCompanyName: 'ABC会社',
      totalAmmout: '123,456,788',
      updatedAt: '2009/12/10',
      paymentDate: '2009/12/31',
      invoiceState: 'ドラフト'
    }
  ]

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

router.get('/', helper.isAuthenticated, cbGetIndex)

module.exports = {
  router: router,
  cbGetIndex: cbGetIndex
}
