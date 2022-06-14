'use strict'
const csrf = require('csurf')
const express = require('express')

const helper = require('./helpers/middleware')
const errorHelper = require('./helpers/error')
const noticeHelper = require('./helpers/notice')
const OrderData = require('./helpers/orderData')
const contractController = require('../controllers/contractController.js')
const applyOrderController = require('../controllers/applyOrderController.js')
const logger = require('../lib/logger')
const constantsDefine = require('../constants')

const router = express.Router()
const csrfProtection = csrf({ cookie: false })

/**
 * ライトプランの解約の事前チェック
 * @param {object} req リクエスト
 * @param {object} res レスポンス
 * @param {function} next 次の処理
 * @returns
 */
const checkContractStatus = async (req, res, next) => {
  // ライトプランの契約情報を取得する
  const contracts = await contractController.findContracts(
    { tenantId: req.user.tenantId, serviceType: constantsDefine.statusConstants.serviceType.lightPlan },
    null
  )

  // 申し込み前、または申し込み～申し込み竣工完了まで、または解約完了場合
  if (
    !contracts?.length ||
    contracts.some(
      (i) =>
        i.contractStatus === constantsDefine.statusConstants.contractStatus.newContractOrder ||
        i.contractStatus === constantsDefine.statusConstants.contractStatus.newContractReceive ||
        i.contractStatus === constantsDefine.statusConstants.contractStatus.newContractBeforeCompletion ||
        i.contractStatus === constantsDefine.statusConstants.contractStatus.canceledContract
    )
  ) {
    return next(noticeHelper.create('lightPlanUnregistered'))
  }
  // 解約中の場合(解約着手待ち～解約完了竣工まで)
  if (
    contracts.some(
      (i) =>
        i.contractStatus === constantsDefine.statusConstants.contractStatus.cancellationOrder ||
        i.contractStatus === constantsDefine.statusConstants.contractStatus.cancellationReceive
    )
  ) {
    return next(noticeHelper.create('lightPlanCanceling'))
  }
  next()
}

/**
 * ライトプランの解約画面の表示
 * @param {object} req リクエスト
 * @param {object} res レスポンス
 * @param {function} next 次の処理
 * @returns
 */
const showCancelLightPlan = async (req, res, next) => {
  logger.info(constantsDefine.logMessage.INF000 + 'showCancelLightPlan')

  // DBから契約情報取得
  const contract = await contractController.findOne(req.user.tenantId)

  // TODO DBマスターから取得
  const salesChannelDeptList = [
    { code: '001', name: 'Com第一営業本部' },
    { code: '002', name: 'Com第二営業本部' },
    { code: '003', name: 'Com第三営業本部' }
  ]

  // ライトプラン解約画面表示
  res.render('cancelLightPlan', {
    title: 'ライトプラン解約',
    numberN: contract.dataValues?.numberN,
    salesChannelDeptList: salesChannelDeptList,
    csrfToken: req.csrfToken()
  })
  logger.info(constantsDefine.logMessage.INF001 + 'showCancelLightPlan')
}

/**
 * ライトプランの解約の実施
 * @param {object} req リクエスト
 * @param {object} res レスポンス
 * @param {function} next 次の処理
 * @returns
 */
const cancelLightPlan = async (req, res, next) => {
  logger.info(constantsDefine.logMessage.INF000 + 'cancelLightPlan')

  // オーダー情報の取得
  const orderData = new OrderData(
    req.user.tenantId,
    req.body,
    constantsDefine.statusConstants.orderType.cancelOrder,
    constantsDefine.statusConstants.serviceType.lightPlan,
    constantsDefine.statusConstants.prdtCode.lightPlan,
    constantsDefine.statusConstants.appType.cancel
  )

  // Contracts,Ordersにデータを登録する
  const result = await applyOrderController.cancelOrder(
    req.user?.tenantId,
    constantsDefine.statusConstants.serviceType.lightPlan,
    orderData
  )
  // データベースエラーは、エラーオブジェクトが返る
  if (result instanceof Error) return next(errorHelper.create(500))

  req.flash('info', 'ライトプラン解約が完了いたしました。')
  logger.info(constantsDefine.logMessage.INF001 + 'cancelLightPlan')
  return res.redirect(303, '/portal')
}

router.get(
  '/',
  helper.isAuthenticated,
  helper.isTenantRegistered,
  helper.isUserRegistered,
  csrfProtection,
  checkContractStatus,
  showCancelLightPlan
)

router.post(
  '/register',
  helper.isAuthenticated,
  helper.isTenantRegistered,
  helper.isUserRegistered,
  csrfProtection,
  checkContractStatus,
  cancelLightPlan
)

module.exports = {
  router: router,
  checkContractStatus: checkContractStatus,
  showCancelLightPlan: showCancelLightPlan,
  cancelLightPlan: cancelLightPlan
}
