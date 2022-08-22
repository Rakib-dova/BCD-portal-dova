'use stric'
const logger = require('../lib/logger')
const db = require('../models')
const Op = db.Sequelize.Op
const requestApproval = db.RequestApproval

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
