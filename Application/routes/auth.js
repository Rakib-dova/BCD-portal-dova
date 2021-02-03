'use strict'
const express = require('express')
const router = express.Router()
const passport = require('passport')
const logger = require('../lib/logger')
const errorHelper = require('./helpers/error')

// Require our controllers.
const userController = require('../controllers/userController.js')

const cbGetCallback = async (req, res, next) => {
  if (!req.user?.tenantId || !req.user?.userId || !req.user?.refreshToken || !req.user?.accessToken) {
    return next(errorHelper.create(500)) // エラーはnextに渡す
  }

  // ユーザの登録が見つかったら更新
  const user = await userController.findAndUpdate(req.user.userId, req.user.accessToken, req.user.refreshToken)

  // データベースまたはAPIエラーの場合、エラーオブジェクトが入っている
  if (user instanceof Error) return next(errorHelper.create(500))

  logger.info({ tenant: req.user.tenantId, user: req.user.userId }, 'Tradeshift Authentication Succeeded')

  // portalにリダイレクトさせる
  // portalでユーザ登録/テナント登録を判定する
  res.redirect(303, '/portal') // portalへリダイレクトさせる
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
