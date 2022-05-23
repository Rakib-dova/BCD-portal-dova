const PdfInvoiceUpload = require('../models').PdfInvoiceUpload
const PdfInvoiceLine = require('../models').PdfInvoiceLine
const PdfSealImp = require('../models').PdfSealImp
const db = require('../models')
const logger = require('../lib/logger')

module.exports = {
  insert: async (values) => {
    try {
      const result = await PdfInvoiceUpload.create({
        ...values
      })
      return result
    } catch (error) {
      logger.error({ tenantId: values.tenantId, stack: error.stack, status: 0 })
      return error
    }
  },
  updateCount: async ({ invoiceUploadId, successCount, failCount, skipCount, invoiceCount }) => {
    try {
      const result = await PdfInvoiceUpload.update(
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
      return result
    } catch (error) {
      logger.error({ invoiceUploadId: invoiceUploadId, stack: error.stack, status: 0 })
      return error
    }
  }
}
