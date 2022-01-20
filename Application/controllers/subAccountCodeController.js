const db = require('../models')
const logger = require('../lib/logger')
const AccountCode = db.AccountCode
const SubAccountCode = db.SubAccountCode
const subAccountCodeModel = require('../models').SubAccountCode
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
    const functionName = 'SubAccountCodeController.insert'
    const uploadContractId = contract.contractId
    // 関数開始表示
    logger.info(`${constantsDefine.logMessage.INF000}${functionName}`)
    try {
      let duplicatedFlag = false
      // accountCodeId取得
      const accountCodeSearchResult = await AccountCode.findOne({
        where: {
          contractId: uploadContractId,
          accountCodeId: values.accountCodeId
        }
      })
      if (accountCodeSearchResult === null) {
        return -1
      }
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
  },
  // 取得したデータを画面に表示するデータに加工
  // 加工物
  // {
  //    no：               補助科目の順番
  //    subAccountCodeId： 補助科目のユニークID
  //    subjectCode：      補助科目コード
  //    subjectName：      補助科目名
  //    accountCodeName：  紐づいている勘定科目の名
  // }
  getSubAccountCodeList: async (contract) => {
    try {
      const accountCodeNameArr = await subAccountCodeModel.getsubAccountCodeList(contract)

      // 出力用データに加工する。
      return accountCodeNameArr.map((item, idx) => {
        return {
          no: idx + 1,
          subjectCode: item.subjectCode,
          subjectName: item.subjectName,
          accountCodeName: item.accountCodeName,
          subAccountCodeId: item.subAccountCodeId
        }
      })
    } catch (error) {
      logger.error({ stack: error.stack, status: 0 })
      return error
    }
  },
  getSubAccountCode: async (contractId, subAccountCodeId) => {
    logger.info(constantsDefine.logMessage.INF000 + 'subAccountCodeController.getSubAccountCode')
    try {
      // 契約番号と補助科目IDでデータを取得（OUTER JOIN）
      const targetAccountCodeSubAccountCodeJoin = await AccountCode.findAll({
        raw: true,
        include: [
          {
            model: SubAccountCode,
            attributes: ['subAccountCodeId', 'subjectCode', 'subjectName'],
            where: {
              subAccountCodeId: subAccountCodeId
            }
          }
        ],
        where: {
          contractId: contractId
        }
      })
      // 検索検索がない場合nullを返却
      if (targetAccountCodeSubAccountCodeJoin.length === 0) {
        logger.info(constantsDefine.logMessage.INF001 + 'subAccountCodeController.getSubAccountCode')
        return null
      }
      // 検索結果出力
      return {
        subAccountCodeId: targetAccountCodeSubAccountCodeJoin[0]['SubAccountCodes.subAccountCodeId'],
        accountCodeId: targetAccountCodeSubAccountCodeJoin[0].accountCodeId,
        accountCode: targetAccountCodeSubAccountCodeJoin[0].accountCode,
        accountCodeName: targetAccountCodeSubAccountCodeJoin[0].accountCodeName,
        subjectName: targetAccountCodeSubAccountCodeJoin[0]['SubAccountCodes.subjectName'],
        subjectCode: targetAccountCodeSubAccountCodeJoin[0]['SubAccountCodes.subjectCode']
      }
    } catch (error) {
      logger.error({ contractId: contractId, stack: error.stack, status: 0 })
      logger.info(constantsDefine.logMessage.INF001 + 'subAccountCodeController.getSubAccountCode')
      return error
    }
  },
  updateSubAccountCode: async function (contractId, accountCodeId, subAccountCodeId, subjectCode, subAccountCodeName) {
    logger.info(constantsDefine.logMessage.INF000 + 'subAccountCodeController.updateSubAccountCode')
    try {
      const updateTarget = await this.checkAndLockSubAccountCode(
        contractId,
        accountCodeId,
        subAccountCodeId,
        subjectCode,
        subAccountCodeName
      )
      logger.info(constantsDefine.logMessage.INF001 + 'subAccountCodeController.updateSubAccountCode')
      // 戻り値：0（正常変更）、1（変更なし）、-1（重複補助科目コードの場合）、Error（DBエラー、システムエラーなど）、-2（補助科目検索失敗）、その他（他のデータエラー）
      switch (updateTarget) {
        case 0:
          return 0
        case 1:
          return 1
        case -1:
          return -1
        case -2:
          return -2
        default:
          return updateTarget
      }
    } catch (error) {
      logger.error({ contractId: contractId, stack: error.stack, status: 0 })
      logger.info(constantsDefine.logMessage.INF001 + 'subAccountCodeController.updateSubAccountCode')
      return error
    }
  },
  // 補助科目コードをチェック・変更する。
  // {
  //    contractId: 契約番号
  //    accountCodeId: 勘定科目コードキー
  //    subAccountCodeId： 補助科目のユニークID
  //    subjectCode：      補助科目コード
  //    subjectName：      補助科目名
  // }
  checkAndLockSubAccountCode: async function (
    contractId,
    accountCodeId,
    subAccountCodeId,
    subjectCode,
    subjectCodeName
  ) {
    logger.info(constantsDefine.logMessage.INF000 + 'subAccountCodeController.checkAndLockSubAccountCode')
    try {
      const motoSubAccountCode = await this.getSubAccountCode(contractId, subAccountCodeId)
      // 補助科目の親の勘定科目の有無のチェック
      switch (motoSubAccountCode !== null && !(motoSubAccountCode instanceof Error)) {
        case true:
          break
        default:
          return -3
      }
      const getUpdateTarget = await SubAccountCode.findOne({
        where: {
          subAccountCodeId: subAccountCodeId
        }
      })

      // 補助科目の有無のチェック
      switch (getUpdateTarget instanceof SubAccountCode) {
        case true:
          break
        default:
          return -2
      }

      // 重複チェック
      let duplicatedFlag = false
      const Op = db.Sequelize.Op
      const getSubAccountCodeList = await await AccountCode.findAll({
        raw: true,
        include: [
          {
            model: SubAccountCode,
            attributes: ['subAccountCodeId', 'subjectCode', 'subjectName'],
            where: {
              subAccountCodeId: {
                [Op.ne]: [subAccountCodeId]
              }
            }
          }
        ],
        where: {
          contractId: contractId
        }
      })
      let idx = 0
      while (getSubAccountCodeList[idx]) {
        if (
          getSubAccountCodeList[idx]['SubAccountCodes.subjectCode'] === subjectCode &&
          getSubAccountCodeList[idx].accountCodeId === accountCodeId
        ) {
          duplicatedFlag = true
        }
        idx++
      }
      if (duplicatedFlag) {
        return -1
      }

      // 変更する補助科目のデータ変更
      getUpdateTarget.subjectCode = subjectCode
      getUpdateTarget.subjectName = subjectCodeName
      getUpdateTarget.accountCodeId = accountCodeId

      // 変更内容がない場合終了
      if (getUpdateTarget._changed.size === 0) {
        return 1
      }

      // 変更がある場合、保存後、コミット実施
      getUpdateTarget.save()
      logger.info(constantsDefine.logMessage.INF001 + 'subAccountCodeController.checkAndLockSubAccountCode')
      return 0
    } catch (error) {
      logger.error({ contractId: contractId, stack: error.stack, status: 0 })
      logger.info(constantsDefine.logMessage.INF001 + 'subAccountCodeController.checkAndLockSubAccountCode')
      // 途中エラーが発生したら、ロールバック
      return error
    }
  },
  // 補助科目削除
  deleteForSubAccountCode: async (subAccountCodeId) => {
    try {
      // 補助科目を検索
      const deleteTargetSubAccountCode = await SubAccountCode.findOne({
        where: {
          subAccountCodeId: subAccountCodeId
        }
      })

      // null：既に削除されたレコード
      if (deleteTargetSubAccountCode === null) return -1

      // 補助科目削除
      logger.info(`${deleteTargetSubAccountCode.subAccountCodeId}のデータの削除処理を開始します。`)
      await deleteTargetSubAccountCode.destroy()
      logger.info(`${deleteTargetSubAccountCode.subAccountCodeId}のデータの削除処理を終了します。`)

      return 1
    } catch (error) {
      logger.error(error)
      return 0
    }
  }
}
