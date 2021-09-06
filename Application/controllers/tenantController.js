const Tenant = require('../models').Tenant
const logger = require('../lib/logger')

module.exports = {
  findOne: async (tenantId) => {
    try {
      const tenant = await Tenant.findOne({
        where: {
          tenantId: tenantId
        }
      })

      return tenant
    } catch (error) {
      // status 0はDBエラー
      logger.error({ user: tenantId, stack: error.stack, status: 0 }, error.name)
      return error
    }
  },
  updateStatus: async (values) => {
    try {
      const tenant = await Tenant.update(
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
      return tenant
    } catch (error) {
      logger.error({ user: values.tenantId, stack: error.stack, status: 0 }, error.name)
      return error
    }
  }
}
