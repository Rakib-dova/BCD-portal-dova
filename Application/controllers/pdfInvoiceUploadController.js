const pdfInvoiceUpload = require('../models').pdfInvoiceUpload
const constantsDefine = require('../constants')
const logger = require('../lib/logger')

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
  insert: async (values) => {
    const functionName = 'pdfInvoiceUploadController.insert'
    logger.info(`${constantsDefine.logMessage.INF000}${functionName}`)
    try {
      const result = await pdfInvoiceUpload.create({
        ...values
      })
      logger.info(`${constantsDefine.logMessage.INF001}${functionName}`)
      return result
    } catch (error) {
      logger.error({ tenantId: values.tenantId, stack: error.stack, status: 0 })
      return error
    }
  },
  updateCount: async ({ invoiceUploadId, successCount, failCount, skipCount, invoiceCount }) => {
    const functionName = 'pdfInvoiceUploadController.updateCount'
    logger.info(`${constantsDefine.logMessage.INF000}${functionName}`)

    try {
      const result = await pdfInvoiceUpload.update(
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
      logger.info(`${constantsDefine.logMessage.INF001}${functionName}`)
      return result
    } catch (error) {
      logger.error({ invoiceUploadId: invoiceUploadId, stack: error.stack, status: 0 })
      return error
    }
  }
}
