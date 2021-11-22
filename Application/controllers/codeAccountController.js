const db = require('../models')
const logger = require('../lib/logger')
const CodeAccount = db.CodeAccount
const constantsDefine = require('../constants')
const { v4: uuidV4 } = require('uuid')
module.exports = {
  // CodeAccountカラム
  //   codeAccountId(PK) - PK
  //   contractId(FK)=>Contracts(contractIdId) - 契約ID,
  //   subjectCode - 勘定科目コード,
  //   subjectName - 勘定科目名,
  //   createdAt - 作成日付,
  //   updatedAt - 更新日付,
  insert: async (contract, values) => {
    const functionName = 'codeAccountController.insert'
    // 関数開始表示
    logger.info(`${constantsDefine.logMessage.INF000}${functionName}`)
    const uploadContractId = contract.contractId
    try {
      let duplicatedFlag = false

      // 重複コード検索
      const resultSearch = await CodeAccount.findAll({
        where: {
          subjectCode: values.subjectCode,
          contractId: uploadContractId
        }
      })

      // 重複コード検索（sequelize大小文字区別しないため）
      resultSearch.forEach((item) => {
        if (item.subjectCode === values.subjectCode) {
          duplicatedFlag = true
        }
      })

      // 重複コードある場合、登録拒否処理
      if (duplicatedFlag) {
        return false
      }

      // 重複コードない場合DBに保存する。
      const resultToInsertCodeAccount = await CodeAccount.create({
        ...values,
        contractId: uploadContractId,
        codeAccountId: uuidV4()
      })

      // 関数終了表示
      logger.info(`${constantsDefine.logMessage.INF001}${functionName}`)

      // DB保存失敗したらモデルCodeAccountインスタンスではない
      if (resultToInsertCodeAccount instanceof CodeAccount) {
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
