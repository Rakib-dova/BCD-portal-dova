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
  findOne: (userId) => {
    return null
  }
}))

const middleware = require('../../Application/routes/helpers/middleware')
const Request = require('jest-express').Request
const Response = require('jest-express').Response
const next = require('jest-express').Next
const errorHelper = require('../../Application/routes/helpers/error')
const tenantController = require('../../Application/controllers/tenantController.js')
const userController = require('../../Application/controllers/userController.js')

if (process.env.LOCALLY_HOSTED === 'true') {
  // NODE_ENVはJestがデフォルトでtestに指定する。dotenvで上書きできなかったため、package.jsonの実行引数でdevelopmentを指定
  require('dotenv').config({ path: './config/.env' })
}
let request, response, tenantFindOneSpy, userFindOneSpy
describe('helpers/middlewareのテスト', () => {
  beforeEach(() => {
    request = new Request()
    response = new Response()
    tenantFindOneSpy = jest.spyOn(tenantController, 'findOne')
    userFindOneSpy = jest.spyOn(userController, 'findOne')
  })
  afterEach(() => {
    request.resetMocked()
    response.resetMocked()
    next.mockReset()
    tenantFindOneSpy.mockRestore()
    userFindOneSpy.mockRestore()
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
      // 引数なしでnextが呼ばれ「る」
      expect(next).toHaveBeenCalledWith()
      // 303エラーでauthに飛ばされ「ない」
      expect(response.redirect).not.toHaveBeenCalledWith(303, '/auth')
      expect(response.getHeader('Location')).not.toEqual('/auth')
      // 500エラーがエラーハンドリングされ「ない」
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(500))
      // request.session.userContextが'NotUserRegistered'になってい「ない」
      expect(request.session.userContext).not.toBe('NotUserRegistered')
      // 303エラーで/user/registerに飛ばされ「ない」
      expect(response.redirect).not.toHaveBeenCalledWith(303, '/user/register')
      expect(response.getHeader('Location')).not.toEqual('/user/register')
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
        userId: '12345678-cb0b-48ad-857d-4b42a44ede13'
      }
      // DBからユーザデータ取得時のエラーを想定する
      userFindOneSpy.mockReturnValue(new Error('DB error mock'))

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

    test('303エラー: DBからuserが見つからない場合', async () => {
      // 準備
      // request.userのuserIdに正常なUUIDを想定する
      request.user = {
        userId: '12345678-cb0b-48ad-857d-4b42a44ede13'
      }
      // userContextに値が取れていることを想定する
      request.session = {
        userContext: 'dummy'
      }
      // DBからユーザデータの取得ができなかった場合を想定する
      userFindOneSpy.mockReturnValue(null)

      // 試験実施
      await middleware.isUserRegistered(request, response, next)

      // 期待結果
      // 引数なしでnextが呼ばれ「ない」
      expect(next).not.toHaveBeenCalledWith()
      // 303エラーでauthに飛ばされ「ない」
      expect(response.redirect).not.toHaveBeenCalledWith(303, '/auth')
      expect(response.getHeader('Location')).not.toEqual('/auth')
      // 500エラーがエラーハンドリングされ「ない」
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(500))
      // request.session.userContextが'NotUserRegistered'になっている
      expect(request.session.userContext).toBe('NotUserRegistered')
      // 303エラーで/user/registerに飛ばされ「る」
      expect(response.redirect).toHaveBeenCalledWith(303, '/user/register')
      expect(response.getHeader('Location')).toEqual('/user/register')
    })

    test('500エラー: DBから取得したuserデータがdataValuesに入っていない場合', async () => {
      // 準備
      // request.userのuserIdに正常なUUIDを想定する
      request.user = {
        userId: '12345678-cb0b-48ad-857d-4b42a44ede13'
      }
      // userContextに値が取れていることを想定する
      request.session = {
        userContext: 'dummy'
      }
      // DBから取得したユーザデータがdataValuesに入っていない場合を想定する
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
      // request.session.userContextが'NotUserRegistered'になってい「ない」
      expect(request.session.userContext).not.toBe('NotUserRegistered')
      // 303エラーで/user/registerに飛ばされ「ない」
      expect(response.redirect).not.toHaveBeenCalledWith(303, '/user/register')
      expect(response.getHeader('Location')).not.toEqual('/user/register')
    })
  })
})
