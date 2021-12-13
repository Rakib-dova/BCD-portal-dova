const fs = require('fs')
const path = require('path')
const basicHeader = 'コード,勘定科目名'
const logger = require('../lib/logger')
const constantsDefine = require('../constants')

const upload = async function (_file, contract) {
  logger.info(constantsDefine.logMessage.INF000 + 'accountUploadController.upload')

  let result = null
  //   const filename = _file.filename アップロードファイル削除機能用
  const filepath = path.resolve(_file.path)

  try {
    // 勘定科目CSVファイル読み込み
    const data = fs.readFileSync(filepath, { encoding: 'utf-8' })
    const rows = data.split(/\r?\n|\r/)
    // 勘定科目のヘッダ取出
    const header = rows[0]

    // ヘッダ除去
    rows.shift()
    if (rows[rows.length - 1] === '') rows.pop()

    // ヘッダチェック
    if (basicHeader.match(header) === null) {
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

    // 勘定科目数量チェック（200件以上の場合エラーにする）
    if (rows.length > 200) {
      result = -3
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

    // 昇順ソートしながら、重複チェックする。
    uploadAccountCode.sort((prev, next) => {
      const prevCode = prev.code
      const nextCode = next.code
      if (prevCode - nextCode === 0) {
        prev.duplicationFlag = true
        result = -5
      }
      return prevCode - nextCode
    })

    // 既に保存されているデータと重複チェックしながらほぞんする。
    const accountCodeInser = require('./accountCodeController').insert
    const inputPatternEngNum = '^[a-zA-Z0-9+]*$'
    for (let idx = 0; idx < uploadAccountCode.length; idx++) {
      if (uploadAccountCode[idx].duplicationFlag) continue
      if (uploadAccountCode[idx].code.length > 10 || !uploadAccountCode[idx].code.match(inputPatternEngNum)) {
        result = -6
        break
      }
      if (uploadAccountCode[idx].name.length > 40) {
        result = -7
        break
      }
      const values = {
        accountCode: uploadAccountCode[idx].code,
        accountCodeName: uploadAccountCode[idx].name
      }
      const insertResult = await accountCodeInser(contract, values)
      if (!insertResult) result = -5
    }

    // 削除機能追加
    logger.info(constantsDefine.logMessage.INF001 + 'accountUploadController.upload')
    return result
  } catch (error) {
    logger.error({ contractId: contract.contractId, stack: error.stack, status: 0 })
    logger.info(constantsDefine.logMessage.INF001 + 'accountUploadController.upload')

    return error
  }
}

const removeFile = async (path, filename) => {}

module.exports = {
  upload: upload,
  remove: removeFile
}
