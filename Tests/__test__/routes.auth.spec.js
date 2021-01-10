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
      expect(auth.router.get).toBeCalledWith('/callback', expect.any(Function), expect.any(Function))
      expect(auth.router.get).toBeCalledWith('/failure', expect.any(Function))
    })
  })
  describe('コールバック cbGetCallback', () => {
    test('500エラー：セッション内のユーザ情報(req.user)に何も入っていない', async () => {
      await auth.cbGetCallback(request, response, next)

      // 500エラーがエラーハンドリングされる
      expect(next).toHaveBeenCalledWith(errorHelper.create(500))

      // 認証成功のログが出力「されない」
      expect(infoSpy).not.toHaveBeenCalled()

      // ポータルにリダイレクト「されない」
      expect(response.redirect).not.toHaveBeenCalledWith('/portal')
      expect(response.getHeader('Location')).not.toEqual('/portal')
    })

    test('500エラー：userController.findAndUpdateの呼び出しにデータベースエラー発生', async () => {
      request.user = {
        tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089',
        userId: '976d46d7-cb0b-48ad-857d-4b42a44ede13',
        accessToken: 'dummyAccessToken',
        refreshToken: 'dummyRefreshToken'
      }

      findAndUpdateSpy.mockReturnValue(new Error('DB error mock'))

      await auth.cbGetCallback(request, response, next)

      // 500エラーがエラーハンドリングされる
      expect(next).toHaveBeenCalledWith(errorHelper.create(500))

      // 認証成功のログが出力「されない」
      expect(infoSpy).not.toHaveBeenCalled()

      // ポータルにリダイレクト「されない」
      expect(response.redirect).not.toHaveBeenCalledWith('/portal')
      expect(response.getHeader('Location')).not.toEqual('/portal')
    })

    test('正常：userController.findAndUpdateの呼び出しにユーザが見つからない場合（null）', async () => {
      request.user = {
        tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089',
        userId: '976d46d7-cb0b-48ad-857d-4b42a44ede13',
        accessToken: 'dummyAccessToken',
        refreshToken: 'dummyRefreshToken'
      }

      findAndUpdateSpy.mockReturnValue(null)

      await auth.cbGetCallback(request, response, next)

      // 500エラーではない
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(500))

      // 認証成功のログが出力されている
      expect(infoSpy).toHaveBeenCalled()
      expect(infoSpy).toHaveBeenCalledWith(
        { tenant: request.user.tenantId, user: request.user.userId },
        'Tradeshift Authentication Succeeded'
      )
      // ポータルにリダイレクト
      expect(response.redirect).toHaveBeenCalledWith('/portal')
      expect(response.getHeader('Location')).toEqual('/portal')
    })

    test('正常：userController.findAndUpdateの呼び出しにユーザが見つかった場合', async () => {})
  })
})
