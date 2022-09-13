const db = require('../models')
const logger = require('../lib/logger')
const invoiceController = require('./invoiceController')
const InvoiceDetail = db.InvoiceDetail
const constantsDefine = require('../constants')

module.exports = {
  /**
   * 請求書明細アップロード取得
   * @param {uuid} invoicesId 請求書アップロード番号
   * @returns {InvoiceDetail} 請求書明細アップロード（正常）、Error（DBエラー、システムエラーなど）
   */
  findInvoiceDetail: async (invoicesId) => {
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
  },
  /**
   * 請求書明細アップロード登録
   * @param {object} values 請求書明細アップロード情報
   * @returns {InvoiceDetail} 請求書明細アップロード（正常）、Error（DBエラー、システムエラーなど）
   */
  insert: async (values) => {
    const functionName = 'invoiceDetailController.insert'
    logger.info(`${constantsDefine.logMessage.INF000}${functionName}`)
    const invoicesId = values?.invoicesId

    if (!invoicesId) {
      logger.error(`${constantsDefine.logMessage.CMMERR000}${functionName}`)
      return
    }
    const invoiceRow = await invoiceController.findInvoice(invoicesId)

    if (!invoiceRow?.dataValues.invoicesId) {
      logger.info(`${constantsDefine.logMessage.DBINF000}${functionName}`)
      return
    }

    let resultToInsertInvoiceDetail

    try {
      resultToInsertInvoiceDetail = await InvoiceDetail.create({
        ...values,
        invoicesId: invoiceRow?.dataValues.invoicesId
      })
    } catch (error) {
      logger.error(
        {
          values: {
            ...values,
            invoicesId: invoiceRow?.dataValues.invoicesId
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
}
