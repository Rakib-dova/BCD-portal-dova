/**
 * 会員サイト連携コントローラー
 * 会員サイト連携用処理
 */
'use strict'

const logger = require('../../lib/logger')
const errorHelper = require('../../routes/helpers/error')
const memberSiteControllerDao = require('../daos/memberSiteControllerDao')
const libCrypt = require('../lib/libCrypt')
const MemberSiteCoopSessionDto = require('../dtos/memberSiteSessionDto')
const logMessageDefine = require('../../constants').logMessage

/**
 * 会員サイトアプリ一覧連携用処理
 * アプリ一覧からの遷移処理を制御する
 */
const oauthTransfer = async (req, res, next) => {
  logger.info(logMessageDefine.INF000 + 'oauthTransfer')
  try {
    // 会員サイト連携セッションがない場合は作成
    const mSiteSessionDto = req.session?.memberSiteCoopSession || new MemberSiteCoopSessionDto()
    logger.trace(mSiteSessionDto)

    /* デジタルトレードトークン検証 */
    // Token所持の確認
    if (req.cookies?.digitaltradeToken === undefined) {
      // デジタルトレードトークンを保持せずアクセスしている為、不正アクセスとする。
      logger.error('ERR-MB100 ILLEGAL Access:No digitaltradeToken')
      return next(errorHelper.create(400))
    }
    // デジタルトレードトークンの妥当性検証
    logger.debug({ 'req.cookies.digitaltradeToken': req.cookies.digitaltradeToken }, 'oauthTransfer')
    const result = await privateFunc.cookieTokenVerify(req.cookies.digitaltradeToken, mSiteSessionDto)
    if (result instanceof Error) {
      logger.trace('cookieTokenVerify Error')
      if (result.name === 'ILLEGAL_TOKEN') {
        logger.trace('ILLEGAL_TOKEN')
        return next(errorHelper.create(400))
      } else {
        logger.trace('Not ILLEGAL_TOKEN')
        return next(errorHelper.create(500))
      }
    }
    /* デジタルトレードトークン検証 */

    /* 正常終了処理 */
    // 利用状況パラメータを設定
    mSiteSessionDto.memberSiteFlg = true
    mSiteSessionDto.bcdAppValidFlg = true
    mSiteSessionDto.tradeshiftRedirectExecutionFlg = true
    mSiteSessionDto.fingerprintVerifyFlg = false
    req.session.memberSiteCoopSession = mSiteSessionDto

    // 受領済みの為TokenCookieを削除
    res.clearCookie(process.env.BCA_BC_COOKIE_NAME, {
      httpOnly: process.env.BCA_BC_COOKIE_HTTP_ONLY,
      domain: process.env.BCA_BC_COOKIE_DOMAIN,
      path: process.env.BCA_BC_COOKIE_PATH,
      secure: process.env.BCA_BC_COOKIE_SECURE,
      sameSite: process.env.BCA_BC_COOKIE_SAME_SITE
    })

    logger.debug({ 'req.session.memberSiteCoopSession': req.session.memberSiteCoopSession }, 'oauthTransfer')
    logger.info(logMessageDefine.INF001 + 'oauthTransfer')
    return next()
  } catch (error) {
    logger.error({ error: error.message }, 'ERR-MB999 RunTime Error')
    return next(errorHelper.create(500))
  }
}

/**
 * oauthCallback受領時の遷移を制御する。
 * 会員サイト連携の場合は、ID紐づけ等を実施する。
 * 連携しない場合は、処理を通過する。
 */
const oauthCallbackTransfer = async (req, res, next) => {
  logger.info(logMessageDefine.INF000 + 'oauthCallbackTransfer')

  try {
    // 会員サイト連携セッションがない場合は作成
    const mSiteSessionDto = req.session?.memberSiteCoopSession || new MemberSiteCoopSessionDto()
    logger.trace(mSiteSessionDto)

    // oauth実行検証
    if (!req.session || !req.user?.userId) {
      logger.error('ERR-MB101 Illegal transition:oauth NG')
      return next(errorHelper.create(500))
    }
    mSiteSessionDto.tradeshiftUserId = req.user.userId
    mSiteSessionDto.tradeshiftTenantId = req.user.tenantId

    if (req.cookies?.digitaltradeToken !== undefined) {
      logger.trace(
        { 'req.cookies.digitaltradeToken': req.cookies?.digitaltradeToken },
        'Cookie Receive : oauthCallbackTransfer'
      )
      // デジトレトークンを受領した場合
      // デジタルトレードトークンの妥当性検証
      const result = await privateFunc.cookieTokenVerify(req.cookies.digitaltradeToken, mSiteSessionDto)
      if (result instanceof Error) {
        if (result.name === 'ILLEGAL_TOKEN') {
          return next(errorHelper.create(400))
        } else {
          return next(errorHelper.create(500))
        }
      }

      // 利用状況パラメータ設定 ※アプリ有効化画面からの遷移とみなす
      mSiteSessionDto.memberSiteFlg = true
      mSiteSessionDto.bcdAppValidFlg = false
      mSiteSessionDto.tradeshiftRedirectExecutionFlg = false
      mSiteSessionDto.fingerprintVerifyFlg = false

      // 受領済みの為TokenCookieを削除
      res.clearCookie(process.env.BCA_BC_COOKIE_NAME, {
        httpOnly: process.env.BCA_BC_COOKIE_HTTP_ONLY,
        domain: process.env.BCA_BC_COOKIE_DOMAIN,
        path: process.env.BCA_BC_COOKIE_PATH,
        secure: process.env.BCA_BC_COOKIE_SECURE,
        sameSite: process.env.BCA_BC_COOKIE_SAME_SITE
      })
    }

    // 利用状況の判定
    // 「トレードシフトOauhtエンドポイント」を使用したかの判定
    if (mSiteSessionDto.memberSiteFlg && mSiteSessionDto.bcdAppValidFlg) {
      // アプリ一覧 直接起動からの遷移
      logger.info('INF-MB102 App list transition')
      // 利用状況パラメータはセッション情報を引き継ぐ為、設定無
    } else if (mSiteSessionDto.memberSiteFlg && !mSiteSessionDto.bcdAppValidFlg) {
      // アプリ一覧 有効化手順画面からの遷移
      logger.info('INF-MB103 App activation procedure screen')
    } else {
      // 会員サイトを利用していない場合
      logger.info('INF-MB104 No use of member site')
      // 利用状況パラメータはセッション情報を引き継ぐ為、設定無
    }

    logger.debug({ mSiteSessionDto: mSiteSessionDto }, 'oauthCallbackTransfer')

    // トレードシフトへのリダイレクトを実施するか判定
    if (mSiteSessionDto.tradeshiftRedirectExecutionFlg) {
      logger.trace('go to tradeshift')
      // リダイレクトFLGをOFFに設定
      mSiteSessionDto.tradeshiftRedirectExecutionFlg = false
      req.session.memberSiteCoopSession = mSiteSessionDto
      logger.debug({ 'req.session.memberSiteCoopSession': req.session.memberSiteCoopSession }, 'oauthCallbackTransfer')
      logger.info(logMessageDefine.INF001 + 'oauthCallbackTransfer')
      // トレードシフトフレームにリダイレクト
      res.redirect(303, 'https://' + process.env.TS_HOST + '/#/' + process.env.TS_CLIENT_ID)
    } else {
      logger.trace('not go to tradeshift')
      // 既存動作（リダイレクトしない）
      req.session.memberSiteCoopSession = mSiteSessionDto
      logger.debug({ 'req.session.memberSiteCoopSession': req.session.memberSiteCoopSession }, 'oauthCallbackTransfer')
      logger.info(logMessageDefine.INF001 + 'oauthCallbackTransfer')
      return next()
    }
  } catch (error) {
    logger.error({ error: error.message }, 'ERR-MB999 RunTime Error')
    return next(errorHelper.create(500))
  }
}

/**
 * ID紐づけ処理
 * デジタルトレードIDとトレードシフトID情報の紐づけを行う。
 * ただし、トレードシフトID情報に変更がない場合は紐づけを行わない。
 * また、ID紐づけはfingerprint値の検証が完了後のみ実施する。
 */
const idAssociation = async (mSiteSessionDto) => {
  logger.info(logMessageDefine.INF000 + 'idAssociation')
  logger.debug({ mSiteSessionDto: mSiteSessionDto }, 'idAssociation')
  try {
    // fingerprintの検証が完了している場合、ID紐づけを実施
    if (mSiteSessionDto.fingerprintVerifyFlg) {
      logger.trace('idAssociation:fingerprint verified')
      // 現在の紐づけ情報の取得
      const serviceLinkageInfo = await memberSiteControllerDao.getServiceLinkageIdBydigitaltradeId(
        mSiteSessionDto.digitaltradeId
      )
      if (serviceLinkageInfo instanceof Error) {
        return serviceLinkageInfo
      } else if (serviceLinkageInfo === null) {
        // 紐づけ情報がない場合、新規登録
        logger.info('INF-MB105 No ServiceLinkageId')
        const insertResult = await memberSiteControllerDao.createServiceLinkageId(mSiteSessionDto)
        if (insertResult instanceof Error) {
          return insertResult
        }
      } else {
        logger.info('INF-MB106 ServiceLinkageId exists')
        // 紐づけ情報がある場合、トレシフID情報に変更があるかを確認
        logger.debug(
          {
            'serviceLinkageInfo.serviceUserId': serviceLinkageInfo.serviceUserId,
            'mSiteSessionDto.tradeshiftUserId': mSiteSessionDto.tradeshiftUserId
          },
          'idAssociation'
        )
        logger.debug(
          {
            'serviceLinkageInfo.serviceSubId': serviceLinkageInfo.serviceSubId,
            'mSiteSessionDto.tradeshiftTenantId': mSiteSessionDto.tradeshiftTenantId
          },
          'idAssociation'
        )
        if (
          serviceLinkageInfo.serviceUserId !== mSiteSessionDto.tradeshiftUserId ||
          serviceLinkageInfo.serviceSubId !== mSiteSessionDto.tradeshiftTenantId
        ) {
          // ID情報が変更されている場合
          logger.info('INF-MB107 ID info has been changed')
          // ID紐づけ更新処理
          const updateResult = await memberSiteControllerDao.updateServiceLinkageId(mSiteSessionDto)
          if (updateResult instanceof Error) {
            return updateResult
          }
        } else {
          // ID情報が変更されていない場合
          logger.info('INF-MB108 ID info has not changed')
        }
      }
    }
    logger.info(logMessageDefine.INF001 + 'idAssociation')
    return true
  } catch (error) {
    logger.error({ error: error.message }, 'ERR-MB999 idAssociation:Runtime error')
    return error
  }
}

/**
 * デジタルトレードToken検証処理
 * Cookie（JWT）の値を検証する
 * @param {*} jwtToken
 * @param {*} mSiteSessionDto
 * @returns
 */
const cookieTokenVerify = async (jwtToken, mSiteSessionDto) => {
  try {
    logger.info(logMessageDefine.INF000 + 'cookieTokenVerify')
    logger.debug({ jwtToken: jwtToken }, 'cookieTokenVerify')

    // Cookie値の検証（JWT検証）
    const jwtVerifyResult = libCrypt.decodeJwtToken(jwtToken)
    logger.debug({ jwtVerifyResult: jwtVerifyResult }, 'cookieTokenVerify')
    if (jwtVerifyResult === null) {
      // 不正JWTの受領
      logger.error('ERR-MB109 Received invalid JWT')
      const error = new Error('Illegal JWT Error')
      error.name = 'ILLEGAL_TOKEN'
      return error
    }
    // トークン値の検証
    const digitaltaldeTokenInfo = await memberSiteControllerDao.getDigitaltradeTokenBydtToken(
      JSON.parse(jwtVerifyResult).sub
    )
    if (digitaltaldeTokenInfo instanceof Error) {
      return digitaltaldeTokenInfo
    }
    logger.debug({ digitaltaldeTokenInfo: digitaltaldeTokenInfo }, 'cookieTokenVerify')
    // デジタルトレードトークン情報が取得できない場合はエラー
    if (digitaltaldeTokenInfo === null) {
      logger.error('ERR-MB110 Received invalid digitaltradeToken')
      const error = new Error('Illegal digitaltradeToken Error')
      error.name = 'ILLEGAL_TOKEN'
      return error
    }

    // デジタルトレードトークン値の更新（Token受領FLGを受領済（true））
    const updateResult = await memberSiteControllerDao.updateDtTokenFlg(digitaltaldeTokenInfo.dtToken)
    if (updateResult instanceof Error) {
      logger.trace('updateDtTokenFlg ERROR')
      return updateResult
    }

    // 正常終了
    mSiteSessionDto.digitaltradeToken = digitaltaldeTokenInfo.dtToken
    mSiteSessionDto.digitaltradeId = digitaltaldeTokenInfo.digitaltradeId

    logger.info(logMessageDefine.INF001 + 'cookieTokenVerify')
    return true
  } catch (error) {
    logger.error({ error: error.message }, 'ERR-MB999 cookieTokenVerify:Runtime error')
    return error
  }
}

/**
 * fingerprint検証制御処理
 * @param {*} req
 * @param {*} res
 * @param {*} next
 */
const idLinkingProcess = async (req, res, next) => {
  logger.info(logMessageDefine.INF000 + 'idLinkingProcess')
  try {
    // 会員サイト連携セッションがない場合は作成
    const mSiteSessionDto = req.session?.memberSiteCoopSession || new MemberSiteCoopSessionDto()
    logger.trace({ mSiteSessionDto: mSiteSessionDto })

    // oauth実行検証
    if (!req.session || !req.user?.userId) {
      logger.error('ERR-MB101 Illegal transition:oauth NG')
      return next(errorHelper.create(500))
    }

    // fingerprint 検証
    const fingerprintString = req.body?.fingerprint
    if (!fingerprintString) {
      // fingerpritパラメータを受領していない場合
      logger.error('ERR-MB111 fingerprint is undefined')
      return next(errorHelper.create(400))
    } else {
      logger.trace({ fingerprintString: fingerprintString }, 'fingerprint Recive : idLinkingProcess')

      if (!mSiteSessionDto.fingerprintVerifyFlg) {
        // fingerprintをデジトレトークン情報と検証する
        const fingerprintVerifyResult = await privateFunc.fingerprintVerify(fingerprintString, mSiteSessionDto)
        if (fingerprintVerifyResult instanceof Error) {
          if (fingerprintVerifyResult.name === 'ILLEGAL_FINGERPRINT') {
            logger.trace('idLinkingProcess:Illegal fingerprint')
            return next(errorHelper.create(400))
          } else {
            return next(errorHelper.create(500))
          }
        } else {
          // fingerprint検証成功の場合
          // デジトレトークンを削除
          const deleteResult = await memberSiteControllerDao.deleteDigitaltradeToken(mSiteSessionDto)
          if (deleteResult instanceof Error) {
            return next(errorHelper.create(500))
          }
          mSiteSessionDto.fingerprintVerifyFlg = true
        }
      }
    }

    // ID紐づけ処理
    const idAssociationResult = await privateFunc.idAssociation(mSiteSessionDto)
    if (idAssociationResult instanceof Error) {
      return next(errorHelper.create(500))
    }

    // セッションに設定
    req.session.memberSiteCoopSession = mSiteSessionDto
    logger.info(logMessageDefine.INF001 + 'idLinkingProcess')
    return next()
  } catch (error) {
    logger.error({ error: error.message }, 'ERR-MB999 idLinkingProcess:Runtime error')
    return next(errorHelper.create(500))
  }
}

/**
 * fingerprint値の検証処理
 * @param {*} fingerprint
 * @param {*} mSiteSessionDto
 */
const fingerprintVerify = async (fingerprint, mSiteSessionDto) => {
  logger.info(logMessageDefine.INF000 + 'fingerprintVerify')
  logger.debug({ fingerprint: fingerprint }, 'fingerprintVerify')
  try {
    // トークン値の取得
    const digitaltaldeTokenInfo = await memberSiteControllerDao.getFingerprintBydigitaltradeId(
      mSiteSessionDto.digitaltradeId,
      mSiteSessionDto.digitaltradeToken
    )
    if (digitaltaldeTokenInfo instanceof Error) {
      return digitaltaldeTokenInfo
    }

    logger.debug({ digitaltaldeTokenInfo: digitaltaldeTokenInfo }, 'fingerprintVerify')

    // fingerprint値が検証NGの場合はエラー
    if (digitaltaldeTokenInfo?.fingerprint !== fingerprint) {
      logger.error('ERR-MB112 fingerprintVerify:Illegal fingerprint')
      const error = new Error('Illegal Fingerprint Error')
      error.name = 'ILLEGAL_FINGERPRINT'
      return error
    }

    logger.info(logMessageDefine.INF001 + 'fingerprintVerify')
    return true
  } catch (error) {
    logger.error({ error: error.message }, 'ERR-MB999 fingerprintVerify:Runtime error')
    return error
  }
}

const privateFunc = {
  idAssociation: idAssociation,
  cookieTokenVerify: cookieTokenVerify,
  fingerprintVerify: fingerprintVerify
}

module.exports = {
  oauthTransfer: oauthTransfer,
  oauthCallbackTransfer: oauthCallbackTransfer,
  idLinkingProcess: idLinkingProcess,
  privateFunc: privateFunc
}
