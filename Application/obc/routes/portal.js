'use strict'
const express = require('express')

const goPortal = (req, res, next) => {
  res.redirect(`https://${process.env.TS_HOST}/#/${process.env.TS_CLIENT_ID}`)
}

const router = express.Router()
router.get('/', goPortal)

module.exports = router
