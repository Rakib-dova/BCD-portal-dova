'use strict'
const express = require('express')
const router = express.Router()
const helper = require('./helpers/middleware')

const errorHelper = require('./helpers/error')

const cbGetIndex = (req, res, next) => {
  if (!req.session || !req.user?.userId) {
    return next(errorHelper.create(500))
  }

  req.session.userContext = 'LoggedIn'
  res.render('portal', {
    title: 'ポータル',
    customerId: req.user.userId,
    TS_HOST: process.env.TS_HOST
  })
}

router.get('/', helper.isAuthenticated, helper.isTenantRegistered, helper.isUserRegistered, cbGetIndex)

module.exports = {
  router: router,
  cbGetIndex: cbGetIndex
}
