'use stric'
const logger = require('../lib/logger')
const db = require('../models')
const Op = db.Sequelize.Op
const requestApproval = db.RequestApproval

/**
 * 承認依頼取得
 * @param {uuid} contractId 契約番号
 * @param {uuid} documentId 請求書のトレードシフトID
 * @returns {RequestApproval} 承認依頼（正常）、Error（DBエラー、システムエラーなど）
 */
const findOneRequestApproval = async (contractId, documentId) => {
  try {
    return await requestApproval.findOne({
      where: {
        contractId: contractId,
        invoiceId: documentId,
        rejectedFlag: {
          [Op.ne]: true
        }
      },
      order: [['create', 'DESC']]
    })
  } catch (error) {
    logger.error({ contractId: contractId, invoiceId: documentId, stack: error.stack, status: 0 }, error.name)
    return error
  }
}

module.exports = {
  findOneRequestApproval: findOneRequestApproval
}
