'use strict'

const express = require('express')
const router = express.Router()
const logger = require('../lib/logger')
const validate = require('../lib/validate')
const postalNumberController = require('../controllers/postalNumberController.js')
const constantsDefine = require('../constants')

const bodyParser = require('body-parser')
router.use(
  bodyParser.json({
    type: 'application/json',
    limit: '100KB'
  })
)

/**
 * 住所検索
 * @param {object} req HTTPリクエストオブジェクト
 * @param {object} res HTTPレスポンスオブジェクト
 * @returns {object} 呼び出し元画面表示、またはエラー
 */
const cbSearchAddress = async (req, res) => {
  let resultAddress = { addressList: [] }
  let resultStatusCode
  logger.info(constantsDefine.logMessage.INF000 + 'cbSearchAddress')
  if (!req.session || !req.user?.userId) {
    resultStatusCode = 403
    return res.status(resultStatusCode).send()
  }

  if (req.body.postalNumber === undefined) {
    resultStatusCode = 400
    return res.status(resultStatusCode).send()
  }

  if (!validate.isPostalNumber(req.body.postalNumber)) {
    resultStatusCode = 400
    return res.status(resultStatusCode).send()
  }

  const result = await postalNumberController.findOne(req.body.postalNumber).catch((error) => {
    return error
  })

  switch (result.statuscode) {
    case 200:
      resultStatusCode = 200
      resultAddress.addressList = result.value
      break
    case 501:
      resultStatusCode = 500
      resultAddress = null
      break
    case 502:
      resultStatusCode = 500
      resultAddress = null
      break
  }

  logger.info(constantsDefine.logMessage.INF001 + 'cbSearchAddress')
  // レスポンスを返す
  return res.status(resultStatusCode).send(resultAddress)
}

router.post('/', cbSearchAddress)

module.exports = {
  router: router,
  cbSearchAddress: cbSearchAddress
}
