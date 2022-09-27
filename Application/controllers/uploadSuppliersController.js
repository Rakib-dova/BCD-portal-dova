'use strict'

const fs = require('fs')
const path = require('path')
const logger = require('../lib/logger')
const constantsDefine = require('../constants')
const tradeshiftAPI = require('../lib/tradeshiftAPI')
const { v4: uuidv4 } = require('uuid')
const validate = require('../lib/validate')

/**
 * 取引先一括アップロード
 *  １．バリデーションチェック
 *   ヘッダー確認
 *   CSVファイルの件数確認
 *   カラム数確認
 *   メールアドレス重複確認
 *  ２．トレシフ登録確認
 *  ３．招待メール送信
 * @param {object} passport トレードシフトのAPIアクセス用データ
 * @param {object} contract 契約情報
 * @param {object} nominalList 読み込んだファイルデータ
 * @returns {object} アップロード対象の取引先情報
 */
const upload = async (passport, contract, nominalList) => {
  logger.info(constantsDefine.logMessage.INF000 + 'uploadSuppliersController.upload')
  const destination = nominalList.destination
  const fileName = nominalList.filename
  let resultSuppliersCompany = []
  let errorFlag = false
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
    result.status = -1
    resultSuppliersCompany = null
    errorFlag = true
  }

  if (!errorFlag && result.data.length > 200) {
    logger.error({ contractId: contract.contractId, stack: '一括登録取引先が200件を超えています。', status: 0 })
    result.status = -3
    resultSuppliersCompany = null
    errorFlag = true
  }

  // 項目数確認
  if (!errorFlag) {
    for (const data of result.data) {
      const dataMap = data.split(',')
      if (dataMap.length !== 2) {
        logger.error({ contractId: contract.contractId, stack: '項目数が異なります。', status: 0 })
        result.status = -2
        resultSuppliersCompany = null
        errorFlag = true
        break
      }
    }
  }

  const mailList = []

  // バリデーションチェック、API処理
  if (!errorFlag) {
    for (const data of result.data) {
      const dataMap = data.split(',')
      const companyName = dataMap[0]
      const mailAddress = dataMap[1]

      // メールアドレスバリデーションチェック
      if (validate.isValidEmail(mailAddress) === false) {
        resultSuppliersCompany.push({
          companyName: companyName,
          mailAddress: mailAddress,
          status: 'Email Type Error',
          stack: null
        })
        continue
      }

      // メールアドレス重複確認
      if (mailList.some((mail) => mail === mailAddress)) {
        resultSuppliersCompany.push({
          companyName: companyName,
          mailAddress: mailAddress,
          status: 'Duplicate Email Error',
          stack: null
        })
        continue
      } else {
        mailList.push(mailAddress)
      }

      let companyId = ''
      // 企業検索API
      const getCompaniesResponse = []
      let page = 0
      let numPages = 1
      let getCompaniesErrorFlag = false
      do {
        const connections = await tradeshiftAPI.getCompanies(passport, companyName, page)
        if (connections instanceof Error) {
          resultSuppliersCompany.push(setErrorResponse(companyName, mailAddress, 'Get Companies', connections))
          getCompaniesErrorFlag = true
          break
        }
        numPages = connections.numPages
        page++
        getCompaniesResponse.push(...connections.Connection)
      } while (page < numPages)

      if (getCompaniesErrorFlag) continue

      // 企業検索APIがqueryで完全一致検索ではないため、CSVの企業名と再度比較
      for (const connection of getCompaniesResponse) {
        if (connection.CompanyName === companyName) {
          companyId = connection.CompanyAccountId
        }
      }

      if (companyId === '') {
        // 企業が取得できなかった場合
        // 招待有無確認API
        const getConnectionsResponse = await tradeshiftAPI.getConnections(passport, mailAddress, 'ExternalConnection')
        if (getConnectionsResponse instanceof Error) {
          resultSuppliersCompany.push(
            setErrorResponse(companyName, mailAddress, 'Get Connections', getConnectionsResponse)
          )
          continue
        }
        if (getConnectionsResponse.Connection.length !== 0) {
          let flag = false
          for (const connection of getConnectionsResponse.Connection) {
            if (connection.Email === mailAddress) {
              flag = true
              resultSuppliersCompany.push({
                companyName: companyName,
                mailAddress: mailAddress,
                status: 'Already Invitation',
                stack: null
              })
              break
            }
          }
          if (flag) continue
        }

        // ネットワーク接続更新API
        // connectionIdの生成（uuid）
        const connectionId = uuidv4()
        const updateNetworkConnectionResponse = await tradeshiftAPI.updateNetworkConnection(
          passport,
          connectionId,
          companyName,
          mailAddress
        )
        if (updateNetworkConnectionResponse instanceof Error) {
          resultSuppliersCompany.push(
            setErrorResponse(companyName, mailAddress, 'Update NetworkConnection', updateNetworkConnectionResponse)
          )
          continue
        }

        resultSuppliersCompany.push({
          companyName: companyName,
          mailAddress: mailAddress,
          status: 'Update Success',
          stack: null
        })
        continue
      } else {
        // 企業が取得できた場合
        // Network確認API
        const getConnectionForCompanyResponse = await tradeshiftAPI.getConnectionForCompany(passport, companyId)
        if (
          getConnectionForCompanyResponse instanceof Error &&
          getConnectionForCompanyResponse.response?.status !== 404
        ) {
          resultSuppliersCompany.push(
            setErrorResponse(companyName, mailAddress, 'Get ConnectionForCompany', getConnectionForCompanyResponse)
          )
          continue
        }
        // Network接続済みの場合
        if (getConnectionForCompanyResponse.CompanyAccountId) {
          resultSuppliersCompany.push({
            companyName: companyName,
            mailAddress: mailAddress,
            status: 'Already Connection',
            stack: null
          })
          continue
        }

        // メールアドレス情報検索API
        const getUserInformationByEmailResponse = await tradeshiftAPI.getUserInformationByEmail(passport, mailAddress)
        if (getUserInformationByEmailResponse instanceof Error) {
          resultSuppliersCompany.push(
            setErrorResponse(companyName, mailAddress, 'Get Username', getUserInformationByEmailResponse)
          )
          continue
        }
        // メールアドレスから取得した企業情報と企業検索APIで取得したテナントIDが一致しない場合
        if (getUserInformationByEmailResponse.CompanyAccountId !== companyId) {
          resultSuppliersCompany.push({
            companyName: companyName,
            mailAddress: mailAddress,
            status: 'Email Not Match',
            stack: null
          })
          continue
        }

        // ネットワーク接続追加API
        const addNetworkConnectionResponse = await tradeshiftAPI.addNetworkConnection(passport, companyId)
        if (addNetworkConnectionResponse instanceof Error) {
          resultSuppliersCompany.push(
            setErrorResponse(companyName, mailAddress, 'Add NetworkConnection', addNetworkConnectionResponse)
          )
          continue
        }

        resultSuppliersCompany.push({
          companyName: companyName,
          mailAddress: mailAddress,
          status: 'Add Success',
          stack: null
        })
      }
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
  return [result.status, resultSuppliersCompany]
}

/**
 * エラー結果設定
 * @param {string} companyName 企業名
 * @param {string} mailAddress メールアドレス
 * @param {string} apiName API名
 * @param {string} response API実行結果
 * @returns {object} エラー内容
 */
const setErrorResponse = (companyName, mailAddress, apiName, response) => {
  const result = {
    companyName: companyName,
    mailAddress: mailAddress,
    status: 'API Error',
    stack: response.stack
  }
  logger.error({ companyName: companyName, apiName: apiName, stack: response.stack, status: 0 })
  return result
}

/**
 * アップロードされたCSVファイル読み込みとフォーマットファイルの比較
 * @param {string} pwdFile アップロードされたCSVファイルパス
 * @returns {object} 読み込んだCSVデータ
 */
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

/**
 * アップロードされたCSVファイル削除
 * @param {string} fullPath アップロードされたCSVファイルパス
 * @returns {boolean} true（正常）、false（異常）、Error（DBエラー、システムエラーなど）
 */
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
  setErrorResponse: setErrorResponse,
  readNominalList: readNominalList,
  getReadCsvData: getReadCsvData,
  removeFile: removeFile
}
