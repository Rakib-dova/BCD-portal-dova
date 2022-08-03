'use strict'
const express = require('express')
const router = express.Router()
const helper = require('../helpers/middleware')
const noticeCount = require('./noticeCount')

router.get('/noticeCount', helper.isAuthenticated, noticeCount)

module.exports = {
  router,
  noticeCount: noticeCount
}
