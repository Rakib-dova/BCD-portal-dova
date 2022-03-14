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
const sendMail = require('../lib/sendMail')
const constantsDefine = require('../constants')
const inboxController = require('../controllers/inboxController')
const approvalInboxController = require('../controllers/approvalInboxController')
const notiTitle = '承認する支払依頼確認'
const approverController = require('../controllers/approverController')

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
  const hasPowerOfEditing = await approvalInboxController.hasPowerOfEditing(contractId, userId, requestApproval)

  let presentation = 'readonlyApprovalInbox'
  if (hasPowerOfEditing) {
    presentation = 'approvalInbox'
    req.session.requestApproval = { approval: requestApproval }
  }

  res.render(presentation, {
    ...result,
    title: '支払依頼',
    documentId: invoiceId,
    approveRoute: approveRoute,
    prevUser: prevUser
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
  const requestApproval = req.session.requestApproval.approval
  const invoiceId = req.params.invoiceId
  const data = req.body
  const requestId = requestApproval.requestId

  // 依頼者と承認ルートの承認者のかを確認する。
  const hasNotPowerOfEditing = !(await approvalInboxController.hasPowerOfEditing(contractId, userId, requestApproval))
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

  const message = req.body.message

  const result = await approverController.updateApprove(contractId, requestId, message)

  if (result instanceof Error === true) return next(errorHelper.create(500))

  if (result) {
    req.flash('info', '承認が完了しました。')

    // 承認情報取得
    const apprInfo = req.session.requestApproval
    // 次の承認者取得
    const nextAppr = getNextApprover(apprInfo.status, apprInfo.approveRoute.user)

    logger.info(JSON.stringify(nextAppr))
    if (nextAppr !== null) {
      // メール送信
      try {
        await sendMail.mail(
          nextAppr.email,
          constantsDefine.mailMsg.ReqAppr.subject,
          constantsDefine.mailMsg.ReqAppr.text
        )
      } catch (error) {
        logger.warn(constantsDefine.logMessage.MAILWAN000 + error.stack)
        req.flash('noti', ['支払依頼', 'メール送信に失敗しました。'])
      }
    }

    res.redirect('/inboxList/1')
  } else {
    req.flash('noti', ['支払依頼', '承認に失敗しました。'])
    res.redirect(`/approvalInbox/${invoiceId}`)
  }

  logger.info(constantsDefine.logMessage.INF001 + 'cbPostApprove')
}

const getNextApprover = (statusCode, approvers) => {
  const modifiedCode = ~~statusCode - 10
  if (~~statusCode < 0 || modifiedCode < 0 || modifiedCode > 10 || modifiedCode > approvers.length - 1) return null

  return approvers[modifiedCode + 1]
}

const getLastApprover = (approvers) => {
  if (!approvers || approvers.length < 1) return null

  return approvers[approvers.length - 1]
}

const getApprovalStage = (index, length) => {
  if (index > 9 || length > 10 || index > length - 1) return null
  if (index === length - 1) return '最終承認'

  return ['一次承認', '二次承認', '三次承認', '四次承認', '五次承認', '六次承認', '七次承認', '八次承認', '九次承認'][
    index
  ]
}

const getApprovalStatus = (statusCode) => {
  const approvalStages = {
    90: '差し戻し',
    80: '未処理',
    10: '承認依頼中',
    11: '一次承認済み',
    12: '二次承認済み',
    13: '三次承認済み',
    14: '四次承認済み',
    15: '五次承認済み',
    16: '六次承認済み',
    17: '七次承認済み',
    18: '八次承認済み',
    19: '九次承認済み',
    20: '十次承認済み',
    '00': '最終承認済み'
  }

  if (!approvalStages[statusCode]) return null

  return approvalStages[statusCode]
}
router.get('/:invoiceId', helper.isAuthenticated, cbGetIndex)
router.post('/:invoiceId', helper.isAuthenticated, cbPostApprove)

module.exports = {
  router: router,
  cbGetIndex: cbGetIndex,
  cbPostApprove: cbPostApprove
}
