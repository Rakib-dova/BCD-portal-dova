'use strict'

const express = require('express')
const logger = require('../../lib/logger')
const router = express.Router()
const memberSiteController = require('../controllers/memberSiteController')
const logMessageDefine = require('../../constants').logMessage

const memberCooperationForwarder = (req, res, next) => {
  // TODO:イベントコードを定義
  logger.info(logMessageDefine.INF000 + ' memberCooperationForwarder')
  logger.info(logMessageDefine.INF001 + ' memberCooperationForwarder')
  // Oauth実行処理へリダイレクト
  return res.redirect(303, '/auth')
}

router.get('/', memberSiteController.oauthTransfer, memberCooperationForwarder)

module.exports = {
  router: router,
  memberCooperationForwarder: memberCooperationForwarder
}
