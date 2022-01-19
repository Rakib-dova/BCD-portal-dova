'use strict'

const express = require('express')
const logger = require('../../lib/logger')
const router = express.Router()
const memberSiteController = require('../controllers/memberSiteController')

const csrf = require('csurf')
const csrfProtection = csrf({ cookie: false })

const logMessageDefine = require('../../constants').logMessage

const fingerprintVerifyForwarder = (req, res, next) => {
  // TODO:イベントコードを定義
  logger.info(logMessageDefine.INF000 + ' fingerprintVerifyForwarder')

  // TODO:イベントコードを定義
  logger.info(logMessageDefine.INF001 + ' fingerprintVerifyForwarder')
  return res.sendStatus(200)
}

router.post('/', csrfProtection, memberSiteController.fingerprintVerifyTransfer, fingerprintVerifyForwarder)

module.exports = {
  router: router,
  fingerprintVerifyForwarder: fingerprintVerifyForwarder
}
