'use strict'
const express = require('express')
const router = express.Router()

const helper = require('./helpers/middleware')
// Require our controllers.
const userController = require('../controllers/userController.js')

const logger = require('../lib/logger')

const errorHelper = require('./helpers/error')

router.get('/register', helper.isAuthenticated, async (req, res, next) => {
  errorHelper.checkUserContext(req.session?.userContext, 'NotUserRegistered', next)

  res.render('registerUser', { title: '利用登録' })
})

router.post('/register', helper.isAuthenticated, async (req, res, next) => {
  errorHelper.checkUserContext(req.session?.userContext, 'NotUserRegistered', next)

  errorHelper.checkUserTokens(req.user?.accessToken, req.user?.refreshToken, next)

  // TODO: Subspere経由でSO系にformの内容を送信

  // TODO: DBにセッション内のuser情報を登録
  let user
  try {
    user = await userController.create(req.user.accessToken, req.user.refreshToken)
  } catch (error) {
    return next(errorHelper.create(500))
  }

  if (user !== null) {
    // ユーザ登録成功したら
    logger.info({ tenant: req.user.companyId, user: req.user.userId }, 'User Registration Succeeded')

    return res.redirect('/portal')
  } else {
    // 失敗したら

    return next(errorHelper.create(500))
  }
})

router.get('/delete', helper.isAuthenticated, helper.isTenantRegistered, helper.isUserRegistered, async (req, res, next) => {
  const deleted = await userController.delete(req.user.userId)

  if (Number(deleted) === 1) {
    logger.info({ tenant: req.user.companyId, user: req.user.userId }, 'User deleted successfully')
    res.send('User deleted successfully')
  } else {
    logger.warn({ tenant: req.user.companyId, user: req.user.userId }, 'Failed to delete user')
    res.send('Failed to delete user')
  }
})

module.exports = router
