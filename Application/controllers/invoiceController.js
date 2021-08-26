const db = require('../models')
const logger = require('../lib/logger')
const tenantController = require('./tenantController')
const Invoice = db.Invoice
const constantsDefine = require('../constants')

module.exports = {
  // パラメータ値
  // values = {
  //   invoicesId,
  //   tenantId,
  //   csvFileName,
  //   successCount,
  //   failCount,
  //   skipCount,
  //   createdAt,
  //   updatedAt
  // }
  insert: async (values) => {
    const functionName = 'invoiceController.insert'
    logger.info(`${constantsDefine.logMessage.INF000}${functionName}`)
    const userTenantId = values?.tenantId
    if (!userTenantId) {
      logger.error(`${constantsDefine.logMessage.CMMERR000}${functionName}`)
      return
    }
    const tenantRow = await tenantController.findOne(userTenantId)
    const tenantId = tenantRow?.dataValues?.tenantId

    if (!tenantId) {
      logger.info(`${constantsDefine.logMessage.DBINF000}${functionName}`)
      return
    }

    const resultToInsertInvoice = await Invoice.create({
      ...values,
      tenantId: tenantId
    })

    logger.info(`${constantsDefine.logMessage.INF001}${functionName}`)
    return resultToInsertInvoice
  },
  findInvoice: async (invoicesId) => {
    const functionName = 'invoiceController.findInvoice'
    logger.info(`${constantsDefine.logMessage.INF000}${functionName}`)
    let invoice
    try {
      invoice = await Invoice.findOne({
        where: {
          invoicesId: invoicesId
        }
      })
    } catch (error) {
      logger.error({ invoicesId: invoicesId, stack: error.stack, status: 0 })
    }
    logger.info(`${constantsDefine.logMessage.INF001}${functionName}`)
    return invoice
  }
}
