const db = require('../models')
const logger = require('../lib/logger')
const contractController = require('./contractController')
const CodeAccount = db.CodeAccount
const constantsDefine = require('../constants')

module.exports = {
  // パラメータ値
  // values = {
  //   uploadFormatId(PK) - フォーマットID,
  //   contractId(FK)=>Contracts(contractIdId) - 契約ID,
  //   setName - フォーマット名,
  //   uploadType - フォーマットタイプ,
  //   itemRowNo - 項目名の行番号,
  //   dataStartRowNo - データ開始行番号,
  //   createdAt - 作成日付,
  //   updatedAt - 更新日付,
  //   uploadData - アップロードファイルデータ
  //   uploadFileName - アップロードファイル名
  // }
  insert: async (_tenantId, values) => {
    const functionName = 'codeAccountController.insert'
    let contractRow
    let contractId
    let resultToInsertCodeAccount
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
      resultToInsertCodeAccount = await CodeAccount.create({
        ...values,
        contractId: contractId
      })
    } catch (error) {
      logger.error({ contractId: uploadContractId, stack: error.stack, status: 0 })
      return
    }

    logger.info(`${constantsDefine.logMessage.INF001}${functionName}`)
    return resultToInsertCodeAccount
  }
}
