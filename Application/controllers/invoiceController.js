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
      logger.error(`${constantsDefine.logMessage.CMMERR000}${functionName}:25行`)
      return
    }
    const tenantRow = await tenantController.findOne(userTenantId)
    const tenantId = tenantRow?.dataValues?.tenantId

    if (!tenantId) {
      logger.info(`${constantsDefine.logMessage.DBINF000}${functionName}:31行`)
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
  },
  findforTenant: async (tenantId) => {
    const functionName = 'invoiceController.findforTenant'
    let result
    logger.info(`${constantsDefine.logMessage.INF000}${functionName}`)
    try {
      result = Invoice.findAll({
        where: {
          tenantId: tenantId
        },
        order: [['updatedAt', 'DESC']]
      })
    } catch (error) {
      logger.error({ tenantId: tenantId, stack: error.stack, status: 0 })
      result = error
    }
    return result
  },
  updateCount: async (_invoicesId, _successCount, _failCount, _skipCount) => {
    try {
      const invoice = await Invoice.update(
        {
          successCount: _successCount,
          failCount: _failCount,
          skipCount: _skipCount
        },
        {
          where: {
            invoicesId: _invoicesId
          }
        }
      )
      return invoice
    } catch (error) {
      logger.error({ invoicesId: _invoicesId, stack: error.stack, status: 0 })
      return error
    }
  }
}
