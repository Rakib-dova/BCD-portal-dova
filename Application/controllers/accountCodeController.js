const db = require('../models')
const logger = require('../lib/logger')
const AccountCode = db.AccountCode
const constantsDefine = require('../constants')
const Sequelize = require('sequelize')
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
  },
  // 取得したデータを画面に表示するデータに加工
  // 加工物
  // {
  //    no：               勘定科目の順番
  //    accountCodeId：    勘定科目のユニークID
  //    accountCode：      勘定科目コード
  //    accountCodeName：  勘定科目名
  //    updatedAt：        勘定科目の登録時間と更新時間
  // }
  getAccountCodeList: async (contractId) => {
    try {
      const timestamp = require('../lib/utils').timestampForList
      // 契約番号により勘定科目データをDBから取得（勘定科目コードを昇順にする）
      const listAccountCode = await AccountCode.findAll({
        where: {
          contractId: contractId
        },
        order: [
          Sequelize.literal(
            'CASE WHEN (ASCII(SUBSTRING(accountCode, 1, 1)) >= 48 and ASCII(SUBSTRING(accountCode, 1, 1)) <= 57) THEN 2 ELSE 1 END, accountCode ASC'
          )
        ]
      })

      // 出力用データに加工する。
      const resultAccountCodeList = listAccountCode.map((item, idx) => {
        return {
          no: idx + 1,
          accountCodeId: item.accountCodeId,
          accountCode: item.accountCode,
          accountCodeName: item.accountCodeName,
          updatedAt: timestamp(item.updatedAt)
        }
      })
      return resultAccountCodeList
    } catch (error) {
      logger.error({ contractId: contractId, stack: error.stack, status: 0 })
      return error
    }
  },
  getAccountCode: async (contractId, accountCodeId) => {
    try {
      // 契約情報と勘定科目キーでDBのデータを検索する。
      const result = await AccountCode.findOne({
        where: {
          contractId: contractId,
          accountCodeId: accountCodeId
        }
      })
      // 検索結果オブジェクトに作成して返す
      return { accountCode: result.accountCode, accountCodeName: result.accountCodeName }
    } catch (error) {
      logger.error({ contractId: contractId, accountCodeId: accountCodeId, stack: error.stack, status: 0 })
      return error
    }
  },
  // 勘定科目コードを変更する
  // contractId: 契約番号
  // accountCodeId: 勘定科目コードキー
  // accountCode：勘定科目のコード
  // accountCodeName: 勘定科目の名
  // 戻り値：0（正常変更）、1（変更なし）、Error（DBエラー、システムエラーなど）
  updatedAccountCode: async function (contractId, accountCodeId, accountCode, accountCodeName) {
    const t = await db.sequelize.transaction()
    let duplicatedFlag = false
    try {
      // 変更対象の勘定科目コードを検索
      const accountCodeRecord = await AccountCode.findOne(
        {
          where: {
            contractId,
            accountCodeId
          }
        },
        {
          transaction: t
        },
        {
          lock: t.LOCK
        }
      )

      const duplicatedAccountCodeRecord = await AccountCode.findAll(
        {
          where: {
            contractId,
            accountCode
          }
        },
        {
          transaction: t
        }
      )
      duplicatedAccountCodeRecord.forEach((item) => {
        if (item.accountCode === accountCode) {
          duplicatedFlag = true
        }
      })

      if (duplicatedFlag) {
        return -1
      }

      // 変更の値を入れる
      accountCodeRecord.accountCode = accountCode
      accountCodeRecord.accountCodeName = accountCodeName

      // データ変更がある場合、DB保存する
      if (accountCodeRecord._changed.size > 0) {
        await accountCodeRecord.save({ transaction: t })
        await t.commit()
        return 0
        // データ変更がない場合、1を返して
      } else {
        return 1
      }
    } catch (error) {
      logger.error({ contractId: contractId, accountCodeId: accountCodeId, stack: error.stack, status: 0 })
      await t.rollback()
      return error
    }
  }
}
