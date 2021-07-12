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

let postalNumberSpy
let request, response

// DBの変数
process.env.DB_USER = 'sa'
process.env.DB_PASS = 'YiK5XRBYniKP'
process.env.DB_HOST = 'localhost'
process.env.DB_NAME = 'PortalAppDB'
describe('searchAddressApiのテスト', () => {
  beforeEach(() => {
    request = new Request()
    response = new Response()
    postalNumberSpy = jest.spyOn(postalNumberController, 'findOne')
  })
  afterEach(() => {
    request.resetMocked()
    response.resetMocked()
    next.mockReset()
    postalNumberSpy.mockRestore()
  })

  describe('cbSearchAddress', () => {
    test('正常：セッション内のuserContextがNotUserRegisteredの場合', async () => {
      // 準備
      // session.userContextに正常値(NotUserRegistered)を想定する
      request.session = {
        userContext: 'NotUserRegistered'
      } 
      // DBからの正常な住所データの取得想定する

      request.body = {
        postalNumber: '0640941'
      }

      // CSRF対策
      request.csrfToken = jest.fn()
      // DB結果設定
　　　postalNumberSpy.mockResolvedValue({statuscode:200, value: [{ 'address': 'テスト県テスト市'}]})
      // 試験実施
      await searchAddressApi.cbSearchAddress(request, response)

      // 期待結果
      // response.statusが200
      expect(response.status).toHaveBeenCalledWith(200)
    })

    test('403エラー：セッション内のuserContextがNotUserRegisteredではない場合', async () => {
      // 準備
      // session.userContextに異常値(NotUserRegistered「以外」)を想定する
      request.session = {
        userContext: 'dummy'
      }

      request.body = {
        postalNumber: '0640941'
      }

      // CSRF対策
      request.csrfToken = jest.fn()
      // DB結果設定
　　　postalNumberSpy.mockResolvedValue()
      // 試験実施
      await searchAddressApi.cbSearchAddress(request, response)

      // 期待結果
      // 400エラーがエラーハンドリング「される」
      expect(response.status).toHaveBeenCalledWith(403)
    })
    
    test('400エラー：リクエストボディがない場合', async () => {
      // 準備
      // session.userContextに異常値(NotUserRegistered「以外」)を想定する
      request.session = {
        userContext: 'NotUserRegistered'
      }
      
      // request body 形式
      //request.body = {
      //  postalNumber: '0640941'
      //}

      // CSRF対策
      request.csrfToken = jest.fn()
      // DB結果設定
　　　postalNumberSpy.mockResolvedValue()
      // 試験実施
      await searchAddressApi.cbSearchAddress(request, response)

      // 期待結果
      // 400エラーがエラーハンドリング「される」
      expect(response.status).toHaveBeenCalledWith(400)
    })

    test('400エラー：郵便番号が正しくない場合', async () => {
      // 準備
      // session.userContextに異常値(NotUserRegistered「以外」)を想定する
      request.session = {
        userContext: 'NotUserRegistered'
      }
      
      request.body = {
        postalNumber: '064094a'
      }

      // CSRF対策
      request.csrfToken = jest.fn()
      // DB結果設定
　　　postalNumberSpy.mockResolvedValue([{'address':'テスト県テスト市'}])
      // 試験実施
      await searchAddressApi.cbSearchAddress(request, response)

      // 期待結果
      // 400エラーがエラーハンドリング「される」
      expect(response.status).toHaveBeenCalledWith(400)
    })
    
    test('500エラー：DBコネクションがえらーが発生した場合', async () => {
      // 準備
      // session.userContextに異常値(NotUserRegistered「以外」)を想定する
      request.session = {
        userContext: 'NotUserRegistered'
      }
      
      request.body = {
        postalNumber: '0640941'
      }

      // CSRF対策
      request.csrfToken = jest.fn()
      // DB結果設定
　　　postalNumberSpy.mockResolvedValue({statuscode: 501, value: 'failed connectd'})
      // 試験実施
      await searchAddressApi.cbSearchAddress(request, response)

      // 期待結果
      // 400エラーがエラーハンドリング「される」
      expect(response.status).toHaveBeenCalledWith(500)
    })
    
    test('500エラー：DB文がエラーの場合', async () => {
      // 準備
      // session.userContextに異常値(NotUserRegistered「以外」)を想定する
      request.session = {
        userContext: 'NotUserRegistered'
      }
      
      request.body = {
        postalNumber: '0640941'
      }

      // CSRF対策
      request.csrfToken = jest.fn()
      // DB結果設定
　　　postalNumberSpy.mockResolvedValue({statuscode: 502, value: 'statement error'})
      // 試験実施
      await searchAddressApi.cbSearchAddress(request, response)

      // 期待結果
      // 400エラーがエラーハンドリング「される」
      expect(response.status).toHaveBeenCalledWith(500)
    })
  })
})
