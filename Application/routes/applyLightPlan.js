'use strict'
const csrf = require('csurf')
const express = require('express')

const helper = require('./helpers/middleware')
const errorHelper = require('./helpers/error')
const noticeHelper = require('./helpers/notice')
const OrderData = require('./helpers/orderData')
const logger = require('../lib/logger')
const applyOrderController = require('../controllers/applyOrderController.js')
const contractController = require('../controllers/contractController.js')
const constants = require('../constants')

const router = express.Router()
const csrfProtection = csrf({ cookie: false })

// 契約ステータス
const contractStatuses = constants.statusConstants.contractStatuses
// サービス種別
const serviceTypes = constants.statusConstants.serviceTypes
// ログメッセージ
const logMessage = constants.logMessage

/**
 * ライトプランの申込の事前チェック
 * @param {object} req リクエスト
 * @param {object} res レスポンス
 * @param {function} next 次の処理
 * @returns
 */
const checkContractStatus = async (req, res, next) => {
  // ライトプランの契約情報を取得する
  const contracts = await contractController.findContracts(
    { tenantId: req.user.tenantId, serviceType: serviceTypes.lightPlan },
    null
  )

  if (contracts instanceof Error) return next(errorHelper.create(500))

  // 申し込み済の場合(申し込み～解約処理完了まで)
  if (contracts?.length > 0 && contracts.some((i) => i.contractStatus !== contractStatuses.canceledContract)) {
    if (
      contracts.some(
        (i) =>
          i.contractStatus === contractStatuses.newContractOrder ||
          i.contractStatus === contractStatuses.newContractReceive ||
          i.contractStatus === contractStatuses.newContractBeforeCompletion
      )
    ) {
      //  申込中の場合(申し込み～竣工まで)
      return next(noticeHelper.create('lightPlanRegistering'))
    } else {
      //  契約中の場合(竣工～解約処理完了まで)
      return next(noticeHelper.create('lightPlanRegistered'))
    }
  }
  next()
}

/**
 * ライトプランの申込画面の表示
 * @param {object} req リクエスト
 * @param {object} res レスポンス
 * @param {function} next 次の処理
 * @returns
 */
const showLightPlan = async (req, res, next) => {
  logger.info(logMessage.INF000 + 'showLightPlan')

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
  logger.info(logMessage.INF001 + 'showLightPlan')
}

/**
 * ライトプランの申込の実施
 * @param {object} req リクエスト
 * @param {object} res レスポンス
 * @param {function} next 次の処理
 * @returns
 */
const registerLightPlan = async (req, res, next) => {
  logger.info(logMessage.INF000 + 'registerLightPlan')

  // オーダー情報の取得
  const orderData = new OrderData(
    req.user.tenantId,
    req.body,
    constants.statusConstants.orderTypes.newOrder,
    serviceTypes.lightPlan,
    constants.statusConstants.prdtCodes.lightPlan,
    constants.statusConstants.appTypes.new
  )

  // バリデーション
  if (
    !orderData.validateContractBasicInfo() ||
    !orderData.validateContractAccountInfo() ||
    !orderData.validateContractInfo() ||
    !orderData.validateBillMailingInfo()
  ) {
    return next(errorHelper.create(404))
  }

  // 契約する
  const result = await applyOrderController.applyNewOrder(req.user?.tenantId, serviceTypes.lightPlan, orderData)
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
