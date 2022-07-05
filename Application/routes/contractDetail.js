'use strict'
const express = require('express')
const csrf = require('csurf')

const middleware = require('./helpers/middleware')
const errorHelper = require('./helpers/error')
const logger = require('../lib/logger')
const constants = require('../constants')
const Op = require('../models').Sequelize.Op
const contractController = require('../controllers/contractController.js')

const router = express.Router()
const csrfProtection = csrf({ cookie: false })

// 契約ステータス
const contractStatuses = constants.statusConstants.contractStatuses
// サービス種別
const serviceTypes = constants.statusConstants.serviceTypes
// ログメッセージ
const logMessage = constants.logMessage

class ContractInfo {
  /**
   * 契約情報コンストラクタ
   * @param {object} contract 契約情報
   */
  constructor(contract) {
    this.serviceType = contract.serviceType
    this.contractNumber = contract.numberN
    this.contractStatus = contract.contractStatus
  }
}

const showContractDetail = async (req, res, next) => {
  logger.info(logMessage.INF000 + 'showContractDetail')

  // 解約済以外契約情報を取得する
  const contracts = await contractController.findContracts(
    {
      tenantId: req.user?.tenantId,
      contractStatus: { [Op.ne]: constants.statusConstants.contractStatuses.canceledContract }
    },
    [['serviceType', 'ASC']]
  )
  if (contracts instanceof Error) return next(errorHelper.create(500))

  // 継続利用サービスリスト
  const continuingContractList = []
  // 初回利用サービスリスト
  const oneShotContractList = []

  for (const contract of contracts) {
    // 導入支援サービスの場合
    if (contract.serviceType === serviceTypes.introductionSupport) {
      // 導入支援サービスが申込処理中や設定準備中の場合
      if (
        contract.contractStatus === contractStatuses.newContractOrder ||
        contract.contractStatus === contractStatuses.newContractReceive ||
        contract.contractStatus === contractStatuses.newContractBeforeCompletion
      ) {
        oneShotContractList.push(new ContractInfo(contract))
      }
    } else {
      continuingContractList.push(new ContractInfo(contract))
    }
  }

  // ご契約内容を画面に渡す。
  res.render('contractDetail', {
    title: 'ご契約内容',
    engTitle: 'CONTRACT DETAIL',
    continuingContractList: continuingContractList,
    oneShotContractList: oneShotContractList
  })
  logger.info(logMessage.INF001 + 'showContractDetail')
}

router.get('/', csrfProtection, middleware.bcdAuthenticate, middleware.isTenantManager, showContractDetail)

module.exports = {
  router: router,
  showContractDetail: showContractDetail
}
