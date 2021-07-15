const Contract = require('../models').Contract
const logger = require('../lib/logger')

module.exports = {
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
  }
}
