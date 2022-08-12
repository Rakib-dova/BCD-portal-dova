'use strict'
const csrf = require('csurf')
const express = require('express')
const moment = require('moment-timezone')

const middleware = require('./helpers/middleware')
const noticeHelper = require('./helpers/notice')
const errorHelper = require('./helpers/error')
const OrderData = require('./helpers/orderData')
const logger = require('../lib/logger')
const constantsDefine = require('../constants')
const Op = require('../models').Sequelize.Op
const channelDepartmentController = require('../controllers/channelDepartmentController.js')
const contractController = require('../controllers/contractController.js')
const applyOrderController = require('../controllers/applyOrderController.js')

const router = express.Router()
const csrfProtection = csrf({ cookie: false })

// 契約ステータス
const contractStatuses = constantsDefine.statusConstants.contractStatuses
// サービス種別
const serviceTypes = constantsDefine.statusConstants.serviceTypes
// ログメッセージ
const logMessage = constantsDefine.logMessage

/**
 * 契約情報の取得とチェック
 * @param {string} tenantId テナントID
 * @param {string[]} serviceList 有料サービスリスト
 * @param {function} next 次の処理
 * @returns 解約済以外契約情報
 */
const getAndCheckContracts = async (tenantId, serviceList, next) => {
  logger.info(logMessage.INF000 + 'getAndCheckContracts')

  // 希望サービスの値のチェック
  if (!(serviceList instanceof Array) || serviceList.length === 0) {
    return next(errorHelper.create(500))
  }

  // 無償契約以外、かつ、解約済以外契約情報を取得する
  const contracts = await contractController.findContracts(
    {
      tenantId: tenantId,
      serviceType: { [Op.ne]: serviceTypes.bcd },
      contractStatus: { [Op.ne]: contractStatuses.canceledContract }
    },
    null
  )
  if (contracts instanceof Error) return next(errorHelper.create(500))

  for (const service of serviceList) {
    switch (service) {
      // 導入支援サービスの場合
      case serviceTypes.introductionSupport:
        // 申込済の場合
        if (
          contracts.some(
            (i) =>
              i.serviceType === serviceTypes.introductionSupport && i.contractStatus !== contractStatuses.onContract
          )
        ) {
          return next(noticeHelper.create('introductionSupportregistered'))
        }
        break

      // スタンダードプランの場合
      case serviceTypes.lightPlan:
        // 申込中の場合(申し込み～竣工まで)
        if (
          contracts.some(
            (i) =>
              i.serviceType === serviceTypes.lightPlan &&
              (i.contractStatus === contractStatuses.newContractOrder ||
                i.contractStatus === contractStatuses.newContractReceive ||
                i.contractStatus === contractStatuses.newContractBeforeCompletion)
          )
        ) {
          return next(noticeHelper.create('standardRegistering'))

          //  契約中の場合(竣工～解約処理完了まで)
        } else if (contracts.some((i) => i.serviceType === serviceTypes.lightPlan)) {
          return next(noticeHelper.create('standardRegistered'))
        }
        break

      // 想定外サービス種別の場合
      default:
        return next(errorHelper.create(500))
    }
  }

  logger.info(logMessage.INF001 + 'getAndCheckContracts')
  return contracts
}

/**
 * 有料サービス利用登録利用規約画面の表示
 * @param {object} req リクエスト
 * @param {object} res レスポンス
 * @param {function} next 次の処理
 * @returns
 */
const showPaidServiceRegisterTerms = async (req, res, next) => {
  logger.info(logMessage.INF000 + 'showPaidServiceRegisterTerms')

  // 申込サービスタイプ
  const serviceType = req.params?.serviceType

  // 申込サービスリスト
  const serviceList = serviceType ? [serviceType] : req.session?.serviceList

  // 有料サービス申込前の契約状態のチェック
  const contracts = await getAndCheckContracts(req.user?.tenantId, serviceList, next)
  if (!contracts) return

  // セッションに申込サービスリストを設定する
  req.session.serviceList = serviceList

  const paidServiceInfo = {
    // スタンダードプランチェックボックス値
    standardChecked: serviceList.some((i) => i === serviceTypes.lightPlan),
    // スタンダードプランチェックボックス値
    introductionSupportChecked: serviceList.some((i) => i === serviceTypes.introductionSupport),
    // スタンダードプランチェックボックス非活性
    standardDisabled: false,
    // 導入支援サービスチェックボックス非活性
    introductionSupportDisabled: false
  }

  // 有料サービス契約情報が存在する場合
  for (const contract of contracts) {
    // 導入支援サービスの契約が存在する場合
    if (
      contract.serviceType === serviceTypes.introductionSupport &&
      contract.contractStatus !== contractStatuses.onContract
    ) {
      paidServiceInfo.introductionSupportDisabled = true

      // スタンダードプランの契約が存在する場合
    } else if (contract.serviceType === serviceTypes.lightPlan) {
      paidServiceInfo.standardDisabled = true
    }
  }

  // 有料サービス利用登録利用規約画面の表示
  res.render('paidServiceRegisterTerms', {
    title: '有料サービス利用登録',
    engTitle: 'PAID SERVICE REGISTER',
    csrfToken: req.csrfToken(),
    paidServiceInfo: paidServiceInfo
  })
  logger.info(logMessage.INF001 + 'showPaidServiceRegisterTerms')
}

/**
 * 有料サービス利用登録画面の表示
 * @param {object} req リクエスト
 * @param {object} res レスポンス
 * @param {function} next 次の処理
 * @returns
 */
const showPaidServiceRegister = async (req, res, next) => {
  logger.info(logMessage.INF000 + 'showPaidServiceRegister')

  // チェックされている申込サービスの取得
  const serviceList = req.body?.services

  // 有料サービス申込前の契約状態のチェック
  const contracts = await getAndCheckContracts(req.user?.tenantId, serviceList, next)
  if (!contracts) return

  // セッションに申込サービスリストを設定する
  req.session.serviceList = serviceList

  // チャネル組織マスターからチャネル組織情報リストを取得
  const salesChannelDeptList = await channelDepartmentController.findAll()
  if (salesChannelDeptList instanceof Error) return next(errorHelper.create(500))

  // 有料サービス利用登録入力フォーム画面の表示
  res.render('paidServiceRegister', {
    title: '有料サービス利用登録',
    engTitle: 'PAID SERVICE REGISTER',
    csrfToken: req.csrfToken(),
    salesChannelDeptList: salesChannelDeptList,
    serviceList: serviceList
  })
  logger.info(logMessage.INF001 + 'showPaidServiceRegister')
}

/**
 * 有料サービスの申込
 * @param {object} req リクエスト
 * @param {object} res レスポンス
 * @param {function} next 次の処理
 * @returns
 */
const applyPaidServiceRegister = async (req, res, next) => {
  logger.info(logMessage.INF000 + 'applyPaidServiceRegister')

  // 申込サービスリストの取得
  const serviceList = req.session?.serviceList

  // 有料サービス申込前の契約状態のチェック
  const contracts = await getAndCheckContracts(req.user?.tenantId, serviceList, next)
  if (!contracts) return

  let salesChannelDeptType
  // 組織区分が選択された場合、コードで組織区分を取得し、オーダー情報に設定する
  if (req.body?.salesChannelDeptType) {
    const salesChannelDeptInfo = await channelDepartmentController.findOne(req.body?.salesChannelDeptType)
    if (salesChannelDeptInfo instanceof Error) return next(errorHelper.create(500))
    if (salesChannelDeptInfo?.name) salesChannelDeptType = salesChannelDeptInfo.name
  }

  // オーダー情報の取得
  const orderData = new OrderData(
    req.user?.tenantId,
    req.body,
    constantsDefine.statusConstants.orderTypes.newOrder,
    '',
    '',
    constantsDefine.statusConstants.appTypes.new,
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

  const orderDataList = []

  for (const service of serviceList) {
    const newOrderData = JSON.parse(JSON.stringify(orderData))

    switch (service) {
      // 導入支援サービスの場合
      case serviceTypes.introductionSupport:
        newOrderData.prdtList[0].prdtCode = constantsDefine.statusConstants.prdtCodes.introductionSupport
        break

      // スタンダードプランの場合
      case serviceTypes.lightPlan:
        newOrderData.prdtList[0].prdtCode = constantsDefine.statusConstants.prdtCodes.lightPlan
        break
    }

    // サービス種別の設定
    newOrderData.contractBasicInfo.serviceType = service
    orderDataList.push(newOrderData)
  }

  // 導入支援のみ申込時、開通希望日に16日後の日付を固定値とする
  if (serviceList.length === 1 && serviceList[0] === serviceTypes.introductionSupport) {
    orderDataList[0].contractBasicInfo.OpeningDate = moment().tz('Asia/Tokyo').add(16, 'd').format('YYYYMMDD')
  }

  // 契約する
  const result = await applyOrderController.applyNewOrders(req.user?.tenantId, orderDataList)
  // データベースエラーは、エラーオブジェクトが返る
  if (result instanceof Error) return next(errorHelper.create(500))

  // セッションから申込サービスリストをクリアする
  req.session.serviceList = null

  // 有料サービス利用登録完了画面の表示
  res.render('paidServiceRegisterComplete', {
    title: '有料サービス利用登録',
    engTitle: 'PAID SERVICE REGISTER',
    serviceList: serviceList
  })

  logger.info(logMessage.INF001 + 'applyPaidServiceRegister')
}

// 有料サービス利用登録規約
router.get(
  '/:serviceType?',
  csrfProtection,
  middleware.bcdAuthenticate,
  middleware.isTenantManager,
  middleware.isOnOrChangeContract,
  showPaidServiceRegisterTerms
)

// 有料サービス利用登録入力フォーム
router.post(
  '/showForm',
  csrfProtection,
  middleware.bcdAuthenticate,
  middleware.isTenantManager,
  middleware.isOnOrChangeContract,
  showPaidServiceRegister
)

// 有料サービス利用登録
router.post(
  '/apply',
  csrfProtection,
  middleware.bcdAuthenticate,
  middleware.isTenantManager,
  middleware.isOnOrChangeContract,
  applyPaidServiceRegister
)

module.exports = {
  router: router,
  getAndCheckContracts: getAndCheckContracts,
  showPaidServiceRegisterTerms: showPaidServiceRegisterTerms,
  showPaidServiceRegister: showPaidServiceRegister,
  applyPaidServiceRegister: applyPaidServiceRegister
}
