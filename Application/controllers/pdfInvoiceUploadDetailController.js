const db = require('../models')
const logger = require('../lib/logger')
const pdfInvoiceUploadDetail = db.pdfInvoiceUploadDetail

module.exports = {
  // パラメータ値
  // values{
  //   invoiceUploadDetailId,
  //   invoiceUploadId,
  //   lines,
  //   invoiceId,
  //   status,
  //   errorData,
  //   createdAt,
  //   updatedAt
  // }

  create: async (values) => {
    let resultToInsertInvoiceDetail

    try {
      resultToInsertInvoiceDetail = await pdfInvoiceUploadDetail.create({
        ...values
      })
    } catch (error) {
      logger.error(
        {
          values: {
            ...values
          },
          stack: error.stack,
          status: 0
        },
        error.name
      )
    }
    return resultToInsertInvoiceDetail
  }
}
