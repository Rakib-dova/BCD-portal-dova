'use strict'
// Require our controllers.
const userController = require('../../controllers/userController')
const tenantController = require('../../controllers/tenantController')

const errorHelper = require('./error')
const validate = require('../../lib/validate')
exports.isAuthenticated = async (req, res, next) => {
  if (req.user?.userId) {
    // セッションにユーザ情報が格納されている
    // TODO: 将来的には、セッション情報に前のアカウント情報が残っていて、異なるアカウントでTradeshiftにログインした場合の判定が必要か

    if (!validate.isUUID(req.user?.userId)) {
      return next(errorHelper.create(500))
    }

    next()
  } else {
    // authに飛ばす HTTP1.1仕様に従い303を使う
    // https://developer.mozilla.org/ja/docs/Web/HTTP/Status/303
    res.redirect(303, '/auth')
  }
}

exports.isTenantRegistered = async (req, res, next) => {
  // 認証済みかどうか。未認証であれば/authにredirect（後続の処理は行わない）
  if (!req.user?.userId || !req.user?.companyId) return res.redirect(303, '/auth')

  if (!validate.isUUID(req.user?.userId) || !validate.isUUID(req.user?.companyId)) {
    return next(errorHelper.create(500))
  }

  // テナントがアカウント管理者によって登録されているか
  const tenant = await tenantController.findOne(req.user.companyId)

  // テナントが見つからない場合はnull値
  if (tenant === null) {
    // テナントがDBに登録されていない
    req.session.userContext = 'NotTenantRegistered' // セッションにテナント未登録のコンテキストを保持

    res.redirect(303, '/tenant/register') // registerへリダイレクトさせる
  } else if (tenant.dataValues?.tenantId) {
    // テナントがDBに登録されている

    next()
  } else {
    // dataValuesやtenantIdがundefined（異常系）
    next(errorHelper.create(500))
  }
}

exports.isUserRegistered = async (req, res, next) => {
  if (!req.user?.userId) return res.redirect(303, '/auth')

  if (!validate.isUUID(req.user?.userId)) {
    return next(errorHelper.create(500))
  } // userIdのバリデーション

  // isRegistered? ユーザが登録されているか
  const user = await userController.findOne(req.user.userId)

  // ユーザが見つからない場合null値になる
  if (user === null) {
    // ユーザがDBに登録されていない
    req.session.userContext = 'NotUserRegistered' // セッションにユーザ未登録のコンテキストを保持

    res.redirect(303, '/user/register') // registerへリダイレクトさせる
  } else if (user.dataValues?.userId) {
    // ユーザがDBに登録されている

    next()
  } else {
    next(errorHelper.create(500)) // エラーはnextに渡す
  }
}
