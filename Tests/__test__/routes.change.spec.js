'use strict'
jest.mock('../../Application/node_modules/express', () => {
  return require('jest-express')
})
const change = require('../../Application/routes/change')
const Request = require('jest-express').Request
const Response = require('jest-express').Response
const next = require('jest-express').Next
const helper = require('../../Application/routes/helpers/middleware')
const errorHelper = require('../../Application/routes/helpers/error')
const noticeHelper = require('../../Application/routes/helpers/notice')
const logger = require('../../Application/lib/logger.js')
const userController = require('../../Application/controllers/userController.js')
const contractController = require('../../Application/controllers/contractController.js')
const changOrderController = require('../../Application/controllers/changeOrderController.js')

if (process.env.LOCALLY_HOSTED === 'true') {
  // NODE_ENVはJestがデフォルトでtestに指定する。dotenvで上書きできなかったため、package.jsonの実行引数でdevelopmentを指定
  require('dotenv').config({ path: './config/.env' })
}

let request, response, infoSpy, findOneSpy, findOneSpyContracts, createSpy, checkcontractStatusSpy
describe('changeのテスト', () => {
  beforeEach(() => {
    request = new Request()
    response = new Response()
    findOneSpy = jest.spyOn(userController, 'findOne')
    findOneSpyContracts = jest.spyOn(contractController, 'findOne')
    createSpy = jest.spyOn(changOrderController, 'create')
    checkcontractStatusSpy = jest.spyOn(helper, 'checkContractStatus')
    infoSpy = jest.spyOn(logger, 'info')
    request.csrfToken = jest.fn()
  })
  afterEach(() => {
    request.resetMocked()
    response.resetMocked()
    next.mockReset()
    infoSpy.mockRestore()
    findOneSpy.mockRestore()
    findOneSpyContracts.mockRestore()
    createSpy.mockRestore()
    checkcontractStatusSpy.mockRestore()
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

  const userInfoDataUserRoleNotTenantAdmin = {
    dataValues: {
      userId: '12345678-cb0b-48ad-857d-4b42a44ede13',
      tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089',
      userRole: 'test',
      appVersion: '0.0.1',
      refreshToken: 'dummyRefreshToken',
      subRefreshToken: null,
      userStatus: 0,
      lastRefreshedAt: null,
      createdAt: '2021-01-25T08:45:49.803Z',
      updatedAt: '2021-01-25T08:45:49.803Z'
    }
  }

  const contractInfoDatatoBeUnderContract = {
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

  const contractInfoDatatoBeReceiptCancel = {
    dataValues: {
      contractId: '87654321-cb0b-48ad-857d-4b42a44ede13',
      tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089',
      numberN: '0000011111',
      contractStatus: '30',
      deleteFlag: false,
      createdAt: '2021-01-25T08:45:49.803Z',
      updatedAt: '2021-01-25T08:45:49.803Z'
    }
  }

  const contractInfoDatatoBeReceiptingCancel = {
    dataValues: {
      contractId: '87654321-cb0b-48ad-857d-4b42a44ede13',
      tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089',
      numberN: '0000011111',
      contractStatus: '31',
      deleteFlag: false,
      createdAt: '2021-01-25T08:45:49.803Z',
      updatedAt: '2021-01-25T08:45:49.803Z'
    }
  }

  const contractInfoDatatoBeReceiptContract = {
    dataValues: {
      contractId: '87654321-cb0b-48ad-857d-4b42a44ede13',
      tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089',
      numberN: '0000011111',
      contractStatus: '10',
      deleteFlag: false,
      createdAt: '2021-01-25T08:45:49.803Z',
      updatedAt: '2021-01-25T08:45:49.803Z'
    }
  }

  const contractInfoDatatoBeReceiptingContract = {
    dataValues: {
      contractId: '87654321-cb0b-48ad-857d-4b42a44ede13',
      tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089',
      numberN: '0000011111',
      contractStatus: '11',
      deleteFlag: false,
      createdAt: '2021-01-25T08:45:49.803Z',
      updatedAt: '2021-01-25T08:45:49.803Z'
    }
  }

  const contractInfoDatatoBeReceiptChange = {
    dataValues: {
      contractId: '87654321-cb0b-48ad-857d-4b42a44ede13',
      tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089',
      numberN: '0000011111',
      contractStatus: '40',
      deleteFlag: false,
      createdAt: '2021-01-25T08:45:49.803Z',
      updatedAt: '2021-01-25T08:45:49.803Z'
    }
  }

  const contractInfoDatatoBeReceiptingChange = {
    dataValues: {
      contractId: '87654321-cb0b-48ad-857d-4b42a44ede13',
      tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089',
      numberN: '0000011111',
      contractStatus: '41',
      deleteFlag: false,
      createdAt: '2021-01-25T08:45:49.803Z',
      updatedAt: '2021-01-25T08:45:49.803Z'
    }
  }

  const contractInfoNoData = {
    dataValues: {}
  }

  const createData = { statuscode: 200, value: 'success' }

  describe('ルーティング', () => {
    test('changeのルーティングを確認', async () => {
      expect(change.router.get).toBeCalledWith('/', helper.isAuthenticated, expect.anything(), change.cbGetChangeIndex)
    })
  })

  describe('cbGetChangeIndex', () => {
    test('正常', async () => {
      // 準備
      // session.userContextに正常値(LoggedIn)を想定する
      request.session = {
        userContext: 'LoggedIn',
        userRole: 'dummy'
      }
      request.user = {
        tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089',
        userId: '12345678-cb0b-48ad-857d-4b42a44ede13'
      }
      // DBからの正常なユーザデータの取得を想定する
      findOneSpy.mockReturnValue(userInfoData)
      findOneSpyContracts.mockReturnValue(contractInfoDatatoBeUnderContract)
      checkcontractStatusSpy.mockReturnValue('00')

      // 試験実施
      await change.cbGetChangeIndex(request, response, next)

      // 期待結果
      // 400,500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(400))
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(500))
      // response.renderでchangeが呼ばれ「る」
      expect(response.render).toHaveBeenCalledWith('change', {
        tenantId: request.user.tenantId,
        userRole: request.session.userRole,
        numberN: '0000011111',
        TS_HOST: process.env.TS_HOST
      })
    })

    test('正常：解約申込中の場合', async () => {
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
      findOneSpyContracts.mockReturnValue(contractInfoDatatoBeReceiptCancel)
      checkcontractStatusSpy.mockReturnValue('40')

      // 試験実施
      await change.cbGetChangeIndex(request, response, next)

      // 期待結果
      // 400,500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(400))
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(500))
      // 解約手続き中画面が表示「される」
      expect(next).toHaveBeenCalledWith(noticeHelper.create('cancelprocedure'))
    })

    test('正常：解約受取中の場合', async () => {
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
      findOneSpyContracts.mockReturnValue(contractInfoDatatoBeReceiptingCancel)
      checkcontractStatusSpy.mockReturnValue('41')

      // 試験実施
      await change.cbGetChangeIndex(request, response, next)

      // 期待結果
      // 400,500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(400))
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(500))
      // 解約手続き中画面が表示「される」
      expect(next).toHaveBeenCalledWith(noticeHelper.create('cancelprocedure'))
    })

    test('正常：登録申込中の場合', async () => {
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
      findOneSpyContracts.mockReturnValue(contractInfoDatatoBeReceiptContract)
      checkcontractStatusSpy.mockReturnValue('10')

      // 試験実施
      await change.cbGetChangeIndex(request, response, next)

      // 期待結果
      // 400,500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(400))
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(500))
      // 登録中画面が表示「される」
      expect(next).toHaveBeenCalledWith(noticeHelper.create('registerprocedure'))
    })

    test('正常：登録受取中の場合', async () => {
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
      findOneSpyContracts.mockReturnValue(contractInfoDatatoBeReceiptingContract)
      checkcontractStatusSpy.mockReturnValue('11')

      // 試験実施
      await change.cbGetChangeIndex(request, response, next)

      // 期待結果
      // 400,500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(400))
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(500))
      // 登録中画面が表示画「される」
      expect(next).toHaveBeenCalledWith(noticeHelper.create('registerprocedure'))
    })

    test('正常：変更申込中の場合', async () => {
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
      findOneSpyContracts.mockReturnValue(contractInfoDatatoBeReceiptChange)
      checkcontractStatusSpy.mockReturnValue('40')

      // 試験実施
      await change.cbGetChangeIndex(request, response, next)

      // 期待結果
      // 400,500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(400))
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(500))
      // 変更中画面が表示「される」
      expect(next).toHaveBeenCalledWith(noticeHelper.create('changeprocedure'))
    })

    test('正常：変更受取中の場合', async () => {
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
      findOneSpyContracts.mockReturnValue(contractInfoDatatoBeReceiptingChange)
      checkcontractStatusSpy.mockReturnValue('41')

      // 試験実施
      await change.cbGetChangeIndex(request, response, next)

      // 期待結果
      // 400,500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(400))
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(500))
      // 変更中画面が表示「される」
      expect(next).toHaveBeenCalledWith(noticeHelper.create('changeprocedure'))
    })

    test('正常：一般ユーザーの場合', async () => {
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
      findOneSpy.mockReturnValue(userInfoDataUserRoleNotTenantAdmin)
      findOneSpyContracts.mockReturnValue(contractInfoDatatoBeUnderContract)
      checkcontractStatusSpy.mockReturnValue('00')

      // 試験実施
      await change.cbGetChangeIndex(request, response, next)

      // 期待結果
      // 400,500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(400))
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(500))
      // 利用不可画面が表示「される」
      expect(next).toHaveBeenCalledWith(noticeHelper.create('generaluser'))
    })

    test('500エラー：不正なContractデータの場合', async () => {
      // 準備
      // session.userContextに正常値(LoggedIn)を想定する
      request.session = {
        userContext: 'LoggedIn',
        userRole: 'dummy'
      }
      request.user = {
        tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089',
        userId: '12345678-cb0b-48ad-857d-4b42a44ede13'
      }
      // DBからの正常なユーザデータの取得を想定する
      findOneSpy.mockReturnValue(userInfoData)
      findOneSpyContracts.mockReturnValue(contractInfoNoData)
      checkcontractStatusSpy.mockReturnValue(999)

      // 試験実施
      await change.cbGetChangeIndex(request, response, next)

      // 期待結果
      // 400エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(400))
      // 500エラーがエラーハンドリング「される」
      expect(next).toHaveBeenCalledWith(errorHelper.create(500))
    })
  })

  describe('cbGetChangeIndex', () => {
    test('正常', async () => {
      // 準備
      // session.userContextに正常値(LoggedIn)を想定する
      request.session = {
        userContext: 'LoggedIn',
        userRole: 'dummy'
      }
      request.user = {
        tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089',
        userId: '12345678-cb0b-48ad-857d-4b42a44ede13'
      }
      // DBからの正常なユーザデータの取得を想定する
      findOneSpy.mockReturnValue(userInfoData)
      findOneSpyContracts.mockReturnValue(contractInfoDatatoBeUnderContract)
      checkcontractStatusSpy.mockReturnValue('00')

      // 試験実施
      await change.cbGetChangeIndex(request, response, next)

      // 期待結果
      // 400,500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(400))
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(500))
      // response.renderでchangeが呼ばれ「る」
      expect(response.render).toHaveBeenCalledWith('change', {
        tenantId: request.user.tenantId,
        userRole: request.session.userRole,
        numberN: '0000011111',
        TS_HOST: process.env.TS_HOST
      })
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
      findOneSpyContracts.mockReturnValue(contractInfoDatatoBeUnderContract)

      // 試験実施
      await change.cbGetChangeIndex(request, response, next)

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
      await change.cbGetChangeIndex(request, response, next)

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
      findOneSpyContracts.mockReturnValue(contractInfoDatatoBeUnderContract)

      // 試験実施
      await change.cbGetChangeIndex(request, response, next)

      // 期待結果
      // 500エラーがエラーハンドリング「される」
      expect(next).toHaveBeenCalledWith(errorHelper.create(500))

      // response.renderが呼ばれ「ない」
      expect(response.render).not.toHaveBeenCalled()
    })

    test('500エラー：DBからユーザdデータ取得できなかった(null)場合', async () => {
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
      findOneSpyContracts.mockReturnValue(contractInfoDatatoBeUnderContract)

      // 試験実施
      await change.cbGetChangeIndex(request, response, next)

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
      await change.cbGetChangeIndex(request, response, next)

      // 期待結果
      // 500エラーがエラーハンドリング「される」
      expect(next).toHaveBeenCalledWith(errorHelper.create(500))
      // response.renderが呼ばれ「ない」
      expect(response.render).not.toHaveBeenCalled()
    })

    test('500エラー：ユーザDBエラーの場合', async () => {
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
      findOneSpyContracts.mockReturnValue(contractInfoDatatoBeUnderContract)
      // 試験実施
      await change.cbGetChangeIndex(request, response, next)

      // 期待結果
      // 500エラーがエラーハンドリング「される」
      expect(next).toHaveBeenCalledWith(errorHelper.create(500))
      // response.renderが呼ばれ「ない」
      expect(response.render).not.toHaveBeenCalled()
    })

    test('500エラー：契約DBエラーの場合', async () => {
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
      findOneSpy.mockReturnValue(userInfoData)
      findOneSpyContracts.mockReturnValue(new Error('DB error mock'))
      // 試験実施
      await change.cbGetChangeIndex(request, response, next)

      // 期待結果
      // 500エラーがエラーハンドリング「される」
      expect(next).toHaveBeenCalledWith(errorHelper.create(500))
      // response.renderが呼ばれ「ない」
      expect(response.render).not.toHaveBeenCalled()
    })
  })

  describe('cbPostChangeIndex', () => {
    test('正常：契約者名変更のみ', async () => {
      // 準備
      // requestのtenantIdに正常値を入れる
      request.user = {
        tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089'
      }

      request.body = {
        contractorName: 'テスト１',
        contractorKanaName: 'テスト２',
        chkContractorName: 'on'
      }

      // request.flashは関数なのでモックする。返り値は必要ないので処理は空
      request.flash = jest.fn()

      findOneSpy.mockReturnValue(userInfoData)
      findOneSpyContracts.mockReturnValue(contractInfoDatatoBeUnderContract)
      createSpy.mockImplementation(async (_tenantId, contractInformationcancelOrder) => {
        expect(_tenantId).toEqual('15e2d952-8ba0-42a4-8582-b234cb4a2089')
        expect(contractInformationcancelOrder).toEqual({
          contractBasicInfo: {
            tradeshiftId: '15e2d952-8ba0-42a4-8582-b234cb4a2089',
            orderId: '',
            orderType: '040',
            serviceType: '010',
            contractChangeName: '1',
            contractChangeAddress: '',
            contractChangeContact: '',
            appDate: '',
            OpeningDate: '',
            contractNumber: '0000011111',
            salesChannelCode: '79100100',
            salesChannelName: 'ＰＳ本部＿ＡＰＳ部＿第二ＳＣ部門一Ｇ四Ｔ',
            salesChannelDeptName: '第二ＳＣ部門　第一グループ',
            salesChannelEmplyeeCode: '',
            salesChannelPersonName: 'デジトレアプリ担当',
            salesChannelDeptType: 'アプリケーションサービス部',
            salesChannelPhoneNumber: '050-3383-9608',
            salesChannelMailAddress: 'digitaltrade-ap-ops@ntt.com',
            kaianPassword: ''
          },
          contractAccountInfo: {
            contractAccountId: '',
            customerType: '',
            commonCustomerId: '',
            contractorName: 'テスト１',
            contractorKanaName: 'テスト２',
            postalNumber: '',
            contractAddress: '',
            banch1: '',
            tatemono1: ''
          }
        })
        return createData
      })
      checkcontractStatusSpy.mockReturnValue('00')

      // 試験実施
      await change.cbPostChangeIndex(request, response, next)

      // 期待結果
      // 400,500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(400))
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(500))
      // ポータルにリダイレクト「される」
      expect(response.getHeader('Location')).toEqual('/portal')
    })

    test('正常：契約者住所変更のみ', async () => {
      // 準備
      // requestのtenantIdに正常値を入れる
      request.user = {
        tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089'
      }

      request.body = {
        postalNumber: '0100000',
        contractAddressVal: 'テスト県テスト市',
        banch1: '１２３番',
        tatemono1: 'テスト',
        chkContractAddress: 'on'
      }

      // request.flashは関数なのでモックする。返り値は必要ないので処理は空
      request.flash = jest.fn()

      findOneSpy.mockReturnValue(userInfoData)
      findOneSpyContracts.mockReturnValue(contractInfoDatatoBeUnderContract)
      createSpy.mockImplementation(async (_tenantId, contractInformationcancelOrder) => {
        expect(_tenantId).toEqual('15e2d952-8ba0-42a4-8582-b234cb4a2089')
        expect(contractInformationcancelOrder).toEqual({
          contractBasicInfo: {
            tradeshiftId: '15e2d952-8ba0-42a4-8582-b234cb4a2089',
            orderId: '',
            orderType: '040',
            serviceType: '010',
            contractChangeName: '',
            contractChangeAddress: '1',
            contractChangeContact: '',
            appDate: '',
            OpeningDate: '',
            contractNumber: '0000011111',
            salesChannelCode: '79100100',
            salesChannelName: 'ＰＳ本部＿ＡＰＳ部＿第二ＳＣ部門一Ｇ四Ｔ',
            salesChannelDeptName: '第二ＳＣ部門　第一グループ',
            salesChannelEmplyeeCode: '',
            salesChannelPersonName: 'デジトレアプリ担当',
            salesChannelDeptType: 'アプリケーションサービス部',
            salesChannelPhoneNumber: '050-3383-9608',
            salesChannelMailAddress: 'digitaltrade-ap-ops@ntt.com',
            kaianPassword: ''
          },
          contractAccountInfo: {
            contractAccountId: '',
            customerType: '',
            commonCustomerId: '',
            contractorName: '',
            contractorKanaName: '',
            postalNumber: '0100000',
            contractAddress: 'テスト県テスト市',
            banch1: '１２３番',
            tatemono1: 'テスト'
          }
        })
        return createData
      })
      checkcontractStatusSpy.mockReturnValue('00')

      // 試験実施
      await change.cbPostChangeIndex(request, response, next)

      // 期待結果
      // 400,500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(400))
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(500))
      // ポータルにリダイレクト「される」
      expect(response.getHeader('Location')).toEqual('/portal')
    })

    test('正常：契約者連絡先変更のみ', async () => {
      // 準備
      // requestのtenantIdに正常値を入れる
      request.user = {
        tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089'
      }

      request.body = {
        contactPersonName: 'テスト連絡先',
        contactPhoneNumber: '123-456-789',
        contactMail: 'test@co.jp',
        chkContractContact: 'on'
      }

      // request.flashは関数なのでモックする。返り値は必要ないので処理は空
      request.flash = jest.fn()

      findOneSpy.mockReturnValue(userInfoData)
      findOneSpyContracts.mockReturnValue(contractInfoDatatoBeUnderContract)
      createSpy.mockImplementation(async (_tenantId, contractInformationcancelOrder) => {
        expect(_tenantId).toEqual('15e2d952-8ba0-42a4-8582-b234cb4a2089')
        expect(contractInformationcancelOrder).toEqual({
          contractBasicInfo: {
            tradeshiftId: '15e2d952-8ba0-42a4-8582-b234cb4a2089',
            orderId: '',
            orderType: '040',
            serviceType: '010',
            contractChangeName: '',
            contractChangeAddress: '',
            contractChangeContact: '1',
            appDate: '',
            OpeningDate: '',
            contractNumber: '0000011111',
            salesChannelCode: '79100100',
            salesChannelName: 'ＰＳ本部＿ＡＰＳ部＿第二ＳＣ部門一Ｇ四Ｔ',
            salesChannelDeptName: '第二ＳＣ部門　第一グループ',
            salesChannelEmplyeeCode: '',
            salesChannelPersonName: 'デジトレアプリ担当',
            salesChannelDeptType: 'アプリケーションサービス部',
            salesChannelPhoneNumber: '050-3383-9608',
            salesChannelMailAddress: 'digitaltrade-ap-ops@ntt.com',
            kaianPassword: ''
          },
          contactList: [
            {
              contactType: '',
              contactPersonName: 'テスト連絡先',
              contactPhoneNumber: '123-456-789',
              contactMail: 'test@co.jp'
            }
          ]
        })
        return createData
      })
      checkcontractStatusSpy.mockReturnValue('00')

      // 試験実施
      await change.cbPostChangeIndex(request, response, next)

      // 期待結果
      // 400,500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(400))
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(500))
      // ポータルにリダイレクト「される」
      expect(response.getHeader('Location')).toEqual('/portal')
    })

    test('正常：契約者名、契約者住所変更', async () => {
      // 準備
      // requestのtenantIdに正常値を入れる
      request.user = {
        tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089'
      }

      request.body = {
        contractorName: 'テスト１',
        contractorKanaName: 'テスト２',
        chkContractorName: 'on',
        postalNumber: '0100000',
        contractAddressVal: 'テスト県テスト市',
        banch1: '１２３番',
        tatemono1: 'テスト',
        chkContractAddress: 'on'
      }

      // request.flashは関数なのでモックする。返り値は必要ないので処理は空
      request.flash = jest.fn()

      findOneSpy.mockReturnValue(userInfoData)
      findOneSpyContracts.mockReturnValue(contractInfoDatatoBeUnderContract)
      createSpy.mockReturnValue(createData)
      checkcontractStatusSpy.mockReturnValue('00')

      // 試験実施
      await change.cbPostChangeIndex(request, response, next)

      // 期待結果
      // 400,500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(400))
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(500))
      // ポータルにリダイレクト「される」
      expect(response.getHeader('Location')).toEqual('/portal')
    })

    test('正常：契約者名、契約者連絡先変更', async () => {
      // 準備
      // requestのtenantIdに正常値を入れる
      request.user = {
        tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089'
      }

      request.body = {
        contractorName: 'テスト１',
        contractorKanaName: 'テスト２',
        chkContractorName: 'on',
        contactPersonName: 'テスト連絡先',
        contactPhoneNumber: '123-456-789',
        contactMail: 'test@co.jp',
        chkContractContact: 'on'
      }

      // request.flashは関数なのでモックする。返り値は必要ないので処理は空
      request.flash = jest.fn()

      findOneSpy.mockReturnValue(userInfoData)
      findOneSpyContracts.mockReturnValue(contractInfoDatatoBeUnderContract)
      createSpy.mockReturnValue(createData)
      checkcontractStatusSpy.mockReturnValue('00')

      // 試験実施
      await change.cbPostChangeIndex(request, response, next)

      // 期待結果
      // 400,500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(400))
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(500))
      // ポータルにリダイレクト「される」
      expect(response.getHeader('Location')).toEqual('/portal')
    })

    test('正常：契約者住所、契約者連絡先変更', async () => {
      // 準備
      // requestのtenantIdに正常値を入れる
      request.user = {
        tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089'
      }

      request.body = {
        postalNumber: '0100000',
        contractAddressVal: 'テスト県テスト市',
        banch1: '１２３番',
        tatemono1: 'テスト',
        chkContractAddress: 'on',
        contactPersonName: 'テスト連絡先',
        contactPhoneNumber: '123-456-789',
        contactMail: 'test@co.jp',
        chkContractContact: 'on'
      }

      // request.flashは関数なのでモックする。返り値は必要ないので処理は空
      request.flash = jest.fn()

      findOneSpy.mockReturnValue(userInfoData)
      findOneSpyContracts.mockReturnValue(contractInfoDatatoBeUnderContract)
      createSpy.mockReturnValue(createData)
      checkcontractStatusSpy.mockReturnValue('00')

      // 試験実施
      await change.cbPostChangeIndex(request, response, next)

      // 期待結果
      // 400,500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(400))
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(500))
      // ポータルにリダイレクト「される」
      expect(response.getHeader('Location')).toEqual('/portal')
    })

    test('正常：契約者名、契約者住所、契約者連絡先変更', async () => {
      // 準備
      // requestのtenantIdに正常値を入れる
      request.user = {
        tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089'
      }

      request.body = {
        contractorName: 'テスト１',
        contractorKanaName: 'テスト２',
        chkContractorName: 'on',
        postalNumber: '0100000',
        contractAddressVal: 'テスト県テスト市',
        banch1: '１２３番',
        tatemono1: 'テスト',
        chkContractAddress: 'on',
        contactPersonName: 'テスト連絡先',
        contactPhoneNumber: '123-456-789',
        contactMail: 'test@co.jp',
        chkContractContact: 'on'
      }

      // request.flashは関数なのでモックする。返り値は必要ないので処理は空
      request.flash = jest.fn()

      findOneSpy.mockReturnValue(userInfoData)
      findOneSpyContracts.mockReturnValue(contractInfoDatatoBeUnderContract)
      createSpy.mockImplementation(async (_tenantId, contractInformationcancelOrder) => {
        expect(_tenantId).toEqual('15e2d952-8ba0-42a4-8582-b234cb4a2089')
        expect(contractInformationcancelOrder).toEqual({
          contractBasicInfo: {
            tradeshiftId: '15e2d952-8ba0-42a4-8582-b234cb4a2089',
            orderId: '',
            orderType: '040',
            serviceType: '010',
            contractChangeName: '1',
            contractChangeAddress: '1',
            contractChangeContact: '1',
            appDate: '',
            OpeningDate: '',
            contractNumber: '0000011111',
            salesChannelCode: '79100100',
            salesChannelName: 'ＰＳ本部＿ＡＰＳ部＿第二ＳＣ部門一Ｇ四Ｔ',
            salesChannelDeptName: '第二ＳＣ部門　第一グループ',
            salesChannelEmplyeeCode: '',
            salesChannelPersonName: 'デジトレアプリ担当',
            salesChannelDeptType: 'アプリケーションサービス部',
            salesChannelPhoneNumber: '050-3383-9608',
            salesChannelMailAddress: 'digitaltrade-ap-ops@ntt.com',
            kaianPassword: ''
          },
          contractAccountInfo: {
            contractAccountId: '',
            customerType: '',
            commonCustomerId: '',
            contractorName: 'テスト１',
            contractorKanaName: 'テスト２',
            postalNumber: '0100000',
            contractAddress: 'テスト県テスト市',
            banch1: '１２３番',
            tatemono1: 'テスト'
          },
          contactList: [
            {
              contactType: '',
              contactPersonName: 'テスト連絡先',
              contactPhoneNumber: '123-456-789',
              contactMail: 'test@co.jp'
            }
          ]
        })
        return createData
      })
      checkcontractStatusSpy.mockReturnValue('00')

      // 試験実施
      await change.cbPostChangeIndex(request, response, next)

      // 期待結果
      // 400,500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(400))
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(500))
      // ポータルにリダイレクト「される」
      expect(response.getHeader('Location')).toEqual('/portal')
    })

    test('正常：解約申込中の場合', async () => {
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
      findOneSpyContracts.mockReturnValue(contractInfoDatatoBeReceiptCancel)
      createSpy.mockReturnValue(createData)
      checkcontractStatusSpy.mockReturnValue('30')

      // 試験実施
      await change.cbPostChangeIndex(request, response, next)

      // 期待結果
      // 400,500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(400))
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(500))
      // 解約手続き中画面が表示「される」
      expect(next).toHaveBeenCalledWith(noticeHelper.create('cancelprocedure'))
    })

    test('正常：解約受取中の場合', async () => {
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
      findOneSpyContracts.mockReturnValue(contractInfoDatatoBeReceiptingCancel)
      createSpy.mockReturnValue(createData)
      checkcontractStatusSpy.mockReturnValue('31')

      // 試験実施
      await change.cbPostChangeIndex(request, response, next)

      // 期待結果
      // 400,500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(400))
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(500))
      // 解約手続き中画面が表示「される」
      expect(next).toHaveBeenCalledWith(noticeHelper.create('cancelprocedure'))
    })

    test('正常：登録申込中の場合', async () => {
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
      findOneSpyContracts.mockReturnValue(contractInfoDatatoBeReceiptContract)
      createSpy.mockReturnValue(createData)
      checkcontractStatusSpy.mockReturnValue('10')

      // 試験実施
      await change.cbPostChangeIndex(request, response, next)

      // 期待結果
      // 400,500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(400))
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(500))
      // 登録中画面が表示「される」
      expect(next).toHaveBeenCalledWith(noticeHelper.create('registerprocedure'))
    })

    test('正常：登録受取中の場合', async () => {
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
      findOneSpyContracts.mockReturnValue(contractInfoDatatoBeReceiptingContract)
      createSpy.mockReturnValue(createData)
      checkcontractStatusSpy.mockReturnValue('11')

      // 試験実施
      await change.cbPostChangeIndex(request, response, next)

      // 期待結果
      // 400,500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(400))
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(500))
      // 登録中画面が表示画「される」
      expect(next).toHaveBeenCalledWith(noticeHelper.create('registerprocedure'))
    })

    test('正常：変更申込中の場合', async () => {
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
      findOneSpyContracts.mockReturnValue(contractInfoDatatoBeReceiptChange)
      createSpy.mockReturnValue(createData)
      checkcontractStatusSpy.mockReturnValue('40')

      // 試験実施
      await change.cbPostChangeIndex(request, response, next)

      // 期待結果
      // 400,500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(400))
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(500))
      // 変更中画面が表示「される」
      expect(next).toHaveBeenCalledWith(noticeHelper.create('changeprocedure'))
    })

    test('正常：変更受取中の場合', async () => {
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
      findOneSpyContracts.mockReturnValue(contractInfoDatatoBeReceiptingChange)
      createSpy.mockReturnValue(createData)
      checkcontractStatusSpy.mockReturnValue('41')

      // 試験実施
      await change.cbPostChangeIndex(request, response, next)

      // 期待結果
      // 400,500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(400))
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(500))
      // 変更中画面が表示「される」
      expect(next).toHaveBeenCalledWith(noticeHelper.create('changeprocedure'))
    })

    test('正常：一般ユーザーの場合', async () => {
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
      findOneSpy.mockReturnValue(userInfoDataUserRoleNotTenantAdmin)
      findOneSpyContracts.mockReturnValue(contractInfoDatatoBeUnderContract)
      createSpy.mockReturnValue(createData)
      checkcontractStatusSpy.mockReturnValue('00')

      // 試験実施
      await change.cbPostChangeIndex(request, response, next)

      // 期待結果
      // 400,500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(400))
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(500))
      // 利用不可画面が表示「される」
      expect(next).toHaveBeenCalledWith(noticeHelper.create('generaluser'))
    })

    test('400エラー：契約者名、契約者住所、契約者連絡先変更ーチェックなし', async () => {
      // 準備
      // requestのtenantIdに正常値を入れる
      request.user = {
        tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089'
      }

      request.body = {
        contractorName: 'テスト１',
        contractorKanaName: 'テスト２',
        chkContractorName: undefined,
        postalNumber: '0100000',
        contractAddressVal: 'テスト県テスト市',
        banch1: '１２３番',
        tatemono1: 'テスト',
        chkContractAddress: undefined,
        contactPersonName: 'テスト連絡先',
        contactPhoneNumber: '123-456-789',
        contactMail: 'test@co.jp',
        chkContractContact: undefined
      }

      // request.flashは関数なのでモックする。返り値は必要ないので処理は空
      request.flash = jest.fn()

      findOneSpy.mockReturnValue(userInfoData)
      findOneSpyContracts.mockReturnValue(contractInfoDatatoBeUnderContract)
      createSpy.mockReturnValue(createData)
      checkcontractStatusSpy.mockReturnValue('00')

      // 試験実施
      await change.cbPostChangeIndex(request, response, next)

      // 期待結果
      // 400エラーがエラーハンドリング「される」
      expect(next).toHaveBeenCalledWith(errorHelper.create(400))
    })

    test('500エラー：不正なContractデータの場合', async () => {
      // 準備
      // session.userContextに正常値(LoggedIn)を想定する
      request.session = {
        userContext: 'LoggedIn',
        userRole: 'dummy'
      }
      request.user = {
        tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089',
        userId: '12345678-cb0b-48ad-857d-4b42a44ede13'
      }
      // DBからの正常なユーザデータの取得を想定する
      findOneSpy.mockReturnValue(userInfoData)
      findOneSpyContracts.mockReturnValue(contractInfoNoData)
      createSpy.mockReturnValue(createData)
      checkcontractStatusSpy.mockReturnValue(999)

      // 試験実施
      await change.cbPostChangeIndex(request, response, next)

      // 期待結果
      // 400エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(400))
      // 500エラーがエラーハンドリング「される」
      expect(next).toHaveBeenCalledWith(errorHelper.create(500))
    })

    test('500エラー：OderDBエラーの場合', async () => {
      // 準備
      // requestのtenantIdに正常値を入れる
      request.user = {
        tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089'
      }

      request.body = {
        contractorName: 'テスト１',
        contractorKanaName: 'テスト２',
        chkContractorName: 'on'
      }

      findOneSpy.mockReturnValue(userInfoData)
      findOneSpyContracts.mockReturnValue(contractInfoDatatoBeUnderContract)
      createSpy.mockReturnValue(new Error('DB error mock'))
      checkcontractStatusSpy.mockReturnValue('00')

      // 試験実施
      await change.cbPostChangeIndex(request, response, next)

      // 期待結果
      // 500エラーがエラーハンドリング「される」
      expect(next).toHaveBeenCalledWith(errorHelper.create(500))
    })

    test('500エラー：DBからユーザが取得できなかった(null)場合', async () => {
      // 準備
      // requestのtenantIdに正常値を入れる
      request.user = {
        tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089'
      }

      request.body = {
        contractorName: 'テスト１',
        contractorKanaName: 'テスト２',
        chkContractorName: 'on'
      }

      findOneSpy.mockReturnValue(null)
      findOneSpyContracts.mockReturnValue(contractInfoDatatoBeUnderContract)
      createSpy.mockReturnValue(createData)

      // 試験実施
      await change.cbPostChangeIndex(request, response, next)

      // 期待結果
      // 500エラーがエラーハンドリング「される」
      expect(next).toHaveBeenCalledWith(errorHelper.create(500))
    })

    test('500エラー：DBから契約情報が取得できなかった(null)場合', async () => {
      // 準備
      // requestのtenantIdに正常値を入れる
      request.user = {
        tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089'
      }

      request.body = {
        contractorName: 'テスト１',
        contractorKanaName: 'テスト２',
        chkContractorName: 'on'
      }

      findOneSpy.mockReturnValue(userInfoData)
      findOneSpyContracts.mockReturnValue(null)
      createSpy.mockReturnValue(createData)

      // 試験実施
      await change.cbPostChangeIndex(request, response, next)

      // 期待結果
      // 500エラーがエラーハンドリング「される」
      expect(next).toHaveBeenCalledWith(errorHelper.create(500))
    })

    test('500エラー：契約DBエラーの場合', async () => {
      // 準備
      // requestのtenantIdに正常値を入れる
      request.user = {
        tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089'
      }

      request.body = {
        contractorName: 'テスト１',
        contractorKanaName: 'テスト２',
        chkContractorName: 'on'
      }

      findOneSpy.mockReturnValue(userInfoData)
      findOneSpyContracts.mockReturnValue(new Error('DB error mock'))
      createSpy.mockReturnValue(createData)

      // 試験実施
      await change.cbPostChangeIndex(request, response, next)

      // 期待結果
      // 500エラーがエラーハンドリング「される」
      expect(next).toHaveBeenCalledWith(errorHelper.create(500))
    })

    test('500エラー：ユーザDBエラーの場合', async () => {
      // 準備
      // requestのtenantIdに正常値を入れる
      request.user = {
        tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089'
      }

      request.body = {
        contractorName: 'テスト１',
        contractorKanaName: 'テスト２',
        chkContractorName: 'on'
      }

      findOneSpy.mockReturnValue(new Error('DB error mock'))
      findOneSpyContracts.mockReturnValue(contractInfoDatatoBeUnderContract)
      createSpy.mockReturnValue(createData)

      // 試験実施
      await change.cbPostChangeIndex(request, response, next)

      // 期待結果
      // 500エラーがエラーハンドリング「される」
      expect(next).toHaveBeenCalledWith(errorHelper.create(500))
    })
  })
})
