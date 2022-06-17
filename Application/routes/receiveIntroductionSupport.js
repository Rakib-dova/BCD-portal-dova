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
const channelDepartmentController = require('../controllers/channelDepartmentController.js')
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
 * 導入支援サービスが既に申し込み済か事前チェック
 * @param {object} req リクエスト
 * @param {object} res レスポンス
 * @param {function} next 次の処理
 * @returns
 */
// TODO 今後同様の「申し込み済か」の判定が必要になる場合は汎用モジュール化したい
const checkContractStatus = async (req, res, next) => {
  // 導入支援サービスの契約情報を取得する
  const contracts = await contractController.findContracts(
    { tenantId: req.user?.tenantId, serviceType: serviceTypes.introductionSupport },
    null
  )

  if (contracts instanceof Error) return next(errorHelper.create(500))

  // 申し込み済の場合は通知ページへ処理を渡す
  if (contracts?.length > 0 && contracts.some((i) => i.contractStatus !== contractStatuses.canceledContract)) {
    return next(noticeHelper.create('introductionSupportregistered'))
  }
  next()
}

/**
 * 導入支援サービスの申込画面の表示
 * @param {object} req リクエスト
 * @param {object} res レスポンス
 * @param {function} next 次の処理
 * @returns
 */
const showIntroductionSupport = async (req, res, next) => {
  logger.info(logMessage.INF000 + 'showIntroductionSupport')

  // チャネル組織マスターからチャネル組織情報リストを取得
  const salesChannelDeptList = await channelDepartmentController.findAll()

  // 導入支援サービス申し込み画面表示
  res.render('introductionSupport', {
    title: '導入支援サービス申し込み',
    salesChannelDeptList: salesChannelDeptList,
    csrfToken: req.csrfToken()
  })
  logger.info(logMessage.INF001 + 'showIntroductionSupport')
}

/**
 * 導入支援サービス申し込みの実施
 * @param {object} req リクエスト
 * @param {object} res レスポンス
 * @param {function} next 次の処理
 * @returns
 */
const registerIntroductionSupport = async (req, res, next) => {
  logger.info(logMessage.INF000 + 'registerIntroductionSupport')

  let salesChannelDeptType
  // 組織区分が選択された場合、コードで組織区分を取得し、オーダー情報に設定する
  const salesChannelDeptTypeCode = JSON.parse(req.body.salesChannelDeptType || '{}').code
  if (salesChannelDeptTypeCode) {
    const salesChannelDeptInfo = await channelDepartmentController.findOne(salesChannelDeptTypeCode)
    if (salesChannelDeptInfo instanceof Error) return next(errorHelper.create(500))
    if (salesChannelDeptInfo?.name) salesChannelDeptType = salesChannelDeptInfo.name
  }

  // オーダー情報の取得
  const orderData = new OrderData(
    req.user?.tenantId,
    req.body,
    constants.statusConstants.orderTypes.newOrder,
    serviceTypes.introductionSupport,
    constants.statusConstants.prdtCodes.introductionSupport,
    constants.statusConstants.appTypes.new,
    salesChannelDeptType
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
  const result = await applyOrderController.applyNewOrder(
    req.user?.tenantId,
    serviceTypes.introductionSupport,
    orderData
  )
  // データベースエラーは、エラーオブジェクトが返る
  if (result instanceof Error) return next(errorHelper.create(500))

  req.flash('info', '導入支援サービスの申し込みが完了いたしました。')
  logger.info({ tenant: req.user?.tenantId, user: req.user?.userId }, 'Introduction Support Registration Succeeded')
  return res.redirect(303, '/portal')
}

router.get(
  '/',
  helper.isAuthenticated,
  helper.isTenantRegistered,
  helper.isUserRegistered,
  csrfProtection,
  checkContractStatus,
  showIntroductionSupport
)

router.post(
  '/register',
  helper.isAuthenticated,
  helper.isTenantRegistered,
  helper.isUserRegistered,
  csrfProtection,
  checkContractStatus,
  registerIntroductionSupport
)

module.exports = {
  router: router,
  checkContractStatus: checkContractStatus,
  showIntroductionSupport: showIntroductionSupport,
  registerIntroductionSupport: registerIntroductionSupport
}
