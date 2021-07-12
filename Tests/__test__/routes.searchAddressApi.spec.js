'use strict'
jest.mock('../../Application/node_modules/express', () => {
  return require('jest-express')
})
const searchAddressApi = require('../../Application/routes/searchAddressApi')
const postalNumberController = require('../../Application/controllers/postalNumberController')
const Request = require('jest-express').Request
const Response = require('jest-express').Response
const next = require('jest-express').Next

if (process.env.LOCALLY_HOSTED === 'true') {
  // NODE_ENVはJestがデフォルトでtestに指定する。dotenvで上書きできなかったため、package.jsonの実行引数でdevelopmentを指定
  require('dotenv').config({ path: './config/.env' })
}
let request, response
describe('searchAddressApiのテスト', () => {
  beforeEach(() => {
    request = new Request()
    response = new Response()
  })
  afterEach(() => {
    request.resetMocked()
    response.resetMocked()
    next.mockReset()
  })

  describe('cbSearchAddress', () => {
    test('正常：セッション内のuserContextがNotUserRegisteredの場合', async () => {
      // 準備
      // session.userContextに正常値(NotUserRegistered)を想定する
      request.session = {
        userContext: 'NotUserRegistered'
      }

      request.body = {
        postalNumber: '3530000'
      }

      // CSRF対策
      request.csrfToken = jest.fn()
      // 試験実施
      await searchAddressApi.cbSearchAddress(request, response)

      // 期待結果
      // response.statusが200
      expect(response.status).toHaveBeenCalledWith(200)
    })

    test('400エラー：セッション内のuserContextがNotUserRegisteredではない場合', async () => {
      // 準備
      // session.userContextに異常値(NotUserRegistered「以外」)を想定する
      request.session = {
        userContext: 'dummy'
      }

      request.body = {
        postalNumber: '3530000'
      }

      // CSRF対策
      request.csrfToken = jest.fn()
      // 試験実施
      await searchAddressApi.cbSearchAddress(request, response)

      // 期待結果
      // 400エラーがエラーハンドリング「される」
      expect(response.status).toHaveBeenCalledWith(400)
    })
  })
})
