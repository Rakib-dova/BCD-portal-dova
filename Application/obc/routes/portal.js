'use strict'
const express = require('express')
const ts = require('../controllers/apihelper').tradeshiftApi()

const goPortal = (req, res, next) => {
  res.redirect(`${ts.baseUrl()}/#/${process.env.TS_CLIENT_ID}`)
}

const router = express.Router()
router.get('/', goPortal)

module.exports = router
