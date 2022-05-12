'use strict'
const express = require('express')
const router = express.Router()
const helper = require('./helpers/middleware')
const errorHelper = require('./helpers/error')
const noticeHelper = require('./helpers/notice')
const userController = require('../controllers/userController.js')
const contractController = require('../controllers/contractController.js')
const requestApprovalController = require('../controllers/requestApprovalController.js')
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

  // 請求書の承認依頼検索
  for (let i = 0; i < result.list.length; i++) {
    const requestApproval = await requestApprovalController.findOneRequestApproval(
      contract.contractId,
      result.list[i].documentId
    )

    if (requestApproval instanceof Error) return next(errorHelper.create(500))

    if (requestApproval !== null) {
      result.list[i].approveStatus = requestApproval.status
    }
  }

  let rejectedFlag = false

  if (req.session.waitingApprovalList) {
    rejectedFlag = true
    delete req.session.waitingApprovalList
  }

  // 受領した請求書一覧レンダリング
  res.render('inboxList', {
    listArr: result.list,
    numPages: result.numPages,
    currPage: result.currPage,
    rejectedFlag: rejectedFlag
  })

  logger.info(constantsDefine.logMessage.INF001 + 'cbGetIndex')
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

const cbGetApprovals = async (req, res, next) => {
  logger.info(constantsDefine.logMessage.INF000 + 'cbGetApprovals')
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
  const pageId = 1
  const tenantId = user.tenantId
  const result = await inboxController.getInbox(accessToken, refreshToken, pageId, tenantId)

  // 請求書の承認依頼検索
  for (let i = 0; i < result.list.length; i++) {
    const requestApproval = await requestApprovalController.findOneRequestApproval(
      contract.contractId,
      result.list[i].documentId
    )

    if (requestApproval instanceof Error) return next(errorHelper.create(500))

    if (requestApproval !== null) {
      result.list[i].approveStatus = requestApproval.status
    }
  }

  let rejectedFlag = true

  if (req.session.waitingApprovalList) {
    rejectedFlag = true
    delete req.session.waitingApprovalList
  }

  // 受領した請求書一覧レンダリング
  res.render('inboxList', {
    listArr: result.list,
    numPages: result.numPages,
    currPage: result.currPage,
    rejectedFlag: rejectedFlag
  })

  logger.info(constantsDefine.logMessage.INF001 + 'cbGetApprovals')
}

const cbSearchApprovedInvoice = async (req, res, next) => {
  logger.info(constantsDefine.logMessage.INF000 + 'cbSearchApprovedInvoice')

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
  const tenantId = user.tenantId

  const invoiceNumber = req.body.invoiceNumber
  const minIssuedate = req.body.minIssuedate
  const maxIssuedate = req.body.maxIssuedate
  const sentBy = req.body.sentBy || []
  const status = req.body.status || []
  const contactEmail = req.body.managerAddress

  const tradeshiftDTO = new (require('../DTO/TradeshiftDTO'))(accessToken, refreshToken, tenantId)
  const keyword = { invoiceNumber, issueDate: [minIssuedate, maxIssuedate], sentBy, status, contactEmail }
  const resultList = await inboxController.getSearchResult(tradeshiftDTO, keyword, contract.contractId, tenantId)

  if (resultList instanceof Error) {
    if (String(resultList.response?.status).slice(0, 1) === '4') {
      // 400番エラーの場合
      logger.error(resultList)
      req.flash('noti', ['支払依頼一覧', constantsDefine.statusConstants.CSVDOWNLOAD_APIERROR])
      return res.redirect('/inboxList/1')
    } else {
      return next(errorHelper.create(500))
    }
  }

  // 支払一覧画面レンダリング
  if (resultList.length !== 0) {
    res.render('inboxList', {
      listArr: resultList,
      numPages: 1,
      currPage: 1,
      rejectedFlag: false
    })
  } else {
    res.render('inboxList', {
      listArr: resultList,
      numPages: 1,
      currPage: 1,
      rejectedFlag: false,
      message: '条件に合致する支払依頼が見つかりませんでした。'
    })
  }
  logger.info(constantsDefine.logMessage.INF001 + 'cbSearchApprovedInvoice')
}

router.get('/getWorkflow', cbGetWorkflow)
router.get('/approvals', helper.isAuthenticated, cbGetApprovals)
router.get('/:page', helper.isAuthenticated, cbGetIndex)
router.post('/:page', helper.isAuthenticated, cbSearchApprovedInvoice)

module.exports = {
  router: router,
  cbGetIndex: cbGetIndex,
  cbGetWorkflow: cbGetWorkflow,
  cbGetApprovals: cbGetApprovals,
  cbSearchApprovedInvoice: cbSearchApprovedInvoice
}
