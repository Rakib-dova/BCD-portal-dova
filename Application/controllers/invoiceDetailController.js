const db = require('../models')
const logger = require('../lib/logger')
const InvoiceDetail = db.InvoiceDetail
const constantsDefine = require('../constants')

// パラメータ値
// values = {
//   invoicesDetailId(PK),
//   invoicesId(FK)=>Invoices(invoicesId),
//   lines,
//   invoiceId(請求書番号),
//   status,
//   errorData,
//   createdAt,
//   updatedAt
// }
const findInvoiceDetail = async (invoicesId) => {
  const functionName = 'invoiceDetailController.findInvoiceDetail'
  logger.info(`${constantsDefine.logMessage.INF000}${functionName}`)
  let InvoiceResultDetail
  try {
    InvoiceResultDetail = await InvoiceDetail.findAll({
      where: {
        invoicesId: invoicesId
      },
      order: [['lines', 'ASC']]
    })
  } catch (error) {
    logger.error({ invoicesId: invoicesId, stack: error.stack, status: 0 })
  }
  logger.info(`${constantsDefine.logMessage.INF001}${functionName}`)
  return InvoiceResultDetail
}

/**
 * アプロード詳細情報の一括登録
 * @param {Object[]} invoiceDetails アプロード詳細情報配列
 * @param {string} invoiceDetails[].invoicesDetailId 請求書詳細UUID
 * @param {string} invoiceDetails[].invoicesId 請求書UUID
 * @param {string} invoiceDetails[].invoiceId 請求書番号
 * @param {string} invoiceDetails[].lines 行
 * @param {string} invoiceDetails[].status ステータス
 * @param {string} invoiceDetails[].errorData エラー情報
 * @returns
 */
const insertAll = async (invoiceDetails) => {
  const functionName = 'invoiceDetailController.insertAll'
  logger.info(`${constantsDefine.logMessage.INF000}${functionName}`)

  let resultToInsertInvoiceDetail

  try {
    resultToInsertInvoiceDetail = await InvoiceDetail.bulkCreate(invoiceDetails)
  } catch (error) {
    logger.error(
      {
        values: {
          invoiceDetails
        },
        stack: error.stack,
        status: 0
      },
      error.name
    )
  }

  logger.info(`${constantsDefine.logMessage.INF001}${functionName}`)
  return resultToInsertInvoiceDetail
}

module.exports = {
  findInvoiceDetail: findInvoiceDetail,
  insertAll: insertAll
}
