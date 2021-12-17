const db = require('../models')
const logger = require('../lib/logger')
const AccountCode = db.AccountCode
const SubAccountCode = db.SubAccountCode
const constantsDefine = require('../constants')
const { v4: uuidV4 } = require('uuid')

module.exports = {
  // subAccountCodeテーブル
  //   subAccountCodeId(PK) - PK
  //   accountCodeId(FK)=>AccountCode(accountCodeId),
  //   subjectName - 補助科目コード,
  //   subjectCode - 補助科目名,
  //   createdAt - 作成日付,
  //   updatedAt - 更新日付
  insert: async (contract, values) => {
    const functionName = 'sugAccountCodeController.insert'
    const uploadContractId = contract.contractId
    // 関数開始表示
    logger.info(`${constantsDefine.logMessage.INF000}${functionName}`)
    try {
      let duplicatedFlag = false
      // accountCodeId取得
      const accountCodeSearchResult = await AccountCode.findOne({
        where: {
          contractId: uploadContractId,
          accountCode: values.accountCode
        }
      })
      const accountCodeId = accountCodeSearchResult.accountCodeId
      // 重複コード検索
      const resultSearch = await SubAccountCode.findAll({
        where: {
          subjectCode: values.subjectCode,
          accountCodeId: accountCodeId
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
        return 1
      }
      // 重複コードない場合DBに保存する。
      const resultToInsertSubAccountCode = await SubAccountCode.create({
        accountCodeId: accountCodeId,
        subjectName: values.subjectName,
        subjectCode: values.subjectCode,
        subAccountCodeId: uuidV4()
      })

      // 関数終了表示
      logger.info(`${constantsDefine.logMessage.INF001}${functionName}`)
      // DB保存失敗したらモデルAccountCodeインスタンスではない
      if (resultToInsertSubAccountCode instanceof SubAccountCode) {
        return 0
      } else {
        return -1
      }
    } catch (error) {
      // DBエラー発生したら処理
      logger.error({ accountCodeId: values.accountCodeId, stack: error.stack, status: 0 })
      return error
    }
  }
}
