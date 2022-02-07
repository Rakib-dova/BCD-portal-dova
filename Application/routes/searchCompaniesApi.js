'use strict'

const express = require('express')
const router = express.Router()
const logger = require('../lib/logger')
const constantsDefine = require('../constants')
const apiManager = require('../controllers/apiManager')
const bodyParser = require('body-parser')
router.use(
  bodyParser.json({
    type: 'application/json',
    limit: '100KB'
  })
)

const cbSearchCompanies = async (req, res) => {
  logger.info(constantsDefine.logMessage.INF000 + 'cbSearchCompanies')

  // 検索した結果を格納する変数
  const resultCompanies = []
  // 返すレスポンスステータスコードを格納する変数
  let resultStatusCode

  // 認証情報取得確認
  if (!req.session || !req.user?.userId) {
    resultStatusCode = 403
    return res.status(resultStatusCode).send()
  }

  // 検索する企業名の有無確認
  if (req.body.companyName === undefined) {
    resultStatusCode = 400
    return res.status(resultStatusCode).send()
  }

  // 検索する企業名を格納
  const companyName = req.body.companyName

  // 企業名を検索できるように変更
  const encodeCompanyName = encodeURI(companyName)
  const sendQuery = `query=${encodeCompanyName}`

  // 企業を検索する
  let pageId = 0
  let numPages = 1
  let apiResult
  let connectionsResult
  // 検索結果をすべて格納
  do {
    connectionsResult = await apiManager.accessTradeshift(
      req.user.accessToken,
      req.user.refreshToken,
      'get',
      `/network/connections?${sendQuery}&limit=100&page=${pageId}`
    )
    // 検索結果の全体ページを格納
    numPages = connectionsResult.numPages ?? 1
    if (pageId === 0) {
      apiResult = { ...connectionsResult }
    } else {
      connectionsResult.Connection.forEach((item) => {
        apiResult.Connection.push(item)
      })
    }
    pageId++
  } while (pageId < numPages)

  // connectionsResultのエラー確認
  if (connectionsResult instanceof Error) {
    // APIエラーが発生した場合
    return errorHandle(connectionsResult, res, req)
  } else {
    resultStatusCode = 200
    // 検索結果の企業名、企業IDを確認し格納
    apiResult.Connection.forEach((item) => {
      if (item.CompanyName && item.CompanyAccountId) {
        resultCompanies.push({
          CompanyName: item.CompanyName,
          CompanyAccountId: item.CompanyAccountId
        })
      }
    })
  }

  // 会社名で昇順ソート
  resultCompanies.sort((prev, next) => {
    const prevCompany = prev.CompanyName
    const nextCompany = next.CompanyName

    return prevCompany < nextCompany ? -1 : prevCompany > nextCompany ? 1 : 0
  })

  // レスポンスを返す
  logger.info(constantsDefine.logMessage.INF001 + 'cbSearchCompanies')
  return res.status(resultStatusCode).send(resultCompanies)
}

// エラー処理
const errorHandle = (companiesResult, _res, _req) => {
  let resultStatusCode
  if (String(companiesResult.response?.status).slice(0, 1) === '4') {
    // 400番エラーの場合
    logger.error(
      {
        tenant: _req.user.tenantId,
        user: _req.user.userId,
        invoiceNumber: _req.body.invoiceNumber,
        status: 2
      },
      companiesResult.name
    )
    resultStatusCode = 400
    return _res.status(resultStatusCode).send(constantsDefine.statusConstants.CSVDOWNLOAD_APIERROR)
  } else if (String(companiesResult.response?.status).slice(0, 1) === '5') {
    // 500番エラーの場合
    logger.error(
      {
        tenant: _req.user.tenantId,
        user: _req.user.userId,
        invoiceNumber: _req.body.invoiceNumber,
        status: 2
      },
      companiesResult.toString()
    )
    resultStatusCode = 500
    return _res.status(resultStatusCode).send(constantsDefine.statusConstants.CSVDOWNLOAD_SYSERROR)
  }
}

router.post('/', cbSearchCompanies)

module.exports = {
  router: router,
  cbSearchCompanies: cbSearchCompanies,
  errorHandle: errorHandle
}
