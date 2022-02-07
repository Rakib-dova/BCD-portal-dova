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
  },
  // 取得したデータを画面に表示するデータに加工
  // 加工物
  // {
  //    no：                  部門データの順番
  //    departmentCodeId：    部門データのユニークID
  //    departmentCode：      部門コード
  //    departmentCodeName：  部門名
  //    updatedAt：           部門データの登録時間と更新時間
  // }
  getDepartmentCodeList: async (contractId) => {
    try {
      const timestamp = require('../lib/utils').timestampForList
      // 契約番号により部門データをDBから取得（部門コードを昇順にする）
      const listDepartmentCode = await DepartmentCode.findAll({
        where: {
          contractId: contractId
        },
        order: [['departmentCode', 'ASC']]
      })

      // 出力用データに加工する。
      const resultDeparmentCodeList = listDepartmentCode.map((item, idx) => {
        return {
          no: idx + 1,
          departmentCodeId: item.departmentCodeId,
          departmentCode: item.departmentCode,
          departmentCodeName: item.departmentCodeName,
          updatedAt: timestamp(item.updatedAt)
        }
      })
      return resultDeparmentCodeList
    } catch (error) {
      logger.error({ contractId: contractId, stack: error.stack, status: 0 })
      return error
    }
  },
  getDepartmentCode: async (contractId, departmentCodeId) => {
    try {
      // 契約情報と部門データキーでDBのデータを検索する。
      const result = await DepartmentCode.findOne({
        where: {
          contractId: contractId,
          departmentCodeId: departmentCodeId
        }
      })
      // 検索結果オブジェクトに作成して返す
      return { departmentCode: result.departmentCode, departmentCodeName: result.departmentCodeName }
    } catch (error) {
      logger.error({ contractId: contractId, departmentCodeId: departmentCodeId, stack: error.stack, status: 0 })
      return error
    }
  }
}
