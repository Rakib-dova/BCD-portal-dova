'use strict'
jest.mock('../../Application/node_modules/express', () => {
  return require('jest-express')
})
jest.mock('../../Application/controllers/userController.js', () => ({
  create: (accessToken, refreshToken) => {
    return null
  }
}))

const routesUser = require('../../Application/routes/user')
const Request = require('jest-express').Request
const Response = require('jest-express').Response
const next = require('jest-express').Next
const errorHelper = require('../../Application/routes/helpers/error')
const helper = require('../../Application/routes/helpers/middleware')
const tenantController = require('../../Application/controllers/tenantController')
const userController = require('../../Application/controllers/userController.js')
const logger = require('../../Application/lib/logger.js')

if (process.env.LOCALLY_HOSTED === 'true') {
  require('dotenv').config({ path: './config/.env' })
}

let request, response, createSpy, infoSpy, findOneSpy
describe('userのテスト', () => {
  beforeEach(() => {
    request = new Request()
    response = new Response()

    // user.jsで使っている内部モジュールの関数をspyOn
    createSpy = jest.spyOn(userController, 'create')
    findOneSpy = jest.spyOn(tenantController, 'findOne')
    infoSpy = jest.spyOn(logger, 'info')
  })
  afterEach(() => {
    request.resetMocked()
    response.resetMocked()
    next.mockReset()
    createSpy.mockRestore()
    findOneSpy.mockRestore()
    infoSpy.mockRestore()
  })

  describe('ルーティング', () => {
    test('userのルーティングを確認', async () => {
      expect(routesUser.router.get).toBeCalledWith('/register', helper.isAuthenticated, routesUser.cbGetRegister)
      expect(routesUser.router.post).toBeCalledWith('/register', routesUser.cbPostRegister)
      expect(routesUser.router.get).toBeCalledWith(
        '/delete',
        helper.isAuthenticated,
        helper.isTenantRegistered,
        helper.isUserRegistered,
        routesUser.cbGetDelete
      )
    })
  })

  describe('cbGetRegister', () => {
    test('正常：セッション内のuserContextがNotUserRegisteredの場合', async () => {
      // 準備
      // session.userContextに正常値(NotUserRegistered)を想定する
      request.session = {
        userContext: 'NotUserRegistered'
      }

      // 試験実施
      await routesUser.cbGetRegister(request, response, next)

      // 期待結果
      // 400エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(400))
      // response.renderで利用登録が呼ばれ「る」
      expect(response.render).toHaveBeenCalledWith('user-register', { title: '利用登録' })
    })

    test('400エラー：セッション内のuserContextがNotUserRegisteredではない場合', async () => {
      // 準備
      // session.userContextに異常値(NotUserRegistered「以外」)を想定する
      request.session = {
        userContext: 'dummy'
      }

      // 試験実施
      await routesUser.cbGetRegister(request, response, next)

      // 期待結果
      // 400エラーがエラーハンドリング「される」
      expect(next).toHaveBeenCalledWith(errorHelper.create(400))
      // response.renderが呼ばれ「ない」
      expect(response.render).not.toHaveBeenCalled()
    })
  })

  describe('cbPostRegister', () => {
    test('正常', async () => {
      // 準備
      // session.userContextに正常値(NotUserRegistered)を想定する
      request.session = {
        userContext: 'NotUserRegistered'
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
      // DBから正常なテナントデータの取得を想定する
      findOneSpy.mockReturnValue({
        tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089',
        registeredBy: '976d46d7-cb0b-48ad-857d-4b42a44ede13',
        customerId: null,
        createdAt: '2021-01-25T10:15:15.035Z',
        updatedAt: '2021-01-25T10:15:15.035Z'
      })
      // DBから正常なユーザデータの取得を想定する
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

      // 試験実施
      await routesUser.cbPostRegister(request, response, next)

      // 期待結果
      // 400,500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(400))
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(500))
      // 登録成功のログが出力されている
      expect(infoSpy).toHaveBeenCalledWith(
        { tenant: request.user.tenantId, user: request.user.userId },
        'User Registration Succeeded'
      )
      // request.session.userContextが'UserRegistrationCompleted'に変わっている
      expect(request.session.userContext).toBe('UserRegistrationCompleted')
      // flashが呼ばれている
      expect(request.flash).toHaveBeenCalledWith('info', '利用登録が完了いたしました。')
      // ポータルにリダイレクト「される」
      expect(response.redirect).toHaveBeenCalledWith(303, '/portal')
      expect(response.getHeader('Location')).toEqual('/portal')
    })

    test('400エラー：セッション内のuserContextがNotUserRegisteredではない場合', async () => {
      // 準備
      // session.userContextに異常値(NotUserRegistered「以外」)を想定する
      request.session = {
        userContext: 'dummy'
      }

      // 試験実施
      await routesUser.cbPostRegister(request, response, next)

      // 期待結果
      // 400エラーがエラーハンドリング「される」
      expect(next).toHaveBeenCalledWith(errorHelper.create(400))
      // 登録成功時のログが呼ばれ「ない」
      expect(infoSpy).not.toHaveBeenCalled()
      // ポータルにリダイレクト「されない」
      expect(response.redirect).not.toHaveBeenCalledWith(303, '/portal')
      expect(response.getHeader('Location')).not.toEqual('/portal')
    })

    test('500エラー：セッション内のuserのToken情報がnullの場合', async () => {
      request.session = {
        userContext: 'NotUserRegistered'
      }
      request.user = {
        tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089',
        userId: '976d46d7-cb0b-48ad-857d-4b42a44ede13',
        accessToken: null,
        refreshToken: null
      }

      // 試験実施
      await routesUser.cbPostRegister(request, response, next)

      // 期待結果
      // 500エラーがエラーハンドリング「される」
      expect(next).toHaveBeenCalledWith(errorHelper.create(500))
      // 登録成功時のログが呼ばれ「ない」
      expect(infoSpy).not.toHaveBeenCalled()
      // ポータルにリダイレクト「されない」
      expect(response.redirect).not.toHaveBeenCalledWith(303, '/portal')
      expect(response.getHeader('Location')).not.toEqual('/portal')
    })

    test('500エラー：tenant取得ができない(null)場合', async () => {
      // 準備
      // session.userContextに正常値(NotUserRegistered)を想定する
      request.session = {
        userContext: 'NotUserRegistered'
      }
      // request.userに正常値を想定する
      request.user = {
        tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089',
        userId: '976d46d7-cb0b-48ad-857d-4b42a44ede13',
        accessToken: 'dummyAccessToken',
        refreshToken: 'dummyRefreshToken'
      }
      // DBからのテナントデータ取得ができなかった場合を想定する
      findOneSpy.mockReturnValue(null)

      // 試験実施
      await routesUser.cbPostRegister(request, response, next)

      // 期待結果
      // 500エラーがエラーハンドリング「される」
      expect(next).toHaveBeenCalledWith(errorHelper.create(500))
      // 登録成功時のログが呼ばれ「ない」
      expect(infoSpy).not.toHaveBeenCalled()
      // ポータルにリダイレクト「されない」
      expect(response.redirect).not.toHaveBeenCalledWith(303, '/portal')
      expect(response.getHeader('Location')).not.toEqual('/portal')
    })

    test('500エラー：データベースエラーが発生した場合', async () => {
      // 準備
      // session.userContextに正常値(NotUserRegistered)を想定する
      request.session = {
        userContext: 'NotUserRegistered'
      }
      // request.userに正常値を想定する
      request.user = {
        tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089',
        userId: '976d46d7-cb0b-48ad-857d-4b42a44ede13',
        accessToken: 'dummyAccessToken',
        refreshToken: 'dummyRefreshToken'
      }
      // DBから正常なテナントデータの取得を想定する
      findOneSpy.mockReturnValue({
        tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089',
        registeredBy: '976d46d7-cb0b-48ad-857d-4b42a44ede13',
        customerId: null,
        createdAt: '2021-01-25T10:15:15.035Z',
        updatedAt: '2021-01-25T10:15:15.035Z'
      })
      // DBからのユーザデータ取得時にエラーを想定する
      createSpy.mockReturnValue(new Error('DB error mock'))

      // 試験実施
      await routesUser.cbPostRegister(request, response, next)

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
      // session.userContextに正常値(NotUserRegistered)を想定する
      request.session = {
        userContext: 'NotUserRegistered'
      }
      // request.userに正常値を想定する
      request.user = {
        tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089',
        userId: '976d46d7-cb0b-48ad-857d-4b42a44ede13',
        accessToken: 'dummyAccessToken',
        refreshToken: 'dummyRefreshToken'
      }
      // DBから正常なテナントデータの取得を想定する
      findOneSpy.mockReturnValue({
        tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089',
        registeredBy: '976d46d7-cb0b-48ad-857d-4b42a44ede13',
        customerId: null,
        createdAt: '2021-01-25T10:15:15.035Z',
        updatedAt: '2021-01-25T10:15:15.035Z'
      })
      // DBからのユーザデータ取得ができなかった場合を想定する
      createSpy.mockReturnValue(null)

      // 試験実施
      await routesUser.cbPostRegister(request, response, next)

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
      // session.userContextに正常値(NotUserRegistered)を想定する
      request.session = {
        userContext: 'NotUserRegistered'
      }
      // request.userに正常値を想定する
      request.user = {
        tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089',
        userId: '976d46d7-cb0b-48ad-857d-4b42a44ede13',
        accessToken: 'dummyAccessToken',
        refreshToken: 'dummyRefreshToken'
      }
      // DBから正常なテナントデータの取得を想定する
      findOneSpy.mockReturnValue({
        tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089',
        registeredBy: '976d46d7-cb0b-48ad-857d-4b42a44ede13',
        customerId: null,
        createdAt: '2021-01-25T10:15:15.035Z',
        updatedAt: '2021-01-25T10:15:15.035Z'
      })
      // DBからの取得ユーザデータが配列ではない場合を想定する
      createSpy.mockReturnValue({
        userId: '976d46d7-cb0b-48ad-857d-4b42a44ede13',
        tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089',
        userRole: 'a6a3edcd-00d9-427c-bf03-4ef0112ba16d',
        appVersion: '0.0.1',
        refreshToken: 'dummyRefreshToken',
        userStatus: 0
      })

      // 試験実施
      await routesUser.cbPostRegister(request, response, next)

      // 期待結果
      // 500エラーがエラーハンドリング「される」
      expect(next).toHaveBeenCalledWith(errorHelper.create(500))
      // 登録成功時のログが呼ばれ「ない」
      expect(infoSpy).not.toHaveBeenCalled()
      // ポータルにリダイレクト「されない」
      expect(response.redirect).not.toHaveBeenCalledWith(303, '/portal')
      expect(response.getHeader('Location')).not.toEqual('/portal')
    })

    test('400エラー：作られたUserの配列データ2つ目がfalseの場合', async () => {
      // 準備
      // session.userContextに正常値(NotUserRegistered)を想定する
      request.session = {
        userContext: 'NotUserRegistered'
      }
      // request.userに正常値を想定する
      request.user = {
        tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089',
        userId: '976d46d7-cb0b-48ad-857d-4b42a44ede13',
        accessToken: 'dummyAccessToken',
        refreshToken: 'dummyRefreshToken'
      }
      // DBから正常なテナントデータの取得を想定する
      findOneSpy.mockReturnValue({
        tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089',
        registeredBy: '976d46d7-cb0b-48ad-857d-4b42a44ede13',
        customerId: null,
        createdAt: '2021-01-25T10:15:15.035Z',
        updatedAt: '2021-01-25T10:15:15.035Z'
      })
      // DBからの取得したユーザデータの配列2つ目がfalseの場合を想定する
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
        false
      ])

      // 試験実施
      await routesUser.cbPostRegister(request, response, next)

      // 期待結果
      // 指定の400エラーを返す
      const expectError = new Error('データが二重送信された可能性があります。')
      expectError.name = 'Bad Request'
      expectError.status = 400
      expectError.desc = '既にご利用のユーザーの登録は完了しています。'
      expect(next).toHaveBeenCalledWith(expectError)
      // 登録成功時のログが呼ばれ「ない」
      expect(infoSpy).not.toHaveBeenCalled()
      // ポータルにリダイレクト「されない」
      expect(response.redirect).not.toHaveBeenCalledWith(303, '/portal')
      expect(response.getHeader('Location')).not.toEqual('/portal')
    })

    test('500エラー：リクエストとcreateされたuserIdが異なる場合', async () => {
      // 準備
      // session.userContextに正常値(NotUserRegistered)を想定する
      request.session = {
        userContext: 'NotUserRegistered'
      }
      // request.userに正常値を想定する
      request.user = {
        tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089',
        userId: '976d46d7-cb0b-48ad-857d-4b42a44ede13',
        accessToken: 'dummyAccessToken',
        refreshToken: 'dummyRefreshToken'
      }
      // DBから正常なテナントデータの取得を想定する
      findOneSpy.mockReturnValue({
        tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089',
        registeredBy: '976d46d7-cb0b-48ad-857d-4b42a44ede13',
        customerId: null,
        createdAt: '2021-01-25T10:15:15.035Z',
        updatedAt: '2021-01-25T10:15:15.035Z'
      })
      // DBからの取得ユーザデータのuserIdがrequestのuserIdと異なる場合を想定する
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
      await routesUser.cbPostRegister(request, response, next)

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
