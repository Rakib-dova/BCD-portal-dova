'use strict'
const express = require('express')
const router = express.Router()
const helper = require('./helpers/middleware')
const logger = require('../lib/logger')
const constantsDefine = require('../constants')

const dispUserGuide = async (req, res, next) => {
  logger.info(constantsDefine.logMessage.INF000 + 'dispUserGuide')

  // ご契約内容を画面に渡す。
  res.render('userGuide', {
    title: 'ご利用ガイド',
    engTitle: 'USER GUIDE',
    userRole: req.session.userRole,
    numberN: req.contracts[0]?.numberN === '' ? '' : req.contracts[0].numberN
  })
  logger.info(constantsDefine.logMessage.INF001 + 'dispUserGuide')
}

router.get('/', helper.bcdAuthenticate, dispUserGuide)

module.exports = {
  router: router,
  dispUserGuide
}
