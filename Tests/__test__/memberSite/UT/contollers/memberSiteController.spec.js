/**
 * 会員サイト連携コントローラーUTテスト
 * @author yaisobe
 */
'use strict'
if (process.env.LOCALLY_HOSTED === 'true') {
  const result = require('dotenv').config({ path: '../Application/config/.env' })
  process.env.INVOICE_UPLOAD_PATH = result.parsed.INVOICE_UPLOAD_PATH
}
require('../../../../../Application/lib/setenv').config(process.env)

// モック設定
jest.mock('../../../../../Application/routes/helpers/error.js')
jest.mock('../../../../../Application/memberSite/daos/memberSiteControllerDao.js')

// テスト対象モジュール
const memberSiteController = require('../../../../../Application/memberSite/controllers/memberSiteController.js')

// テスト準備セット
const Request = require('jest-express').Request
const Response = require('jest-express').Response
const next = require('jest-express').Next
const logger = require('../../../../../Application/lib/logger.js')
const errorHelper = require('../../../../../Application/routes/helpers/error.js')
const MemberSiteCoopSessionDto = require('../../../../../Application/memberSite/dtos/memberSiteSessionDto')
const logMessageDefine = require('../../../../../Application/constants').logMessage

// テスト対象利用ライブラリ（モック対象）
const menberSiteControllerDao = require('../../../../../Application/memberSite/daos/memberSiteControllerDao.js')
const libCrypt = require('../../../../../Application/memberSite/lib/libCrypt.js')

// 環境変数設定
// process.env.BCA_JWT_HMAC_KEY = 'pajamas-crouch-repackage'
// process.env.TS_HOST = 'test_host'
// process.env.TS_CLIENT_ID = 'test_client_id'

/* テスト内デフォルト定数 */
const dtToken = 'dummyDtToken'
// JWTクレーム
const jwtJson = JSON.stringify({
  iss: 'digitaltradeMemberSite',
  sub: dtToken,
  exp: Date.now() + 5000,
  iat: Date.now()
})

// JWTトークン
const jwtToken =
  'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.IntcImlzc1wiOlwiZGlnaXRhbHRyYWRlTWVtYmVyU2l0ZVwiLFwic3ViXCI6XCJhYWFhYWFhXCIsXCJleHBcIjoxNjQwNDAxOTQ2MDQzLFwiaWF0XCI6MTY0MDQwMTk0MTA0M30i.jdhTYCksxHvn46usPS6P9kAGLaFUV7qfibpvlsaQxlU'
// デジタルトレードトークンテーブル取得値
const digitaltradeTokenDBMember = { dtToken: dtToken, digitaltradeId: 'dummyDigitaltradeId' }
// トレードシフトID情報
const tradeshiftUserInfo = {
  tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089',
  userId: '976d46d7-cb0b-48ad-857d-4b42a44ede13',
  accessToken: 'dummyAccessToken',
  refreshToken: 'dummyRefreshToken'
}
// サービス連携ID情報
const serviceLinkageInfo = {
  serviceUserId: tradeshiftUserInfo.userId,
  serviceSubId: tradeshiftUserInfo.tenantId
}
const digitaltaldeTokenInfo = {
  dtToken: digitaltradeTokenDBMember.dtToken,
  digitaltradeId: digitaltradeTokenDBMember.digitaltradeId,
  fingerprint: '67d9daeab3acb866f2746549f700b362',
  tokenCategory: 'TRS',
  expireDate: Date.now() + 100000
}
const dummyError = new Error('mock error')

// 変数宣言
let request, response
// Spy変数
let loggerInfoSpy, loggerErrorSpy, loggerTraceSpy
let helplerCreateSpy
// 変数
let memberSiteSessionDto

// テストコード
describe('memberSiteController UTテスト', () => {
  beforeEach(() => {
    request = new Request()
    response = new Response()

    loggerInfoSpy = jest.spyOn(logger, 'info')
    loggerErrorSpy = jest.spyOn(logger, 'error')
    loggerTraceSpy = jest.spyOn(logger, 'trace')
    helplerCreateSpy = jest.spyOn(errorHelper, 'create')

    // memberSiteSessionDto = new MemberSiteCoopSessionDto()
  })
  afterEach(() => {
    request.resetMocked()
    response.resetMocked()
    next.mockReset()

    helplerCreateSpy.mockRestore()
    loggerInfoSpy.mockRestore()
    loggerErrorSpy.mockRestore()
    loggerTraceSpy.mockRestore()
  })

  describe('01 oauthTransfer UTテスト', () => {
    const functionName = 'oauthTransfer'
    let cookieTokenVerifySpy
    beforeEach(() => {
      cookieTokenVerifySpy = jest.spyOn(memberSiteController.privateFunc, 'cookieTokenVerify')
    })
    afterEach(() => {
      cookieTokenVerifySpy.mockRestore()
    })
    describe('02 ログ出力', () => {
      beforeEach(() => {
        request.session = {}
        memberSiteSessionDto = new MemberSiteCoopSessionDto()
      })
      afterEach(() => {})
      test('01 開始・終了ログの出力', async () => {
        /* テスト条件設定 */
        // セッション定義
        // cookieの設定：設定無
        request.cookies = { digitaltradeToken: jwtToken }
        // デジトレトークン検証結果設定：正常
        cookieTokenVerifySpy.mockReturnValue(Object)

        // 試験対象関数実行
        logger.trace({ testCase: expect.getState().currentTestName }, '======= 開始 =======')
        await memberSiteController.oauthTransfer(request, response, next)
        expect(loggerInfoSpy).toHaveBeenNthCalledWith(1, logMessageDefine.INF000 + functionName)
        expect(loggerInfoSpy).toHaveBeenLastCalledWith(logMessageDefine.INF001 + functionName)
        logger.trace({ testCase: expect.getState().currentTestName }, '======= 終了 =======')
      })

      test('02 デジトレトークン未定義エラーログ', async () => {
        /* テスト条件設定 */
        // cookieの設定：有
        request.cookies = null

        // デジトレトークン検証結果設定：正常
        cookieTokenVerifySpy.mockReturnValue(Object)

        // 試験対象関数実行
        logger.trace({ testCase: expect.getState().currentTestName }, '======= 開始 =======')
        await memberSiteController.oauthTransfer(request, response, next)
        expect(loggerErrorSpy).toHaveBeenNthCalledWith(1, 'ERR-MB100 ILLEGAL Access:No digitaltradeToken')
        logger.trace({ testCase: expect.getState().currentTestName }, '======= 終了 =======')
      })

      test('03 予期せぬエラーのエラーログ', async () => {
        /* テスト条件設定 */
        // cookieの設定：有
        request.cookies = { digitaltradeToken: jwtToken }
        // デジトレトークン検証結果設定：正常
        cookieTokenVerifySpy.mockReturnValue(Object)

        // RunTimeError設定
        const mockError = new Error('mock error')
        jest.spyOn(response, 'clearCookie').mockImplementation(() => {
          throw mockError
        })

        // 試験対象関数実行
        logger.trace({ testCase: expect.getState().currentTestName }, '======= 開始 =======')
        await memberSiteController.oauthTransfer(request, response, next)
        expect(loggerErrorSpy).toHaveBeenNthCalledWith(1, { error: mockError.message }, 'ERR-MB999 RunTime Error')
        logger.trace({ testCase: expect.getState().currentTestName }, '======= 終了 =======')
      })
    })

    describe('03 セッション定義', () => {
      beforeEach(() => {
        request.session = {}
        memberSiteSessionDto = new MemberSiteCoopSessionDto()
      })
      afterEach(() => {})
      test('01 セッションが未定義の場合', async () => {
        /* テスト条件設定 */
        // cookieの設定：有
        request.cookies = { digitaltradeToken: jwtToken }
        // デジトレトークン検証結果設定：正常
        cookieTokenVerifySpy.mockReturnValue(Object)
        // セッション定義

        // 試験対象関数実行
        logger.trace({ testCase: expect.getState().currentTestName }, '======= 開始 =======')
        await memberSiteController.oauthTransfer(request, response, next)
        expect(loggerTraceSpy.mock.calls[1][0]).not.toEqual(memberSiteSessionDto)
        logger.trace({ testCase: expect.getState().currentTestName }, '======= 終了 =======')
      })

      test('02 セッションが定義済の場合', async () => {
        /* テスト条件設定 */
        // cookieの設定：有
        request.cookies = { digitaltradeToken: jwtToken }
        // デジトレトークン検証結果設定：正常
        cookieTokenVerifySpy.mockReturnValue(Object)
        memberSiteSessionDto.digitaltradeId = 'dummyId'
        // セッション定義
        request.session.memberSiteCoopSession = memberSiteSessionDto

        // 試験対象関数実行
        logger.trace({ testCase: expect.getState().currentTestName }, '======= 開始 =======')
        await memberSiteController.oauthTransfer(request, response, next)
        expect(loggerTraceSpy.mock.calls[1][0]).toEqual(memberSiteSessionDto)
        logger.trace({ testCase: expect.getState().currentTestName }, '======= 終了 =======')
      })
    })

    describe('04 デジタルトレードトークン検証', () => {
      beforeEach(() => {
        request.session = {}
        memberSiteSessionDto = new MemberSiteCoopSessionDto()
      })
      afterEach(() => {})
      test('01 デジタルトレードトークン未定義', async () => {
        /* テスト条件設定 */
        // セッション定義
        // cookieの設定：設定無
        request.cookies = null
        // デジトレトークン検証結果設定：正常
        cookieTokenVerifySpy.mockReturnValue(Object)

        // 試験対象関数実行
        logger.trace({ testCase: expect.getState().currentTestName }, '======= 開始 =======')

        await memberSiteController.oauthTransfer(request, response, next)
        expect(next).toHaveBeenCalledWith(errorHelper.create(400))
        logger.trace({ testCase: expect.getState().currentTestName }, '======= 終了 =======')
      })

      test('02 不正なデジタルトレードトークン受領', async () => {
        /* テスト条件設定 */
        // セッション定義
        // cookieの設定：有
        request.cookies = { digitaltradeToken: jwtToken }

        // デジトレトークン検証結果設定：エラー返却
        const cookieTokenVerifyError = new Error('mock error')
        cookieTokenVerifyError.name = 'ILLEGAL_TOKEN'
        cookieTokenVerifySpy.mockReturnValue(cookieTokenVerifyError)

        // 試験対象関数実行
        logger.trace({ testCase: expect.getState().currentTestName }, '======= 開始 =======')
        await memberSiteController.oauthTransfer(request, response, next)
        expect(next).toHaveBeenCalledWith(errorHelper.create(400))
        logger.trace({ testCase: expect.getState().currentTestName }, '======= 終了 =======')
      })

      test('03 デジタルトレードトークン検証失敗', async () => {
        /* テスト条件設定 */
        // セッション定義
        // cookieの設定：有
        request.cookies = { digitaltradeToken: jwtToken }

        // デジトレトークン検証結果設定：エラー返却
        const cookieTokenVerifyError = new Error('mock error')
        cookieTokenVerifyError.name = 'DB Error'
        cookieTokenVerifySpy.mockReturnValue(cookieTokenVerifyError)

        // 試験対象関数実行
        logger.trace({ testCase: expect.getState().currentTestName }, '======= 開始 =======')
        await memberSiteController.oauthTransfer(request, response, next)
        expect(next).toHaveBeenCalledWith(errorHelper.create(500))
        logger.trace({ testCase: expect.getState().currentTestName }, '======= 終了 =======')
      })
    })

    describe('05 正常処理', () => {
      beforeEach(() => {
        request.session = {}
        memberSiteSessionDto = new MemberSiteCoopSessionDto()
      })
      afterEach(() => {})
      test('01 正常処理', async () => {
        /* テスト条件設定 */
        // セッション定義
        // cookieの設定：設定無
        request.cookies = { digitaltradeToken: jwtToken }
        // デジトレトークン検証結果設定：正常
        cookieTokenVerifySpy.mockReturnValue(Object)

        // 試験対象関数実行
        logger.trace({ testCase: expect.getState().currentTestName }, '======= 開始 =======')
        await memberSiteController.oauthTransfer(request, response, next)
        // セッション値の確認
        expect(request.session.memberSiteCoopSession.memberSiteFlg).toBe(true)
        expect(request.session.memberSiteCoopSession.bcdAppValidFlg).toBe(true)
        expect(request.session.memberSiteCoopSession.tradeshiftRedirectExecutionFlg).toBe(true)
        expect(request.session.memberSiteCoopSession.fingerprintVerifyFlg).toBe(false)
        // res.clearCookieの実行確認
        expect(response.clearCookie).toHaveBeenCalledWith(process.env.BCA_BC_COOKIE_NAME, {
          httpOnly: process.env.BCA_BC_COOKIE_HTTP_ONLY,
          domain: process.env.BCA_BC_COOKIE_DOMAIN,
          path: process.env.BCA_BC_COOKIE_PATH,
          secure: process.env.BCA_BC_COOKIE_SECURE,
          sameSite: process.env.BCA_BC_COOKIE_SAME_SITE
        })
        // NEXTCall
        expect(response.clearCookie).toHaveBeenCalled()
        logger.trace({ testCase: expect.getState().currentTestName }, '======= 終了 =======')
      })
    })

    describe('06 異常処理', () => {
      beforeEach(() => {
        request.session = {}
        memberSiteSessionDto = new MemberSiteCoopSessionDto()
      })
      afterEach(() => {})
      test('01 異常処理', async () => {
        /* テスト条件設定 */
        // セッション定義
        // cookieの設定：設定無
        request.cookies = { digitaltradeToken: jwtToken }
        // デジトレトークン検証結果設定：正常
        cookieTokenVerifySpy.mockReturnValue(Object)
        response.clearCookie = jest.fn(() => {
          throw dummyError
        })

        // 試験対象関数実行
        logger.trace({ testCase: expect.getState().currentTestName }, '======= 開始 =======')
        await memberSiteController.oauthTransfer(request, response, next)

        // NEXTCall
        expect(next).toHaveBeenCalledWith(errorHelper.create(500))
        logger.trace({ testCase: expect.getState().currentTestName }, '======= 終了 =======')
      })
    })
  })

  describe('02 oauthCallbackTransfer UTテスト', () => {
    let cookieTokenVerifySpy
    beforeEach(() => {
      cookieTokenVerifySpy = jest.spyOn(memberSiteController.privateFunc, 'cookieTokenVerify')
    })
    afterEach(() => {
      cookieTokenVerifySpy.mockRestore()
    })
    const functionName = 'oauthCallbackTransfer'
    describe('02 ログ出力', () => {
      beforeEach(() => {
        request.session = {}
        memberSiteSessionDto = new MemberSiteCoopSessionDto()
      })
      afterEach(() => {})
      test('01 開始・終了ログの出力', async () => {
        /* テスト条件設定 */
        // cookieの設定：有
        request.cookies = { digitaltradeToken: jwtToken }

        // oauth検証条件
        request.session = {}
        request.user = tradeshiftUserInfo

        // Jwt検証結果設定：正常
        cookieTokenVerifySpy.mockReturnValue(Object)

        // 試験対象関数実行
        logger.trace({ testCase: expect.getState().currentTestName }, '======= 開始 =======')
        await memberSiteController.oauthCallbackTransfer(request, response, next)
        expect(loggerInfoSpy).toHaveBeenNthCalledWith(1, logMessageDefine.INF000 + functionName)
        expect(loggerInfoSpy).toHaveBeenLastCalledWith(logMessageDefine.INF001 + functionName)
        logger.trace({ testCase: expect.getState().currentTestName }, '======= 終了 =======')
      })

      test('02 予期せぬエラー', async () => {
        /* テスト条件設定 */
        // cookieの設定：無
        request.cookies = { digitaltradeToken: jwtToken }

        // oauth検証条件
        request.session = {}
        request.user = tradeshiftUserInfo

        // Jwt検証結果設定：正常
        cookieTokenVerifySpy.mockReturnValue(Object)

        // runtime Error
        const mockError = new Error('mock error')
        jest.spyOn(response, 'clearCookie').mockImplementation(() => {
          throw mockError
        })

        // 試験対象関数実行
        logger.trace({ testCase: expect.getState().currentTestName }, '======= 開始 =======')
        await memberSiteController.oauthCallbackTransfer(request, response, next)
        expect(loggerErrorSpy).toHaveBeenNthCalledWith(1, { error: mockError.message }, 'ERR-MB999 RunTime Error')
        logger.trace({ testCase: expect.getState().currentTestName }, '======= 終了 =======')
      })
    })

    describe('03 セッション定義', () => {
      beforeEach(() => {
        request.session = {}
        memberSiteSessionDto = new MemberSiteCoopSessionDto()
      })
      afterEach(() => {})
      test('01 セッションが未定義の場合', async () => {
        /* テスト条件設定 */
        // cookieの設定：有
        request.cookies = { digitaltradeToken: jwtToken }

        // oauth検証条件
        request.user = tradeshiftUserInfo

        // Jwt検証結果設定：正常
        cookieTokenVerifySpy.mockReturnValue(Object)

        // 試験対象関数実行
        logger.trace({ testCase: expect.getState().currentTestName }, '======= 開始 =======')
        await memberSiteController.oauthCallbackTransfer(request, response, next)
        expect(loggerTraceSpy.mock.calls[1][0]).not.toEqual(memberSiteSessionDto)
        logger.trace({ testCase: expect.getState().currentTestName }, '======= 終了 =======')
      })

      test('02 セッションが定義済の場合', async () => {
        /* テスト条件設定 */
        // cookieの設定：有
        request.cookies = { digitaltradeToken: jwtToken }

        // oauth検証条件
        request.user = tradeshiftUserInfo

        // デジトレセッションの定義
        memberSiteSessionDto.digitaltradeId = 'dummyId'
        request.session.memberSiteCoopSession = memberSiteSessionDto

        // Jwt検証結果設定：正常
        cookieTokenVerifySpy.mockReturnValue(Object)

        // 試験対象関数実行
        logger.trace({ testCase: expect.getState().currentTestName }, '======= 開始 =======')
        await memberSiteController.oauthCallbackTransfer(request, response, next)
        expect(loggerTraceSpy.mock.calls[1][0]).toEqual(memberSiteSessionDto)
        logger.trace({ testCase: expect.getState().currentTestName }, '======= 終了 =======')
      })
    })

    describe('04 oauth実施確認', () => {
      beforeEach(() => {
        request.session = {}
        memberSiteSessionDto = new MemberSiteCoopSessionDto()
      })
      afterEach(() => {})
      test('01 oauth未実施①', async () => {
        /* テスト条件設定 */
        // cookieの設定：有
        request.cookies = { digitaltradeToken: jwtToken }

        // oauth検証条件
        request.user = null
        request.session = null

        // Jwt検証結果設定：正常
        cookieTokenVerifySpy.mockReturnValue(Object)

        // 試験対象関数実行
        logger.trace({ testCase: expect.getState().currentTestName }, '======= 開始 =======')
        await memberSiteController.oauthCallbackTransfer(request, response, next)
        expect(loggerErrorSpy).toHaveBeenCalledWith('ERR-MB101 Illegal transition:oauth NG')
        expect(next).toHaveBeenCalledWith(errorHelper.create(500))
        logger.trace({ testCase: expect.getState().currentTestName }, '======= 終了 =======')
      })
      test('02 oauth未実施②', async () => {
        /* テスト条件設定 */
        // cookieの設定：有
        request.cookies = { digitaltradeToken: jwtToken }

        // oauth検証条件
        request.user = null
        request.session = {}

        // デジトレセッションの定義
        request.session.memberSiteCoopSession = null

        // Jwt検証結果設定：正常
        cookieTokenVerifySpy.mockReturnValue(Object)

        // 試験対象関数実行
        logger.trace({ testCase: expect.getState().currentTestName }, '======= 開始 =======')
        await memberSiteController.oauthCallbackTransfer(request, response, next)
        expect(loggerErrorSpy).toHaveBeenCalledWith('ERR-MB101 Illegal transition:oauth NG')
        expect(next).toHaveBeenCalledWith(errorHelper.create(500))
        logger.trace({ testCase: expect.getState().currentTestName }, '======= 終了 =======')
      })
      test('03 oauth未実施③', async () => {
        /* テスト条件設定 */
        // cookieの設定：有
        request.cookies = { digitaltradeToken: jwtToken }

        // oauth検証条件
        request.user = tradeshiftUserInfo
        request.session = null

        // Jwt検証結果設定：正常
        cookieTokenVerifySpy.mockReturnValue(Object)

        // 試験対象関数実行
        logger.trace({ testCase: expect.getState().currentTestName }, '======= 開始 =======')
        await memberSiteController.oauthCallbackTransfer(request, response, next)
        expect(loggerErrorSpy).toHaveBeenCalledWith('ERR-MB101 Illegal transition:oauth NG')
        expect(next).toHaveBeenCalledWith(errorHelper.create(500))
        logger.trace({ testCase: expect.getState().currentTestName }, '======= 終了 =======')
      })
    })

    describe('05 デジタルトレードトークン受領', () => {
      beforeEach(() => {
        request.session = {}
        memberSiteSessionDto = new MemberSiteCoopSessionDto()
      })
      afterEach(() => {})
      test('01 デジトレトークン受領（正常）', async () => {
        /* テスト条件設定 */
        // cookieの設定：有
        request.cookies = { digitaltradeToken: jwtToken }

        // oauth検証条件
        request.user = tradeshiftUserInfo

        // デジトレセッションの定義
        request.session.memberSiteCoopSession = memberSiteSessionDto

        // Jwt検証結果設定：正常
        cookieTokenVerifySpy.mockReturnValue(Object)

        // 試験対象関数実行
        logger.trace({ testCase: expect.getState().currentTestName }, '======= 開始 =======')
        await memberSiteController.oauthCallbackTransfer(request, response, next)
        expect(cookieTokenVerifySpy).toHaveBeenCalledWith(jwtToken, memberSiteSessionDto)

        expect(request.session.memberSiteCoopSession.memberSiteFlg).toBe(true)
        expect(request.session.memberSiteCoopSession.bcdAppValidFlg).toBe(false)
        expect(request.session.memberSiteCoopSession.tradeshiftRedirectExecutionFlg).toBe(false)
        expect(request.session.memberSiteCoopSession.fingerprintVerifyFlg).toBe(false)

        expect(response.clearCookie).toHaveBeenCalledWith(process.env.BCA_BC_COOKIE_NAME, {
          httpOnly: process.env.BCA_BC_COOKIE_HTTP_ONLY,
          domain: process.env.BCA_BC_COOKIE_DOMAIN,
          path: process.env.BCA_BC_COOKIE_PATH,
          secure: process.env.BCA_BC_COOKIE_SECURE,
          sameSite: process.env.BCA_BC_COOKIE_SAME_SITE
        })
        logger.trace({ testCase: expect.getState().currentTestName }, '======= 終了 =======')
      })

      test('02 デジトレトークン受領（ILLEGAL_TOKEN））', async () => {
        /* テスト条件設定 */
        // cookieの設定：有
        request.cookies = { digitaltradeToken: jwtToken }

        // oauth検証条件
        request.user = tradeshiftUserInfo
        request.session = {}

        // デジトレセッションの定義
        request.session.memberSiteCoopSession = memberSiteSessionDto

        // Jwt検証結果設定：ILLEGAL_TOKEN
        const cookieTokenVerifyError = new Error('mock Error')
        cookieTokenVerifyError.name = 'ILLEGAL_TOKEN'
        cookieTokenVerifySpy.mockReturnValue(cookieTokenVerifyError)

        // 試験対象関数実行
        logger.trace({ testCase: expect.getState().currentTestName }, '======= 開始 =======')
        await memberSiteController.oauthCallbackTransfer(request, response, next)
        expect(next).toHaveBeenCalledWith(errorHelper.create(400))
        logger.trace({ testCase: expect.getState().currentTestName }, '======= 終了 =======')
      })

      test('03 デジトレトークン受領（runtimeError））', async () => {
        /* テスト条件設定 */
        // cookieの設定：有
        request.cookies = { digitaltradeToken: jwtToken }

        // oauth検証条件
        request.user = tradeshiftUserInfo
        request.session = {}

        // デジトレセッションの定義
        request.session.memberSiteCoopSession = memberSiteSessionDto

        // Jwt検証結果設定：ILLEGAL_TOKEN
        const cookieTokenVerifyError = new Error('mock Error')
        cookieTokenVerifyError.name = 'Runtime Error'
        cookieTokenVerifySpy.mockReturnValue(cookieTokenVerifyError)

        // 試験対象関数実行
        logger.trace({ testCase: expect.getState().currentTestName }, '======= 開始 =======')
        await memberSiteController.oauthCallbackTransfer(request, response, next)
        expect(next).toHaveBeenCalledWith(errorHelper.create(500))
        logger.trace({ testCase: expect.getState().currentTestName }, '======= 終了 =======')
      })
    })

    describe('06 ID紐づけ処理', () => {
      // test('01 idAssociationのCall条件', async () => {
      //   /* テスト条件設定 */
      //   // cookieの設定：無
      //   request.cookies = null
      //   // oauth検証条件
      //   request.user = tradeshiftUserInfo
      //   request.session = {}
      //   // デジトレセッションの定義
      //   const memberSiteCoopSession = new MemberSiteCoopSessionDto()
      //   memberSiteCoopSession.memberSiteFlg = true
      //   memberSiteCoopSession.bcdAppValidFlg = true
      //   memberSiteCoopSession.tradeshiftRedirectExecutionFlg = true
      //   memberSiteCoopSession.fingerprintVerifyFlg = false
      //   request.session.memberSiteCoopSession = memberSiteCoopSession
      //   // Jwt検証結果設定：正常
      //   cookieTokenVerifySpy.mockReturnValue(Object)
      //   // idAssociation：正常
      //   idAssociationSpy.mockReturnValue(Object)
      //   // 試験対象関数実行
      //   logger.trace({ testCase: expect.getState().currentTestName }, '======= 開始 =======')
      //   await memberSiteController.oauthCallbackTransfer(request, response, next)
      //   expect(idAssociationSpy).toHaveBeenCalledWith(memberSiteCoopSession)
      //   logger.trace({ testCase: expect.getState().currentTestName }, '======= 終了 =======')
      // })
      // test('02 idAssociationのエラーハンドリング', async () => {
      //   /* テスト条件設定 */
      //   // cookieの設定：無
      //   request.cookies = null
      //   // oauth検証条件
      //   request.user = tradeshiftUserInfo
      //   request.session = {}
      //   // デジトレセッションの定義
      //   const memberSiteCoopSession = new MemberSiteCoopSessionDto()
      //   memberSiteCoopSession.memberSiteFlg = true
      //   memberSiteCoopSession.bcdAppValidFlg = true
      //   memberSiteCoopSession.tradeshiftRedirectExecutionFlg = true
      //   memberSiteCoopSession.fingerprintVerifyFlg = false
      //   request.session.memberSiteCoopSession = memberSiteCoopSession
      //   // Jwt検証結果設定：正常
      //   cookieTokenVerifySpy.mockReturnValue(Object)
      //   // idAssociation：正常
      //   const idAssociationError = new Error('mock error')
      //   idAssociationSpy.mockReturnValue(idAssociationError)
      //   // 試験対象関数実行
      //   logger.trace({ testCase: expect.getState().currentTestName }, '======= 開始 =======')
      //   await memberSiteController.oauthCallbackTransfer(request, response, next)
      //   expect(next).toHaveBeenCalledWith(errorHelper.create(500))
      //   logger.trace({ testCase: expect.getState().currentTestName }, '======= 終了 =======')
      // })
      })

    describe('07 正常処理', () => {
      beforeEach(() => {
        request.session = {}
        memberSiteSessionDto = new MemberSiteCoopSessionDto()
    })
      afterEach(() => {})
      test('01 アプリ一覧からの遷移', async () => {
        /* テスト条件設定 */
        // cookieの設定：無
        request.cookies = null

        // oauth検証条件
        request.user = tradeshiftUserInfo
        request.session = {}

        // デジトレセッションの定義
        memberSiteSessionDto.memberSiteFlg = true
        memberSiteSessionDto.bcdAppValidFlg = true
        memberSiteSessionDto.tradeshiftRedirectExecutionFlg = true
        memberSiteSessionDto.fingerprintVerifyFlg = false
        request.session.memberSiteCoopSession = memberSiteSessionDto

        // Jwt検証結果設定：正常
        cookieTokenVerifySpy.mockReturnValue(Object)

        // 試験対象関数実行
        logger.trace({ testCase: expect.getState().currentTestName }, '======= 開始 =======')
        await memberSiteController.oauthCallbackTransfer(request, response, next)
        expect(loggerInfoSpy).toHaveBeenNthCalledWith(2, 'INF-MB102 App list transition')

        expect(cookieTokenVerifySpy).not.toHaveBeenCalled()

        expect(request.session.memberSiteCoopSession.memberSiteFlg).toBe(true)
        expect(request.session.memberSiteCoopSession.bcdAppValidFlg).toBe(true)
        expect(request.session.memberSiteCoopSession.tradeshiftRedirectExecutionFlg).toBe(false)
        expect(request.session.memberSiteCoopSession.fingerprintVerifyFlg).toBe(false)

        expect(response.redirect).toHaveBeenCalledWith(
          303,
          'https://' + process.env.TS_HOST + '/#/' + process.env.TS_CLIENT_ID
        )

        logger.trace({ testCase: expect.getState().currentTestName }, '======= 終了 =======')
      })
      test('02 アプリ有効化手順画面からの遷移', async () => {
        /* テスト条件設定 */
        // cookieの設定
        request.cookies = { digitaltradeToken: jwtToken }

        // oauth検証条件
        request.user = tradeshiftUserInfo
        request.session = {}

        // デジトレセッションの定義

        // Jwt検証結果設定：正常
        cookieTokenVerifySpy.mockReturnValue(Object)

        // 試験対象関数実行
        logger.trace({ testCase: expect.getState().currentTestName }, '======= 開始 =======')
        await memberSiteController.oauthCallbackTransfer(request, response, next)
        expect(loggerInfoSpy).toHaveBeenNthCalledWith(2, 'INF-MB103 App activation procedure screen')

        expect(cookieTokenVerifySpy).toHaveBeenCalledWith(jwtToken, request.session.memberSiteCoopSession)

        expect(response.clearCookie).toHaveBeenCalledWith(process.env.BCA_BC_COOKIE_NAME, {
          httpOnly: process.env.BCA_BC_COOKIE_HTTP_ONLY,
          domain: process.env.BCA_BC_COOKIE_DOMAIN,
          path: process.env.BCA_BC_COOKIE_PATH,
          secure: process.env.BCA_BC_COOKIE_SECURE,
          sameSite: process.env.BCA_BC_COOKIE_SAME_SITE
        })

        expect(request.session.memberSiteCoopSession.memberSiteFlg).toBe(true)
        expect(request.session.memberSiteCoopSession.bcdAppValidFlg).toBe(false)
        expect(request.session.memberSiteCoopSession.tradeshiftRedirectExecutionFlg).toBe(false)
        expect(request.session.memberSiteCoopSession.fingerprintVerifyFlg).toBe(false)

        expect(next).toHaveBeenCalled()
        logger.trace({ testCase: expect.getState().currentTestName }, '======= 終了 =======')
      })

      test('03 会員サイトと連携しない場合の遷移', async () => {
        /* テスト条件設定 */
        // cookieの設定：無
        request.cookies = null

        // oauth検証条件
        request.user = tradeshiftUserInfo

        // デジトレセッションの定義

        // Jwt検証結果設定：正常
        cookieTokenVerifySpy.mockReturnValue(Object)

        // 試験対象関数実行
        logger.trace({ testCase: expect.getState().currentTestName }, '======= 開始 =======')
        await memberSiteController.oauthCallbackTransfer(request, response, next)
        expect(loggerInfoSpy).toHaveBeenNthCalledWith(2, 'INF-MB104 No use of member site')

        expect(cookieTokenVerifySpy).not.toHaveBeenCalled()

        expect(request.session.memberSiteCoopSession.memberSiteFlg).toBe(false)
        expect(request.session.memberSiteCoopSession.bcdAppValidFlg).toBe(false)
        expect(request.session.memberSiteCoopSession.tradeshiftRedirectExecutionFlg).toBe(false)
        expect(request.session.memberSiteCoopSession.fingerprintVerifyFlg).toBe(true)

        expect(next).toHaveBeenCalled()
        logger.trace({ testCase: expect.getState().currentTestName }, '======= 終了 =======')
      })
    })

    describe('08 異常処理', () => {
      beforeEach(() => {
        request.session = {}
        memberSiteSessionDto = new MemberSiteCoopSessionDto()
      })
      afterEach(() => {})
      test('01 異常処理', async () => {
        /* テスト条件設定 */
        // cookieの設定：無
        request.cookies = null

        // oauth検証条件
        request.user = tradeshiftUserInfo
        request.session = {}

        // デジトレセッションの定義
        memberSiteSessionDto.memberSiteFlg = true
        memberSiteSessionDto.bcdAppValidFlg = true
        memberSiteSessionDto.tradeshiftRedirectExecutionFlg = true
        memberSiteSessionDto.fingerprintVerifyFlg = false
        request.session.memberSiteCoopSession = memberSiteSessionDto

        // Jwt検証結果設定：正常
        cookieTokenVerifySpy.mockReturnValue(Object)

        // エラーを発生
        response.redirect = jest.fn(() => {
          throw dummyError
        })

        // 試験対象関数実行
        logger.trace({ testCase: expect.getState().currentTestName }, '======= 開始 =======')
        await memberSiteController.oauthCallbackTransfer(request, response, next)
        expect(loggerErrorSpy).toHaveBeenNthCalledWith(1, { error: dummyError.message }, 'ERR-MB999 RunTime Error')

        expect(next).toHaveBeenCalledWith(next(errorHelper.create(500)))

        logger.trace({ testCase: expect.getState().currentTestName }, '======= 終了 =======')
      })
    })
  })

  describe('03 idAssociation UTテスト', () => {
    let getServiceLinkageIdBydigitaltradeIdSpy, createServiceLinkageIdSpy, updateServiceLinkageIdSpy
    beforeEach(() => {
      getServiceLinkageIdBydigitaltradeIdSpy = jest.spyOn(
        menberSiteControllerDao,
        'getServiceLinkageIdBydigitaltradeId'
      )
      createServiceLinkageIdSpy = jest.spyOn(menberSiteControllerDao, 'createServiceLinkageId')
      updateServiceLinkageIdSpy = jest.spyOn(menberSiteControllerDao, 'updateServiceLinkageId')
    })
    afterEach(() => {
      getServiceLinkageIdBydigitaltradeIdSpy.mockRestore()
      createServiceLinkageIdSpy.mockRestore()
      updateServiceLinkageIdSpy.mockRestore()
    })
    const functionName = 'idAssociation'
    describe('02 ログ出力', () => {
      beforeEach(() => {
        request.session = {}
        memberSiteSessionDto = new MemberSiteCoopSessionDto()
      })
      afterEach(() => {})
      test('01 開始・終了ログの出力', async () => {
        /* テスト条件設定 */
        // getServiceLinkageIdBydigitaltradeIdSpy：正常
        getServiceLinkageIdBydigitaltradeIdSpy.mockReturnValue(Object)

        // createServiceLinkageIdSpy：正常
        createServiceLinkageIdSpy.mockReturnValue(Object)

        // updateServiceLinkageIdSpy：正常
        updateServiceLinkageIdSpy.mockReturnValue(Object)

        // デジトレセッションの定義
        memberSiteSessionDto.digitaltradeId = digitaltaldeTokenInfo.digitaltradeId
        memberSiteSessionDto.digitaltradeToken = digitaltaldeTokenInfo.dtToken
        memberSiteSessionDto.fingerprintVerifyFlg = false

        // 試験対象関数実行
        logger.trace({ testCase: expect.getState().currentTestName }, '======= 開始 =======')
        await memberSiteController.privateFunc.idAssociation(memberSiteSessionDto)
        expect(loggerInfoSpy).toHaveBeenNthCalledWith(1, logMessageDefine.INF000 + functionName)
        expect(loggerInfoSpy).toHaveBeenLastCalledWith(logMessageDefine.INF001 + functionName)
        logger.trace({ testCase: expect.getState().currentTestName }, '======= 終了 =======')
      })

      test('02 予期せぬエラー', async () => {
        /* テスト条件設定 */
        // getServiceLinkageIdBydigitaltradeIdSpy：異常
        getServiceLinkageIdBydigitaltradeIdSpy.mockImplementation(() => {
          throw dummyError
        })

        // createServiceLinkageIdSpy：正常
        createServiceLinkageIdSpy.mockReturnValue(Object)

        // updateServiceLinkageIdSpy：正常
        updateServiceLinkageIdSpy.mockReturnValue(Object)

        // デジトレセッションの定義
        // デジトレセッションの定義
        memberSiteSessionDto.digitaltradeId = digitaltaldeTokenInfo.digitaltradeId
        memberSiteSessionDto.digitaltradeToken = digitaltaldeTokenInfo.dtToken
        memberSiteSessionDto.fingerprintVerifyFlg = true

        // 試験対象関数実行
        logger.trace({ testCase: expect.getState().currentTestName }, '======= 開始 =======')

        await memberSiteController.privateFunc.idAssociation(memberSiteSessionDto)
        expect(loggerErrorSpy).toHaveBeenNthCalledWith(
          1,
          { error: dummyError.message },
          'ERR-MB999 idAssociation:Runtime error'
        )
        logger.trace({ testCase: expect.getState().currentTestName }, '======= 終了 =======')
      })
    })

    describe('03 ID紐づけ実行', () => {
      beforeEach(() => {
        request.session = {}
        memberSiteSessionDto = new MemberSiteCoopSessionDto()
      })
      afterEach(() => {})
      test('01 ID紐づけの実行条件', async () => {
        /* テスト条件設定 */
        // getServiceLinkageIdBydigitaltradeIdSpy：正常
        getServiceLinkageIdBydigitaltradeIdSpy.mockReturnValue(Object)

        // createServiceLinkageIdSpy：正常
        createServiceLinkageIdSpy.mockReturnValue(Object)

        // updateServiceLinkageIdSpy：正常
        updateServiceLinkageIdSpy.mockReturnValue(Object)

        // デジトレセッションの定義
        memberSiteSessionDto.digitaltradeId = digitaltaldeTokenInfo.digitaltradeId
        memberSiteSessionDto.digitaltradeToken = digitaltaldeTokenInfo.dtToken
        memberSiteSessionDto.fingerprintVerifyFlg = false

        // 試験対象関数実行
        logger.trace({ testCase: expect.getState().currentTestName }, '======= 開始 =======')
        await memberSiteController.privateFunc.idAssociation(memberSiteSessionDto)
        expect(getServiceLinkageIdBydigitaltradeIdSpy).not.toHaveBeenCalled()
        logger.trace({ testCase: expect.getState().currentTestName }, '======= 終了 =======')
      })

      test('02 ID紐づけ情報取得失敗', async () => {
        /* テスト条件設定 */
        // getServiceLinkageIdBydigitaltradeIdSpy：エラー
        const getServiceLinkageIdBydigitaltradeError = new Error('mock error')
        getServiceLinkageIdBydigitaltradeIdSpy.mockReturnValue(getServiceLinkageIdBydigitaltradeError)

        // createServiceLinkageIdSpy：正常
        createServiceLinkageIdSpy.mockReturnValue(Object)

        // updateServiceLinkageIdSpy：正常
        updateServiceLinkageIdSpy.mockReturnValue(Object)

        // デジトレセッションの定義
        memberSiteSessionDto.digitaltradeId = digitaltaldeTokenInfo.digitaltradeId
        memberSiteSessionDto.digitaltradeToken = digitaltaldeTokenInfo.dtToken
        memberSiteSessionDto.fingerprintVerifyFlg = true

        // 試験対象関数実行
        logger.trace({ testCase: expect.getState().currentTestName }, '======= 開始 =======')
        const result = await memberSiteController.privateFunc.idAssociation(memberSiteSessionDto)
        expect(result).toBe(getServiceLinkageIdBydigitaltradeError)
        logger.trace({ testCase: expect.getState().currentTestName }, '======= 終了 =======')
      })

      test('03 新規ID紐づけ', async () => {
        /* テスト条件設定 */
        // getServiceLinkageIdBydigitaltradeIdSpy：正常
        getServiceLinkageIdBydigitaltradeIdSpy.mockReturnValue(null)

        // createServiceLinkageIdSpy：正常
        createServiceLinkageIdSpy.mockReturnValue(Object)

        // updateServiceLinkageIdSpy：正常
        updateServiceLinkageIdSpy.mockReturnValue(Object)

        // デジトレセッションの定義
        memberSiteSessionDto.digitaltradeId = digitaltaldeTokenInfo.digitaltradeId
        memberSiteSessionDto.digitaltradeToken = digitaltaldeTokenInfo.dtToken
        memberSiteSessionDto.fingerprintVerifyFlg = true

        // 試験対象関数実行
        logger.trace({ testCase: expect.getState().currentTestName }, '======= 開始 =======')
        const result = await memberSiteController.privateFunc.idAssociation(memberSiteSessionDto)
        expect(loggerInfoSpy).toHaveBeenNthCalledWith(2, 'INF-MB105 No ServiceLinkageId')
        expect(createServiceLinkageIdSpy).toHaveBeenCalledWith(memberSiteSessionDto)
        expect(result).toBe(true)
        logger.trace({ testCase: expect.getState().currentTestName }, '======= 終了 =======')
      })

      test('04 新規ID紐づけ（runtimeError）', async () => {
        /* テスト条件設定 */
        // getServiceLinkageIdBydigitaltradeIdSpy：正常
        getServiceLinkageIdBydigitaltradeIdSpy.mockReturnValue(null)

        // createServiceLinkageIdSpy：エラー
        const createServiceLinkageIdError = new Error('mock error')
        createServiceLinkageIdSpy.mockReturnValue(createServiceLinkageIdError)

        // updateServiceLinkageIdSpy：正常
        updateServiceLinkageIdSpy.mockReturnValue(Object)

        // デジトレセッションの定
        memberSiteSessionDto.digitaltradeId = digitaltaldeTokenInfo.digitaltradeId
        memberSiteSessionDto.digitaltradeToken = digitaltaldeTokenInfo.dtToken
        memberSiteSessionDto.fingerprintVerifyFlg = true

        // 試験対象関数実行
        logger.trace({ testCase: expect.getState().currentTestName }, '======= 開始 =======')
        const result = await memberSiteController.privateFunc.idAssociation(memberSiteSessionDto)
        expect(result).toBe(createServiceLinkageIdError)
        logger.trace({ testCase: expect.getState().currentTestName }, '======= 終了 =======')
      })

      test('05 ID紐づけ情報の更新1', async () => {
        /* テスト条件設定 */
        // getServiceLinkageIdBydigitaltradeIdSpy：正常
        getServiceLinkageIdBydigitaltradeIdSpy.mockReturnValue(serviceLinkageInfo)

        // createServiceLinkageIdSpy：正常
        createServiceLinkageIdSpy.mockReturnValue(Object)

        // updateServiceLinkageIdSpy：正常
        updateServiceLinkageIdSpy.mockReturnValue(Object)

        // デジトレセッションの定義
        memberSiteSessionDto.digitaltradeId = digitaltaldeTokenInfo.digitaltradeId
        memberSiteSessionDto.digitaltradeToken = digitaltaldeTokenInfo.dtToken
        // 紐づけ情報の相違設定
        memberSiteSessionDto.tradeshiftUserId = serviceLinkageInfo.serviceUserId + 'dummy'
        memberSiteSessionDto.tradeshiftTenantId = serviceLinkageInfo.serviceSubId + 'dummy'
        memberSiteSessionDto.fingerprintVerifyFlg = true

        // 試験対象関数実行
        logger.trace({ testCase: expect.getState().currentTestName }, '======= 開始 =======')
        const result = await memberSiteController.privateFunc.idAssociation(memberSiteSessionDto)
        expect(loggerInfoSpy).toHaveBeenNthCalledWith(2, 'INF-MB106 ServiceLinkageId exists')
        expect(loggerInfoSpy).toHaveBeenNthCalledWith(3, 'INF-MB107 ID info has been changed')
        expect(updateServiceLinkageIdSpy).toHaveBeenCalledWith(memberSiteSessionDto)
        expect(result).toBe(true)
        logger.trace({ testCase: expect.getState().currentTestName }, '======= 終了 =======')
      })

      test('06 ID紐づけ情報の更新2', async () => {
        /* テスト条件設定 */
        // getServiceLinkageIdBydigitaltradeIdSpy：正常
        getServiceLinkageIdBydigitaltradeIdSpy.mockReturnValue(serviceLinkageInfo)

        // createServiceLinkageIdSpy：正常
        createServiceLinkageIdSpy.mockReturnValue(Object)

        // updateServiceLinkageIdSpy：正常
        updateServiceLinkageIdSpy.mockReturnValue(Object)

        // デジトレセッションの定義
        memberSiteSessionDto.digitaltradeId = digitaltaldeTokenInfo.digitaltradeId
        memberSiteSessionDto.digitaltradeToken = digitaltaldeTokenInfo.dtToken
        // 紐づけ情報の相違設定
        memberSiteSessionDto.tradeshiftUserId = serviceLinkageInfo.serviceUserId + 'dummy'
        memberSiteSessionDto.tradeshiftTenantId = serviceLinkageInfo.serviceSubId
        memberSiteSessionDto.fingerprintVerifyFlg = true

        // 試験対象関数実行
        logger.trace({ testCase: expect.getState().currentTestName }, '======= 開始 =======')
        const result = await memberSiteController.privateFunc.idAssociation(memberSiteSessionDto)
        expect(loggerInfoSpy).toHaveBeenNthCalledWith(2, 'INF-MB106 ServiceLinkageId exists')
        expect(loggerInfoSpy).toHaveBeenNthCalledWith(3, 'INF-MB107 ID info has been changed')
        expect(updateServiceLinkageIdSpy).toHaveBeenCalledWith(memberSiteSessionDto)
        expect(result).toBe(true)
        logger.trace({ testCase: expect.getState().currentTestName }, '======= 終了 =======')
      })

      test('07 ID紐づけ情報の更新3', async () => {
        /* テスト条件設定 */
        // getServiceLinkageIdBydigitaltradeIdSpy：正常
        getServiceLinkageIdBydigitaltradeIdSpy.mockReturnValue(serviceLinkageInfo)

        // createServiceLinkageIdSpy：エラー
        const createServiceLinkageIdError = new Error('mock error')
        createServiceLinkageIdSpy.mockReturnValue(createServiceLinkageIdError)

        // updateServiceLinkageIdSpy：正常
        updateServiceLinkageIdSpy.mockReturnValue(Object)

        // デジトレセッションの定義
        memberSiteSessionDto.digitaltradeId = digitaltaldeTokenInfo.digitaltradeId
        memberSiteSessionDto.digitaltradeToken = digitaltaldeTokenInfo.dtToken
        // 紐づけ情報の相違設定
        memberSiteSessionDto.tradeshiftUserId = serviceLinkageInfo.serviceUserId
        memberSiteSessionDto.tradeshiftTenantId = serviceLinkageInfo.serviceSubId + 'dummy'
        memberSiteSessionDto.fingerprintVerifyFlg = true

        // 試験対象関数実行
        logger.trace({ testCase: expect.getState().currentTestName }, '======= 開始 =======')
        const result = await memberSiteController.privateFunc.idAssociation(memberSiteSessionDto)
        expect(loggerInfoSpy).toHaveBeenNthCalledWith(2, 'INF-MB106 ServiceLinkageId exists')
        expect(loggerInfoSpy).toHaveBeenNthCalledWith(3, 'INF-MB107 ID info has been changed')
        expect(updateServiceLinkageIdSpy).toHaveBeenCalledWith(memberSiteSessionDto)
        expect(result).toBe(true)
        logger.trace({ testCase: expect.getState().currentTestName }, '======= 終了 =======')
      })

      test('08 ID紐づけ情報の更新の失敗', async () => {
        /* テスト条件設定 */
        // getServiceLinkageIdBydigitaltradeIdSpy：正常
        getServiceLinkageIdBydigitaltradeIdSpy.mockReturnValue(serviceLinkageInfo)

        // createServiceLinkageIdSpy：正常
        createServiceLinkageIdSpy.mockReturnValue(Object)

        // updateServiceLinkageIdSpy：エラー
        const updateServiceLinkageIdError = new Error('mock error')
        updateServiceLinkageIdSpy.mockReturnValue(updateServiceLinkageIdError)

        // デジトレセッションの定義
        memberSiteSessionDto.digitaltradeId = digitaltaldeTokenInfo.digitaltradeId
        memberSiteSessionDto.digitaltradeToken = digitaltaldeTokenInfo.dtToken
        // 紐づけ情報の相違設定
        memberSiteSessionDto.tradeshiftUserId = serviceLinkageInfo.serviceUserId + 'dummy'
        memberSiteSessionDto.tradeshiftTenantId = serviceLinkageInfo.serviceSubId
        memberSiteSessionDto.fingerprintVerifyFlg = true

        // 試験対象関数実行
        logger.trace({ testCase: expect.getState().currentTestName }, '======= 開始 =======')
        const result = await memberSiteController.privateFunc.idAssociation(memberSiteSessionDto)
        expect(result).toBe(updateServiceLinkageIdError)
        logger.trace({ testCase: expect.getState().currentTestName }, '======= 終了 =======')
      })

      test('09 ID紐づけ情報の変更無', async () => {
        /* テスト条件設定 */
        // getServiceLinkageIdBydigitaltradeIdSpy：正常
        getServiceLinkageIdBydigitaltradeIdSpy.mockReturnValue(serviceLinkageInfo)

        // createServiceLinkageIdSpy：正常
        createServiceLinkageIdSpy.mockReturnValue(Object)

        // updateServiceLinkageIdSpy：エラー
        const updateServiceLinkageIdError = new Error('mock error')
        updateServiceLinkageIdSpy.mockReturnValue(updateServiceLinkageIdError)

        // デジトレセッションの定義
        memberSiteSessionDto.digitaltradeId = digitaltaldeTokenInfo.digitaltradeId
        memberSiteSessionDto.digitaltradeToken = digitaltaldeTokenInfo.dtToken
        // 紐づけ情報の相違設定
        memberSiteSessionDto.tradeshiftUserId = serviceLinkageInfo.serviceUserId
        memberSiteSessionDto.tradeshiftTenantId = serviceLinkageInfo.serviceSubId
        memberSiteSessionDto.fingerprintVerifyFlg = true

        // 試験対象関数実行
        logger.trace({ testCase: expect.getState().currentTestName }, '======= 開始 =======')
        const result = await memberSiteController.privateFunc.idAssociation(memberSiteSessionDto)
        expect(loggerInfoSpy).toHaveBeenNthCalledWith(2, 'INF-MB106 ServiceLinkageId exists')
        expect(loggerInfoSpy).toHaveBeenNthCalledWith(3, 'INF-MB108 ID info has not changed')
        expect(result).toBe(true)
        logger.trace({ testCase: expect.getState().currentTestName }, '======= 終了 =======')
      })
    })

    describe('04 異常処理', () => {
      beforeEach(() => {
        request.session = {}
        memberSiteSessionDto = new MemberSiteCoopSessionDto()
      })
      afterEach(() => {})
      test('01 異常処理', async () => {
        /* テスト条件設定 */
        // getServiceLinkageIdBydigitaltradeIdSpy：異常
        getServiceLinkageIdBydigitaltradeIdSpy.mockImplementation(() => {
          throw dummyError
        })

        // createServiceLinkageIdSpy：正常
        createServiceLinkageIdSpy.mockReturnValue(Object)

        // updateServiceLinkageIdSpy：正常
        updateServiceLinkageIdSpy.mockReturnValue(Object)

        // デジトレセッションの定義
        memberSiteSessionDto.digitaltradeId = digitaltaldeTokenInfo.digitaltradeId
        memberSiteSessionDto.digitaltradeToken = digitaltaldeTokenInfo.dtToken
        memberSiteSessionDto.fingerprintVerifyFlg = true

        // 試験対象関数実行
        logger.trace({ testCase: expect.getState().currentTestName }, '======= 開始 =======')

        const result = await memberSiteController.privateFunc.idAssociation(memberSiteSessionDto)
        expect(loggerErrorSpy).toHaveBeenNthCalledWith(
          1,
          { error: dummyError.message },
          'ERR-MB999 idAssociation:Runtime error'
        )
        expect(() => {
          throw result
        }).toThrowError(dummyError)
        logger.trace({ testCase: expect.getState().currentTestName }, '======= 終了 =======')
      })
    })
  })

  describe('04 cookieTokenVerify UTテスト', () => {
    let decodeJwtTokenSpy, getDigitaltradeTokenBydtTokenSpy, updateDtTokenFlgSpy
    beforeEach(() => {
      decodeJwtTokenSpy = jest.spyOn(libCrypt, 'decodeJwtToken')
      getDigitaltradeTokenBydtTokenSpy = jest.spyOn(menberSiteControllerDao, 'getDigitaltradeTokenBydtToken')
      updateDtTokenFlgSpy = jest.spyOn(menberSiteControllerDao, 'updateDtTokenFlg')
    })
    afterEach(() => {
      decodeJwtTokenSpy.mockRestore()
      getDigitaltradeTokenBydtTokenSpy.mockRestore()
      updateDtTokenFlgSpy.mockRestore()
    })
    const functionName = 'cookieTokenVerify'
    describe('02 ログ出力', () => {
      beforeEach(() => {
        request.session = {}
        memberSiteSessionDto = new MemberSiteCoopSessionDto()
      })
      afterEach(() => {})
      test('01 開始・終了ログの出力', async () => {
        /* テスト条件設定 */
        // decodeJwtTokenSpy：正常
        decodeJwtTokenSpy.mockReturnValue(jwtJson)

        // getDigitaltradeTokenBydtTokenSpy：正常
        getDigitaltradeTokenBydtTokenSpy.mockReturnValue(digitaltaldeTokenInfo)

        // updateDtTokenFlgSpy:正常
        updateDtTokenFlgSpy.mockReturnValue(Object)

        // デジトレセッションの定義

        // 試験対象関数実行
        logger.trace({ testCase: expect.getState().currentTestName }, '======= 開始 =======')
        await memberSiteController.privateFunc.cookieTokenVerify(jwtToken, memberSiteSessionDto)
        expect(loggerInfoSpy).toHaveBeenNthCalledWith(1, logMessageDefine.INF000 + functionName)
        expect(loggerInfoSpy).toHaveBeenLastCalledWith(logMessageDefine.INF001 + functionName)
        logger.trace({ testCase: expect.getState().currentTestName }, '======= 終了 =======')
      })

      test('02 予期せぬエラー', async () => {
        /* テスト条件設定 */
        // decodeJwtTokenSpy：正常
        decodeJwtTokenSpy.mockReturnValue(jwtJson)

        // getDigitaltradeTokenBydtTokenSpy：正常
        getDigitaltradeTokenBydtTokenSpy.mockReturnValue(digitaltaldeTokenInfo)

        // updateDtTokenFlgSpy:正常
        updateDtTokenFlgSpy.mockReturnValue(Object)

        // デジトレセッションの定義
        memberSiteSessionDto.digitaltradeId = digitaltaldeTokenInfo.digitaltradeId
        memberSiteSessionDto.digitaltradeToken = digitaltaldeTokenInfo.dtToken

        // 試験対象関数実行
        logger.trace({ testCase: expect.getState().currentTestName }, '======= 開始 =======')
        // 引数をNULLにすることで、runtimeエラーを発生させる
        await memberSiteController.privateFunc.cookieTokenVerify(null, null)
        expect(loggerErrorSpy).toHaveBeenNthCalledWith(
          1,
          { error: "Cannot set property 'digitaltradeToken' of null" },
          'ERR-MB999 cookieTokenVerify:Runtime error'
        )
        logger.trace({ testCase: expect.getState().currentTestName }, '======= 終了 =======')
      })
    })

    describe('03 JWT検証', () => {
      beforeEach(() => {
        request.session = {}
        memberSiteSessionDto = new MemberSiteCoopSessionDto()
      })
      afterEach(() => {})
      test('01 JWT検証エラー', async () => {
        /* テスト条件設定 */
        // decodeJwtTokenSpy：異常
        decodeJwtTokenSpy.mockReturnValue(null)

        // getDigitaltradeTokenBydtTokenSpy：正常
        getDigitaltradeTokenBydtTokenSpy.mockReturnValue(digitaltaldeTokenInfo)

        // updateDtTokenFlgSpy:正常
        updateDtTokenFlgSpy.mockReturnValue(Object)

        // デジトレセッションの定義

        // 試験対象関数実行
        logger.trace({ testCase: expect.getState().currentTestName }, '======= 開始 =======')
        const result = await memberSiteController.privateFunc.cookieTokenVerify(jwtToken, memberSiteSessionDto)
        expect(loggerErrorSpy).toHaveBeenNthCalledWith(1, 'ERR-MB109 Received invalid JWT')
        expect(result.name).toBe('ILLEGAL_TOKEN')
        expect(getDigitaltradeTokenBydtTokenSpy).not.toHaveBeenCalled()
        logger.trace({ testCase: expect.getState().currentTestName }, '======= 終了 =======')
      })
    })

    describe('04 デジタルトレードトークン値の取得', () => {
      beforeEach(() => {
        request.session = {}
        memberSiteSessionDto = new MemberSiteCoopSessionDto()
      })
      afterEach(() => {})
      test('01 デジトレトークン取得失敗', async () => {
        /* テスト条件設定 */
        // decodeJwtTokenSpy：正常
        decodeJwtTokenSpy.mockReturnValue(jwtJson)

        // getDigitaltradeTokenBydtTokenSpy：エラー
        const getDigitaltradeTokenBydtTokenError = new Error('mock error')
        getDigitaltradeTokenBydtTokenSpy.mockReturnValue(getDigitaltradeTokenBydtTokenError)

        // updateDtTokenFlgSpy:正常
        updateDtTokenFlgSpy.mockReturnValue(Object)

        // デジトレセッションの定義

        // 試験対象関数実行
        logger.trace({ testCase: expect.getState().currentTestName }, '======= 開始 =======')
        const result = await memberSiteController.privateFunc.cookieTokenVerify(jwtToken, memberSiteSessionDto)
        expect(result).toBe(getDigitaltradeTokenBydtTokenError)
        logger.trace({ testCase: expect.getState().currentTestName }, '======= 終了 =======')
      })
    })

    describe('05 不正なデジタルトレードトークン値の受領', () => {
      beforeEach(() => {
        request.session = {}
        memberSiteSessionDto = new MemberSiteCoopSessionDto()
      })
      afterEach(() => {})
      test('01 不正デジトレトークン値', async () => {
        /* テスト条件設定 */
        // decodeJwtTokenSpy：正常
        decodeJwtTokenSpy.mockReturnValue(jwtJson)

        // getDigitaltradeTokenBydtTokenSpy：null
        getDigitaltradeTokenBydtTokenSpy.mockReturnValue(null)

        // updateDtTokenFlgSpy:正常
        updateDtTokenFlgSpy.mockReturnValue(Object)

        // デジトレセッションの定義
        memberSiteSessionDto.digitaltradeId = digitaltaldeTokenInfo.digitaltradeId
        memberSiteSessionDto.digitaltradeToken = digitaltaldeTokenInfo.dtToken

        // 試験対象関数実行
        logger.trace({ testCase: expect.getState().currentTestName }, '======= 開始 =======')
        const result = await memberSiteController.privateFunc.cookieTokenVerify(jwtToken, memberSiteSessionDto)

        expect(loggerErrorSpy).toHaveBeenNthCalledWith(1, 'ERR-MB110 Received invalid digitaltradeToken')

        expect(result.name).toBe('ILLEGAL_TOKEN')

        logger.trace({ testCase: expect.getState().currentTestName }, '======= 終了 =======')
      })
    })

    describe('06 Token受領FLGの更新', () => {
      beforeEach(() => {
        request.session = {}
        memberSiteSessionDto = new MemberSiteCoopSessionDto()
      })
      afterEach(() => {})
      test('01 Token受領FLGの更新失敗', async () => {
        /* テスト条件設定 */
        // decodeJwtTokenSpy：正常
        decodeJwtTokenSpy.mockReturnValue(jwtJson)

        // getDigitaltradeTokenBydtTokenSpy：正常
        getDigitaltradeTokenBydtTokenSpy.mockReturnValue(digitaltaldeTokenInfo)

        // updateDtTokenFlgSpy:エラー
        const updateDtTokenFlgError = new Error('mock error')
        updateDtTokenFlgSpy.mockReturnValue(updateDtTokenFlgError)

        // デジトレセッションの定義
        memberSiteSessionDto.digitaltradeId = digitaltaldeTokenInfo.digitaltradeId
        memberSiteSessionDto.digitaltradeToken = digitaltaldeTokenInfo.dtToken

        // 試験対象関数実行
        logger.trace({ testCase: expect.getState().currentTestName }, '======= 開始 =======')
        const result = await memberSiteController.privateFunc.cookieTokenVerify(jwtToken, memberSiteSessionDto)

        expect(result).toBe(updateDtTokenFlgError)

        logger.trace({ testCase: expect.getState().currentTestName }, '======= 終了 =======')
      })
    })

    describe('07 正常処理', () => {
      beforeEach(() => {
        request.session = {}
        memberSiteSessionDto = new MemberSiteCoopSessionDto()
      })
      afterEach(() => {})
      test('01 正常処理', async () => {
        /* テスト条件設定 */
        // decodeJwtTokenSpy：正常
        decodeJwtTokenSpy.mockReturnValue(jwtJson)

        // getDigitaltradeTokenBydtTokenSpy：正常
        getDigitaltradeTokenBydtTokenSpy.mockReturnValue(digitaltaldeTokenInfo)

        // updateDtTokenFlgSpy:正常
        updateDtTokenFlgSpy.mockReturnValue(Object)

        // デジトレセッションの定義

        // 試験対象関数実行
        logger.trace({ testCase: expect.getState().currentTestName }, '======= 開始 =======')
        const result = await memberSiteController.privateFunc.cookieTokenVerify(jwtToken, memberSiteSessionDto)
        expect(decodeJwtTokenSpy).toHaveBeenCalledWith(jwtToken)

        expect(getDigitaltradeTokenBydtTokenSpy).toHaveBeenCalledWith(JSON.parse(jwtJson).sub)

        expect(updateDtTokenFlgSpy).toHaveBeenCalledWith(digitaltaldeTokenInfo.dtToken)

        expect(memberSiteSessionDto.digitaltradeId).toBe(digitaltaldeTokenInfo.digitaltradeId)
        expect(memberSiteSessionDto.digitaltradeToken).toBe(digitaltaldeTokenInfo.dtToken)

        expect(result).toBe(true)

        logger.trace({ testCase: expect.getState().currentTestName }, '======= 終了 =======')
      })
    })

    describe('08 異常処理', () => {
      beforeEach(() => {
        request.session = {}
        memberSiteSessionDto = new MemberSiteCoopSessionDto()
      })
      afterEach(() => {})
      test('01 異常処理', async () => {
        /* テスト条件設定 */
        // decodeJwtTokenSpy：エラーを返却
        decodeJwtTokenSpy.mockImplementation(() => {
          throw dummyError
        })

        // getDigitaltradeTokenBydtTokenSpy：正常
        getDigitaltradeTokenBydtTokenSpy.mockReturnValue(digitaltaldeTokenInfo)

        // updateDtTokenFlgSpy:正常
        updateDtTokenFlgSpy.mockReturnValue(Object)

        // デジトレセッションの定義

        // 試験対象関数実行
        logger.trace({ testCase: expect.getState().currentTestName }, '======= 開始 =======')
        const result = await memberSiteController.privateFunc.cookieTokenVerify(jwtToken, memberSiteSessionDto)

        expect(loggerErrorSpy).toHaveBeenLastCalledWith(
          { error: dummyError.message },
          'ERR-MB999 cookieTokenVerify:Runtime error'
        )
        expect(result).toEqual(dummyError)

        logger.trace({ testCase: expect.getState().currentTestName }, '======= 終了 =======')
      })
    })
  })

  describe('05 idLinkingProcess UTテスト', () => {
    let fingerprintVerifySpy, deleteDigitaltradeTokenSpy, idAssociationSpy
    beforeEach(() => {
      fingerprintVerifySpy = jest.spyOn(memberSiteController.privateFunc, 'fingerprintVerify')
      deleteDigitaltradeTokenSpy = jest.spyOn(menberSiteControllerDao, 'deleteDigitaltradeToken')
      idAssociationSpy = jest.spyOn(memberSiteController.privateFunc, 'idAssociation')
    })
    afterEach(() => {
      fingerprintVerifySpy.mockRestore()
      deleteDigitaltradeTokenSpy.mockRestore()
      idAssociationSpy.mockRestore()
    })
    const functionName = 'idLinkingProcess'
    describe('02 ログ出力', () => {
      beforeEach(() => {
        request.session = {}
        memberSiteSessionDto = new MemberSiteCoopSessionDto()
      })
      afterEach(() => {})
      test('01 開始・終了ログの出力', async () => {
        /* テスト条件設定 */
        // decodeJwtTokenSpy：正常
        fingerprintVerifySpy.mockReturnValue(Object)

        // getDigitaltradeTokenBydtTokenSpy：正常
        deleteDigitaltradeTokenSpy.mockReturnValue(Object)

        // updateDtTokenFlgSpy:正常
        idAssociationSpy.mockReturnValue(Object)

        // デジトレセッションの定義
        request.session.memberSiteCoopSession = memberSiteSessionDto
        request.user = tradeshiftUserInfo

        // fingerprint設定
        request.body = { fingerprint: digitaltaldeTokenInfo.fingerprint }

        // 試験対象関数実行
        logger.trace({ testCase: expect.getState().currentTestName }, '======= 開始 =======')
        await memberSiteController.idLinkingProcess(request, response, next)
        expect(loggerInfoSpy).toHaveBeenNthCalledWith(1, logMessageDefine.INF000 + functionName)
        expect(loggerInfoSpy).toHaveBeenLastCalledWith(logMessageDefine.INF001 + functionName)
        logger.trace({ testCase: expect.getState().currentTestName }, '======= 終了 =======')
      })

      test('02 予期せぬエラー', async () => {
        /* テスト条件設定 */
        /* テスト条件設定 */
        // decodeJwtTokenSpy：正常
        fingerprintVerifySpy.mockReturnValue(Object)

        // getDigitaltradeTokenBydtTokenSpy：正常
        deleteDigitaltradeTokenSpy.mockReturnValue(Object)

        // updateDtTokenFlgSpy:正常
        idAssociationSpy.mockReturnValue(Object)

        // デジトレセッションの定義
        request.session.memberSiteCoopSession = memberSiteSessionDto
        request.user = tradeshiftUserInfo

        // fingerprint設定
        request.body = { fingerprint: digitaltaldeTokenInfo.fingerprint }

        // 試験対象関数実行
        logger.trace({ testCase: expect.getState().currentTestName }, '======= 開始 =======')
        // 引数をNULLにすることで、runtimeエラーを発生させる
        await memberSiteController.idLinkingProcess(null, response, next)
        expect(loggerErrorSpy).toHaveBeenNthCalledWith(
          1,
          { error: "Cannot read property 'session' of null" },
          'ERR-MB999 idLinkingProcess:Runtime error'
        )
        logger.trace({ testCase: expect.getState().currentTestName }, '======= 終了 =======')
      })
    })

    describe('03 セッション定義', () => {
      beforeEach(() => {
        request.session = {}
        memberSiteSessionDto = new MemberSiteCoopSessionDto()
      })
      afterEach(() => {})
      test('01 セッションが未定義の場合', async () => {
        /* テスト条件設定 */
        // decodeJwtTokenSpy：正常
        fingerprintVerifySpy.mockReturnValue(Object)

        // getDigitaltradeTokenBydtTokenSpy：正常
        deleteDigitaltradeTokenSpy.mockReturnValue(Object)

        // updateDtTokenFlgSpy:正常
        idAssociationSpy.mockReturnValue(Object)

        // デジトレセッションの定義
        request.user = tradeshiftUserInfo

        // fingerprint設定
        request.body = { fingerprint: digitaltaldeTokenInfo.fingerprint }

        // 試験対象関数実行
        logger.trace({ testCase: expect.getState().currentTestName }, '======= 開始 =======')
        await memberSiteController.idLinkingProcess(request, response, next)
        expect(loggerTraceSpy.mock.calls[1][0]).not.toEqual(memberSiteSessionDto)
        expect(request.session.memberSiteCoopSession.digitaltradeId).toBe(null)
        logger.trace({ testCase: expect.getState().currentTestName }, '======= 終了 =======')
      })
      test('02 セッションが定義済みの場合', async () => {
        /* テスト条件設定 */
        /* テスト条件設定 */
        // decodeJwtTokenSpy：正常
        fingerprintVerifySpy.mockReturnValue(Object)

        // getDigitaltradeTokenBydtTokenSpy：正常
        deleteDigitaltradeTokenSpy.mockReturnValue(Object)

        // updateDtTokenFlgSpy:正常
        idAssociationSpy.mockReturnValue(Object)

        // デジトレセッションの定義
        memberSiteSessionDto.digitaltradeId = 'dummyId'
        request.session.memberSiteCoopSession = memberSiteSessionDto
        request.user = tradeshiftUserInfo

        // fingerprint設定
        request.body = { fingerprint: digitaltaldeTokenInfo.fingerprint }

        // 試験対象関数実行
        logger.trace({ testCase: expect.getState().currentTestName }, '======= 開始 =======')
        // 引数をNULLにすることで、runtimeエラーを発生させる
        await memberSiteController.idLinkingProcess(request, response, next)
        expect(loggerTraceSpy.mock.calls[1][0]).toEqual({ mSiteSessionDto: memberSiteSessionDto })
        logger.trace({ testCase: expect.getState().currentTestName }, '======= 終了 =======')
      })
    })

    describe('04 oauth実施確認', () => {
      beforeEach(() => {
        request.session = {}
        memberSiteSessionDto = new MemberSiteCoopSessionDto()
      })
      afterEach(() => {})
      test('01 oauth未実施①', async () => {
        /* テスト条件設定 */
        // decodeJwtTokenSpy：正常
        fingerprintVerifySpy.mockReturnValue(Object)

        // getDigitaltradeTokenBydtTokenSpy：正常
        deleteDigitaltradeTokenSpy.mockReturnValue(Object)

        // updateDtTokenFlgSpy:正常
        idAssociationSpy.mockReturnValue(Object)

        // デジトレセッションの定義
        request.session = null
        request.user = null

        // fingerprint設定
        request.body = { fingerprint: digitaltaldeTokenInfo.fingerprint }

        // 試験対象関数実行
        logger.trace({ testCase: expect.getState().currentTestName }, '======= 開始 =======')
        await memberSiteController.idLinkingProcess(request, response, next)
        expect(next).toHaveBeenCalledWith(next(errorHelper.create(500)))
        expect(loggerErrorSpy).toHaveBeenLastCalledWith('ERR-MB101 Illegal transition:oauth NG')
        logger.trace({ testCase: expect.getState().currentTestName }, '======= 終了 =======')
      })
      test('02 oauth未実施②', async () => {
        /* テスト条件設定 */
        // decodeJwtTokenSpy：正常
        fingerprintVerifySpy.mockReturnValue(Object)

        // getDigitaltradeTokenBydtTokenSpy：正常
        deleteDigitaltradeTokenSpy.mockReturnValue(Object)

        // updateDtTokenFlgSpy:正常
        idAssociationSpy.mockReturnValue(Object)

        // デジトレセッションの定義
        request.session.memberSiteCoopSession = memberSiteSessionDto
        request.user = null

        // fingerprint設定
        request.body = { fingerprint: digitaltaldeTokenInfo.fingerprint }

        // 試験対象関数実行
        logger.trace({ testCase: expect.getState().currentTestName }, '======= 開始 =======')
        await memberSiteController.idLinkingProcess(request, response, next)
        expect(next).toHaveBeenCalledWith(next(errorHelper.create(500)))
        expect(loggerErrorSpy).toHaveBeenLastCalledWith('ERR-MB101 Illegal transition:oauth NG')
        logger.trace({ testCase: expect.getState().currentTestName }, '======= 終了 =======')
      })
      test('03 oauth未実施③', async () => {
        /* テスト条件設定 */
        // decodeJwtTokenSpy：正常
        fingerprintVerifySpy.mockReturnValue(Object)

        // getDigitaltradeTokenBydtTokenSpy：正常
        deleteDigitaltradeTokenSpy.mockReturnValue(Object)

        // updateDtTokenFlgSpy:正常
        idAssociationSpy.mockReturnValue(Object)

        // デジトレセッションの定義
        request.session = null
        request.user = tradeshiftUserInfo

        // fingerprint設定
        request.body = { fingerprint: digitaltaldeTokenInfo.fingerprint }

        // 試験対象関数実行
        logger.trace({ testCase: expect.getState().currentTestName }, '======= 開始 =======')
        await memberSiteController.idLinkingProcess(request, response, next)
        expect(next).toHaveBeenCalledWith(next(errorHelper.create(500)))
        expect(loggerErrorSpy).toHaveBeenLastCalledWith('ERR-MB101 Illegal transition:oauth NG')
        logger.trace({ testCase: expect.getState().currentTestName }, '======= 終了 =======')
      })
    })

    describe('05 fingerprint検証', () => {
      beforeEach(() => {
        request.session = {}
        memberSiteSessionDto = new MemberSiteCoopSessionDto()
      })
      afterEach(() => {})
      test('01 fingerprint未受領', async () => {
        /* テスト条件設定 */
        // fingerprintVerifySpy ： 正常
        fingerprintVerifySpy.mockReturnValue(Object)

        // deleteDigitaltradeTokenSpy : 正常
        deleteDigitaltradeTokenSpy.mockReturnValue(Object)

        // idAssociationSpy : 正常
        idAssociationSpy.mockReturnValue(Object)

        // デジトレセッションの定義
        request.session.memberSiteCoopSession = memberSiteSessionDto
        request.user = tradeshiftUserInfo

        // fingerprint設定
        request.body = null

        // 試験対象関数実行
        logger.trace({ testCase: expect.getState().currentTestName }, '======= 開始 =======')
        await memberSiteController.idLinkingProcess(request, response, next)
        expect(loggerErrorSpy).toHaveBeenCalledWith('ERR-MB111 fingerprint is undefined')
        expect(next).toHaveBeenCalledWith(next(errorHelper.create(400)))
        logger.trace({ testCase: expect.getState().currentTestName }, '======= 終了 =======')
      })
      test('02 不正なfingerprint受領', async () => {
        /* テスト条件設定 */
        // fingerprintVerifySpy : エラー
        const fingerprintVerifyError = new Error('mock error')
        fingerprintVerifyError.name = 'ILLEGAL_FINGERPRINT'
        fingerprintVerifySpy.mockReturnValue(fingerprintVerifyError)

        // deleteDigitaltradeTokenSpy ： 正常
        deleteDigitaltradeTokenSpy.mockReturnValue(Object)

        // idAssociationSpy : 正常
        idAssociationSpy.mockReturnValue(Object)

        // デジトレセッションの定義
        memberSiteSessionDto.fingerprintVerifyFlg = false
        request.session.memberSiteCoopSession = memberSiteSessionDto
        request.user = tradeshiftUserInfo

        // fingerprint設定
        request.body = { fingerprint: digitaltaldeTokenInfo.fingerprint }

        // 試験対象関数実行
        logger.trace({ testCase: expect.getState().currentTestName }, '======= 開始 =======')
        await memberSiteController.idLinkingProcess(request, response, next)
        expect(next).toHaveBeenCalledWith(next(errorHelper.create(400)))
        logger.trace({ testCase: expect.getState().currentTestName }, '======= 終了 =======')
      })
      test('03 fingerprint検証処理失敗', async () => {
        /* テスト条件設定 */
        // fingerprintVerifySpy : エラー
        const fingerprintVerifyError = new Error('mock error')
        fingerprintVerifyError.name = 'DB_ERROR'
        fingerprintVerifySpy.mockReturnValue(fingerprintVerifyError)

        // deleteDigitaltradeTokenSpy ： 正常
        deleteDigitaltradeTokenSpy.mockReturnValue(Object)

        // idAssociationSpy : 正常
        idAssociationSpy.mockReturnValue(Object)

        // デジトレセッションの定義
        memberSiteSessionDto.fingerprintVerifyFlg = false
        request.session.memberSiteCoopSession = memberSiteSessionDto
        request.user = tradeshiftUserInfo

        // fingerprint設定
        request.body = { fingerprint: digitaltaldeTokenInfo.fingerprint }

        // 試験対象関数実行
        logger.trace({ testCase: expect.getState().currentTestName }, '======= 開始 =======')
        await memberSiteController.idLinkingProcess(request, response, next)
        expect(next).toHaveBeenCalledWith(next(errorHelper.create(500)))
        logger.trace({ testCase: expect.getState().currentTestName }, '======= 終了 =======')
      })
      test('04 fingerprint検証処理成功', async () => {
        /* テスト条件設定 */
        // fingerprintVerifySpy : 正常
        fingerprintVerifySpy.mockReturnValue(Object)

        // deleteDigitaltradeTokenSpy ： 正常
        deleteDigitaltradeTokenSpy.mockReturnValue(Object)

        // idAssociationSpy : 正常
        idAssociationSpy.mockReturnValue(Object)

        // デジトレセッションの定義
        memberSiteSessionDto.fingerprintVerifyFlg = false
        request.session.memberSiteCoopSession = memberSiteSessionDto
        request.user = tradeshiftUserInfo

        // fingerprint設定
        request.body = { fingerprint: digitaltaldeTokenInfo.fingerprint }

        // 試験対象関数実行
        logger.trace({ testCase: expect.getState().currentTestName }, '======= 開始 =======')
        await memberSiteController.idLinkingProcess(request, response, next)
        expect(deleteDigitaltradeTokenSpy).toHaveBeenCalledWith(memberSiteSessionDto)
        expect(request.session.memberSiteCoopSession.fingerprintVerifyFlg).toBe(true)
        logger.trace({ testCase: expect.getState().currentTestName }, '======= 終了 =======')
      })
      test('05 fingerprint検証済み', async () => {
        /* テスト条件設定 */
        // fingerprintVerifySpy : 正常
        fingerprintVerifySpy.mockReturnValue(Object)

        // deleteDigitaltradeTokenSpy ： 正常
        deleteDigitaltradeTokenSpy.mockReturnValue(Object)

        // idAssociationSpy : 正常
        idAssociationSpy.mockReturnValue(Object)

        // デジトレセッションの定義
        memberSiteSessionDto.fingerprintVerifyFlg = true
        request.session.memberSiteCoopSession = memberSiteSessionDto
        request.user = tradeshiftUserInfo

        // fingerprint設定
        request.body = { fingerprint: digitaltaldeTokenInfo.fingerprint }

        // 試験対象関数実行
        logger.trace({ testCase: expect.getState().currentTestName }, '======= 開始 =======')
        await memberSiteController.idLinkingProcess(request, response, next)
        expect(fingerprintVerifySpy).not.toHaveBeenCalled()
        expect(deleteDigitaltradeTokenSpy).not.toHaveBeenCalled()
        logger.trace({ testCase: expect.getState().currentTestName }, '======= 終了 =======')
      })
    })

    describe('06 デジタルトレードトークン削除', () => {
      beforeEach(() => {
        request.session = {}
        memberSiteSessionDto = new MemberSiteCoopSessionDto()
      })
      afterEach(() => {})
      test('01 デジタルトレードトークン削除失敗', async () => {
        /* テスト条件設定 */
        // fingerprintVerifySpy : 正常
        fingerprintVerifySpy.mockReturnValue(Object)

        // deleteDigitaltradeTokenSpy ： エラー
        const deleteDigitaltradeTokenError = new Error('mock error')
        deleteDigitaltradeTokenSpy.mockReturnValue(deleteDigitaltradeTokenError)

        // idAssociationSpy : 正常
        idAssociationSpy.mockReturnValue(Object)

        // デジトレセッションの定義
        memberSiteSessionDto.fingerprintVerifyFlg = false
        request.session.memberSiteCoopSession = memberSiteSessionDto
        request.user = tradeshiftUserInfo

        // fingerprint設定
        request.body = { fingerprint: digitaltaldeTokenInfo.fingerprint }

        // 試験対象関数実行
        logger.trace({ testCase: expect.getState().currentTestName }, '======= 開始 =======')
        await memberSiteController.idLinkingProcess(request, response, next)
        expect(next).toHaveBeenCalledWith(next(errorHelper.create(500)))
        logger.trace({ testCase: expect.getState().currentTestName }, '======= 終了 =======')
      })
    })

    describe('07 ID紐づけ処理', () => {
      beforeEach(() => {
        request.session = {}
        memberSiteSessionDto = new MemberSiteCoopSessionDto()
      })
      afterEach(() => {})
      test('01 ID紐づけ処理失敗', async () => {
        /* テスト条件設定 */
        // fingerprintVerifySpy : 正常
        fingerprintVerifySpy.mockReturnValue(Object)

        // deleteDigitaltradeTokenSpy ： 正常
        deleteDigitaltradeTokenSpy.mockReturnValue(Object)

        // idAssociationSpy : エラー
        const idAssociationError = new Error('mock Error')
        idAssociationSpy.mockReturnValue(idAssociationError)

        // デジトレセッションの定義
        memberSiteSessionDto.fingerprintVerifyFlg = false
        request.session.memberSiteCoopSession = memberSiteSessionDto
        request.user = tradeshiftUserInfo

        // fingerprint設定
        request.body = { fingerprint: digitaltaldeTokenInfo.fingerprint }

        // 試験対象関数実行
        logger.trace({ testCase: expect.getState().currentTestName }, '======= 開始 =======')
        await memberSiteController.idLinkingProcess(request, response, next)
        expect(next).toHaveBeenCalledWith(next(errorHelper.create(500)))
        logger.trace({ testCase: expect.getState().currentTestName }, '======= 終了 =======')
      })
    })

    describe('08 正常処理', () => {
      beforeEach(() => {
        request.session = {}
        memberSiteSessionDto = new MemberSiteCoopSessionDto()
      })
      afterEach(() => {})
      test('01 正常処理 fingerprint検証を実施する場合', async () => {
        /* テスト条件設定 */
        // fingerprintVerifySpy : 正常
        fingerprintVerifySpy.mockReturnValue(Object)

        // deleteDigitaltradeTokenSpy ： 正常
        deleteDigitaltradeTokenSpy.mockReturnValue(Object)

        // idAssociationSpy : 正常
        idAssociationSpy.mockReturnValue(Object)

        // デジトレセッションの定義
        memberSiteSessionDto.memberSiteFlg = true
        memberSiteSessionDto.bcdAppValidFlg = true
        memberSiteSessionDto.tradeshiftRedirectExecutionFlg = false
        memberSiteSessionDto.fingerprintVerifyFlg = false
        request.session.memberSiteCoopSession = memberSiteSessionDto
        request.user = tradeshiftUserInfo

        // fingerprint設定
        request.body = { fingerprint: digitaltaldeTokenInfo.fingerprint }

        // 試験対象関数実行
        logger.trace({ testCase: expect.getState().currentTestName }, '======= 開始 =======')
        await memberSiteController.idLinkingProcess(request, response, next)
        expect(fingerprintVerifySpy).toHaveBeenCalledWith(digitaltaldeTokenInfo.fingerprint, memberSiteSessionDto)
        expect(deleteDigitaltradeTokenSpy).toHaveBeenCalledWith(memberSiteSessionDto)
        expect(idAssociationSpy).toHaveBeenCalledWith(memberSiteSessionDto)

        expect(request.session.memberSiteCoopSession.memberSiteFlg).toBe(true)
        expect(request.session.memberSiteCoopSession.bcdAppValidFlg).toBe(true)
        expect(request.session.memberSiteCoopSession.tradeshiftRedirectExecutionFlg).toBe(false)
        expect(request.session.memberSiteCoopSession.fingerprintVerifyFlg).toBe(true)

        expect(next).toHaveBeenCalled()
        logger.trace({ testCase: expect.getState().currentTestName }, '======= 終了 =======')
      })
      test('02 正常処理 fingerprint検証を実施しない場合', async () => {
        /* テスト条件設定 */
        // fingerprintVerifySpy : 正常
        fingerprintVerifySpy.mockReturnValue(Object)

        // deleteDigitaltradeTokenSpy ： 正常
        deleteDigitaltradeTokenSpy.mockReturnValue(Object)

        // idAssociationSpy : 正常
        idAssociationSpy.mockReturnValue(Object)

        // デジトレセッションの定義
        memberSiteSessionDto.memberSiteFlg = true
        memberSiteSessionDto.bcdAppValidFlg = true
        memberSiteSessionDto.tradeshiftRedirectExecutionFlg = false
        memberSiteSessionDto.fingerprintVerifyFlg = true
        request.session.memberSiteCoopSession = memberSiteSessionDto
        request.user = tradeshiftUserInfo

        // fingerprint設定
        request.body = { fingerprint: digitaltaldeTokenInfo.fingerprint }

        // 試験対象関数実行
        logger.trace({ testCase: expect.getState().currentTestName }, '======= 開始 =======')
        await memberSiteController.idLinkingProcess(request, response, next)
        expect(fingerprintVerifySpy).not.toHaveBeenCalled()
        expect(deleteDigitaltradeTokenSpy).not.toHaveBeenCalled()
        expect(idAssociationSpy).toHaveBeenCalledWith(memberSiteSessionDto)

        expect(request.session.memberSiteCoopSession.memberSiteFlg).toBe(true)
        expect(request.session.memberSiteCoopSession.bcdAppValidFlg).toBe(true)
        expect(request.session.memberSiteCoopSession.tradeshiftRedirectExecutionFlg).toBe(false)
        expect(request.session.memberSiteCoopSession.fingerprintVerifyFlg).toBe(true)

        expect(next).toHaveBeenCalled()
        logger.trace({ testCase: expect.getState().currentTestName }, '======= 終了 =======')
      })
    })

    describe('09 異常処理', () => {
      beforeEach(() => {
        request.session = {}
        memberSiteSessionDto = new MemberSiteCoopSessionDto()
      })
      afterEach(() => {})
      test('01 異常処理', async () => {
        /* テスト条件設定 */
        // fingerprintVerifySpy : エラー
        fingerprintVerifySpy.mockImplementation(() => {
          throw dummyError
        })

        // deleteDigitaltradeTokenSpy ： 正常
        deleteDigitaltradeTokenSpy.mockReturnValue(Object)

        // idAssociationSpy : 正常
        idAssociationSpy.mockReturnValue(Object)

        // デジトレセッションの定義
        memberSiteSessionDto.memberSiteFlg = true
        memberSiteSessionDto.bcdAppValidFlg = true
        memberSiteSessionDto.tradeshiftRedirectExecutionFlg = false
        memberSiteSessionDto.fingerprintVerifyFlg = false
        request.session.memberSiteCoopSession = memberSiteSessionDto
        request.user = tradeshiftUserInfo

        // fingerprint設定
        request.body = { fingerprint: digitaltaldeTokenInfo.fingerprint }

        // 試験対象関数実行
        logger.trace({ testCase: expect.getState().currentTestName }, '======= 開始 =======')
        await memberSiteController.idLinkingProcess(request, response, next)
        expect(loggerErrorSpy).toHaveBeenLastCalledWith(
          { error: dummyError.message },
          'ERR-MB999 idLinkingProcess:Runtime error'
        )
        expect(next).toHaveBeenCalled(errorHelper.create(500))
        logger.trace({ testCase: expect.getState().currentTestName }, '======= 終了 =======')
      })
    })
  })

  describe('06 fingerprintVerify UTテスト', () => {
    let getFingerprintBydigitaltradeIdSpy
    beforeEach(() => {
      getFingerprintBydigitaltradeIdSpy = jest.spyOn(menberSiteControllerDao, 'getFingerprintBydigitaltradeId')
    })
    afterEach(() => {
      getFingerprintBydigitaltradeIdSpy.mockRestore()
    })
    const functionName = 'fingerprintVerify'

    describe('02 ログ出力', () => {
      beforeEach(() => {
        request.session = {}
        memberSiteSessionDto = new MemberSiteCoopSessionDto()
      })
      afterEach(() => {})
      test('01 開始・終了ログの出力', async () => {
        /* テスト条件設定 */
        // getFingerprintBydigitaltradeIdSpy ： 正常
        getFingerprintBydigitaltradeIdSpy.mockReturnValue(digitaltaldeTokenInfo)

        // デジトレセッションの定義

        // 試験対象関数実行
        logger.trace({ testCase: expect.getState().currentTestName }, '======= 開始 =======')
        await memberSiteController.privateFunc.fingerprintVerify(
          digitaltaldeTokenInfo.fingerprint,
          memberSiteSessionDto
        )
        expect(loggerInfoSpy).toHaveBeenNthCalledWith(1, logMessageDefine.INF000 + functionName)
        expect(loggerInfoSpy).toHaveBeenLastCalledWith(logMessageDefine.INF001 + functionName)
        logger.trace({ testCase: expect.getState().currentTestName }, '======= 終了 =======')
      })

      test('02 予期せぬエラー', async () => {
        /* テスト条件設定 */
        // getFingerprintBydigitaltradeIdSpy ： エラー
        getFingerprintBydigitaltradeIdSpy.mockImplementation(() => {
          throw dummyError
        })

        // 試験対象関数実行
        logger.trace({ testCase: expect.getState().currentTestName }, '======= 開始 =======')
        // 引数をNULLにすることで、runtimeエラーを発生させる
        await memberSiteController.privateFunc.fingerprintVerify(
          digitaltaldeTokenInfo.fingerprint,
          memberSiteSessionDto
        )
        expect(loggerErrorSpy).toHaveBeenNthCalledWith(
          1,
          { error: dummyError.message },
          'ERR-MB999 fingerprintVerify:Runtime error'
        )
        logger.trace({ testCase: expect.getState().currentTestName }, '======= 終了 =======')
      })
    })

    describe('03 デジタルトレードトークン情報取得', () => {
      beforeEach(() => {
        request.session = {}
        memberSiteSessionDto = new MemberSiteCoopSessionDto()
      })
      afterEach(() => {})
      test('01 デジトレトークン取得失敗', async () => {
        /* テスト条件設定 */
        // getFingerprintBydigitaltradeIdSpy ： エラー
        const getFingerprintBydigitaltradeIdError = new Error('mock error')
        getFingerprintBydigitaltradeIdSpy.mockReturnValue(getFingerprintBydigitaltradeIdError)

        // デジトレセッションの定義

        // 試験対象関数実行
        logger.trace({ testCase: expect.getState().currentTestName }, '======= 開始 =======')
        const result = await memberSiteController.privateFunc.fingerprintVerify(
          digitaltaldeTokenInfo.fingerprint,
          memberSiteSessionDto
        )
        expect(result).toBe(getFingerprintBydigitaltradeIdError)

        logger.trace({ testCase: expect.getState().currentTestName }, '======= 終了 =======')
      })
    })

    describe('04 fingerprint値の検証', () => {
      beforeEach(() => {
        request.session = {}
        memberSiteSessionDto = new MemberSiteCoopSessionDto()
      })
      afterEach(() => {})
      test('01 fingerprint値の検証失敗', async () => {
        /* テスト条件設定 */
        // getFingerprintBydigitaltradeIdSpy ： 正常
        getFingerprintBydigitaltradeIdSpy.mockReturnValue(digitaltaldeTokenInfo)

        // デジトレセッションの定義

        // 試験対象関数実行
        logger.trace({ testCase: expect.getState().currentTestName }, '======= 開始 =======')
        const result = await memberSiteController.privateFunc.fingerprintVerify(
          digitaltaldeTokenInfo.fingerprint + 'dummy',
          memberSiteSessionDto
        )
        expect(loggerErrorSpy).toHaveBeenCalledWith('ERR-MB112 fingerprintVerify:Illegal fingerprint')
        expect(result.name).toBe('ILLEGAL_FINGERPRINT')

        logger.trace({ testCase: expect.getState().currentTestName }, '======= 終了 =======')
      })
    })

    describe('05 正常処理', () => {
      beforeEach(() => {
        request.session = {}
        memberSiteSessionDto = new MemberSiteCoopSessionDto()
      })
      afterEach(() => {})
      test('01 正常処理', async () => {
        /* テスト条件設定 */
        // getFingerprintBydigitaltradeIdSpy ： 正常
        getFingerprintBydigitaltradeIdSpy.mockReturnValue(digitaltaldeTokenInfo)

        // デジトレセッションの定義

        memberSiteSessionDto.digitaltradeId = digitaltaldeTokenInfo.digitaltradeId
        memberSiteSessionDto.digitaltradeToken = digitaltaldeTokenInfo.dtToken

        // 試験対象関数実行
        logger.trace({ testCase: expect.getState().currentTestName }, '======= 開始 =======')
        const result = await memberSiteController.privateFunc.fingerprintVerify(
          digitaltaldeTokenInfo.fingerprint,
          memberSiteSessionDto
        )
        expect(getFingerprintBydigitaltradeIdSpy).toHaveBeenCalledWith(
          memberSiteSessionDto.digitaltradeId,
          memberSiteSessionDto.digitaltradeToken
        )
        expect(result).toBe(true)

        logger.trace({ testCase: expect.getState().currentTestName }, '======= 終了 =======')
      })
    })

    describe('06 異常処理', () => {
      beforeEach(() => {
        request.session = {}
        memberSiteSessionDto = new MemberSiteCoopSessionDto()
      })
      afterEach(() => {})
      test('01 異常処理', async () => {
        /* テスト条件設定 */
        // getFingerprintBydigitaltradeIdSpy ： エラー
        getFingerprintBydigitaltradeIdSpy.mockImplementation(() => {
          throw dummyError
        })

        // デジトレセッションの定義
        memberSiteSessionDto.digitaltradeId = digitaltaldeTokenInfo.digitaltradeId
        memberSiteSessionDto.digitaltradeToken = digitaltaldeTokenInfo.dtToken

        // 試験対象関数実行
        logger.trace({ testCase: expect.getState().currentTestName }, '======= 開始 =======')
        const result = await memberSiteController.privateFunc.fingerprintVerify(
          digitaltaldeTokenInfo.fingerprint,
          memberSiteSessionDto
        )
        expect(loggerErrorSpy).toHaveBeenCalledWith(
          { error: dummyError.message },
          'ERR-MB999 fingerprintVerify:Runtime error'
        )

        expect(result).toEqual(dummyError)

        logger.trace({ testCase: expect.getState().currentTestName }, '======= 終了 =======')
      })
    })
  })
})
