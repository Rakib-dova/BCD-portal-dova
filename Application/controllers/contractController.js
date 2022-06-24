const Contract = require('../models').Contract
const logger = require('../lib/logger')
const db = require('../models')
const Op = db.Sequelize.Op
const constantsDefine = require('../constants')
const contractStatuses = constantsDefine.statusConstants.contractStatuses
const serviceTypes = constantsDefine.statusConstants.serviceTypes

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
          serviceType: '010',
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
  },
  findLightPlan: async (tenantId) => {
    try {
      const contract = await Contract.findOne({
        where: {
          tenantId: tenantId,
          contractStatus: {
            [Op.or]: [contractStatuses.onContract, contractStatuses.newContractBeforeCompletion]
          },
          serviceType: serviceTypes.lightPlan,
          deleteFlag: false
        }
      })
      return contract
    } catch (error) {
      // status 0はDBエラー
      logger.error({ user: tenantId, stack: error.stack, status: 0 }, error.name)
      return error
    }
  }
}
