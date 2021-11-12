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
  const resultCompanies = []
  let resultStatusCode
  logger.info(constantsDefine.logMessage.INF000 + 'cbSearchCompanies')
  if (!req.session || !req.user?.userId) {
    resultStatusCode = 403
    return res.status(resultStatusCode).send()
  }

  if (req.body.companyName === undefined) {
    resultStatusCode = 400
    return res.status(resultStatusCode).send()
  }

  const companyName = encodeURI(req.body.companyName)

  const sendQuery = `query=${companyName}`

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
    if (String(apiResult.response?.status).slice(0, 1) === '4') {
      // 400番エラーの場合
      logger.error(
        {
          tenant: req.user.tenantId,
          user: req.user.userId,
          invoiceNumber: req.body.invoiceNumber,
          status: 2
        },
        apiResult.name
      )
      resultStatusCode = 400
      return res.status(resultStatusCode).send(constantsDefine.statusConstants.CSVDOWNLOAD_APIERROR)
    } else if (String(apiResult.response?.status).slice(0, 1) === '5') {
      // 500番エラーの場合
      logger.error(
        {
          tenant: req.user.tenantId,
          user: req.user.userId,
          invoiceNumber: req.body.invoiceNumber,
          status: 2
        },
        apiResult.toString()
      )
      resultStatusCode = 500
      return res.status(resultStatusCode).send(constantsDefine.statusConstants.CSVDOWNLOAD_SYSERROR)
    }
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

  logger.info(constantsDefine.logMessage.INF001 + 'cbSearchCompanies')
  // レスポンスを返す
  return res.status(resultStatusCode).send(resultCompanies)
}

router.post('/', cbSearchCompanies)

module.exports = {
  router: router,
  cbSearchCompanies: cbSearchCompanies
}
