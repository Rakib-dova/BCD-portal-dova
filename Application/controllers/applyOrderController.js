const { v4: uuidv4 } = require('uuid')

const Contract = require('../models').Contract
const Order = require('../models').Order
const db = require('../models')
const contractController = require('../controllers/contractController')
const statusConstants = require('../constants').statusConstants
const logger = require('../lib/logger')

/**
 * 契約
 * @param {string} tenantId テナントID
 * @param {string} serviceType サービス種別
 * @param {object} orderData オーダーデータ
 * @returns
 */
const applyNewOrder = async (tenantId, serviceType, orderData) => {
  try {
    const created = await db.sequelize.transaction(async (t) => {
      // 現在の日時
      const date = new Date()

      // contractIdの生成（uuid）
      const contractId = uuidv4()

      // Contractデータの登録
      await Contract.create(
        {
          contractId: contractId,
          tenantId: tenantId,
          serviceType: serviceType,
          numberN: '',
          contractStatus: statusConstants.contractStatus.newContractOrder,
          deleteFlag: false,
          createdAt: date,
          updatedAt: date
        },
        {
          transaction: t
        }
      )

      // Orderデータの登録
      await Order.create(
        {
          contractId: contractId,
          tenantId: tenantId,
          orderType: statusConstants.orderType.newOrder,
          orderData: JSON.stringify(orderData)
        },
        { transaction: t }
      )
    })

    return created
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
    const created = await db.sequelize.transaction(async (t) => {
      const contract = await contractController.findContract(
        {
          tenantId: tenantId,
          serviceType: serviceType,
          contractStatus: statusConstants.contractStatus.onContract
        },
        null
      )

      // 契約が存在しない場合
      if (!contract?.contractId) throw new Error('Not Founded ContractId')

      // 現在の日時
      const date = new Date()

      // Contractデータの登録
      await Contract.update(
        {
          contractStatus: statusConstants.contractStatus.cancellationOrder,
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
          orderType: statusConstants.orderType.cancelOrder,
          orderData: JSON.stringify(orderData)
        },
        { transaction: t }
      )
    })

    return created
  } catch (error) {
    // status 0はDBエラー
    logger.error({ tenant: tenantId, stack: error.stack, status: 0 }, error.name)
    return error
  }
}

module.exports = {
  applyNewOrder: applyNewOrder,
  cancelOrder: cancelOrder
}
