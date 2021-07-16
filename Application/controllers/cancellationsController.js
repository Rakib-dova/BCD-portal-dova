'use stric'

const logger = require('../lib/logger')
const Cancellations = require('../models').Cancellations
let errorStatus = '050'
const Contract = require('./contractController')
const { v4: uuidv4 } = require('uuid')

module.exports = {
  create: async (_tenantId, _cancelData) => {
    try {
      const contract = await Contract.findContract({ tenantId: _tenantId, deleteFlag: false }, 'createdAt DESC')

      const cancelId = uuidv4()
      const createdDate = new Date()

      if (contract === undefined || contract === null) {
        errorStatus = '051'
        throw new Error('ERR051 Not Founded ContractId')
      }

      const updateContract = await Contract.updateStatus(contract.dataValues.contractId, '030')

      if (updateContract === undefined || updateContract === null || updateContract === 0) {
        errorStatus = '052'
        throw new Error('ERR052 Not updated ContratStatus')
      }

      await Cancellations.create({
        cancelId: cancelId,
        contractId: contract.contractId,
        cancelData: _cancelData,
        createdAt: createdDate,
        updatedAt: createdDate
      })

      return { statuscode: 200, value: 'success' }
    } catch (error) {
      if (errorStatus === '051') {
        logger.error({ user: _tenantId, stack: error.stack, status: 0 }, error.name)
      } else if (errorStatus === '052') {
        logger.error({ user: _tenantId, stack: error.stack, status: 0 }, error.name)
      } else {
        logger.error({ user: _tenantId, stack: error.stack, status: 0 }, error.name)
      }
      return { statuscode: errorStatus, value: error }
    }
  }
}
