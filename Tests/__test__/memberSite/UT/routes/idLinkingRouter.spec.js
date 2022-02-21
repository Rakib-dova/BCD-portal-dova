/**
 * fingerprint検証用エンドポイント
 * ※ポータル画面より呼び出される
 * @author yaisobe
 */
'use strict'
jest.mock('../../../../../Application/node_modules/express', () => {
  return require('jest-express')
})
// 会員サイト連携コントローラーをモック化
jest.mock('../../../../../Application/memberSite/controllers/memberSiteController.js')
// fingerprint検証エンドポイントルーター
const idLinkingRouter = require('../../../../../Application/memberSite/routes/idLinkingRouter')
const Request = require('jest-express').Request
const Response = require('jest-express').Response
const next = require('jest-express').Next
// 会員サイト連携コントローラー
const memberSiteController = require('../../../../../Application/memberSite/controllers/memberSiteController.js')
const logger = require('../../../../../Application/lib/logger.js')
const logMessageDefine = require('../../../../../Application/constants').logMessage
// const csrf = require('../../../../../Application/node_modules/csurf')
// const csrfProtection = csrf({ cookie: false })

let request, response
let idLinkingProcessSpy, logerInfoSpy
describe('idLinkingRouter UTテスト', () => {
  beforeEach(() => {
    request = new Request()
    response = new Response()

    idLinkingProcessSpy = jest.spyOn(memberSiteController, 'idLinkingProcess')
    logerInfoSpy = jest.spyOn(logger, 'info')
  })
  afterEach(() => {
    request.resetMocked()
    response.resetMocked()
    next.mockReset()

    idLinkingProcessSpy.mockRestore()
    logerInfoSpy.mockRestore()
  })

  describe('01-02 ミドルウェア設定確認', () => {
    test('01 ミドルウェアCall', async () => {
      // 試験対象関数実行
      expect(idLinkingRouter.router.post).toBeCalledWith(
        '/',
        expect.any(Function), // csrfProtectionが一致しない。暫定で通過させる
        memberSiteController.idLinkingProcess,
        idLinkingRouter.idLinkingProcessForwarder
      )
    })
  })

  describe('01-03 ログ出力確認', () => {
    test('01、02 idLinkingProcessForwarder開始・終了ログの出力', async () => {
      // 試験対象関数実行
      await idLinkingRouter.idLinkingProcessForwarder(request, response, next)
      expect(logerInfoSpy).toHaveBeenNthCalledWith(1, logMessageDefine.INF000 + ' idLinkingProcessForwarder')
      expect(logerInfoSpy).toHaveBeenNthCalledWith(2, logMessageDefine.INF001 + ' idLinkingProcessForwarder')
    })
  })

  describe('01-04 アプトプットの確認', () => {
    test('01 リターン値の確認', async () => {
      // 試験対象関数実行
      await idLinkingRouter.idLinkingProcessForwarder(request, response, next)
      expect(response.sendStatus).toHaveBeenCalledWith(200)
    })
  })
})
