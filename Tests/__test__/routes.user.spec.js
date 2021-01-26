'use strict'
jest.mock('../../Application/node_modules/express', () => {
  return require('jest-express')
})

const routesUser = require('../../Application/routes/user')
const Request = require('jest-express').Request
const Response = require('jest-express').Response
const next = require('jest-express').Next
const errorHelper = require('../../Application/routes/helpers/error')
const helper = require('../../Application/routes/helpers/middleware')

if (process.env.LOCALLY_HOSTED === 'true') {
  require('dotenv').config({ path: './config/.env' })
}

let request, response, createSpy, infoSpy
describe('userのテスト', () => {
  beforeEach(() => {
    request = new Request()
    response = new Response()

    // user.jsで使っている内部モジュールの関数をspyOn
    const userController = require('../../Application/controllers/userController.js')
    createSpy = jest.spyOn(userController, 'create')

    const logger = require('../../Application/lib/logger.js')
    infoSpy = jest.spyOn(logger, 'info')
  })
  afterEach(() => {
    request.resetMocked()
    response.resetMocked()
    next.mockReset()
    createSpy.mockRestore()
    infoSpy.mockRestore()
  })

  describe('ルーティング', () => {
    test('userのルーティングを確認', async () => {
      expect(routesUser.router.get).toBeCalledWith('/register', helper.isAuthenticated, expect.any(Function))
      expect(routesUser.router.post).toBeCalledWith('/register', helper.isAuthenticated, expect.any(Function))
    })
  })

  describe('cbGetRegister', () => {
    test('400エラー：セッション内のuserContextがNotUserRegisteredではない場合', async () => {
      request.session = {
        userContext: 'UserRegistered'
      }

      await routesUser.cbGetRegister(request, response, next)

      // 400エラーがエラーハンドリング「される」
      expect(next).toHaveBeenCalledWith(errorHelper.create(400))

      // 利用登録がレンダー「されない」
      expect(response.render).not.toHaveBeenCalledWith('user-register', { title: '利用登録' })
    })

    test('正常：セッション内のuserContextがNotUserRegisteredの場合', async () => {
      request.session = {
        userContext: 'NotUserRegistered'
      }
      await routesUser.cbGetRegister(request, response, next)

      // 400エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(400))

      // 利用登録がレンダー「される」
      expect(response.render).toHaveBeenCalledWith('user-register', { title: '利用登録' })
    })
  })
  describe('cbPostRegister', () => {
    test('400エラー：セッション内のuserContextがNotUserRegisteredではない場合', async () => {
      request.session = {
        userContext: 'UserRegistered'
      }

      await routesUser.cbPostRegister(request, response, next)

      // 400エラーがエラーハンドリング「される」
      expect(next).toHaveBeenCalledWith(errorHelper.create(400))

      // 登録成功時のログが呼ばれ「ない」
      expect(infoSpy).not.toHaveBeenCalled()

      // ポータルにリダイレクト「されない」
      expect(response.redirect).not.toHaveBeenCalledWith('/portal')
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
      await routesUser.cbPostRegister(request, response, next)

      // 500エラーがエラーハンドリング「される」
      expect(next).toHaveBeenCalledWith(errorHelper.create(500))

      // 登録成功時のログが呼ばれ「ない」
      expect(infoSpy).not.toHaveBeenCalled()

      // ポータルにリダイレクト「されない」
      expect(response.redirect).not.toHaveBeenCalledWith('/portal')
      expect(response.getHeader('Location')).not.toEqual('/portal')
    })

    test('500エラー：データベースエラーが発生した場合', async () => {
      request.session = {
        userContext: 'NotUserRegistered'
      }
      request.user = {
        tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089',
        userId: '976d46d7-cb0b-48ad-857d-4b42a44ede13',
        accessToken: 'dummyAccessToken',
        refreshToken: 'dummyRefreshToken'
      }
      // データベースエラー
      createSpy.mockReturnValue(new Error('DB error mock'))

      await routesUser.cbPostRegister(request, response, next)

      // 500エラーがエラーハンドリング「される」
      expect(next).toHaveBeenCalledWith(errorHelper.create(500))

      // 登録成功時のログが呼ばれ「ない」
      expect(infoSpy).not.toHaveBeenCalled()

      // ポータルにリダイレクト「されない」
      expect(response.redirect).not.toHaveBeenCalledWith('/portal')
      expect(response.getHeader('Location')).not.toEqual('/portal')
    })

    test('500エラー：createの呼び出しにユーザが見つからない場合（null）の場合', async () => {
      request.session = {
        userContext: 'NotUserRegistered'
      }
      request.user = {
        tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089',
        userId: '976d46d7-cb0b-48ad-857d-4b42a44ede13',
        accessToken: 'dummyAccessToken',
        refreshToken: 'dummyRefreshToken'
      }
      // ユーザが見つからない場合
      createSpy.mockReturnValue(null)

      await routesUser.cbPostRegister(request, response, next)

      // 500エラーがエラーハンドリング「される」
      expect(next).toHaveBeenCalledWith(errorHelper.create(500))

      // 登録成功時のログが呼ばれ「ない」
      expect(infoSpy).not.toHaveBeenCalled()

      // ポータルにリダイレクト「されない」
      expect(response.redirect).not.toHaveBeenCalledWith('/portal')
      expect(response.getHeader('Location')).not.toEqual('/portal')
    })

    test('500エラー：作られたUserが配列データではない場合', async () => {
      request.session = {
        userContext: 'NotUserRegistered'
      }
      request.user = {
        tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089',
        userId: '976d46d7-cb0b-48ad-857d-4b42a44ede13',
        accessToken: 'dummyAccessToken',
        refreshToken: 'dummyRefreshToken'
      }
      createSpy.mockReturnValue(() => {
        return {
          userId: '976d46d7-cb0b-48ad-857d-4b42a44ede13',
          tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089',
          userRole: 'a6a3edcd-00d9-427c-bf03-4ef0112ba16d',
          appVersion: '0.0.1',
          refreshToken: 'dummyRefreshToken',
          userStatus: 0
        }
      })
      await routesUser.cbPostRegister(request, response, next)

      // 500エラーがエラーハンドリング「される」
      expect(next).toHaveBeenCalledWith(errorHelper.create(500))

      // 登録成功時のログが呼ばれ「ない」
      expect(infoSpy).not.toHaveBeenCalled()

      // ポータルにリダイレクト「されない」
      expect(response.redirect).not.toHaveBeenCalledWith('/portal')
      expect(response.getHeader('Location')).not.toEqual('/portal')
    })

    test('400エラー：作られたUserの配列データ2つ目がfalseの場合', async () => {
      request.session = {
        userContext: 'NotUserRegistered'
      }
      request.user = {
        tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089',
        userId: '976d46d7-cb0b-48ad-857d-4b42a44ede13',
        accessToken: 'dummyAccessToken',
        refreshToken: 'dummyRefreshToken'
      }
      createSpy.mockReturnValue([
        {
          userId: '976d46d7-cb0b-48ad-857d-4b42a44ede13',
          tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089',
          userRole: 'a6a3edcd-00d9-427c-bf03-4ef0112ba16d',
          appVersion: '0.0.1',
          refreshToken: 'dummyRefreshToken',
          userStatus: 0
        },
        false
      ])
      await routesUser.cbPostRegister(request, response, next)

      // 指定のエラーを返す
      const expectError = new Error('データが二重送信された可能性があります。')
      expectError.name = 'Bad Request'
      expectError.status = 400
      expectError.desc = '既にご利用のユーザーの登録は完了しています。'
      expect(next).toHaveBeenCalledWith(expectError)

      // 登録成功時のログが呼ばれ「ない」
      expect(infoSpy).not.toHaveBeenCalled()

      // ポータルにリダイレクト「されない」
      expect(response.redirect).not.toHaveBeenCalledWith('/portal')
      expect(response.getHeader('Location')).not.toEqual('/portal')
    })

    test('500エラー：リクエストとcreateされたuserIdが異なる場合', async () => {
      request.session = {
        userContext: 'NotUserRegistered'
      }
      request.user = {
        tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089',
        userId: '976d46d7-cb0b-48ad-857d-4b42a44ede13',
        accessToken: 'dummyAccessToken',
        refreshToken: 'dummyRefreshToken'
      }
      createSpy.mockReturnValue(() => {
        return [
          {
            userId: '12345678-cb0b-48ad-857d-4b42a44ede13',
            tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089',
            userRole: 'a6a3edcd-00d9-427c-bf03-4ef0112ba16d',
            appVersion: '0.0.1',
            refreshToken: 'dummyRefreshToken',
            userStatus: 0
          },
          true
        ]
      })
      await routesUser.cbPostRegister(request, response, next)

      // 500エラーがエラーハンドリング「される」
      expect(next).toHaveBeenCalledWith(errorHelper.create(500))

      // 登録成功時のログが呼ばれ「ない」
      expect(infoSpy).not.toHaveBeenCalled()

      // ポータルにリダイレクト「されない」
      expect(response.redirect).not.toHaveBeenCalledWith('/portal')
      expect(response.getHeader('Location')).not.toEqual('/portal')
    })

    test('正常時', async () => {
      request.session = {
        userContext: 'NotUserRegistered'
      }
      request.user = {
        tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089',
        userId: '976d46d7-cb0b-48ad-857d-4b42a44ede13',
        accessToken: 'dummyAccessToken',
        refreshToken: 'dummyRefreshToken'
      }
      createSpy.mockReturnValue(() => {
        const temp = [
          {
            userId: '976d46d7-cb0b-48ad-857d-4b42a44ede13',
            tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089',
            userRole: 'a6a3edcd-00d9-427c-bf03-4ef0112ba16d',
            appVersion: '0.0.1',
            refreshToken: 'dummyRefreshToken',
            userStatus: 0
          },
          true
        ]
        return temp
      })
      await routesUser.cbPostRegister(request, response, next)

      // 400,500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(400))
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(500))

      // 登録成功のログが出力されている
      expect(infoSpy).toHaveBeenCalled()
      // expect(infoSpy).toHaveBeenCalledWith(
      //  { tenant: req.user.tenantId, user: req.user.userId },
      //  'User Registration Succeeded'
      // )

      // requets.session.userContextが'UserRegistrationCompleted'に変わっている
      // expect(requets.session.userContext).toBe('UserRegistrationCompleted')

      // flashが呼ばれている
      expect(request.flash).toHaveBeenCalled()
      expect(request.flash).toHaveBeenCalledWith('info', '利用登録が完了いたしました。')

      // ポータルにリダイレクト「される」
      expect(response.redirect).toHaveBeenCalledWith('/portal')
      expect(response.getHeader('Location')).toEqual('/portal')
    })
  })
})
