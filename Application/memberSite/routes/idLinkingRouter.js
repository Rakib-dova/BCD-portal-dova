'use strict'

const express = require('express')
const logger = require('../../lib/logger')
const router = express.Router()
const memberSiteController = require('../controllers/memberSiteController')

const csrf = require('csurf')
const csrfProtection = csrf({ cookie: false })

const logMessageDefine = require('../../constants').logMessage

const idLinkingProcessForwarder = (req, res, next) => {
  logger.info(logMessageDefine.INF000 + ' idLinkingProcessForwarder')

  logger.info(logMessageDefine.INF001 + ' idLinkingProcessForwarder')
  return res.sendStatus(200)
}

router.post('/', csrfProtection, memberSiteController.idLinkingProcess, idLinkingProcessForwarder)

module.exports = {
  router: router,
  idLinkingProcessForwarder: idLinkingProcessForwarder
}
