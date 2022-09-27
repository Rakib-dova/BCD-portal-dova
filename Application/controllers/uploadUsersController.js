'use strict'

const fs = require('fs')
const path = require('path')
const logger = require('../lib/logger')
const constantsDefine = require('../constants')
const TradeshiftDTO = require('../DTO/TradeshiftDTO')
const UploadUsersDTO = require('../DTO/UploadUsersDTO')
const validate = require('../lib/validate')
const removeFile = require('../lib/removeFile')

/**
 * ユーザー一括アップロード
 *  １．バリデーションチェック
 *   ヘッダー確認
 *   CSVファイルの件数確認
 *   カラム数確認
 *   メールアドレス重複確認
 *  ２．トレシフ登録確認
 * @param {object} passport トレードシフトのAPIアクセス用データ
 * @param {object} contract 契約情報
 * @param {object} nominalList 読み込んだファイルデータ
 * @returns {object} アップロード対象のユーザー情報
 */
const upload = async (passport, contract, nominalList) => {
  try {
    logger.info(constantsDefine.logMessage.INF000 + 'userUploadController.upload')
    const tradeshiftDTO = new TradeshiftDTO(passport.accessToken, passport.refreshToken, contract.tenantId)
    const destination = nominalList.destination
    const fileName = nominalList.filename
    const pwdFile = path.resolve(destination, fileName)

    // ファイル読み込み
    const result = readNominalList(pwdFile)
    if (result instanceof Error) {
      const error = result
      logger.error({ contractId: contract.contractId, stack: error.stack, status: 0 })
      logger.info(constantsDefine.logMessage.INF001 + 'userUploadController.upload')
      return [error, null]
    }

    if (result.status === -1) {
      logger.error({ contractId: contract.contractId, stack: 'ヘッダーが指定のものと異なります。', status: 0 })
      // 読み込んだファイル削除
      await removeFile.removeFile(pwdFile)
      return [-1, null]
    }

    if (result.data.length > 200) {
      logger.error({ contractId: contract.contractId, stack: '一括登録ユーザーが200件を超えています。', status: 0 })
      // 読み込んだファイル削除
      await removeFile.removeFile(pwdFile)
      return [-3, null]
    }

    const product = UploadUsersDTO.factory(contract, result.data)

    if (product === -1) {
      logger.error({ contractId: contract.contractId, stack: '項目数が異なります。', status: 0 })
      // 読み込んだファイル削除
      await removeFile.removeFile(pwdFile)
      return [-2, null]
    }

    const resultCreatedUser = []
    for (const register of product) {
      if (validate.isValidEmail(register.Username) === false) {
        resultCreatedUser.push({
          username: register.Username,
          role: register.RoleId,
          status: 'Email Type Error',
          stack: null
        })
        continue
      }

      if (typeof register.RoleId === 'undefined') {
        resultCreatedUser.push({
          username: register.Username,
          role: register.RoleId,
          status: 'Role Type Error',
          stack: null
        })
        continue
      }
      // ユーザー検索
      const response = await tradeshiftDTO.getUserInformationByEmail(register.Username)
      if (response instanceof Error) {
        resultCreatedUser.push({
          username: register.Username,
          role: register.RoleId,
          status: 'Error',
          stack: response.stack
        })
        logger.error({ contractId: contract.contractId, stack: response.stack, status: 0 })
        continue
      }

      // ユーザー新規登録
      if (response === register.Username) {
        const registerResponse = await tradeshiftDTO.registUser(register)
        if (registerResponse instanceof Error) {
          resultCreatedUser.push({
            username: register.Username,
            role: register.RoleId,
            status: 'Invited Api Error',
            stack: response.stack
          })
          continue
        }
        resultCreatedUser.push({
          username: register.Username,
          role: register.RoleId,
          status: 'Created',
          stack: null
        })
        continue
      }

      // 既存ユーザーがあって、重複された場合
      if (response.CompanyAccountId === register.CompanyAccountId) {
        resultCreatedUser.push({
          username: register.Username,
          role: register.RoleId,
          status: 'Duplicated',
          stack: null
        })
        continue
      } else {
        register.Id = response.Id
        register.CompanyAccountId = response.CompanyAccountId
        const invitedResponse = await tradeshiftDTO.inviteUser(register)

        if (invitedResponse instanceof Error) {
          resultCreatedUser.push({
            username: register.Username,
            role: register.RoleId,
            status: 'Invited Api Error',
            stack: response.stack
          })
          continue
        }
        resultCreatedUser.push({
          username: register.Username,
          role: register.RoleId,
          status: 'Invited',
          stack: null
        })
        continue
      }
    }

    // 読み込んだファイル削除
    await removeFile.removeFile(pwdFile)

    logger.info(constantsDefine.logMessage.INF001 + 'userUploadController.upload')
    return [result.status, resultCreatedUser]
  } catch (error) {
    logger.error({ contractId: contract.contractId, stack: error.stack, status: 0 })
    logger.info(constantsDefine.logMessage.INF001 + 'userUploadController.upload')
    return [error, null]
  }
}

/**
 * アップロードされたCSVファイル読み込みとフォーマットファイルの比較
 * @param {string} pwdFile アップロードされたCSVファイルパス
 * @returns {object} 読み込んだCSVデータ
 */
const readNominalList = (pwdFile) => {
  const formatBaseCamp = './public/html'
  const formatName = 'ユーザー一括登録フォーマット.csv'
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

/**
 * アップロードされたCSVファイル読み込み
 * @param {string} fullPath アップロードされたCSVファイルパス
 * @returns {boolean} true（正常）、false（異常）、Error（DBエラー、システムエラーなど）
 */
const getReadCsvData = (fullPath) => {
  try {
    const data = fs.readFileSync(fullPath, { encoding: 'utf8', flag: 'r' })
    return data
  } catch (error) {
    return error
  }
}

module.exports = {
  upload: upload,
  readNominalList: readNominalList,
  getReadCsvData: getReadCsvData
}
