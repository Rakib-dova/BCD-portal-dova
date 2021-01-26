'use strict'
jest.mock('../../Application/node_modules/express', () => {
  return require('jest-express')
})
const portal = require('../../Application/routes/portal')
const Request = require('jest-express').Request
const Response = require('jest-express').Response
const next = require('jest-express').Next
const helper = require('../../Application/routes/helpers/middleware')
const errorHelper = require('../../Application/routes/helpers/error')

if (process.env.LOCALLY_HOSTED === 'true') {
  require('dotenv').config({ path: './config/.env' })
}
let request, response, infoSpy
describe('portalのテスト', () => {
  beforeEach(() => {
    request = new Request()
    response = new Response()
    const logger = require('../../Application/lib/logger.js')
    infoSpy = jest.spyOn(logger, 'info')
  })
  afterEach(() => {
    request.resetMocked()
    response.resetMocked()
    next.mockReset()
    infoSpy.mockRestore()
  })

  describe('ルーティング', () => {
    test('portalのルーティングを確認', async () => {
      expect(portal.router.get).toBeCalledWith(
        '/',
        helper.isAuthenticated,
        helper.isTenantRegistered,
        helper.isUserRegistered,
        portal.cbGetIndex
      )
    })
  })

  describe('コールバック:cbGetIndex', () => {
    test('500エラー：セッションとuserIdがnullの場合', async () => {
      request.session = null
      request.user = {
        userId: null
      }
      await portal.cbGetIndex(request, response, next)

      // 500エラーがエラーハンドリング「される」
      expect(next).toHaveBeenCalledWith(errorHelper.create(500))

      // userContextがLoggedInになって「いない」
      expect(request.session?.userContext).not.toBe('LoggedIn')

      // portalがレンダー「されない」
      expect(response.render).not.toHaveBeenCalledWith('portal', expect.anything())
    })

    test('500エラー：セッションがnull、userIdが正常の場合', async () => {
      request.session = null
      request.user = {
        userId: '976d46d7-cb0b-48ad-857d-4b42a44ede13'
      }
      await portal.cbGetIndex(request, response, next)

      // 500エラーがエラーハンドリング「される」
      expect(next).toHaveBeenCalledWith(errorHelper.create(500))

      // userContextがLoggedInになって「いない」
      expect(request.session?.userContext).not.toBe('LoggedIn')

      // portalがレンダー「されない」
      expect(response.render).not.toHaveBeenCalledWith('portal', expect.anything())
    })

    test('500エラー：セッションが正常、userIdがnullの場合', async () => {
      request.session = {
        userContext: 'NotLoggedIn'
      }
      request.user = {
        userId: null
      }
      await portal.cbGetIndex(request, response, next)

      // 500エラーがエラーハンドリング「される」
      expect(next).toHaveBeenCalledWith(errorHelper.create(500))

      // userContextがLoggedInになって「いない」
      expect(request.session?.userContext).not.toBe('LoggedIn')

      // portalがレンダー「されない」
      expect(response.render).not.toHaveBeenCalledWith('portal', expect.anything())
    })

    test('正常：セッション,userIdが正常な場合', async () => {
      request.session = {
        userContext: 'NotLoggedIn'
      }
      request.user = {
        userId: '976d46d7-cb0b-48ad-857d-4b42a44ede13'
      }
      await portal.cbGetIndex(request, response, next)

      // 500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(500))

      // userContextがLoggedInになって「いる」
      expect(request.session?.userContext).toBe('LoggedIn')

      // portalがレンダー「される」
      expect(response.render).toHaveBeenCalledWith('portal', {
        title: 'ポータル',
        customerId: request.user.userId,
        TS_HOST: process.env.TS_HOST
      })
    })
  })
})
