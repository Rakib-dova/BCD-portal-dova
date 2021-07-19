'use strict'
const express = require('express')
const router = express.Router()
const helper = require('./helpers/middleware')
const userController = require('../controllers/userController.js')
const contractController = require('../controllers/contractController.js')
const cancellationsController = require('../controllers/cancellationsController.js')
const logger = require('../lib/logger')

const errorHelper = require('./helpers/error')
const noticeHelper = require('./helpers/notice')

const constantsDefine = require('../constants')
const contractInformationcancelOrder = require('../orderTemplate/contractInformationcancelOrder.json')

const cbGetCancellation = async (req, res, next) => {
  logger.info(constantsDefine.logMessage.INF000 + 'cbGetCancellation')

  // 認証情報取得処理
  if (!req.session || !req.user?.userId) {
    return next(errorHelper.create(500))
  }

  // portal遷移前にはuserは取得できることは確定
  const user = await userController.findOne(req.user.userId)
  // データベースエラーは、エラーオブジェクトが返る
  // portalではuser未登録の場合もエラーを上げる
  if (user instanceof Error || user === null) return next(errorHelper.create(500))

  // TX依頼後に改修、ユーザステイタスが0以外の場合、「404」エラーとする not 403
  if (user.dataValues?.userStatus !== 0) return next(errorHelper.create(404))
  if (req.session?.userContext !== 'LoggedIn') {
    return next(errorHelper.create(400))
  }

  // DBから契約情報取得
  const contract = await contractController.findOne(req.user.tenantId)
  // データベースエラーは、エラーオブジェクトが返る
  // 契約情報未登録の場合もエラーを上げる
  if (contract instanceof Error || contract === null) return next(errorHelper.create(500))

  // ユーザ権限を取得
  req.session.userRole = user.dataValues?.userRole

  if (
    (contract.dataValues.contractStatus === constantsDefine.statusConstants.contractStatusCancellationOrder &&
      !contract.dataValues.deleteFlag) ||
    (contract.dataValues.contractStatus === constantsDefine.statusConstants.contractStatusCancellationReceive &&
      !contract.dataValues.deleteFlag)
  ) {
    return next(noticeHelper.create('cancelprocedure'))
  }

  // ユーザ権限も画面に送る
  res.render('cancellation', {
    tenantId: req.user.tenantId,
    userRole: req.session.userRole,
    numberN: contract.dataValues?.numberN,
    TS_HOST: process.env.TS_HOST
  })
  logger.info(constantsDefine.logMessage.INF001 + 'cbGetCancellation')
}

const cbPostCancellation = async (req, res, next) => {
  logger.info(constantsDefine.logMessage.INF000 + 'cbPostCancellation')

  // DBから契約情報取得
  const contract = await contractController.findOne(req.user.tenantId)

  // データベースエラーは、エラーオブジェクトが返る
  // 契約情報未登録の場合もエラーを上げる
  if (contract instanceof Error || contract === null) return next(errorHelper.create(500))

  // contractBasicInfo 設定
  contractInformationcancelOrder.contractBasicInfo.sysManagedId = req.user.tenantId
  contractInformationcancelOrder.contractBasicInfo.orderType = constantsDefine.statusConstants.orderTypeCancelOrder
  contractInformationcancelOrder.contractBasicInfo.contractNumber = contract.dataValues?.numberN

  // ユーザ登録と同時にテナント登録も行われる
  const cancellation = await cancellationsController.create(req.user.tenantId, '{}', contractInformationcancelOrder)

  if (cancellation instanceof Error || cancellation === null) return next(errorHelper.create(500))

  logger.info(constantsDefine.logMessage.INF001 + 'cbPostCancellation')
  return next(noticeHelper.create('cancellation'))
}

router.get('/', helper.isAuthenticated, helper.isTenantRegistered, helper.isUserRegistered, cbGetCancellation)
router.post('/', helper.isAuthenticated, helper.isTenantRegistered, helper.isUserRegistered, cbPostCancellation)

module.exports = {
  router: router,
  cbGetCancellation: cbGetCancellation,
  cbPostCancellation: cbPostCancellation
}
