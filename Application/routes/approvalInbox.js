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
const notiTitle = '承認する支払依頼確認'

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
  // const userId = req.user.userId

  // 依頼した請求書が支払依頼資格を奪われた場合
  const requestApproval = await approvalInboxController.getRequestApproval(contractId, invoiceId)
  // if (requestApproval === null) {
  //   req.flash('noti', [notiTitle, '当該請求書は支払依頼の文書ではありません。'])
  //   return res.redirect('/approvalInboxList/1')
  // }
  const approverRouteId = requestApproval.approveRouteId

  // 依頼者と承認ルートの承認者のかを確認する。
  // const isNotRequesterAndApporever = !(await approvalInboxController.checkUser(contractId, userId, invoiceId))
  // if (isNotRequesterAndApporever) {
  //   req.flash('noti', [notiTitle, '当該文書について承認権限がないため、仕訳情報画面へ遷移しました。'])
  //   return res.redirect(`/inbox/${invoiceId}`)
  // }

  // 文書情報をトレードシフトから持ち込み
  try {
    result = await inboxController.getInvoiceDetail(accessToken, refreshToken, invoiceId, contract.contractId)
  } catch (error) {
    logger.error({ stack: error.stack, status: 1 })
    req.flash('noti', [notiTitle, 'システムエラーが発生しました。'])
    return res.redirect('/approvalInboxList/1')
  }

  const approveRoute = await approverController.getApproveRoute(accessToken, refreshToken, contractId, approverRouteId)
  const prevUser = requestApproval.prevUser
  res.render('approvalInbox', {
    ...result,
    documentId: invoiceId,
    approveRoute: approveRoute,
    prevUser: prevUser
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
  getRequestApproval: async (accessToken, refreshToken, contractId, invoiceId) => {
    const userMessage = [
      'ユーザー１のメッセージ',
      'ユーザー２のメッセージ',
      'ユーザー３のメッセージ',
      'ユーザー４のメッセージ',
      'ユーザー５のメッセージ',
      'ユーザー６のメッセージ',
      'ユーザー７のメッセージ',
      'ユーザー８のメッセージ',
      'ユーザー９のメッセージ',
      'ユーザー１０のメッセージ',
      'ユーザー１１のメッセージ'
    ]
    const RequestApproval = require('../models').RequestApproval
    const requestApproval = RequestApproval.build({
      contractId: contractId,
      approveRouteId: 'dummy-data',
      invoiceId: invoiceId,
      message: 'ダミーデータのメッセージ'
    })
    const requestId = requestApproval.requestId
    const approveRouteId = requestApproval.approveRouteId
    const request = {
      contractId: requestApproval.contractId,
      approveRoute: await approverController.getApproveRoute(accessToken, refreshToken, contractId, approveRouteId),
      invoiceId: invoiceId,
      message: requestApproval.message,
      status: '11',
      approvals: [],
      prevUser: {
        name: null,
        message: null
      }
    }

    let prev = null
    let next = null
    for (let idx = 0; idx < request.approveRoute.users.length; idx++) {
      if (!prev) {
        prev = new Approval({
          contractId: contractId,
          request: requestId,
          message: userMessage[idx],
          status: ApprovalStatusList[0]
        })
        request.approvals.push(prev)
      } else {
        next = new Approval({
          contractId: contractId,
          request: requestId,
          message: userMessage[idx],
          status: ApprovalStatusList[0].id
        })
        prev.next = next
        next.prev = prev
        prev = next
        request.approvals.push(next)
      }
    }

    if (~~request.status - 10 === 0) {
      request.prevUser.name = '依頼者'
      request.prevUser.message = request.message
    } else {
      request.prevUser.name =
        request.approveRoute.users[~~request.status - 11].FirstName +
        request.approveRoute.users[~~request.status - 11].LastName
      request.prevUser.message = request.approvals[~~request.status - 11].message
    }

    return request
  },

  checkUser: async () => {}
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

const ApprovalStatusList = []
class ApprovalStatus {
  constructor(init) {
    this.id = init.id
    this.code = init.code
  }
}

ApprovalStatusList.push(new ApprovalStatus({ id: '10', code: '承認待ち' }))
ApprovalStatusList.push(new ApprovalStatus({ id: '00', code: '承認済み' }))
ApprovalStatusList.push(new ApprovalStatus({ id: '99', code: '差し戻し' }))

class Approval {
  constructor(init) {
    const { v4: uuid } = require('uuid')
    this.approvalId = uuid()
    this.contractId = init.contractId
    this.request = init.request
    this.message = init.message
    this.status = init.status
    this.prev = null
    this.next = null
    this.approvalDate = null
  }
}

router.get('/:invoiceId', helper.isAuthenticated, cbGetIndex)

module.exports = {
  router: router,
  cbGetIndex: cbGetIndex
}
