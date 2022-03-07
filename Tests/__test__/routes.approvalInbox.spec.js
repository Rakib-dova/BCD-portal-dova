'use strict'

jest.mock('../../Application/node_modules/express', () => {
  return require('jest-express')
})

const approvalInbox = require('../../Application/routes/approvalInbox')
const Request = require('jest-express').Request
const Response = require('jest-express').Response
const next = require('jest-express').Next
const helper = require('../../Application/routes/helpers/middleware')
const errorHelper = require('../../Application/routes/helpers/error')
const noticeHelper = require('../../Application/routes/helpers/notice')
const apiManager = require('../../Application/controllers/apiManager.js')
const userController = require('../../Application/controllers/userController.js')
const contractController = require('../../Application/controllers/contractController.js')
const tenantController = require('../../Application/controllers/tenantController')
const approvalInboxController = require('../../Application/controllers/approvalInboxController')
const inboxController = require('../../Application/controllers/inboxController')
const ApproveRoute = require('../../Application/models').ApproveRoute
const Approver = require('../../Application/models').ApproveUser
const logger = require('../../Application/lib/logger.js')

let request, response, infoSpy, errorSpy
let userControllerFindOneSpy,
  contractControllerFindOneSpy,
  tenantControllerFindOneSpy,
  contractControllerFindContractSpyon,
  approveRoutegetApproveRouteSpy,
  approveRouteFindOne,
  approverFindOne,
  approveRouteFindAll,
  approveRouteUpdate,
  approvalInboxControllerGetRequestApproval,
  approvalInboxControllerHasPowerOfEditing,
  inboxControllerGetInvoiceDetail

// 404エラー定義
const error404 = new Error('お探しのページは見つかりませんでした。')
error404.name = 'Not Found'
error404.status = 404

const user = [
  {
    // 契約ステータス：契約中
    userId: '388014b9-d667-4144-9cc4-5da420981438',
    email: 'dummy@testdummy.com',
    tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089',
    accessToken: 'dummyAccessToken',
    refreshToken: 'dummyRefreshToken'
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
const session = {
  userContext: 'LoggedIn',
  userRole: 'dummy'
}

const resultInvoice = {
  dataValues: {
    invoicesId: '344fb8b1-0416-48db-8a1a-17c080192094',
    tenantId: 'f783be0e-e716-4eab-a7ec-5ce36b3c7b31',
    csvFileName: 'テスト請求書一括作成.csv',
    successCount: -1,
    failCount: -1,
    skipCount: -1,
    createdAt: '2021-08-26T08:01:50.973Z',
    updatedAt: '2021-08-26T08:01:50.973Z'
  }
}

// モックテーブル定義
const Users = require('../mockDB/Users_Table')
const Tenants = require('../mockDB/Tenants_Table')
const Contracts = require('../mockDB/Contracts_Table')

const expectGetRequestApproval = {
  requestId: '221559d0-53aa-44a2-ab29-0c4a6cb02bde',
  contractId: '343b34d1-f4db-484e-b822-8e2ce9017d14',
  invoiceId: '53607702-b94b-4a94-9459-6cf3acd65603',
  message: 'dummyData',
  status: 'dummyData',
  requester: 'dummyUserUUID',
  approveRoute: {
    users: [
      {
        No: 1,
        approveRouteName: 'dummyRouteName',
        approverCount: 'dummyCount',
        id: 'dummyUserUUID'
      }
    ]
  },
  approvals: [
    {
      approvalDate: null,
      approvalId: 'c08ddcbf-c305-455f-89f9-42b53614cb0e',
      approver: {
        No: 1,
        approveRouteName: 'dummyRouteName',
        approverCount: 'dummyCount',
        id: 'dummyUserUUID'
      },
      contractId: 'dummy',
      message: null,
      next: null,
      prev: null,
      request: '221559d0-53aa-44a2-ab29-0c4a6cb02bde',
      status: '10'
    }
  ],

  prevUser: {
    message: null,
    name: null
  }
}

describe('approvalInboxのテスト', () => {
  beforeEach(() => {
    request = new Request()
    response = new Response()
    infoSpy = jest.spyOn(logger, 'info')
    errorSpy = jest.spyOn(logger, 'error')
    apiManager.accessTradeshift = require('../lib/apiManager')
    userControllerFindOneSpy = jest.spyOn(userController, 'findOne')
    contractControllerFindOneSpy = jest.spyOn(contractController, 'findOne')
    tenantControllerFindOneSpy = jest.spyOn(tenantController, 'findOne')
    contractControllerFindContractSpyon = jest.spyOn(contractController, 'findContract')
    approveRoutegetApproveRouteSpy = jest.spyOn(ApproveRoute, 'getApproveRoute')
    approveRouteFindAll = jest.spyOn(ApproveRoute, 'findAll')
    approverFindOne = jest.spyOn(Approver, 'findOne')
    request.flash = jest.fn()
    ApproveRoute.create = jest.fn((initData) => {
      return ApproveRoute.build(initData)
    })
    approveRouteUpdate = jest.spyOn(ApproveRoute, 'update')
    Approver.create = jest.fn((initData) => {
      return Approver.build(initData)
    })
    approveRouteFindOne = jest.spyOn(ApproveRoute, 'findOne')
    approvalInboxControllerGetRequestApproval = jest.spyOn(approvalInboxController, 'getRequestApproval')
    approvalInboxControllerHasPowerOfEditing = jest.spyOn(approvalInboxController, 'hasPowerOfEditing')
    inboxControllerGetInvoiceDetail = jest.spyOn(inboxController, 'getInvoiceDetail')
  })
  afterEach(() => {
    request.resetMocked()
    response.resetMocked()
    next.mockReset()
    infoSpy.mockRestore()
    errorSpy.mockRestore()
    userControllerFindOneSpy.mockRestore()
    contractControllerFindOneSpy.mockRestore()
    tenantControllerFindOneSpy.mockRestore()
    contractControllerFindContractSpyon.mockRestore()
    approveRoutegetApproveRouteSpy.mockRestore()
    approveRouteFindAll.mockRestore()
    approverFindOne.mockRestore()
    approveRouteUpdate.mockRestore()
    approveRouteFindOne.mockRestore()
    approvalInboxControllerGetRequestApproval.mockRestore()
    inboxControllerGetInvoiceDetail.mockRestore()
    approvalInboxControllerHasPowerOfEditing.mockRestore()
  })

  describe('ルーティング', () => {
    test('approvalInboxのルーティングを確認', async () => {
      expect(approvalInbox.router.get).toBeCalledWith('/:invoiceId', helper.isAuthenticated, approvalInbox.cbGetIndex)
    })
  })

  describe('コールバック:cbGetIndex', () => {
    test('正常', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...user[0] }
      request.params = {
        invoiceId: '53607702-b94b-4a94-9459-6cf3acd65603'
      }

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[0])
      // DBからの正常な契約情報取得を想定する
      contractControllerFindOneSpy.mockReturnValue(Contracts[0])

      tenantControllerFindOneSpy.mockReturnValue(Tenants[0])

      contractControllerFindContractSpyon.mockReturnValue(Contracts[0])

      approvalInboxControllerGetRequestApproval.mockReturnValueOnce(expectGetRequestApproval)
      inboxControllerGetInvoiceDetail.mockReturnValue(resultInvoice)
      approvalInboxControllerHasPowerOfEditing.mockReturnValueOnce(true)

      // 試験実施
      await approvalInbox.cbGetIndex(request, response, next)

      // 期待結果
      // userContextがLoggedInになっている
      expect(request.session?.userContext).toBe('LoggedIn')
      // session.userRoleが'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'になっている
      expect(request.session?.userRole).toBe('a6a3edcd-00d9-427c-bf03-4ef0112ba16d')
      // response.renderでapproveRouteListが呼ばれ「る」
      expect(response.render).toHaveBeenCalledWith('approvalInbox', {
        ...resultInvoice,
        title: '承認依頼',
        documentId: request.params.invoiceId,
        approveRoute: expectGetRequestApproval.approveRoute,
        prevUser: expectGetRequestApproval.prevUser
      })
    })

    test('正常:承認ルートデータがない場合', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...user[0] }

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[0])
      // DBからの正常な契約情報取得を想定する
      contractControllerFindOneSpy.mockReturnValue(Contracts[0])

      tenantControllerFindOneSpy.mockReturnValue(Tenants[0])

      contractControllerFindContractSpyon.mockReturnValue(Contracts[0])

      // 承認ルートDB検索結果
      approveRoutegetApproveRouteSpy.mockReturnValueOnce([])

      // 試験実施
      await approvalInbox.cbGetIndex(request, response, next)

      // 期待結果
      // userContextがLoggedInになっている
      expect(request.session?.userContext).toBe('LoggedIn')
      // session.userRoleが'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'になっている
      expect(request.session?.userRole).toBe('a6a3edcd-00d9-427c-bf03-4ef0112ba16d')
      // response.renderでapproveRouteListが呼ばれ「る」
      expect(request.flash).toHaveBeenCalledWith('noti', [
        '承認する支払依頼確認',
        '当該請求書は支払依頼の文書ではありません。'
      ])
      expect(response.redirect).toHaveBeenCalledWith('/inboxList/1')
    })

    test('正常：解約申込中の場合', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...user[1] }

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[6])
      // DBからの正常な契約情報取得を想定する
      contractControllerFindOneSpy.mockReturnValue(Contracts[5])

      tenantControllerFindOneSpy.mockReturnValue(Tenants[5])

      contractControllerFindContractSpyon.mockReturnValue(Contracts[5])

      // 試験実施
      await approvalInbox.cbGetIndex(request, response, next)

      // 期待結果
      // 404，500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(500))
      // userContextがLoggedInになっている
      expect(request.session?.userContext).toBe('LoggedIn')
      // session.userRoleが'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'になっている
      expect(request.session?.userRole).toBe('a6a3edcd-00d9-427c-bf03-4ef0112ba16d')
      // 解約手続き中画面が表示「される」
      expect(next).toHaveBeenCalledWith(noticeHelper.create('cancelprocedure'))
    })

    test('500エラー:不正なContractデータの場合', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...user[1] }

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[0])
      // DBからの正常な契約情報取得を想定する
      contractControllerFindOneSpy.mockReturnValue(Contracts[7])

      tenantControllerFindOneSpy.mockReturnValue(Tenants[1])

      contractControllerFindContractSpyon.mockReturnValue(Contracts[7])

      // 試験実施
      await approvalInbox.cbGetIndex(request, response, next)

      // 期待結果
      // 404エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      // userContextがLoggedInになっている
      expect(request.session?.userContext).toBe('LoggedIn')
      // session.userRoleが'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'になっている
      expect(request.session?.userRole).toBe('a6a3edcd-00d9-427c-bf03-4ef0112ba16d')
      // 500エラーがエラーハンドリング「される」
      expect(next).toHaveBeenCalledWith(errorHelper.create(500))
    })

    test('500エラー：requestのsession,userIdがnullの場合', async () => {
      // 試験実施
      await approvalInbox.cbGetIndex(request, response, next)

      // 期待結果
      // 404エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)

      // 500エラーがエラーハンドリング「される」
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

      // 試験実施
      await approvalInbox.cbGetIndex(request, response, next)

      // 期待結果
      // 404エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)

      // 500エラーがエラーハンドリング「される」
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
      await approvalInbox.cbGetIndex(request, response, next)

      // 期待結果
      // 404エラーがエラーハンドリング「される」
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
      tenantControllerFindOneSpy.mockReturnValue(Tenants[0])
      contractControllerFindOneSpy.mockReturnValue(contractDbError)

      // 試験実施
      await approvalInbox.cbGetIndex(request, response, next)

      // 期待結果
      // 500エラーがエラーハンドリング「される」
      expect(next).toHaveBeenCalledWith(errorHelper.create(500))
    })

    test('500エラー：テナントと契約テーブル検索結果無', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...user[0] }

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[0])
      contractControllerFindOneSpy.mockReturnValue(Contracts[0])
      tenantControllerFindOneSpy.mockReturnValue(null)
      contractControllerFindContractSpyon.mockReturnValue(null)

      // 試験実施
      await approvalInbox.cbGetIndex(request, response, next)

      // 期待結果
      // 500エラーがエラーハンドリング「される」
      expect(next).toHaveBeenCalledWith(errorHelper.create(500))
    })

    test('DBエラー：テーブル検索失敗', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...user[0] }

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[0])
      // DBからの正常な契約情報取得を想定する
      contractControllerFindOneSpy.mockReturnValue(Contracts[0])

      tenantControllerFindOneSpy.mockReturnValue(Tenants[0])

      contractControllerFindContractSpyon.mockReturnValue(Contracts[0])

      const dbError = new Error(
        'SequelizeConnectionError: Failed to connect to localhost:1433 - Could not connect (sequence)'
      )
      dbError.stack = 'SequelizeConnectionError: Failed to connect to localhost:1433 - Could not connect (sequence)'
      approvalInboxControllerGetRequestApproval.mockReturnValueOnce(expectGetRequestApproval)
      approvalInboxControllerHasPowerOfEditing.mockReturnValueOnce(true)
      // DB検索の時エラーが発生
      inboxControllerGetInvoiceDetail.mockImplementation(() => {
        throw dbError
      })

      // 試験実施
      await approvalInbox.cbGetIndex(request, response, next)

      // 期待結果
      // userContextがLoggedInになっている
      expect(request.session?.userContext).toBe('LoggedIn')
      // session.userRoleが'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'になっている
      expect(request.session?.userRole).toBe('a6a3edcd-00d9-427c-bf03-4ef0112ba16d')
      expect(errorSpy).toHaveBeenCalledWith({ stack: dbError.stack, status: 1 })
      expect(request.flash).toHaveBeenCalledWith('noti', ['承認する支払依頼確認', 'システムエラーが発生しました。'])
      expect(response.redirect).toHaveBeenCalledWith('/inboxList/1')
    })
  })
})
