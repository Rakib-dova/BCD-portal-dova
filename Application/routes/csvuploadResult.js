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
const invoiceController = require('../controllers/invoiceController')
const invoiceDetailController = require('../controllers/invoiceDetailController')

const bodyParser = require('body-parser')
router.use(
  bodyParser.json({
    type: 'application/json',
    limit: '100KB'
  })
)

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

  if (!validate.isStatusForCancel(contractStatus, deleteFlag)) {
    return next(noticeHelper.create('cancelprocedure'))
  }

  const csvuploadResultArr = []
  const result = await invoiceController.findforTenant(req.user.tenantId)

  try {
    const timeStamp = (date) => {
      const now = new Date(date)
      const year = now.getFullYear()
      const month = now.getMonth() + 1 < 10 ? '0' + (now.getMonth() + 1) : now.getMonth() + 1
      const day = now.getDate() < 10 ? '0' + now.getDate() : now.getDate()
      const hour = now.getHours() < 10 ? '0' + now.getHours() : now.getHours()
      const min = now.getMinutes() < 10 ? '0' + now.getMinutes() : now.getMinutes()
      const sec = now.getSeconds() < 10 ? '0' + now.getSeconds() : now.getSeconds()
      const stamp = `${year}/${month}/${day} ${hour}:${min}:${sec}`
      return stamp
    }

    result.map((currVal, index) => {
      const invoice = currVal
      const invoiceAll =
        ~~invoice.dataValues.successCount + ~~invoice.dataValues.skipCount + ~~invoice.dataValues.failCount
      let status = false
      if (~~invoice.dataValues.failCount === 0 && invoice.dataValues.failCount !== '-') {
        status = true
      }

      csvuploadResultArr.push({
        index: index + 1,
        date: timeStamp(invoice.dataValues.updatedAt),
        filename: invoice.dataValues.csvFileName,
        invoicesAll: invoiceAll,
        invoicesCount: invoice.dataValues.invoiceCount,
        invoicesSuccess: invoice.dataValues.successCount,
        invoicesSkip: invoice.dataValues.skipCount,
        invoicesFail: invoice.dataValues.failCount,
        status: status,
        invoiceId: invoice.dataValues.invoicesId
      })
      return ''
    })
  } catch (error) {
    logger.error({ page: 'csvuploadResult', msg: '請求書を取得失敗しました。' })
    logger.error(error)
  }

  // ユーザ権限も画面に送る
  res.render('csvuploadResult', {
    csvuploadResultArr: csvuploadResultArr
  })
  logger.info(constantsDefine.logMessage.INF001 + 'cbGetIndex')
}

const cbPostIndex = async (req, res, next) => {
  logger.info(constantsDefine.logMessage.INF000 + 'cbPostIndex')
  let resultStatusCode
  let invoicesId
  if (!req.session || !req.user?.userId) {
    resultStatusCode = 403
    return res.status(resultStatusCode).send()
  }

  if (req.body.invoicsesId === undefined) {
    resultStatusCode = 400
    return res.status(resultStatusCode).send()
  } else {
    invoicesId = req.body.invoicsesId
  }

  if (!validate.isUUID(invoicesId)) {
    resultStatusCode = 400
    return res.status(resultStatusCode).send()
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

  // ユーザ権限を取得
  req.session.userRole = user.dataValues?.userRole
  const deleteFlag = contract.dataValues.deleteFlag
  const contractStatus = contract.dataValues.contractStatus

  if (!validate.isStatusForCancel(contractStatus, deleteFlag)) {
    return next(noticeHelper.create('cancelprocedure'))
  }

  const csvuploadResultDetailsArr = []

  // データを取得し、格納
  try {
    const result = await invoiceDetailController.findInvoiceDetail(invoicesId)
    resultStatusCode = 200
    result.map((currVal) => {
      const invoiceDetail = currVal
      let status = ''

      switch (invoiceDetail.dataValues.status) {
        case '1':
          status = 'スキップ'
          break
        case '0':
          status = '成功'
          break
        default:
          status = '失敗'
          break
      }

      csvuploadResultDetailsArr.push({
        lines: invoiceDetail.dataValues.lines,
        invoiceId: invoiceDetail.dataValues.invoiceId,
        status: status,
        errorData: invoiceDetail.dataValues.errorData
      })
      return ''
    })
  } catch (error) {
    resultStatusCode = 500
    logger.error({ page: 'csvuploadResult', msg: '請求書を取得失敗しました。' })
    logger.error(error)
  }

  // データ送信
  return res.status(resultStatusCode).send(csvuploadResultDetailsArr)
}

router.get('/', helper.isAuthenticated, helper.isTenantRegistered, helper.isUserRegistered, cbGetIndex)
router.post('/', helper.isAuthenticated, cbPostIndex)

module.exports = {
  router: router,
  cbGetIndex: cbGetIndex,
  cbPostIndex: cbPostIndex
}
