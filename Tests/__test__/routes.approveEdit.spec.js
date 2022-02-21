'use strict'

jest.mock('../../Application/node_modules/express', () => {
  return require('jest-express')
})

const approveRouteEdit = require('../../Application/routes/approveRouteEdit')
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
const ApproveRoute = require('../../Application/models').ApproveRoute
const Approver = require('../../Application/models').ApproveUser
const logger = require('../../Application/lib/logger.js')
const ApproverObj = require('../../Application/lib/approver/Approver')

let request, response, infoSpy
let userControllerFindOneSpy,
  contractControllerFindOneSpy,
  tenantControllerFindOneSpy,
  contractControllerFindContractSpyon,
  approveRoutegetApproveRouteSpy,
  approverFindOne

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

// モックテーブル定義
const Users = require('../mockDB/Users_Table')
const Tenants = require('../mockDB/Tenants_Table')
const Contracts = require('../mockDB/Contracts_Table')

const approveRouteTestData = [
  {
    approveRouteId: '6693f071-9150-4005-bb06-3f8d30724f9b',
    contractId: '343b34d1-f4db-484e-b822-8e2ce9017d14',
    approveRouteName: 'UTテスト承認ルート',
    createdAt: new Date('2022-02-18'),
    updatedAt: new Date('2022-02-18'),
    deleteFlag: false,
    'ApproveUsers.approveUserId': '1e5e24aa-77c3-4571-a93c-5caa0e336ddb',
    'ApproveUsers.approveRouteId': '6693f071-9150-4005-bb06-3f8d30724f9b',
    'ApproveUsers.approveUser': 'aa974511-8188-4022-bd86-45e251fd259e',
    'ApproveUsers.prevApproveUser': '25e611d1-b91d-4937-bf9c-fcd242762526',
    'ApproveUsers.nextApproveUser': null,
    'ApproveUsers.isLastApproveUser': true,
    'ApproveUsers.createdAt': new Date('2022-02-18'),
    'ApproveUsers.updatedAt': new Date('2022-02-18')
  },
  {
    approveRouteId: '6693f071-9150-4005-bb06-3f8d30724f9b',
    contractId: '343b34d1-f4db-484e-b822-8e2ce9017d14',
    approveRouteName: 'UTテスト承認ルート',
    createdAt: new Date('2022-02-18'),
    updatedAt: new Date('2022-02-18'),
    deleteFlag: false,
    'ApproveUsers.approveUserId': '25e611d1-b91d-4937-bf9c-fcd242762526',
    'ApproveUsers.approveRouteId': '6693f071-9150-4005-bb06-3f8d30724f9b',
    'ApproveUsers.approveUser': '7fa489ad-4c50-43d6-8057-1279877c8ef5',
    'ApproveUsers.prevApproveUser': 'd4a11d99-1bb2-48b3-9c98-abefdb40dba2',
    'ApproveUsers.nextApproveUser': '1e5e24aa-77c3-4571-a93c-5caa0e336ddb',
    'ApproveUsers.isLastApproveUser': false,
    'ApproveUsers.createdAt': new Date('2022-02-18'),
    'ApproveUsers.updatedAt': new Date('2022-02-18')
  },
  {
    approveRouteId: '6693f071-9150-4005-bb06-3f8d30724f9b',
    contractId: '343b34d1-f4db-484e-b822-8e2ce9017d14',
    approveRouteName: 'UTテスト承認ルート',
    createdAt: new Date('2022-02-18'),
    updatedAt: new Date('2022-02-18'),
    deleteFlag: false,
    'ApproveUsers.approveUserId': '8b087e49-6a91-4fc2-8dc8-f30f56d9acd6',
    'ApproveUsers.approveRouteId': '6693f071-9150-4005-bb06-3f8d30724f9b',
    'ApproveUsers.approveUser': '53607702-b94b-4a94-9459-6cf3acd65603',
    'ApproveUsers.prevApproveUser': null,
    'ApproveUsers.nextApproveUser': 'd4a11d99-1bb2-48b3-9c98-abefdb40dba2',
    'ApproveUsers.isLastApproveUser': false,
    'ApproveUsers.createdAt': new Date('2022-02-18'),
    'ApproveUsers.updatedAt': new Date('2022-02-18')
  },
  {
    approveRouteId: '6693f071-9150-4005-bb06-3f8d30724f9b',
    contractId: '343b34d1-f4db-484e-b822-8e2ce9017d14',
    approveRouteName: 'UTテスト承認ルート',
    createdAt: new Date('2022-02-18'),
    updatedAt: new Date('2022-02-18'),
    deleteFlag: false,
    'ApproveUsers.approveUserId': 'd4a11d99-1bb2-48b3-9c98-abefdb40dba2',
    'ApproveUsers.approveRouteId': '6693f071-9150-4005-bb06-3f8d30724f9b',
    'ApproveUsers.approveUser': '3b6a13d6-cb89-414b-9597-175ba89329aa',
    'ApproveUsers.prevApproveUser': '8b087e49-6a91-4fc2-8dc8-f30f56d9acd6',
    'ApproveUsers.nextApproveUser': '25e611d1-b91d-4937-bf9c-fcd242762526',
    'ApproveUsers.isLastApproveUser': false,
    'ApproveUsers.createdAt': new Date('2022-02-18'),
    'ApproveUsers.updatedAt': new Date('2022-02-18')
  }
]

const approver = [
  Approver.build({
    approveUserId: 'd4a11d99-1bb2-48b3-9c98-abefdb40dba2',
    approveRouteId: '6693f071-9150-4005-bb06-3f8d30724f9b',
    approveUser: '3b6a13d6-cb89-414b-9597-175ba89329aa',
    prevApproveUser: '8b087e49-6a91-4fc2-8dc8-f30f56d9acd6',
    nextApproveUser: '25e611d1-b91d-4937-bf9c-fcd242762526',
    isLastApproveUser: false
  }),
  Approver.build({
    approveUserId: '8b087e49-6a91-4fc2-8dc8-f30f56d9acd6',
    approveRouteId: '6693f071-9150-4005-bb06-3f8d30724f9b',
    approveUser: '53607702-b94b-4a94-9459-6cf3acd65603',
    prevApproveUser: null,
    nextApproveUser: 'd4a11d99-1bb2-48b3-9c98-abefdb40dba2',
    isLastApproveUser: false
  }),
  Approver.build({
    approveUserId: '25e611d1-b91d-4937-bf9c-fcd242762526',
    approveRouteId: '6693f071-9150-4005-bb06-3f8d30724f9b',
    approveUser: '7fa489ad-4c50-43d6-8057-1279877c8ef5',
    prevApproveUser: 'd4a11d99-1bb2-48b3-9c98-abefdb40dba2',
    nextApproveUser: '1e5e24aa-77c3-4571-a93c-5caa0e336ddb',
    isLastApproveUser: false
  }),
  Approver.build({
    approveUserId: '1e5e24aa-77c3-4571-a93c-5caa0e336ddb',
    approveRouteId: '6693f071-9150-4005-bb06-3f8d30724f9b',
    approveUser: 'aa974511-8188-4022-bd86-45e251fd259e',
    prevApproveUser: '25e611d1-b91d-4937-bf9c-fcd242762526',
    nextApproveUser: null,
    isLastApproveUser: false
  })
]

// 期待ユーザー
const expectedUser = [
  new ApproverObj({
    Id: '53607702-b94b-4a94-9459-6cf3acd65603',
    CompanyAccountId: '221559d0-53aa-44a2-ab29-0c4a6cb02bde',
    CompanyName: 'UTテスト会社',
    Username: 'UTTESTER1@UTCODE.COM',
    Language: 'ja',
    TimeZone: 'Asia/Tokyo',
    Memberships: [
      {
        UserId: '53607702-b94b-4a94-9459-6cf3acd65603',
        GroupId: '221559d0-53aa-44a2-ab29-0c4a6cb02bde',
        Role: 'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'
      }
    ],
    Created: '2021-05-17T08:12:48.291Z',
    State: 'ACTIVE',
    Type: 'PERSON',
    FirstName: 'UTテスト',
    LastName: 'ユーザー',
    Visible: true
  }),
  new ApproverObj({
    Id: '3b6a13d6-cb89-414b-9597-175ba89329aa',
    CompanyAccountId: '221559d0-53aa-44a2-ab29-0c4a6cb02bde',
    CompanyName: 'UTテスト会社',
    Username: 'UTTESTER2@UTCODE.COM',
    Language: 'ja',
    TimeZone: 'Asia/Tokyo',
    Memberships: [
      {
        UserId: '53607702-b94b-4a94-9459-6cf3acd65603',
        GroupId: '221559d0-53aa-44a2-ab29-0c4a6cb02bde',
        Role: 'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'
      }
    ],
    Created: '2021-05-24T03:24:26.537Z',
    State: 'ACTIVE',
    Type: 'PERSON',
    FirstName: 'UTテスト',
    LastName: 'ユーザー2',
    Title: 'portal test',
    Visible: true
  }),
  new ApproverObj({
    Id: '7fa489ad-4c50-43d6-8057-1279877c8ef5',
    CompanyAccountId: '221559d0-53aa-44a2-ab29-0c4a6cb02bde',
    CompanyName: 'UTテスト会社',
    Username: 'UTTESTER3@UTCODE.COM',
    Language: 'ja',
    TimeZone: 'Asia/Tokyo',
    Memberships: [
      {
        UserId: '7fa489ad-4c50-43d6-8057-1279877c8ef5',
        GroupId: '221559d0-53aa-44a2-ab29-0c4a6cb02bde',
        Role: '824b4cb4-3bd9-4dd3-a0d4-e18586b6c03d'
      }
    ],
    Created: '2021-06-11T08:49:30.939Z',
    State: 'ACTIVE',
    Type: 'PERSON',
    FirstName: 'UTテスト',
    LastName: 'ユーザー3',
    Visible: true
  }),
  new ApproverObj({
    Id: 'aa974511-8188-4022-bd86-45e251fd259e',
    CompanyAccountId: '221559d0-53aa-44a2-ab29-0c4a6cb02bde',
    CompanyName: 'UTテスト会社',
    Username: 'UTTESTER4@UTCODE.COM',
    Language: 'ja',
    TimeZone: 'Asia/Tokyo',
    Memberships: [
      {
        UserId: 'aa974511-8188-4022-bd86-45e251fd259e',
        GroupId: '221559d0-53aa-44a2-ab29-0c4a6cb02bde',
        Role: '8370ee3e-5f31-47bf-a139-d4218fb7689f'
      }
    ],
    Created: '2021-08-03T02:06:10.626Z',
    State: 'ACTIVE',
    Type: 'PERSON',
    FirstName: 'UTテスト',
    LastName: 'ユーザー4',
    Visible: true
  })
]

describe('approveRouteListのテスト', () => {
  beforeEach(() => {
    request = new Request()
    response = new Response()
    infoSpy = jest.spyOn(logger, 'info')
    apiManager.accessTradeshift = require('../lib/apiManager')
    userControllerFindOneSpy = jest.spyOn(userController, 'findOne')
    contractControllerFindOneSpy = jest.spyOn(contractController, 'findOne')
    tenantControllerFindOneSpy = jest.spyOn(tenantController, 'findOne')
    contractControllerFindContractSpyon = jest.spyOn(contractController, 'findContract')
    approveRoutegetApproveRouteSpy = jest.spyOn(ApproveRoute, 'getApproveRoute')
    approverFindOne = jest.spyOn(Approver, 'findOne')
    request.flash = jest.fn()
  })
  afterEach(() => {
    request.resetMocked()
    response.resetMocked()
    next.mockReset()
    infoSpy.mockRestore()
    userControllerFindOneSpy.mockRestore()
    contractControllerFindOneSpy.mockRestore()
    tenantControllerFindOneSpy.mockRestore()
    contractControllerFindContractSpyon.mockRestore()
    approveRoutegetApproveRouteSpy.mockRestore()
    approverFindOne.mockRestore()
  })

  describe('ルーティング', () => {
    test('approveRouteListのルーティングを確認', async () => {
      expect(approveRouteEdit.router.get).toBeCalledWith(
        '/:approveRouteId',
        helper.isAuthenticated,
        approveRouteEdit.cbGetIndex
      )
    })
  })

  describe('コールバック:cbGetIndex', () => {
    test('正常', async () => {
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
      approveRoutegetApproveRouteSpy.mockReturnValueOnce(approveRouteTestData)

      // 承認ユーザーDB検索結果
      approverFindOne.mockImplementation((options) => {
        const approveUserId = options.where.approveUserId
        let result = null
        for (let idx = 0; idx < approver.length; idx++) {
          if (approver[idx].approveUserId === approveUserId) {
            result = approver[idx]
          }
        }
        return result
      })

      // 承認ルートの確認の表示承認ルートユーザー
      const expectedUser_ = expectedUser
      const lastExpectedUser = expectedUser_.pop()

      // 期待レンダリング
      const expectRegistApproveRoute = {
        panelHead: '条件絞り込み',
        approveRouteNameLabel: '承認ルート名',
        requiredTagApproveRouteName: 'approveRouteNameTagRequired',
        idForApproveRouteNameInput: 'setApproveRouteNameInputId',
        isApproveRouteEdit: true,
        modalTitle: '承認者検索',
        backUrl: '/approveRouteList',
        logTitle: '承認ルート確認・変更',
        logTitleEng: 'EDIT APPROVE ROUTE',
        approveRouteName: approveRouteTestData[0].approveRouteName,
        approveUsers: expectedUser,
        lastApprover: lastExpectedUser
      }

      // 試験実施
      await approveRouteEdit.cbGetIndex(request, response, next)

      // 期待結果
      // userContextがLoggedInになっている
      expect(request.session?.userContext).toBe('LoggedIn')
      // session.userRoleが'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'になっている
      expect(request.session?.userRole).toBe('a6a3edcd-00d9-427c-bf03-4ef0112ba16d')
      // response.renderでapproveRouteListが呼ばれ「る」
      expect(response.render).toHaveBeenCalledWith('registApproveRoute', expectRegistApproveRoute)
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
      await approveRouteEdit.cbGetIndex(request, response, next)

      // 期待結果
      // userContextがLoggedInになっている
      expect(request.session?.userContext).toBe('LoggedIn')
      // session.userRoleが'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'になっている
      expect(request.session?.userRole).toBe('a6a3edcd-00d9-427c-bf03-4ef0112ba16d')
      // response.renderでapproveRouteListが呼ばれ「る」
      expect(request.flash).toHaveBeenCalledWith('noti', [
        '承認ルート一覧',
        '当該勘定科目をDBから見つかりませんでした。'
      ])
      expect(response.redirect).toHaveBeenCalledWith('/approveRouteList')
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
      await approveRouteEdit.cbGetIndex(request, response, next)

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
      await approveRouteEdit.cbGetIndex(request, response, next)

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

    test('400エラー：ログインではない場合', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session, userContext: 'notLoggedIn' }
      request.user = { ...user[1] }

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[0])
      // DBからの正常な契約情報取得を想定する
      contractControllerFindOneSpy.mockReturnValue(Contracts[7])

      tenantControllerFindOneSpy.mockReturnValue(Tenants[1])

      contractControllerFindContractSpyon.mockReturnValue(Contracts[7])

      // 試験実施
      await approveRouteEdit.cbGetIndex(request, response, next)

      // 期待結果
      // 404エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      // userContextがLoggedInになっている
      expect(request.session?.userContext).toBe('notLoggedIn')
      // session.userRoleが'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'になっている
      expect(request.session?.userRole).toBe('dummy')
      // 400エラーがエラーハンドリング「される」
      expect(next).toHaveBeenCalledWith(errorHelper.create(400))
    })

    test('500エラー：requestのsession,userIdがnullの場合', async () => {
      // 試験実施
      await approveRouteEdit.cbGetIndex(request, response, next)

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
      await approveRouteEdit.cbGetIndex(request, response, next)

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
      await approveRouteEdit.cbGetIndex(request, response, next)

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
      await approveRouteEdit.cbGetIndex(request, response, next)

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
      await approveRouteEdit.cbGetIndex(request, response, next)

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
      // 承認ルートDB検索の時エラーが発生
      approverFindOne.mockImplementation(() => {
        throw dbError
      })

      // 試験実施
      await approveRouteEdit.cbGetIndex(request, response, next)

      // 期待結果
      // userContextがLoggedInになっている
      expect(request.session?.userContext).toBe('LoggedIn')
      // session.userRoleが'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'になっている
      expect(request.session?.userRole).toBe('a6a3edcd-00d9-427c-bf03-4ef0112ba16d')
      // 500エラーがエラーハンドリング「される」
      expect(next).toHaveBeenCalledWith(errorHelper.create(500))
    })
  })
})