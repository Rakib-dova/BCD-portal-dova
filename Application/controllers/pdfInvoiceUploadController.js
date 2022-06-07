const pdfInvoiceUpload = require('../models').PdfInvoiceUpload
const pdfInvoiceUploadDetail = require('../models').PdfInvoiceUploadDetail
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
  createUploadHistoryAndRows: async (history, rows, transaction) => {
    if (Object.keys(history).length === 0) return null
    if (!transaction) return null
    try {
      // pdfInvoiceUpload テーブルにレコード挿入
      const createdHistory = await pdfInvoiceUpload.create(history, { transaction })

      // pdfInvoiceUploadDetail テーブルにレコード挿入
      await Promise.all(
        rows.map(async (row) => {
          return pdfInvoiceUploadDetail.create(row, { transaction })
        })
      )

      return createdHistory
    } catch (error) {
      logger.info(error)
      return error
    }
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
