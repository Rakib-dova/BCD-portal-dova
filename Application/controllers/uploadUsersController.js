'use strict'

const fs = require('fs')
const path = require('path')
const logger = require('../lib/logger')
const constantsDefine = require('../constants')

const upload = (passport, contract, nominalList) => {
  const destination = nominalList.destination
  const fileName = nominalList.filename
  const pwdFile = path.resolve(destination, fileName)

  // ファイル読み込み
  const result = readNominalList(pwdFile)
  if (result instanceof Error) {
    const error = result
    logger.error({ contractId: contract.contractId, stack: error.stack, status: 0 })
    logger.info(constantsDefine.logMessage.INF001 + 'userUploadController.upload')
    return error
  }

  // 読み込んだファイル削除
  const deleteResult = removeFile(pwdFile)
  if (deleteResult instanceof Error) {
    const error = deleteResult
    logger.error({ contractId: contract.contractId, stack: error.stack, status: 0 })
    logger.info(constantsDefine.logMessage.INF001 + 'userUploadController.upload')
    return error
  }

  return result.status
}

const readNominalList = (pwdFile) => {
  const formatBaseCamp = './public/html'
  const formatName = 'ユーザー括作成フォーマット.csv'
  const basecamp = path.resolve(formatBaseCamp, formatName)
  const result = {
    status: 1,
    data: null
  }
  const data = getReadCsvData(pwdFile)

  if (data instanceof Error) {
    return data
  }

  const header = data.split(/\r?\n|\r/)[0]
  const fomatFile = getReadCsvData(basecamp)

  if (header === fomatFile) {
    result.status = 0
    result.data = data
  } else {
    result.status = -1
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
  logger.info(constantsDefine.logMessage.INF000 + 'uploadUserController.remove')
  if (fs.existsSync(fullPath)) {
    try {
      fs.unlinkSync(fullPath)
      logger.info(constantsDefine.logMessage.INF001 + 'uploadUserController.remove')
      return true
    } catch (error) {
      logger.info(constantsDefine.logMessage.INF001 + 'uploadUserController.remove')
      throw error
    }
  } else {
    // 削除対象がない場合、サーバーエラー画面表示
    logger.info(constantsDefine.logMessage.INF001 + 'uploadUserController.remove')
    const deleteError = new Error('削除対象を見つかれませんでした。')
    throw deleteError
  }
}

module.exports = {
  upload: upload,
  readNominalList: readNominalList,
  getReadCsvData: getReadCsvData,
  removeFile: removeFile
}
