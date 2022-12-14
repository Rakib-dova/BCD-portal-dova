const PdfInvoice = require('../models').PdfInvoice
const PdfInvoiceLine = require('../models').PdfInvoiceLine
const PdfSealImp = require('../models').PdfSealImp
const db = require('../models')
const logger = require('../lib/logger')

module.exports = {
  findInvoice: async (invoiceId) => {
    try {
      return await PdfInvoice.findOne({
        include: [
          { model: PdfInvoiceLine },
          { model: PdfSealImp }
        ],
        where: { invoiceId: invoiceId }
      })
    } catch (error) {
      logger.error({ invoiceId: invoiceId, stack: error.stack, status: 0 }, error.name)
      throw error
    }
  },
  findAllInvoices: async (tenantId) => {
    try {
      return await PdfInvoice.findAll({
        where: { sendTenantId: tenantId },
        include: 'PdfInvoiceLines',
        order: [['updatedAt', 'DESC']]
      })
    } catch (error) {
      logger.error({ stack: error.stack, status: 0 }, error.name)
      throw error
    }
  },
  findAllRawInvoices: async (tenantId) => {
    try {
      return await PdfInvoice.findAll({ where: { sendTenantId: tenantId }, raw: true })
    } catch (error) {
      logger.error({ stack: error.stack, status: 0 }, error.name)
      throw error
    }
  },
  createInvoice: async (invoice, lines, image) => {
    try {
      // 重複コード検索
      const foundInvoices = await PdfInvoice.findAll({
        where: { invoiceId: invoice.invoiceId }
      })

      if (foundInvoices.length !== 0) return null

      const created = await db.sequelize.transaction(async (t) => {
        // PdfInvoiceテーブルにレコード挿入
        const result = await PdfInvoice.create(invoice, { transaction: t })

        await PdfSealImp.create(
          image ? { invoiceId: invoice.invoiceId, image } : { invoiceId: invoice.invoiceId },
          { transaction: t }
        )

        // PdfInvoiceLineテーブルにレコード挿入
        await Promise.all(lines.map(async (line) => {
          return await PdfInvoiceLine.create(line, { transaction: t })
        }))

        return result
      })
      return created
    } catch (error) {
      logger.error({ stack: error.stack, status: 0 }, error.name)
      throw error
    }
  },
  createInvoicesAndLines: async (invoices, lines, transaction = null) => {
    if (!Array.isArray(invoices) || !Array.isArray(lines)) return null

    try {
      // PdfInvoiceテーブルにレコード挿入
      await Promise.all(invoices.map(async (invoice) => {
        if (transaction) return await PdfInvoice.create(invoice, { transaction })
        else return await PdfInvoice.create(invoice)
      }))
      // if (transaction) createdInvoice = await PdfInvoice.create(invoice, { transaction })
      // else createdInvoice = await PdfInvoice.create(invoice)

      // PdfInvoiceLineテーブルにレコード挿入
      await Promise.all(lines.map(async (line) => {
        if (transaction) return await PdfInvoiceLine.create(line, { transaction })
        else return await PdfInvoiceLine.create(line)
      }))

      return true
    } catch (error) {
      logger.info(error)
      throw error
    }
  },
  updateInvoice: async (invoiceId, invoice, lines, image) => {
    try {
      const updated = await db.sequelize.transaction(async (t) => {
        if (invoice.invoiceId) delete invoice.invoiceId

        // PdfInvoiceテーブルのレコード更新
        const result = await PdfInvoice.update(invoice, { where: { invoiceId } }, { transaction: t })

        // 明細全削除
        await PdfInvoiceLine.destroy({
          where: { invoiceId: invoiceId },
          transaction: t
        })

        // 明細を新規作成
        await Promise.all(
          lines.map(async (line) => {
            return await PdfInvoiceLine.create(line, { transaction: t })
          })
        )

        if (image) {
          // 印影を更新
          const [sealImpRecord, created] = await PdfSealImp.findOrCreate({
            where: { invoiceId },
            defaults: { image },
            transaction: t
          })
          if (!created) {
            sealImpRecord.image = image
            sealImpRecord.save()
          }
        } else {
          console.log('====  印影の更新はなし  ==========')
        }

        return result
      })
      return updated
    } catch (error) {
      logger.error({ invoiceId: invoice.invoiceId, stack: error.stack, status: 0 }, error.name)

      throw error
    }
  },
  deleteInvoice: async (invoiceId) => {
    try {
      const deleted = await db.sequelize.transaction(async (t) => {
        await PdfSealImp.destroy({
          where: { invoiceId: invoiceId },
          transaction: t
        })
        // 削除に成功すると 1、既に削除済みだと 0 が返ってくる
        return await PdfInvoice.destroy({
          where: { invoiceId: invoiceId },
          transaction: t
        })
      })

      return deleted
    } catch (error) {
      logger.error({ invoiceId: invoiceId, stack: error.stack, status: 0 }, error.name)

      throw error
    }
  }
}
