const db = require('../models')
const logger = require('../lib/logger')
const DepartmentCode = db.DepartmentCode
const constantsDefine = require('../constants')
const { v4: uuidV4 } = require('uuid')
const Op = db.Sequelize.Op

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
  },
  // 部門データの変更
  // contractId:         契約番号
  // departmentCodeId:   部門データキー
  // departmentCode：    部門コード
  // departmentCodeName: 部門名
  // 戻り値：0（正常変更）、1（変更なし）、-1（重複部門データの場合）、Error（DBエラー、システムエラーなど）、-2（部門データ検索失敗）
  updatedDepartmentCode: async function (contractId, departmentCodeId, departmentCode, departmentCodeName) {
    let duplicatedFlag = false
    try {
      // 変更対象の部門データを検索
      const departmentCodeRecord = await DepartmentCode.findOne({
        where: {
          contractId,
          departmentCodeId
        }
      })
      // 重複コード検索
      const duplicatedDepartmentCodeRecord = await DepartmentCode.findAll({
        where: {
          [Op.and]: [
            {
              contractId: contractId
            },
            { departmentCode: departmentCode },
            {
              departmentCodeId: {
                [Op.ne]: departmentCodeId
              }
            }
          ]
        }
      })
      // 取得したデータから大小文字区別して重複チェック
      duplicatedDepartmentCodeRecord.forEach((item) => {
        if (item.departmentCode === departmentCode) {
          duplicatedFlag = true
        }
      })

      if (duplicatedFlag) {
        return -1
      }

      if (departmentCodeRecord === null) {
        return -2
      }

      // 変更の値を入れる
      departmentCodeRecord.departmentCode = departmentCode
      departmentCodeRecord.departmentCodeName = departmentCodeName

      // データ変更がある場合、DB保存する
      if (departmentCodeRecord._changed.size > 0) {
        await departmentCodeRecord.save()
        return 0
        // データ変更がない場合、1を返して
      } else {
        return 1
      }
    } catch (error) {
      logger.error({ contractId: contractId, departmentCodeId: departmentCodeId, stack: error.stack, status: 0 })
      return error
    }
  },
  // 部門データ検索
  // 使用者から受けた、部門コードや部門名で部門データを検索する。
  searchDepartmentCode: async (contractId, departmentCode, departmentCodeName) => {
    try {
      let userCustomizeWhere
      // 検索キーがない場合、全部検索
      if (departmentCode.length !== 0 && departmentCodeName.length !== 0) {
        userCustomizeWhere = {
          contractId: contractId,
          [Op.or]: [
            {
              departmentCode: {
                [Op.like]: `%${departmentCode}%`
              }
            },
            {
              departmentCodeName: {
                [Op.like]: `%${departmentCodeName}%`
              }
            }
          ]
        }
        // 検索キーが部門コードのみの場合
      } else if (departmentCode.length !== 0 && departmentCodeName.length === 0) {
        userCustomizeWhere = {
          contractId: contractId,
          [Op.or]: [
            {
              departmentCode: {
                [Op.like]: `%${departmentCode}%`
              }
            }
          ]
        }
        // 検索キーが部門名のみの場合
      } else if (departmentCode.length === 0 && departmentCodeName.length !== 0) {
        userCustomizeWhere = {
          contractId: contractId,
          [Op.or]: [
            {
              departmentCodeName: {
                [Op.like]: `%${departmentCodeName}%`
              }
            }
          ]
        }
      } else {
        userCustomizeWhere = {
          contractId: contractId
        }
      }
      // 検索
      const result = await DepartmentCode.findAll({
        where: userCustomizeWhere
      })
      // 部門コードで昇順整列する。
      result.sort((next, prev) => {
        return next.departmentCode - prev.departmentCode
      })
      // 検索結果を画面表示するため、加工
      return result.map((item) => {
        return {
          departmentCodeId: item.departmentCodeId,
          departmentCode: item.departmentCode,
          departmentCodeName: item.departmentCodeName
        }
      })
    } catch (error) {
      logger.error({
        contractId: contractId,
        departmentCode: departmentCode,
        departmentCodeName: departmentCodeName,
        stack: error.stack,
        status: 0
      })
      return error
    }
  },
  // 部門データ削除
  deleteForDepartmentCode: async (departmentCodeId) => {
    try {
      // 部門データを検索
      const deleteTargetDepartmentCode = await DepartmentCode.findOne({
        where: {
          departmentCodeId: departmentCodeId
        }
      })

      // null：既に削除されたレコード
      if (deleteTargetDepartmentCode === null) return -1

      // 部門データ削除
      logger.info(`${deleteTargetDepartmentCode.departmentCodeId}のデータの削除処理を開始します。`)
      await deleteTargetDepartmentCode.destroy()
      logger.info(`${deleteTargetDepartmentCode.departmentCodeId}のデータの削除処理を終了します。`)

      return 1
    } catch (error) {
      logger.error(error)
      return 0
    }
  },
  checkDataForDepartmentCode: async (departmentCodeId) => {
    try {
      // 部門データを検索
      const deleteTargetDepartmentCode = await DepartmentCode.findOne({
        where: {
          departmentCodeId: departmentCodeId
        }
      })

      // nullの場合、既に削除されたと想定する。
      if (deleteTargetDepartmentCode === null) return -1

      // null以外の場合、正常想定
      return 1
    } catch (error) {
      logger.error(error)
      return 0
    }
  }
}
