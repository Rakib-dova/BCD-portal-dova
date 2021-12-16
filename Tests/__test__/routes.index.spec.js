'use strict'
jest.mock('../../Application/node_modules/express', () => {
  return require('jest-express')
})
const index = require('../../Application/routes/index')
const Request = require('jest-express').Request
const Response = require('jest-express').Response
const next = require('jest-express').Next

if (process.env.LOCALLY_HOSTED === 'true') {
  // NODE_ENVはJestがデフォルトでtestに指定する。dotenvで上書きできなかったため、package.jsonの実行引数でdevelopmentを指定
  require('dotenv').config({ path: './config/.env' })
}
let request, response
describe('indexのテスト', () => {
  beforeEach(() => {
    request = new Request()
    response = new Response()
  })
  afterEach(() => {
    request.resetMocked()
    response.resetMocked()
    next.mockReset()
  })

  describe('ルーティング', () => {
    test('indexのルーティングを確認', async () => {
      expect(index.router.get).toBeCalledWith('/', index.cbGetIndex)
    })
  })

  describe('コールバック', () => {
    test('authにリダイレクトされることを確認', async () => {
      await index.cbGetIndex(request, response, next)
      expect(response.redirect).toHaveBeenCalled()
      expect(response.redirect).toHaveBeenCalledWith(303, '/auth')
      expect(response.getHeader('Location')).toEqual('/auth')
    })

    test('アカウント登録ページに遷移(dx_store経由)', async () => {
      request.query.transition = 'sinup'
      request.query.dxstoreFlg = 'true'

      await index.cbGetIndex(request, response, next)
      expect(response.redirect).toHaveBeenCalled()
      expect(response.redirect).toHaveBeenCalledWith(303, 'https://sandbox.tradeshift.com/register')
      expect(response.getHeader('Location')).toEqual('https://sandbox.tradeshift.com/register')

      expect(response.cookie).toHaveBeenCalledWith('CustomReferrer', 'dxstore', {
        secure: true,
        httpOnly: false,
        sameSite: 'none',
        maxAge: 86400000
      })
    })

    test('アカウント登録ページに遷移', async () => {
      request.query.transition = 'sinup'

      await index.cbGetIndex(request, response, next)
      expect(response.redirect).toHaveBeenCalled()
      expect(response.redirect).toHaveBeenCalledWith(303, 'https://sandbox.tradeshift.com/register')
      expect(response.getHeader('Location')).toEqual('https://sandbox.tradeshift.com/register')
    })

    test('ログインページページに遷移(dx_store経由)', async () => {
      request.query.transition = 'login'
      request.query.dxstoreFlg = 'true'

      await index.cbGetIndex(request, response, next)
      expect(response.redirect).toHaveBeenCalled()
      expect(response.redirect).toHaveBeenCalledWith(303, 'https://sandbox.tradeshift.com/?currentScreen=0')
      expect(response.getHeader('Location')).toEqual('https://sandbox.tradeshift.com/?currentScreen=0')

      expect(response.cookie).toHaveBeenCalledWith('CustomReferrer', 'dxstore', {
        secure: true,
        httpOnly: false,
        sameSite: 'none',
        maxAge: 86400000
      })
    })

    test('ログインページページに遷移', async () => {
      request.query.transition = 'login'

      await index.cbGetIndex(request, response, next)
      expect(response.redirect).toHaveBeenCalled()
      expect(response.redirect).toHaveBeenCalledWith(303, 'https://sandbox.tradeshift.com/?currentScreen=0')
      expect(response.getHeader('Location')).toEqual('https://sandbox.tradeshift.com/?currentScreen=0')
    })
  })
})
