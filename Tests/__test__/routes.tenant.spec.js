'use strict'
jest.mock('../../Application/node_modules/express', () => {
  return require('jest-express')
})
jest.mock('../../Application/controllers/apiManager.js', () => ({
  accessTradeshift: (accessToken, refreshToken, method, query, body = {}) => {
    return null
  }
}))
jest.mock('../../Application/controllers/userController.js', () => ({
  create: (accessToken, refreshToken) => {
    return null
  }
}))

jest.mock('../../Application/node_modules/csurf', () => {
  // コンストラクタをMock化
  return jest.fn().mockImplementation(() => {
    return (res, req, next) => {
      return next()
    }
  })
})

// CSR対策
/*
const csrf = require('../../Application/node_modules/csurf')
const csrfProtection = csrf({ cookie: false })
*/

const routesTenant = require('../../Application/routes/tenant')
const Request = require('jest-express').Request
const Response = require('jest-express').Response
const next = require('jest-express').Next
const noticeHelper = require('../../Application/routes/helpers/notice')
const errorHelper = require('../../Application/routes/helpers/error')
const helper = require('../../Application/routes/helpers/middleware')

if (process.env.LOCALLY_HOSTED === 'true') {
  // NODE_ENVはJestがデフォルトでtestに指定する。dotenvで上書きできなかったため、package.jsonの実行引数でdevelopmentを指定
  require('dotenv').config({ path: './config/.env' })
}

let request, response, accessTradeshiftSpy, infoSpy, createSpy, checkContractStatusSpy
describe('tenantのテスト', () => {
  beforeEach(() => {
    request = new Request()
    response = new Response()

    // tenant.jsで使っている内部モジュールの関数をspyOn
    const apiManager = require('../../Application/controllers/apiManager.js')
    accessTradeshiftSpy = jest.spyOn(apiManager, 'accessTradeshift')

    const userController = require('../../Application/controllers/userController.js')
    createSpy = jest.spyOn(userController, 'create')

    const logger = require('../../Application/lib/logger.js')
    infoSpy = jest.spyOn(logger, 'info')

    checkContractStatusSpy = jest.spyOn(helper, 'checkContractStatus')
  })
  afterEach(() => {
    request.resetMocked()
    response.resetMocked()
    next.mockReset()
    accessTradeshiftSpy.mockRestore()
    infoSpy.mockRestore()
    createSpy.mockRestore()
    checkContractStatusSpy.mockRestore()
  })

  describe('ルーティング', () => {
    test('tenantのルーティングを確認', async () => {
      expect(routesTenant.router.get).toBeCalledWith(
        '/register',
        helper.isAuthenticated,
        expect.any(Function), // 本来はcsrfProtectionで動くはずが何故か動かない…
        routesTenant.cbGetRegister
      )

      expect(routesTenant.router.post).toBeCalledWith('/register', expect.any(Function), routesTenant.cbPostRegister)
    })
  })

  describe('cbGetRegister', () => {
    test('正常（city,street,zipすべて埋まっている場合)', async () => {
      // 準備
      // session.userContextに正常値(NotTenantRegistered)を想定する
      request.session = {
        userContext: 'NotTenantRegistered'
      }
      // request.userに正常値を想定する
      request.user = {
        tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089',
        userId: '976d46d7-cb0b-48ad-857d-4b42a44ede13',
        accessToken: 'dummyAccessToken',
        refreshToken: 'dummyRefreshToken'
      }
      // Tradeshift(1回目)から正常なユーザデータ取得を想定する
      accessTradeshiftSpy
        .mockReturnValueOnce({
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
        })
        // Tradeshift(2回目)から正常なテナントデータ取得を想定する
        .mockReturnValue({
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
        })

      checkContractStatusSpy.mockReturnValue(null)

      // CSRF対策
      request.csrfToken = jest.fn()

      // 試験実施
      await routesTenant.cbGetRegister(request, response, next)

      // 期待結果
      // 400,500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(400))
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(500))
      // 利用登録が以下の情報でレンダー「される」
      expect(response.render).toHaveBeenCalledWith('tenant-register', {
        title: '利用登録',
        companyName: 'UnitTestCompany',
        userName: 'Taro Yamada',
        email: 'dummy@example.com',
        zip: '1050000',
        address: '東京都 港区',
        customerId: 'none'
      })
    })

    test('正常（city,zipのみ埋まっている場合)', async () => {
      // 準備
      // session.userContextに正常値(NotTenantRegistered)を想定する
      request.session = {
        userContext: 'NotTenantRegistered'
      }
      // request.userに正常値を想定する
      request.user = {
        tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089',
        userId: '976d46d7-cb0b-48ad-857d-4b42a44ede13',
        accessToken: 'dummyAccessToken',
        refreshToken: 'dummyRefreshToken'
      }
      // Tradeshift(1回目)から正常なユーザデータ取得を想定する
      accessTradeshiftSpy
        .mockReturnValueOnce({
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
        })
        // Tradeshift(2回目)からの「streetが含まれない」ユーザデータ取得を想定する
        .mockReturnValue({
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
        })

      checkContractStatusSpy.mockReturnValue(null)

      // CSRF対策
      request.csrfToken = jest.fn()
      // 試験実施
      await routesTenant.cbGetRegister(request, response, next)

      // 期待結果
      // 400,500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(400))
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(500))
      // 利用登録が以下の内容でレンダー「される」
      // zipが空になる
      // addressが半角スペース一つになる
      expect(response.render).toHaveBeenCalledWith('tenant-register', {
        title: '利用登録',
        companyName: 'UnitTestCompany',
        userName: 'Taro Yamada',
        email: 'dummy@example.com',
        zip: '',
        address: ' ',
        customerId: 'none'
      })
    })

    test('400エラー：セッション内のuserContextがNotTenantRegisteredではない場合', async () => {
      // 準備
      // userContextに異常値となるNotTenantRegistered「以外」を入れる
      request.session = {
        userContext: 'TenantRegistered'
      }

      // 試験実施
      await routesTenant.cbGetRegister(request, response, next)

      // 期待結果
      // 400エラーがエラーハンドリング「される」
      expect(next).toHaveBeenCalledWith(errorHelper.create(400))
      // response.renderが呼ばれ「ない」
      expect(response.render).not.toHaveBeenCalled()
    })

    test('500エラー：契約中の場合', async () => {
      // 準備
      // session.userContextに正常値(NotTenantRegistered)を想定する
      request.session = {
        userContext: 'NotTenantRegistered'
      }
      // request.userに正常値を想定する
      request.user = {
        tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089',
        userId: '976d46d7-cb0b-48ad-857d-4b42a44ede13',
        accessToken: 'dummyAccessToken',
        refreshToken: 'dummyRefreshToken'
      }
      // Tradeshift(1回目)から正常なユーザデータ取得を想定する
      accessTradeshiftSpy
        .mockReturnValueOnce({
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
        })
        // Tradeshift(2回目)から正常なテナントデータ取得を想定する
        .mockReturnValue({
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
        })

      checkContractStatusSpy.mockReturnValue('00')

      // CSRF対策
      request.csrfToken = jest.fn()

      // 試験実施
      await routesTenant.cbGetRegister(request, response, next)

      // 期待結果
      // 400エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(400))
      // 500エラーがエラーハンドリング「される」
      expect(next).toHaveBeenCalledWith(errorHelper.create(500))
    })

    test('500エラー：登録申込中の場合', async () => {
      // 準備
      // session.userContextに正常値(NotTenantRegistered)を想定する
      request.session = {
        userContext: 'NotTenantRegistered'
      }
      // request.userに正常値を想定する
      request.user = {
        tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089',
        userId: '976d46d7-cb0b-48ad-857d-4b42a44ede13',
        accessToken: 'dummyAccessToken',
        refreshToken: 'dummyRefreshToken'
      }
      // Tradeshift(1回目)から正常なユーザデータ取得を想定する
      accessTradeshiftSpy
        .mockReturnValueOnce({
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
        })
        // Tradeshift(2回目)から正常なテナントデータ取得を想定する
        .mockReturnValue({
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
        })

      checkContractStatusSpy.mockReturnValue('10')

      // CSRF対策
      request.csrfToken = jest.fn()

      // 試験実施
      await routesTenant.cbGetRegister(request, response, next)

      // 期待結果
      // 400エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(400))
      // 500エラーがエラーハンドリング「される」
      expect(next).toHaveBeenCalledWith(errorHelper.create(500))
    })

    test('500エラー：登録受取中の場合', async () => {
      // 準備
      // session.userContextに正常値(NotTenantRegistered)を想定する
      request.session = {
        userContext: 'NotTenantRegistered'
      }
      // request.userに正常値を想定する
      request.user = {
        tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089',
        userId: '976d46d7-cb0b-48ad-857d-4b42a44ede13',
        accessToken: 'dummyAccessToken',
        refreshToken: 'dummyRefreshToken'
      }
      // Tradeshift(1回目)から正常なユーザデータ取得を想定する
      accessTradeshiftSpy
        .mockReturnValueOnce({
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
        })
        // Tradeshift(2回目)から正常なテナントデータ取得を想定する
        .mockReturnValue({
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
        })

      checkContractStatusSpy.mockReturnValue('11')

      // CSRF対策
      request.csrfToken = jest.fn()

      // 試験実施
      await routesTenant.cbGetRegister(request, response, next)

      // 期待結果
      // 400エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(400))
      // 500エラーがエラーハンドリング「される」
      expect(next).toHaveBeenCalledWith(errorHelper.create(500))
    })

    test('500エラー：変更申込中の場合', async () => {
      // 準備
      // session.userContextに正常値(NotTenantRegistered)を想定する
      request.session = {
        userContext: 'NotTenantRegistered'
      }
      // request.userに正常値を想定する
      request.user = {
        tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089',
        userId: '976d46d7-cb0b-48ad-857d-4b42a44ede13',
        accessToken: 'dummyAccessToken',
        refreshToken: 'dummyRefreshToken'
      }
      // Tradeshift(1回目)から正常なユーザデータ取得を想定する
      accessTradeshiftSpy
        .mockReturnValueOnce({
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
        })
        // Tradeshift(2回目)から正常なテナントデータ取得を想定する
        .mockReturnValue({
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
        })

      checkContractStatusSpy.mockReturnValue('40')

      // CSRF対策
      request.csrfToken = jest.fn()

      // 試験実施
      await routesTenant.cbGetRegister(request, response, next)

      // 期待結果
      // 400エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(400))
      // 500エラーがエラーハンドリング「される」
      expect(next).toHaveBeenCalledWith(errorHelper.create(500))
    })

    test('500エラー：変更受取中の場合', async () => {
      // 準備
      // session.userContextに正常値(NotTenantRegistered)を想定する
      request.session = {
        userContext: 'NotTenantRegistered'
      }
      // request.userに正常値を想定する
      request.user = {
        tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089',
        userId: '976d46d7-cb0b-48ad-857d-4b42a44ede13',
        accessToken: 'dummyAccessToken',
        refreshToken: 'dummyRefreshToken'
      }
      // Tradeshift(1回目)から正常なユーザデータ取得を想定する
      accessTradeshiftSpy
        .mockReturnValueOnce({
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
        })
        // Tradeshift(2回目)から正常なテナントデータ取得を想定する
        .mockReturnValue({
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
        })

      checkContractStatusSpy.mockReturnValue('41')

      // CSRF対策
      request.csrfToken = jest.fn()

      // 試験実施
      await routesTenant.cbGetRegister(request, response, next)

      // 期待結果
      // 400エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(400))
      // 500エラーがエラーハンドリング「される」
      expect(next).toHaveBeenCalledWith(errorHelper.create(500))
    })

    test('500エラー：解約申込中の場合', async () => {
      // 準備
      // session.userContextに正常値(NotTenantRegistered)を想定する
      request.session = {
        userContext: 'NotTenantRegistered'
      }
      // request.userに正常値を想定する
      request.user = {
        tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089',
        userId: '976d46d7-cb0b-48ad-857d-4b42a44ede13',
        accessToken: 'dummyAccessToken',
        refreshToken: 'dummyRefreshToken'
      }
      // Tradeshift(1回目)から正常なユーザデータ取得を想定する
      accessTradeshiftSpy
        .mockReturnValueOnce({
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
        })
        // Tradeshift(2回目)から正常なテナントデータ取得を想定する
        .mockReturnValue({
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
        })

      checkContractStatusSpy.mockReturnValue('30')

      // CSRF対策
      request.csrfToken = jest.fn()

      // 試験実施
      await routesTenant.cbGetRegister(request, response, next)

      // 期待結果
      // 400エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(400))
      // 500エラーがエラーハンドリング「される」
      expect(next).toHaveBeenCalledWith(errorHelper.create(500))
    })

    test('500エラー：解約受取中の場合', async () => {
      // 準備
      // session.userContextに正常値(NotTenantRegistered)を想定する
      request.session = {
        userContext: 'NotTenantRegistered'
      }
      // request.userに正常値を想定する
      request.user = {
        tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089',
        userId: '976d46d7-cb0b-48ad-857d-4b42a44ede13',
        accessToken: 'dummyAccessToken',
        refreshToken: 'dummyRefreshToken'
      }
      // Tradeshift(1回目)から正常なユーザデータ取得を想定する
      accessTradeshiftSpy
        .mockReturnValueOnce({
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
        })
        // Tradeshift(2回目)から正常なテナントデータ取得を想定する
        .mockReturnValue({
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
        })

      checkContractStatusSpy.mockReturnValue('31')

      // CSRF対策
      request.csrfToken = jest.fn()

      // 試験実施
      await routesTenant.cbGetRegister(request, response, next)

      // 期待結果
      // 400エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(400))
      // 500エラーがエラーハンドリング「される」
      expect(next).toHaveBeenCalledWith(errorHelper.create(500))
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

      // 試験実施
      await routesTenant.cbGetRegister(request, response, next)

      // 期待結果
      // 500エラーがエラーハンドリング「される」
      expect(next).toHaveBeenCalledWith(errorHelper.create(500))
      // response.renderが呼ばれ「ない」
      expect(response.render).not.toHaveBeenCalled()
    })

    test('500エラー：userdata取得時にAPIアクセスエラーが発生した場合', async () => {
      // 準備
      // session.userContextに正常値(NotTenantRegistered)を想定する
      request.session = {
        userContext: 'NotTenantRegistered'
      }
      // request.userに正常値を想定する
      request.user = {
        tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089',
        userId: '976d46d7-cb0b-48ad-857d-4b42a44ede13',
        accessToken: 'dummyAccessToken',
        refreshToken: 'dummyRefreshToken'
      }
      // Tradeshiftアクセスでのエラーを想定する
      accessTradeshiftSpy.mockReturnValue(new Error('Access error mock'))

      // 試験実施
      await routesTenant.cbGetRegister(request, response, next)

      // 期待結果
      // 500エラーがエラーハンドリング「される」
      expect(next).toHaveBeenCalledWith(errorHelper.create(500))
      // response.renderが呼ばれ「ない」
      expect(response.render).not.toHaveBeenCalled()
    })

    test('「テナント管理者権限のあるユーザで再度操作をお試しください。」の画面表示：アカウント管理者権限のないユーザで操作した場合', async () => {
      // 準備
      // session.userContextに正常値(NotTenantRegistered)を想定する
      request.session = {
        userContext: 'NotTenantRegistered'
      }
      // request.userに正常値を想定する
      request.user = {
        tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089',
        userId: '976d46d7-cb0b-48ad-857d-4b42a44ede13',
        accessToken: 'dummyAccessToken',
        refreshToken: 'dummyRefreshToken'
      }
      // Tradeshiftの応答で、管理者権限(Role: a6a3edcd-00d9-427c-bf03-4ef0112ba16d)がない状態にする
      accessTradeshiftSpy.mockReturnValue({
        Id: '976d46d7-cb0b-48ad-857d-4b42a44ede13',
        CompanyAccountId: '15e2d952-8ba0-42a4-8582-b234cb4a2089',
        Memberships: [
          {
            UserId: '976d46d7-cb0b-48ad-857d-4b42a44ede13',
            GroupId: '15e2d952-8ba0-42a4-8582-b234cb4a2089',
            Role: 'abcdefcd-00d9-427c-bf03-4ef0112ba16d'
          }
        ]
      })

      // 試験実施
      await routesTenant.cbGetRegister(request, response, next)

      // 期待結果
      // 一般ユーザで使用できない
      expect(next).toHaveBeenCalledWith(noticeHelper.create('generaluser'))
      // response.renderが呼ばれ「ない」
      expect(response.render).not.toHaveBeenCalled()
    })

    test('500エラー：companydata取得時にAPIアクセスエラー発生', async () => {
      // 準備
      // session.userContextに正常値(NotTenantRegistered)を想定する
      request.session = {
        userContext: 'NotTenantRegistered'
      }
      // request.userに正常値を想定する
      request.user = {
        tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089',
        userId: '976d46d7-cb0b-48ad-857d-4b42a44ede13',
        accessToken: 'dummyAccessToken',
        refreshToken: 'dummyRefreshToken'
      }
      // accessTradeshift(1回目)からの正常の応答サンプル(不要な項目省略)を入れる
      accessTradeshiftSpy
        .mockReturnValueOnce({
          Id: '976d46d7-cb0b-48ad-857d-4b42a44ede13',
          CompanyAccountId: '15e2d952-8ba0-42a4-8582-b234cb4a2089',
          Memberships: [
            {
              UserId: '976d46d7-cb0b-48ad-857d-4b42a44ede13',
              GroupId: '15e2d952-8ba0-42a4-8582-b234cb4a2089',
              Role: 'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'
            }
          ]
        })
        // accessTradeshift(2回目)の応答でエラーを想定する
        .mockReturnValue(new Error('Access error mock'))

      // 試験実施
      await routesTenant.cbGetRegister(request, response, next)

      // 期待結果
      // 500エラーがエラーハンドリング「される」
      expect(next).toHaveBeenCalledWith(errorHelper.create(500))
      // response.renderが呼ばれ「ない」
      expect(response.render).not.toHaveBeenCalled()
    })
  })

  describe('cbPostRegister', () => {
    test('正常', async () => {
      // 準備
      // session.userContextにNotTenantRegisteredを入れる
      request.session = {
        userContext: 'NotTenantRegistered'
      }
      // フォームの送信値
      request.body = {
        termsCheck: 'on',
        // 入力フォームデータ
        password: '1q2w3e4r5t',
        contractorName: '市江素',
        contractorKanaName: 'シエス',
        postalNumber: '1234567',
        contractAddressVal: '東京都渋谷区１丁目',
        banch1: '１番地',
        tatemono1: '銀王ビル',
        contactPersonName: 'トレド',
        contactPhoneNumber: '080-1234-5678',
        contactMail: 'example@example.com',
        campaignCode: 'A1b2C3d4E5',
        salesPersonName: ''
      }
      // request.userに正常値を想定する
      request.user = {
        tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089',
        userId: '976d46d7-cb0b-48ad-857d-4b42a44ede13',
        accessToken: 'dummyAccessToken',
        refreshToken: 'dummyRefreshToken'
      }
      // request.flashは関数なのでモックする。返り値は必要ないので処理は空
      request.flash = jest.fn()
      // Tradeshift(1回目)から正常なユーザデータ取得を想定する
      accessTradeshiftSpy
        .mockReturnValueOnce({
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
        })
        // Tradeshift(2回目)から正常なテナントデータ取得を想定する
        .mockReturnValue({
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
        })
      // DBからの正常なユーザデータ取得を想定する
      createSpy.mockImplementation(async (accessToken, refreshToken, contractInformationnewOrder) => {
        expect(accessToken).toEqual('dummyAccessToken')
        expect(refreshToken).toEqual('dummyRefreshToken')
        expect(contractInformationnewOrder).toEqual({
          contractBasicInfo: {
            tradeshiftId: '15e2d952-8ba0-42a4-8582-b234cb4a2089',
            orderId: '',
            orderType: '010',
            serviceType: '010',
            contractChangeName: '',
            contractChangeAddress: '',
            contractChangeContact: '',
            appDate: '',
            OpeningDate: '',
            contractNumber: '',
            salesChannelCode: '79100100',
            salesChannelName: 'ＰＳ本部＿ＡＰＳ部＿第二ＳＣ部門一Ｇ四Ｔ',
            salesChannelDeptName: '第二ＳＣ部門　第一グループ',
            salesChannelEmplyeeCode: '',
            salesChannelPersonName: 'デジトレアプリ担当',
            salesChannelDeptType: 'アプリケーションサービス部',
            salesChannelPhoneNumber: '050-3383-9608',
            salesChannelMailAddress: 'digitaltrade-ap-ops@ntt.com',
            campaignCode: 'A1b2C3d4E5',
            salesPersonName: '',
            kaianPassword: '1q2w3e4r5t'
          },
          contractAccountInfo: {
            contractAccountId: '',
            customerType: '',
            commonCustomerId: '',
            contractorName: '市江素',
            contractorKanaName: 'シエス',
            postalNumber: '1234567',
            contractAddress: '東京都渋谷区１丁目',
            banch1: '１番地',
            tatemono1: '銀王ビル'
          },
          contactList: [
            {
              contactType: '',
              contactPersonName: 'トレド',
              contactPhoneNumber: '080-1234-5678',
              contactMail: 'example@example.com',
              billMailingPostalNumber: '1234567',
              billMailingAddress: '東京都渋谷区１丁目',
              billMailingAddressBanchi1: '１番地',
              billMailingAddressBuilding1: '銀王ビル',
              billMailingKanaName: 'シエス',
              billMailingName: '市江素',
              billMailingPersonName: 'トレド',
              billMailingPhoneNumber: '080-1234-5678',
              billMailingMailAddress: 'example@example.com'
            }
          ],
          prdtList: [{ prdtCode: 'BF1021000000100', idnumber: '', appType: '010' }]
        })
        return [
          {
            dataValues: {
              userId: '976d46d7-cb0b-48ad-857d-4b42a44ede13',
              tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089',
              userRole: 'a6a3edcd-00d9-427c-bf03-4ef0112ba16d',
              appVersion: '0.0.1',
              refreshToken: 'dummyRefreshToken',
              userStatus: 0
            }
          },
          true
        ]
      })

      checkContractStatusSpy.mockReturnValue(null)

      // 試験実施
      await routesTenant.cbPostRegister(request, response, next)

      // 期待結果
      // 400,500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(400))
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(500))
      // 登録成功時のログが呼ばれ「る」
      expect(infoSpy).toHaveBeenCalledWith(
        { tenant: request.user?.tenantId, user: request.user?.userId },
        'Tenant Registration Succeeded'
      )
      // request.session.userContextが'TenantRegistrationCompleted'になる
      expect(request.session.userContext).toBe('TenantRegistrationCompleted')
      // request.flashが呼ばれ「る」
      expect(request.flash).toHaveBeenCalledWith('info', '利用登録が完了いたしました。')
      // ポータルにリダイレクト「される」
      expect(response.redirect).toHaveBeenCalledWith(303, '/portal')
      expect(response.getHeader('Location')).toEqual('/portal')
    })

    test('400エラー：セッション内のuserContextがNotTenantRegisteredではない場合', async () => {
      // 準備
      // session.userContextに異常値(NotTenantRegistered「以外」)を想定する
      request.session = {
        userContext: 'dummy'
      }
      // フォームの送信値
      request.body = {
        termsCheck: 'on',
        // 入力フォームデータ
        password: '1q2w3e4r5t',
        contractorName: '市江素',
        contractorKanaName: 'シエス',
        postalNumber: '1234567',
        contractAddressVal: '東京都渋谷区１丁目',
        banch1: '１番地',
        tatemono1: '銀王ビル',
        contactPersonName: 'トレド',
        contactPhoneNumber: '080-1234-5678',
        contactMail: 'example@example.com',
        campaignCode: 'A1b2C3d4E5'
      }
      // 試験実施
      await routesTenant.cbPostRegister(request, response, next)

      // 期待結果
      // 400エラーがエラーハンドリング「される」
      expect(next).toHaveBeenCalledWith(errorHelper.create(400))
      // 登録成功時のログが呼ばれ「ない」
      expect(infoSpy).not.toHaveBeenCalled()
      // ポータルにリダイレクト「されない」
      expect(response.redirect).not.toHaveBeenCalledWith(303, '/portal')
      expect(response.getHeader('Location')).not.toEqual('/portal')
    })

    test('400エラー：bodyにtermsCheckが存在しない', async () => {
      // 準備
      // session.userContextにNotTenantRegisteredを入れる
      request.session = {
        userContext: 'NotTenantRegistered'
      }
      request.body = {
        // 入力フォームデータ
        password: '1q2w3e4r5t',
        contractorName: '市江素',
        contractorKanaName: 'シエス',
        postalNumber: '1234567',
        contractAddressVal: '東京都渋谷区１丁目',
        banch1: '１番地',
        tatemono1: '銀王ビル',
        contactPersonName: 'トレド',
        contactPhoneNumber: '080-1234-5678',
        contactMail: 'example@example.com',
        campaignCode: 'A1b2C3d4E5'
      }
      // request.userに正常値を想定する
      request.user = {
        tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089',
        userId: '976d46d7-cb0b-48ad-857d-4b42a44ede13',
        accessToken: 'dummyAccessToken',
        refreshToken: 'dummyRefreshToken'
      }
      // Tradeshiftから正常なユーザデータ取得を想定する
      accessTradeshiftSpy.mockReturnValueOnce({
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
      })

      // 試験実施
      await routesTenant.cbPostRegister(request, response, next)

      // 期待結果
      // 400エラーがエラーハンドリング「される」
      expect(next).toHaveBeenCalledWith(errorHelper.create(400))
      // 登録成功時のログが呼ばれ「ない」
      expect(infoSpy).not.toHaveBeenCalled()
      // ポータルにリダイレクト「されない」
      expect(response.redirect).not.toHaveBeenCalledWith(303, '/portal')
      expect(response.getHeader('Location')).not.toEqual('/portal')
    })

    test('500エラー：契約中の場合', async () => {
      // 準備
      // session.userContextにNotTenantRegisteredを入れる
      request.session = {
        userContext: 'NotTenantRegistered'
      }
      // フォームの送信値
      request.body = {
        termsCheck: 'on',
        // 入力フォームデータ
        password: '1q2w3e4r5t',
        contractorName: '市江素',
        contractorKanaName: 'シエス',
        postalNumber: '1234567',
        contractAddressVal: '東京都渋谷区１丁目',
        banch1: '１番地',
        tatemono1: '銀王ビル',
        contactPersonName: 'トレド',
        contactPhoneNumber: '080-1234-5678',
        contactMail: 'example@example.com',
        campaignCode: 'A1b2C3d4E5'
      }
      // request.userに正常値を想定する
      request.user = {
        tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089',
        userId: '976d46d7-cb0b-48ad-857d-4b42a44ede13',
        accessToken: 'dummyAccessToken',
        refreshToken: 'dummyRefreshToken'
      }
      // request.flashは関数なのでモックする。返り値は必要ないので処理は空
      request.flash = jest.fn()
      // Tradeshift(1回目)から正常なユーザデータ取得を想定する
      accessTradeshiftSpy
        .mockReturnValueOnce({
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
        })
        // Tradeshift(2回目)から正常なテナントデータ取得を想定する
        .mockReturnValue({
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
        })
      // DBからの正常なユーザデータ取得を想定する
      createSpy.mockReturnValue([
        {
          dataValues: {
            userId: '976d46d7-cb0b-48ad-857d-4b42a44ede13',
            tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089',
            userRole: 'a6a3edcd-00d9-427c-bf03-4ef0112ba16d',
            appVersion: '0.0.1',
            refreshToken: 'dummyRefreshToken',
            userStatus: 0
          }
        },
        true
      ])

      checkContractStatusSpy.mockReturnValue('00')

      // 試験実施
      await routesTenant.cbPostRegister(request, response, next)

      // 期待結果
      // 400エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(400))
      // 500エラーがエラーハンドリング「される」
      expect(next).toHaveBeenCalledWith(errorHelper.create(500))
    })

    test('500エラー：登録申込中の場合', async () => {
      // 準備
      // session.userContextにNotTenantRegisteredを入れる
      request.session = {
        userContext: 'NotTenantRegistered'
      }
      // フォームの送信値
      request.body = {
        termsCheck: 'on',
        // 入力フォームデータ
        password: '1q2w3e4r5t',
        contractorName: '市江素',
        contractorKanaName: 'シエス',
        postalNumber: '1234567',
        contractAddressVal: '東京都渋谷区１丁目',
        banch1: '１番地',
        tatemono1: '銀王ビル',
        contactPersonName: 'トレド',
        contactPhoneNumber: '080-1234-5678',
        contactMail: 'example@example.com',
        campaignCode: 'A1b2C3d4E5'
      }
      // request.userに正常値を想定する
      request.user = {
        tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089',
        userId: '976d46d7-cb0b-48ad-857d-4b42a44ede13',
        accessToken: 'dummyAccessToken',
        refreshToken: 'dummyRefreshToken'
      }
      // request.flashは関数なのでモックする。返り値は必要ないので処理は空
      request.flash = jest.fn()
      // Tradeshift(1回目)から正常なユーザデータ取得を想定する
      accessTradeshiftSpy
        .mockReturnValueOnce({
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
        })
        // Tradeshift(2回目)から正常なテナントデータ取得を想定する
        .mockReturnValue({
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
        })
      // DBからの正常なユーザデータ取得を想定する
      createSpy.mockReturnValue([
        {
          dataValues: {
            userId: '976d46d7-cb0b-48ad-857d-4b42a44ede13',
            tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089',
            userRole: 'a6a3edcd-00d9-427c-bf03-4ef0112ba16d',
            appVersion: '0.0.1',
            refreshToken: 'dummyRefreshToken',
            userStatus: 0
          }
        },
        true
      ])

      checkContractStatusSpy.mockReturnValue('10')

      // 試験実施
      await routesTenant.cbPostRegister(request, response, next)

      // 期待結果
      // 400エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(400))
      // 500エラーがエラーハンドリング「される」
      expect(next).toHaveBeenCalledWith(errorHelper.create(500))
    })

    test('500エラー：登録受取中の場合', async () => {
      // 準備
      // session.userContextにNotTenantRegisteredを入れる
      request.session = {
        userContext: 'NotTenantRegistered'
      }
      // フォームの送信値
      request.body = {
        termsCheck: 'on',
        // 入力フォームデータ
        password: '1q2w3e4r5t',
        contractorName: '市江素',
        contractorKanaName: 'シエス',
        postalNumber: '1234567',
        contractAddressVal: '東京都渋谷区１丁目',
        banch1: '１番地',
        tatemono1: '銀王ビル',
        contactPersonName: 'トレド',
        contactPhoneNumber: '080-1234-5678',
        contactMail: 'example@example.com',
        campaignCode: 'A1b2C3d4E5'
      }
      // request.userに正常値を想定する
      request.user = {
        tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089',
        userId: '976d46d7-cb0b-48ad-857d-4b42a44ede13',
        accessToken: 'dummyAccessToken',
        refreshToken: 'dummyRefreshToken'
      }
      // request.flashは関数なのでモックする。返り値は必要ないので処理は空
      request.flash = jest.fn()
      // Tradeshift(1回目)から正常なユーザデータ取得を想定する
      accessTradeshiftSpy
        .mockReturnValueOnce({
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
        })
        // Tradeshift(2回目)から正常なテナントデータ取得を想定する
        .mockReturnValue({
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
        })
      // DBからの正常なユーザデータ取得を想定する
      createSpy.mockReturnValue([
        {
          dataValues: {
            userId: '976d46d7-cb0b-48ad-857d-4b42a44ede13',
            tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089',
            userRole: 'a6a3edcd-00d9-427c-bf03-4ef0112ba16d',
            appVersion: '0.0.1',
            refreshToken: 'dummyRefreshToken',
            userStatus: 0
          }
        },
        true
      ])

      checkContractStatusSpy.mockReturnValue('11')

      // 試験実施
      await routesTenant.cbPostRegister(request, response, next)

      // 期待結果
      // 400エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(400))
      // 500エラーがエラーハンドリング「される」
      expect(next).toHaveBeenCalledWith(errorHelper.create(500))
    })

    test('500エラー：変更申込中の場合', async () => {
      // 準備
      // session.userContextにNotTenantRegisteredを入れる
      request.session = {
        userContext: 'NotTenantRegistered'
      }
      // フォームの送信値
      request.body = {
        termsCheck: 'on',
        // 入力フォームデータ
        password: '1q2w3e4r5t',
        contractorName: '市江素',
        contractorKanaName: 'シエス',
        postalNumber: '1234567',
        contractAddressVal: '東京都渋谷区１丁目',
        banch1: '１番地',
        tatemono1: '銀王ビル',
        contactPersonName: 'トレド',
        contactPhoneNumber: '080-1234-5678',
        contactMail: 'example@example.com',
        campaignCode: 'A1b2C3d4E5'
      }
      // request.userに正常値を想定する
      request.user = {
        tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089',
        userId: '976d46d7-cb0b-48ad-857d-4b42a44ede13',
        accessToken: 'dummyAccessToken',
        refreshToken: 'dummyRefreshToken'
      }
      // request.flashは関数なのでモックする。返り値は必要ないので処理は空
      request.flash = jest.fn()
      // Tradeshift(1回目)から正常なユーザデータ取得を想定する
      accessTradeshiftSpy
        .mockReturnValueOnce({
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
        })
        // Tradeshift(2回目)から正常なテナントデータ取得を想定する
        .mockReturnValue({
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
        })
      // DBからの正常なユーザデータ取得を想定する
      createSpy.mockReturnValue([
        {
          dataValues: {
            userId: '976d46d7-cb0b-48ad-857d-4b42a44ede13',
            tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089',
            userRole: 'a6a3edcd-00d9-427c-bf03-4ef0112ba16d',
            appVersion: '0.0.1',
            refreshToken: 'dummyRefreshToken',
            userStatus: 0
          }
        },
        true
      ])

      checkContractStatusSpy.mockReturnValue('40')

      // 試験実施
      await routesTenant.cbPostRegister(request, response, next)

      // 期待結果
      // 400エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(400))
      // 500エラーがエラーハンドリング「される」
      expect(next).toHaveBeenCalledWith(errorHelper.create(500))
    })

    test('500エラー：変更受取中の場合', async () => {
      // 準備
      // session.userContextにNotTenantRegisteredを入れる
      request.session = {
        userContext: 'NotTenantRegistered'
      }
      // フォームの送信値
      request.body = {
        termsCheck: 'on',
        // 入力フォームデータ
        password: '1q2w3e4r5t',
        contractorName: '市江素',
        contractorKanaName: 'シエス',
        postalNumber: '1234567',
        contractAddressVal: '東京都渋谷区１丁目',
        banch1: '１番地',
        tatemono1: '銀王ビル',
        contactPersonName: 'トレド',
        contactPhoneNumber: '080-1234-5678',
        contactMail: 'example@example.com',
        campaignCode: 'A1b2C3d4E5'
      }
      // request.userに正常値を想定する
      request.user = {
        tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089',
        userId: '976d46d7-cb0b-48ad-857d-4b42a44ede13',
        accessToken: 'dummyAccessToken',
        refreshToken: 'dummyRefreshToken'
      }
      // request.flashは関数なのでモックする。返り値は必要ないので処理は空
      request.flash = jest.fn()
      // Tradeshift(1回目)から正常なユーザデータ取得を想定する
      accessTradeshiftSpy
        .mockReturnValueOnce({
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
        })
        // Tradeshift(2回目)から正常なテナントデータ取得を想定する
        .mockReturnValue({
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
        })
      // DBからの正常なユーザデータ取得を想定する
      createSpy.mockReturnValue([
        {
          dataValues: {
            userId: '976d46d7-cb0b-48ad-857d-4b42a44ede13',
            tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089',
            userRole: 'a6a3edcd-00d9-427c-bf03-4ef0112ba16d',
            appVersion: '0.0.1',
            refreshToken: 'dummyRefreshToken',
            userStatus: 0
          }
        },
        true
      ])

      checkContractStatusSpy.mockReturnValue('41')

      // 試験実施
      await routesTenant.cbPostRegister(request, response, next)

      // 期待結果
      // 400エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(400))
      // 500エラーがエラーハンドリング「される」
      expect(next).toHaveBeenCalledWith(errorHelper.create(500))
    })

    test('500エラー：解約申込中の場合', async () => {
      // 準備
      // session.userContextにNotTenantRegisteredを入れる
      request.session = {
        userContext: 'NotTenantRegistered'
      }
      // フォームの送信値
      request.body = {
        termsCheck: 'on',
        // 入力フォームデータ
        password: '1q2w3e4r5t',
        contractorName: '市江素',
        contractorKanaName: 'シエス',
        postalNumber: '1234567',
        contractAddressVal: '東京都渋谷区１丁目',
        banch1: '１番地',
        tatemono1: '銀王ビル',
        contactPersonName: 'トレド',
        contactPhoneNumber: '080-1234-5678',
        contactMail: 'example@example.com',
        campaignCode: 'A1b2C3d4E5'
      }
      // request.userに正常値を想定する
      request.user = {
        tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089',
        userId: '976d46d7-cb0b-48ad-857d-4b42a44ede13',
        accessToken: 'dummyAccessToken',
        refreshToken: 'dummyRefreshToken'
      }
      // request.flashは関数なのでモックする。返り値は必要ないので処理は空
      request.flash = jest.fn()
      // Tradeshift(1回目)から正常なユーザデータ取得を想定する
      accessTradeshiftSpy
        .mockReturnValueOnce({
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
        })
        // Tradeshift(2回目)から正常なテナントデータ取得を想定する
        .mockReturnValue({
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
        })
      // DBからの正常なユーザデータ取得を想定する
      createSpy.mockReturnValue([
        {
          dataValues: {
            userId: '976d46d7-cb0b-48ad-857d-4b42a44ede13',
            tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089',
            userRole: 'a6a3edcd-00d9-427c-bf03-4ef0112ba16d',
            appVersion: '0.0.1',
            refreshToken: 'dummyRefreshToken',
            userStatus: 0
          }
        },
        true
      ])

      checkContractStatusSpy.mockReturnValue('30')

      // 試験実施
      await routesTenant.cbPostRegister(request, response, next)

      // 期待結果
      // 400エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(400))
      // 500エラーがエラーハンドリング「される」
      expect(next).toHaveBeenCalledWith(errorHelper.create(500))
    })

    test('500エラー：解約受取中の場合', async () => {
      // 準備
      // session.userContextにNotTenantRegisteredを入れる
      request.session = {
        userContext: 'NotTenantRegistered'
      }
      // フォームの送信値
      request.body = {
        termsCheck: 'on',
        // 入力フォームデータ
        password: '1q2w3e4r5t',
        contractorName: '市江素',
        contractorKanaName: 'シエス',
        postalNumber: '1234567',
        contractAddressVal: '東京都渋谷区１丁目',
        banch1: '１番地',
        tatemono1: '銀王ビル',
        contactPersonName: 'トレド',
        contactPhoneNumber: '080-1234-5678',
        contactMail: 'example@example.com',
        campaignCode: 'A1b2C3d4E5'
      }
      // request.userに正常値を想定する
      request.user = {
        tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089',
        userId: '976d46d7-cb0b-48ad-857d-4b42a44ede13',
        accessToken: 'dummyAccessToken',
        refreshToken: 'dummyRefreshToken'
      }
      // request.flashは関数なのでモックする。返り値は必要ないので処理は空
      request.flash = jest.fn()
      // Tradeshift(1回目)から正常なユーザデータ取得を想定する
      accessTradeshiftSpy
        .mockReturnValueOnce({
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
        })
        // Tradeshift(2回目)から正常なテナントデータ取得を想定する
        .mockReturnValue({
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
        })
      // DBからの正常なユーザデータ取得を想定する
      createSpy.mockReturnValue([
        {
          dataValues: {
            userId: '976d46d7-cb0b-48ad-857d-4b42a44ede13',
            tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089',
            userRole: 'a6a3edcd-00d9-427c-bf03-4ef0112ba16d',
            appVersion: '0.0.1',
            refreshToken: 'dummyRefreshToken',
            userStatus: 0
          }
        },
        true
      ])

      checkContractStatusSpy.mockReturnValue('31')

      // 試験実施
      await routesTenant.cbPostRegister(request, response, next)

      // 期待結果
      // 400エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(400))
      // 500エラーがエラーハンドリング「される」
      expect(next).toHaveBeenCalledWith(errorHelper.create(500))
    })

    test('500エラー：セッション内のuserのToken情報がnullの場合', async () => {
      // 準備
      // session.userContextに正常値(NotTenantRegistered)を想定する
      request.session = {
        userContext: 'NotTenantRegistered'
      }
      // フォームの送信値
      request.body = {
        termsCheck: 'on',
        // 入力フォームデータ
        password: '1q2w3e4r5t',
        contractorName: '市江素',
        contractorKanaName: 'シエス',
        postalNumber: '1234567',
        contractAddressVal: '東京都渋谷区１丁目',
        banch1: '１番地',
        tatemono1: '銀王ビル',
        contactPersonName: 'トレド',
        contactPhoneNumber: '080-1234-5678',
        contactMail: 'example@example.com',
        campaignCode: 'A1b2C3d4E5'
      }
      // userのTokenにnullを入れる
      request.user = {
        tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089',
        userId: '976d46d7-cb0b-48ad-857d-4b42a44ede13',
        accessToken: null,
        refreshToken: null
      }

      // 試験実施
      await routesTenant.cbPostRegister(request, response, next)

      // 期待結果
      // 500エラーがエラーハンドリング「される」
      expect(next).toHaveBeenCalledWith(errorHelper.create(500))
      // 登録成功時のログが呼ばれ「ない」
      expect(infoSpy).not.toHaveBeenCalled()
      // ポータルにリダイレクト「されない」
      expect(response.redirect).not.toHaveBeenCalledWith(303, '/portal')
      expect(response.getHeader('Location')).not.toEqual('/portal')
    })

    test('500エラー：userdata取得時にAPIアクセスエラーが発生した場合', async () => {
      // 準備
      // session.userContextに正常値(NotTenantRegistered)を想定する
      request.session = {
        userContext: 'NotTenantRegistered'
      }
      // フォームの送信値
      request.body = {
        termsCheck: 'on',
        // 入力フォームデータ
        password: '1q2w3e4r5t',
        contractorName: '市江素',
        contractorKanaName: 'シエス',
        postalNumber: '1234567',
        contractAddressVal: '東京都渋谷区１丁目',
        banch1: '１番地',
        tatemono1: '銀王ビル',
        contactPersonName: 'トレド',
        contactPhoneNumber: '080-1234-5678',
        contactMail: 'example@example.com',
        campaignCode: 'A1b2C3d4E5'
      }
      // request.userに正常値を想定する
      request.user = {
        tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089',
        userId: '976d46d7-cb0b-48ad-857d-4b42a44ede13',
        accessToken: 'dummyAccessToken',
        refreshToken: 'dummyRefreshToken'
      }
      // Tradeshiftアクセスでのエラーを想定する
      accessTradeshiftSpy.mockReturnValue(new Error('Access error mock'))

      // 試験実施
      await routesTenant.cbPostRegister(request, response, next)

      // 期待結果
      // 500エラーがエラーハンドリング「される」
      expect(next).toHaveBeenCalledWith(errorHelper.create(500))
      // 登録成功時のログが呼ばれ「ない」
      expect(infoSpy).not.toHaveBeenCalled()
      // ポータルにリダイレクト「されない」
      expect(response.redirect).not.toHaveBeenCalledWith(303, '/portal')
      expect(response.getHeader('Location')).not.toEqual('/portal')
    })

    test('「テナント管理者権限のあるユーザで再度操作をお試しください。」の画面表示：アカウント管理者権限のないユーザで操作した場合', async () => {
      // 準備
      // session.userContextに正常値(NotTenantRegistered)を想定する
      request.session = {
        userContext: 'NotTenantRegistered'
      }
      // フォームの送信値
      request.body = {
        termsCheck: 'on',
        // 入力フォームデータ
        password: '1q2w3e4r5t',
        contractorName: '市江素',
        contractorKanaName: 'シエス',
        postalNumber: '1234567',
        contractAddressVal: '東京都渋谷区１丁目',
        banch1: '１番地',
        tatemono1: '銀王ビル',
        contactPersonName: 'トレド',
        contactPhoneNumber: '080-1234-5678',
        contactMail: 'example@example.com',
        campaignCode: 'A1b2C3d4E5'
      }
      // request.userに正常値を想定する
      request.user = {
        tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089',
        userId: '976d46d7-cb0b-48ad-857d-4b42a44ede13',
        accessToken: 'dummyAccessToken',
        refreshToken: 'dummyRefreshToken'
      }
      // Tradeshiftの応答で、管理者権限(Role: a6a3edcd-00d9-427c-bf03-4ef0112ba16d)がない状態にする
      accessTradeshiftSpy.mockReturnValue({
        Id: '976d46d7-cb0b-48ad-857d-4b42a44ede13',
        CompanyAccountId: '15e2d952-8ba0-42a4-8582-b234cb4a2089',
        Memberships: [
          {
            UserId: '976d46d7-cb0b-48ad-857d-4b42a44ede13',
            GroupId: '15e2d952-8ba0-42a4-8582-b234cb4a2089',
            Role: 'abcdefcd-00d9-427c-bf03-1234a2a2d55a'
          }
        ]
      })

      // 試験実施
      await routesTenant.cbPostRegister(request, response, next)

      // 期待結果
      // 一般ユーザで使用できない
      expect(next).toHaveBeenCalledWith(noticeHelper.create('generaluser'))

      // 登録成功時のログが呼ばれ「ない」
      expect(infoSpy).not.toHaveBeenCalled()
      // ポータルにリダイレクト「されない」
      expect(response.redirect).not.toHaveBeenCalledWith(303, '/portal')
      expect(response.getHeader('Location')).not.toEqual('/portal')
    })

    test('500エラー：データベースエラーが発生した場合', async () => {
      // 準備
      // session.userContextに正常値(NotTenantRegistered)を想定する
      request.session = {
        userContext: 'NotTenantRegistered'
      }
      // フォームの送信値
      request.body = {
        termsCheck: 'on',
        // 入力フォームデータ
        password: '1q2w3e4r5t',
        contractorName: '市江素',
        contractorKanaName: 'シエス',
        postalNumber: '1234567',
        contractAddressVal: '東京都渋谷区１丁目',
        banch1: '１番地',
        tatemono1: '銀王ビル',
        contactPersonName: 'トレド',
        contactPhoneNumber: '080-1234-5678',
        contactMail: 'example@example.com',
        campaignCode: 'A1b2C3d4E5',
        salesPersonName: ''
      }
      // request.userに正常値を想定する
      request.user = {
        tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089',
        userId: '976d46d7-cb0b-48ad-857d-4b42a44ede13',
        accessToken: 'dummyAccessToken',
        refreshToken: 'dummyRefreshToken'
      }
      // Tradeshiftから正常なユーザデータ取得を想定する
      accessTradeshiftSpy.mockReturnValueOnce({
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
      })
      // DBのデータ取得時にエラーを想定する
      createSpy.mockReturnValue(new Error('DB error mock'))

      // 試験実施
      await routesTenant.cbPostRegister(request, response, next)

      // 期待結果
      // 500エラーがエラーハンドリング「される」
      expect(next).toHaveBeenCalledWith(errorHelper.create(500))
      // 登録成功時のログが呼ばれ「ない」
      expect(infoSpy).not.toHaveBeenCalled()
      // ポータルにリダイレクト「されない」
      expect(response.redirect).not.toHaveBeenCalledWith(303, '/portal')
      expect(response.getHeader('Location')).not.toEqual('/portal')
    })

    test('500エラー：createの呼び出しにユーザが見つからない場合（null）', async () => {
      // 準備
      // session.userContextに正常値(NotTenantRegistered)を想定する
      request.session = {
        userContext: 'NotTenantRegistered'
      }
      // フォームの送信値
      request.body = {
        termsCheck: 'on',
        // 入力フォームデータ
        password: '1q2w3e4r5t',
        contractorName: '市江素',
        contractorKanaName: 'シエス',
        postalNumber: '1234567',
        contractAddressVal: '東京都渋谷区１丁目',
        banch1: '１番地',
        tatemono1: '銀王ビル',
        contactPersonName: 'トレド',
        contactPhoneNumber: '080-1234-5678',
        contactMail: 'example@example.com',
        campaignCode: 'A1b2C3d4E5',
        salesPersonName: ''
      }
      // request.userに正常値を想定する
      request.user = {
        tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089',
        userId: '976d46d7-cb0b-48ad-857d-4b42a44ede13',
        accessToken: 'dummyAccessToken',
        refreshToken: 'dummyRefreshToken'
      }
      // Tradeshiftから正常なユーザデータ取得を想定する
      accessTradeshiftSpy.mockReturnValueOnce({
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
      })
      // DBからのデータ取得ができなかった場合を想定する
      createSpy.mockReturnValue(null)

      // 試験実施
      await routesTenant.cbPostRegister(request, response, next)

      // 期待結果
      // 500エラーがエラーハンドリング「される」
      expect(next).toHaveBeenCalledWith(errorHelper.create(500))
      // 登録成功時のログが呼ばれ「ない」
      expect(infoSpy).not.toHaveBeenCalled()
      // ポータルにリダイレクト「されない」
      expect(response.redirect).not.toHaveBeenCalledWith(303, '/portal')
      expect(response.getHeader('Location')).not.toEqual('/portal')
    })

    test('500エラー：作られたUserが配列データではない場合', async () => {
      // 準備
      // session.userContextに正常値(NotTenantRegistered)を想定する
      request.session = {
        userContext: 'NotTenantRegistered'
      }
      // フォームの送信値
      request.body = {
        termsCheck: 'on',
        // 入力フォームデータ
        password: '1q2w3e4r5t',
        contractorName: '市江素',
        contractorKanaName: 'シエス',
        postalNumber: '1234567',
        contractAddressVal: '東京都渋谷区１丁目',
        banch1: '１番地',
        tatemono1: '銀王ビル',
        contactPersonName: 'トレド',
        contactPhoneNumber: '080-1234-5678',
        contactMail: 'example@example.com',
        campaignCode: 'A1b2C3d4E5',
        salesPersonName: ''
      }
      // request.userに正常値を想定する
      request.user = {
        tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089',
        userId: '976d46d7-cb0b-48ad-857d-4b42a44ede13',
        accessToken: 'dummyAccessToken',
        refreshToken: 'dummyRefreshToken'
      }
      // Tradeshiftから正常なユーザデータ取得を想定する
      accessTradeshiftSpy.mockReturnValueOnce({
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
      })
      // DBからの取得データが配列ではなかった場合を想定する
      createSpy.mockReturnValue({
        userId: '976d46d7-cb0b-48ad-857d-4b42a44ede13',
        tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089',
        userRole: 'a6a3edcd-00d9-427c-bf03-4ef0112ba16d',
        appVersion: '0.0.1',
        refreshToken: 'dummyRefreshToken',
        userStatus: 0
      })

      // 試験実施
      await routesTenant.cbPostRegister(request, response, next)

      // 期待結果
      // 500エラーがエラーハンドリング「される」
      expect(next).toHaveBeenCalledWith(errorHelper.create(500))
      // 登録成功時のログが呼ばれ「ない」
      expect(infoSpy).not.toHaveBeenCalled()
      // ポータルにリダイレクト「されない」
      expect(response.redirect).not.toHaveBeenCalledWith(303, '/portal')
      expect(response.getHeader('Location')).not.toEqual('/portal')
    })

    test('500エラー：リクエストとcreateされたuserIdが異なる場合', async () => {
      // 準備
      // session.userContextに正常値(NotTenantRegistered)を想定する
      request.session = {
        userContext: 'NotTenantRegistered'
      }
      // フォームの送信値
      request.body = {
        termsCheck: 'on',
        // 入力フォームデータ
        password: '1q2w3e4r5t',
        contractorName: '市江素',
        contractorKanaName: 'シエス',
        postalNumber: '1234567',
        contractAddressVal: '東京都渋谷区１丁目',
        banch1: '１番地',
        tatemono1: '銀王ビル',
        contactPersonName: 'トレド',
        contactPhoneNumber: '080-1234-5678',
        contactMail: 'example@example.com',
        campaignCode: 'A1b2C3d4E5',
        salesPersonName: ''
      }
      // request.userに正常値を想定する
      request.user = {
        tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089',
        userId: '976d46d7-cb0b-48ad-857d-4b42a44ede13',
        accessToken: 'dummyAccessToken',
        refreshToken: 'dummyRefreshToken'
      }
      // Tradeshiftから正常なユーザデータ取得を想定する
      accessTradeshiftSpy.mockReturnValueOnce({
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
      })
      // DBからの取得データのuserIdがrequestのuserIdと異なる場合を想定する
      createSpy.mockReturnValue([
        {
          dataValues: {
            userId: '12345678-cb0b-48ad-857d-4b42a44ede13',
            tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089',
            userRole: 'a6a3edcd-00d9-427c-bf03-4ef0112ba16d',
            appVersion: '0.0.1',
            refreshToken: 'dummyRefreshToken',
            userStatus: 0
          }
        },
        true
      ])

      // 試験実施
      await routesTenant.cbPostRegister(request, response, next)

      // 期待結果
      // 500エラーがエラーハンドリング「される」
      expect(next).toHaveBeenCalledWith(errorHelper.create(500))
      // 登録成功時のログが呼ばれ「ない」
      expect(infoSpy).not.toHaveBeenCalled()
      // ポータルにリダイレクト「されない」
      expect(response.redirect).not.toHaveBeenCalledWith(303, '/portal')
      expect(response.getHeader('Location')).not.toEqual('/portal')
    })
  })
})
