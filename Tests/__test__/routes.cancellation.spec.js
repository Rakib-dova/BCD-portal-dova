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
const tenantController = require('../../Application/controllers/tenantController.js')
const contractController = require('../../Application/controllers/contractController.js')
const cancellationController = require('../../Application/controllers/cancellationsController.js')

if (process.env.LOCALLY_HOSTED === 'true') {
  // NODE_ENVはJestがデフォルトでtestに指定する。dotenvで上書きできなかったため、package.jsonの実行引数でdevelopmentを指定
  require('dotenv').config({ path: './config/.env' })
}

let request, response, infoSpy, findOneSpy, findOneSpyContracts, createSpy, tenantFindOneSpy, checkContractStatusSpy
describe('cancellationのテスト', () => {
  beforeEach(() => {
    request = new Request()
    response = new Response()
    tenantFindOneSpy = jest.spyOn(tenantController, 'findOne')
    findOneSpy = jest.spyOn(userController, 'findOne')
    findOneSpyContracts = jest.spyOn(contractController, 'findOne')
    createSpy = jest.spyOn(cancellationController, 'create')
    infoSpy = jest.spyOn(logger, 'info')
    checkContractStatusSpy = jest.spyOn(helper, 'checkContractStatus')
  })
  afterEach(() => {
    request.resetMocked()
    response.resetMocked()
    next.mockReset()
    infoSpy.mockRestore()
    tenantFindOneSpy.mockRestore()
    findOneSpy.mockRestore()
    findOneSpyContracts.mockRestore()
    createSpy.mockRestore()
    checkContractStatusSpy.mockRestore()
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

  const contractInfoNoData = {
    dataValues: {}
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

  const createData = { statuscode: 200, value: 'success' }

  describe('ルーティング', () => {
    test('cancellationのルーティングを確認', async () => {
      expect(cancellation.router.get).toBeCalledWith('/', helper.isAuthenticated, cancellation.cbGetCancellation)
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
        tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089',
        userId: '12345678-cb0b-48ad-857d-4b42a44ede13'
      }
      // DBからの正常なユーザデータの取得を想定する
      findOneSpy.mockReturnValue(userInfoData)
      findOneSpyContracts.mockReturnValue(contractInfoData)
      checkContractStatusSpy.mockReturnValue('00')

      // 試験実施
      await cancellation.cbGetCancellation(request, response, next)

      // 期待結果
      // 400,500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(400))
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(500))
      // response.renderでcancellationが呼ばれ「る」
      expect(response.render).toHaveBeenCalledWith('cancellation', {
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
      checkContractStatusSpy.mockReturnValue('30')

      // 試験実施
      await cancellation.cbGetCancellation(request, response, next)

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
      checkContractStatusSpy.mockReturnValue('31')

      // 試験実施
      await cancellation.cbGetCancellation(request, response, next)

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
      checkContractStatusSpy.mockReturnValue('10')

      // 試験実施
      await cancellation.cbGetCancellation(request, response, next)

      // 期待結果
      // 400,500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(400))
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(500))
      // 利用登録手続き中画面が表示「される」
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
      checkContractStatusSpy.mockReturnValue('11')

      // 試験実施
      await cancellation.cbGetCancellation(request, response, next)

      // 期待結果
      // 400,500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(400))
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(500))
      // 利用登録手続き中画面が表示「される」
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
      checkContractStatusSpy.mockReturnValue('40')

      // 試験実施
      await cancellation.cbGetCancellation(request, response, next)

      // 期待結果
      // 400,500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(400))
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(500))
      // 契約情報変更手続き中画面が表示「される」
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
      checkContractStatusSpy.mockReturnValue('41')

      // 試験実施
      await cancellation.cbGetCancellation(request, response, next)

      // 期待結果
      // 400,500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(400))
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(500))
      // 契約情報変更手続き中画面が表示「される」
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
      findOneSpyContracts.mockReturnValue(contractInfoData)
      checkContractStatusSpy.mockReturnValue('00')

      // 試験実施
      await cancellation.cbGetCancellation(request, response, next)

      // 期待結果
      // 400,500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(400))
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(500))
      // 利用不可画面が表示「される」
      expect(next).toHaveBeenCalledWith(noticeHelper.create('generaluser'))
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

    test('500エラー：不正なContractデータの場合', async () => {
      // 準備
      // requestのtenantIdに正常値を入れる
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
      checkContractStatusSpy.mockReturnValue(999)

      // 試験実施
      await cancellation.cbGetCancellation(request, response, next)

      // 期待結果
      // 400エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(400))
      // 500エラーがエラーハンドリング「される」
      expect(next).toHaveBeenCalledWith(errorHelper.create(500))
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
      helper.checkContractStatus = 0

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
      findOneSpyContracts.mockReturnValue(contractInfoData)
      // 試験実施
      await cancellation.cbGetCancellation(request, response, next)

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
      // 準備
      // requestのtenantIdに正常値を入れる
      request.user = {
        tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089',
        userId: '12345678-cb0b-48ad-857d-4b42a44ede13'
      }
      // DBからの正常なユーザデータの取得を想定する
      findOneSpy.mockReturnValue(userInfoData)
      findOneSpyContracts.mockReturnValue(contractInfoData)
      createSpy.mockImplementation(async (_tenantId, _cancelData, contractInformationcancelOrder) => {
        expect(_tenantId).toEqual('15e2d952-8ba0-42a4-8582-b234cb4a2089')
        expect(contractInformationcancelOrder).toEqual({
          contractBasicInfo: {
            tradeshiftId: '15e2d952-8ba0-42a4-8582-b234cb4a2089',
            orderId: '',
            orderType: '030',
            serviceType: '010',
            contractChangeName: '',
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
          }
        })
        return createData
      })
      checkContractStatusSpy.mockReturnValue('00')

      // 試験実施
      await cancellation.cbPostCancellation(request, response, next)

      // 期待結果
      // 400,500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(400))
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(500))
      // 解約申請完了画面が表示「される」
      expect(next).toHaveBeenCalledWith(noticeHelper.create('cancellation'))
    })

    test('正常：解約申込中の場合', async () => {
      // 準備
      // requestのtenantIdに正常値を入れる
      request.user = {
        tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089',
        userId: '12345678-cb0b-48ad-857d-4b42a44ede13'
      }
      // DBからの正常なユーザデータの取得を想定する
      findOneSpy.mockReturnValue(userInfoData)
      findOneSpyContracts.mockReturnValue(contractInfoDatatoBeReceiptCancel)
      checkContractStatusSpy.mockReturnValue('30')

      // 試験実施
      await cancellation.cbPostCancellation(request, response, next)

      // 期待結果
      // 400,500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(400))
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(500))
      // 解約手続き中画面が表示「される」
      expect(next).toHaveBeenCalledWith(noticeHelper.create('cancelprocedure'))
    })

    test('正常：解約受取中の場合', async () => {
      // 準備
      // requestのtenantIdに正常値を入れる
      request.user = {
        tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089',
        userId: '12345678-cb0b-48ad-857d-4b42a44ede13'
      }
      // DBからの正常なユーザデータの取得を想定する
      findOneSpy.mockReturnValue(userInfoData)
      findOneSpyContracts.mockReturnValue(contractInfoDatatoBeReceiptingCancel)
      checkContractStatusSpy.mockReturnValue('31')

      // 試験実施
      await cancellation.cbPostCancellation(request, response, next)

      // 期待結果
      // 400,500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(400))
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(500))
      // 解約手続き中画面が表示「される」
      expect(next).toHaveBeenCalledWith(noticeHelper.create('cancelprocedure'))
    })

    test('正常：登録申込中の場合', async () => {
      // 準備
      // requestのtenantIdに正常値を入れる
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
      findOneSpyContracts.mockReturnValue(contractInfoDatatoBeReceiptContract)
      checkContractStatusSpy.mockReturnValue('10')

      // 試験実施
      await cancellation.cbPostCancellation(request, response, next)

      // 期待結果
      // 400,500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(400))
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(500))
      // 利用登録手続き中画面が表示「される」
      expect(next).toHaveBeenCalledWith(noticeHelper.create('registerprocedure'))
    })

    test('正常：登録受取中の場合', async () => {
      // 準備
      // requestのtenantIdに正常値を入れる
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
      findOneSpyContracts.mockReturnValue(contractInfoDatatoBeReceiptingContract)
      checkContractStatusSpy.mockReturnValue('11')

      // 試験実施
      await cancellation.cbPostCancellation(request, response, next)

      // 期待結果
      // 400,500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(400))
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(500))
      // 利用登録手続き中画面が表示「される」
      expect(next).toHaveBeenCalledWith(noticeHelper.create('registerprocedure'))
    })

    test('正常：変更申込中の場合', async () => {
      // 準備
      // requestのtenantIdに正常値を入れる
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
      findOneSpyContracts.mockReturnValue(contractInfoDatatoBeReceiptChange)
      checkContractStatusSpy.mockReturnValue('40')

      // 試験実施
      await cancellation.cbPostCancellation(request, response, next)

      // 期待結果
      // 400,500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(400))
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(500))
      // 契約情報変更手続き中画面が表示「される」
      expect(next).toHaveBeenCalledWith(noticeHelper.create('changeprocedure'))
    })

    test('正常：変更受取中の場合', async () => {
      // 準備
      // requestのtenantIdに正常値を入れる
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
      findOneSpyContracts.mockReturnValue(contractInfoDatatoBeReceiptingChange)
      checkContractStatusSpy.mockReturnValue('41')

      // 試験実施
      await cancellation.cbPostCancellation(request, response, next)

      // 期待結果
      // 400,500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(400))
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(500))
      // 契約情報変更手続き中画面が表示「される」
      expect(next).toHaveBeenCalledWith(noticeHelper.create('changeprocedure'))
    })

    test('正常：一般ユーザーの場合', async () => {
      // 準備
      // requestのtenantIdに正常値を入れる
      request.session = {
        userContext: 'LoggedIn',
        userRole: 'dummy'
      }
      request.user = {
        tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089',
        userId: '12345678-cb0b-48ad-857d-4b42a44ede13'
      }
      // DBからの正常なユーザデータの取得を想定する
      findOneSpy.mockReturnValue(userInfoDataUserRoleNotTenantAdmin)
      findOneSpyContracts.mockReturnValue(contractInfoData)
      checkContractStatusSpy.mockReturnValue('00')

      // 試験実施
      await cancellation.cbPostCancellation(request, response, next)

      // 期待結果
      // 400,500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(400))
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(500))
      // 利用不可画面が表示「される」
      expect(next).toHaveBeenCalledWith(noticeHelper.create('generaluser'))
    })

    test('準正常：contractがヌールの場合', async () => {
      // 準備
      // requestのtenantIdに正常値を入れる
      request.session = {
        userContext: 'LoggedIn',
        userRole: 'dummy'
      }
      request.user = {
        tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089',
        userId: '12345678-cb0b-48ad-857d-4b42a44ede13'
      }
      const err051 = new Error('ERR051 Not Founded ContractId')
      // DBからの正常なユーザデータの取得を想定する
      findOneSpy.mockReturnValue(userInfoData)
      findOneSpyContracts.mockReturnValue(contractInfoData)
      checkContractStatusSpy.mockReturnValue('00')
      createSpy.mockReturnValue(err051)

      // 試験実施
      await cancellation.cbPostCancellation(request, response, next)

      // 期待結果
      // 400エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(400))
      // 500エラーがエラーハンドリング「される」
      expect(next).toHaveBeenCalledWith(errorHelper.create(500))
    })

    test('準正常：contractステータスが失敗の場合', async () => {
      // 準備
      // requestのtenantIdに正常値を入れる
      request.session = {
        userContext: 'LoggedIn',
        userRole: 'dummy'
      }
      request.user = {
        tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089',
        userId: '12345678-cb0b-48ad-857d-4b42a44ede13'
      }
      const err052 = new Error('ERR052 Not updated ContratStatus')
      // DBからの正常なユーザデータの取得を想定する
      findOneSpy.mockReturnValue(userInfoData)
      findOneSpyContracts.mockReturnValue(contractInfoData)
      checkContractStatusSpy.mockReturnValue('00')
      createSpy.mockReturnValue(err052)

      // 試験実施
      await cancellation.cbPostCancellation(request, response, next)

      // 期待結果
      // 400エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(400))
      // 500エラーがエラーハンドリング「される」
      expect(next).toHaveBeenCalledWith(errorHelper.create(500))
    })

    test('500エラー：不正なContractデータの場合', async () => {
      // 準備
      // requestのtenantIdに正常値を入れる
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
      checkContractStatusSpy.mockReturnValue(999)

      // 試験実施
      await cancellation.cbPostCancellation(request, response, next)

      // 期待結果
      // 400エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(400))
      // 500エラーがエラーハンドリング「される」
      expect(next).toHaveBeenCalledWith(errorHelper.create(500))
    })

    test('500エラー：ユーザDBエラーの場合', async () => {
      // 準備
      // requestのtenantIdに正常値を入れる
      request.session = {
        userContext: 'LoggedIn',
        userRole: 'dummy'
      }
      request.user = {
        tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089',
        userId: '12345678-cb0b-48ad-857d-4b42a44ede13'
      }
      findOneSpy.mockReturnValue(new Error('DB error mock'))
      findOneSpyContracts.mockReturnValue(contractInfoData)
      helper.checkContractStatus = 0

      // 試験実施
      await cancellation.cbPostCancellation(request, response, next)

      // 期待結果
      // 500エラーがエラーハンドリング「される」
      expect(next).toHaveBeenCalledWith(errorHelper.create(500))
      // 解約申請完了画面が表示「される」
      expect(next).not.toHaveBeenCalledWith(noticeHelper.create('cancellation'))
    })

    test('500エラー：契約DBエラーの場合', async () => {
      // 準備
      // requestのtenantIdに正常値を入れる
      request.session = {
        userContext: 'LoggedIn',
        userRole: 'dummy'
      }
      request.user = {
        tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089',
        userId: '12345678-cb0b-48ad-857d-4b42a44ede13'
      }

      findOneSpy.mockReturnValue(userInfoData)
      findOneSpyContracts.mockReturnValue(new Error('DB error mock'))
      createSpy.mockReturnValue(createData)

      // 試験実施
      await cancellation.cbPostCancellation(request, response, next)

      // 期待結果
      // 500エラーがエラーハンドリング「される」
      expect(next).toHaveBeenCalledWith(errorHelper.create(500))
      // 解約申請完了画面が表示「される」
      expect(next).not.toHaveBeenCalledWith(noticeHelper.create('cancellation'))
    })

    test('500エラー：解約DBエラーの場合', async () => {
      // 準備
      // requestのtenantIdに正常値を入れる
      request.user = {
        tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089',
        userId: '12345678-cb0b-48ad-857d-4b42a44ede13'
      }
      // DBからの正常なユーザデータの取得を想定する
      findOneSpy.mockReturnValue(userInfoData)
      findOneSpyContracts.mockReturnValue(contractInfoData)
      createSpy.mockReturnValue(new Error('DB error mock'))

      // 試験実施
      await cancellation.cbPostCancellation(request, response, next)

      // 期待結果
      // 500エラーがエラーハンドリング「される」
      expect(next).toHaveBeenCalledWith(errorHelper.create(500))
      // 解約申請完了画面が表示「される」
      expect(next).not.toHaveBeenCalledWith(noticeHelper.create('cancellation'))
    })
  })
})
