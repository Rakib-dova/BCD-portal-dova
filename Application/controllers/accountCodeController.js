const db = require('../models')
const logger = require('../lib/logger')
const AccountCode = db.AccountCode
const constantsDefine = require('../constants')
const { v4: uuidV4 } = require('uuid')
module.exports = {
  // accountCodeテーブル
  //   accountCodeId(PK) - PK
  //   contractId(FK)=>Contracts(contractId) - 契約ID,
  //   accountCode - 勘定科目コード,
  //   accountCodeName - 勘定科目名,
  //   createdAt - 作成日付,
  //   updatedAt - 更新日付,
  insert: async (contract, values) => {
    const functionName = 'accountCodeController.insert'
    // 関数開始表示
    logger.info(`${constantsDefine.logMessage.INF000}${functionName}`)
    const uploadContractId = contract.contractId
    try {
      let duplicatedFlag = false

      // 重複コード検索
      const resultSearch = await AccountCode.findAll({
        where: {
          accountCode: values.accountCode,
          contractId: uploadContractId
        }
      })

      // 重複コード検索（sequelize大小文字区別しないため）
      resultSearch.forEach((item) => {
        if (item.accountCode === values.accountCode) {
          duplicatedFlag = true
        }
      })

      // 重複コードある場合、登録拒否処理
      if (duplicatedFlag) {
        return false
      }

      // 重複コードない場合DBに保存する。
      const resultToInsertAccountCode = await AccountCode.create({
        ...values,
        contractId: uploadContractId,
        accountCodeId: uuidV4()
      })

      // 関数終了表示
      logger.info(`${constantsDefine.logMessage.INF001}${functionName}`)

      // DB保存失敗したらモデルAccountCodeインスタンスではない
      if (resultToInsertAccountCode instanceof AccountCode) {
        return true
      } else {
        return false
      }
    } catch (error) {
      // DBエラー発生したら処理
      logger.error({ contractId: uploadContractId, stack: error.stack, status: 0 })
      return error
    }
  }
}
