'use strict'
const csrf = require('csurf')
const express = require('express')

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
 * 有料サービス申込前の契約状態のチェック
 * @param {string} tenantId テナントID
 * @param {string[]} serviceList 有料サービスリスト
 * @returns 解約済以外契約情報
 */
const checkPaidServiceContract = async (tenantId, serviceList, next) => {
  logger.info(logMessage.INF000 + 'checkPaidServiceContract')

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
    // 希望サービスの解約済以外契約情報が存在する場合
    if (contracts.some((i) => i.serviceType === service)) {
      switch (service) {
        // 導入支援サービスの場合
        case serviceTypes.introductionSupport:
          return next(noticeHelper.create('introductionSupportregistered'))

        // スタンダードプランの場合
        case serviceTypes.lightPlan:
          //  申込中の場合(申し込み～竣工まで)
          if (
            contracts.some(
              (i) =>
                i.contractStatus === contractStatuses.newContractOrder ||
                i.contractStatus === contractStatuses.newContractReceive ||
                i.contractStatus === contractStatuses.newContractBeforeCompletion
            )
          ) {
            return next(noticeHelper.create('lightPlanRegistering'))

            //  契約中の場合(竣工～解約処理完了まで)
          } else {
            return next(noticeHelper.create('lightPlanRegistered'))
          }

        // 想定外サービス種別の場合
        default:
          return next(errorHelper.create(500))
      }
    }
  }

  logger.info(logMessage.INF001 + 'checkPaidServiceContract')
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
  const serviceType = req.params.serviceType

  // 有料サービス申込前の契約状態のチェック
  const contracts = await checkPaidServiceContract(req.user?.tenantId, [serviceType], next)
  if (!contracts) return

  const paidServiceInfo = {
    // 申込サービスタイプ
    serviceType: serviceType,
    // スタンダードプランチェックボックス非活性
    standardDisabled: false,
    // 導入支援サービスチェックボックス非活性
    introductionSupportDisabled: false
  }

  // 有料サービス契約情報が存在する場合
  for (const contract of contracts) {
    // 導入支援サービスの契約が存在する場合
    if (contract.serviceType === serviceTypes.introductionSupport) {
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
  const services = req.body.services
  const serviceList = services instanceof Array ? services : [services]

  // 有料サービス申込前の契約状態のチェック
  const contracts = await checkPaidServiceContract(req.user?.tenantId, serviceList, next)
  if (!contracts) return

  // セッションにチェックされている申込サービスリストを設定する
  req.session.serviceList = serviceList

  // チャネル組織マスターからチャネル組織情報リストを取得
  const salesChannelDeptList = await channelDepartmentController.findAll()
  if (salesChannelDeptList instanceof Error) return next(errorHelper.create(500))

  // 有料サービス利用登録入力フォーム画面の表示
  res.render('paidServiceRegister', {
    title: '有料サービス利用登録',
    engTitle: 'PAID SERVICE REGISTER',
    csrfToken: req.csrfToken(),
    salesChannelDeptList: salesChannelDeptList
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
  const serviceList = req.session.serviceList

  // 有料サービス申込前の契約状態のチェック
  const contracts = await checkPaidServiceContract(req.user?.tenantId, serviceList, next)
  if (!contracts) return

  // セッションから申込サービスリストをクリアする
  req.session.serviceList = null

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

  // 契約する
  const result = await applyOrderController.applyNewOrders(req.user?.tenantId, orderDataList)
  // データベースエラーは、エラーオブジェクトが返る
  if (result instanceof Error) return next(errorHelper.create(500))

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
  '/:serviceType',
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
  checkPaidServiceContract: checkPaidServiceContract,
  showPaidServiceRegisterTerms: showPaidServiceRegisterTerms,
  showPaidServiceRegister: showPaidServiceRegister,
  applyPaidServiceRegister: applyPaidServiceRegister
}
