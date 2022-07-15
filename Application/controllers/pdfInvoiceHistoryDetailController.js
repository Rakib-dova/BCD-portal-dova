const pdfInvoiceHistoryDetail = require('../models').pdfInvoiceHistoryDetail
const constantsDefine = require('../constants')
const logger = require('../lib/logger')

module.exports = {
  // パラメータ値
  // values{
  //   invoiceHistoryDetailId,
  //   historyId,
  //   lines,
  //   invoiceId,
  //   status,
  //   errorData
  // }
  findInvoiceDetail: async (historyId) => {
    const functionName = 'invoiceDetailController.findInvoiceDetail'
    logger.info(`${constantsDefine.logMessage.INF000}${functionName}`)
    let result
    try {
      result = await pdfInvoiceHistoryDetail.findAll({
        where: {
          historyId: historyId
        },
        order: [
          ['lines', 'ASC'],
          ['invoiceNo', 'ASC']
        ]
      })
    } catch (error) {
      logger.error({ historyId: historyId, stack: error.stack, status: 0 })
      result = error
    }
    logger.info(`${constantsDefine.logMessage.INF001}${functionName}`)
    return result
  },
  create: async (values) => {
    const functionName = 'pdfInvoiceHistoryDetailController.insert'
    logger.info(`${constantsDefine.logMessage.INF000}${functionName}`)
    let result
    try {
      result = await pdfInvoiceHistoryDetail.create({
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
