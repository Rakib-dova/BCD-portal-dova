'use strict'
const express = require('express')
const router = express.Router()
const helper = require('./helpers/middleware')
const logger = require('../lib/logger')
const constantsDefine = require('../constants')

const cbGetIndex = async (req, res, next) => {
  logger.info(constantsDefine.logMessage.INF000 + 'cbGetIndex')

  res.send('Dummy Page')

  logger.info(constantsDefine.logMessage.INF001 + 'cbGetIndex')
}

router.get('/:uploadFormatId', helper.isAuthenticated, cbGetIndex)

module.exports = {
  router: router,
  cbGetIndex: cbGetIndex
}
