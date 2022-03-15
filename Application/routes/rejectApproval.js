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
const rejectApprovalController = require('../controllers/rejectApporovalController')

const bodyParser = require('body-parser')
router.use(
  bodyParser.json({
    type: 'application/json',
    limit: '6826KB'
  })
)

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

  // 差し戻しされたデータ
  const contractId = contract.contractId
  const invoiceId = req.params.invoiceId
  const message = req.body.message
  const userId = req.user.userId

  // 差し戻し処理
  const result = await rejectApprovalController.rejectApprove(contractId, invoiceId, message, userId)
  if (result) {
    req.session.waitingApprovalList = true
    req.flash('info', '支払依頼を差し戻しました。')
    res.redirect('/inboxList/1')
  } else {
    req.flash('noti', ['支払依頼', '承認に失敗しました。'])
    res.redirect(`/approvalInbox/${invoiceId}`)
  }

  logger.info(constantsDefine.logMessage.INF001 + 'cbPostApprove')
}

// router.get('/:invoiceId', helper.isAuthenticated, cbGetIndex)
router.post('/:invoiceId', helper.isAuthenticated, cbPostApprove)

module.exports = {
  router: router,
  cbPostApprove: cbPostApprove
}
