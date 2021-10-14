const db = require('../models')
const logger = require('../lib/logger')
const contractController = require('./contractController')
const Upload = db.UploadFormat
const constantsDefine = require('../constants')

module.exports = {
  // パラメータ値
  // values = {
  //   uploadFormatId(PK),
  //   contractId(FK)=>Contracts(contractIdId),
  //   setName,
  //   uploadType,
  //   itemRowNo,
  //   dataStartRowNo,
  //   createdAt,
  //   updatedAt
  // }
  insert: async (_tenantId, values) => {
    const functionName = 'uploadFormatController.insert'
    let contractRow
    let contractId
    let resultToInsertUpload
    logger.info(`${constantsDefine.logMessage.INF000}${functionName}`)

    const uploadContractId = values?.contractId
    if (!uploadContractId) {
      logger.error(`${constantsDefine.logMessage.CMMERR000}${functionName}`)
      return
    }

    try {
      contractRow = await contractController.findContract({ tenantId: _tenantId, deleteFlag: false }, 'createdAt DESC')
      contractId = contractRow?.dataValues?.contractId
    } catch (error) {
      logger.error({ contractId: uploadContractId, stack: error.stack, status: 0 })
      return
    }

    if (!contractId || contractId !== uploadContractId) {
      logger.info(`${constantsDefine.logMessage.DBINF000}${functionName}`)
      return
    }

    try {
      resultToInsertUpload = await Upload.create({
        ...values,
        contractId: contractId
      })
    } catch (error) {
      logger.error({ contractId: uploadContractId, stack: error.stack, status: 0 })
      return
    }

    logger.info(`${constantsDefine.logMessage.INF001}${functionName}`)
    return resultToInsertUpload
  },
  findUploadFormat: async (uploadFormatId) => {
    const functionName = 'uploadFormatController.findUploadFormat'
    logger.info(`${constantsDefine.logMessage.INF000}${functionName}`)
    let uploadFormat
    try {
      uploadFormat = await Upload.findOne({
        where: {
          uploadFormatId: uploadFormatId
        }
      })
    } catch (error) {
      logger.error({ uploadFormatId: uploadFormatId, stack: error.stack, status: 0 })
    }
    logger.info(`${constantsDefine.logMessage.INF001}${functionName}`)
    return uploadFormat
  },
  findByContractId: async (contractId) => {
    try {
      return await Upload.findAll({
        where: {
          contractId: contractId
        }
      })
    } catch (error) {
      // status 0はDBエラー
      logger.error({ contractId: contractId, stack: error.stack, status: 0 }, error.name)
      return error
    }
  }
}
