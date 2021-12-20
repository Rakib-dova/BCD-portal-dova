const db = require('../models')
const logger = require('../lib/logger')
const AccountCode = db.AccountCode
const constantsDefine = require('../constants')
const { v4: uuidV4 } = require('uuid')
const Op = db.Sequelize.Op
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
        order: [['accountCode', 'ASC']]
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
  // 戻り値：0（正常変更）、1（変更なし）、-1（重複勘定科目コードの場合）、Error（DBエラー、システムエラーなど）、-2（勘定科目検索失敗）
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
      // 重複コード検索
      const duplicatedAccountCodeRecord = await AccountCode.findAll(
        {
          where: {
            [Op.and]: [
              {
                contractId: contractId
              },
              { accountCode: accountCode },
              {
                accountCodeId: {
                  [Op.ne]: accountCodeId
                }
              }
            ]
          }
        },
        {
          transaction: t
        }
      )
      // 取得したデータから大小文字区別して重複チェック
      duplicatedAccountCodeRecord.forEach((item) => {
        if (item.accountCode === accountCode) {
          duplicatedFlag = true
        }
      })

      if (duplicatedFlag) {
        return -1
      }

      if (accountCodeRecord === null) {
        return -2
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
  },
  // 勘定科目検索
  // 使用者から受けた、勘定科目コードや勘定科目名で勘定科目を検索する。
  searchAccountCode: async (contractId, accountCode, accountCodeName) => {
    try {
      let userCustomizeWhere
      // 検索キーがない場合、全部検索
      if (accountCode.length !== 0 && accountCodeName.length !== 0) {
        userCustomizeWhere = {
          contractId: contractId,
          [Op.or]: [
            {
              accountCode: {
                [Op.like]: `%${accountCode}%`
              }
            },
            {
              accountCodeName: {
                [Op.like]: `%${accountCodeName}%`
              }
            }
          ]
        }
        // 検索キーが勘定科目コードのみの場合
      } else if (accountCode.length !== 0 && accountCodeName.length === 0) {
        userCustomizeWhere = {
          contractId: contractId,
          [Op.or]: [
            {
              accountCode: {
                [Op.like]: `%${accountCode}%`
              }
            }
          ]
        }
        // 検索キーが勘定科目名のみの場合
      } else if (accountCode.length === 0 && accountCodeName.length !== 0) {
        userCustomizeWhere = {
          contractId: contractId,
          [Op.or]: [
            {
              accountCodeName: {
                [Op.like]: `%${accountCodeName}%`
              }
            }
          ]
        }
      }
      // 検索
      const result = await AccountCode.findAll({
        where: userCustomizeWhere
      })
      // 勘定科目コードで昇順整列する。
      result.sort((next, prev) => {
        return next.accountCode - prev.accountCode
      })
      // 検索結果を画面表示するため、加工
      return result.map((item) => {
        return {
          accountCodeId: item.accountCodeId,
          accountCode: item.accountCode,
          accountCodeName: item.accountCodeName
        }
      })
    } catch (error) {
      logger.error({
        contractId: contractId,
        accountCode: accountCode,
        accountCodeName: accountCodeName,
        stack: error.stack,
        status: 0
      })
      return error
    }
  }
}
