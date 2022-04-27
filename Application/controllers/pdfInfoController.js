const PdfInfo = require('../models').PdfInfo
const PdfInfoDetail = require('../models').PdfInfoDetail

const db = require('../models')
const logger = require('../lib/logger')

module.exports = {
  findOne: async (incoiceId) => {
    try {
      return await PdfInfo.findOne({
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
      return await PdfInfo.findAll({})
    } catch (error) {
      // status 0はDBエラー
      logger.error({ stack: error.stack, status: 0 }, error.name)
      return error
    }
  },

  create: async (pdfInfo, pdfInfoDetails) => {
    // データベース接続回りはtry-catch
    try {
      /* トランザクション */
      const created = await db.sequelize.transaction(async (t) => {
        // PdfInfoテーブル
        const result = await PdfInfo.findOrCreate(pdfInfo, {
          where: { incoiceId: pdfInfo.incoiceId },
          transaction: t
        })

        // PdfInfoDetailテーブル
        for (const detail in pdfInfoDetails) {
          await PdfInfo.findOrCreate(detail, {
            where: { incoiceId: detail.incoiceId },
            transaction: t
          })
        }
        return result
      })
      return created
    } catch (error) {
      // status 0はDBエラー
      logger.error({ incoiceId: pdfInfo.incoiceId, stack: error.stack, status: 0 }, error.name)
      return error
    }
  },

  update: async (values) => {
    try {
      return await PdfInfo.update(values, {
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
        await PdfInfoDetail.destroy({
          where: { incoiceId: incoiceId }
        })

        const destroy = await PdfInfo.destroy({
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
