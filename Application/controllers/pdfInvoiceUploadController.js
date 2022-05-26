const pdfInvoiceUpload = require('../models').PdfInvoiceUpload
const constantsDefine = require('../constants')
const logger = require('../lib/logger')
const { Op } = require('sequelize')

module.exports = {
  // パラメータ値
  // values{
  //   invoiceUploadId,
  //   tenantId,
  //   csvFileName,
  //   successCount,
  //   failCount,
  //   skipCount,
  //   invoiceCount
  // }
  create: async (values) => {
    const functionName = 'pdfInvoiceUploadController.insert'
    logger.info(`${constantsDefine.logMessage.INF000}${functionName}`)
    let result
    try {
      result = await pdfInvoiceUpload.create({
        ...values
      })
    } catch (error) {
      logger.error({
        values: {
          ...values
        },
        stack: error.stack,
        status: 0
      })
      result = error
    }
    logger.info(`${constantsDefine.logMessage.INF001}${functionName}`)
    return result
  },
  updateCount: async ({ invoiceUploadId, successCount, failCount, skipCount, invoiceCount }) => {
    const functionName = 'pdfInvoiceUploadController.updateCount'
    logger.info(`${constantsDefine.logMessage.INF000}${functionName}`)
    let result
    try {
      result = await pdfInvoiceUpload.update(
        {
          successCount: successCount,
          failCount: failCount,
          skipCount: skipCount,
          invoiceCount: invoiceCount
        },
        {
          where: {
            invoiceUploadId: invoiceUploadId
          }
        }
      )
    } catch (error) {
      logger.error({ invoiceUploadId: invoiceUploadId, stack: error.stack, status: 0 })
      result = error
    }
    logger.info(`${constantsDefine.logMessage.INF001}${functionName}`)
    return result
  },
  findforTenant: async (tenantId) => {
    const functionName = 'pdfInvoiceUploadController.findforTenant'
    let result
    const now = new Date()
    const beforeOneYear = new Date(`${now.getFullYear() - 1}-${now.getMonth() + 1}-${now.getDate()}`)
    logger.info(`${constantsDefine.logMessage.INF000}${functionName}`)
    try {
      result = await pdfInvoiceUpload.findAll({
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
  }
}
