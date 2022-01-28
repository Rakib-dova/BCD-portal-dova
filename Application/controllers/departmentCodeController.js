const db = require('../models')
const logger = require('../lib/logger')
const DepartmentCode = db.DepartmentCode
const constantsDefine = require('../constants')
const { v4: uuidV4 } = require('uuid')

module.exports = {
  // DepartmentCodeテーブル
  //   departmentCodeId(PK) - PK
  //   contractId(FK)=>Contracts(contractId) - 契約ID,
  //   departmentCode - 部門コード,
  //   departmentCodeName - 部門名,
  //   createdAt - 作成日付,
  //   updatedAt - 更新日付,
  insert: async (contract, values) => {
    const functionName = 'departmentCodeController.insert'
    // 関数開始表示
    logger.info(`${constantsDefine.logMessage.INF000}${functionName}`)
    const uploadContractId = contract.contractId
    try {
      let duplicatedFlag = false

      // 重複コード検索
      const resultSearch = await DepartmentCode.findAll({
        where: {
          departmentCode: values.departmentCode,
          contractId: uploadContractId
        }
      })

      // 重複コード検索（sequelize大小文字区別しないため）
      resultSearch.forEach((item) => {
        if (item.departmentCode === values.departmentCode) {
          duplicatedFlag = true
        }
      })

      // 重複コードある場合、登録拒否処理
      if (duplicatedFlag) {
        return false
      }

      // 重複コードない場合DBに保存する。
      const resultToInsertDepartmentCode = await DepartmentCode.create({
        ...values,
        contractId: uploadContractId,
        departmentCodeId: uuidV4()
      })

      // 関数終了表示
      logger.info(`${constantsDefine.logMessage.INF001}${functionName}`)

      // DB保存失敗したらモデルDepartmentCodeインスタンスではない
      if (resultToInsertDepartmentCode instanceof DepartmentCode) {
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
