const fs = require('fs')
const path = require('path')
const basicHeader = /勘定科目コード,勘定科目名$/
const logger = require('../lib/logger')
const constantsDefine = require('../constants')
const filePath = process.env.INVOICE_UPLOAD_PATH
const accountCodeInser = require('./accountCodeController')
const constants = require('../constants')
const validate = require('../lib/validate')

const upload = async function (_file, contract) {
  logger.info(constantsDefine.logMessage.INF000 + 'accountUploadController.upload')

  let result = null

  // filename設定
  const today = new Date().getTime()
  const filename = '勘定科目' + '_' + today + '_' + _file.userId + '_' + _file.originalname + '.csv'
  const originName = path.resolve(filePath, _file.filename)
  const newFilePath = path.resolve(filePath, filename)
  fs.renameSync(originName, newFilePath)

  try {
    // 勘定科目CSVファイル読み込み

    const data = fs.readFileSync(newFilePath, { encoding: 'utf-8' })

    const rows = data.split(/\r?\n|\r/)

    // 勘定科目のヘッダ取出
    const header = rows[0]

    // ヘッダ除去
    rows.shift()

    // ヘッダの最終番目が空の場合は削除
    if (rows[rows.length - 1] === '') rows.pop()

    // 勘定科目数量チェック（200件以上の場合エラーにする）
    if (rows.length > 200) {
      result = -3
      logger.info(constantsDefine.logMessage.INF001 + 'accountUploadController.upload')
      return result
    }

    // ヘッダチェック
    const headerChk = header.split(',')
    if (headerChk.length !== 2 || header.match(basicHeader) === null) {
      result = -1
      logger.info(constantsDefine.logMessage.INF001 + 'accountUploadController.upload')
      return result
    }

    // 勘定科目データがない場合
    if (rows.length < 1) {
      result = -2
      logger.info(constantsDefine.logMessage.INF001 + 'accountUploadController.upload')
      return result
    }

    // 勘定科目行ごとチェックする。
    const resultVerifiedField = []
    rows.forEach((item, idx) => {
      const row = item.split(',')
      if (row.length !== 2) {
        resultVerifiedField.push({
          idx: idx + 2,
          item: item
        })
      }
    })
    if (resultVerifiedField.length !== 0) {
      result = -4
      result.message = resultVerifiedField
      logger.info(constantsDefine.logMessage.INF001 + 'accountUploadController.upload')
      return result
    }

    // 重複チェック前にデータを加工する。
    const uploadAccountCode = rows.map((item, idx) => {
      const row = item.split(',')
      const code = row[0]
      const accountName = row[1]
      return {
        idx: idx,
        code: code,
        name: accountName,
        duplicationFlag: false
      }
    })

    // 仕訳種類指定
    const type = 'ACCOUNT'
    // 勘定科目バリデーションチェック
    const errorMsg = []

    for (let idx = 0; idx < uploadAccountCode.length; idx++) {
      let errorIdx
      let errorData = ''
      let errorCheck = false

      // 勘定科目コードバリデーションチェック
      const checkCode = validate.isCode(uploadAccountCode[idx].code, type)
      switch (checkCode) {
        case '':
          break
        default:
          errorCheck = true
          errorData += errorData ? `,${constants.codeErrMsg[checkCode]}` : `${constants.codeErrMsg[checkCode]}`

          break
      }

      // 勘定科目名バリデーションチェック
      const checkName = validate.isName(uploadAccountCode[idx].name, type)
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
        const values = {
          accountCode: uploadAccountCode[idx].code,
          accountCodeName: uploadAccountCode[idx].name
        }

        const insertResult = await accountCodeInser.insert(contract, values)

        // 重複の場合
        if (!insertResult) {
          errorData += errorData
            ? `,${constants.codeErrMsg.ACCOUNTCODEERR003}`
            : `${constants.codeErrMsg.ACCOUNTCODEERR003}`
        }
      }

      if (errorData.length !== 0) {
        errorIdx = idx + 1
        errorMsg.push({
          idx: errorIdx,
          code: uploadAccountCode[idx].code,
          name: uploadAccountCode[idx].name,
          errorData: errorData
        })
      }
    }

    // 削除機能追加
    if ((await removeFile(newFilePath)) === true && result === null) {
      result = 0
    }
    logger.info(constantsDefine.logMessage.INF001 + 'accountUploadController.upload')
    if (errorMsg.length !== 0) {
      errorMsg.unshift({ header: ['行数', '勘定科目コード', '勘定科目名', '詳細'] })
      return errorMsg
    }
    return result
  } catch (error) {
    logger.error({ contractId: contract.contractId, stack: error.stack, status: 0 })
    logger.info(constantsDefine.logMessage.INF001 + 'accountUploadController.upload')
    return error
  }
}

// CSVファイル削除機能
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
  remove: removeFile
}
