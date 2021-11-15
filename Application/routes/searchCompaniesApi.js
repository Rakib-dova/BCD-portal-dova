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

  const resultCompanies = []
  let resultStatusCode

  if (!req.session || !req.user?.userId) {
    resultStatusCode = 403
    return res.status(resultStatusCode).send()
  }

  // 検索する企業名の有無確認
  if (req.body.companyName === undefined) {
    resultStatusCode = 400
    return res.status(resultStatusCode).send()
  }

  const companyName = req.body.companyName

  // 自分自身の企業をaccountAPIで取得
  const accountCompanyResult = await apiManager.accessTradeshift(
    req.user.accessToken,
    req.user.refreshToken,
    'get',
    '/account'
  )

  if (accountCompanyResult instanceof Error) {
    return errorHandle(accountCompanyResult, res, req)
  } else {
    // 検索した企業名と比較し、部分一致したら格納
    if (accountCompanyResult.CompanyName && accountCompanyResult.CompanyAccountId) {
      if (accountCompanyResult.CompanyName.indexOf(companyName) !== -1) {
        resultCompanies.push({
          CompanyName: accountCompanyResult.CompanyName,
          CompanyAccountId: accountCompanyResult.CompanyAccountId
        })
      }
    }
  }

  // 企業名を入力できるように変更
  const encodCcompanyName = encodeURI(companyName)
  const sendQuery = `query=${encodCcompanyName}`

  // 請求書を検索する
  let pageId = 0
  let numPages = 1
  let apiResult
  let result
  do {
    result = await apiManager.accessTradeshift(
      req.user.accessToken,
      req.user.refreshToken,
      'get',
      `/network/connections?${sendQuery}&limit=100&page=${pageId}`
    )
    numPages = result.numPages ?? 1
    if (pageId === 0) {
      apiResult = result
    } else {
      result.Connection.forEach((item) => {
        apiResult.Connection.push(item)
      })
    }
    pageId++
  } while (pageId < numPages)

  if (apiResult instanceof Error) {
    return errorHandle(apiResult, res, req)
  } else {
    resultStatusCode = 200
    apiResult.Connection.forEach((item) => {
      if (item.CompanyName && item.CompanyAccountId) {
        resultCompanies.push({
          CompanyName: item.CompanyName,
          CompanyAccountId: item.CompanyAccountId
        })
      }
    })
  }
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
