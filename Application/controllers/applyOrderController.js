const { v4: uuidv4 } = require('uuid')

const Contract = require('../models').Contract
const Order = require('../models').Order
const db = require('../models')
const statusConstants = require('../constants').statusConstants
const logger = require('../lib/logger')

/**
 * Contracts,Ordersにデータを登録する
 * @param {string} tenantId テナントID
 * @param {object} orderData オーダーデータ
 * @returns
 */
const applyOrderController = async (tenantId, orderData) => {
  try {
    const created = await db.sequelize.transaction(async (t) => {
      // contractテーブルのdate
      const _date = new Date()

      // contractIdの生成（uuid）
      const contractId = uuidv4()

      // Contractデータの登録
      await Contract.create(
        {
          contractId: contractId,
          tenantId: tenantId,
          numberN: '',
          contractStatus: statusConstants.contractStatusNewContractOrder,
          deleteFlag: false,
          createdAt: _date,
          updatedAt: _date
        },
        { transaction: t }
      )

      // Orderデータの登録
      await Order.create(
        {
          contractId: contractId,
          tenantId: tenantId,
          orderType: statusConstants.orderTypeNewOrder,
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
  applyOrderController: applyOrderController
}
