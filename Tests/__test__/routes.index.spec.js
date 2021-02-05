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
  })
})
