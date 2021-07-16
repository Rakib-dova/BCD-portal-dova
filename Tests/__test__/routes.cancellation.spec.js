'use strict'
jest.mock('../../Application/node_modules/express', () => {
  return require('jest-express')
})
const cancellation = require('../../Application/routes/cancellation')
const Request = require('jest-express').Request
const Response = require('jest-express').Response
const next = require('jest-express').Next
const errorHelper = require('../../Application/routes/helpers/error')
const noticeHelper = require('../../Application/routes/helpers/notice')
const helper = require('../../Application/routes/helpers/middleware')
const logger = require('../../Application/lib/logger.js')
const userController = require('../../Application/controllers/userController.js')
const contractController = require('../../Application/controllers/contractController.js')

if (process.env.LOCALLY_HOSTED === 'true') {
  // NODE_ENVはJestがデフォルトでtestに指定する。dotenvで上書きできなかったため、package.jsonの実行引数でdevelopmentを指定
  require('dotenv').config({ path: './config/.env' })
}

let request, response, infoSpy, findOneSpy, findOneSpyContracts
describe('cancellationのテスト', () => {
  beforeEach(() => {
    request = new Request()
    response = new Response()
    findOneSpy = jest.spyOn(userController, 'findOne')
    findOneSpyContracts = jest.spyOn(contractController, 'findOne')
    infoSpy = jest.spyOn(logger, 'info')
  })
  afterEach(() => {
    request.resetMocked()
    response.resetMocked()
    next.mockReset()
    infoSpy.mockRestore()
    findOneSpy.mockRestore()
    findOneSpyContracts.mockRestore()
  })

  // 404エラー定義
  const error404 = new Error('お探しのページは見つかりませんでした。')
  error404.name = 'Not Found'
  error404.status = 404

  const userInfoData = {
    dataValues: {
      userId: '12345678-cb0b-48ad-857d-4b42a44ede13',
      tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089',
      userRole: 'a6a3edcd-00d9-427c-bf03-4ef0112ba16d',
      appVersion: '0.0.1',
      refreshToken: 'dummyRefreshToken',
      subRefreshToken: null,
      userStatus: 0,
      lastRefreshedAt: null,
      createdAt: '2021-01-25T08:45:49.803Z',
      updatedAt: '2021-01-25T08:45:49.803Z'
    }
  }

  const userInfoDataStatusIsNot0 = {
    dataValues: {
      userId: '12345678-cb0b-48ad-857d-4b42a44ede13',
      tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089',
      userRole: 'a6a3edcd-00d9-427c-bf03-4ef0112ba16d',
      appVersion: '0.0.1',
      refreshToken: 'dummyRefreshToken',
      subRefreshToken: null,
      userStatus: 1,
      lastRefreshedAt: null,
      createdAt: '2021-01-25T08:45:49.803Z',
      updatedAt: '2021-01-25T08:45:49.803Z'
    }
  }

  const contractInfoData = {
    dataValues: {
      contractId: '87654321-cb0b-48ad-857d-4b42a44ede13',
      tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089',
      numberN: '0000011111',
      contractStatus: '00',
      deleteFlag: false,
      createdAt: '2021-01-25T08:45:49.803Z',
      updatedAt: '2021-01-25T08:45:49.803Z'
    }
  }

  describe('ルーティング', () => {
    test('cancellationのルーティングを確認', async () => {
      expect(cancellation.router.get).toBeCalledWith(
        '/',
        helper.isAuthenticated,
        helper.isTenantRegistered,
        helper.isUserRegistered,
        cancellation.cbGetCancellation
      )
    })
  })

  describe('cbGetCancellation', () => {
    test('正常', async () => {
      // 準備
      // session.userContextに正常値(LoggedIn)を想定する
      request.session = {
        userContext: 'LoggedIn',
        userRole: 'dummy'
      }
      request.user = {
        userId: '12345678-cb0b-48ad-857d-4b42a44ede13'
      }
      // DBからの正常なユーザデータの取得を想定する
      findOneSpy.mockReturnValue(userInfoData)
      findOneSpyContracts.mockReturnValue(contractInfoData)

      // 試験実施
      await cancellation.cbGetCancellation(request, response, next)

      // 期待結果
      // 400,500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(400))
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(500))
    })

    test('400エラー：requestのsessionのuserConteがLoggedInじゃない場合', async () => {
      // 準備
      // requestのsession,userIdにnullを入れる
      request.session = {
        userContext: 'NotLoggedIn',
        userRole: 'dummy'
      }

      // request.userに正常値を想定する
      request.user = {
        userId: '12345678-cb0b-48ad-857d-4b42a44ede13'
      }
      // DBからの正常なユーザデータの取得を想定する
      findOneSpy.mockReturnValue(userInfoData)
      findOneSpyContracts.mockReturnValue(contractInfoData)

      // 試験実施
      await cancellation.cbGetCancellation(request, response, next)

      // 期待結果
      // 400エラーがエラーハンドリング「される」
      expect(next).toHaveBeenCalledWith(errorHelper.create(400))
      // response.renderが呼ばれ「ない」
      expect(response.render).not.toHaveBeenCalled()
    })

    test('404エラー：DBから取得したユーザのuserStatusが0以外の場合', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = {
        userContext: 'LoggedIn',
        userRole: 'dummy'
      }
      request.user = {
        userId: '12345678-cb0b-48ad-857d-4b42a44ede13'
      }
      // DBから取得したユーザデータのuserStatusが0以外の場合を想定する
      findOneSpy.mockReturnValue(userInfoDataStatusIsNot0)
      // 試験実施
      await cancellation.cbGetCancellation(request, response, next)

      // 期待結果
      // 404エラーがエラーハンドリング「される」
      expect(next).toHaveBeenCalledWith(error404)
      // 500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(500))

      // userContextがLoggedInになって「いる」
      expect(request.session?.userContext).toBe('LoggedIn')
      // session.userRoleが初期値のままになっている
      expect(request.session?.userRole).toBe('dummy')
      // response.renderが呼ばれ「ない」
      expect(response.render).not.toHaveBeenCalled()
    })

    test('500エラー：requestのsession,userIdがnullの場合', async () => {
      // 準備
      // requestのsession,userIdにnullを入れる
      request.session = null
      request.user = {
        userId: null
      }
      findOneSpy.mockReturnValue(userInfoData)
      findOneSpyContracts.mockReturnValue(contractInfoData)

      // 試験実施
      await cancellation.cbGetCancellation(request, response, next)

      // 期待結果
      // 500エラーがエラーハンドリング「される」
      expect(next).toHaveBeenCalledWith(errorHelper.create(500))

      // response.renderが呼ばれ「ない」
      expect(response.render).not.toHaveBeenCalled()
    })

    test('500エラー：DBからユーザが取得できなかった(null)場合', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = {
        userContext: 'LoggedIn',
        userRole: 'dummy'
      }
      request.user = {
        userId: '12345678-cb0b-48ad-857d-4b42a44ede13'
      }
      // DBからのユーザデータの取得ができなかった(null)場合を想定する
      findOneSpy.mockReturnValue(null)
      findOneSpyContracts.mockReturnValue(contractInfoData)

      // 試験実施
      await cancellation.cbGetCancellation(request, response, next)

      // 期待結果
      // 500エラーがエラーハンドリング「される」
      expect(next).toHaveBeenCalledWith(errorHelper.create(500))
      // response.renderが呼ばれ「ない」
      expect(response.render).not.toHaveBeenCalled()
    })

    test('500エラー：DBから契約情報が取得できなかった(null)場合', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = {
        userContext: 'LoggedIn',
        userRole: 'dummy'
      }
      request.user = {
        userId: '12345678-cb0b-48ad-857d-4b42a44ede13'
      }
      // DBからの契約情報が取得ができなかった(null)場合を想定する
      findOneSpy.mockReturnValue(userInfoData)
      findOneSpyContracts.mockReturnValue(null)

      // 試験実施
      await cancellation.cbGetCancellation(request, response, next)

      // 期待結果
      // 500エラーがエラーハンドリング「される」
      expect(next).toHaveBeenCalledWith(errorHelper.create(500))
      // response.renderが呼ばれ「ない」
      expect(response.render).not.toHaveBeenCalled()
    })

    test('500エラー：DBエラーの場合', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = {
        userContext: 'LoggedIn',
        userRole: 'dummy'
      }
      request.user = {
        userId: '12345678-cb0b-48ad-857d-4b42a44ede13'
      }
      // DBからのユーザデータの取得でエラーが発生した場合を想定する
      findOneSpy.mockReturnValue(new Error('DB error mock'))
      findOneSpyContracts.mockReturnValue(new Error('DB error mock'))
      // 試験実施
      await cancellation.cbGetCancellation(request, response, next)

      // 期待結果
      // 500エラーがエラーハンドリング「される」
      expect(next).toHaveBeenCalledWith(errorHelper.create(500))
      // response.renderが呼ばれ「ない」
      expect(response.render).not.toHaveBeenCalled()
    })
  })

  describe('cbPostCancellation', () => {
    test('正常', async () => {
      // 試験実施
      await cancellation.cbPostCancellation(request, response, next)

      // 期待結果
      // 400,500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(400))
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(500))
      // 解約申請完了画面が表示「される」
      expect(next).toHaveBeenCalledWith(noticeHelper.create('cancellation'))
    })
  })
})
