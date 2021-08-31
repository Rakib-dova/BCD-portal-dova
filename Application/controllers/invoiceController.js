const db = require('../models')
const logger = require('../lib/logger')
const tenantController = require('./tenantController')
const Invoice = db.Invoice
const constantsDefine = require('../constants')
const { Op } = require('sequelize')

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
    let tenantRow
    let tenantId
    let resultToInsertInvoice
    logger.info(`${constantsDefine.logMessage.INF000}${functionName}`)
    const userTenantId = values?.tenantId
    if (!userTenantId) {
      logger.error(`${constantsDefine.logMessage.CMMERR000}${functionName}`)
      return
    }

    try {
      tenantRow = await tenantController.findOne(userTenantId)
      tenantId = tenantRow?.dataValues?.tenantId
    } catch (error) {
      logger.error({ tenantId: userTenantId, stack: error.stack, status: 0 })
      return
    }

    if (!tenantId) {
      logger.info(`${constantsDefine.logMessage.DBINF000}${functionName}`)
      return
    }

    try {
      resultToInsertInvoice = await Invoice.create({
        ...values,
        tenantId: tenantId
      })
    } catch (error) {
      logger.error({ tenantId: userTenantId, stack: error.stack, status: 0 })
      return
    }

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
    const now = new Date()
    const beforeOneYear = new Date(`${now.getFullYear() - 1}-${now.getMonth() + 1}-${now.getDate()}`)
    logger.info(`${constantsDefine.logMessage.INF000}${functionName}`)
    try {
      result = await Invoice.findAll({
        where: {
          tenantId: tenantId,
          createdAt: {
            [Op.between]: [beforeOneYear, now]
          }
        },
        order: [['createdAt', 'DESC']]
      })
    } catch (error) {
      logger.error({ tenantId: tenantId, stack: error.stack, status: 0 })
      result = error
    }
    return result
  },
  updateCount: async ({ invoicesId, successCount, failCount, skipCount, invoiceCount }) => {
    try {
      const invoice = await Invoice.update(
        {
          successCount: successCount,
          failCount: failCount,
          skipCount: skipCount,
          invoiceCount: invoiceCount
        },
        {
          where: {
            invoicesId: invoicesId
          }
        }
      )
      return invoice
    } catch (error) {
      logger.error({ invoicesId: invoicesId, stack: error.stack, status: 0 })
      return error
    }
  }
}
