const pdfInvoiceUploadDetail = require('../models').PdfInvoiceUploadDetail
const constantsDefine = require('../constants')
const logger = require('../lib/logger')

module.exports = {
  // パラメータ値
  // values{
  //   invoiceUploadDetailId,
  //   invoiceUploadId,
  //   lines,
  //   invoiceId,
  //   status,
  //   errorData
  // }
  findInvoiceDetail: async (invoiceUploadId) => {
    const functionName = 'invoiceDetailController.findInvoiceDetail'
    logger.info(`${constantsDefine.logMessage.INF000}${functionName}`)
    let result
    try {
      result = await pdfInvoiceUploadDetail.findAll({
        where: {
          invoiceUploadId: invoiceUploadId
        },
        order: [
          ['invoiceId', 'ASC'],
          ['lines', 'ASC']
        ]
      })
    } catch (error) {
      logger.error({ invoiceUploadId: invoiceUploadId, stack: error.stack, status: 0 })
      result = error
    }
    logger.info(`${constantsDefine.logMessage.INF001}${functionName}`)
    return result
  },
  create: async (values) => {
    const functionName = 'pdfInvoiceUploadDetailController.insert'
    logger.info(`${constantsDefine.logMessage.INF000}${functionName}`)
    let result
    try {
      result = await pdfInvoiceUploadDetail.create({
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
  }
}
