'use strict'
const express = require('express')
const router = express.Router()
const helper = require('./helpers/middleware')
const errorHelper = require('./helpers/error')
const noticeHelper = require('./helpers/notice')
const userController = require('../controllers/userController.js')
const contractController = require('../controllers/contractController.js')
const requestApprovalController = require('../controllers/requestApprovalController.js')
const approvalInboxController = require('../controllers/approvalInboxController.js')
const logger = require('../lib/logger')
const validate = require('../lib/validate')
const constantsDefine = require('../constants')
const inboxController = require('../controllers/inboxController')

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
  const pageId = ~~req.params.page
  const tenantId = user.tenantId
  const result = await inboxController.getInbox(accessToken, refreshToken, pageId, tenantId)
  const requestApprovalList = []

  // 請求書の承認依頼検索
  for (let i = 0; i < result.list.length; i++) {
    const requestApproval = await requestApprovalController.findOneRequestApproval(
      contract.contractId,
      result.list[i].documentId
    )

    if (requestApproval instanceof Error) return next(errorHelper.create(500))

    if (requestApproval !== null) {
      result.list[i].approveStatus = requestApproval.status
      const resultIds = await approvalInboxController.getApproval(requestApproval.requestId)
      if (!resultIds) {
        continue
      }
      if (user.userId === resultIds.approveUserId) {
        requestApprovalList.push(result.list[i])
      }
      if (user.userId === resultIds.requestUserId) {
        requestApprovalList.push(result.list[i])
      }
    }
  }

  // 受領した請求書一覧レンダリング
  res.render('inboxList', {
    listArr: result.list,
    requestApprovalList: requestApprovalList,
    numPages: result.numPages,
    currPage: result.currPage,
    rejectedFlag: false
  })

  logger.info(constantsDefine.logMessage.INF001 + 'cbGetIndex')
}

const cbGetIndexRedirected = async (req, res, next) => {
  logger.info(constantsDefine.logMessage.INF000 + 'cbGetIndexRedirected')
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
  const pageId = ~~req.params.page
  const tenantId = user.tenantId
  const result = await inboxController.getInbox(accessToken, refreshToken, pageId, tenantId)
  const requestApprovalList = []

  // 請求書の承認依頼検索
  for (let i = 0; i < result.list.length; i++) {
    const requestApproval = await requestApprovalController.findOneRequestApproval(
      contract.contractId,
      result.list[i].documentId
    )
    if (requestApproval instanceof Error) return next(errorHelper.create(500))

    if (requestApproval !== null) {
      result.list[i].approveStatus = requestApproval.status
      requestApprovalList.push(result.list[i])
    }
  }

  // 受領した請求書一覧レンダリング
  res.render('inboxList', {
    listArr: result.list,
    requestApprovalList: requestApprovalList,
    numPages: result.numPages,
    currPage: result.currPage,
    rejectedFlag: true
  })

  logger.info(constantsDefine.logMessage.INF001 + 'cbGetIndexRedirected')
}

const cbGetWorkflow = async (req, res, next) => {
  logger.info(constantsDefine.logMessage.INF000 + 'cbGetWorkflow')
  // 認証情報取得処理
  if (!req.session || !req.user?.userId) {
    return res.status(401).send('認証に失敗しました。')
  }

  // DBからuserデータ取得
  const user = await userController.findOne(req.user.userId)
  // データベースエラーは、エラーオブジェクトが返る
  // user未登録の場合もエラーを上げる
  if (user instanceof Error || user === null) return res.status(403).send('許可されていません。')

  // TX依頼後に改修、ユーザステイタスが0以外の場合、「404」エラーとする not 403
  if (user.dataValues?.userStatus !== 0) return res.status(403).send('許可されていません。')

  // DBから契約情報取得
  const contract = await contractController.findOne(req.user.tenantId)
  // データベースエラーは、エラーオブジェクトが返る
  // 契約情報未登録の場合もエラーを上げる
  if (contract instanceof Error || contract === null) return res.status(403).send('許可されていません。')

  req.session.userContext = 'LoggedIn'

  // ユーザ権限を取得
  req.session.userRole = user.dataValues?.userRole
  const deleteFlag = contract.dataValues.deleteFlag
  const contractStatus = contract.dataValues.contractStatus
  const checkContractStatus = await helper.checkContractStatus(req.user.tenantId)

  if (checkContractStatus === null || checkContractStatus === 999) {
    return res.status(403).send('許可されていません。')
  }

  if (!validate.isStatusForCancel(contractStatus, deleteFlag)) {
    return res.status(403).send('許可されていません。')
  }

  const userId = user.userId
  const contractId = contract.contractId
  const tradeshiftDTO = new (require('../DTO/TradeshiftDTO'))(
    req.user.accessToken,
    req.user.refreshToken,
    user.tenantId
  )
  const workflow = await inboxController.getWorkflow(userId, contractId, tradeshiftDTO)

  if (workflow instanceof Error === true) res.status(500).send('サーバーエラーが発生しました。')

  res.status(200).send(workflow)
  logger.info(constantsDefine.logMessage.INF001 + 'cbGetWorkflow')
}

router.get('/getWorkflow', cbGetWorkflow)
router.get('/:page', helper.isAuthenticated, cbGetIndex)
router.get('/redirected/:page', helper.isAuthenticated, cbGetIndexRedirected)

module.exports = {
  router: router,
  cbGetIndex: cbGetIndex,
  cbGetIndexRedirected: cbGetIndexRedirected,
  cbGetWorkflow: cbGetWorkflow
}
