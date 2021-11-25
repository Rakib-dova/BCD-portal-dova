'use strict'

jest.mock('../../Application/node_modules/express', () => {
  return require('jest-express')
})

const uploadFormatList = require('../../Application/routes/uploadFormatList')
const Request = require('jest-express').Request
const Response = require('jest-express').Response
const next = require('jest-express').Next
const errorHelper = require('../../Application/routes/helpers/error')
const noticeHelper = require('../../Application/routes/helpers/notice')
const helper = require('../../Application/routes/helpers/middleware')
const logger = require('../../Application/lib/logger.js')
const userController = require('../../Application/controllers/userController.js')
const contractController = require('../../Application/controllers/contractController.js')
const uploadFormatListController = require('../../Application/controllers/uploadFormatListController')

if (process.env.LOCALLY_HOSTED === 'true') {
  // NODE_ENVはJestがデフォルトでtestに指定する。dotenvで上書きできなかったため、package.jsonの実行引数でdevelopmentを指定
  require('dotenv').config({ path: './config/.env' })
}

let request, response, infoSpy, findOneSpy, findOneSpyContracts, getFormatListSpy
describe('uploadFormatListのテスト', () => {
  beforeEach(() => {
    request = new Request()
    response = new Response()
    findOneSpy = jest.spyOn(userController, 'findOne')
    findOneSpyContracts = jest.spyOn(contractController, 'findOne')
    infoSpy = jest.spyOn(logger, 'info')
    getFormatListSpy = jest.spyOn(uploadFormatListController, 'getFormatList')
  })
  afterEach(() => {
    request.resetMocked()
    response.resetMocked()
    next.mockReset()
    infoSpy.mockRestore()
    findOneSpy.mockRestore()
    findOneSpyContracts.mockRestore()
    getFormatListSpy.mockRestore()
  })

  // 404エラー定義
  const error404 = new Error('お探しのページは見つかりませんでした。')
  error404.name = 'Not Found'
  error404.status = 404

  const tenantId = '15e2d952-8ba0-42a4-8582-b234cb4a2089'
  const contractId = '87654321-cb0b-48ad-857d-4b42a44ede13'

  // userDB値：正常（テナント管理者）
  const userInfoData = {
    dataValues: {
      userId: '12345678-cb0b-48ad-857d-4b42a44ede13',
      tenantId: tenantId,
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

  // userDB値：正常（一般ユーザ）
  const userInfoDataUserRoleNotTenantAdmin = {
    dataValues: {
      userId: '12345678-cb0b-48ad-857d-4b42a44ede13',
      tenantId: tenantId,
      userRole: 'fe888fbb-172f-467c-b9ad-efe0720fecf9',
      appVersion: '0.0.1',
      refreshToken: 'dummyRefreshToken',
      subRefreshToken: null,
      userStatus: 0,
      lastRefreshedAt: null,
      createdAt: '2021-01-25T08:45:49.803Z',
      updatedAt: '2021-01-25T08:45:49.803Z'
    }
  }

  // userDB値：userStatusが0以外
  const userInfoDataStatusIsNot0 = {
    dataValues: {
      userId: '12345678-cb0b-48ad-857d-4b42a44ede13',
      tenantId: tenantId,
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

  // 契約DB値：契約中
  const contractInfoData = {
    dataValues: {
      contractId: contractId,
      tenantId: tenantId,
      numberN: '0000011111',
      contractStatus: '00',
      deleteFlag: false,
      createdAt: '2021-01-25T08:45:49.803Z',
      updatedAt: '2021-01-25T08:45:49.803Z'
    }
  }

  // 契約DB値：登録申込中
  const contractInfoDatatoBeReceiptContract = {
    dataValues: {
      contractId: contractId,
      tenantId: tenantId,
      numberN: '0000011111',
      contractStatus: '10',
      deleteFlag: false,
      createdAt: '2021-01-25T08:45:49.803Z',
      updatedAt: '2021-01-25T08:45:49.803Z'
    }
  }

  // 契約DB値：登録受取中
  const contractInfoDatatoBeReceiptingContract = {
    dataValues: {
      contractId: contractId,
      tenantId: tenantId,
      numberN: '0000011111',
      contractStatus: '11',
      deleteFlag: false,
      createdAt: '2021-01-25T08:45:49.803Z',
      updatedAt: '2021-01-25T08:45:49.803Z'
    }
  }

  // 契約DB値：解約申込中
  const contractInfoDatatoBeReceiptCancel = {
    dataValues: {
      contractId: contractId,
      tenantId: tenantId,
      numberN: '0000011111',
      contractStatus: '30',
      deleteFlag: false,
      createdAt: '2021-01-25T08:45:49.803Z',
      updatedAt: '2021-01-25T08:45:49.803Z'
    }
  }

  // 契約DB値：解約受取中
  const contractInfoDatatoBeReceiptingCancel = {
    dataValues: {
      contractId: contractId,
      tenantId: tenantId,
      numberN: '0000011111',
      contractStatus: '31',
      deleteFlag: false,
      createdAt: '2021-01-25T08:45:49.803Z',
      updatedAt: '2021-01-25T08:45:49.803Z'
    }
  }

  // 契約DB値：データがない場合
  const contractInfoNoData = {
    dataValues: {}
  }

  // 契約DB値：変更申込中
  const contractInfoDatatoBeReceiptChange = {
    dataValues: {
      contractId: contractId,
      tenantId: tenantId,
      numberN: '0000011111',
      contractStatus: '40',
      deleteFlag: false,
      createdAt: '2021-01-25T08:45:49.803Z',
      updatedAt: '2021-01-25T08:45:49.803Z'
    }
  }

  // 契約DB値：変更申込中
  const contractInfoDatatoBeReceiptingChange = {
    dataValues: {
      contractId: contractId,
      tenantId: tenantId,
      numberN: '0000011111',
      contractStatus: '41',
      deleteFlag: false,
      createdAt: '2021-01-25T08:45:49.803Z',
      updatedAt: '2021-01-25T08:45:49.803Z'
    }
  }

  // 検索結果が1件の場合
  const uploadFormatListArrOne = [
    {
      No: 1,
      setName: 'UT1',
      updatedAt: '2021/01/25',
      uploadType: '請求書データ',
      uuid: 'abc54321-fe0c-98qw-076c-7b88d12cfc01'
    }
  ]

  // 検索結果が4件の場合
  const uploadFormatListArrFour = [
    {
      No: 1,
      setName: 'UT1',
      updatedAt: '2021/01/25',
      uploadType: '請求書データ',
      uuid: 'abc54321-fe0c-98qw-076c-7b88d12cfc01'
    },
    {
      No: 2,
      setName: 'UT2',
      updatedAt: '2021/01/25',
      uploadType: '請求書データ',
      uuid: 'abc54321-fe0c-98qw-076c-7b88d12cfc02'
    },
    {
      No: 3,
      setName: 'UT3',
      updatedAt: '2021/01/25',
      uploadType: '請求書データ',
      uuid: 'abc54321-fe0c-98qw-076c-7b88d12cfc03'
    },
    {
      No: 4,
      setName: 'UT4',
      updatedAt: '2021/01/25',
      uploadType: '請求書データ',
      uuid: 'abc54321-fe0c-98qw-076c-7b88d12cfc04'
    }
  ]

  // 検索結果が100件の場合
  const uploadFormatListArrOneHundred = []

  for (let idx = 1; idx < 101; idx++) {
    uploadFormatListArrOneHundred.push({
      No: idx,
      setName: `UT${idx}`,
      updatedAt: '2021/01/25',
      uploadType: '請求書データ',
      uuid: `abc54321-fe0c-98qw-076c-7b88d12cfc0${idx}`
    })
  }

  describe('ルーティング', () => {
    test('uploadFormatListのルーティングを確認', async () => {
      expect(uploadFormatList.router.get).toBeCalledWith('/', helper.isAuthenticated, uploadFormatList.cbGetIndex)
    })
  })

  describe('cbGetIndex', () => {
    test('正常:検索結果が1件の場合', async () => {
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
      getFormatListSpy.mockReturnValue(uploadFormatListArrOne)

      // 試験実施
      await uploadFormatList.cbGetIndex(request, response, next)

      // 期待結果
      // 400,500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(400))
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(500))
      // response.renderでuploadFormatListが呼ばれ「る」
      expect(response.render).toHaveBeenCalledWith('uploadFormatList', {
        uploadFormatListArr: uploadFormatListArrOne
      })
    })

    test('正常:検索結果が4件の場合', async () => {
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
      getFormatListSpy.mockReturnValue(uploadFormatListArrFour)

      // 試験実施
      await uploadFormatList.cbGetIndex(request, response, next)

      // 期待結果
      // 400,500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(400))
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(500))
      // response.renderでuploadFormatListが呼ばれ「る」
      expect(response.render).toHaveBeenCalledWith('uploadFormatList', {
        uploadFormatListArr: uploadFormatListArrFour
      })
    })

    test('正常:検索結果が0件の場合', async () => {
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
      getFormatListSpy.mockReturnValue([])

      // 試験実施
      await uploadFormatList.cbGetIndex(request, response, next)

      // 期待結果
      // 400,500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(400))
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(500))
      // response.renderでuploadFormatListが呼ばれ「る」
      expect(response.render).toHaveBeenCalledWith('uploadFormatList', {
        uploadFormatListArr: []
      })
    })

    test('正常:検索結果が100件の場合', async () => {
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
      getFormatListSpy.mockReturnValue(uploadFormatListArrOneHundred)

      // 試験実施
      await uploadFormatList.cbGetIndex(request, response, next)

      // 期待結果
      // 400,500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(400))
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(500))
      // response.renderでuploadFormatListが呼ばれ「る」
      expect(response.render).toHaveBeenCalledWith('uploadFormatList', {
        uploadFormatListArr: uploadFormatListArrOneHundred
      })
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
      getFormatListSpy.mockReturnValue(uploadFormatListArrOne)

      // 試験実施
      await uploadFormatList.cbGetIndex(request, response, next)

      // 期待結果
      // 400,500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(400))
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(500))
      // response.renderでuploadFormatListが呼ばれ「る」
      expect(response.render).toHaveBeenCalledWith('uploadFormatList', {
        uploadFormatListArr: uploadFormatListArrOne
      })
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
      getFormatListSpy.mockReturnValue(uploadFormatListArrOne)

      // 試験実施
      await uploadFormatList.cbGetIndex(request, response, next)

      // 期待結果
      // 400,500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(400))
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(500))
      // response.renderでuploadFormatListが呼ばれ「る」
      expect(response.render).toHaveBeenCalledWith('uploadFormatList', {
        uploadFormatListArr: uploadFormatListArrOne
      })
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
      getFormatListSpy.mockReturnValue(uploadFormatListArrOne)

      // 試験実施
      await uploadFormatList.cbGetIndex(request, response, next)

      // 期待結果
      // 400,500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(400))
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(500))
      // response.renderでuploadFormatListが呼ばれ「る」
      expect(response.render).toHaveBeenCalledWith('uploadFormatList', {
        uploadFormatListArr: uploadFormatListArrOne
      })
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
      getFormatListSpy.mockReturnValue(uploadFormatListArrOne)

      // 試験実施
      await uploadFormatList.cbGetIndex(request, response, next)

      // 期待結果
      // 400,500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(400))
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(500))
      // response.renderでuploadFormatListが呼ばれ「る」
      expect(response.render).toHaveBeenCalledWith('uploadFormatList', {
        uploadFormatListArr: uploadFormatListArrOne
      })
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
      getFormatListSpy.mockReturnValue(uploadFormatListArrOne)

      // 試験実施
      await uploadFormatList.cbGetIndex(request, response, next)

      // 期待結果
      // 400,500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(400))
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(500))
      // response.renderでuploadFormatListが呼ばれ「る」
      expect(response.render).toHaveBeenCalledWith('uploadFormatList', {
        uploadFormatListArr: uploadFormatListArrOne
      })
    })

    test('準正常：解約申込中の場合', async () => {
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
      getFormatListSpy.mockReturnValue(uploadFormatListArrOne)

      // 試験実施
      await uploadFormatList.cbGetIndex(request, response, next)

      // 期待結果
      // 400,500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(400))
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(500))
      // 解約手続き中画面が表示「される」
      expect(next).toHaveBeenCalledWith(noticeHelper.create('cancelprocedure'))
    })

    test('準正常：解約受取中の場合', async () => {
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
      getFormatListSpy.mockReturnValue(uploadFormatListArrOne)

      // 試験実施
      await uploadFormatList.cbGetIndex(request, response, next)

      // 期待結果
      // 400,500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(400))
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(500))
      // 解約手続き中画面が表示「される」
      expect(next).toHaveBeenCalledWith(noticeHelper.create('cancelprocedure'))
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
      await uploadFormatList.cbGetIndex(request, response, next)

      // 期待結果
      // 404エラーがエラーハンドリング「される」
      expect(next).toHaveBeenCalledWith(error404)
      // 500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(500))
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
        userId: '12345678-cb0b-48ad-857d-4b42a44ede13'
      }

      // DBからの正常なユーザデータの取得を想定する
      findOneSpy.mockReturnValue(userInfoData)
      findOneSpyContracts.mockReturnValue(contractInfoNoData)
      helper.checkContractStatus = 999

      // 試験実施
      await uploadFormatList.cbGetIndex(request, response, next)

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
      await uploadFormatList.cbGetIndex(request, response, next)

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
      await uploadFormatList.cbGetIndex(request, response, next)

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
      await uploadFormatList.cbGetIndex(request, response, next)

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
      await uploadFormatList.cbGetIndex(request, response, next)

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
      await uploadFormatList.cbGetIndex(request, response, next)

      // 期待結果
      // 500エラーがエラーハンドリング「される」
      expect(next).toHaveBeenCalledWith(errorHelper.create(500))
      // response.renderが呼ばれ「ない」
      expect(response.render).not.toHaveBeenCalled()
    })

    test('500エラー：フォーマットDBエラーの場合', async () => {
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
      findOneSpyContracts.mockReturnValue(contractInfoData)
      getFormatListSpy.mockReturnValue(new Error('DB error mock'))

      // 試験実施
      await uploadFormatList.cbGetIndex(request, response, next)

      // 期待結果
      // 500エラーがエラーハンドリング「される」
      expect(next).toHaveBeenCalledWith(errorHelper.create(500))
      // response.renderが呼ばれ「ない」
      expect(response.render).not.toHaveBeenCalled()
    })
  })
})
