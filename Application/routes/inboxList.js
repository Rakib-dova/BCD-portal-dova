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
const csrf = require('csurf')
const csrfProtection = csrf({ cookie: false })

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
  // const contract = await contractController.findOne(req.user.tenantId)
  // データベースエラーは、エラーオブジェクトが返る
  // // 契約情報未登録の場合もエラーを上げる
  // if (contract instanceof Error || contract === null) return next(errorHelper.create(500))

  req.session.userContext = 'LoggedIn'

  // ユーザ権限を取得
  req.session.userRole = user.dataValues?.userRole
  // const deleteFlag = contract.dataValues.deleteFlag
  // const contractStatus = contract.dataValues.contractStatus
  // const checkContractStatus = await helper.checkContractStatus(req.user.tenantId)

  // if (checkContractStatus === null || checkContractStatus === 999) {
  //   return next(errorHelper.create(500))
  // }

  // if (!validate.isStatusForCancel(contractStatus, deleteFlag)) {
  //   return next(noticeHelper.create('cancelprocedure'))
  // }

  // テナントIDに紐付いている全ての契約情報を取得
  const contracts = await contractController.findContractsBytenantId(req.user.tenantId)
  if (!contracts || !Array.isArray(contracts) || contracts.length === 0) return next(errorHelper.create(500))

  // BCD無料アプリの契約情報確認
  const bcdContract = contracts.find((contract) => contract.serviceType === '010' && contract.deleteFlag === false)
  if (!bcdContract || !bcdContract.contractStatus) return next(errorHelper.create(500))

  // 現在解約中か確認
  if (validate.isBcdCancelling(bcdContract)) return next(noticeHelper.create('cancelprocedure'))

  // bcdAuthenticateを利用して、ユーザー権限確認すると決めた場合
  // const user = req.dbUser
  // const contracts = req.contracts

  let presentation = 'inboxList'
  const lightPlan = await contractController.findLightPlan(req.user.tenantId)
  if (lightPlan) {
    presentation = 'inboxList_light_plan'
  }

  // ページ取得
  const accessToken = req.user.accessToken
  const refreshToken = req.user.refreshToken
  const pageId = ~~req.params.page
  const tenantId = user.tenantId
  const result = await inboxController.getInbox(accessToken, refreshToken, pageId, tenantId, presentation)

  // 請求書の承認依頼検索
  for (let i = 0; i < result.list.length; i++) {
    const requestApproval = await requestApprovalController.findOneRequestApproval(
      bcdContract.contractId,
      result.list[i].documentId
    )

    if (requestApproval instanceof Error) return next(errorHelper.create(500))

    if (requestApproval !== null) {
      result.list[i].approveStatus = requestApproval.status
    }
  }

  const rejectedFlag = false

  // 受領した請求書一覧レンダリング
  res.render(presentation, {
    listArr: result.list,
    numPages: result.numPages,
    currPage: result.currPage,
    itemCount: result.itemCount,
    currItemCount: result.currItemCount,
    rejectedFlag: rejectedFlag,
    csrfToken: req.csrfToken(),
    userRole: req.session.userRole,
    contractPlan: req.contractPlan,
    isSearch: false
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

  let presentation
  const lightPlan = await contractController.findLightPlan(req.user.tenantId)
  if (lightPlan) {
    presentation = 'inboxList_light_plan'
  }

  const workflow = await inboxController.getWorkflow(userId, contractId, tradeshiftDTO, presentation)

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

  let presentation = 'inboxList'
  const lightPlan = await contractController.findLightPlan(req.user.tenantId)
  if (lightPlan) {
    presentation = 'inboxList_light_plan'
  }

  // ページ取得
  const accessToken = req.user.accessToken
  const refreshToken = req.user.refreshToken
  const pageId = 1
  const tenantId = user.tenantId
  const result = await inboxController.getInbox(accessToken, refreshToken, pageId, tenantId, presentation)

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

  const rejectedFlag = true

  // 受領した請求書一覧レンダリング
  res.render(presentation, {
    listArr: result.list,
    numPages: result.numPages,
    currPage: result.currPage,
    rejectedFlag: rejectedFlag,
    csrfToken: req.csrfToken(),
    userRole: req.session.userRole,
    contractPlan: req.contractPlan,
    isSearch: false
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

  // // DBから契約情報取得
  // const contract = await contractController.findOne(req.user.tenantId)
  // // データベースエラーは、エラーオブジェクトが返る
  // // 契約情報未登録の場合もエラーを上げる
  // if (contract instanceof Error || contract === null) return next(errorHelper.create(500))

  req.session.userContext = 'LoggedIn'

  // ユーザ権限を取得
  req.session.userRole = user.dataValues?.userRole
  // const deleteFlag = contract.dataValues.deleteFlag
  // const contractStatus = contract.dataValues.contractStatus
  // const checkContractStatus = await helper.checkContractStatus(req.user.tenantId)

  // if (checkContractStatus === null || checkContractStatus === 999) {
  //   return next(errorHelper.create(500))
  // }

  // if (!validate.isStatusForCancel(contractStatus, deleteFlag)) {
  //   return next(noticeHelper.create('cancelprocedure'))
  // }

  // テナントIDに紐付いている全ての契約情報を取得
  const contracts = await contractController.findContractsBytenantId(req.user.tenantId)
  if (!contracts || !Array.isArray(contracts) || contracts.length === 0) return next(errorHelper.create(500))

  // BCD無料アプリの契約情報確認
  const bcdContract = contracts.find((contract) => contract.serviceType === '010' && contract.deleteFlag === false)
  if (!bcdContract || !bcdContract.contractStatus) return next(errorHelper.create(500))

  // 現在解約中か確認
  if (validate.isBcdCancelling(bcdContract)) return next(noticeHelper.create('cancelprocedure'))

  // bcdAuthenticateを利用して、ユーザー権限確認すると決めた場合
  // const user = req.dbUser
  // const contracts = req.contracts

  const lightPlan = await contractController.findLightPlan(req.user.tenantId)
  if (!lightPlan) {
    return res.redirect('/inboxList/1')
  }
  const presentation = 'inboxList_light_plan'

  // ページ取得
  const accessToken = req.user.accessToken
  const refreshToken = req.user.refreshToken
  const tenantId = user.tenantId

  const companyInfo = req.body.sentBy ?? [',']

  const invoiceNumber = req.body.invoiceNumber ?? ''
  const minIssuedate = req.body.minIssuedate ?? ''
  const maxIssuedate = req.body.maxIssuedate ?? ''
  const companyName = companyInfo[0]?.split(',')[0] ?? ''
  const sentBy = companyInfo[0]?.split(',')[1] ?? ''
  const sent = req.body.sendTo ?? ''
  const status = req.body.status || []
  const contactEmail = req.body.managerAddress
  const unKnownManager = req.body.unKnownManager
  const pageId = ~~req.params.page

  switch (validate.isContactEmail(contactEmail)) {
    case -1:
      logger.info(
        `contractId:${bcdContract.contractId}, msg: ${constantsDefine.statusConstants.INBOXLIST_CONTACT_EMAIL_NOT_VERIFY_TYPE}`
      )
      req.flash('noti', ['支払依頼一覧', constantsDefine.statusConstants.INBOXLIST_CONTACT_EMAIL_NOT_VERIFY_TYPE])
      return res.redirect('/inboxList/1')
    case -2:
      logger.info(
        `contractId:${bcdContract.contractId}, msg: ${constantsDefine.statusConstants.INBOXLIST_CONTACT_EMAIL_NOT_VERIFY_SPACE}`
      )
      req.flash('noti', ['支払依頼一覧', constantsDefine.statusConstants.INBOXLIST_CONTACT_EMAIL_NOT_VERIFY_SPACE])
      return res.redirect('/inboxList/1')
    default:
      // 成功の場合
      break
  }

  const tradeshiftDTO = new (require('../DTO/TradeshiftDTO'))(accessToken, refreshToken, tenantId)
  const keyword = {
    invoiceNumber,
    issueDate: [minIssuedate, maxIssuedate],
    companyName,
    sentBy,
    sent,
    status,
    contactEmail,
    unKnownManager,
    pageId
  }
  const resultList = await inboxController.getSearchResult(tradeshiftDTO, keyword, bcdContract.contractId, tenantId)

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
  if (resultList.documentList.length !== 0) {
    res.render(presentation, {
      listArr: resultList.documentList,
      numPages: resultList.numPages,
      currPage: resultList.currPage,
      itemCount: resultList.itemCount,
      currItemCount: resultList.currItemCount,
      rejectedFlag: false,
      csrfToken: req.csrfToken(),
      userRole: req.session.userRole,
      contractPlan: req.contractPlan,
      isSearch: true,
      keyword: keyword
    })
  } else {
    res.render(presentation, {
      listArr: resultList.documentList,
      numPages: 1,
      currPage: 1,
      itemCount: 0,
      currItemCount: 0,
      rejectedFlag: false,
      message: '条件に合致する支払依頼が見つかりませんでした。',
      csrfToken: req.csrfToken(),
      userRole: req.session.userRole,
      contractPlan: req.contractPlan,
      isSearch: true,
      keyword: keyword
    })
  }
  logger.info(constantsDefine.logMessage.INF001 + 'cbSearchApprovedInvoice')
}

router.get('/getWorkflow', cbGetWorkflow)
router.get('/approvals', helper.isAuthenticated, helper.getContractPlan, csrfProtection, cbGetApprovals)
router.get('/:page', csrfProtection, helper.bcdAuthenticate, helper.getContractPlan, cbGetIndex)
router.post('/:page', csrfProtection, helper.bcdAuthenticate, helper.getContractPlan, cbSearchApprovedInvoice)

module.exports = {
  router: router,
  cbGetIndex: cbGetIndex,
  cbGetWorkflow: cbGetWorkflow,
  cbGetApprovals: cbGetApprovals,
  cbSearchApprovedInvoice: cbSearchApprovedInvoice
}
