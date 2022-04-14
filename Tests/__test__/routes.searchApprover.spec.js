'use strict'

jest.mock('../../Application/node_modules/express', () => {
  return require('jest-express')
})

const Request = require('jest-express').Request
const Response = require('jest-express').Response
const next = require('jest-express').Next
const logger = require('../../Application/lib/logger')
const searchApprover = require('../../Application/routes/searchApprover')
const helper = require('../../Application/routes/helpers/middleware')
const userController = require('../../Application/controllers/userController')
const contractController = require('../../Application/controllers/contractController.js')
const noticeHelper = require('../../Application/routes/helpers/notice')
const errorHelper = require('../../Application/routes/helpers/error')
const approverController = require('../../Application/controllers/approverController')

// 404エラー定義
const error404 = new Error('お探しのページは見つかりませんでした。')
error404.name = 'Not Found'
error404.status = 404

const user = [
  {
    // 契約ステータス：契約中
    userId: '388014b9-d667-4144-9cc4-5da420981438'
  },
  {
    // 契約ステータス：解約中
    userId: '3b3ff8ac-f544-4eee-a4b0-0ca7a0edacea'
  },
  {
    // ユーザステータス：0以外
    userId: '045fb5fd-7cd1-499e-9e1d-b3635b039d9f'
  }
]

// 正常セッションでの場合
const session = {
  userContext: 'LoggedIn',
  userRole: 'dummy'
}

// 正常セッションではない場合
const notLoggedInsession = {
  userContext: 'dummy',
  userRole: 'dummy'
}

// モックテーブル定義
const Users = require('../mockDB/Users_Table')
const Contracts = require('../mockDB/Contracts_Table')

let errorSpy, infoSpy
let request, response
let userControllerFindOneSpy, contractControllerFindOneSpy, checkContractStatusSpy, approverControllerGetApprover

describe('registApproveRouteのテスト', () => {
  beforeEach(() => {
    request = new Request()
    response = new Response()
    errorSpy = jest.spyOn(logger, 'error')
    infoSpy = jest.spyOn(logger, 'info')
    userControllerFindOneSpy = jest.spyOn(userController, 'findOne')
    contractControllerFindOneSpy = jest.spyOn(contractController, 'findOne')
    checkContractStatusSpy = jest.spyOn(helper, 'checkContractStatus')
    approverControllerGetApprover = jest.spyOn(approverController, 'getApprover')
  })
  afterEach(() => {
    request.resetMocked()
    response.resetMocked()
    next.mockReset()
    errorSpy.mockRestore()
    infoSpy.mockRestore()
    userControllerFindOneSpy.mockRestore()
    contractControllerFindOneSpy.mockRestore()
    checkContractStatusSpy.mockRestore()
    approverControllerGetApprover.mockRestore()
  })

  describe('ルーティング', () => {
    test('searchApproverのルーティングを確認', async () => {
      expect(searchApprover.router.post).toBeCalledWith('', searchApprover.cbPostSearchApprover)
    })
  })

  describe('コールバック:cbGetRegistAccountCode', () => {
    test('正常', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...user[0] }

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[0])
      // DBからの正常な契約情報取得を想定する
      contractControllerFindOneSpy.mockReturnValue(Contracts[0])

      // ユーザ権限チェック結果設定
      checkContractStatusSpy.mockReturnValue(Contracts[0].dataValues.contractStatus)

      const dummyApprover = {
        id: 'dummy-approver',
        name: 'テスト',
        email: 'uttest@test.com'
      }
      // 承認者検索結果
      approverControllerGetApprover.mockReturnValue([dummyApprover])

      // リクエストの準備
      const keyword = {
        firstName: 'テスト',
        lastName: '',
        email: 'uttest@test.com'
      }
      request.body = keyword

      // 試験実施
      await searchApprover.cbPostSearchApprover(request, response, next)

      // 期待結果
      // 検索結果
      expect(response.send).toBeCalledWith([dummyApprover])
    })

    test('準正常：全体検索', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...user[0] }

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[0])
      // DBからの正常な契約情報取得を想定する
      contractControllerFindOneSpy.mockReturnValue(Contracts[0])

      // ユーザ権限チェック結果設定
      checkContractStatusSpy.mockReturnValue(Contracts[0].dataValues.contractStatus)

      const dummyApprover = {
        id: 'dummy-approver',
        name: 'テスト',
        email: 'uttest@test.com'
      }

      const dummyApprover2 = {
        id: 'dummy-approver2',
        name: 'テスト2',
        email: 'uttest2@test.com'
      }
      // 承認者検索結果
      approverControllerGetApprover.mockReturnValue([dummyApprover, dummyApprover2])

      // リクエストの準備
      const keyword = {
        firstName: '',
        lastName: '',
        email: ''
      }
      request.body = keyword

      // 試験実施
      await searchApprover.cbPostSearchApprover(request, response, next)

      // 期待結果
      // 検索結果
      expect(response.send).toBeCalledWith([dummyApprover, dummyApprover2])
    })

    test('エラー：email形式バリデーションチェック', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...user[0] }

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[0])
      // DBからの正常な契約情報取得を想定する
      contractControllerFindOneSpy.mockReturnValue(Contracts[0])

      // ユーザ権限チェック結果設定
      checkContractStatusSpy.mockReturnValue(Contracts[0].dataValues.contractStatus)

      // リクエストの準備
      const keyword = {
        firstName: 'テスト',
        lastName: '',
        email: 'uttest@test,com'
      }
      request.body = keyword

      // 試験実施
      await searchApprover.cbPostSearchApprover(request, response, next)

      // 期待結果
      // 検索結果
      expect(response.status).toBeCalledWith(403)
      expect(response.send).toBeCalledWith('403 client forbidden')
    })

    test('エラー：パラメータ操作して送信', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...user[0] }

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[0])
      // DBからの正常な契約情報取得を想定する
      contractControllerFindOneSpy.mockReturnValue(Contracts[0])

      // ユーザ権限チェック結果設定
      checkContractStatusSpy.mockReturnValue(Contracts[0].dataValues.contractStatus)

      // リクエストの準備
      request.body = {}

      // 試験実施
      await searchApprover.cbPostSearchApprover(request, response, next)

      // 期待結果
      // 検索結果
      expect(response.status).toBeCalledWith(403)
      expect(response.send).toBeCalledWith('403 client forbidden')
    })

    test('エラー：トレードシフトアクセストークンの切れ', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...user[0] }

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[0])
      // DBからの正常な契約情報取得を想定する
      contractControllerFindOneSpy.mockReturnValue(Contracts[0])

      // ユーザ権限チェック結果設定
      checkContractStatusSpy.mockReturnValue(Contracts[0].dataValues.contractStatus)

      // アクセストークンの切れ
      approverControllerGetApprover.mockReturnValue(-1)

      // リクエストの準備
      const keyword = {
        firstName: 'テスト',
        lastName: '',
        email: 'uttest@test.com'
      }
      request.body = keyword

      // 試験実施
      await searchApprover.cbPostSearchApprover(request, response, next)

      // 期待結果
      // 検索結果
      expect(response.status).toBeCalledWith(401)
      expect(response.send).toBeCalledWith('Tradeshift API Access: access failure')
    })

    test('エラー：トレードシフトアクセストークンの切れ', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...user[0] }

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[0])
      // DBからの正常な契約情報取得を想定する
      contractControllerFindOneSpy.mockReturnValue(Contracts[0])

      // ユーザ権限チェック結果設定
      checkContractStatusSpy.mockReturnValue(Contracts[0].dataValues.contractStatus)

      // トレードシフトのシステムエラー
      approverControllerGetApprover.mockReturnValue(-2)

      // リクエストの準備
      const keyword = {
        firstName: 'テスト',
        lastName: '',
        email: 'uttest@test.com'
      }
      request.body = keyword

      // 試験実施
      await searchApprover.cbPostSearchApprover(request, response, next)

      // 期待結果
      // 検索結果
      expect(response.status).toBeCalledWith(500)
      expect(response.send).toBeCalledWith('システムエラー')
    })

    test('正常：解約申込中の場合', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...user[1] }

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[1])
      // DBからの正常な契約情報取得を想定する
      contractControllerFindOneSpy.mockReturnValue(Contracts[5])

      // ユーザ権限チェック結果設定
      checkContractStatusSpy.mockReturnValue(Contracts[5].dataValues.contractStatus)

      await searchApprover.cbPostSearchApprover(request, response, next)

      // 期待結果
      // 404エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)

      // userContextがLoggedInになっている
      expect(request.session?.userContext).toBe('LoggedIn')
      // session.userRoleが'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'になっている
      expect(request.session?.userRole).toBe('a6a3edcd-00d9-427c-bf03-4ef0112ba16d')
      // 解約手続き中画面が表示「される」
      expect(next).toHaveBeenCalledWith(noticeHelper.create('cancelprocedure'))
    })

    test('400エラー:LoggedInではないsessionの場合', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...notLoggedInsession }
      request.user = { ...user[1] }

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[1])
      // DBからの正常な契約情報取得を想定する
      contractControllerFindOneSpy.mockReturnValue(Contracts[1])

      // ユーザ権限チェック結果設定
      checkContractStatusSpy.mockReturnValue(Contracts[5].dataValues.contractStatus)

      await searchApprover.cbPostSearchApprover(request, response, next)

      // 期待結果
      // 404，500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      expect(next).toHaveBeenCalledWith(errorHelper.create(400))
    })

    test('500エラー:不正なContractデータの場合', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...user[1] }

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[1])
      // DBからの正常な契約情報取得を想定する
      contractControllerFindOneSpy.mockReturnValue(null)

      await searchApprover.cbPostSearchApprover(request, response, next)

      // 期待結果
      // 404，500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      // expect(next).not.toHaveBeenCalledWith(errorHelper.create(500))
      // userContextがLoggedInになっている
      expect(request.session?.userContext).toBe('LoggedIn')
      // 解約手続き中画面が表示「される」
      expect(next).toHaveBeenCalledWith(errorHelper.create(500))
    })

    test('500エラー：requestのsession,userIdがnullの場合', async () => {
      // 実施
      await searchApprover.cbPostSearchApprover(request, response, next)

      // 期待結果
      // 404，500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)

      // 解約手続き中画面が表示「される」
      expect(next).toHaveBeenCalledWith(errorHelper.create(500))
    })

    test('500エラー：user検索の時、DBエラー', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...user[2] }

      // DBからの正常なユーザデータの取得を想定する
      const userDbError = new Error('User Table Error')
      userControllerFindOneSpy.mockReturnValue(userDbError)

      await searchApprover.cbPostSearchApprover(request, response, next)

      // 期待結果
      // 404，500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)

      // 解約手続き中画面が表示「される」
      expect(next).toHaveBeenCalledWith(errorHelper.create(500))
    })

    test('500エラー：user.statusが0ではない場合', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...user[2] }

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[8])

      // 試験実施
      await searchApprover.cbPostSearchApprover(request, response, next)

      // 期待結果
      expect(next).toHaveBeenCalledWith(errorHelper.create(404))
    })

    test('500エラー：contracts検索の時、DBエラー', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...user[0] }

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[0])
      const contractDbError = new Error('Contracts Table Error')
      contractControllerFindOneSpy.mockReturnValue(contractDbError)

      // 試験実施
      await searchApprover.cbPostSearchApprover(request, response, next)

      // 期待結果
      expect(next).toHaveBeenCalledWith(errorHelper.create(500))
    })

    test('500エラー：不正なcheckContractStatus(null)', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...user[0] }

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[1])
      // DBからの正常な契約情報取得を想定する
      contractControllerFindOneSpy.mockReturnValue(Contracts[1])

      // ユーザ権限チェック結果設定
      checkContractStatusSpy.mockReturnValue(null)

      // 試験実施
      await searchApprover.cbPostSearchApprover(request, response, next)

      // 期待結果
      // 404エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      expect(next).toHaveBeenCalledWith(errorHelper.create(500))
    })

    test('500エラー：不正なcheckContractStatus(999)', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...user[0] }

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[1])
      // DBからの正常な契約情報取得を想定する
      contractControllerFindOneSpy.mockReturnValue(Contracts[1])

      // ユーザ権限チェック結果設定
      checkContractStatusSpy.mockReturnValue(999)

      // 試験実施
      await searchApprover.cbPostSearchApprover(request, response, next)

      // 期待結果
      // 404エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      expect(next).toHaveBeenCalledWith(errorHelper.create(500))
    })
  })
})
