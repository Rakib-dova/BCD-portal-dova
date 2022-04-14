/**
 * auth.jsの会員サイト追加部用テイスト
 * @author yaisobe
 */
'use strict'
jest.mock('../../../../Application/node_modules/express', () => {
  return require('jest-express')
})
// 会員サイト連携コントローラーをモック化
jest.mock('../../../../Application/memberSite/controllers/memberSiteController.js')
// oauthCallbackエンドポイントルーター
const oauthRouter = require('../../../../Application/routes/auth')
const Request = require('jest-express').Request
const Response = require('jest-express').Response
const next = require('jest-express').Next
// 会員サイト連携コントローラー
const memberSiteController = require('../../../../Application/memberSite/controllers/memberSiteController.js')

let request, response
let oauthCallbackTransfer
describe('oauthCallbackTransfer UTテスト', () => {
  beforeEach(() => {
    request = new Request()
    response = new Response()

    oauthCallbackTransfer = jest.spyOn(memberSiteController, 'oauthCallbackTransfer')
  })
  afterEach(() => {
    request.resetMocked()
    response.resetMocked()
    next.mockReset()

    oauthCallbackTransfer.mockRestore()
  })

  describe('01-02 ミドルウェア設定確認', () => {
    test('01 ミドルウェアCall', async () => {
      // 試験対象関数実行
      expect(oauthRouter.router.get).toBeCalledWith('/', expect.any(Function))
      expect(oauthRouter.router.get).toBeCalledWith(
        '/callback',
        expect.any(Function),
        oauthCallbackTransfer,
        oauthRouter.cbGetCallback
      )
      expect(oauthRouter.router.get).toBeCalledWith('/failure', oauthRouter.cbGetFailure)
    })
  })
})
