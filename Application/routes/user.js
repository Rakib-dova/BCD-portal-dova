'use strict'
const express = require('express')
const router = express.Router()

const helper = require('./helpers/middleware')
// Require our controllers.
const userController = require('../controllers/userController.js')
const validate = require('../lib/validate')
const logger = require('../lib/logger')

const errorHelper = require('./helpers/error')
const tenantController = require('../controllers/tenantController')

// CSR対策
const csrf = require('csurf')
const csrfProtection = csrf({ cookie: false })

const cbGetRegister = async (req, res, next) => {
  if (req.session?.userContext !== 'NotUserRegistered') {
    return next(errorHelper.create(400))
  }

  res.render('user-register', { title: '利用登録', csrfToken: req.csrfToken() })
}

const cbPostRegister = async (req, res, next) => {
  if (req.session?.userContext !== 'NotUserRegistered') {
    return next(errorHelper.create(400))
  }

  if (!req.user?.accessToken || !req.user?.refreshToken) {
    return next(errorHelper.create(500))
  }

  if (req.body?.termsCheck !== 'on') return next(errorHelper.create(400))

  // テナントがnullの場合は登録しないようにする
  const tenant = await tenantController.findOne(req.user?.tenantId)
  if (!tenant) return next(errorHelper.create(500))

  // DBにセッション内のuser情報を登録
  const user = await userController.create(req.user.accessToken, req.user.refreshToken)

  // データベースエラーは、エラーオブジェクトが返る
  if (user instanceof Error) return next(errorHelper.create(500))

  // ユーザはfindOrCreateで登録されるため戻り値userには配列が入る
  if (user !== null && validate.isArray(user)) {
    // userの配列[0]にオブジェクト、配列[1]にcreatedのtrue or false
    // falseの場合は、フォームの二重送信に該当
    if (user[1] === false) {
      const e = new Error('データが二重送信された可能性があります。')
      e.name = 'Bad Request'
      e.status = 400
      e.desc = '既にご利用のユーザーの登録は完了しています。'
      return next(e)
    }

    if (user[0].dataValues?.userId !== req.user.userId) return next(errorHelper.create(500))
    // ユーザ登録成功
    logger.info({ tenant: req.user.tenantId, user: req.user.userId }, 'User Registration Succeeded')
    req.session.userContext = 'UserRegistrationCompleted'
    req.flash('info', '利用登録が完了いたしました。')

    return res.redirect(303, '/portal')
  } else {
    // 失敗したら

    return next(errorHelper.create(500))
  }
}
const cbGetDelete = async (req, res, next) => {
  // ユーザを削除するための動作確認用。開発環境のみ動作。
  if (process.env.NODE_ENV !== 'development') {
    return next(errorHelper.create(500))
  } else {
    const deleted = await userController.delete(req.user.userId)

    // データベースエラーは、エラーオブジェクトが返る
    if (deleted instanceof Error) return next(errorHelper.create(500))

    if (Number(deleted) === 1) {
      logger.info({ tenant: req.user.tenantId, user: req.user.userId }, 'User deleted successfully')
      return res.send('User deleted successfully')
    } else {
      logger.warn({ tenant: req.user.tenantId, user: req.user.userId }, 'Failed to delete user')
      return res.send('Failed to delete user')
    }
  }
}

router.get('/register', helper.isAuthenticated, csrfProtection, cbGetRegister)

// helper.isAuthenticatedがミドルウェアとして入っているとセッションタイムアウトが判定できない
router.post('/register', csrfProtection, cbPostRegister)

// 開発環境のみ動作。テナントが登録されていない場合には削除できないようにする
if (process.env.NODE_ENV === 'development') {
  router.get('/delete', helper.isAuthenticated, helper.isTenantRegistered, helper.isUserRegistered, cbGetDelete)
}

module.exports = {
  router: router,
  cbGetRegister: cbGetRegister,
  cbPostRegister: cbPostRegister,
  cbGetDelete: cbGetDelete
}
