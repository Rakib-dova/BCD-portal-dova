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
const approvalInboxController = require('../controllers/approvalInboxController')
const notiTitle = '承認する支払依頼確認'
const approverController = require('../controllers/approverController')
const mailMsg = require('../lib/mailMsg')

const bodyParser = require('body-parser')
router.use(
  bodyParser.json({
    type: 'application/json',
    limit: '6826KB'
  })
)

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
  const tenantId = contract.tenantId
  const userId = req.user.userId

  // 依頼した請求書が支払依頼資格を奪われた場合
  const requestApproval = await approvalInboxController.getRequestApproval(
    accessToken,
    refreshToken,
    contractId,
    invoiceId,
    tenantId
  )
  if (requestApproval === null) {
    req.flash('noti', [notiTitle, '当該請求書は支払依頼の文書ではありません。'])
    return res.redirect('/inboxList/1')
  }

  // 文書情報をトレードシフトから持ち込み
  try {
    result = await inboxController.getInvoiceDetail(accessToken, refreshToken, invoiceId, contract.contractId)
  } catch (error) {
    logger.error({ stack: error.stack, status: 1 })
    req.flash('noti', [notiTitle, 'システムエラーが発生しました。'])
    return res.redirect('/inboxList/1')
  }

  const approveRoute = requestApproval.approveRoute
  const prevUser = requestApproval.prevUser

  // 依頼者と承認ルートの承認者のかを確認する。
  const requestId = requestApproval.requestId
  const hasPowerOfEditing = await approvalInboxController.hasPowerOfEditing(contractId, userId, requestId)

  let presentation = 'readonlyApprovalInbox'
  if (hasPowerOfEditing) {
    presentation = 'approvalInbox'
    req.session.requestApproval = { approval: requestApproval }
  }

  const requester = requestApproval.requester
  res.render(presentation, {
    ...result,
    title: '支払依頼',
    documentId: invoiceId,
    requester: requester,
    approveRoute: approveRoute,
    prevUser: prevUser,
    requestId: requestId,
    csrfToken: req.csrfToken()
  })

  logger.info(constantsDefine.logMessage.INF001 + 'cbGetIndex')
}

const cbPostApprove = async (req, res, next) => {
  logger.info(constantsDefine.logMessage.INF000 + 'cbPostApprove')

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
  const userId = user.userId
  const requestApproval = req.session.requestApproval ? req.session.requestApproval.approval : null
  const invoiceId = req.params.invoiceId
  const message = typeof req.body.message === 'string' ? req.body.message : null

  if (message === null || message.length > 1500) {
    req.flash('noti', [notiTitle, 'メッセージは1500文字まで入力してください。'])
    return res.redirect(`/approvalInbox/${invoiceId}`)
  }

  if (requestApproval === null) {
    req.flash('alertNotification', ['支払依頼', 'システムエラーが発生しました。\nもう一度操作してください。'])
    return res.redirect(`/approvalInbox/${invoiceId}`)
  }

  const data = req.body
  const requestId = requestApproval.requestId
  const accessToken = req.user.accessToken
  const refreshToken = req.user.refreshToken
  const tenantId = req.user.tenantId

  // 依頼者と承認ルートの承認者のかを確認する。
  const hasNotPowerOfEditing = !(await approvalInboxController.hasPowerOfEditing(contractId, userId, requestId))
  if (hasNotPowerOfEditing) {
    logger.info(constantsDefine.logMessage.INF001 + 'cbPostIndex')
    return res.redirect(`/approvalInbox/${invoiceId}`)
  }

  // 仕訳情報が変更が合うる場合保存する。
  const { status, lineId, accountCode, subAccountCode, departmentCode, error } =
    await approvalInboxController.insertAndUpdateJournalizeInvoice(contractId, invoiceId, data)

  if (error instanceof Error) return next(errorHelper.create(500))

  switch (status) {
    case 0:
      break
    case -1:
      req.flash('noti', [
        '支払依頼',
        `仕訳情報設定が完了できませんでした。<BR>※明細ID「${lineId}」の勘定科目「${accountCode}」は未登録勘定科目です。`,
        'SYSERR'
      ])
      res.redirect(`/approvalInbox/${invoiceId}`)
      break
    case -2:
      req.flash('noti', [
        '支払依頼',
        `仕訳情報設定が完了できませんでした。<BR>※明細ID「${lineId}」の補助科目「${subAccountCode}」は未登録補助科目です。`,
        'SYSERR'
      ])
      res.redirect(`/approvalInbox/${invoiceId}`)
      break
    case -3:
      req.flash('noti', [
        '支払依頼',
        `仕訳情報設定が完了できませんでした。<BR>※明細ID「${lineId}」の部門データ「${departmentCode}」は未登録部門データです。`,
        'SYSERR'
      ])
      res.redirect(`/approvalInbox/${invoiceId}`)
      break
  }

  const result = await approverController.updateApprove(contractId, requestId, message, userId)

  if (result instanceof Error === true) return next(errorHelper.create(500))

  if (result === -1) {
    req.flash('error', '承認に失敗しました。')
    res.redirect('/inboxList/1')
  } else {
    if (result) {
      const sendMailStatus = await mailMsg.sendPaymentRequestMail(
        accessToken,
        refreshToken,
        contractId,
        invoiceId,
        tenantId
      )

      if (sendMailStatus === 0) {
        req.flash('info', '承認を完了しました。次の承認者にはメールで通知が送られます。')
      } else if (sendMailStatus === 1) {
        req.flash('info', '承認を完了しました。依頼者にはメールで通知が送られます。')
      } else {
        req.flash('error', '承認を完了しました。メールの通知に失敗しましたので、次の承認者に連絡をとってください。')
      }
      res.redirect('/inboxList/1')
    } else {
      req.flash('noti', ['支払依頼', '承認に失敗しました。'])
      res.redirect(`/approvalInbox/${invoiceId}`)
    }
  }

  logger.info(constantsDefine.logMessage.INF001 + 'cbPostApprove')
}

router.get('/:invoiceId', helper.isAuthenticated, csrfProtection, cbGetIndex)
router.post('/:invoiceId', helper.isAuthenticated, csrfProtection, cbPostApprove)

module.exports = {
  router: router,
  cbGetIndex: cbGetIndex,
  cbPostApprove: cbPostApprove
}
