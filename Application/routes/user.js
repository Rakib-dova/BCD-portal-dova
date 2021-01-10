'use strict'
const express = require('express')
const router = express.Router()

const helper = require('./helpers/middleware')
// Require our controllers.
const userController = require('../controllers/userController.js')
const validate = require('../lib/validate')
const logger = require('../lib/logger')

const errorHelper = require('./helpers/error')

const cbGetRegister = async (req, res, next) => {
  if (req.session?.userContext !== 'NotUserRegistered') {
    return next(errorHelper.create(400))
  }

  res.render('user-register', { title: '利用登録' })
}

const cbPostRegister = async (req, res, next) => {
  if (req.session?.userContext !== 'NotUserRegistered') {
    return next(errorHelper.create(400))
  }

  if (!req.user?.accessToken || !req.user?.refreshToken) {
    return next(errorHelper.create(500))
  }
  // TODO: SO系にフォームの内容を送信
  // （サービス仕様の確定によっては上記不要）

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

    return res.redirect('/portal')
  } else {
    // 失敗したら

    return next(errorHelper.create(500))
  }
}

const cbGetDelete = async (req, res, next) => {
  // TODO: ユーザを削除するための動作確認用。リリース時は削除。
  const deleted = await userController.delete(req.user.userId)

  // データベースエラーは、エラーオブジェクトが返る
  if (deleted instanceof Error) return next(errorHelper.create(500))

  if (Number(deleted) === 1) {
    logger.info({ tenant: req.user.tenantId, user: req.user.userId }, 'User deleted successfully')
    res.send('User deleted successfully')
  } else {
    logger.warn({ tenant: req.user.tenantId, user: req.user.userId }, 'Failed to delete user')
    res.send('Failed to delete user')
  }
}

router.get('/register', helper.isAuthenticated, cbGetRegister)

router.post('/register', helper.isAuthenticated, cbPostRegister)

router.get('/delete', helper.isAuthenticated, helper.isUserRegistered, cbGetDelete)

module.exports = {
  router: router,
  cbGetRegister: cbGetRegister,
  cbPostRegister: cbPostRegister,
  cbGetDelete: cbGetDelete
}
