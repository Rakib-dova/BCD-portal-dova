'use strict'

const express = require('express')
const router = express.Router()
const helper = require('./helpers/middleware')
const validate = require('../lib/validate')
const errorHelper = require('./helpers/error')
const noticeHelper = require('./helpers/notice')
const userController = require('../controllers/userController.js')
const contractController = require('../controllers/contractController.js')
const logger = require('../lib/logger')
const sendMail = require('../lib/sendMail')
const constantsDefine = require('../constants')
const inboxController = require('../controllers/inboxController')
const notiTitle = '承認依頼'

const bodyParser = require('body-parser')
const approverController = require('../controllers/approverController')
router.use(
  bodyParser.json({
    type: 'application/json',
    limit: '6826KB'
  })
)

const cbGetRequestApproval = async (req, res, next) => {
  logger.info(constantsDefine.logMessage.INF000 + 'cbGetRequestApproval')

  // 認証情報取得処理
  if (!req.session || !req.user?.userId) return next(errorHelper.create(500))

  // DBからuserデータ取得
  const user = await userController.findOne(req.user.userId)
  // データベースエラーは、エラーオブジェクトが返る
  // user未登録の場合もエラーを上げる
  if (user instanceof Error || user === null) return next(errorHelper.create(500))

  // TX依頼後に改修、ユーザステイタスが0以外の場合、「404」エラーとする not 403
  if (user.dataValues?.userStatus !== 0) return next(errorHelper.create(404))
  if (req.session?.userContext !== 'LoggedIn') return next(errorHelper.create(400))

  // DBから契約情報取得
  const contract = await contractController.findOne(req.user.tenantId)
  // データベースエラーは、エラーオブジェクトが返る
  // 契約情報未登録の場合もエラーを上げる
  if (contract instanceof Error || contract === null) return next(errorHelper.create(500))

  // ユーザ権限を取得
  req.session.userRole = user.dataValues?.userRole
  const deleteFlag = contract.dataValues.deleteFlag
  const contractStatus = contract.dataValues.contractStatus
  const checkContractStatus = await helper.checkContractStatus(req.user.tenantId)

  if (checkContractStatus === null || checkContractStatus === 999) return next(errorHelper.create(500))

  if (!validate.isStatusForCancel(contractStatus, deleteFlag)) return next(noticeHelper.create('cancelprocedure'))

  // ページ取得
  const accessToken = req.user.accessToken
  const refreshToken = req.user.refreshToken
  const invoiceId = req.params.invoiceId
  let result
  try {
    result = await inboxController.getInvoiceDetail(accessToken, refreshToken, invoiceId, contract.contractId)
  } catch (error) {
    logger.error({ stack: error.stack, status: 1 })
    req.flash('noti', [notiTitle, 'システムエラーが発生しました。'])
    return res.redirect('/inboxList/1')
  }

  // 受領した請求書一覧レンダリング
  // オプション欄
  const optionLine1 = []
  if (result.options.issueDate) {
    optionLine1.push({ columnName: '請求日', columnData: result.options.issueDate })
  }
  if (result.options.taxPointDate) {
    optionLine1.push({ columnName: '課税日', columnData: result.options.taxPointDate })
  }
  if (result.options.bookingNumber) {
    optionLine1.push({ columnName: '予約番号', columnData: result.options.bookingNumber })
  }
  if (result.options.documentCurrencyCode) {
    optionLine1.push({ columnName: '通貨', columnData: result.options.documentCurrencyCode })
  }

  const optionLine2 = []
  if (result.options.paymentDueDate) {
    optionLine2.push({ columnName: '支払期日', columnData: result.options.paymentDueDate })
  }
  if (result.options.orderRef) {
    if (result.options.orderRef.no) {
      optionLine2.push({ columnName: '注文書番号', columnData: result.options.orderRef.no })
    }
    if (result.options.orderRef.issueDate) {
      optionLine2.push({ columnName: '注文書発行日', columnData: result.options.orderRef.issueDate })
    }
  }
  if (result.options.invoiceDocRef) {
    optionLine2.push({ columnName: '参考情報', columnData: result.options.invoiceDocRef })
  }

  const optionLine3 = []
  if (result.options.actualDeliveryDate) {
    optionLine3.push({ columnName: '納品日', columnData: result.options.actualDeliveryDate })
  }
  if (result.options.promisedDeliveryPeriod && result.options.promisedDeliveryPeriod.startDate) {
    optionLine3.push({ columnName: '納品開始日', columnData: result.options.promisedDeliveryPeriod.startDate })
  }

  if (result.options.contractDocumentRef) {
    optionLine3.push({ columnName: '契約書番号', columnData: result.options.contractDocumentRef })
  }

  if (result.options.accountingCost) {
    optionLine3.push({ columnName: '部門', columnData: result.options.accountingCost })
  }

  const optionLine4 = []
  if (result.options.promisedDeliveryPeriod && result.options.promisedDeliveryPeriod.endDate) {
    optionLine4.push({ columnName: '納品終了日', columnData: result.options.promisedDeliveryPeriod.endDate })
  }
  if (result.options.deliveryTerms) {
    optionLine4.push({ columnName: '納期', columnData: result.options.deliveryTerms })
  }
  if (result.options.customerAssAccId) {
    optionLine4.push({ columnName: 'ID', columnData: result.options.customerAssAccId })
  }
  if (result.options.boldId) {
    optionLine4.push({ columnName: '輸送情報', columnData: result.options.boldId })
  }

  const optionLine5 = []
  if (result.options.despatch) {
    optionLine5.push({ columnName: '販売者の手数料番号', columnData: result.options.despatch })
  }
  if (result.options.physicalLocation) {
    optionLine5.push({ columnName: 'DUNSナンバー', columnData: result.options.physicalLocation })
  }
  if (result.options.contactEmail) {
    optionLine5.push({ columnName: '取引先担当者(アドレス)', columnData: result.options.contactEmail })
  }

  const optionLine6 = []
  if (result.options.interimHours) {
    optionLine6.push({ columnName: '暫定時間', columnData: result.options.interimHours })
  }

  if (result.options.clearanceClave) {
    optionLine6.push({ columnName: '通関識別情報', columnData: result.options.clearanceClave })
  }

  if (result.options.tsClearance) {
    optionLine6.push({ columnName: 'Tradeshiftクリアランス', columnData: result.options.tsClearance })
  }

  const optionLine7 = {}
  if (result.options.fileId) {
    optionLine7.columnName = '備考'
    optionLine7.columnData = result.options.fileId
  }

  const optionLine8 = {}
  if (result.options.note) {
    optionLine8.columnName = 'その他特記事項'
    optionLine8.columnData = result.options.note
  }

  const contractId = contract.contractId
  const tenantId = contract.tenantId
  let approveRouteId = null
  let message = null
  let approveRoute = null
  let isSaved = false
  let rejectedUser = null
  if (req.session.requestApproval) {
    message = req.session.requestApproval.message
    approveRouteId = req.session.requestApproval.approveRouteId
    isSaved = req.session.requestApproval.isSaved
  }
  const approval = await approverController.readApproval(contractId, invoiceId, isSaved)
  if (approval && approval.status === '80') {
    approveRouteId = approval.approveRouteId
    message = approval.message
  } else if (approval && approval.status === '90' && approval.requester === req.user.userId) {
    rejectedUser = await approverController.getApprovalFromRejected(
      accessToken,
      refreshToken,
      tenantId,
      contractId,
      approval.requestId
    )

    if (rejectedUser instanceof Error) return next(errorHelper.create(500))
  }

  if (approveRouteId) {
    approveRoute = await approverController.getApproveRoute(accessToken, refreshToken, contractId, approveRouteId)
  }

  // 承認依頼画面render
  res.render('requestApproval', {
    ...result,
    optionLine1: optionLine1,
    optionLine2: optionLine2,
    optionLine3: optionLine3,
    optionLine4: optionLine4,
    optionLine5: optionLine5,
    optionLine6: optionLine6,
    optionLine7: optionLine7,
    optionLine8: optionLine8,
    documentId: invoiceId,
    message: message,
    approveRoute: approveRoute,
    rejectedUser: rejectedUser
  })

  logger.info(constantsDefine.logMessage.INF001 + 'cbGetRequestApproval')
}

const cbPostSave = async (req, res, next) => {
  logger.info(constantsDefine.logMessage.INF000 + 'cbPostSave')

  // 認証情報取得処理
  if (!req.session || !req.user?.userId) return next(errorHelper.create(500))

  // DBからuserデータ取得
  const user = await userController.findOne(req.user.userId)
  // データベースエラーは、エラーオブジェクトが返る
  // user未登録の場合もエラーを上げる
  if (user instanceof Error || user === null) return next(errorHelper.create(500))

  // TX依頼後に改修、ユーザステイタスが0以外の場合、「404」エラーとする not 403
  if (user.dataValues?.userStatus !== 0) return next(errorHelper.create(404))
  if (req.session?.userContext !== 'LoggedIn') return next(errorHelper.create(400))

  // DBから契約情報取得
  const contract = await contractController.findOne(req.user.tenantId)
  // データベースエラーは、エラーオブジェクトが返る
  // 契約情報未登録の場合もエラーを上げる
  if (contract instanceof Error || contract === null) return next(errorHelper.create(500))

  // ユーザ権限を取得
  req.session.userRole = user.dataValues?.userRole
  const deleteFlag = contract.dataValues.deleteFlag
  const contractStatus = contract.dataValues.contractStatus
  const checkContractStatus = await helper.checkContractStatus(req.user.tenantId)

  if (checkContractStatus === null || checkContractStatus === 999) return next(errorHelper.create(500))

  if (!validate.isStatusForCancel(contractStatus, deleteFlag)) return next(noticeHelper.create('cancelprocedure'))

  // invoiceId取得及び確認
  const invoiceId = req.params.invoiceId
  if (!validate.isUUID(invoiceId)) {
    logger.info(constantsDefine.logMessage.INF001 + 'cbPostIndex')
    return res.status(400).send('400 Bad Request')
  }

  const contractId = contract.contractId
  const message = req.body.message
  const requester = req.user.userId
  const approveRouteId = req.body.approveRouteId
  const result = await approverController.saveMessage(contractId, invoiceId, requester, message, approveRouteId)

  switch (result) {
    case 0:
      req.flash('info', 'メッセージを保存しました。')
      req.session.requestApproval = {
        isSaved: true,
        message: message,
        approveRouteId: approveRouteId
      }
      res.redirect(`/requestApproval/${invoiceId}`)
      break
    default:
      req.flash('noti', ['支払依頼', '保存失敗しました。'])
      res.redirect(`/requestApproval/${invoiceId}`)
      break
  }

  logger.info(constantsDefine.logMessage.INF001 + 'cbPostSave')
}

const cbPostGetDetailApproveRoute = async (req, res, next) => {
  logger.info(constantsDefine.logMessage.INF000 + 'cbGetRequestApproval')

  // 認証情報取得処理
  if (!req.session || !req.user?.userId) return next(errorHelper.create(500))

  // DBからuserデータ取得
  const user = await userController.findOne(req.user.userId)
  // データベースエラーは、エラーオブジェクトが返る
  // user未登録の場合もエラーを上げる
  if (user instanceof Error || user === null) return next(errorHelper.create(500))

  // TX依頼後に改修、ユーザステイタスが0以外の場合、「404」エラーとする not 403
  if (user.dataValues?.userStatus !== 0) return next(errorHelper.create(404))
  if (req.session?.userContext !== 'LoggedIn') return next(errorHelper.create(400))

  // DBから契約情報取得
  const contract = await contractController.findOne(req.user.tenantId)
  // データベースエラーは、エラーオブジェクトが返る
  // 契約情報未登録の場合もエラーを上げる
  if (contract instanceof Error || contract === null) return next(errorHelper.create(500))

  // ユーザ権限を取得
  req.session.userRole = user.dataValues?.userRole
  const deleteFlag = contract.dataValues.deleteFlag
  const contractStatus = contract.dataValues.contractStatus
  const checkContractStatus = await helper.checkContractStatus(req.user.tenantId)

  if (checkContractStatus === null || checkContractStatus === 999) return next(errorHelper.create(500))

  if (!validate.isStatusForCancel(contractStatus, deleteFlag)) return next(noticeHelper.create('cancelprocedure'))

  if (req.body.approveRouteId === undefined) {
    return res.status(400).send('bad request')
  }

  const accessToken = req.user.accessToken
  const refreshToken = req.user.refreshToken
  const contractId = contract.contractId
  const approveRouteId = req.body.approveRouteId

  const approveRoute = await approverController.getApproveRoute(accessToken, refreshToken, contractId, approveRouteId)

  res.status(200).send({
    approveRouteId: approveRouteId,
    name: approveRoute.name,
    users: approveRoute.users
  })
}

const cbPostGetApproveRoute = async (req, res, next) => {
  logger.info(constantsDefine.logMessage.INF000 + 'cbPostGetApproveRoute')

  // 認証情報取得処理
  if (!req.session || !req.user?.userId) return next(errorHelper.create(500))

  // DBからuserデータ取得
  const user = await userController.findOne(req.user.userId)
  // データベースエラーは、エラーオブジェクトが返る
  // user未登録の場合もエラーを上げる
  if (user instanceof Error || user === null) return next(errorHelper.create(500))

  // TX依頼後に改修、ユーザステイタスが0以外の場合、「404」エラーとする not 403
  if (user.dataValues?.userStatus !== 0) return next(errorHelper.create(404))
  if (req.session?.userContext !== 'LoggedIn') return next(errorHelper.create(400))

  // DBから契約情報取得
  const contract = await contractController.findOne(req.user.tenantId)
  // データベースエラーは、エラーオブジェクトが返る
  // 契約情報未登録の場合もエラーを上げる
  if (contract instanceof Error || contract === null) return next(errorHelper.create(500))

  // ユーザ権限を取得
  req.session.userRole = user.dataValues?.userRole
  const deleteFlag = contract.dataValues.deleteFlag
  const contractStatus = contract.dataValues.contractStatus
  const checkContractStatus = await helper.checkContractStatus(req.user.tenantId)

  if (checkContractStatus === null || checkContractStatus === 999) return next(errorHelper.create(500))

  if (!validate.isStatusForCancel(contractStatus, deleteFlag)) return next(noticeHelper.create('cancelprocedure'))

  const departmentCode = req.body.approveRoute ?? ''
  const contractId = contract.contractId

  // DBの承認ルートを検索する。
  const { status, searchResult } = await approverController.searchApproveRouteList(contractId, departmentCode)

  if (searchResult instanceof Error) {
    logger.info(constantsDefine.logMessage.INF001 + 'cbPostGetApproveRoute')
    return res.status(500).send('500 Internal Server Error')
  }

  // 検索結果
  // 0：検索処理が正常になること
  switch (status) {
    case 0:
      return res.status(200).send(searchResult)
  }
}

const cbPostApproval = async (req, res, next) => {
  logger.info(constantsDefine.logMessage.INF000 + 'cbPostApproval')

  // 認証情報取得処理
  if (!req.session || !req.user?.userId) return next(errorHelper.create(500))

  // DBからuserデータ取得
  const user = await userController.findOne(req.user.userId)
  // データベースエラーは、エラーオブジェクトが返る
  // user未登録の場合もエラーを上げる
  if (user instanceof Error || user === null) return next(errorHelper.create(500))

  // TX依頼後に改修、ユーザステイタスが0以外の場合、「404」エラーとする not 403
  if (user.dataValues?.userStatus !== 0) return next(errorHelper.create(404))
  if (req.session?.userContext !== 'LoggedIn') return next(errorHelper.create(400))

  // DBから契約情報取得
  const contract = await contractController.findOne(req.user.tenantId)
  // データベースエラーは、エラーオブジェクトが返る
  // 契約情報未登録の場合もエラーを上げる
  if (contract instanceof Error || contract === null) return next(errorHelper.create(500))

  // ユーザ権限を取得
  req.session.userRole = user.dataValues?.userRole
  const deleteFlag = contract.dataValues.deleteFlag
  const contractStatus = contract.dataValues.contractStatus
  const checkContractStatus = await helper.checkContractStatus(req.user.tenantId)

  if (checkContractStatus === null || checkContractStatus === 999) return next(errorHelper.create(500))

  if (!validate.isStatusForCancel(contractStatus, deleteFlag)) return next(noticeHelper.create('cancelprocedure'))

  const contractId = contract.contractId
  const invoiceId = req.params.invoiceId
  const requester = req.user.userId
  const message = req.body.message
  const approveRouteId = req.body.approveRouteId
  const accessToken = req.user.accessToken
  const refreshToken = req.user.refreshToken

  // 承認ルートに誤りがある場合
  const isApproveRoute = await approverController.checkApproveRoute(contractId, approveRouteId)
  if (isApproveRoute === false) {
    req.flash('noti', ['支払い依頼', '承認ルートを指定してください。'])
    req.session.requestApproval = {
      message: message,
      isSaved: false
    }
    logger.info(constantsDefine.logMessage.INF001 + 'cbPostApproval')
    return res.redirect(`/requestApproval/${invoiceId}`)
  }

  const requestResult = await approverController.requestApproval(
    contractId,
    approveRouteId,
    invoiceId,
    requester,
    message
  )
  const result = await approverController.saveApproval(
    contractId,
    approveRouteId,
    requester,
    message,
    accessToken,
    refreshToken,
    requestResult
  )

  let approvers

  switch (result) {
    case 0:
      req.flash('info', '承認依頼を完了しました。')

      // メール送信
      try {
        approvers = await approverController.getApproveRoute(accessToken, refreshToken, contractId, approveRouteId)

        await sendMail.mail(
          approvers.users[0].Username,
          constantsDefine.mailMsg.ReqAppr.subject,
          constantsDefine.mailMsg.ReqAppr.text
        )
      } catch (error) {
        logger.warn(constantsDefine.logMessage.MAILWAN000 + 'approverController.getApproveRoute')
        req.flash('noti', ['支払依頼', 'メール送信に失敗しました。'])
      }

      res.redirect('/inboxList/1')
      break
    default:
      req.flash('noti', ['支払依頼', '必ず保存してください。'])
      req.session.requestApproval = {
        message: message,
        approveRouteId: approveRouteId,
        isSaved: false
      }
      res.redirect(`/requestApproval/${invoiceId}`)
  }

  logger.info(constantsDefine.logMessage.INF001 + 'cbPostApproval')
}

router.get('/:invoiceId', helper.isAuthenticated, cbGetRequestApproval)
router.post('/approveRoute', helper.isAuthenticated, cbPostGetApproveRoute)
router.post('/detailApproveRoute', helper.isAuthenticated, cbPostGetDetailApproveRoute)
router.post('/:invoiceId', helper.isAuthenticated, cbPostApproval)
router.post('/save/:invoiceId', helper.isAuthenticated, cbPostSave)

module.exports = {
  router: router,
  cbGetRequestApproval: cbGetRequestApproval,
  cbPostGetApproveRoute: cbPostGetApproveRoute,
  cbPostSave: cbPostSave,
  cbPostGetDetailApproveRoute: cbPostGetDetailApproveRoute,
  cbPostApproval: cbPostApproval
}
