'use strict'

const fs = require('fs')
const path = require('path')
const logger = require('../lib/logger')
const constantsDefine = require('../constants')
const validate = require('../lib/validate')

/**
 *
 * @param {object} passport トレードシフトのAPIアクセス用データ
 * @param {object} contract 契約情報
 * @param {object} nominalList 読み込んだファイルデータ
 * @returns {number, object} 実行結果ステータス、データ
 */
const upload = async (passport, contract, nominalList) => {
  logger.info(constantsDefine.logMessage.INF000 + 'uploadSuppliersController.upload')
  const destination = nominalList.destination
  const fileName = nominalList.filename
  const invitationResult = []
  const pwdFile = path.resolve(destination, fileName)

  // ファイル読み込み
  const result = readNominalList(pwdFile)

  if (result instanceof Error) {
    const error = result
    logger.error({ contractId: contract.contractId, stack: error.stack, status: 0 })
    logger.info(constantsDefine.logMessage.INF001 + 'uploadSuppliersController.upload')
    return [error, null]
  }

  if (result.status === -1) {
    logger.error({ contractId: contract.contractId, stack: 'ヘッダーが指定のものと異なります。', status: 0 })
    return [-1, null]
  }

  if (result.data.length > 200) {
    logger.error({ contractId: contract.contractId, stack: '一括登録取引先ーが200件を超えています。', status: 0 })
    return [-3, null]
  }

  const mailList = []

  for (let supplier of result.data) {
    supplier = supplier.split(',')
    if (supplier.length !== 2) {
      logger.error({ contractId: contract.contractId, stack: '項目数が異なります。', status: 0 })
      return [-2, null]
    }

    // メールアドレス重複確認
    if (mailList.some((mail) => mail === supplier[1])) {
      invitationResult.push({
        companyName: supplier[0],
        companyMailAddress: supplier[1],
        status: 'Duplicate Email Error',
        stack: null
      })
    }

    if (validate.isContactEmail(supplier[1]) !== 0) {
      invitationResult.push({
        companyName: supplier[0],
        companyMailAddress: supplier[1],
        status: 'Email Type Error',
        stack: null
      })
    } else {
      mailList.push(supplier[1])
    }
  }

  // 読み込んだファイル削除
  const deleteResult = await removeFile(pwdFile)

  if (deleteResult instanceof Error) {
    const error = deleteResult
    logger.error({ contractId: contract.contractId, stack: error.stack, status: 0 })
    logger.info(constantsDefine.logMessage.INF001 + 'uploadSuppliersController.upload')
    return [error, null]
  }

  logger.info(constantsDefine.logMessage.INF001 + 'uploadSuppliersController.upload')
  return [result.status, invitationResult]
}

const readNominalList = (pwdFile) => {
  const formatBaseCamp = './public/html'
  const formatName = '取引先一括登録フォーマット.csv'
  const basecamp = path.resolve(formatBaseCamp, formatName)
  const result = {
    status: 1,
    data: null
  }
  const data = getReadCsvData(pwdFile)

  if (data.code === 'ENOENT') {
    const fileError = new Error(data.Error)
    return fileError
  }

  const header = data.split(/\r?\n|\r/)[0]
  const fomatFile = getReadCsvData(basecamp)

  if (header === fomatFile) {
    result.status = 0
    result.data = data.split(/\r?\n|\r/)
    result.data.shift()
  } else {
    result.status = -1
    return result
  }

  if (result.data !== null && result.data[result.data.length - 1].length === 0) {
    result.data.pop()
  }

  return result
}

const getReadCsvData = (fullPath) => {
  try {
    const data = fs.readFileSync(fullPath, { encoding: 'utf8', flag: 'r' })
    return data
  } catch (error) {
    return error
  }
}

// CSVファイル削除機能
const removeFile = async (fullPath) => {
  logger.info(constantsDefine.logMessage.INF000 + 'uploadSuppliersController.remove')
  if (fs.existsSync(fullPath)) {
    try {
      fs.unlinkSync(fullPath)
      logger.info(constantsDefine.logMessage.INF001 + 'uploadSuppliersController.remove')
      return true
    } catch (error) {
      logger.info(constantsDefine.logMessage.INF001 + 'uploadSuppliersController.remove')
      return error
    }
  } else {
    // 削除対象がない場合、サーバーエラー画面表示
    logger.info(constantsDefine.logMessage.INF001 + 'uploadSuppliersController.remove')
    const deleteError = new Error('削除対象を見つかれませんでした。')
    return deleteError
  }
}

module.exports = {
  upload: upload,
  readNominalList: readNominalList,
  getReadCsvData: getReadCsvData,
  removeFile: removeFile
}
