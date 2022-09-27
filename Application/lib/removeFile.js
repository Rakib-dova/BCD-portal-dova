const fs = require('fs')
const path = require('path')
const logger = require('../lib/logger')
const constantsDefine = require('../constants')

/**
 * CSVファイル削除機能
 * @param {string} deleteFilePath 削除ファイルパス + ファイル名
 * @returns {boolean} true（正常）、false（異常）
 */
const removeFile = async (deleteFilePath) => {
  logger.info(constantsDefine.logMessage.INF000 + 'removeFile')
  const deleteFile = path.join(deleteFilePath)

  if (fs.existsSync(deleteFile)) {
    try {
      fs.unlinkSync(deleteFile)
      logger.info(constantsDefine.logMessage.INF001 + 'removeFile')
      return true
    } catch (error) {
      logger.info(constantsDefine.logMessage.INF001 + 'removeFile')
      throw error
    }
  } else {
    // 削除対象がない場合、サーバーエラー画面表示
    logger.info(constantsDefine.logMessage.INF001 + 'removeFile')
    const deleteError = new Error('ファイル削除エラー')
    throw deleteError
  }
}

module.exports = { removeFile: removeFile }
