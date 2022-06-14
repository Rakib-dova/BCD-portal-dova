'use strict'
const csrf = require('csurf')
const express = require('express')

const helper = require('./helpers/middleware')
const errorHelper = require('./helpers/error')
const noticeHelper = require('./helpers/notice')
const OrderData = require('./helpers/OrderData')
const logger = require('../lib/logger')
const applyOrderController = require('../controllers/applyOrderController.js')
const contractController = require('../controllers/contractController.js')
const constantsDefine = require('../constants')

const router = express.Router()
const csrfProtection = csrf({ cookie: false })

const checkContractStatus = async (req, res, next) => {
  // ライトプランの契約情報を取得する
  const contract = await contractController.findOneByServiceType(
    req.user.tenantId,
    constantsDefine.statusConstants.serviceType.lightPlan
  )

  //  契約中の場合(申し込み～解約処理完了まで)
  if (contract && contract.contractStatus !== constantsDefine.statusConstants.contractStatus.canceledContract) {
    return next(noticeHelper.create('lightPlanRegistered'))
  }
  next()
}

const showLightPlan = async (req, res, next) => {
  logger.info(constantsDefine.logMessage.INF000 + 'showLightPlan')

  // TODO DBマスターから取得
  const salesChannelDeptList = [
    { code: '001', name: 'Com第一営業本部' },
    { code: '002', name: 'Com第二営業本部' },
    { code: '003', name: 'Com第三営業本部' }
  ]

  // ライトプラン申し込み画面表示
  res.render('lightPlan', {
    title: 'ライトプラン申込',
    salesChannelDeptList: salesChannelDeptList,
    csrfToken: req.csrfToken()
  })
  logger.info(constantsDefine.logMessage.INF001 + 'showLightPlan')
}

const registerLightPlan = async (req, res, next) => {
  logger.info(constantsDefine.logMessage.INF000 + 'registerLightPlan')

  // オーダー情報の取得
  const orderData = new OrderData(
    req.user.tenantId,
    req.body,
    constantsDefine.statusConstants.orderType.newOrder,
    constantsDefine.statusConstants.serviceType.lightPlan,
    constantsDefine.statusConstants.prdtCode.lightPlan,
    constantsDefine.statusConstants.appType.new
  )

  // バリデーション
  if (
    !orderData.validateContractBasicInfo() ||
    !orderData.validateContractAccountInfo() ||
    !orderData.validateContractInfo() ||
    !orderData.validateBillMailingInfo()
  ) {
    req.flash('info', 'システムエラーが発生しました。')
    return res.redirect(303, '/portal')
  }

  // Contracts,Ordersにデータを登録する
  const result = await applyOrderController.applyNewOrder(
    req.user?.tenantId,
    constantsDefine.statusConstants.serviceType.lightPlan,
    orderData
  )
  // データベースエラーは、エラーオブジェクトが返る
  if (result instanceof Error) return next(errorHelper.create(500))

  // 契約とオーダー情報登録成功したら
  req.flash('info', 'ライトプラン申込が完了いたしました。')
  logger.info({ tenant: req.user?.tenantId, user: req.user?.userId }, 'Light Plan Registration Succeeded')

  return res.redirect(303, '/portal')
}

router.get(
  '/',
  helper.isAuthenticated,
  helper.isTenantRegistered,
  helper.isUserRegistered,
  csrfProtection,
  checkContractStatus,
  showLightPlan
)

router.post(
  '/register',
  helper.isAuthenticated,
  helper.isTenantRegistered,
  helper.isUserRegistered,
  csrfProtection,
  checkContractStatus,
  registerLightPlan
)

module.exports = {
  router: router,
  checkContractStatus: checkContractStatus,
  showLightPlan: showLightPlan,
  registerLightPlan: registerLightPlan
}
