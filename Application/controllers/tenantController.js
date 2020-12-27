const Tenant = require('../models').Tenant

module.exports = {
  findOne: async (tenantId) => {
    const tenant = await Tenant.findOne({
      where: {
        tenantId: tenantId
      }
    })

    return tenant
  }
}
