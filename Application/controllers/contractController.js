const Contract = require('../models').Contract
const logger = require('../lib/logger')

module.exports = {
  findContractsBytenantId: async (tenantId, order) => {
    try {
      const contracts = await Contract.findAll({
        raw: true,
        where: { tenantId: tenantId },
        order
      })

      return contracts
    } catch (error) {
      logger.error({ user: tenantId, stack: error.stack, status: 0 }, error.name)
      return null
    }
  },
  findOne: async (tenantId) => {
    try {
      const contract = await Contract.findOne({
        where: {
          tenantId: tenantId,
          deleteFlag: false
        }
      })

      return contract
    } catch (error) {
      // status 0はDBエラー
      logger.error({ user: tenantId, stack: error.stack, status: 0 }, error.name)
      return error
    }
  },
  findOneByServiceType: async (tenantId, serviceType) => {
    try {
      const contract = await Contract.findOne({
        where: {
          tenantId: tenantId,
          serviceType: serviceType
        }
      })

      return contract
    } catch (error) {
      // status 0はDBエラー
      logger.error({ user: tenantId, stack: error.stack, status: 0 }, error.name)
      return error
    }
  },
  findContract: async (_where, _orders) => {
    try {
      const contract = await Contract.findOne(
        {
          where: _where
        },
        {
          order: _orders
        }
      )
      return contract
    } catch (error) {
      logger.error({ SQL: `SELECT * FROM WHERE ${_where} ORDER BY ${_orders} / Error : ${error}` })
      return error
    }
  },
  updateStatus: async (_contractId, _orderType) => {
    try {
      const contract = await Contract.update(
        {
          contractStatus: _orderType
        },
        {
          where: {
            contractId: _contractId
          }
        }
      )
      return contract
    } catch (error) {
      logger.error({ user: _contractId, stack: error.stack, status: 0 }, error.name)
      return error
    }
  }
}
