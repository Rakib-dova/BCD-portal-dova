const { v4: uuidv4 } = require('uuid')

const Contract = require('../models').Contract
const Order = require('../models').Order
const db = require('../models')
const contractController = require('../controllers/contractController')
const constants = require('../constants').statusConstants
const logger = require('../lib/logger')

// 契約ステータス
const contractStatuses = constants.contractStatuses
// オーダー種別
const orderTypes = constants.orderTypes

/**
 * 有料サービスの契約(複数可能)
 * @param {string} tenantId テナントID
 * @param {object[]} orderDataList オーダーデータリスト
 * @returns
 */
const applyNewOrders = async (tenantId, orderDataList) => {
  try {
    await db.sequelize.transaction(async (t) => {
      // 現在の日時
      const date = new Date()

      const contractList = []
      const orderList = []

      for (const orderData of orderDataList) {
        // contractIdの生成（uuid）
        const contractId = uuidv4()

        contractList.push({
          contractId: contractId,
          tenantId: tenantId,
          serviceType: orderData.contractBasicInfo.serviceType,
          numberN: '',
          contractStatus: contractStatuses.newContractOrder,
          deleteFlag: false,
          createdAt: date,
          updatedAt: date
        })

        orderList.push({
          contractId: contractId,
          tenantId: tenantId,
          orderType: orderTypes.newOrder,
          orderData: JSON.stringify(orderData)
        })
      }
      // Contractデータの登録
      await Contract.bulkCreate(contractList, {
        transaction: t
      })

      // Orderデータの登録
      await Order.bulkCreate(orderList, { transaction: t })
    })
  } catch (error) {
    // status 0はDBエラー
    logger.error({ tenant: tenantId, stack: error.stack, status: 0 }, error.name)
    return error
  }
}

/**
 * 解約
 * @param {string} tenantId テナントID
 * @param {string} serviceType サービス種別
 * @param {object} orderData オーダーデータ
 * @returns
 */
const cancelOrder = async (tenantId, serviceType, orderData) => {
  try {
    await db.sequelize.transaction(async (t) => {
      const contract = await contractController.findContract(
        {
          tenantId: tenantId,
          serviceType: serviceType,
          contractStatus: contractStatuses.onContract
        },
        null
      )

      // 契約が存在しない場合
      if (!contract?.contractId) throw new Error('Not Founded ContractId')

      // 現在の日時
      const date = new Date()

      // Contractデータの更新
      await Contract.update(
        {
          contractStatus: contractStatuses.cancellationOrder,
          updatedAt: date
        },
        {
          where: {
            contractId: contract.contractId
          },
          transaction: t
        }
      )

      // Orderデータの登録
      await Order.create(
        {
          contractId: contract.contractId,
          tenantId: tenantId,
          orderType: orderTypes.cancelOrder,
          orderData: JSON.stringify(orderData)
        },
        { transaction: t }
      )
    })
  } catch (error) {
    // status 0はDBエラー
    logger.error({ tenant: tenantId, stack: error.stack, status: 0 }, error.name)
    return error
  }
}

module.exports = {
  applyNewOrders: applyNewOrders,
  cancelOrder: cancelOrder
}
