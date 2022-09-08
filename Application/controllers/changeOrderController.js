const Order = require('../models').Order
const logger = require('../lib/logger')
const Contract = require('./contractController')
const constantsDefine = require('../constants')
let errorStatus = '050'

module.exports = {
  create: async (_tenantId, contractInformationcancelOrder) => {
    try {
      const contract = await Contract.findContract({ tenantId: _tenantId, serviceType: '010', deleteFlag: false }, 'createdAt DESC')

      if (contract === undefined || contract === null) {
        errorStatus = '051'
        throw new Error('ERR051 Not Founded ContractId')
      }

      const updateContract = await Contract.updateStatus(
        contract.dataValues.contractId,
        constantsDefine.statusConstants.contractStatusSimpleChangeContractOrder
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
          orderType: constantsDefine.statusConstants.orderTypeSimpleChangeOrder,
          orderData: JSON.stringify(contractInformationcancelOrder)
        }
      })

      return { statuscode: 200, value: 'success' }
    } catch (error) {
      if (errorStatus === '051') {
        logger.error({ user: _tenantId, stack: error.stack, status: 0 }, error.name)
      } else if (errorStatus === '052') {
        logger.error({ user: _tenantId, stack: error.stack, status: 0 }, error.name)
      }
      return { statuscode: errorStatus, value: error }
    }
  }
}
