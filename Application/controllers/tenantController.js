const Tenant = require('../models').Tenant
const logger = require('../lib/logger')

module.exports = {
  /**
   * テナント情報取得
   * @param {uuid} tenantId テナントID
   * @returns {Tenant} テナント情報（正常）、Error（DBエラー、システムエラーなど）
   */
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
  /**
   * テナント情報更新（deleteFlagをfalseに更新）
   * @param {object} values テナント情報
   * @returns {Tenant} テナント情報（正常）、Error（DBエラー、システムエラーなど）
   */
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
