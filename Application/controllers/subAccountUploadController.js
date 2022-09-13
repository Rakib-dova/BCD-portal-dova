const fs = require('fs')
const path = require('path')
const basicHeaderCsvPath = path.resolve('./public/html/補助科目一括作成フォーマット.csv')
const logger = require('../lib/logger')
const constantsDefine = require('../constants')
const filePath = process.env.INVOICE_UPLOAD_PATH
const subAccountCodeController = require('./subAccountCodeController')
const accountCodeController = require('./accountCodeController')
const constants = require('../constants')
const validate = require('../lib/validate')

/**
 * 補助科目アップロード
 * @param {string} _file ファイル情報
 * @param {object} contract 契約情報
 * @returns {object} 0（正常）、{ idx: 行数, accountCode: 勘定科目コード, subjectCode: 補助科目コード, subjectName: 補助科目名, errorData: 詳細 }（異常）、Error（DBエラー、システムエラーなど）
 */
const upload = async function (_file, contract) {
  logger.info(constantsDefine.logMessage.INF000 + 'subAccountUploadController.upload')

  let result = null

  // filename設定
  const today = new Date().getTime()
  const filename = '補助科目' + '_' + today + '_' + _file.userId + '_' + _file.originalname + '.csv'
  const originName = path.resolve(filePath, _file.filename)
  const newFilePath = path.resolve(filePath, filename)
  fs.renameSync(originName, newFilePath)

  try {
    // 補助科目CSVファイル読み込み

    const data = fs.readFileSync(newFilePath, { encoding: 'utf-8' })

    const rows = data.split(/\r?\n|\r/)

    // 補助科目のヘッダ取出
    const header = rows[0]

    // ヘッダ除去
    rows.shift()

    // ヘッダの最終番目が空の場合は削除
    if (rows[rows.length - 1] === '') rows.pop()

    // 補助科目数量チェック（200件以上の場合エラーにする）
    if (rows.length > 200) {
      if (result === null) {
        result = -3
      }
    }

    // ヘッダチェック
    // 補助科目フォーマットファイルのヘッダ取得
    const basicHeader = fs
      .readFileSync(basicHeaderCsvPath)
      .toString('utf-8')
      .split(/\r?\n|\r/)[0]
      .split(',')

    // ヘッダ比較
    const headerChk = header.split(',')
    if (JSON.stringify(headerChk) !== JSON.stringify(basicHeader)) {
      if (result === null) {
        result = -1
      }
    }

    // 補助科目データがない場合
    if (rows.length < 1) {
      if (result === null) {
        result = -2
      }
    }

    // 補助科目行ごとチェックする。
    const resultVerifiedField = []
    rows.forEach((item, idx) => {
      const row = item.split(',')
      if (row.length !== 3) {
        resultVerifiedField.push({
          idx: idx + 2,
          item: item
        })
      }
    })
    if (resultVerifiedField.length !== 0) {
      if (result === null) {
        result = -4
        result.message = resultVerifiedField
      }
    }

    // 重複チェック前にデータを加工する。
    const subUploadAccountCode = rows.map((item, idx) => {
      const row = item.split(',')
      const accountCode = row[0]
      const subAccountCode = row[1]
      const subAccountName = row[2]
      return {
        idx: idx,
        accountCode: accountCode,
        subAccountCode: subAccountCode,
        subAccountName: subAccountName,
        duplicationFlag: false
      }
    })

    // 仕訳種類指定
    const accoutPrefix = 'ACCOUNT'
    const subAccoutPrefix = 'SUBACCOUNT'
    // 補助科目バリデーションチェック
    const errorMsg = []

    if (result === null) {
      for (let idx = 0; idx < subUploadAccountCode.length; idx++) {
        let errorIdx
        let errorData = ''
        let errorCheck = false

        // 勘定科目コードバリデーションチェック
        const checkAccountCode = validate.isCode(subUploadAccountCode[idx].accountCode, accoutPrefix)
        switch (checkAccountCode) {
          case '':
            break
          default:
            errorCheck = true
            errorData += `${constants.codeErrMsg[checkAccountCode]}`
            break
        }

        // 補助科目コードバリデーションチェック
        const checkCode = validate.isCode(subUploadAccountCode[idx].subAccountCode, subAccoutPrefix)
        switch (checkCode) {
          case '':
            break
          default:
            errorCheck = true
            errorData += errorData ? `,${constants.codeErrMsg[checkCode]}` : `${constants.codeErrMsg[checkCode]}`
            break
        }

        // 補助科目名バリデーションチェック
        const checkName = validate.isName(subUploadAccountCode[idx].subAccountName, subAccoutPrefix)
        switch (checkName) {
          case '':
            break
          default:
            errorCheck = true
            errorData += errorData ? `,${constants.codeErrMsg[checkName]}` : `${constants.codeErrMsg[checkName]}`
            break
        }

        // バリデーションチェック結果問題ない場合DBに保存
        if (!errorCheck) {
          // 勘定科目検索
          const searchAccountCodeResult = await accountCodeController.searchAccountCode(
            contract.contractId,
            subUploadAccountCode[idx].accountCode,
            ''
          )

          // DBエラー発生の場合、エラー処理
          if (searchAccountCodeResult instanceof Error) {
            throw searchAccountCodeResult
          }

          // 勘定科目検索結果がない場合
          if (searchAccountCodeResult.length === 0) {
            errorData += `${constants.codeErrMsg.ACCOUNTCODEERR004}`
          } else {
            const values = {
              accountCodeId: searchAccountCodeResult[0].accountCodeId,
              subjectCode: subUploadAccountCode[idx].subAccountCode,
              subjectName: subUploadAccountCode[idx].subAccountName
            }

            const insertResult = await subAccountCodeController.insert(contract, values)

            // DBエラー発生の場合、エラー処理
            if (insertResult instanceof Error) {
              throw insertResult
            }

            // 重複の場合、登録の時勘定科目がなくなった場合
            switch (insertResult) {
              case 0:
                break
              case 1:
                errorData += `${constants.codeErrMsg.SUBACCOUNTCODEERR003}`
                break
              case -1:
                errorData += `${constants.codeErrMsg.ACCOUNTCODEERR004}`
                break
            }
          }
        }

        if (errorData.length !== 0) {
          errorIdx = idx + 1
          errorMsg.push({
            idx: errorIdx,
            accountCode: subUploadAccountCode[idx].accountCode,
            subjectCode: subUploadAccountCode[idx].subAccountCode,
            subjectName: subUploadAccountCode[idx].subAccountName,
            errorData: errorData
          })
        }
      }
    }

    // アップロードファイル削除
    if ((await removeFile(newFilePath)) === true && result === null) {
      result = 0
    }
    logger.info(constantsDefine.logMessage.INF001 + 'subAccountUploadController.upload')
    if (errorMsg.length !== 0) {
      errorMsg.unshift({ header: ['行数', '勘定科目コード', '補助科目コード', '補助科目名', '詳細'] })
      return errorMsg
    }
    return result
  } catch (error) {
    logger.error({ contractId: contract.contractId, stack: error.stack, status: 0 })
    logger.info(constantsDefine.logMessage.INF001 + 'subAccountUploadController.upload')
    return error
  }
}

/**
 * CSVファイル削除機能
 * @param {string} deleteFilePath 削除ファイルパス
 * @returns {boolean} true（正常）、Error（DBエラー、システムエラーなど）
 */
const removeFile = async (deleteFilePath) => {
  logger.info(constantsDefine.logMessage.INF000 + 'accountUploadController.remove')
  const deleteFile = path.join(deleteFilePath)

  if (fs.existsSync(deleteFile)) {
    try {
      fs.unlinkSync(deleteFile)
      logger.info(constantsDefine.logMessage.INF001 + 'accountUploadController.remove')
      return true
    } catch (error) {
      logger.info(constantsDefine.logMessage.INF001 + 'accountUploadController.remove')
      throw error
    }
  } else {
    // 削除対象がない場合、サーバーエラー画面表示
    logger.info(constantsDefine.logMessage.INF001 + 'accountUploadController.remove')
    const deleteError = new Error('CSVファイル削除エラー')
    throw deleteError
  }
}

module.exports = {
  upload: upload,
  removeFile: removeFile
}
