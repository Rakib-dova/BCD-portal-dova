'use strict'
const csrf = require('csurf')
const express = require('express')

const helper = require('./helpers/middleware')
const errorHelper = require('./helpers/error')
const noticeHelper = require('./helpers/notice')
const OrderData = require('./helpers/orderData')
const Op = require('../models').Sequelize.Op
const contractController = require('../controllers/contractController.js')
const applyOrderController = require('../controllers/applyOrderController.js')
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
 * 解約の事前チェック
 * @param {string} tenantId テナントID
 * @param {function} next 次の処理
 * @returns スタンダードプラン契約情報
 */
const checkContractStatus = async (tenantId, next) => {
  // 解約済以外スタンダードプランの契約情報を取得する
  const contracts = await contractController.findContracts(
    {
      tenantId: tenantId,
      serviceType: serviceTypes.lightPlan,
      contractStatus: { [Op.ne]: contractStatuses.canceledContract }
    },
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
        i.contractStatus === contractStatuses.newContractBeforeCompletion
    )
  ) {
    return next(noticeHelper.create('standardUnregistered'))
  } else if (
    contracts.some(
      (i) =>
        i.contractStatus === contractStatuses.cancellationOrder ||
        i.contractStatus === contractStatuses.cancellationReceive
    )
  ) {
    // 解約中の場合(解約着手待ち～解約完了竣工まで)
    return next(noticeHelper.create('standardCanceling'))
  } else {
    return contracts
  }
}

/**
 * 解約画面の表示
 * @param {object} req リクエスト
 * @param {object} res レスポンス
 * @param {function} next 次の処理
 * @returns 解約画面
 */
const showContractCancel = async (req, res, next) => {
  logger.info(logMessage.INF000 + 'showContractCancel')

  // 解約の事前チェック
  const contracts = await checkContractStatus(req.user?.tenantId, next)
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
 * 解約の実施
 * @param {object} req リクエスト
 * @param {object} res レスポンス
 * @param {function} next 次の処理
 * @returns DBエラーの場合、エラーオブジェクトを返却、無事処理が完了すれば完了画面へ遷移
 */
const contractCancel = async (req, res, next) => {
  logger.info(logMessage.INF000 + 'contractCancel')

  // スタンダードプランの解約の事前チェック
  const contracts = await checkContractStatus(req.user?.tenantId, next)
  if (!contracts) return

  // オーダー情報の取得
  const orderData = new OrderData(
    req.user?.tenantId,
    req.body,
    constants.statusConstants.orderTypes.cancelOrder,
    serviceTypes.lightPlan,
    constants.statusConstants.prdtCodes.lightPlan,
    constants.statusConstants.appTypes.cancel,
    null
  )

  // 客様番号の設定
  orderData.contractBasicInfo.contractNumber = contracts?.find(
    (i) => i.contractStatus === contractStatuses.onContract
  )?.numberN

  // 解約する
  const result = await applyOrderController.cancelOrder(req.user?.tenantId, orderData)
  // データベースエラーは、エラーオブジェクトが返る
  if (result instanceof Error) return next(errorHelper.create(500))

  // 完了画面へ遷移
  res.render('contractCancellationComplete', {
    title: '契約情報解約',
    engTitle: 'CONTRACT CANCELLATION'
  })
  logger.info(logMessage.INF001 + 'contractCancel')
}

router.get(
  '/',
  csrfProtection,
  helper.bcdAuthenticate,
  helper.isTenantManager,
  helper.isOnOrChangeContract,
  showContractCancel
)

router.post(
  '/register',
  csrfProtection,
  helper.bcdAuthenticate,
  helper.isTenantManager,
  helper.isOnOrChangeContract,
  contractCancel
)

module.exports = {
  router: router,
  checkContractStatus: checkContractStatus,
  showContractCancel: showContractCancel,
  contractCancel: contractCancel
}
