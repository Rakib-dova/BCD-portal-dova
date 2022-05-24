'use strict'

const fs = require('fs')
const path = require('path')
const logger = require('../lib/logger')
const constantsDefine = require('../constants')
const TradeshiftDTO = require('../DTO/TradeshiftDTO')
const UploadUsersDTO = require('../DTO/UploadUsersDTO')
const validate = require('../lib/validate')

const upload = async (passport, contract, nominalList) => {
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
    return [-1, null]
  }

  if (result.data.length > 200) {
    logger.error({ contractId: contract.contractId, stack: '一括登録ユーザーが200件を超えています。', status: 0 })
    return [-3, null]
  }

  const product = UploadUsersDTO.factory(contract, result.data)

  if (product === -1) {
    logger.error({ contractId: contract.contractId, stack: '項目数が異なります。', status: 0 })
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
    console.log('getUserInformationByEmail=== ', response)
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
      console.log('registUser=== ', registerResponse)
      resultCreatedUser.push({
        username: registerResponse.Username,
        role: registerResponse.RoleId,
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

      if (invitedResponse === register.RoleId) {
        resultCreatedUser.push({
          username: register.Username,
          role: register.RoleId,
          status: 'Invited',
          stack: null
        })
        continue
      } else {
        resultCreatedUser.push({
          username: register.Username,
          role: register.RoleId,
          status: 'Invited Error',
          stack: null
        })
        continue
      }
    }
  }

  // 読み込んだファイル削除
  const deleteResult = await removeFile(pwdFile)
  if (deleteResult instanceof Error) {
    const error = deleteResult
    logger.error({ contractId: contract.contractId, stack: error.stack, status: 0 })
    logger.info(constantsDefine.logMessage.INF001 + 'userUploadController.upload')
    return [error, null]
  }

  logger.info(constantsDefine.logMessage.INF001 + 'userUploadController.upload')
  return [result.status, resultCreatedUser]
}

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
      return error
    }
  } else {
    // 削除対象がない場合、サーバーエラー画面表示
    logger.info(constantsDefine.logMessage.INF001 + 'uploadUserController.remove')
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
