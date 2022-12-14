'use strict'
jest.mock('../../Application/node_modules/express', () => {
  return require('jest-express')
})
jest.mock('../../Application/controllers/tenantController.js', () => ({
  findOne: (tenantId) => {
    return null
  }
}))
jest.mock('../../Application/controllers/userController.js', () => ({
  create: (accessToken, refreshToken) => {
    return null
  },
  findOne: (userId) => {
    return null
  }
}))
jest.mock('../../Application/controllers/apiManager.js', () => ({
  accessTradeshift: (accessToken, refreshToken, method, query, body = {}) => {
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

const middleware = require('../../Application/routes/helpers/middleware')
const Request = require('jest-express').Request
const Response = require('jest-express').Response
const next = require('jest-express').Next
const noticeHelper = require('../../Application/routes/helpers/notice')
const errorHelper = require('../../Application/routes/helpers/error')
const tenantController = require('../../Application/controllers/tenantController.js')
const userController = require('../../Application/controllers/userController.js')
const contractController = require('../../Application/controllers/contractController.js')
const apiManager = require('../../Application/controllers/apiManager.js')
const routesTenant = require('../../Application/routes/tenant')
const expectError = new Error('デジタルトレードのご利用にはアカウント管理者による利用登録が必要です。')
expectError.name = 'Forbidden'
expectError.status = 403
expectError.desc = 'アカウント管理者権限のあるユーザで再度操作をお試しください。'

if (process.env.LOCALLY_HOSTED === 'true') {
  // NODE_ENVはJestがデフォルトでtestに指定する。dotenvで上書きできなかったため、package.jsonの実行引数でdevelopmentを指定
  require('dotenv').config({ path: './config/.env' })
}
let request,
  response,
  accessTradeshiftSpy,
  tenantFindOneSpy,
  userFindOneSpy,
  userCreateSpy,
  findContractSpy,
  contractFindOneSpy,
  checkContractStatusSpy,
  contractfindLightPlanSpy,
  contractfindIntroductionSupportPlanSpy,
  contractfindLightPlanForEntrySpy,
  contractfindIntroductionSupportPlanForEntrySpy
describe('helpers/middlewareのテスト', () => {
  beforeEach(() => {
    request = new Request()
    response = new Response()
    tenantFindOneSpy = jest.spyOn(tenantController, 'findOne')
    userFindOneSpy = jest.spyOn(userController, 'findOne')
    userCreateSpy = jest.spyOn(userController, 'create')
    findContractSpy = jest.spyOn(contractController, 'findContract')
    contractFindOneSpy = jest.spyOn(contractController, 'findOne')
    accessTradeshiftSpy = jest.spyOn(apiManager, 'accessTradeshift')
    checkContractStatusSpy = jest.spyOn(middleware, 'checkContractStatus')
    contractfindLightPlanSpy = jest.spyOn(contractController, 'findLightPlan')
    contractfindIntroductionSupportPlanSpy = jest.spyOn(contractController, 'findIntroductionSupportPlan')
    contractfindLightPlanForEntrySpy = jest.spyOn(contractController, 'findLightPlanForEntry')
    contractfindIntroductionSupportPlanForEntrySpy = jest.spyOn(
      contractController,
      'findIntroductionSupportPlanForEntry'
    )
  })
  afterEach(() => {
    request.resetMocked()
    response.resetMocked()
    next.mockReset()
    accessTradeshiftSpy.mockRestore()
    tenantFindOneSpy.mockRestore()
    userFindOneSpy.mockRestore()
    userCreateSpy.mockRestore()
    findContractSpy.mockRestore()
    checkContractStatusSpy.mockRestore()
    contractfindLightPlanSpy.mockRestore()
    contractfindIntroductionSupportPlanSpy.mockRestore()
    contractfindLightPlanForEntrySpy.mockRestore()
    contractfindIntroductionSupportPlanForEntrySpy.mockRestore()
  })

  describe('isAuthenticated', () => {
    test('正常', async () => {
      // 準備
      // userIdに正常な値を想定する
      request.user = {
        userId: '12345678-cb0b-48ad-857d-4b42a44ede13'
      }

      // 試験実施
      await middleware.isAuthenticated(request, response, next)

      // 期待結果
      // 引数なしでnextが呼ばれ「る」
      expect(next).toHaveBeenCalledWith()
      // 500エラーがエラーハンドリングされ「ない」
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(500))
      // 303エラーでauthに飛ばされ「ない」
      expect(response.redirect).not.toHaveBeenCalledWith(303, '/auth')
      expect(response.getHeader('Location')).not.toEqual('/auth')
    })

    test('500エラー：userIdのUUIDが不正な場合', async () => {
      // 準備
      // userIdのUUIDが不正な場合を想定する
      request.user = {
        userId: 'dummy'
      }

      // 試験実施
      await middleware.isAuthenticated(request, response, next)

      // 期待結果
      // 引数なしでnextが呼ばれ「ない」
      expect(next).not.toHaveBeenCalledWith()
      // 500エラーがエラーハンドリングされ「る」
      expect(next).toHaveBeenCalledWith(errorHelper.create(500))
      // authに飛ばされ「ない」
      expect(response.redirect).not.toHaveBeenCalledWith(303, '/auth')
      expect(response.getHeader('Location')).not.toEqual('/auth')
    })

    test('303エラー：userIdがnullの場合', async () => {
      // 準備
      // userIdが取れていない場合を想定する
      request.user = {
        userId: null
      }

      // 試験実施
      await middleware.isAuthenticated(request, response, next)

      // 期待結果
      // 引数なしでnextが呼ばれ「ない」
      expect(next).not.toHaveBeenCalledWith()
      // 500エラーがエラーハンドリングされ「ない」
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(500))
      // 303エラーでauthに飛ばされ「る」
      expect(response.redirect).toHaveBeenCalledWith(303, '/auth')
      expect(response.getHeader('Location')).toEqual('/auth')
    })
  })

  describe('isTenantRegistered', () => {
    test('正常', async () => {
      // 準備
      // request.userのuserId、tenantIdに正常なUUIDを想定する
      request.user = {
        userId: '12345678-cb0b-48ad-857d-4b42a44ede13',
        tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089'
      }
      // userContextに値が取れていることを想定する
      request.session = {
        userContext: 'dummy'
      }
      // DBからの正常なテナントデータ取得を想定する
      tenantFindOneSpy.mockReturnValue({
        dataValues: {
          tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089',
          registeredBy: '12345678-cb0b-48ad-857d-4b42a44ede13',
          customerId: null,
          createdAt: '2021-01-25T10:15:15.035Z',
          updatedAt: '2021-01-25T10:15:15.035Z'
        }
      })

      // 試験実施
      await middleware.isTenantRegistered(request, response, next)

      // 期待結果
      // 引数なしでnextが呼ばれ「る」
      expect(next).toHaveBeenCalledWith()
      // 303エラーでauthに飛ばされ「ない」
      expect(response.redirect).not.toHaveBeenCalledWith(303, '/auth')
      expect(response.getHeader('Location')).not.toEqual('/auth')
      // 500エラーがエラーハンドリングされ「ない」
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(500))
      // request.session.userContextが'NotTenantRegistered'になってい「ない」
      expect(request.session.userContext).not.toBe('NotTenantRegistered')
      // 303エラーで/tenant/registerに飛ばされ「ない」
      expect(response.redirect).not.toHaveBeenCalledWith(303, '/tenant/register')
      expect(response.getHeader('Location')).not.toEqual('/tenant/register')
    })

    test('303エラー: tenantIdがnullの場合', async () => {
      // 準備
      // request.userのuserIdが正常、tenantIdが取れていない場合を想定する
      request.user = {
        userId: '12345678-cb0b-48ad-857d-4b42a44ede13',
        tenantId: null
      }

      // 試験実施
      await middleware.isTenantRegistered(request, response, next)

      // 期待結果
      // 引数なしでnextが呼ばれ「ない」
      expect(next).not.toHaveBeenCalledWith()
      // 303エラーでauthに飛ばされ「る」
      expect(response.redirect).toHaveBeenCalledWith(303, '/auth')
      expect(response.getHeader('Location')).toEqual('/auth')
    })

    // トレシフユーザロールによって、画面表示を制御する#1
    test('利用登録画面 (条件：テナント管理者、利用登録されていない)', async () => {
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
      await middleware.isTenantRegistered(request, response, next)
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

    // #675、【実装】トレシフユーザロールによって、画面表示を制御する#2
    test('利用登録画面（条件：他のテナント管理者のロール, 利用登録されていない）', async () => {
      // 準備
      // session.userContextに正常値(NotTenantRegistered)を想定する
      request.session = {
        userContext: 'NotTenantRegistered'
      }
      // request.userに正常値を想定する
      request.user = {
        tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089',
        userId: '98677ae6-f468-4be4-857a-cfa5dce6aca6',
        accessToken: 'dummyAccessToken',
        refreshToken: 'dummyRefreshToken'
      }
      // Tradeshift(1回目)から正常なユーザデータ取得を想定する
      accessTradeshiftSpy
        .mockReturnValueOnce({
          Id: '98677ae6-f468-4be4-857a-cfa5dce6aca6',
          CompanyAccountId: '15e2d952-8ba0-42a4-8582-b234cb4a2089',
          CompanyName: 'UnitTestCompany',
          Username: 'dummy@example.com',
          Language: 'ja',
          TimeZone: 'Asia/Tokyo',
          Memberships: [
            {
              UserId: '98677ae6-f468-4be4-857a-cfa5dce6aca6',
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
      await middleware.isTenantRegistered(request, response, next)
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

    // #1156、【実装】一般ユーザ向け画面制御
    test('「テナント管理者権限のあるユーザで再度操作をお試しください。」の画面表示（条件：一般ユーザ, 利用登録されていない）', async () => {
      // 準備
      // session.userContextに正常値(NotTenantRegistered)を想定する
      request.session = {
        userContext: 'NotTenantRegistered'
      }
      // request.userに正常値を想定する
      request.user = {
        tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089',
        userId: '96616a8d-bb2c-4d10-9634-6c98ac0405a4',
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
              Role: 'abcdefcd-00d9-427c-bf03-4ef0112ba16d'
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
      await middleware.isTenantRegistered(request, response, next)
      await routesTenant.cbGetRegister(request, response, next)

      // 期待結果
      // 「テナント管理者権限のあるユーザで再度操作をお試しください。」の画面表示される
      expect(next).toHaveBeenCalledWith(noticeHelper.create('generaluser'))
      // response.renderが呼ばれ「ない」
      expect(response.render).not.toHaveBeenCalled()
    })

    test('500エラー: tenantIdのUUIDが不正な場合', async () => {
      // 準備
      // request.userのuserIdが正常、tenantIdのUUIDが不正な場合を想定する
      request.user = {
        userId: '12345678-cb0b-48ad-857d-4b42a44ede13',
        tenantId: 'dummy'
      }

      // 試験実施
      await middleware.isTenantRegistered(request, response, next)

      // 期待結果
      // 引数なしでnextが呼ばれ「ない」
      expect(next).not.toHaveBeenCalledWith()
      // 303エラーでauthに飛ばされ「ない」
      expect(response.redirect).not.toHaveBeenCalledWith(303, '/auth')
      expect(response.getHeader('Location')).not.toEqual('/auth')
      // 500エラーがエラーハンドリングされ「る」
      expect(next).toHaveBeenCalledWith(errorHelper.create(500))
    })

    test('500エラー: DBエラーの場合', async () => {
      // 準備
      // userId、tenantIdに正常なUUIDを想定する
      request.user = {
        userId: '12345678-cb0b-48ad-857d-4b42a44ede13',
        tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089'
      }
      // DBからのテナントデータ取得時にエラーを想定する
      tenantFindOneSpy.mockReturnValue(new Error('DB error mock'))

      // 試験実施
      await middleware.isTenantRegistered(request, response, next)

      // 期待結果
      // 引数なしでnextが呼ばれ「ない」
      expect(next).not.toHaveBeenCalledWith()
      // 303エラーでauthに飛ばされ「ない」
      expect(response.redirect).not.toHaveBeenCalledWith(303, '/auth')
      expect(response.getHeader('Location')).not.toEqual('/auth')
      // 500エラーがエラーハンドリングされ「る」
      expect(next).toHaveBeenCalledWith(errorHelper.create(500))
    })

    test('303エラー: DBからtenantが見つからない場合', async () => {
      // 準備
      // request.userのuserId、tenantIdに正常なUUIDを想定する
      request.user = {
        userId: '12345678-cb0b-48ad-857d-4b42a44ede13',
        tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089'
      }
      // userContextに値が取れていることを想定する
      request.session = {
        userContext: 'dummy'
      }
      // DBからテナントデータが取得できなかった場合を想定する
      tenantFindOneSpy.mockReturnValue(null)

      // 試験実施
      await middleware.isTenantRegistered(request, response, next)

      // 期待結果
      // 引数なしでnextが呼ばれ「ない」
      expect(next).not.toHaveBeenCalledWith()
      // 303エラーでauthに飛ばされ「ない」
      expect(response.redirect).not.toHaveBeenCalledWith(303, '/auth')
      expect(response.getHeader('Location')).not.toEqual('/auth')
      // 500エラーがエラーハンドリングされ「ない」
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(500))
      // request.session.userContextが'NotTenantRegistered'になっている
      expect(request.session.userContext).toBe('NotTenantRegistered')
      // 303エラーで/tenant/registerに飛ばされ「る」
      expect(response.redirect).toHaveBeenCalledWith(303, '/tenant/register')
      expect(response.getHeader('Location')).toEqual('/tenant/register')
    })

    test('303エラー: DBから取得したtenantのdeleteFlagがtrueの場合', async () => {
      // 準備
      // request.userのuserId、tenantIdに正常なUUIDを想定する
      request.user = {
        userId: '12345678-cb0b-48ad-857d-4b42a44ede13',
        tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089'
      }
      // userContextに値が取れていることを想定する
      request.session = {
        userContext: 'dummy'
      }
      // DBからテナントデータが取得できなかった場合を想定する
      tenantFindOneSpy.mockReturnValue({
        dataValues: {
          tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089',
          registeredBy: '12345678-cb0b-48ad-857d-4b42a44ede13',
          customerId: null,
          createdAt: '2021-01-25T10:15:15.035Z',
          updatedAt: '2021-01-25T10:15:15.035Z',
          deleteFlag: true
        }
      })

      // 試験実施
      await middleware.isTenantRegistered(request, response, next)

      // 期待結果
      // 引数なしでnextが呼ばれ「ない」
      expect(next).not.toHaveBeenCalledWith()
      // 303エラーでauthに飛ばされ「ない」
      expect(response.redirect).not.toHaveBeenCalledWith(303, '/auth')
      expect(response.getHeader('Location')).not.toEqual('/auth')
      // 500エラーがエラーハンドリングされ「ない」
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(500))
      // request.session.userContextが'NotTenantRegistered'になっている
      expect(request.session.userContext).toBe('NotTenantRegistered')
      // 303エラーで/tenant/registerに飛ばされ「る」
      expect(response.redirect).toHaveBeenCalledWith(303, '/tenant/register')
      expect(response.getHeader('Location')).toEqual('/tenant/register')
    })

    test('500エラー: DBから取得したtenantデータがdataValuesに入っていない場合', async () => {
      // 準備
      // request.userのuserId、tenantIdに正常なUUIDを想定する
      request.user = {
        userId: '12345678-cb0b-48ad-857d-4b42a44ede13',
        tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089'
      }
      // userContextに値が取れていることを想定する
      request.session = {
        userContext: 'dummy'
      }
      // DBから取得したテナントデータがdataValuesに入っていない場合を想定する
      tenantFindOneSpy.mockReturnValue({
        tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089',
        registeredBy: '12345678-cb0b-48ad-857d-4b42a44ede13',
        customerId: null,
        createdAt: '2021-01-25T10:15:15.035Z',
        updatedAt: '2021-01-25T10:15:15.035Z'
      })

      // 試験実施
      await middleware.isTenantRegistered(request, response, next)

      // 期待結果
      // 引数なしでnextが呼ばれ「ない」
      expect(next).not.toHaveBeenCalledWith()
      // 303エラーでauthに飛ばされ「ない」
      expect(response.redirect).not.toHaveBeenCalledWith(303, '/auth')
      expect(response.getHeader('Location')).not.toEqual('/auth')
      // 500エラーがエラーハンドリングされ「る」
      expect(next).toHaveBeenCalledWith(errorHelper.create(500))
      // request.session.userContextが'NotTenantRegistered'になってい「ない」
      expect(request.session.userContext).not.toBe('NotTenantRegistered')
      // 303エラーで/tenant/registerに飛ばされ「ない」
      expect(response.redirect).not.toHaveBeenCalledWith(303, '/tenant/register')
      expect(response.getHeader('Location')).not.toEqual('/tenant/register')
    })
  })

  describe('isUserRegistered', () => {
    test('正常', async () => {
      // 準備
      // request.userのuserIdに正常なUUIDを想定する
      request.user = {
        userId: '12345678-cb0b-48ad-857d-4b42a44ede13'
      }
      // userContextに値が取れていることを想定する
      request.session = {
        userContext: 'dummy'
      }
      // DBから正常なユーザデータの取得を想定する
      userFindOneSpy.mockReturnValue({
        dataValues: {
          userId: '12345678-cb0b-48ad-857d-4b42a44ede13',
          tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089',
          userRole: 'a6a3edcd-00d9-427c-bf03-4ef0112ba16d',
          appVersion: '0.0.1',
          refreshToken: 'dummyRefreshToken',
          subRefreshToken: null,
          userStatus: 0,
          lastRefreshedAt: null,
          createdAt: '2021-01-25T10:15:15.086Z',
          updatedAt: '2021-01-25T10:15:15.086Z'
        }
      })

      // 試験実施
      await middleware.isUserRegistered(request, response, next)

      // 期待結果
      // 500エラーがエラーハンドリングされ「ない」
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(500))
      // 引数なしでnextが呼ばれ「る」
      expect(next).toHaveBeenCalledWith()
    })

    test('303エラー: userIdがnullの場合', async () => {
      // 準備
      // request.userのuserIdが取れていない場合を想定する
      request.user = {
        userId: null
      }

      // 試験実施
      await middleware.isUserRegistered(request, response, next)

      // 期待結果
      // 引数なしでnextが呼ばれ「ない」
      expect(next).not.toHaveBeenCalledWith()
      // 303エラーでauthに飛ばされ「る」
      expect(response.redirect).toHaveBeenCalledWith(303, '/auth')
      expect(response.getHeader('Location')).toEqual('/auth')
    })

    test('500エラー: userIdのUUIDが不正な場合', async () => {
      // 準備
      // request.userのuserIdのUUIDが不正な場合を想定する
      request.user = {
        userId: 'dummy'
      }

      // 試験実施
      await middleware.isUserRegistered(request, response, next)

      // 期待結果
      // 引数なしでnextが呼ばれ「ない」
      expect(next).not.toHaveBeenCalledWith()
      // 303エラーでauthに飛ばされ「ない」
      expect(response.redirect).not.toHaveBeenCalledWith(303, '/auth')
      expect(response.getHeader('Location')).not.toEqual('/auth')
      // 500エラーがエラーハンドリングされ「る」
      expect(next).toHaveBeenCalledWith(errorHelper.create(500))
    })

    test('500エラー: DBエラーの場合', async () => {
      // 準備
      // request.userのuserIdに正常なUUIDを想定する
      request.user = {
        userId: '12345678-cb0b-48ad-857d-4b42a44ede13',
        tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089'
      }
      // DBからテナントデータが取得できなかった場合を想定する
      userFindOneSpy.mockReturnValue(new Error())
      // 試験実施
      await middleware.isUserRegistered(request, response, next)

      // 期待結果
      // 引数なしでnextが呼ばれ「ない」
      expect(next).not.toHaveBeenCalledWith()
      // 303エラーでauthに飛ばされ「ない」
      expect(response.redirect).not.toHaveBeenCalledWith(303, '/auth')
      expect(response.getHeader('Location')).not.toEqual('/auth')
      // 500エラーがエラーハンドリングされ「る」
      expect(next).toHaveBeenCalledWith(errorHelper.create(500))
    })

    test('portal画面へ移動、 DBからuserが見つからない場合', async () => {
      // 準備
      // request.userのuserIdに正常なUUIDを想定する
      request.user = {
        userId: '12345678-cb0b-48ad-857d-4b42a44ede13',
        tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089'
      }
      // userContextに値が取れていることを想定する
      request.session = {
        userContext: 'dummy'
      }

      userFindOneSpy.mockReturnValue(null)
      userCreateSpy.mockReturnValue({
        dataValues: {
          userId: '12345678-cb0b-48ad-857d-4b42a44ede13',
          tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089',
          userRole: 'a6a3edcd-00d9-427c-bf03-4ef0112ba16d',
          appVersion: '0.0.1',
          refreshToken: 'dummyRefreshToken',
          subRefreshToken: null,
          userStatus: 0,
          lastRefreshedAt: null,
          createdAt: '2021-01-25T10:15:15.086Z',
          updatedAt: '2021-01-25T10:15:15.086Z'
        }
      })

      request.csrfToken = jest.fn()

      // 試験実施
      await middleware.isUserRegistered(request, response, next)

      // 期待結果
      // 引数なしでnextが呼ばれ「る」
      expect(next).toHaveBeenCalledWith()
      // 303エラーでauthに飛ばされ「ない」
      expect(response.redirect).not.toHaveBeenCalledWith(303, '/auth')
      expect(response.getHeader('Location')).not.toEqual('/auth')
      // 500エラーがエラーハンドリングされ「ない」
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(500))
    })

    test('500エラー: DBから取得したuserデータがdataValuesに入っていない場合', async () => {
      // 準備
      // request.userのuserIdに正常なUUIDを想定する
      request.user = {
        userId: '12345678-cb0b-48ad-857d-4b42a44ede13',
        tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089'
      }
      // userContextに値が取れていることを想定する
      request.session = {
        userContext: 'dummy'
      }
      // DBから取得したテナントデータがdataValuesに入っていない場合を想定する
      userFindOneSpy.mockReturnValue({
        userId: '12345678-cb0b-48ad-857d-4b42a44ede13',
        tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089',
        userRole: 'a6a3edcd-00d9-427c-bf03-4ef0112ba16d',
        appVersion: '0.0.1',
        refreshToken: 'dummyRefreshToken',
        subRefreshToken: null,
        userStatus: 0,
        lastRefreshedAt: null,
        createdAt: '2021-01-25T10:15:15.086Z',
        updatedAt: '2021-01-25T10:15:15.086Z'
      })

      // 試験実施
      await middleware.isUserRegistered(request, response, next)

      // 期待結果
      // 引数なしでnextが呼ばれ「ない」
      expect(next).not.toHaveBeenCalledWith()
      // 303エラーでauthに飛ばされ「ない」
      expect(response.redirect).not.toHaveBeenCalledWith(303, '/auth')
      expect(response.getHeader('Location')).not.toEqual('/auth')
      // 500エラーがエラーハンドリングされ「る」
      expect(next).toHaveBeenCalledWith(errorHelper.create(500))
    })
  })

  // ----------------------------

  describe('checkContractStatus', () => {
    test('正常', async () => {
      // 準備
      // request.userのuserIdに正常なUUIDを想定する
      request.user = {
        userId: '12345678-cb0b-48ad-857d-4b42a44ede13',
        tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089'
      }

      // DBから正常な契約データの取得を想定する
      findContractSpy.mockReturnValue({
        dataValues: {
          contractId: '034d9315-46e3-4032-8258-8e30b417f1b1',
          tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089',
          numberN: 'numberN',
          contractStatus: '00',
          deleteFlag: false,
          createdAt: '2021-07-15 17:41:38',
          updatedAt: '2021-07-15 17:41:38',
          contractedAt: '2021-07-15 17:41:38',
          canceledAt: ''
        }
      })

      // 試験実施
      const result = await middleware.checkContractStatus(request.user.tenantId)

      // 期待結果
      // return値がcontractStatusであること
      expect(result).toBe('00')
    })

    test('500エラー: DBエラーの場合（contractsテーブル）', async () => {
      // 準備
      // request.userのuserIdに正常なUUIDを想定する
      request.user = {
        userId: '12345678-cb0b-48ad-857d-4b42a44ede13',
        tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089'
      }

      // DBから正常な契約データの取得を想定する
      findContractSpy.mockReturnValue(new Error())

      // 試験実施
      const result = await middleware.checkContractStatus(request.user.tenantId)

      // 期待結果
      // nullを返す
      expect(result).toEqual(null)
    })

    test('DBからcontractデータのdeleteFlagがtrueの場合', async () => {
      // 準備
      // request.userのuserIdに正常なUUIDを想定する
      request.user = {
        userId: '12345678-cb0b-48ad-857d-4b42a44ede13',
        tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089'
      }

      // DBから正常な契約データの取得を想定する
      findContractSpy.mockReturnValue({
        dataValues: {
          contractId: '034d9315-46e3-4032-8258-8e30b417f1b1',
          tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089',
          numberN: 'numberN',
          contractStatus: '00',
          deleteFlag: true,
          createdAt: '2021-07-15 17:41:38',
          updatedAt: '2021-07-15 17:41:38',
          contractedAt: '2021-07-15 17:41:38',
          canceledAt: ''
        }
      })

      request.csrfToken = jest.fn()

      // 試験実施
      const result = await middleware.checkContractStatus(request.user.tenantId)

      // 期待結果
      // '00'返す
      expect(result).toBe('00')
    })

    test('DBから取得したデータがnullの場合', async () => {
      // 準備
      // request.userのuserIdに正常なUUIDを想定する
      request.user = {
        userId: '12345678-cb0b-48ad-857d-4b42a44ede13',
        tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089'
      }

      // DBから正常な契約データの取得を想定する
      findContractSpy.mockReturnValue(null)

      // 試験実施
      const result = await middleware.checkContractStatus(request.user.tenantId)

      // 期待結果
      // return値がnullであること
      expect(result).toBe(null)
    })

    test('DBから取得したコントラクターステータスがnullの場合', async () => {
      // 準備
      // request.userのuserIdに正常なUUIDを想定する
      request.user = {
        userId: '12345678-cb0b-48ad-857d-4b42a44ede13',
        tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089'
      }

      // DBから正常な契約データの取得を想定する
      findContractSpy.mockReturnValue({
        dataValues: {
          contractId: '034d9315-46e3-4032-8258-8e30b417f1b1',
          tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089',
          numberN: 'numberN',
          contractStatus: null,
          deleteFlag: false,
          createdAt: '2021-07-15 17:41:38',
          updatedAt: '2021-07-15 17:41:38',
          contractedAt: '2021-07-15 17:41:38',
          canceledAt: ''
        }
      })

      // 試験実施
      const result = await middleware.checkContractStatus(request.user.tenantId)

      // 期待結果
      // return値が999であること
      expect(result).toBe(999)
    })

    test('DBから取得したコントラクターが複数の場合', async () => {
      // 準備
      // request.userのuserIdに正常なUUIDを想定する
      request.user = {
        userId: '12345678-cb0b-48ad-857d-4b42a44ede13',
        tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089'
      }

      // DBから正常な契約データの取得を想定する
      findContractSpy.mockReturnValue([
        {
          dataValues: {
            contractId: '034d9315-46e3-4032-8258-8e30b417f1b1',
            tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089',
            numberN: 'numberN',
            contractStatus: null,
            deleteFlag: false,
            createdAt: '2021-07-15 17:41:38',
            updatedAt: '2021-07-15 17:41:38',
            contractedAt: '2021-07-15 17:41:38',
            canceledAt: ''
          }
        }
      ])

      // 試験実施
      const result = await middleware.checkContractStatus(request.user.tenantId)

      // 期待結果
      // return値が999であること
      expect(result).toBe(999)
    })
  })

  describe('isOnOrChangeContract', () => {
    describe('正常系', () => {
      test('契約ステータス:10', async () => {
        // 準備
        // request.userのuserId、tenantIdに正常なUUIDを想定する
        request.user = {
          userId: '12345678-cb0b-48ad-857d-4b42a44ede13',
          tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089'
        }

        // DBから正常な契約データの取得を想定する
        contractFindOneSpy.mockReturnValue({
          dataValues: {
            contractId: '034d9315-46e3-4032-8258-8e30b417f1b1',
            tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089',
            numberN: 'numberN',
            contractStatus: '10',
            deleteFlag: false,
            createdAt: '2021-07-15 17:41:38',
            updatedAt: '2021-07-15 17:41:38'
          }
        })

        // 試験実施
        await middleware.isOnOrChangeContract(request, response, next)

        // 期待結果
        expect(next).toHaveBeenCalledWith(noticeHelper.create('registerprocedure'))
      })

      test('契約ステータス:11', async () => {
        // 準備
        // request.userのuserId、tenantIdに正常なUUIDを想定する
        request.user = {
          userId: '12345678-cb0b-48ad-857d-4b42a44ede13',
          tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089'
        }

        // DBから正常な契約データの取得を想定する
        contractFindOneSpy.mockReturnValue({
          dataValues: {
            contractId: '034d9315-46e3-4032-8258-8e30b417f1b1',
            tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089',
            numberN: 'numberN',
            contractStatus: '11',
            deleteFlag: false,
            createdAt: '2021-07-15 17:41:38',
            updatedAt: '2021-07-15 17:41:38'
          }
        })

        // 試験実施
        await middleware.isOnOrChangeContract(request, response, next)

        // 期待結果
        expect(next).toHaveBeenCalledWith(noticeHelper.create('registerprocedure'))
      })

      test('契約ステータス:30', async () => {
        // 準備
        // request.userのuserId、tenantIdに正常なUUIDを想定する
        request.user = {
          userId: '12345678-cb0b-48ad-857d-4b42a44ede13',
          tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089'
        }

        // DBから正常な契約データの取得を想定する
        contractFindOneSpy.mockReturnValue({
          dataValues: {
            contractId: '034d9315-46e3-4032-8258-8e30b417f1b1',
            tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089',
            numberN: 'numberN',
            contractStatus: '30',
            deleteFlag: false,
            createdAt: '2021-07-15 17:41:38',
            updatedAt: '2021-07-15 17:41:38'
          }
        })

        // 試験実施
        await middleware.isOnOrChangeContract(request, response, next)

        // 期待結果
        expect(next).toHaveBeenCalledWith(noticeHelper.create('cancelprocedure'))
      })

      test('契約ステータス:31', async () => {
        // 準備
        // request.userのuserId、tenantIdに正常なUUIDを想定する
        request.user = {
          userId: '12345678-cb0b-48ad-857d-4b42a44ede13',
          tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089'
        }

        // DBから正常な契約データの取得を想定する
        contractFindOneSpy.mockReturnValue({
          dataValues: {
            contractId: '034d9315-46e3-4032-8258-8e30b417f1b1',
            tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089',
            numberN: 'numberN',
            contractStatus: '31',
            deleteFlag: false,
            createdAt: '2021-07-15 17:41:38',
            updatedAt: '2021-07-15 17:41:38'
          }
        })

        // 試験実施
        await middleware.isOnOrChangeContract(request, response, next)

        // 期待結果
        expect(next).toHaveBeenCalledWith(noticeHelper.create('cancelprocedure'))
      })

      test('契約ステータス:40', async () => {
        // 準備
        // request.userのuserId、tenantIdに正常なUUIDを想定する
        request.user = {
          userId: '12345678-cb0b-48ad-857d-4b42a44ede13',
          tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089'
        }

        // DBから正常な契約データの取得を想定する
        contractFindOneSpy.mockReturnValue({
          dataValues: {
            contractId: '034d9315-46e3-4032-8258-8e30b417f1b1',
            tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089',
            numberN: 'numberN',
            contractStatus: '40',
            deleteFlag: false,
            createdAt: '2021-07-15 17:41:38',
            updatedAt: '2021-07-15 17:41:38'
          }
        })

        // 試験実施
        await middleware.isOnOrChangeContract(request, response, next)

        // 期待結果
        expect(next).toHaveBeenCalledWith()
      })

      test('契約ステータス:41', async () => {
        // 準備
        // request.userのuserId、tenantIdに正常なUUIDを想定する
        request.user = {
          userId: '12345678-cb0b-48ad-857d-4b42a44ede13',
          tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089'
        }

        // DBから正常な契約データの取得を想定する
        contractFindOneSpy.mockReturnValue({
          dataValues: {
            contractId: '034d9315-46e3-4032-8258-8e30b417f1b1',
            tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089',
            numberN: 'numberN',
            contractStatus: '41',
            deleteFlag: false,
            createdAt: '2021-07-15 17:41:38',
            updatedAt: '2021-07-15 17:41:38'
          }
        })

        // 試験実施
        await middleware.isOnOrChangeContract(request, response, next)

        // 期待結果
        expect(next).toHaveBeenCalledWith()
      })
    })

    describe('準正常系', () => {
      test('想定外契約ステータス', async () => {
        // 準備
        // request.userのuserId、tenantIdに正常なUUIDを想定する
        request.user = {
          userId: '12345678-cb0b-48ad-857d-4b42a44ede13',
          tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089'
        }

        // DBから正常な契約データの取得を想定する
        contractFindOneSpy.mockReturnValue({
          dataValues: {
            contractId: '034d9315-46e3-4032-8258-8e30b417f1b1',
            tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089',
            numberN: 'numberN',
            contractStatus: '01',
            deleteFlag: false,
            createdAt: '2021-07-15 17:41:38',
            updatedAt: '2021-07-15 17:41:38'
          }
        })

        // 試験実施
        await middleware.isOnOrChangeContract(request, response, next)

        // 期待結果
        expect(next).toHaveBeenCalledWith(errorHelper.create(500))
      })

      test('DBエラー', async () => {
        // 準備
        // request.userのuserId、tenantIdに正常なUUIDを想定する
        request.user = {
          userId: '12345678-cb0b-48ad-857d-4b42a44ede13',
          tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089'
        }

        // DBから正常な契約データの取得を想定する
        contractFindOneSpy.mockReturnValue(new Error('any'))

        // 試験実施
        await middleware.isOnOrChangeContract(request, response, next)

        // 期待結果
        expect(next).toHaveBeenCalledWith(errorHelper.create(500))
      })
    })
  })

  describe('getContractPlan', () => {
    test('正常：無償プランの場合', async () => {
      // 準備
      // userIdに正常な値を想定する
      request.user = {
        userId: '12345678-cb0b-48ad-857d-4b42a44ede13'
      }

      // DBから有償プランの契約データが取得されない
      contractfindLightPlanSpy.mockReturnValue(null)
      contractfindIntroductionSupportPlanSpy.mockReturnValue(null)
      contractfindLightPlanForEntrySpy.mockReturnValue(null)
      contractfindIntroductionSupportPlanForEntrySpy.mockReturnValue(null)
      // 試験実施
      await middleware.getContractPlan(request, response, next)

      // 期待結果
      // 引数なしでnextが呼ばれ「る」
      expect(next).toHaveBeenCalledWith()
      // islightPlanが「false」
      expect(request.contractPlan.isLightPlan).toEqual(false)
      // isIntroductionSupportPlanが「false」
      expect(request.contractPlan.isIntroductionSupportPlan).toEqual(false)
      // isLightPlanForEntryが「false」
      expect(request.contractPlan.isLightPlanForEntry).toEqual(false)
      // isIntroductionSupportPlanForEntryが「false」
      expect(request.contractPlan.isIntroductionSupportPlanForEntry).toEqual(false)
    })
    test('正常：スタンダードプラン契約中の場合', async () => {
      // 準備
      // userIdに正常な値を想定する
      request.user = {
        userId: '12345678-cb0b-48ad-857d-4b42a44ede13'
      }

      // DBからスタンダードプランの契約データの取得を想定する
      contractfindLightPlanSpy.mockReturnValue({
        dataValues: {
          contractId: '034d9315-46e3-4032-8258-8e30b417f1b1',
          tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089',
          numberN: 'numberN',
          contractStatus: '00',
          serviceType: '030',
          deleteFlag: false,
          createdAt: '2021-07-15 17:41:38',
          updatedAt: '2021-07-15 17:41:38'
        }
      })
      contractfindIntroductionSupportPlanSpy.mockReturnValue(null)
      contractfindLightPlanForEntrySpy.mockReturnValue(null)
      contractfindIntroductionSupportPlanForEntrySpy.mockReturnValue(null)
      // 試験実施
      await middleware.getContractPlan(request, response, next)

      // 期待結果
      // 引数なしでnextが呼ばれ「る」
      expect(next).toHaveBeenCalledWith()
      // islightPlanが「true」
      expect(request.contractPlan.isLightPlan).toEqual(true)
      // isIntroductionSupportPlanが「false」
      expect(request.contractPlan.isIntroductionSupportPlan).toEqual(false)
      // isLightPlanForEntryが「false」
      expect(request.contractPlan.isLightPlanForEntry).toEqual(false)
      // isIntroductionSupportPlanForEntryが「false」
      expect(request.contractPlan.isIntroductionSupportPlanForEntry).toEqual(false)
    })
    test('正常：導入支援プラン契約中の場合', async () => {
      // 準備
      // userIdに正常な値を想定する
      request.user = {
        userId: '12345678-cb0b-48ad-857d-4b42a44ede13'
      }

      contractfindLightPlanSpy.mockReturnValue(true)
      // DBから導入支援プランの契約データの取得を想定する
      contractfindIntroductionSupportPlanSpy.mockReturnValue({
        dataValues: {
          contractId: '034d9315-46e3-4032-8258-8e30b417f1b1',
          tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089',
          numberN: 'numberN',
          contractStatus: '00',
          serviceType: '020',
          deleteFlag: false,
          createdAt: '2021-07-15 17:41:38',
          updatedAt: '2021-07-15 17:41:38'
        }
      })
      contractfindLightPlanForEntrySpy.mockReturnValue(null)
      contractfindIntroductionSupportPlanForEntrySpy.mockReturnValue(null)
      // 試験実施
      await middleware.getContractPlan(request, response, next)

      // 期待結果
      // 引数なしでnextが呼ばれ「る」
      expect(next).toHaveBeenCalledWith()
      // islightPlanが「false」
      expect(request.contractPlan.isLightPlan).toEqual(true)
      // isIntroductionSupportPlanが「true」
      expect(request.contractPlan.isIntroductionSupportPlan).toEqual(true)
      // isLightPlanForEntryが「false」
      expect(request.contractPlan.isLightPlanForEntry).toEqual(false)
      // isIntroductionSupportPlanForEntryが「false」
      expect(request.contractPlan.isIntroductionSupportPlanForEntry).toEqual(false)
    })
    test('正常：スタンダードプラン申し込み中の場合', async () => {
      // 準備
      // userIdに正常な値を想定する
      request.user = {
        userId: '12345678-cb0b-48ad-857d-4b42a44ede13'
      }

      contractfindLightPlanSpy.mockReturnValue(null)
      contractfindIntroductionSupportPlanSpy.mockReturnValue(null)
      // DBからスタンダードプランの契約データの取得を想定する
      contractfindLightPlanForEntrySpy.mockReturnValue({
        dataValues: {
          contractId: '034d9315-46e3-4032-8258-8e30b417f1b1',
          tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089',
          numberN: 'numberN',
          contractStatus: '10',
          serviceType: '030',
          deleteFlag: false,
          createdAt: '2021-07-15 17:41:38',
          updatedAt: '2021-07-15 17:41:38'
        }
      })
      contractfindIntroductionSupportPlanForEntrySpy.mockReturnValue(null)
      // 試験実施
      await middleware.getContractPlan(request, response, next)

      // 期待結果
      // 引数なしでnextが呼ばれ「る」
      expect(next).toHaveBeenCalledWith()
      // islightPlanが「false」
      expect(request.contractPlan.isLightPlan).toEqual(false)
      // isIntroductionSupportPlanが「false」
      expect(request.contractPlan.isIntroductionSupportPlan).toEqual(false)
      // isLightPlanForEntryが「true」
      expect(request.contractPlan.isLightPlanForEntry).toEqual(true)
      // isIntroductionSupportPlanForEntryが「false」
      expect(request.contractPlan.isIntroductionSupportPlanForEntry).toEqual(false)
    })
    test('正常：導入支援プラン申し込み中の場合', async () => {
      // 準備
      // userIdに正常な値を想定する
      request.user = {
        userId: '12345678-cb0b-48ad-857d-4b42a44ede13'
      }

      contractfindLightPlanSpy.mockReturnValue(null)
      contractfindIntroductionSupportPlanSpy.mockReturnValue(null)
      contractfindLightPlanForEntrySpy.mockReturnValue(null)
      // DBから導入支援プランの契約データの取得を想定する
      contractfindIntroductionSupportPlanForEntrySpy.mockReturnValue({
        dataValues: {
          contractId: '034d9315-46e3-4032-8258-8e30b417f1b1',
          tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089',
          numberN: 'numberN',
          contractStatus: '10',
          serviceType: '020',
          deleteFlag: false,
          createdAt: '2021-07-15 17:41:38',
          updatedAt: '2021-07-15 17:41:38'
        }
      })
      // 試験実施
      await middleware.getContractPlan(request, response, next)

      // 期待結果
      // 引数なしでnextが呼ばれ「る」
      expect(next).toHaveBeenCalledWith()
      // islightPlanが「false」
      expect(request.contractPlan.isLightPlan).toEqual(false)
      // isIntroductionSupportPlanが「false」
      expect(request.contractPlan.isIntroductionSupportPlan).toEqual(false)
      // isLightPlanForEntryが「false」
      expect(request.contractPlan.isLightPlanForEntry).toEqual(false)
      // isIntroductionSupportPlanForEntryが「true」
      expect(request.contractPlan.isIntroductionSupportPlanForEntry).toEqual(true)
    })
  })

  describe('isTenantManager', () => {
    test('正常 管理者', async () => {
      // 準備
      // request.userのuserId、tenantIdに正常なUUIDを想定する
      request.user = {
        userId: '12345678-cb0b-48ad-857d-4b42a44ede13',
        tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089'
      }

      // DBから正常なユーザーデータの取得を想定する
      userFindOneSpy.mockReturnValue({
        dataValues: {
          userId: '12345678-cb0b-48ad-857d-4b42a44ede13',
          tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089',
          userRole: 'a6a3edcd-00d9-427c-bf03-4ef0112ba16d',
          appVersion: '0.0.1',
          refreshToken: 'dummyRefreshToken',
          subRefreshToken: null,
          userStatus: 0,
          lastRefreshedAt: null,
          createdAt: '2021-01-25T10:15:15.086Z',
          updatedAt: '2021-01-25T10:15:15.086Z'
        }
      })

      // 試験実施
      await middleware.isTenantManager(request, response, next)

      // 期待結果
      expect(next).toHaveBeenCalledWith()
    })

    test('正常 一般ユーザー', async () => {
      // 準備
      // request.userのuserId、tenantIdに正常なUUIDを想定する
      request.user = {
        userId: '12345678-cb0b-48ad-857d-4b42a44ede13',
        tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089'
      }

      // DBから正常なユーザーデータの取得を想定する
      userFindOneSpy.mockReturnValue({
        dataValues: {
          userId: '12345678-cb0b-48ad-857d-4b42a44ede13',
          tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089',
          userRole: 'fe888fbb-172f-467c-b9ad-efe0720fecf9',
          appVersion: '0.0.1',
          refreshToken: 'dummyRefreshToken',
          subRefreshToken: null,
          userStatus: 0,
          lastRefreshedAt: null,
          createdAt: '2021-01-25T10:15:15.086Z',
          updatedAt: '2021-01-25T10:15:15.086Z'
        }
      })

      // 試験実施
      await middleware.isTenantManager(request, response, next)

      // 期待結果
      expect(next).toHaveBeenCalledWith(noticeHelper.create('generaluser'))
    })

    test('準正常 DBエラー', async () => {
      // 準備
      // request.userのuserId、tenantIdに正常なUUIDを想定する
      request.user = {
        userId: '12345678-cb0b-48ad-857d-4b42a44ede13',
        tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089'
      }

      // DBから正常な契約データの取得を想定する
      contractFindOneSpy.mockReturnValue(new Error('any'))

      // 試験実施
      await middleware.isOnOrChangeContract(request, response, next)

      // 期待結果
      expect(next).toHaveBeenCalledWith(errorHelper.create(500))
    })
  })
})
