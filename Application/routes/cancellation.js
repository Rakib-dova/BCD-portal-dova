'use strict'
const express = require('express')
const router = express.Router()
const helper = require('./helpers/middleware')
const userController = require('../controllers/userController.js')
const contractController = require('../controllers/contractController.js')
const cancellationsController = require('../controllers/cancellationsController.js')
const Op = require('../models').Sequelize.Op
const logger = require('../lib/logger')
const validate = require('../lib/validate')

const errorHelper = require('./helpers/error')
const noticeHelper = require('./helpers/notice')

const constantsDefine = require('../constants')
const contractInformationcancelOrder = require('../orderTemplate/contractInformationcancelOrder.json')

const csrf = require('csurf')
const csrfProtection = csrf({ cookie: false })

// サービス種別
const serviceTypes = constantsDefine.statusConstants.serviceTypes

/**
 * 契約情報の取得とチェック
 * @param {string} tenantId テナントID
 * @param {function} next 次の処理
 * @returns 無料契約情報
 */
const getAndCheckContracts = async (tenantId, next) => {
  logger.info(constantsDefine.logMessage.INF000 + 'getAndCheckContracts')

  // 解約済以外契約情報を取得する
  const contracts = await contractController.findContracts(
    {
      tenantId: tenantId,
      contractStatus: { [Op.ne]: constantsDefine.statusConstants.contractStatuses.canceledContract }
    },
    null
  )

  // データベースエラー、または、契約情報未登録の場合エラーを上げる
  if (contracts instanceof Error || !contracts || contracts.length === 0) return next(errorHelper.create(500))

  // スタンダードプラン契約中の場合
  if (contracts.some((i) => i.serviceType === serviceTypes.lightPlan)) {
    return next(noticeHelper.create('haveStandard'))

    // 導入支援サービス契約中の場合
  } else if (
    contracts.some(
      (i) =>
        i.serviceType === serviceTypes.introductionSupport &&
        i.contractStatus !== constantsDefine.statusConstants.contractStatuses.onContract
    )
  ) {
    return next(noticeHelper.create('haveIntroductionSupport'))
  }

  // 無料契約情報の取得
  const contract = contracts.find((i) => i.serviceType === serviceTypes.bcd)
  if (!contract) return next(errorHelper.create(500))

  logger.info(constantsDefine.logMessage.INF001 + 'getAndCheckContracts')
  // 無料契約情報の返却
  return contract
}

const cbGetCancellation = async (req, res, next) => {
  logger.info(constantsDefine.logMessage.INF000 + 'cbGetCancellation')

  // 認証情報取得処理
  if (!req.session || !req.user?.userId) {
    return next(errorHelper.create(500))
  }

  // ユーザ情報の更新と取得
  const user = await userController.findAndUpdate(req.user?.userId, req.user?.accessToken, req.user?.refreshToken)
  // データベースエラー、または、ユーザ未登録の場合もエラーを上げる
  if (user instanceof Error || !user) return next(errorHelper.create(500))

  // TX依頼後に改修、ユーザステイタスが0以外の場合、「404」エラーとする not 403
  if (user.userStatus !== 0) return next(errorHelper.create(404))
  if (req.session?.userContext !== 'LoggedIn') {
    return next(errorHelper.create(400))
  }

  // 無料契約情報の取得
  const contract = await getAndCheckContracts(req.user.tenantId, next)
  if (!contract) return

  // ユーザ権限を取得
  req.session.userRole = user.userRole
  const deleteFlag = contract.deleteFlag
  const contractStatus = contract.contractStatus

  const checkContractStatus = await helper.checkContractStatus(req.user.tenantId)

  if (checkContractStatus === null || checkContractStatus === 999) {
    return next(errorHelper.create(500))
  }

  if (!validate.isStatusForCancel(contractStatus, deleteFlag)) {
    return next(noticeHelper.create('cancelprocedure'))
  }

  if (!validate.isTenantManager(user.userRole, deleteFlag)) {
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
    numberN: contract?.numberN,
    TS_HOST: process.env.TS_HOST,
    csrfToken: req.csrfToken()
  })
  logger.info(constantsDefine.logMessage.INF001 + 'cbGetCancellation')
}

const cbPostCancellation = async (req, res, next) => {
  logger.info(constantsDefine.logMessage.INF000 + 'cbPostCancellation')

  // ユーザ情報の更新と取得
  const user = await userController.findAndUpdate(req.user?.userId, req.user?.accessToken, req.user?.refreshToken)
  // データベースエラー、または、ユーザ未登録の場合もエラーを上げる
  if (user instanceof Error || !user) return next(errorHelper.create(500))

  // 無料契約情報の取得
  const contract = await getAndCheckContracts(req.user.tenantId, next)
  if (!contract) return

  const deleteFlag = contract.deleteFlag
  const contractStatus = contract.contractStatus

  const checkContractStatus = await helper.checkContractStatus(req.user.tenantId)

  if (checkContractStatus === null || checkContractStatus === 999) {
    return next(errorHelper.create(500))
  }

  if (!validate.isStatusForCancel(contractStatus, deleteFlag)) {
    return next(noticeHelper.create('cancelprocedure'))
  }

  if (!validate.isTenantManager(user.userRole, deleteFlag)) {
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
  contractInformationcancelOrder.contractBasicInfo.contractNumber = contract?.numberN

  // 解約申込登録を行う
  const cancellation = await cancellationsController.create(req.user.tenantId, '{}', contractInformationcancelOrder)

  if (cancellation instanceof Error) return next(errorHelper.create(500))

  logger.info(constantsDefine.logMessage.INF001 + 'cbPostCancellation')
  return next(noticeHelper.create('cancellation'))
}

router.get('/', helper.isAuthenticated, csrfProtection, cbGetCancellation)
router.post('/', helper.isAuthenticated, csrfProtection, cbPostCancellation)

module.exports = {
  router: router,
  getAndCheckContracts: getAndCheckContracts,
  cbGetCancellation: cbGetCancellation,
  cbPostCancellation: cbPostCancellation
}
