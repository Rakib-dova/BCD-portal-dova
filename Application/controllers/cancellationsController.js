'use stric'

const logger = require('../lib/logger')
const Order = require('../models').Order
const Cancellations = require('../models').Cancellation
let errorStatus = '050'
const Contract = require('./contractController')
const { v4: uuidv4 } = require('uuid')
const constantsDefine = require('../constants')

module.exports = {
  /**
   * 解約オーダー登録
   * @param {uuid} _tenantId テナントID
   * @param {date} _cancelData 解約日
   * @param {object} contractInformationcancelOrder 解約オーダー
   * @returns {object} {statuscode：200, value：'success'}（正常）、Error（DBエラー、システムエラーなど）
   */
  create: async (_tenantId, _cancelData, contractInformationcancelOrder) => {
    try {
      const contract = await Contract.findContract(
        { tenantId: _tenantId, serviceType: '010', deleteFlag: false },
        'createdAt DESC'
      )

      const cancelId = uuidv4()
      const createdDate = new Date()

      if (contract === undefined || contract === null) {
        errorStatus = '051'
        throw new Error('ERR051 Not Founded ContractId')
      }

      const updateContract = await Contract.updateStatus(
        contract.dataValues.contractId,
        constantsDefine.statusConstants.contractStatusCancellationOrder
      )

      if (updateContract === undefined || updateContract === null || updateContract === 0) {
        errorStatus = '052'
        throw new Error('ERR052 Not updated ContratStatus')
      }

      // Orderテーブルに入力
      await Order.findOrCreate({
        where: { contractId: contract.contractId },
        defaults: {
          contractId: contract.contractId,
          tenantId: _tenantId,
          orderType: constantsDefine.statusConstants.orderTypeCancelOrder,
          orderData: JSON.stringify(contractInformationcancelOrder)
        }
      })

      await Cancellations.create({
        cancelId: cancelId,
        contractId: contract.contractId,
        cancelData: _cancelData,
        createdAt: createdDate,
        updatedAt: createdDate
      })

      return { statuscode: 200, value: 'success' }
    } catch (error) {
      if (errorStatus === '051') {
        logger.error({ user: _tenantId, stack: error.stack, status: 0 }, error.name)
      } else if (errorStatus === '052') {
        logger.error({ user: _tenantId, stack: error.stack, status: 0 }, error.name)
      }
      return error
    }
  }
}
