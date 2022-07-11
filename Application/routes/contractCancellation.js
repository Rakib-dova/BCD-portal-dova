'use strict'
const csrf = require('csurf')
const express = require('express')

const csrfProtection = csrf({ cookie: false })
const router = express.Router()

const helper = require('./helpers/middleware')
const errorHelper = require('./helpers/error')
const noticeHelper = require('./helpers/notice')
const OrderData = require('./helpers/orderData')
const contractController = require('../controllers/contractController.js')
const applyOrderController = require('../controllers/applyOrderController.js')
const channelDepartmentController = require('../controllers/channelDepartmentController.js')
const logger = require('../lib/logger')
const constants = require('../constants')

// 契約ステータス
const contractStatuses = constants.statusConstants.contractStatuses
// サービス種別
const serviceTypes = constants.statusConstants.serviceTypes
// ログメッセージ
const logMessage = constants.logMessage

/**
 * 解約画面の表示
 * @param {object} req リクエスト
 * @param {object} res レスポンス
 * @param {function} next 次の処理
 * @returns
 */
const showContractCancel = async (req, res, next) => {
  logger.info(logMessage.INF000 + 'showContractCancel')

  // 解約の事前チェック
  const contracts = await checkContractStatus(req, res, next)
  if (!contracts) return

  // 解約画面に渡す。
  res.render('contractCancellation', {
    title: '契約情報解約',
    engTitle: 'CONTRACT CANCELLATION',
    numberN: contracts?.find((i) => i.contractStatus === contractStatuses.onContract)?.numberN,
    csrfToken: req.csrfToken()
  })
  logger.info(logMessage.INF001 + 'showContractCancel')
}

/**
 * 解約の事前チェック
 * @param {object} req リクエスト
 * @param {object} res レスポンス
 * @param {function} next 次の処理
 * @returns ライトプラン契約情報
 */
const checkContractStatus = async (req, res, next) => {
  // ライトプランの契約情報を取得する
  const contractslightPlan = await contractController.findContracts(
    { tenantId: req.user?.tenantId, serviceType: serviceTypes.lightPlan },
    null
  )
  if (contractslightPlan instanceof Error) return next(errorHelper.create(500))
  // ライトプラン契約中の場合、メッセージを返却
  if (!contractslightPlan) {
    return next(noticeHelper.create('lightPlanCanceling'))
  }

  const contracts = await contractController.findContracts(
    { tenantId: req.user?.tenantId, serviceType: serviceTypes.bcd },
    null
  )
  // 申し込み前、または申し込み～申し込み竣工完了まで、または解約完了場合
  if (
    !contracts?.length ||
    contracts.some(
      (i) =>
        i.contractStatus === contractStatuses.newContractOrder ||
        i.contractStatus === contractStatuses.newContractReceive ||
        i.contractStatus === contractStatuses.newContractBeforeCompletion
    ) ||
    contracts.every((i) => i.contractStatus === contractStatuses.canceledContract)
  ) {
    return next(noticeHelper.create('registerprocedure'))
  } else if (
    contracts.some(
      (i) =>
        i.contractStatus === contractStatuses.cancellationOrder ||
        i.contractStatus === contractStatuses.cancellationReceive
    )
  ) {
    // 解約中の場合(解約着手待ち～解約完了竣工まで)
    return next(noticeHelper.create('cancellation'))
  } else {
    return contracts
  }
}

/**
 * 解約の実施
 * @param {object} req リクエスト
 * @param {object} res レスポンス
 * @param {function} next 次の処理
 * @returns
 */
const contractCancel = async (req, res, next) => {
  logger.info(logMessage.INF000 + 'contractCancel')

  // ライトプランの解約の事前チェック
  const contracts = await checkContractStatus(req, res, next)
  if (!contracts) return

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
    serviceTypes.bcd,
    constants.statusConstants.prdtCodes.bcd,
    constants.statusConstants.appTypes.cancel,
    salesChannelDeptType
  )

  // 客様番号の設定
  orderData.contractBasicInfo.contractNumber = contracts?.find(
    (i) => i.contractStatus === contractStatuses.onContract
  )?.numberN

  // 解約する
  const result = await applyOrderController.cancelOrder(req.user?.tenantId, serviceTypes.bcd, orderData)
  // データベースエラーは、エラーオブジェクトが返る
  if (result instanceof Error) return next(errorHelper.create(500))

  // 完了画面へ遷移
  res.render('contractCancellationComplete', {
    title: '契約情報解約',
    engTitle: 'CONTRACT CANCELLATION',
    csrfToken: req.csrfToken()
  })
  logger.info(logMessage.INF001 + 'contractCancel')
}

router.get('/', csrfProtection, helper.bcdAuthenticate, showContractCancel)
router.post('/register', csrfProtection, helper.bcdAuthenticate, contractCancel)

module.exports = {
  router: router,
  showContractCancel,
  contractCancel
}
