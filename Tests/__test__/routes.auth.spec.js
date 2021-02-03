'use strict'
jest.mock('../../Application/node_modules/express', () => {
  return require('jest-express')
})
jest.mock('../../Application/controllers/userController.js', () => ({
  findAndUpdate: (userId, accessToken, refreshToken) => {
    return null
  }
}))

const auth = require('../../Application/routes/auth')
const Request = require('jest-express').Request
const Response = require('jest-express').Response
const next = require('jest-express').Next

const errorHelper = require('../../Application/routes/helpers/error')

if (process.env.LOCALLY_HOSTED === 'true') {
  require('dotenv').config({ path: './config/.env' })
}
let request, response, findAndUpdateSpy, infoSpy
describe('authのテスト', () => {
  beforeEach(() => {
    request = new Request()
    response = new Response()

    // auth.jsで使っている内部モジュールの関数をspyOn
    const userController = require('../../Application/controllers/userController.js')
    findAndUpdateSpy = jest.spyOn(userController, 'findAndUpdate')

    const logger = require('../../Application/lib/logger.js')
    infoSpy = jest.spyOn(logger, 'info')
  })
  afterEach(() => {
    request.resetMocked()
    response.resetMocked()
    next.mockReset()

    findAndUpdateSpy.mockRestore()
    infoSpy.mockRestore()
  })

  describe('ルーティング', () => {
    test('authのルーティングを確認', async () => {
      expect(auth.router.get).toBeCalledWith('/', expect.any(Function))
      expect(auth.router.get).toBeCalledWith('/callback', expect.any(Function), auth.cbGetCallback)
      expect(auth.router.get).toBeCalledWith('/failure', auth.cbGetFailure)
    })
  })

  describe('コールバック cbGetCallback', () => {
    test('正常：userController.findAndUpdateの呼び出しにユーザが見つからない場合（null）', async () => {
      // 準備
      // request.userには正常値を想定する
      request.user = {
        tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089',
        userId: '976d46d7-cb0b-48ad-857d-4b42a44ede13',
        accessToken: 'dummyAccessToken',
        refreshToken: 'dummyRefreshToken'
      }
      // DBからのユーザが見つからない場合を想定する
      findAndUpdateSpy.mockReturnValue(null)

      // 試験実施
      await auth.cbGetCallback(request, response, next)

      // 期待結果
      // 500エラーがエラーハンドリングされ「ない」
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(500))
      // 認証成功のログが出力されている
      expect(infoSpy).toHaveBeenCalledWith(
        { tenant: request.user.tenantId, user: request.user.userId },
        'Tradeshift Authentication Succeeded'
      )
      // ポータルにリダイレクトされ「る」
      expect(response.redirect).toHaveBeenCalledWith(303, '/portal')
      expect(response.getHeader('Location')).toEqual('/portal')
    })

    test('正常：userController.findAndUpdateの呼び出しにユーザが見つかった場合', async () => {
      // 準備
      // request.userには正常値を想定する
      request.user = {
        tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089',
        userId: '976d46d7-cb0b-48ad-857d-4b42a44ede13',
        accessToken: 'dummyAccessToken',
        refreshToken: 'dummyRefreshToken'
      }
      // DBからの正常なユーザデータ取得を想定する
      findAndUpdateSpy.mockReturnValue(() => {
        return {
          userId: '976d46d7-cb0b-48ad-857d-4b42a44ede13',
          tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089',
          userRole: 'a6a3edcd-00d9-427c-bf03-4ef0112ba16d',
          appVersion: '0.0.1',
          refreshToken: 'dummyRefreshToken',
          subRefreshToken: 'dummyRefreshToken',
          userStatus: 0
        }
      })

      // 試験実施
      await auth.cbGetCallback(request, response, next)

      // 期待結果
      // 500エラーがエラーハンドリングされ「ない」
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(500))
      // 認証成功のINFOログが呼ばれ「る」
      expect(infoSpy).toHaveBeenCalledWith(
        { tenant: request.user.tenantId, user: request.user.userId },
        'Tradeshift Authentication Succeeded'
      )
      // ポータルにリダイレクトされ「る」
      expect(response.redirect).toHaveBeenCalledWith(303, '/portal')
      expect(response.getHeader('Location')).toEqual('/portal')
    })

    test('500エラー：セッション内のユーザ情報(req.user)に何も入っていない', async () => {
      // 準備
      // userを意図的に用意しない

      // 試験実施
      await auth.cbGetCallback(request, response, next)

      // 期待結果
      // 500エラーがエラーハンドリングされ「る」
      expect(next).toHaveBeenCalledWith(errorHelper.create(500))
      // INFOログが呼ばれ「ない」
      expect(infoSpy).not.toHaveBeenCalled()
      // ポータルにリダイレクトされ「ない」
      expect(response.redirect).not.toHaveBeenCalledWith(303, '/portal')
      expect(response.getHeader('Location')).not.toEqual('/portal')
    })

    test('500エラー：userController.findAndUpdateの呼び出しにデータベースエラー発生', async () => {
      // 準備
      // request.userには正常値を想定する
      request.user = {
        tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089',
        userId: '976d46d7-cb0b-48ad-857d-4b42a44ede13',
        accessToken: 'dummyAccessToken',
        refreshToken: 'dummyRefreshToken'
      }
      // DBからの応答がエラーの場合を想定する
      findAndUpdateSpy.mockReturnValue(new Error('DB error mock'))

      // 試験実施
      await auth.cbGetCallback(request, response, next)

      // 期待結果
      // 500エラーがエラーハンドリングされ「る」
      expect(next).toHaveBeenCalledWith(errorHelper.create(500))
      // INFOログが呼ばれ「ない」
      expect(infoSpy).not.toHaveBeenCalled()
      // ポータルにリダイレクトされ「ない」
      expect(response.redirect).not.toHaveBeenCalledWith(303, '/portal')
      expect(response.getHeader('Location')).not.toEqual('/portal')
    })
  })

  describe('コールバック cbGetFailure', () => {
    test('正常：500エラーを返す', async () => {
      // 準備
      // なし

      // 試験実施
      await auth.cbGetFailure(request, response, next)

      // 期待結果
      // 500エラーがエラーハンドリングされ「る」
      expect(next).toHaveBeenCalledWith(errorHelper.create(500))
    })
  })
})
