'use strict'

const express = require('express')
const router = express.Router()
const validate = require('../lib/validate')
const postalNumberController = require('../controllers/postalNumberController.js')
const resultAddress = { addressList: [] }

const bodyParser = require('body-parser')
router.use(
  bodyParser.json({
    type: 'application/json',
    limit: '100KB'
  })
)

const cbSearchAddress = async (req, res, next) => {
  if (req.session?.userContext !== 'NotUserRegistered') {
    res.status(400).send()
  }

  if (!req.user?.accessToken || !req.user?.refreshToken) {
    res.status(500).send()
  }

  if (req.body?.termsCheck !== 'on') res.status(400).send()

  if (req.body.postalNumber === undefined) res.status(400).send()

  if (!validate.isPostalNumber(req.body.postalNumber)) res.status(400).send()

  resultAddress.addressList = await postalNumberController.findOne(req.body.postalNumber)
  // レスポンスを返す
  res.status(200).send(resultAddress)
}

router.post('/', cbSearchAddress)

module.exports = {
  router: router,
  cbSearchAddress: cbSearchAddress
}
