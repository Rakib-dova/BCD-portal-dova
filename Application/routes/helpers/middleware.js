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
const contractStatuses = constantsDefine.statusConstants.contractStatuses

/**
 * UIDのチェック
 * @param {object} req HTTPリクエストオブジェクト
 * @param {object} res HTTPレスポンスオブジェクト
 * @param {function} next 次の処理
 * @returns {object} エラー画面表示
 */
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

/**
 * UIDとテナントIDのチェック
 * @param {object} req HTTPリクエストオブジェクト
 * @param {object} res HTTPレスポンスオブジェクト
 * @param {function} next 次の処理
 * @returns {object} エラー画面表示
 */
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

/**
 * UIDのチェック
 * バリデーションチェック、DBに登録済みかチェック
 * @param {object} req HTTPリクエストオブジェクト
 * @param {object} res HTTPレスポンスオブジェクト
 * @param {function} next 次の処理
 * @returns {object} エラー画面表示
 */
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

/**
 * contractsステータスチェック
 * @param {uuid} tenantId テナントID
 * @returns {Object} contractsの結果により返却値変更
 */
exports.checkContractStatus = async (tenantId) => {
  const contracts = await contractController.findContract(
    { tenantId: tenantId, serviceType: '010', deleteFlag: false },
    'createdAt DESC'
  )

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

/**
 * OAuth2認証をパスしたかチェック
 * @param {object} req HTTPリクエストオブジェクト
 * @param {object} res HTTPレスポンスオブジェクト
 * @param {function} next 次の処理
 * @returns {Object} エラー画面表示
 */
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
  const bcdContract = contracts.find(
    (contract) => contract.serviceType === serviceTypes.bcd && contract.deleteFlag === false
  )
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

/**
 * 無償契約が契約中、または、簡易変更中ことのチェック
 * @param {object} req HTTPリクエストオブジェクト
 * @param {object} res HTTPレスポンスオブジェクト
 * @param {function} next 次の処理
 * @returns {Object} エラー画面表示
 */
exports.isOnOrChangeContract = async (req, res, next) => {
  // テナントIDに紐付いている未解約無償契約情報を取得
  const contract = await contractController.findOne(req.user?.tenantId)
  const contractStatus = contract?.dataValues?.contractStatus
  if (contract instanceof Error || !contractStatus) return next(errorHelper.create(500))

  if (
    contractStatus === contractStatuses.onContract ||
    contractStatus === contractStatuses.simpleChangeContractOrder ||
    contractStatus === contractStatuses.simpleChangeContractReceive
  ) {
    return next()
  } else if (
    contractStatus === contractStatuses.newContractOrder ||
    contractStatus === contractStatuses.newContractReceive
  ) {
    return next(noticeHelper.create('registerprocedure'))
  } else if (
    contractStatus === contractStatuses.cancellationOrder ||
    contractStatus === contractStatuses.cancellationReceive
  ) {
    return next(noticeHelper.create('cancelprocedure'))
  } else {
    return next(errorHelper.create(500))
  }
}

/**
 * 契約プランのチェック結果を取得
 * @param {object} req HTTPリクエストオブジェクト
 * @param {object} res HTTPレスポンスオブジェクト
 * @param {function} next 次の処理
 */
exports.getContractPlan = async (req, res, next) => {
  // 有償契約チェック
  let isLightPlan = false
  let isIntroductionSupportPlan = false
  let isLightPlanForEntry = false
  let isIntroductionSupportPlanForEntry = false

  const lightPlan = await contractController.findLightPlan(req.user.tenantId)
  if (lightPlan) {
    isLightPlan = true
  }
  const introductionSupportPlan = await contractController.findIntroductionSupportPlan(req.user.tenantId)
  if (introductionSupportPlan) {
    isIntroductionSupportPlan = true
  }

  // スタンダードプランの申し込み
  const lightPlanForEntry = await contractController.findLightPlanForEntry(req.user.tenantId)
  if (lightPlanForEntry) {
    isLightPlanForEntry = true
  }

  // 導入支援プランの申し込み
  const introductionSupportPlanForEntry = await contractController.findIntroductionSupportPlanForEntry(
    req.user.tenantId
  )
  if (introductionSupportPlanForEntry) {
    isIntroductionSupportPlanForEntry = true
  }

  /*
   isLightPlan : スタンダードプラン利用有無（status:12,00）
   isLightPlanForEntry : スタンダードプラン申し込み有無（status:10,11）
   isIntroductionSupportPlan : 導入支援サービス利用有無（status:00）
   isIntroductionSupportPlanForEntry : 導入支援サービス申し込み有無（status:10,11,12）
   */
  const contractPlan = {
    isLightPlan: isLightPlan,
    isIntroductionSupportPlan: isIntroductionSupportPlan,
    isLightPlanForEntry: isLightPlanForEntry,
    isIntroductionSupportPlanForEntry: isIntroductionSupportPlanForEntry
  }

  req.contractPlan = contractPlan
  next()
}

/**
 * 管理者権限のチェック
 * @param {object} req HTTPリクエストオブジェクト
 * @param {object} res HTTPレスポンスオブジェクト
 * @param {function} next 次の処理
 * @returns {Object} メッセージステータス
 */
exports.isTenantManager = async (req, res, next) => {
  const user = await userController.findOne(req.user?.userId)
  // データベースエラー、または、ユーザ未登録の場合もエラーを上げる
  if (user instanceof Error || user === null) return next(errorHelper.create(500))

  if (user.dataValues?.userRole !== constantsDefine.userRoleConstants.tenantManager) {
    return next(noticeHelper.create('generaluser'))
  }
  return next()
}
