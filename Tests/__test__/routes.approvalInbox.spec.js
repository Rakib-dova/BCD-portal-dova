'use strict'

jest.mock('../../Application/node_modules/express', () => {
  return require('jest-express')
})

jest.mock('../../Application/lib/sendMail')
jest.mock('../../Application/DTO/TradeshiftDTO')

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
const requestApprovalController = require('../../Application/controllers/requestApprovalController')
const approvalInboxController = require('../../Application/controllers/approvalInboxController')
const approverController = require('../../Application/controllers/approverController')
const inboxController = require('../../Application/controllers/inboxController')
const ApproveRoute = require('../../Application/models').ApproveRoute
const Approver = require('../../Application/models').ApproveUser
const logger = require('../../Application/lib/logger.js')
const sendMail = require('../../Application/lib/sendMail')
const TradeshiftDTO = require('../../Application/DTO/TradeshiftDTO')

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
  approvalInboxControllerInsertAndUpdateJournalizeInvoice,
  inboxControllerGetInvoiceDetail,
  approverControllerUpdateApprove,
  sendMailSpy,
  requestApprovalControllerFindOneRequestApprovalSpy,
  tradeshiftDTOSpy

// 404エラー定義
const error404 = new Error('お探しのページは見つかりませんでした。')
error404.name = 'Not Found'
error404.status = 404

const notSession = {
  userContext: 'NotLoggedIn',
  userRole: 'dummy'
}

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
const UserAccounts = require('../../Application/DTO/VO/UserAccounts')
const findUser = require('../mockDB/TradeshiftFindUser')

const expectGetRequestApproval = {
  requestId: '221559d0-53aa-44a2-ab29-0c4a6cb02bde',
  contractId: '343b34d1-f4db-484e-b822-8e2ce9017d14',
  invoiceId: '53607702-b94b-4a94-9459-6cf3acd65603',
  message: '支払依頼します。',
  status: '20',
  approveRoute: {
    name: undefined,
    users: [
      UserAccounts.setUserAccounts(findUser[0]),
      UserAccounts.setUserAccounts(findUser[1]),
      UserAccounts.setUserAccounts(findUser[2]),
      UserAccounts.setUserAccounts(findUser[3]),
      UserAccounts.setUserAccounts(findUser[4]),
      UserAccounts.setUserAccounts(findUser[5]),
      UserAccounts.setUserAccounts(findUser[6]),
      UserAccounts.setUserAccounts(findUser[7]),
      UserAccounts.setUserAccounts(findUser[8]),
      UserAccounts.setUserAccounts(findUser[9]),
      UserAccounts.setUserAccounts(findUser[10])
    ]
  },
  approvals: [],
  prevUser: { name: '管理者 10次', message: '' },
  requester: {
    no: '支払依頼',
    name: '支払 依頼者',
    status: '依頼済み',
    requestedAt: '2022-3-17 0:59:59'
  }
}

const expectGetRequestApproval2 = {
  requestId: '221559d0-53aa-44a2-ab29-0c4a6cb02bde',
  contractId: '343b34d1-f4db-484e-b822-8e2ce9017d14',
  invoiceId: '53607702-b94b-4a94-9459-6cf3acd65603',
  message: '支払依頼します。',
  status: '00',
  approveRoute: {
    name: undefined,
    users: [
      UserAccounts.setUserAccounts(findUser[0]),
      UserAccounts.setUserAccounts(findUser[1]),
      UserAccounts.setUserAccounts(findUser[2]),
      UserAccounts.setUserAccounts(findUser[3]),
      UserAccounts.setUserAccounts(findUser[4]),
      UserAccounts.setUserAccounts(findUser[5]),
      UserAccounts.setUserAccounts(findUser[6]),
      UserAccounts.setUserAccounts(findUser[7]),
      UserAccounts.setUserAccounts(findUser[8]),
      UserAccounts.setUserAccounts(findUser[9]),
      UserAccounts.setUserAccounts(findUser[10])
    ]
  },
  approvals: [],
  prevUser: { name: '管理者 11次', message: '' },
  requester: {
    no: '支払依頼',
    name: '支払 依頼者',
    status: '依頼済み',
    requestedAt: '2022-3-17 0:59:59'
  }
}

const expectGetRequestApproval3 = [
  {
    requestId: '221559d0-53aa-44a2-ab29-0c4a6cb02bde',
    contractId: '343b34d1-f4db-484e-b822-8e2ce9017d14',
    invoiceId: '53607702-b94b-4a94-9459-6cf3acd65603',
    message: '支払依頼します。',
    status: '20',
    approveRoute: {
      name: undefined,
      users: [
        UserAccounts.setUserAccounts(findUser[0]),
        UserAccounts.setUserAccounts(findUser[1]),
        UserAccounts.setUserAccounts(findUser[2]),
        UserAccounts.setUserAccounts(findUser[3]),
        UserAccounts.setUserAccounts(findUser[4]),
        UserAccounts.setUserAccounts(findUser[5]),
        UserAccounts.setUserAccounts(findUser[6]),
        UserAccounts.setUserAccounts(findUser[7]),
        UserAccounts.setUserAccounts(findUser[8]),
        UserAccounts.setUserAccounts(findUser[9]),
        UserAccounts.setUserAccounts(findUser[10])
      ]
    },
    approvals: [],
    requester: {
      no: '支払依頼',
      name: '支払 依頼者',
      status: '依頼済み',
      requestedAt: '2022-3-17 0:59:59',
      message: '支払依頼メッセージ'
    }
  }
]

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
    approvalInboxControllerInsertAndUpdateJournalizeInvoice = jest.spyOn(
      approvalInboxController,
      'insertAndUpdateJournalizeInvoice'
    )
    approverControllerUpdateApprove = jest.spyOn(approverController, 'updateApprove')
    sendMailSpy = jest.spyOn(sendMail, 'mail')
    requestApprovalControllerFindOneRequestApprovalSpy = jest.spyOn(requestApprovalController, 'findOneRequestApproval')
    tradeshiftDTOSpy = jest.spyOn(TradeshiftDTO.prototype, 'findUser')
    request.csrfToken = jest.fn()
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
    approvalInboxControllerInsertAndUpdateJournalizeInvoice.mockRestore()
    approverControllerUpdateApprove.mockRestore()
    sendMailSpy.mockRestore()
    requestApprovalControllerFindOneRequestApprovalSpy.mockRestore()
    tradeshiftDTOSpy.mockRestore()
  })

  describe('ルーティング', () => {
    test('approvalInboxのルーティングを確認', async () => {
      expect(approvalInbox.router.get).toBeCalledWith(
        '/:invoiceId',
        helper.isAuthenticated,
        expect.anything(),
        approvalInbox.cbGetIndex
      )

      expect(approvalInbox.router.post).toBeCalledWith(
        '/:invoiceId',
        helper.isAuthenticated,
        expect.anything(),
        approvalInbox.cbPostApprove
      )
    })
  })

  describe('コールバック:cbGetIndex', () => {
    test('正常:次の承認者にはメールで通知が送られ', async () => {
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

      approvalInboxControllerGetRequestApproval.mockReturnValueOnce(expectGetRequestApproval3)
      inboxControllerGetInvoiceDetail.mockReturnValue(resultInvoice)
      approvalInboxControllerHasPowerOfEditing.mockReturnValueOnce(true)

      // 試験実施
      await approvalInbox.cbGetIndex(request, response, next)

      // 期待結果
      // userContextがLoggedInになっている
      expect(request.session?.userContext).toBe('LoggedIn')
      // session.userRoleが'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'になっている
      expect(request.session?.userRole).toBe('a6a3edcd-00d9-427c-bf03-4ef0112ba16d')
      // response.renderでapprovalInboxが呼ばれ「る」
      console.log(response.render)
      expect(response.render).toHaveBeenCalledWith('approvalInbox', {
        ...resultInvoice,
        title: '支払依頼',
        documentId: request.params.invoiceId,
        requestApprovals: expectGetRequestApproval3,
        requestId: expectGetRequestApproval3[0].requestId
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
      approvalInboxControllerGetRequestApproval.mockReturnValueOnce(expectGetRequestApproval3)
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
  describe('コールバック:cbPostApprove', () => {
    test('正常:次の承認者にはメールで通知成功', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session, requestApproval: { approval: 'test' } }
      request.user = { ...user[0] }
      request.params = {
        invoiceId: '53607702-b94b-4a94-9459-6cf3acd65603'
      }
      request.body = {
        lineId: 1,
        lineNo: 1,
        lineNo1_lineAccountCode1_accountCode: '001',
        lineNo1_lineAccountCode1_subAccountCode: '001',
        lineNo1_lineAccountCode1_departmentCode: '001',
        lineNo1_lineAccountCode1_input_amount: '99,991',
        message: '1234567890'
      }

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[0])
      // DBからの正常な契約情報取得を想定する
      contractControllerFindOneSpy.mockReturnValue(Contracts[0])

      tenantControllerFindOneSpy.mockReturnValue(Tenants[0])

      contractControllerFindContractSpyon.mockReturnValue(Contracts[0])

      inboxControllerGetInvoiceDetail.mockReturnValue(resultInvoice)
      approvalInboxControllerHasPowerOfEditing.mockReturnValueOnce(true)
      approvalInboxControllerInsertAndUpdateJournalizeInvoice.mockReturnValue({
        status: 0,
        lineId: 'lineAccountCode4',
        accountCode: 'AB001',
        subAccountCode: 'SU001',
        error: undefined
      })
      approverControllerUpdateApprove.mockReturnValue(true)

      // mailContent関数の想定値
      apiManager.accessTradeshift = jest.fn()
      apiManager.accessTradeshift.mockReturnValue({
        ID: {
          value: 'UTテストコード'
        }
      })
      requestApprovalControllerFindOneRequestApprovalSpy.mockReturnValueOnce(expectGetRequestApproval)
      approvalInboxControllerGetRequestApproval.mockReturnValueOnce(expectGetRequestApproval)

      sendMailSpy.mockReturnValue(0)

      // 試験実施
      await approvalInbox.cbPostApprove(request, response, next)

      // 期待結果
      // 404がエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      // userContextがLoggedInになっている
      expect(request.session?.userContext).toBe('LoggedIn')
      // session.userRoleが'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'になっている
      expect(request.session?.userRole).toBe('a6a3edcd-00d9-427c-bf03-4ef0112ba16d')
      // response.renderでapproveRouteListが呼ばれ「る」
      expect(request.flash).toHaveBeenCalledWith('info', '承認を完了しました。次の承認者にはメールで通知が送られます。')
      expect(response.redirect).toHaveBeenCalledWith('/inboxList/1')
    })

    test('正常:メッセージが1500文字以下の場合', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session, requestApproval: { approval: 'test' } }
      request.user = { ...user[0] }
      request.params = {
        invoiceId: '53607702-b94b-4a94-9459-6cf3acd65603'
      }
      request.body = {
        lineId: 1,
        lineNo: 1,
        lineNo1_lineAccountCode1_accountCode: '001',
        lineNo1_lineAccountCode1_subAccountCode: '001',
        lineNo1_lineAccountCode1_departmentCode: '001',
        lineNo1_lineAccountCode1_input_amount: '99,991',
        message: '1234567890'
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
      approvalInboxControllerInsertAndUpdateJournalizeInvoice.mockReturnValue({
        status: 0,
        lineId: 'lineAccountCode4',
        accountCode: 'AB001',
        subAccountCode: 'SU001',
        error: undefined
      })
      approverControllerUpdateApprove.mockReturnValue(true)

      // mailContent関数の想定値
      apiManager.accessTradeshift = jest.fn()
      apiManager.accessTradeshift.mockReturnValue({
        ID: {
          value: 'UTテストコード'
        }
      })
      requestApprovalControllerFindOneRequestApprovalSpy.mockReturnValueOnce(expectGetRequestApproval)
      approvalInboxControllerGetRequestApproval.mockReturnValueOnce(expectGetRequestApproval)

      sendMailSpy.mockReturnValue(0)

      // 試験実施
      await approvalInbox.cbPostApprove(request, response, next)

      // 期待結果
      // 404がエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      // userContextがLoggedInになっている
      expect(request.session?.userContext).toBe('LoggedIn')
      // session.userRoleが'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'になっている
      expect(request.session?.userRole).toBe('a6a3edcd-00d9-427c-bf03-4ef0112ba16d')
      // response.renderでapproveRouteListが呼ばれ「る」
      expect(request.flash).toHaveBeenCalledWith('info', '承認を完了しました。次の承認者にはメールで通知が送られます。')
      expect(response.redirect).toHaveBeenCalledWith('/inboxList/1')
    })

    test('正常:依頼者にメールで通知成功', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session, requestApproval: { approval: 'test' } }
      request.user = { ...user[0] }
      request.params = {
        invoiceId: '53607702-b94b-4a94-9459-6cf3acd65603'
      }
      request.body = {
        lineId: 1,
        lineNo: 1,
        lineNo1_lineAccountCode1_accountCode: '001',
        lineNo1_lineAccountCode1_subAccountCode: '001',
        lineNo1_lineAccountCode1_departmentCode: '001',
        lineNo1_lineAccountCode1_input_amount: '99,991',
        message: '1234567890'
      }

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[0])
      // DBからの正常な契約情報取得を想定する
      contractControllerFindOneSpy.mockReturnValue(Contracts[0])

      tenantControllerFindOneSpy.mockReturnValue(Tenants[0])

      contractControllerFindContractSpyon.mockReturnValue(Contracts[0])

      approvalInboxControllerGetRequestApproval.mockReturnValueOnce(expectGetRequestApproval2)
      inboxControllerGetInvoiceDetail.mockReturnValue(resultInvoice)
      approvalInboxControllerHasPowerOfEditing.mockReturnValueOnce(true)
      approvalInboxControllerInsertAndUpdateJournalizeInvoice.mockReturnValue({
        status: 0,
        lineId: 'lineAccountCode4',
        accountCode: 'AB001',
        subAccountCode: 'SU001',
        error: undefined
      })
      approverControllerUpdateApprove.mockReturnValue(true)

      // mailContent関数の想定値
      apiManager.accessTradeshift = jest.fn()
      apiManager.accessTradeshift.mockReturnValue({
        ID: {
          value: 'UTテストコード'
        }
      })
      requestApprovalControllerFindOneRequestApprovalSpy.mockReturnValueOnce(expectGetRequestApproval2)
      tradeshiftDTOSpy.mockImplementation(async () => {
        return UserAccounts.setUserAccounts(findUser[16])
      })
      sendMailSpy.mockReturnValue(0)

      // 試験実施
      await approvalInbox.cbPostApprove(request, response, next)

      // 期待結果
      // 404がエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      // userContextがLoggedInになっている
      expect(request.session?.userContext).toBe('LoggedIn')
      // session.userRoleが'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'になっている
      expect(request.session?.userRole).toBe('a6a3edcd-00d9-427c-bf03-4ef0112ba16d')
      // response.renderでapproveRouteListが呼ばれ「る」
      expect(request.flash).toHaveBeenCalledWith('info', '承認を完了しました。依頼者にはメールで通知が送られます。')
      expect(response.redirect).toHaveBeenCalledWith('/inboxList/1')
    })

    test('準正常:メールで通知失敗', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session, requestApproval: { approval: 'test' } }
      request.user = { ...user[0] }
      request.params = {
        invoiceId: '53607702-b94b-4a94-9459-6cf3acd65603'
      }
      request.body = {
        lineId: 1,
        lineNo: 1,
        lineNo1_lineAccountCode1_accountCode: '001',
        lineNo1_lineAccountCode1_subAccountCode: '001',
        lineNo1_lineAccountCode1_departmentCode: '001',
        lineNo1_lineAccountCode1_input_amount: '99,991',
        message: '1234567890'
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
      approvalInboxControllerInsertAndUpdateJournalizeInvoice.mockReturnValue({
        status: 0,
        lineId: 'lineAccountCode4',
        accountCode: 'AB001',
        subAccountCode: 'SU001',
        error: undefined
      })
      approverControllerUpdateApprove.mockReturnValue(true)
      // mailContent関数の想定値
      apiManager.accessTradeshift = jest.fn()
      apiManager.accessTradeshift.mockReturnValue({
        ID: {
          value: 'UTテストコード'
        }
      })
      requestApprovalControllerFindOneRequestApprovalSpy.mockReturnValueOnce(expectGetRequestApproval2)
      tradeshiftDTOSpy.mockImplementation(async () => {
        return UserAccounts.setUserAccounts(findUser[16])
      })
      sendMailSpy.mockReturnValue(1)

      // 試験実施
      await approvalInbox.cbPostApprove(request, response, next)

      // 期待結果
      // 404がエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      // userContextがLoggedInになっている
      expect(request.session?.userContext).toBe('LoggedIn')
      // session.userRoleが'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'になっている
      expect(request.session?.userRole).toBe('a6a3edcd-00d9-427c-bf03-4ef0112ba16d')
      // response.renderでapproveRouteListが呼ばれ「る」
      expect(request.flash).toHaveBeenCalledWith(
        'error',
        '承認を完了しました。メールの通知に失敗しましたので、次の承認者に連絡をとってください。'
      )
      expect(response.redirect).toHaveBeenCalledWith('/inboxList/1')
    })

    test('正常：依頼者・承認ルートに含まれていない場合', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session, requestApproval: { approval: 'test' } }
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
      approvalInboxControllerHasPowerOfEditing.mockReturnValueOnce(false)

      // 試験実施
      await approvalInbox.cbPostApprove(request, response, next)

      // 期待結果
      // 404がエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      // userContextがLoggedInになっている
      expect(request.session?.userContext).toBe('LoggedIn')
      // session.userRoleが'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'になっている
      expect(request.session?.userRole).toBe('a6a3edcd-00d9-427c-bf03-4ef0112ba16d')
      // response.renderでapproveRouteListが呼ばれ「る」
      expect(response.redirect).toHaveBeenCalledWith(`/approvalInbox/${request.params.invoiceId}`)
    })

    test('エラー：承認失敗', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session, requestApproval: { approval: 'test' } }
      request.user = { ...user[0] }
      request.params = {
        invoiceId: '53607702-b94b-4a94-9459-6cf3acd65603'
      }
      request.body = {
        lineId: 1,
        lineNo: 1,
        lineNo1_lineAccountCode1_accountCode: '001',
        lineNo1_lineAccountCode1_subAccountCode: '001',
        lineNo1_lineAccountCode1_departmentCode: '001',
        lineNo1_lineAccountCode1_input_amount: '99,991',
        message: '1234567890'
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
      approvalInboxControllerInsertAndUpdateJournalizeInvoice.mockReturnValue({
        status: 0,
        lineId: 'lineAccountCode4',
        accountCode: 'AB001',
        subAccountCode: 'SU001',
        error: undefined
      })
      approverControllerUpdateApprove.mockReturnValue(false)

      // 試験実施
      await approvalInbox.cbPostApprove(request, response, next)

      // 期待結果
      // 404がエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      // userContextがLoggedInになっている
      expect(request.session?.userContext).toBe('LoggedIn')
      // session.userRoleが'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'になっている
      expect(request.session?.userRole).toBe('a6a3edcd-00d9-427c-bf03-4ef0112ba16d')
      // response.renderでapproveRouteListが呼ばれ「る」
      expect(request.flash).toHaveBeenCalledWith('noti', ['支払依頼', '承認に失敗しました。'])
      expect(response.redirect).toHaveBeenCalledWith(`/approvalInbox/${request.params.invoiceId}`)
    })

    test('エラー:セッションが消えた場合', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...user[0] }
      request.params = {
        invoiceId: '53607702-b94b-4a94-9459-6cf3acd65603'
      }
      request.body = {
        lineId: 1,
        lineNo: 1,
        lineNo1_lineAccountCode1_accountCode: '001',
        lineNo1_lineAccountCode1_subAccountCode: '001',
        lineNo1_lineAccountCode1_departmentCode: '001',
        lineNo1_lineAccountCode1_input_amount: '99,991',
        message: '1234567890'
      }

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[0])
      // DBからの正常な契約情報取得を想定する
      contractControllerFindOneSpy.mockReturnValue(Contracts[0])

      tenantControllerFindOneSpy.mockReturnValue(Tenants[0])

      contractControllerFindContractSpyon.mockReturnValue(Contracts[0])

      // 試験実施
      await approvalInbox.cbPostApprove(request, response, next)

      // 期待結果
      // 404がエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      // userContextがLoggedInになっている
      expect(request.session?.userContext).toBe('LoggedIn')
      // session.userRoleが'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'になっている
      expect(request.session?.userRole).toBe('a6a3edcd-00d9-427c-bf03-4ef0112ba16d')
      // response.renderでapproveRouteListが呼ばれ「る」
      expect(request.flash).toHaveBeenCalledWith('alertNotification', [
        '支払依頼',
        'システムエラーが発生しました。\nもう一度操作してください。'
      ])
      expect(response.redirect).toHaveBeenCalledWith(`/approvalInbox/${request.params.invoiceId}`)
    })

    test('正常：不正な勘定科目の場合', async () => {
      // 準備
      const lineId = 'lineAccountCode4'
      const accountCode = 'AB001'
      const subAccountCode = 'SU111'

      // requestのsession,userIdに正常値を入れる
      request.session = { ...session, requestApproval: { approval: 'test' } }
      request.user = { ...user[0] }
      request.params = {
        invoiceId: '53607702-b94b-4a94-9459-6cf3acd65603'
      }
      request.body = {
        lineId: 1,
        lineNo: 1,
        lineNo1_lineAccountCode1_accountCode: '001',
        lineNo1_lineAccountCode1_subAccountCode: '001',
        lineNo1_lineAccountCode1_departmentCode: '001',
        lineNo1_lineAccountCode1_input_amount: '99,991',
        message: '1234567890'
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
      approvalInboxControllerInsertAndUpdateJournalizeInvoice.mockReturnValue({
        status: -1,
        lineId: lineId,
        accountCode: accountCode,
        subAccountCode: subAccountCode,
        error: undefined
      })

      // 試験実施
      await approvalInbox.cbPostApprove(request, response, next)

      // 期待結果
      // 404がエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      // userContextがLoggedInになっている
      expect(request.session?.userContext).toBe('LoggedIn')
      // session.userRoleが'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'になっている
      expect(request.session?.userRole).toBe('a6a3edcd-00d9-427c-bf03-4ef0112ba16d')
      // response.renderでapproveRouteListが呼ばれ「る」
      expect(request.flash).toHaveBeenCalledWith('noti', [
        '支払依頼',
        `仕訳情報設定が完了できませんでした。<BR>※明細ID「${lineId}」の勘定科目「${accountCode}」は未登録勘定科目です。`,
        'SYSERR'
      ])
      expect(response.redirect).toHaveBeenCalledWith(`/approvalInbox/${request.params.invoiceId}`)
    })

    test('正常：不正な補助科目の場合', async () => {
      // 準備
      const lineId = 'lineAccountCode4'
      const subAccountCode = 'SU111'

      // requestのsession,userIdに正常値を入れる
      request.session = { ...session, requestApproval: { approval: 'test' } }
      request.user = { ...user[0] }
      request.params = {
        invoiceId: '53607702-b94b-4a94-9459-6cf3acd65603'
      }
      request.body = {
        lineId: 1,
        lineNo: 1,
        lineNo1_lineAccountCode1_accountCode: '001',
        lineNo1_lineAccountCode1_subAccountCode: '001',
        lineNo1_lineAccountCode1_departmentCode: '001',
        lineNo1_lineAccountCode1_input_amount: '99,991',
        message: '1234567890'
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
      approvalInboxControllerInsertAndUpdateJournalizeInvoice.mockReturnValue({
        status: -2,
        lineId: lineId,
        accountCode: 'AB001',
        subAccountCode: subAccountCode,
        error: undefined
      })

      // 試験実施
      await approvalInbox.cbPostApprove(request, response, next)

      // 期待結果
      // 404がエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      // userContextがLoggedInになっている
      expect(request.session?.userContext).toBe('LoggedIn')
      // session.userRoleが'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'になっている
      expect(request.session?.userRole).toBe('a6a3edcd-00d9-427c-bf03-4ef0112ba16d')
      // response.renderでapproveRouteListが呼ばれ「る」
      expect(request.flash).toHaveBeenCalledWith('noti', [
        '支払依頼',
        `仕訳情報設定が完了できませんでした。<BR>※明細ID「${lineId}」の補助科目「${subAccountCode}」は未登録補助科目です。`,
        'SYSERR'
      ])
      expect(response.redirect).toHaveBeenCalledWith(`/approvalInbox/${request.params.invoiceId}`)
    })

    test('正常：不正な部門データの場合', async () => {
      // 準備
      const lineId = 'lineAccountCode4'
      const departmentCode = 'DE001'

      // requestのsession,userIdに正常値を入れる
      request.session = { ...session, requestApproval: { approval: 'test' } }
      request.user = { ...user[0] }
      request.params = {
        invoiceId: '53607702-b94b-4a94-9459-6cf3acd65603'
      }
      request.body = {
        lineId: 1,
        lineNo: 1,
        lineNo1_lineAccountCode1_accountCode: '001',
        lineNo1_lineAccountCode1_subAccountCode: '001',
        lineNo1_lineAccountCode1_departmentCode: '001',
        lineNo1_lineAccountCode1_input_amount: '99,991',
        message: '1234567890'
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
      approvalInboxControllerInsertAndUpdateJournalizeInvoice.mockReturnValue({
        status: -3,
        lineId: lineId,
        accountCode: 'DE001',
        departmentCode: departmentCode,
        error: undefined
      })

      // 試験実施
      await approvalInbox.cbPostApprove(request, response, next)

      // 期待結果
      // 404がエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      // userContextがLoggedInになっている
      expect(request.session?.userContext).toBe('LoggedIn')
      // session.userRoleが'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'になっている
      expect(request.session?.userRole).toBe('a6a3edcd-00d9-427c-bf03-4ef0112ba16d')
      // response.renderでapproveRouteListが呼ばれ「る」
      expect(request.flash).toHaveBeenCalledWith('noti', [
        '支払依頼',
        `仕訳情報設定が完了できませんでした。<BR>※明細ID「${lineId}」の部門データ「${departmentCode}」は未登録部門データです。`,
        'SYSERR'
      ])
      expect(response.redirect).toHaveBeenCalledWith(`/approvalInbox/${request.params.invoiceId}`)
    })

    test('異常:hasPowerOfEditingがFalseの場合（ログインユーザが承認直前のステータス確認で先に承認順が変わった場合→重複承認の対応）', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session, requestApproval: { approval: 'test' } }
      request.user = { ...user[0] }
      request.params = {
        invoiceId: '53607702-b94b-4a94-9459-6cf3acd65603'
      }
      request.body = {
        lineId: 1,
        lineNo: 1,
        lineNo1_lineAccountCode1_accountCode: '001',
        lineNo1_lineAccountCode1_subAccountCode: '001',
        lineNo1_lineAccountCode1_departmentCode: '001',
        lineNo1_lineAccountCode1_input_amount: '99,991',
        message: '1234567890'
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
      approvalInboxControllerInsertAndUpdateJournalizeInvoice.mockReturnValue({
        status: 0,
        lineId: 'lineAccountCode4',
        accountCode: 'AB001',
        subAccountCode: 'SU001',
        error: undefined
      })
      approverControllerUpdateApprove.mockReturnValue(-1)

      // mailContent関数の想定値
      apiManager.accessTradeshift = jest.fn()
      apiManager.accessTradeshift.mockReturnValue({
        ID: {
          value: 'UTテストコード'
        }
      })
      requestApprovalControllerFindOneRequestApprovalSpy.mockReturnValueOnce(expectGetRequestApproval)
      approvalInboxControllerGetRequestApproval.mockReturnValueOnce(expectGetRequestApproval)

      sendMailSpy.mockReturnValue(0)

      // 試験実施
      await approvalInbox.cbPostApprove(request, response, next)

      // 期待結果
      // 404がエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      // userContextがLoggedInになっている
      expect(request.session?.userContext).toBe('LoggedIn')
      // session.userRoleが'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'になっている
      expect(request.session?.userRole).toBe('a6a3edcd-00d9-427c-bf03-4ef0112ba16d')
      // response.renderでapproveRouteListが呼ばれ「る」
      expect(request.flash).toHaveBeenCalledWith('error', '承認に失敗しました。')
      expect(response.redirect).toHaveBeenCalledWith('/inboxList/1')
    })

    test('異常:権限がないユーザーがデータを操作して承認するテスト', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session, requestApproval: { approval: 'test' } }
      request.user = { ...user[0] }
      request.params = {
        invoiceId: '53607702-b94b-4a94-9459-6cf3acd65603'
      }
      request.body = {
        lineId: 1,
        lineNo: 1,
        lineNo1_lineAccountCode1_accountCode: '001',
        lineNo1_lineAccountCode1_subAccountCode: '001',
        lineNo1_lineAccountCode1_departmentCode: '001',
        lineNo1_lineAccountCode1_input_amount: '99,991',
        message: '1234567890'
      }

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[0])
      // DBからの正常な契約情報取得を想定する
      contractControllerFindOneSpy.mockReturnValue(Contracts[0])

      tenantControllerFindOneSpy.mockReturnValue(Tenants[0])

      contractControllerFindContractSpyon.mockReturnValue(Contracts[0])

      approvalInboxControllerGetRequestApproval.mockReturnValueOnce(expectGetRequestApproval)
      inboxControllerGetInvoiceDetail.mockReturnValue(resultInvoice)
      approvalInboxControllerHasPowerOfEditing.mockReturnValueOnce(false)
      approvalInboxControllerInsertAndUpdateJournalizeInvoice.mockReturnValue({
        status: 0,
        lineId: 'lineAccountCode4',
        accountCode: 'AB001',
        subAccountCode: 'SU001',
        error: undefined
      })
      approverControllerUpdateApprove.mockReturnValue(-1)

      // mailContent関数の想定値
      apiManager.accessTradeshift = jest.fn()
      apiManager.accessTradeshift.mockReturnValue({
        ID: {
          value: 'UTテストコード'
        }
      })
      requestApprovalControllerFindOneRequestApprovalSpy.mockReturnValueOnce(expectGetRequestApproval)
      approvalInboxControllerGetRequestApproval.mockReturnValueOnce(expectGetRequestApproval)

      sendMailSpy.mockReturnValue(0)

      // 試験実施
      await approvalInbox.cbPostApprove(request, response, next)

      // 期待結果
      // 404がエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      // userContextがLoggedInになっている
      expect(request.session?.userContext).toBe('LoggedIn')
      // session.userRoleが'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'になっている
      expect(request.session?.userRole).toBe('a6a3edcd-00d9-427c-bf03-4ef0112ba16d')
      // response.renderでapproveRouteListが呼ばれ「る」
      expect(response.redirect).toHaveBeenCalledWith('/approvalInbox/53607702-b94b-4a94-9459-6cf3acd65603')
    })

    test('エラー：不正な部門データの場合', async () => {
      // 準備
      const lineId = 'lineAccountCode4'
      const subAccountCode = 'SU001'

      // requestのsession,userIdに正常値を入れる
      request.session = { ...session, requestApproval: { approval: 'test' } }
      request.user = { ...user[0] }
      request.params = {
        invoiceId: '53607702-b94b-4a94-9459-6cf3acd65603'
      }
      request.body = {
        lineId: 1,
        lineNo: 1,
        lineNo1_lineAccountCode1_accountCode: '001',
        lineNo1_lineAccountCode1_subAccountCode: '001',
        lineNo1_lineAccountCode1_departmentCode: '001',
        lineNo1_lineAccountCode1_input_amount: '99,991',
        message: '1234567890'
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

      const dbError = new Error('DB Error')
      approvalInboxControllerInsertAndUpdateJournalizeInvoice.mockReturnValue({
        status: 0,
        lineId: lineId,
        accountCode: 'AB001',
        subAccountCode: subAccountCode,
        error: dbError
      })

      // 試験実施
      await approvalInbox.cbPostApprove(request, response, next)

      // 期待結果
      // 500エラーがエラーハンドリング「される」
      expect(next).toHaveBeenCalledWith(errorHelper.create(500))
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
      await approvalInbox.cbPostApprove(request, response, next)

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
      await approvalInbox.cbPostApprove(request, response, next)

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
      await approvalInbox.cbPostApprove(request, response, next)

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
      await approvalInbox.cbPostApprove(request, response, next)

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
      await approvalInbox.cbPostApprove(request, response, next)

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
      await approvalInbox.cbPostApprove(request, response, next)

      // 期待結果
      // 500エラーがエラーハンドリング「される」
      expect(next).toHaveBeenCalledWith(errorHelper.create(500))
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
      await approvalInbox.cbPostApprove(request, response, next)

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

    test('異常：userContextがLoggedInではない場合', async () => {
      // 準備
      request.session = { ...notSession }
      request.user = { ...user[0] }
      request.body = {
        departmentCode: 'AB001',
        departmentCodeName: '部門名UT'
      }

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[0])
      // DBからの正常な契約情報取得を想定する
      contractControllerFindOneSpy.mockReturnValue(Contracts[0])

      tenantControllerFindOneSpy.mockReturnValue(Tenants[0])

      contractControllerFindContractSpyon.mockReturnValue(Contracts[0])

      // 試験実施
      await approvalInbox.cbPostApprove(request, response, next)

      // 期待結果
      // 400エラーがエラーハンドリング「される」
      expect(next).toHaveBeenCalledWith(errorHelper.create(400))
    })
  })
})
