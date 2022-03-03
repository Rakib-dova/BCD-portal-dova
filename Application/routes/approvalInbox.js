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
const inboxController = require('../controllers/inboxController')
const notiTitle = '仕分け情報設定'

const bodyParser = require('body-parser')
router.use(
  bodyParser.json({
    type: 'application/json',
    limit: '6826KB'
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
  const checkContractStatus = await helper.checkContractStatus(req.user.tenantId)

  if (checkContractStatus === null || checkContractStatus === 999) {
    return next(errorHelper.create(500))
  }

  if (!validate.isStatusForCancel(contractStatus, deleteFlag)) {
    return next(noticeHelper.create('cancelprocedure'))
  }

  // ページ取得
  const accessToken = req.user.accessToken
  const refreshToken = req.user.refreshToken
  const invoiceId = req.params.invoiceId
  let result
  const contractId = contract.contractId

  try {
    result = await inboxController.getInvoiceDetail(accessToken, refreshToken, invoiceId, contract.contractId)
  } catch (error) {
    logger.error({ stack: error.stack, status: 1 })
    req.flash('noti', [notiTitle, 'システムエラーが発生しました。'])
    return res.redirect('/approvalInboxList/1')
  }

  const requestApproval = await approvalInboxController.getRequestApproval(contractId, invoiceId)
  const approverRouteId = requestApproval.approveRouteId
  const approveRoute = await approverController.getApproveRoute(accessToken, refreshToken, contractId, approverRouteId)

  res.render('approvalInbox', {
    ...result,
    documentId: invoiceId,
    approveRoute: approveRoute
  })

  logger.info(constantsDefine.logMessage.INF001 + 'cbGetIndex')
}

/**
 * ダミーコントローラ
 */
const approvalInboxController = {
  /**
   *
   * @param {uuid} contractId
   * @param {uuid} invoiceId
   * @returns {RequestApproval} RequestApproval
   */
  getRequestApproval: async (contractId, invoiceId) => {
    const RequestApproval = require('../models').RequestApproval
    const request = RequestApproval.build({
      contractId: contractId,
      approveRouteId: 'dummy-data',
      invoiceId: invoiceId,
      message: 'ダミーデータのメッセージ'
    })
    return request
  }
}

const approverController = {
  /**
   *
   * @param {STRING} accessToken
   * @param {STRING} refreshToken
   * @param {uuid} contractId
   * @param {uuid} approveRouteId
   */
  getApproveRoute: async (accessToken, refreshToken, contractId, approveRouteId) => {
    const Approver = function () {
      this.tenantId = 'dummy-data'
      this.FirstName = ''
      this.LastName = ''
      this.Username = ''
    }
    const dummyApproveRoute = {
      approveRouteId: approveRouteId,
      contractId: contractId,
      name: 'ダミー承認ルート',
      users: []
    }

    for (let idx = 0; idx < 12; idx++) {
      const user = new Approver()
      user.FirstName = 'ユーザー'
      user.LastName = idx + 1
      dummyApproveRoute.users.push(user)
    }

    return dummyApproveRoute
  }
}

router.get('/:invoiceId', helper.isAuthenticated, cbGetIndex)

module.exports = {
  router: router,
  cbGetIndex: cbGetIndex
}
