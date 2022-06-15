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
    { tenantId: req.user.tenantId, serviceType: constantsDefine.statusConstants.serviceType.introductionSupport },
    null
  )

  // 申し込み済の場合は通知ページへ処理を渡す
  if (
    contracts?.length > 0 &&
    contracts.some((i) => i.contractStatus !== constantsDefine.statusConstants.contractStatus.canceledContract)
  ) {
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
  logger.info(constantsDefine.logMessage.INF000 + 'showIntroductionSupport')
  const salesChannelDeptList = [
    { code: '001', name: 'Com第一営業本部' },
    { code: '002', name: 'Com第二営業本部' },
    { code: '003', name: 'Com第三営業本部' }
  ]

  // 導入支援サービス申し込み画面表示
  res.render('introductionSupport', {
    title: '導入支援サービス申し込み',
    salesChannelDeptList: salesChannelDeptList,
    csrfToken: req.csrfToken()
  })
  logger.info(constantsDefine.logMessage.INF001 + 'showIntroductionSupport')
}

/**
 * 導入支援サービス申し込みの実施
 * @param {object} req リクエスト
 * @param {object} res レスポンス
 * @param {function} next 次の処理
 * @returns
 */
const registerIntroductionSupport = async (req, res, next) => {
  logger.info(constantsDefine.logMessage.INF000 + 'registerIntroductionSupport')

  // オーダー情報の取得
  const orderData = new OrderData(
    req.user.tenantId,
    req.body,
    constantsDefine.statusConstants.orderTypeNewOrder,
    constantsDefine.statusConstants.serviceType.introductionSupport,
    constantsDefine.statusConstants.prdtCode.introductionSupport,
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
  const result = await applyOrderController.applyNewOrder(req.user?.tenantId,
    constantsDefine.statusConstants.serviceType.introductionSupport,
    orderData)
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
