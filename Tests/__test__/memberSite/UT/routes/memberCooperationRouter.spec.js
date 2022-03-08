/**
 * デジタルトレードアプリ起動エンドポイント
 * ※会員サイトのアプリ一覧より呼び出されるエンドポイント
 * @author yaisobe
 */
'use strict'
// expressモック化
jest.mock('../../../../../Application/node_modules/express', () => {
  return require('jest-express')
})

// 会員サイト連携コントローラーをモック化
jest.mock('../../../../../Application/memberSite/controllers/memberSiteController.js')
// デジタルトレードアプリ起動エンドポイントルーター
const memberSiteCoopRouter = require('../../../../../Application/memberSite/routes/memberCooperationRouter.js')
const Request = require('jest-express').Request
const Response = require('jest-express').Response
const next = require('jest-express').Next
// 会員サイト連携コントローラー
const memberSiteController = require('../../../../../Application/memberSite/controllers/memberSiteController.js')
const logger = require('../../../../../Application/lib/logger.js')

const logMessageDefine = require('../../../../../Application/constants').logMessage

let request, response
let oauthTransferSpy, logerInfoSpy
describe('memberCooperationRouter UTテスト', () => {
  beforeEach(() => {
    request = new Request()
    response = new Response()

    oauthTransferSpy = jest.spyOn(memberSiteController, 'oauthTransfer')
    logerInfoSpy = jest.spyOn(logger, 'info')
  })
  afterEach(() => {
    request.resetMocked()
    response.resetMocked()
    next.mockReset()

    oauthTransferSpy.mockRestore()
    logerInfoSpy.mockRestore()
  })

  describe('01-02 ミドルウェア設定確認', () => {
    test('01 ミドルウェアCall', async () => {
      // 試験対象関数実行
      expect(memberSiteCoopRouter.router.get).toBeCalledWith(
        '/',
        memberSiteController.oauthTransfer,
        memberSiteCoopRouter.memberCooperationForwarder
      )
    })
  })

  describe('01-03 ログ出力確認', () => {
    test('01、02 memberCooperationForwarder開始・終了ログの出力', async () => {
      // 試験対象関数実行
      await memberSiteCoopRouter.memberCooperationForwarder(request, response, next)
      expect(logerInfoSpy).toHaveBeenNthCalledWith(1, logMessageDefine.INF000 + ' memberCooperationForwarder')
      expect(logerInfoSpy).toHaveBeenNthCalledWith(2, logMessageDefine.INF001 + ' memberCooperationForwarder')
    })
  })

  describe('01-04 アプトプットの確認', () => {
    test('01 リダイレクト先確認', async () => {
      // 試験対象関数実行
      await memberSiteCoopRouter.memberCooperationForwarder(request, response, next)
      expect(response.redirect).toHaveBeenCalledWith(303, '/auth')
    })
  })
})
