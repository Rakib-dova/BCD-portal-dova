'use strict'
const express = require('express')
const router = express.Router()
const helper = require('./helpers/middleware')
const userController = require('../controllers/userController.js')
const contractController = require('../controllers/contractController.js')
const cancellationsController = require('../controllers/cancellationsController.js')
const logger = require('../lib/logger')
const validate = require('../lib/validate')

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

  // DBからuserデータ取得
  const user = await userController.findOne(req.user.userId)
  // データベースエラーは、エラーオブジェクトが返る
  // user未登録の場合もエラーを上げる
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
  const deleteFlag = contract.dataValues.deleteFlag
  const contractStatus = contract.dataValues.contractStatus

  const checkContractStatus = await helper.checkContractStatus(req.user.tenantId)

  if (checkContractStatus === null || checkContractStatus === 999) {
    return next(errorHelper.create(500))
  }

  if (!validate.isStatusForCancel(contractStatus, deleteFlag)) {
    return next(noticeHelper.create('cancelprocedure'))
  }

  if (!validate.isTenantManager(user.dataValues?.userRole, deleteFlag)) {
    return next(noticeHelper.create('generaluser'))
  }

  if (!validate.isStatusForRegister(contractStatus, deleteFlag)) {
    return next(noticeHelper.create('registerprocedure'))
  }

  if (!validate.isStatusForSimpleChange(contractStatus, deleteFlag)) {
    return next(noticeHelper.create('changeprocedure'))
  }

  // ユーザ権限も画面に送る
  res.render('cancellation', {
    tenantId: req.user.tenantId,
    userRole: req.session.userRole,
    numberN: contract.dataValues?.numberN,
    TS_HOST: process.env.TS_HOST,
    csrfToken: 'test'
  })
  logger.info(constantsDefine.logMessage.INF001 + 'cbGetCancellation')
}

const cbPostCancellation = async (req, res, next) => {
  logger.info(constantsDefine.logMessage.INF000 + 'cbPostCancellation')

  // DBからuserデータ取得
  const user = await userController.findOne(req.user.userId)
  // データベースエラーは、エラーオブジェクトが返る
  // user未登録の場合もエラーを上げる
  if (user instanceof Error || user === null) return next(errorHelper.create(500))

  // DBから契約情報取得
  const contract = await contractController.findOne(req.user.tenantId)
  // データベースエラーは、エラーオブジェクトが返る
  // 契約情報未登録の場合もエラーを上げる
  if (contract instanceof Error || contract === null) return next(errorHelper.create(500))

  const deleteFlag = contract.dataValues.deleteFlag
  const contractStatus = contract.dataValues.contractStatus

  const checkContractStatus = await helper.checkContractStatus(req.user.tenantId)

  if (checkContractStatus === null || checkContractStatus === 999) {
    return next(errorHelper.create(500))
  }

  if (!validate.isStatusForCancel(contractStatus, deleteFlag)) {
    return next(noticeHelper.create('cancelprocedure'))
  }

  if (!validate.isTenantManager(user.dataValues?.userRole, deleteFlag)) {
    return next(noticeHelper.create('generaluser'))
  }
  if (!validate.isStatusForRegister(contractStatus, deleteFlag)) {
    return next(noticeHelper.create('registerprocedure'))
  }

  if (!validate.isStatusForSimpleChange(contractStatus, deleteFlag)) {
    return next(noticeHelper.create('changeprocedure'))
  }

  // contractBasicInfo 設定
  contractInformationcancelOrder.contractBasicInfo.tradeshiftId = req.user.tenantId
  contractInformationcancelOrder.contractBasicInfo.orderType = constantsDefine.statusConstants.orderTypeCancelOrder
  contractInformationcancelOrder.contractBasicInfo.contractNumber = contract.dataValues?.numberN

  // 解約申込登録を行う
  const cancellation = await cancellationsController.create(req.user.tenantId, '{}', contractInformationcancelOrder)

  if (cancellation instanceof Error) return next(errorHelper.create(500))

  logger.info(constantsDefine.logMessage.INF001 + 'cbPostCancellation')
  return next(noticeHelper.create('cancellation'))
}

router.get('/', helper.isAuthenticated, cbGetCancellation)
router.post('/', helper.isAuthenticated, cbPostCancellation)

module.exports = {
  router: router,
  cbGetCancellation: cbGetCancellation,
  cbPostCancellation: cbPostCancellation
}
