const Tenant = require('../models').Tenant
const logger = require('../lib/logger')

module.exports = {
  findOne: async (tenantId) => {
    try {
      return await Tenant.findOne({
        where: {
          tenantId: tenantId
        }
      })
    } catch (error) {
      // status 0はDBエラー
      logger.error({ user: tenantId, stack: error.stack, status: 0 }, error.name)
      return error
    }
  },
  updateDeleteFlag: async (values) => {
    try {
      return await Tenant.update(
        {
          deleteFlag: false
        },
        {
          where: {
            tenantId: values.tenantId
          }
        },
        {
          transaction: values.transaction
        }
      )
    } catch (error) {
      logger.error({ user: values.tenantId, stack: error.stack, status: 0 }, error.name)
      return error
    }
  }
}
