'use strict'
// Require our controllers.
const userController = require('../../controllers/userController')
const tenantController = require('../../controllers/tenantController')
const contractController = require('../../controllers/contractController')

const noticeHelper = require('./notice')
const errorHelper = require('./error')
const validate = require('../../lib/validate')
const constantsDefine = require('../../constants')
const serviceTypes = constantsDefine.statusConstants.serviceTypes

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

  // ユーザが見つからない場合はnull値
  if (user === null) {
    // ユーザがDBに登録されていない
    await userController.create(req.user.accessToken, req.user.refreshToken)
    next()
  } else if (user.dataValues?.tenantId) {
    // ユーザがDBに登録されている
    next()
  } else {
    // dataValuesやtenantIdがundefined（異常系）
    next(errorHelper.create(500))
  }
}

exports.checkContractStatus = async (tenantId) => {
  const contracts = await contractController.findContract({ tenantId: tenantId, serviceType: '010', deleteFlag: false }, 'createdAt DESC')

  // DB検索エラーの場合
  if (contracts instanceof Error) {
    return null
  }

  // contracts nullの場合
  if (contracts === null) {
    return null
  }

  // 契約状態返却、999は異常系の状態
  if (contracts.dataValues?.contractStatus) {
    return contracts.dataValues?.contractStatus
  } else {
    return 999
  }
}

exports.bcdAuthenticate = async (req, res, next) => {
  // ==========================================================================
  // TS OAuth2認証をパスしたか確認
  // ==========================================================================
  if (req.user?.userId) {
    // セッションにユーザ情報が格納されている
    // TODO: 将来的には、セッション情報に前のアカウント情報が残っていて、異なるアカウントでTradeshiftにログインした場合の判定が必要か
    if (!validate.isUUID(req.user?.userId)) {
      if (req.method === 'DELETE') {
        return res.send({ result: 0 })
      } else {
        return next(errorHelper.create(500))
      }
    }
  } else {
    if (req.method === 'DELETE') {
      return res.send({ result: 0 })
    } else {
      // authに飛ばす HTTP1.1仕様に従い303を使う
      // https://developer.mozilla.org/ja/docs/Web/HTTP/Status/303
      return res.redirect(303, '/auth')
    }
  }

  // ==========================================================================
  // DBのユーザー情報確認
  // ==========================================================================
  const user = await userController.findOne(req.user.userId)
  // データベースエラーは、エラーオブジェクトが返る
  // user未登録の場合もエラーを上げる
  if (user instanceof Error || user === null) {
    if (req.method === 'DELETE') {
      return res.send({ result: 0 })
    } else {
      return next(errorHelper.create(500))
    }
  }

  // TX依頼後に改修、ユーザステイタスが0以外の場合、「404」エラーとする not 403
  if (user.dataValues?.userStatus !== 0) {
    if (req.method === 'DELETE') {
      return res.send({ result: 0 })
    } else {
      return next(errorHelper.create(404))
    }
  }

  // ユーザ権限を session に保存
  req.session.userRole = user.dataValues?.userRole

  // ==========================================================================
  // DBの契約情報確認
  // ==========================================================================

  // テナントIDに紐付いている全ての契約情報を取得
  const contracts = await contractController.findContractsBytenantId(req.user.tenantId)
  if (!contracts || !Array.isArray(contracts) || contracts.length === 0) {
    if (req.method === 'DELETE') {
      return res.send({ result: 0 })
    } else {
      return next(errorHelper.create(500))
    }
  }

  // BCD無料アプリの契約情報確認
  const bcdContract = contracts.find((contract) => contract.serviceType === serviceTypes.bcd && contract.deleteFlag === false)
  if (!bcdContract || !bcdContract.contractStatus) {
    if (req.method === 'DELETE') {
      return res.send({ result: 0 })
    } else {
      return next(errorHelper.create(500))
    }
  }

  // 現在解約中か確認
  if (validate.isBcdCancelling(bcdContract)) {
    if (req.method === 'DELETE') {
      return res.send({ result: 0 })
    } else {
      return next(noticeHelper.create('cancelprocedure'))
    }
  }

  req.dbUser = user
  req.contracts = contracts
  next()
}
