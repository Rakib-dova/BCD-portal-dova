const PdfInvoice = require('../models').PdfInvoice
const PdfInvoiceDetail = require('../models').PdfInvoiceDetail

const db = require('../models')
const logger = require('../lib/logger')

module.exports = {
  findOne: async (incoiceId) => {
    try {
      return await PdfInvoice.findOne({
        where: {
          incoiceId: incoiceId
        }
      })
    } catch (error) {
      // status 0はDBエラー
      logger.error({ incoiceId: incoiceId, stack: error.stack, status: 0 }, error.name)
      return error
    }
  },
  findAll: async () => {
    try {
      return await PdfInvoice.findAll({})
    } catch (error) {
      // status 0はDBエラー
      logger.error({ stack: error.stack, status: 0 }, error.name)
      return error
    }
  },

  create: async (PdfInvoice, PdfInvoiceDetails) => {
    // データベース接続回りはtry-catch
    try {
      /* トランザクション */
      const created = await db.sequelize.transaction(async (t) => {
        // PdfInvoiceテーブル
        const result = await PdfInvoice.findOrCreate(PdfInvoice, {
          where: { incoiceId: PdfInvoice.incoiceId },
          transaction: t
        })

        // PdfInvoiceDetailテーブル
        for (const detail in PdfInvoiceDetails) {
          await PdfInvoice.findOrCreate(detail, {
            where: { incoiceId: detail.incoiceId },
            transaction: t
          })
        }
        return result
      })
      return created
    } catch (error) {
      // status 0はDBエラー
      logger.error({ incoiceId: PdfInvoice.incoiceId, stack: error.stack, status: 0 }, error.name)
      return error
    }
  },

  update: async (values) => {
    try {
      return await PdfInvoice.update(values, {
        where: {
          incoiceId: values.incoiceId
        }
      })
    } catch (error) {
      logger.error({ incoiceId: values.incoiceId, stack: error.stack, status: 0 }, error.name)
      return error
    }
  },

  delete: async (incoiceId) => {
    // データベース接続回りはtry-catch
    try {
      const deleted = await db.sequelize.transaction(async (t) => {
        await PdfInvoiceDetail.destroy({
          where: { incoiceId: incoiceId }
        })

        const destroy = await PdfInvoice.destroy({
          where: { incoiceId: incoiceId }
        })

        return destroy
      })

      return deleted
    } catch (error) {
      // status 0はDBエラー
      logger.error({ incoiceId: incoiceId, stack: error.stack, status: 0 }, error.name)
      return error
    }
  }
}
