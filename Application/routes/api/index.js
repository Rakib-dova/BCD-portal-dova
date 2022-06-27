'use strict'
const express = require('express')
const router = express.Router()
const helper = require('../helpers/middleware')

const message = require('./message')

router.get('/message', helper.isAuthenticated, message)

module.exports = {
  router,
  message: message,
  oshirase: null,
  kouji: null
}
