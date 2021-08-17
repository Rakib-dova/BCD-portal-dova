'use strict'
// Require our controllers.
const userController = require('../../controllers/userController')
const tenantController = require('../../controllers/tenantController')
const contractController = require('../../controllers/contractController')

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
  if (!req.user?.userId || !req.user?.tenantId) return res.redirect(303, '/auth')

  if (!validate.isUUID(req.user?.userId) || !validate.isUUID(req.user?.tenantId)) {
    return next(errorHelper.create(500))
  }

  // テナントがアカウント管理者によって登録されているか
  const tenant = await tenantController.findOne(req.user.tenantId)

  // データベースエラーは、エラーオブジェクトが返る
  if (tenant instanceof Error) return next(errorHelper.create(500))

  // テナントが見つからない場合はnull値 or テナントがDBに登録されていて解約されている
  // TODO：契約テーブルのdeleteFlagも要確認
  if (tenant === null || (tenant.dataValues?.tenantId && tenant.dataValues.deleteFlag)) {
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

  // データベースエラーは、エラーオブジェクトが返る
  if (user instanceof Error) return next(errorHelper.create(500))

  // テナントが見つからない場合はnull値
  if (user === null) {
    // テナントがDBに登録されていない
    await userController.create(req.user.accessToken, req.user.refreshToken)
    next()
  } else if (user.dataValues?.tenantId) {
    // テナントがDBに登録されている
    next()
  } else {
    // dataValuesやtenantIdがundefined（異常系）
    next(errorHelper.create(500))
  }
}

exports.checkContractStatus = async (req, res, next) => {
  if (!req.user?.userId) return res.redirect(303, '/auth')

  if (!validate.isUUID(req.user?.userId)) {
    return next(errorHelper.create(500))
  } // userIdのバリデーション

  // テナント情報検索
  const tenant = await tenantController.findOne(req.user.tenantId)

  // DB検索エラーの場合
  if (tenant instanceof Error) return next(errorHelper.create(500))

  let tenantId = tenant?.dataValues.tenantId

  if (!tenantId) {
    tenantId = req.user.tenantId
  }

  let contracts = await contractController.findContract({ tenantId: tenantId }, 'createdAt DESC')

  // DB検索エラーの場合
  if (contracts instanceof Error) return next(errorHelper.create(500))

  if (tenant === null && contracts === null) {
    return null
  }

  if (Object.prototype.toString.call(contracts) === '[object Array]') {
    contracts.forEach((contract) => {
      if (contract.dataValues.deleteFlag === false) {
        contracts = contract
      }
    })
  }

  // 契約状態返却、999は異常系の状態
  if (contracts.dataValues?.contractStatus) {
    return contracts.dataValues?.contractStatus
  } else {
    return 999
  }
}
