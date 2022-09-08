const pdfInvoiceHistory = require('../models').pdfInvoiceHistory
const pdfInvoiceHistoryDetail = require('../models').pdfInvoiceHistoryDetail
const constantsDefine = require('../constants')
const logger = require('../lib/logger')
const { Op } = require('sequelize')

module.exports = {
  // パラメータ値
  // values{
  //   historyId,
  //   tenantId,
  //   csvFileName,
  //   successCount,
  //   failCount,
  //   skipCount,
  //   invoiceCount
  // }
  createUploadHistoryAndRows: async (history, rows, transaction) => {
    if (Object.keys(history).length === 0) return null
    if (!transaction) return null
    try {
      // pdfInvoiceHistory テーブルにレコード挿入
      const createdHistory = await pdfInvoiceHistory.create(history, { transaction })

      // pdfInvoiceHistoryDetail テーブルにレコード挿入
      await Promise.all(
        rows.map(async (row) => {
          return pdfInvoiceHistoryDetail.create(row, { transaction })
        })
      )

      return createdHistory
    } catch (error) {
      logger.info(error)
      return error
    }
  },
  updateCount: async ({ historyId, successCount, failCount, skipCount, invoiceCount }) => {
    const functionName = 'pdfInvoiceHistoryController.updateCount'
    logger.info(`${constantsDefine.logMessage.INF000}${functionName}`)
    let result
    try {
      result = await pdfInvoiceHistory.update(
        {
          successCount: successCount,
          failCount: failCount,
          skipCount: skipCount,
          invoiceCount: invoiceCount
        },
        {
          where: {
            historyId: historyId
          }
        }
      )
    } catch (error) {
      logger.error({ historyId: historyId, stack: error.stack, status: 0 })
      result = error
    }
    logger.info(`${constantsDefine.logMessage.INF001}${functionName}`)
    return result
  },
  findforTenant: async (tenantId) => {
    const functionName = 'pdfInvoiceHistoryController.findforTenant'
    let result
    const now = new Date()
    const beforeOneYear = new Date(`${now.getFullYear() - 1}-${now.getMonth() + 1}-${now.getDate()}`)
    logger.info(`${constantsDefine.logMessage.INF000}${functionName}`)
    try {
      result = await pdfInvoiceHistory.findAll({
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
