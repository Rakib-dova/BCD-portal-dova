'use strict'
const csrf = require('csurf')
const express = require('express')

const helper = require('./helpers/middleware')
const errorHelper = require('./helpers/error')
const noticeHelper = require('./helpers/notice')
const OrderData = require('./helpers/orderData')
const contractController = require('../controllers/contractController.js')
const applyOrderController = require('../controllers/applyOrderController.js')
const channelDepartmentController = require('../controllers/channelDepartmentController.js')
const logger = require('../lib/logger')
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
 * ライトプランの解約の事前チェック
 * @param {object} req リクエスト
 * @param {object} res レスポンス
 * @param {function} next 次の処理
 * @returns ライトプラン契約情報
 */
const checkContractStatus = async (req, res, next) => {
  // ライトプランの契約情報を取得する
  const contracts = await contractController.findContracts(
    { tenantId: req.user?.tenantId, serviceType: serviceTypes.lightPlan },
    null
  )

  if (contracts instanceof Error) return next(errorHelper.create(500))

  // 申し込み前、または申し込み～申し込み竣工完了まで、または解約完了場合
  if (
    !contracts?.length ||
    contracts.some(
      (i) =>
        i.contractStatus === contractStatuses.newContractOrder ||
        i.contractStatus === contractStatuses.newContractReceive ||
        i.contractStatus === contractStatuses.newContractBeforeCompletion ||
        i.contractStatus === contractStatuses.canceledContract
    )
  ) {
    return next(noticeHelper.create('lightPlanUnregistered'))
  }
  // 解約中の場合(解約着手待ち～解約完了竣工まで)
  if (
    contracts.some(
      (i) =>
        i.contractStatus === contractStatuses.cancellationOrder ||
        i.contractStatus === contractStatuses.cancellationReceive
    )
  ) {
    return next(noticeHelper.create('lightPlanCanceling'))
  }
  return contracts
}

/**
 * ライトプランの解約画面の表示
 * @param {object} req リクエスト
 * @param {object} res レスポンス
 * @param {function} next 次の処理
 * @returns
 */
const showCancelLightPlan = async (req, res, next) => {
  logger.info(logMessage.INF000 + 'showCancelLightPlan')

  // ライトプランの解約の事前チェック
  const contracts = await checkContractStatus(req, res, next)

  // チャネル組織マスターからチャネル組織情報リストを取得
  const salesChannelDeptList = await channelDepartmentController.findAll()

  if (salesChannelDeptList instanceof Error) return next(errorHelper.create(500))

  // ライトプラン解約画面表示
  res.render('cancelLightPlan', {
    title: 'ライトプラン解約',
    numberN: contracts?.find((i) => i.contractStatus === contractStatuses.onContract)?.numberN,
    salesChannelDeptList: salesChannelDeptList,
    csrfToken: req.csrfToken()
  })
  logger.info(logMessage.INF001 + 'showCancelLightPlan')
}

/**
 * ライトプランの解約の実施
 * @param {object} req リクエスト
 * @param {object} res レスポンス
 * @param {function} next 次の処理
 * @returns
 */
const cancelLightPlan = async (req, res, next) => {
  logger.info(logMessage.INF000 + 'cancelLightPlan')

  // ライトプランの解約の事前チェック
  await checkContractStatus(req, res, next)

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
    constants.statusConstants.orderTypes.cancelOrder,
    serviceTypes.lightPlan,
    constants.statusConstants.prdtCodes.lightPlan,
    constants.statusConstants.appTypes.cancel,
    salesChannelDeptType
  )

  // 解約する
  const result = await applyOrderController.cancelOrder(req.user?.tenantId, serviceTypes.lightPlan, orderData)
  // データベースエラーは、エラーオブジェクトが返る
  if (result instanceof Error) return next(errorHelper.create(500))

  req.flash('info', 'ライトプラン解約が完了いたしました。')
  logger.info(logMessage.INF001 + 'cancelLightPlan')
  return res.redirect(303, '/portal')
}

router.get(
  '/',
  helper.isAuthenticated,
  helper.isTenantRegistered,
  helper.isUserRegistered,
  csrfProtection,
  showCancelLightPlan
)

router.post(
  '/register',
  helper.isAuthenticated,
  helper.isTenantRegistered,
  helper.isUserRegistered,
  csrfProtection,
  cancelLightPlan
)

module.exports = {
  router: router,
  checkContractStatus: checkContractStatus,
  showCancelLightPlan: showCancelLightPlan,
  cancelLightPlan: cancelLightPlan
}
