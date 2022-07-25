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

describe('searchAddressApi', () => {
  test('searchAddressApi', async () => {
    expect(searchAddressApi.router.post).toBeCalledWith('/', searchAddressApi.cbSearchAddress)
  })
})

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
    test('正常：認証情報取得ができた場合', async () => {
      // 準備
      // sessionとuserに正常値を想定する
      request.session = {
        userContext: 'NotTenantRegistered'
      }
      request.user = {
        userId: '12345678-cb0b-48ad-857d-4b42a44ede13'
      }

      // DBからの検索する郵便番号想定する
      request.body = {
        postalNumber: '0640941'
      }

      // DB結果設定
      postalNumberSpy.mockResolvedValue({ statuscode: 200, value: [{ address: 'テスト県テスト市' }] })
      // 試験実施
      await searchAddressApi.cbSearchAddress(request, response)

      // 期待結果
      // response.statusが200
      expect(response.status).toHaveBeenCalledWith(200)
    })

    test('403エラー：認証情報取得失敗した場合', async () => {
      // 準備
      request.body = {
        postalNumber: '0640941'
      }

      // DB結果設定
      postalNumberSpy.mockResolvedValue()
      // 試験実施
      await searchAddressApi.cbSearchAddress(request, response)

      // 期待結果
      // 403エラーがエラーハンドリング「される」
      expect(response.status).toHaveBeenCalledWith(403)
    })

    test('400エラー：リクエストボディがない場合', async () => {
      // 準備
      // sessionとuserに正常値を想定する
      request.session = {
        userContext: 'NotTenantRegistered'
      }
      request.user = {
        userId: '12345678-cb0b-48ad-857d-4b42a44ede13'
      }

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
      // sessionとuserに正常値を想定する
      request.session = {
        userContext: 'NotTenantRegistered'
      }
      request.user = {
        userId: '12345678-cb0b-48ad-857d-4b42a44ede13'
      }

      request.body = {
        postalNumber: '064094a'
      }

      // CSRF対策
      request.csrfToken = jest.fn()
      // DB結果設定
      postalNumberSpy.mockResolvedValue([{ address: 'テスト県テスト市' }])
      // 試験実施
      await searchAddressApi.cbSearchAddress(request, response)

      // 期待結果
      // 400エラーがエラーハンドリング「される」
      expect(response.status).toHaveBeenCalledWith(400)
    })

    test('500エラー：DBコネクションがえらーが発生した場合', async () => {
      // 準備
      // sessionとuserに正常値を想定する
      request.session = {
        userContext: 'NotTenantRegistered'
      }
      request.user = {
        userId: '12345678-cb0b-48ad-857d-4b42a44ede13'
      }

      request.body = {
        postalNumber: '0640941'
      }

      // CSRF対策
      request.csrfToken = jest.fn()
      // DB結果設定
      postalNumberSpy.mockResolvedValue({ statuscode: 501, value: 'failed connectd' })
      // 試験実施
      await searchAddressApi.cbSearchAddress(request, response)

      // 期待結果
      // 500エラーがエラーハンドリング「される」
      expect(response.status).toHaveBeenCalledWith(500)
    })

    test('500エラー：DB文がエラーの場合', async () => {
      // 準備
      // sessionとuserに正常値を想定する
      request.session = {
        userContext: 'NotTenantRegistered'
      }
      request.user = {
        userId: '12345678-cb0b-48ad-857d-4b42a44ede13'
      }

      request.body = {
        postalNumber: '0640941'
      }

      // DB結果設定
      postalNumberSpy.mockResolvedValue({ statuscode: 502, value: 'statement error' })
      // 試験実施
      await searchAddressApi.cbSearchAddress(request, response)

      // 期待結果
      // 500エラーがエラーハンドリング「される」
      expect(response.status).toHaveBeenCalledWith(500)
    })
  })
})
