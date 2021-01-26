'use strict'
jest.mock('../../Application/node_modules/express', () => {
  return require('jest-express')
})
jest.mock('../../Application/controllers/apiManager.js', () => ({
  accessTradeshift: (accessToken, refreshToken, method, query, body = {}) => {
    return null
  }
}))
const routesTenant = require('../../Application/routes/tenant')
const Request = require('jest-express').Request
const Response = require('jest-express').Response
const next = require('jest-express').Next
const errorHelper = require('../../Application/routes/helpers/error')
const helper = require('../../Application/routes/helpers/middleware')

if (process.env.LOCALLY_HOSTED === 'true') {
  require('dotenv').config({ path: './config/.env' })
}

let request, response, accessTradeshiftSpy, infoSpy
describe('tenantのテスト', () => {
  beforeEach(() => {
    request = new Request()
    response = new Response()

    // tenant.jsで使っている内部モジュールの関数をspyOn
    const apiManager = require('../../Application/controllers/apiManager.js')
    accessTradeshiftSpy = jest.spyOn(apiManager, 'accessTradeshift')

    const logger = require('../../Application/lib/logger.js')
    infoSpy = jest.spyOn(logger, 'info')
  })
  afterEach(() => {
    request.resetMocked()
    response.resetMocked()
    next.mockReset()
    accessTradeshiftSpy.mockRestore()
    infoSpy.mockRestore()
  })

  describe('ルーティング', () => {
    test('tenantのルーティングを確認', async () => {
      expect(routesTenant.router.get).toBeCalledWith('/register', helper.isAuthenticated, expect.any(Function))
      expect(routesTenant.router.post).toBeCalledWith('/register', helper.isAuthenticated, expect.any(Function))
    })
  })

  describe('cbGetRegister', () => {
    test('400エラー：セッション内のuserContextがNotTenantRegisteredではない場合', async () => {
      request.session = {
        userContext: 'TenantRegistered'
      }

      await routesTenant.cbGetRegister(request, response, next)

      // 400エラーがエラーハンドリング「される」
      expect(next).toHaveBeenCalledWith(errorHelper.create(400))

      // 利用登録がレンダー「されない」
      expect(response.render).not.toHaveBeenCalledWith('tenant-register', {
        title: '利用登録'
      })
    })

    test('500エラー：セッション内のuserのToken情報がnullの場合', async () => {
      request.session = {
        userContext: 'NotTenantRegistered'
      }
      request.user = {
        tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089',
        userId: '976d46d7-cb0b-48ad-857d-4b42a44ede13',
        accessToken: null,
        refreshToken: null
      }
      await routesTenant.cbGetRegister(request, response, next)

      // 500エラーがエラーハンドリング「される」
      expect(next).toHaveBeenCalledWith(errorHelper.create(500))

      // 利用登録がレンダー「されない」
      expect(response.render).not.toHaveBeenCalledWith('tenant-register', expect.anything())
    })

    test('500エラー：APIアクセスエラーが発生した場合', async () => {
      request.session = {
        userContext: 'NotTenantRegistered'
      }
      request.user = {
        tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089',
        userId: '976d46d7-cb0b-48ad-857d-4b42a44ede13',
        accessToken: 'dummyAccessToken',
        refreshToken: 'dummyRefreshToken'
      }
      //アクセスエラー
      accessTradeshiftSpy.mockReturnValue(new Error('Access error mock'))

      await routesTenant.cbGetRegister(request, response, next)

      // 500エラーがエラーハンドリング「される」
      expect(next).toHaveBeenCalledWith(errorHelper.create(500))

      // 利用登録がレンダー「されない」
      expect(response.render).not.toHaveBeenCalledWith('tenant-register', expect.anything())
    })

    test('403エラー：アカウント管理者権限のないユーザで操作した場合', async () => {
      request.session = {
        userContext: 'NotTenantRegistered'
      }
      request.user = {
        tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089',
        userId: '976d46d7-cb0b-48ad-857d-4b42a44ede13',
        accessToken: 'dummyAccessToken',
        refreshToken: 'dummyRefreshToken'
      }
      //管理者権限がない
      accessTradeshiftSpy.mockReturnValue(() => {
        return {
          Id: '976d46d7-cb0b-48ad-857d-4b42a44ede13',
          CompanyAccountId: '15e2d952-8ba0-42a4-8582-b234cb4a2089',
          CompanyName: 'UnitTestCompany',
          Username: 'dummy@example.com',
          Language: 'ja',
          TimeZone: 'Asia/Tokyo',
          Memberships: [
            {
              UserId: '976d46d7-cb0b-48ad-857d-4b42a44ede13',
              GroupId: '15e2d952-8ba0-42a4-8582-b234cb4a2089',
              Role: 'abcdefcd-00d9-427c-bf03-4ef0112ba16d'
            }
          ],
          Created: '2021-01-20T05:11:15.177Z',
          State: 'ACTIVE',
          Type: 'PERSON',
          FirstName: 'Yamada',
          LastName: 'Taro',
          Visible: true
        }
      })

      await routesTenant.cbGetRegister(request, response, next)

      // 403エラーがエラーハンドリング「される」
      expect(next).toHaveBeenCalledWith(errorHelper.create(403))

      // 利用登録がレンダー「されない」
      expect(response.render).not.toHaveBeenCalledWith('tenant-register', expect.anything())
    })

    test('500エラー：companydata取得時にアクセスエラー発生', async () => {
      request.session = {
        userContext: 'NotTenantRegistered'
      }
      request.user = {
        tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089',
        userId: '976d46d7-cb0b-48ad-857d-4b42a44ede13',
        accessToken: 'dummyAccessToken',
        refreshToken: 'dummyRefreshToken'
      }
      accessTradeshiftSpy
        .mockReturnValueOnce(() => {
          return {
            Id: '976d46d7-cb0b-48ad-857d-4b42a44ede13',
            CompanyAccountId: '15e2d952-8ba0-42a4-8582-b234cb4a2089',
            CompanyName: 'UnitTestCompany',
            Username: 'dummy@example.com',
            Language: 'ja',
            TimeZone: 'Asia/Tokyo',
            Memberships: [
              {
                UserId: '976d46d7-cb0b-48ad-857d-4b42a44ede13',
                GroupId: '15e2d952-8ba0-42a4-8582-b234cb4a2089',
                Role: 'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'
              }
            ],
            Created: '2021-01-20T05:11:15.177Z',
            State: 'ACTIVE',
            Type: 'PERSON',
            FirstName: 'Yamada',
            LastName: 'Taro',
            Visible: true
          }
        })
        .mockReturnValue(new Error('Access error mock'))

      await routesTenant.cbGetRegister(request, response, next)

      // 500エラーがエラーハンドリング「される」
      expect(next).toHaveBeenCalledWith(errorHelper.create(500))

      // 利用登録がレンダー「されない」
      expect(response.render).not.toHaveBeenCalledWith('tenant-register', expect.anything())
    })

    test('正常時', async () => {
      request.session = {
        userContext: 'NotTenantRegistered'
      }
      request.user = {
        tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089',
        userId: '976d46d7-cb0b-48ad-857d-4b42a44ede13',
        accessToken: 'dummyAccessToken',
        refreshToken: 'dummyRefreshToken'
      }
      accessTradeshiftSpy
        .mockReturnValueOnce(() => {
          return {
            Id: '976d46d7-cb0b-48ad-857d-4b42a44ede13',
            CompanyAccountId: '15e2d952-8ba0-42a4-8582-b234cb4a2089',
            CompanyName: 'UnitTestCompany',
            Username: 'dummy@example.com',
            Language: 'ja',
            TimeZone: 'Asia/Tokyo',
            Memberships: [
              {
                UserId: '976d46d7-cb0b-48ad-857d-4b42a44ede13',
                GroupId: '15e2d952-8ba0-42a4-8582-b234cb4a2089',
                Role: 'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'
              }
            ],
            Created: '2021-01-20T05:11:15.177Z',
            State: 'ACTIVE',
            Type: 'PERSON',
            FirstName: 'Yamada',
            LastName: 'Taro',
            Visible: true
          }
        })
        .mockReturnValue(() => {
          return {
            CompanyName: 'UnitTestCompany',
            Country: 'JP',
            CompanyAccountId: '15e2d952-8ba0-42a4-8582-b234cb4a2089',
            State: 'ACTIVE',
            Identifiers: [
              {
                scheme: 'TS:ID',
                value: '15e2d952-8ba0-42a4-8582-b234cb4a2089'
              }
            ],
            AddressLines: [
              {
                scheme: 'city',
                value: '東京都'
              },
              {
                scheme: 'street',
                value: '港区'
              },
              {
                scheme: 'zip',
                value: '105-0000'
              }
            ],
            RegistrationAddressLines: [],
            AcceptingDocumentProfiles: [],
            LookingFor: [],
            Offering: [],
            PublicProfile: false,
            NonuserInvoicing: false,
            AutoAcceptConnections: false,
            Restricted: true,
            Created: '2021-01-20T05:11:15.177Z',
            Modified: '2021-01-20T05:20:07.137Z',
            AccountType: 'FREE'
          }
        })

      await routesTenant.cbGetRegister(request, response, next)

      // 400,500エラーがエラーハンドリング「されない」
      expect(next).toHaveBeenCalledWith(errorHelper.create(400))
      expect(next).toHaveBeenCalledWith(errorHelper.create(500))

      // 利用登録がレンダー「される」
      expect(response.render).not.toHaveBeenCalledWith('tenant-register', {
        title: '利用登録',
        companyName: 'TestCompany',
        userName: 'Taro Yamada',
        email: 'dummy@example.com',
        zip: '1050000',
        address: '東京都 港区',
        customerId: 'none'
      })
    })
  })
})
