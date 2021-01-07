'use strict'
const express = require('express')
const router = express.Router()
const passport = require('passport')
const logger = require('../lib/logger')
const errorHelper = require('./helpers/error')

// Require our controllers.
const userController = require('../controllers/userController.js')

const cbGetCallback = async (req, res, next) => {
  if (!req.user?.companyId || !req.user?.userId || !req.user?.refreshToken) {
    return next(errorHelper.create(500)) // エラーはnextに渡す
  }

  logger.info({ tenant: req.user.companyId, user: req.user.userId }, 'Tradeshift Authentication Succeeded')

  // ユーザの登録が見つかったら更新
  await userController.findAndUpdate(req.user.userId, req.user.accessToken, req.user.refreshToken)

  // portalにリダイレクトさせる
  // portalでユーザ登録/テナント登録を判定する
  res.redirect('/portal') // portalへリダイレクトさせる
}

const cbGetFailure = (req, res, next) => {
  next(errorHelper.create(500)) // エラーはnextに渡す
}

router.get('/', passport.authenticate('tradeshift', { scope: 'openid offline' }))

router.get('/callback', passport.authenticate('tradeshift', { failureRedirect: '/auth/failuer' }), cbGetCallback)

router.get('/failure', cbGetFailure)

module.exports = {
  router: router,
  cbGetCallback: cbGetCallback,
  cbGetFailure: cbGetFailure
}
