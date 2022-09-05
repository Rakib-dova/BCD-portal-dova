'use strict'

jest.mock('../../Application/node_modules/express', () => {
  return require('jest-express')
})

const inboxList = require('../../Application/routes/inboxList')
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
const inboxController = require('../../Application/controllers/inboxController')
const requestApprovalController = require('../../Application/controllers/requestApprovalController')
const logger = require('../../Application/lib/logger.js')
const constantsDefine = require('../../Application/constants')
const validate = require('../../Application/lib/validate.js')

let request, response, infoSpy
let userControllerFindOneSpy,
  contractControllerFindOneSpy,
  tenantControllerFindOneSpy,
  contractControllerFindContractSpyon,
  getInboxSpy,
  requestApprovalControllerSpy,
  getWorkflowSpy,
  getSearchResultSpy,
  contractControllerFindContractsBytenantIdSpy,
  validateIsStatusForCancelSpy,
  contractControllerFindLightPlanSpy

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
  userContext: 'NotLoggedIn',
  userRole: 'dummy'
}

// モックテーブル定義
const Users = require('../mockDB/Users_Table')
const Tenants = require('../mockDB/Tenants_Table')
const Contracts = require('../mockDB/Contracts_Table2')

const searchResult1 = {
  list: [
    {
      no: 1,
      invoiceNo: 'PB1649meisai001',
      status: 0,
      currency: 'JPY',
      ammount: '3,080,000',
      sentTo: 'サプライヤー1',
      sentBy: 'バイヤー1',
      updated: '2021-12-27',
      expire: '2021-11-10',
      documentId: '3064665f-a90a-5f2e-a9e1-d59988ef3591',
      managerInfo: { managerAddress: 'dev.master.bconnection+buyer1.001@gmail.com', managerName: 'バイヤー1管理者1' }
    },
    {
      no: 2,
      invoiceNo: 'PBI2848supplier_送金済み',
      status: 0,
      currency: 'JPY',
      ammount: '91,000',
      sentTo: 'サプライヤー1',
      sentBy: 'バイヤー1',
      updated: '2021-12-16',
      expire: '2021-12-22',
      documentId: '0aa6c428-b1d0-5cef-8044-3fe78acb226f',
      managerInfo: { managerAddress: 'dev.master.bconnection+buyer1.001@gmail.com', managerName: 'バイヤー1管理者1' }
    },
    {
      no: 3,
      invoiceNo: 'PBI2848supplier_承認済み',
      status: 1,
      currency: 'JPY',
      ammount: '178,320',
      sentTo: 'サプライヤー1',
      sentBy: 'バイヤー1',
      updated: '2021-12-16',
      expire: '2021-12-28',
      documentId: '5792b9b9-fe31-5b1d-a58f-9798089359fd',
      managerInfo: { managerAddress: 'dev.master.bconnection+buyer1.001@gmail.com', managerName: 'バイヤー1管理者1' }
    },
    {
      no: 4,
      invoiceNo: 'PBI2848supplier_受信済み',
      status: 2,
      currency: 'JPY',
      ammount: '67,000',
      sentTo: 'サプライヤー1',
      sentBy: 'バイヤー1',
      updated: '2021-12-16',
      expire: '2021-12-28',
      documentId: '76b589ab-1fc2-5aa3-bdb4-151abadd9537',
      managerInfo: { managerAddress: 'test@test.com', managerName: '（ユーザー登録なし）' }
    }
  ],
  numPages: 1,
  currPage: 1
}

const returnRequestApproval = {
  requestId: 'dummyId',
  contractId: 'a31fe56d-6ea1-49a2-95f9-200e370984f8',
  approveRouteId: 'dummyId',
  invoiceId: '3064665f-a90a-5f2e-a9e1-d59988ef3591',
  requester: 'dummyrequester',
  status: '90',
  name: '差し戻し'
}

const searchResult1Rejected = {
  list: [
    {
      no: 1,
      invoiceNo: 'PB1649meisai001',
      status: 0,
      currency: 'JPY',
      ammount: '3,080,000',
      sentTo: 'サプライヤー1',
      sentBy: 'バイヤー1',
      updated: '2021-12-27',
      expire: '2021-11-10',
      documentId: '3064665f-a90a-5f2e-a9e1-d59988ef3591',
      approveStatus: '90',
      managerInfo: { managerAddress: 'dev.master.bconnection+buyer1.001@gmail.com', managerName: 'バイヤー1管理者1' }
    },
    {
      no: 2,
      invoiceNo: 'PBI2848supplier_送金済み',
      status: 0,
      currency: 'JPY',
      ammount: '91,000',
      sentTo: 'サプライヤー1',
      sentBy: 'バイヤー1',
      updated: '2021-12-16',
      expire: '2021-12-22',
      documentId: '0aa6c428-b1d0-5cef-8044-3fe78acb226f',
      approveStatus: '90',
      managerInfo: { managerAddress: 'dev.master.bconnection+buyer1.001@gmail.com', managerName: 'バイヤー1管理者1' }
    },
    {
      no: 3,
      invoiceNo: 'PBI2848supplier_承認済み',
      status: 1,
      currency: 'JPY',
      ammount: '178,320',
      sentTo: 'サプライヤー1',
      sentBy: 'バイヤー1',
      updated: '2021-12-16',
      expire: '2021-12-28',
      documentId: '5792b9b9-fe31-5b1d-a58f-9798089359fd',
      approveStatus: '90',
      managerInfo: { managerAddress: 'dev.master.bconnection+buyer1.001@gmail.com', managerName: 'バイヤー1管理者1' }
    },
    {
      no: 4,
      invoiceNo: 'PBI2848supplier_受信済み',
      status: 2,
      currency: 'JPY',
      ammount: '67,000',
      sentTo: 'サプライヤー1',
      sentBy: 'バイヤー1',
      updated: '2021-12-16',
      expire: '2021-12-28',
      documentId: '76b589ab-1fc2-5aa3-bdb4-151abadd9537',
      approveStatus: '90',
      managerInfo: { managerAddress: 'test@test.com', managerName: '（ユーザー登録なし）' }
    }
  ],
  numPages: 1,
  currPage: 1
}

const contractPlan = {
  isLightPlan: true,
  isIntroductionSupportPlan: false,
  isLightPlanForEntry: false,
  isIntroductionSupportPlanForEntry: false
}

describe('inboxListのテスト', () => {
  beforeEach(() => {
    request = new Request()
    response = new Response()
    infoSpy = jest.spyOn(logger, 'info')
    apiManager.accessTradeshift = require('../lib/apiManager')
    userControllerFindOneSpy = jest.spyOn(userController, 'findOne')
    contractControllerFindOneSpy = jest.spyOn(contractController, 'findOne')
    tenantControllerFindOneSpy = jest.spyOn(tenantController, 'findOne')
    contractControllerFindContractSpyon = jest.spyOn(contractController, 'findContract')
    getInboxSpy = jest.spyOn(inboxController, 'getInbox')
    requestApprovalControllerSpy = jest.spyOn(requestApprovalController, 'findOneRequestApproval')
    getWorkflowSpy = jest.spyOn(inboxController, 'getWorkflow')
    request.flash = jest.fn()
    getSearchResultSpy = jest.spyOn(inboxController, 'getSearchResult')
    contractControllerFindContractsBytenantIdSpy = jest.spyOn(contractController, 'findContractsBytenantId')
    validateIsStatusForCancelSpy = jest.spyOn(validate, 'isStatusForCancel')
    contractControllerFindLightPlanSpy = jest.spyOn(contractController, 'findLightPlan')
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
    getInboxSpy.mockRestore()
    requestApprovalControllerSpy.mockRestore()
    getWorkflowSpy.mockRestore()
    getSearchResultSpy.mockRestore()
    contractControllerFindContractsBytenantIdSpy.mockRestore()
    validateIsStatusForCancelSpy.mockRestore()
    contractControllerFindLightPlanSpy.mockRestore()
  })

  describe('ルーティング', () => {
    test('inboxListのルーティングを確認', async () => {
      expect(inboxList.router.get).toBeCalledWith(
        '/:page',
        expect.any(Function),
        helper.bcdAuthenticate,
        helper.getContractPlan,
        inboxList.cbGetIndex
      )
      expect(inboxList.router.get).toBeCalledWith('/getWorkflow', inboxList.cbGetWorkflow)
      expect(inboxList.router.get).toBeCalledWith(
        '/approvals',
        helper.isAuthenticated,
        helper.getContractPlan,
        expect.any(Function),
        inboxList.cbGetApprovals
      )
      expect(inboxList.router.post).toBeCalledWith(
        '/:page',
        expect.any(Function),
        helper.bcdAuthenticate,
        helper.getContractPlan,
        inboxList.cbSearchApprovedInvoice
      )
    })
  })

  describe('コールバック:cbGetIndex', () => {
    test('正常', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...user[0] }
      request.contractPlan = contractPlan
      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[0])
      tenantControllerFindOneSpy.mockReturnValue(Tenants[0])

      requestApprovalControllerSpy.mockReturnValue(null)

      contractControllerFindLightPlanSpy.mockReturnValue(Contracts[9][0])

      // inboxControllerのgetInobox実施結果設定
      getInboxSpy.mockReturnValue(searchResult1)

      // CSRF対策
      const dummyToken = 'testCsrfToken'
      request.csrfToken = jest.fn(() => {
        return dummyToken
      })

      contractControllerFindContractsBytenantIdSpy.mockReturnValue(Contracts[0])

      contractControllerFindLightPlanSpy.mockReturnValue(Contracts[9][0])

      // 試験実施
      await inboxList.cbGetIndex(request, response, next)

      // 期待結果
      // userContextがLoggedInになっている
      expect(request.session?.userContext).toBe('LoggedIn')
      // session.userRoleが'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'になっている
      expect(request.session?.userRole).toBe('a6a3edcd-00d9-427c-bf03-4ef0112ba16d')
      // response.renderでinboxList_light_planが呼ばれ「る」
      expect(response.render).toHaveBeenCalledWith('inboxList_light_plan', {
        listArr: searchResult1.list,
        numPages: searchResult1.numPages,
        currPage: searchResult1.currPage,
        rejectedFlag: false,
        csrfToken: dummyToken,
        contractPlan: contractPlan,
        userRole: 'a6a3edcd-00d9-427c-bf03-4ef0112ba16d',
        isSearch: false
      })
    })

    test('正常：有償プラン', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...user[0] }
      request.contractPlan = contractPlan

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[0])
      tenantControllerFindOneSpy.mockReturnValue(Tenants[0])

      requestApprovalControllerSpy.mockReturnValue(null)

      // inboxControllerのgetInobox実施結果設定
      getInboxSpy.mockReturnValue(searchResult1)

      // CSRF対策
      const dummyToken = 'testCsrfToken'
      request.csrfToken = jest.fn(() => {
        return dummyToken
      })

      contractControllerFindContractsBytenantIdSpy.mockReturnValue(Contracts[9])

      contractControllerFindLightPlanSpy.mockReturnValue(Contracts[9][0])

      // 試験実施
      await inboxList.cbGetIndex(request, response, next)

      // 期待結果
      // userContextがLoggedInになっている
      expect(request.session?.userContext).toBe('LoggedIn')
      // session.userRoleが'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'になっている
      expect(request.session?.userRole).toBe('a6a3edcd-00d9-427c-bf03-4ef0112ba16d')
      // response.renderでinboxList_light_planが呼ばれ「る」
      expect(response.render).toHaveBeenCalledWith('inboxList_light_plan', {
        listArr: searchResult1.list,
        numPages: searchResult1.numPages,
        currPage: searchResult1.currPage,
        rejectedFlag: false,
        csrfToken: dummyToken,
        contractPlan: contractPlan,
        userRole: 'a6a3edcd-00d9-427c-bf03-4ef0112ba16d',
        isSearch: false
      })
    })

    test('異常：SeviceTypeなし', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...user[0] }
      request.contractPlan = contractPlan

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[0])
      tenantControllerFindOneSpy.mockReturnValue(Tenants[0])

      requestApprovalControllerSpy.mockReturnValue(null)

      // inboxControllerのgetInobox実施結果設定
      getInboxSpy.mockReturnValue(searchResult1)

      // CSRF対策
      const dummyToken = 'testCsrfToken'
      request.csrfToken = jest.fn(() => {
        return dummyToken
      })

      contractControllerFindContractsBytenantIdSpy.mockReturnValue(Contracts[10])

      // 試験実施
      await inboxList.cbGetIndex(request, response, next)

      // 期待結果
      // userContextがLoggedInになっている
      expect(request.session?.userContext).toBe('LoggedIn')
      // session.userRoleが'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'になっている
      expect(request.session?.userRole).toBe('a6a3edcd-00d9-427c-bf03-4ef0112ba16d')
      // 500エラーがエラーハンドリング「される」
      expect(next).toHaveBeenCalledWith(errorHelper.create(500))
    })

    test('正常:請求書の支払依頼検索の結果がnullではない場合', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...user[0] }
      request.contractPlan = contractPlan

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[0])
      tenantControllerFindOneSpy.mockReturnValue(Tenants[0])

      requestApprovalControllerSpy.mockReturnValue(returnRequestApproval)

      // inboxControllerのgetInobox実施結果設定
      getInboxSpy.mockReturnValue(searchResult1)

      // CSRF対策
      const dummyToken = 'testCsrfToken'
      request.csrfToken = jest.fn(() => {
        return dummyToken
      })

      contractControllerFindContractsBytenantIdSpy.mockReturnValue(Contracts[0])

      contractControllerFindLightPlanSpy.mockReturnValue(Contracts[9][0])

      // 試験実施
      await inboxList.cbGetIndex(request, response, next)

      // 期待結果
      // userContextがLoggedInになっている
      expect(request.session?.userContext).toBe('LoggedIn')
      // session.userRoleが'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'になっている
      expect(request.session?.userRole).toBe('a6a3edcd-00d9-427c-bf03-4ef0112ba16d')
      // response.renderでinboxList_light_planが呼ばれ「る」
      expect(response.render).toHaveBeenCalledWith('inboxList_light_plan', {
        listArr: searchResult1.list,
        numPages: searchResult1.numPages,
        currPage: searchResult1.currPage,
        rejectedFlag: false,
        csrfToken: dummyToken,
        contractPlan: contractPlan,
        userRole: 'a6a3edcd-00d9-427c-bf03-4ef0112ba16d',
        isSearch: false
      })
    })

    test('正常：解約申込中の場合', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...user[1] }

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[6])
      tenantControllerFindOneSpy.mockReturnValue(Tenants[5])

      // inboxControllerのgetInobox実施結果設定
      getInboxSpy.mockReturnValue(searchResult1)

      contractControllerFindContractsBytenantIdSpy.mockReturnValue(Contracts[5])

      // 試験実施
      await inboxList.cbGetIndex(request, response, next)

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

      // inboxControllerのgetInobox実施結果設定
      getInboxSpy.mockReturnValue(searchResult1)
      // 試験実施
      await inboxList.cbGetIndex(request, response, next)

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
      await inboxList.cbGetIndex(request, response, next)

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
      await inboxList.cbGetIndex(request, response, next)

      // 期待結果
      // 404エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)

      // 500エラーがエラーハンドリング「される」
      expect(next).toHaveBeenCalledWith(errorHelper.create(500))
    })

    test('404エラー：user.statusが0ではない場合', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...user[2] }

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[8])

      // 試験実施
      await inboxList.cbGetIndex(request, response, next)

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
      await inboxList.cbGetIndex(request, response, next)

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
      await inboxList.cbGetIndex(request, response, next)

      // 期待結果
      // 500エラーがエラーハンドリング「される」
      expect(next).toHaveBeenCalledWith(errorHelper.create(500))
    })
  })

  describe('コールバック:cbGetWorkflow', () => {
    test('正常', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...user[0] }

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[0])
      // DBからの正常な契約情報取得を想定する
      contractControllerFindOneSpy.mockReturnValue(Contracts[0][0])

      tenantControllerFindOneSpy.mockReturnValue(Tenants[0])

      contractControllerFindContractSpyon.mockReturnValue(Contracts[0][0])

      getWorkflowSpy.mockReturnValue(searchResult1Rejected)

      // 試験実施
      await inboxList.cbGetWorkflow(request, response, next)

      // 期待結果
      // response.statusが「200」
      expect(response.status).toHaveBeenCalledWith(200)
      expect(response.send).toHaveBeenCalledWith(searchResult1Rejected)
    })

    test('準正常：解約（403エラー）', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...user[0] }

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[0])
      // DBからの正常な契約情報取得を想定する
      contractControllerFindOneSpy.mockReturnValue(Contracts[0][0])

      tenantControllerFindOneSpy.mockReturnValue(Tenants[0])

      contractControllerFindContractSpyon.mockReturnValue(Contracts[0][0])

      getWorkflowSpy.mockReturnValue(searchResult1Rejected)

      validateIsStatusForCancelSpy.mockReturnValue(null)

      // 試験実施
      await inboxList.cbGetWorkflow(request, response, next)

      // 期待結果
      // response.statusが「403」
      expect(response.status).toHaveBeenCalledWith(403)
    })

    test('500エラー:getWorkflowエラー', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...user[0] }

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[0])
      // DBからの正常な契約情報取得を想定する
      contractControllerFindOneSpy.mockReturnValue(Contracts[0][0])

      tenantControllerFindOneSpy.mockReturnValue(Tenants[0])

      contractControllerFindContractSpyon.mockReturnValue(Contracts[0][0])

      const dbError = new Error('DB Conncetion Error')
      getWorkflowSpy.mockReturnValue(dbError)

      // 試験実施
      await inboxList.cbGetWorkflow(request, response, next)

      // 期待結果
      // response.statusが「500」
      expect(response.status).toHaveBeenCalledWith(500)
      expect(response.send).toHaveBeenCalledWith('サーバーエラーが発生しました。')
    })

    test('403エラー:解約申込中の場合', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...user[1] }

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[6])
      tenantControllerFindOneSpy.mockReturnValue(Tenants[5])

      // inboxControllerのgetInobox実施結果設定
      getInboxSpy.mockReturnValue(searchResult1)

      contractControllerFindContractsBytenantIdSpy.mockReturnValue(Contracts[5])

      // 試験実施
      await inboxList.cbGetWorkflow(request, response, next)

      // 期待結果
      // response.statusが「403」
      expect(response.status).toHaveBeenCalledWith(403)
      expect(response.send).toHaveBeenCalledWith('許可されていません。')
    })

    test('403エラー:不正なContractデータの場合', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...user[1] }

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[0])
      // DBからの正常な契約情報取得を想定する
      contractControllerFindOneSpy.mockReturnValue(Contracts[7][0])

      tenantControllerFindOneSpy.mockReturnValue(Tenants[1])

      contractControllerFindContractSpyon.mockReturnValue(Contracts[7][0])

      // inboxControllerのgetInobox実施結果設定
      getInboxSpy.mockReturnValue(searchResult1)

      // 試験実施
      await inboxList.cbGetWorkflow(request, response, next)

      // 期待結果
      // response.statusが「403」
      expect(response.status).toHaveBeenCalledWith(403)
      expect(response.send).toHaveBeenCalledWith('許可されていません。')
    })

    test('401エラー：requestのsession,userIdがnullの場合', async () => {
      // 試験実施
      await inboxList.cbGetWorkflow(request, response, next)

      // 期待結果
      // 404エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)

      // response.statusが「401」
      expect(response.status).toHaveBeenCalledWith(401)
      expect(response.send).toHaveBeenCalledWith('認証に失敗しました。')
    })

    test('403エラー：user検索の時、DBエラー', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...user[2] }

      // DBからの正常なユーザデータの取得を想定する
      const userDbError = new Error('User Table Error')
      userControllerFindOneSpy.mockReturnValue(userDbError)

      // 試験実施
      await inboxList.cbGetWorkflow(request, response, next)

      // 期待結果
      // response.statusが「403」
      expect(response.status).toHaveBeenCalledWith(403)
      expect(response.send).toHaveBeenCalledWith('許可されていません。')
    })

    test('403エラー：user.statusが0ではない場合', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...user[2] }

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[8])

      // 試験実施
      await inboxList.cbGetWorkflow(request, response, next)

      // 期待結果
      // response.statusが「403」
      expect(response.status).toHaveBeenCalledWith(403)
      expect(response.send).toHaveBeenCalledWith('許可されていません。')
    })

    test('403エラー：contracts検索の時、DBエラー', async () => {
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
      await inboxList.cbGetWorkflow(request, response, next)

      // 期待結果
      // response.statusが「403」
      expect(response.status).toHaveBeenCalledWith(403)
      expect(response.send).toHaveBeenCalledWith('許可されていません。')
    })

    test('403エラー：テナントと契約テーブル検索結果無', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...user[0] }

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[0])
      contractControllerFindOneSpy.mockReturnValue(Contracts[0][0])
      tenantControllerFindOneSpy.mockReturnValue(null)
      contractControllerFindContractSpyon.mockReturnValue(null)

      // 試験実施
      await inboxList.cbGetWorkflow(request, response, next)

      // 期待結果
      // response.statusが「403」
      expect(response.status).toHaveBeenCalledWith(403)
      expect(response.send).toHaveBeenCalledWith('許可されていません。')
    })
  })

  describe('コールバック:cbGetApprovals', () => {
    test('正常', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...user[0] }
      request.contractPlan = contractPlan

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[0])
      // DBからの正常な契約情報取得を想定する
      contractControllerFindOneSpy.mockReturnValue(Contracts[0][0])

      tenantControllerFindOneSpy.mockReturnValue(Tenants[0])

      contractControllerFindContractSpyon.mockReturnValue(Contracts[0][0])

      requestApprovalControllerSpy.mockReturnValue(null)

      contractControllerFindLightPlanSpy.mockReturnValue(null)

      // inboxControllerのgetInobox実施結果設定
      getInboxSpy.mockReturnValue(searchResult1)
      // CSRF対策
      const dummyToken = 'testCsrfToken'
      request.csrfToken = jest.fn(() => {
        return dummyToken
      })

      // 試験実施
      await inboxList.cbGetApprovals(request, response, next)

      // 期待結果
      // userContextがLoggedInになっている
      expect(request.session?.userContext).toBe('LoggedIn')
      // session.userRoleが'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'になっている
      expect(request.session?.userRole).toBe('a6a3edcd-00d9-427c-bf03-4ef0112ba16d')
      // response.renderでinboxListが呼ばれ「る」
      expect(response.render).toHaveBeenCalledWith('inboxList', {
        listArr: searchResult1.list,
        numPages: searchResult1.numPages,
        currPage: searchResult1.currPage,
        rejectedFlag: true,
        csrfToken: dummyToken,
        contractPlan: contractPlan,
        userRole: 'a6a3edcd-00d9-427c-bf03-4ef0112ba16d',
        isSearch: false
      })
    })

    test('正常：承認待ちの場合', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...user[0] }
      request.contractPlan = contractPlan

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[0])
      // DBからの正常な契約情報取得を想定する
      contractControllerFindOneSpy.mockReturnValue(Contracts[0][0])

      tenantControllerFindOneSpy.mockReturnValue(Tenants[0])

      contractControllerFindContractSpyon.mockReturnValue(Contracts[0][0])

      requestApprovalControllerSpy.mockReturnValue(null)

      contractControllerFindLightPlanSpy.mockReturnValue(Contracts[9][0])

      // inboxControllerのgetInobox実施結果設定
      getInboxSpy.mockReturnValue(searchResult1)
      // CSRF対策
      const dummyToken = 'testCsrfToken'
      request.csrfToken = jest.fn(() => {
        return dummyToken
      })

      // 試験実施
      await inboxList.cbGetApprovals(request, response, next)

      // 期待結果
      // userContextがLoggedInになっている
      expect(request.session?.userContext).toBe('LoggedIn')
      // session.userRoleが'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'になっている
      expect(request.session?.userRole).toBe('a6a3edcd-00d9-427c-bf03-4ef0112ba16d')
      // response.renderでinboxList_light_planが呼ばれ「る」
      expect(response.render).toHaveBeenCalledWith('inboxList_light_plan', {
        listArr: searchResult1.list,
        numPages: searchResult1.numPages,
        currPage: searchResult1.currPage,
        rejectedFlag: true,
        csrfToken: dummyToken,
        contractPlan: contractPlan,
        userRole: 'a6a3edcd-00d9-427c-bf03-4ef0112ba16d',
        isSearch: false
      })
    })

    test('正常:請求書の支払依頼検索の結果がnullではない場合', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...user[0] }
      request.contractPlan = contractPlan

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[0])
      // DBからの正常な契約情報取得を想定する
      contractControllerFindOneSpy.mockReturnValue(Contracts[0][0])

      tenantControllerFindOneSpy.mockReturnValue(Tenants[0])

      contractControllerFindContractSpyon.mockReturnValue(Contracts[0][0])

      requestApprovalControllerSpy.mockReturnValue(returnRequestApproval)

      contractControllerFindLightPlanSpy.mockReturnValue(Contracts[9][0])

      // inboxControllerのgetInobox実施結果設定
      getInboxSpy.mockReturnValue(searchResult1)
      // CSRF対策
      const dummyToken = 'testCsrfToken'
      request.csrfToken = jest.fn(() => {
        return dummyToken
      })

      // 試験実施
      await inboxList.cbGetApprovals(request, response, next)

      // 期待結果
      // userContextがLoggedInになっている
      expect(request.session?.userContext).toBe('LoggedIn')
      // session.userRoleが'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'になっている
      expect(request.session?.userRole).toBe('a6a3edcd-00d9-427c-bf03-4ef0112ba16d')
      // response.renderでinboxList_light_planが呼ばれ「る」
      expect(response.render).toHaveBeenCalledWith('inboxList_light_plan', {
        listArr: searchResult1.list,
        numPages: searchResult1.numPages,
        currPage: searchResult1.currPage,
        rejectedFlag: true,
        csrfToken: dummyToken,
        contractPlan: contractPlan,
        userRole: 'a6a3edcd-00d9-427c-bf03-4ef0112ba16d',
        isSearch: false
      })
    })

    test('正常：解約申込中の場合', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...user[1] }

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[6])
      // DBからの正常な契約情報取得を想定する
      contractControllerFindOneSpy.mockReturnValue(Contracts[5][0])

      tenantControllerFindOneSpy.mockReturnValue(Tenants[5])

      contractControllerFindContractSpyon.mockReturnValue(Contracts[5][0])

      contractControllerFindLightPlanSpy.mockReturnValue(null)

      // inboxControllerのgetInobox実施結果設定
      getInboxSpy.mockReturnValue(searchResult1)
      // 試験実施
      await inboxList.cbGetApprovals(request, response, next)

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

    test('正常：500エラー:requestApprovalエラー', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...user[0] }
      request.contractPlan = contractPlan

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[0])
      // DBからの正常な契約情報取得を想定する
      contractControllerFindOneSpy.mockReturnValue(Contracts[0][0])

      tenantControllerFindOneSpy.mockReturnValue(Tenants[0])

      contractControllerFindContractSpyon.mockReturnValue(Contracts[0][0])

      const dbError = new Error('DB Conncetion Error')
      requestApprovalControllerSpy.mockReturnValue(dbError)

      contractControllerFindLightPlanSpy.mockReturnValue(Contracts[9][0])

      // inboxControllerのgetInobox実施結果設定
      getInboxSpy.mockReturnValue(searchResult1)
      // 試験実施
      await inboxList.cbGetApprovals(request, response, next)

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
      contractControllerFindOneSpy.mockReturnValue(Contracts[7][0])

      tenantControllerFindOneSpy.mockReturnValue(Tenants[1])

      contractControllerFindContractSpyon.mockReturnValue(Contracts[7][0])

      contractControllerFindLightPlanSpy.mockReturnValue(Contracts[9][0])

      // inboxControllerのgetInobox実施結果設定
      getInboxSpy.mockReturnValue(searchResult1)
      // 試験実施
      await inboxList.cbGetApprovals(request, response, next)

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
      await inboxList.cbGetApprovals(request, response, next)

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
      await inboxList.cbGetApprovals(request, response, next)

      // 期待結果
      // 404エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)

      // 500エラーがエラーハンドリング「される」
      expect(next).toHaveBeenCalledWith(errorHelper.create(500))
    })

    test('404エラー：user.statusが0ではない場合', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...user[2] }

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[8])

      // 試験実施
      await inboxList.cbGetApprovals(request, response, next)

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
      await inboxList.cbGetApprovals(request, response, next)

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
      contractControllerFindOneSpy.mockReturnValue(Contracts[0][0])
      tenantControllerFindOneSpy.mockReturnValue(null)
      contractControllerFindContractSpyon.mockReturnValue(null)

      // 試験実施
      await inboxList.cbGetApprovals(request, response, next)

      // 期待結果
      // 500エラーがエラーハンドリング「される」
      expect(next).toHaveBeenCalledWith(errorHelper.create(500))
    })
  })

  describe('コールバック:cbSearchApprovedInvoice', () => {
    test('正常：有償企業', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...user[0] }
      request.contractPlan = contractPlan

      request.body = {
        invoiceNumber: 'PB1649meisai001',
        minIssuedate: '',
        maxIssuedate: '',
        managerAddress: '',
        unKnownManager: ''
      }

      const searchResultData = [
        {
          ammount: '3,080,000',
          currency: 'JPY',
          documentId: '3064665f-a90a-5f2e-a9e1-d59988ef3591',
          expire: '2021-11-10',
          invoiceNo: 'PB1649meisai001',
          no: 1,
          sentBy: 'バイヤー1',
          sentTo: 'サプライヤー1',
          status: 0,
          updated: '2021-12-27'
        }
      ]

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[0])
      tenantControllerFindOneSpy.mockReturnValue(Tenants[0])

      getSearchResultSpy.mockReturnValueOnce(searchResultData)

      // inboxControllerのgetInobox実施結果設定
      getInboxSpy.mockReturnValue(searchResult1)
      // CSRF対策
      const dummyToken = 'testCsrfToken'
      request.csrfToken = jest.fn(() => {
        return dummyToken
      })

      contractControllerFindContractsBytenantIdSpy.mockReturnValue(Contracts[9])
      contractControllerFindLightPlanSpy.mockReturnValue(Contracts[9][0])

      // 試験実施
      await inboxList.cbSearchApprovedInvoice(request, response, next)

      // 期待結果
      // userContextがLoggedInになっている
      expect(request.session?.userContext).toBe('LoggedIn')
      // session.userRoleが'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'になっている
      expect(request.session?.userRole).toBe('a6a3edcd-00d9-427c-bf03-4ef0112ba16d')
      // response.renderでinboxList_light_planが呼ばれ「る」
      expect(response.render).toHaveBeenCalledWith('inboxList_light_plan', {
        listArr: searchResultData,
        numPages: searchResult1.numPages,
        currPage: searchResult1.currPage,
        rejectedFlag: false,
        csrfToken: dummyToken,
        contractPlan: contractPlan,
        userRole: 'a6a3edcd-00d9-427c-bf03-4ef0112ba16d',
        isSearch: true
      })
    })

    test('正常：有償企業以外場合', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...user[0] }
      request.contractPlan = contractPlan
      request.body = {
        invoiceNumber: 'PB1649meisai001',
        minIssuedate: '',
        maxIssuedate: '',
        managerAddress: '',
        unKnownManager: ''
      }

      const searchResultData = [
        {
          ammount: '3,080,000',
          currency: 'JPY',
          documentId: '3064665f-a90a-5f2e-a9e1-d59988ef3591',
          expire: '2021-11-10',
          invoiceNo: 'PB1649meisai001',
          no: 1,
          sentBy: 'バイヤー1',
          sentTo: 'サプライヤー1',
          status: 0,
          updated: '2021-12-27'
        }
      ]

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[0])
      tenantControllerFindOneSpy.mockReturnValue(Tenants[0])

      getSearchResultSpy.mockReturnValueOnce(searchResultData)

      // inboxControllerのgetInobox実施結果設定
      getInboxSpy.mockReturnValue(searchResult1)
      // CSRF対策
      const dummyToken = 'testCsrfToken'
      request.csrfToken = jest.fn(() => {
        return dummyToken
      })

      contractControllerFindContractsBytenantIdSpy.mockReturnValue(Contracts[9])
      contractControllerFindLightPlanSpy.mockReturnValue(null)

      // 試験実施
      await inboxList.cbSearchApprovedInvoice(request, response, next)

      // 期待結果
      // userContextがLoggedInになっている
      expect(request.session?.userContext).toBe('LoggedIn')
      // session.userRoleが'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'になっている
      expect(request.session?.userRole).toBe('a6a3edcd-00d9-427c-bf03-4ef0112ba16d')
      // 「/inboxList/1」にリダイレクトされる
      expect(response.redirect).toHaveBeenCalledWith('/inboxList/1')
    })

    test('準正常：無償プラン', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...user[0] }
      request.contractPlan = contractPlan
      request.body = {
        invoiceNumber: 'PB1649meisai001',
        minIssuedate: '',
        maxIssuedate: '',
        managerAddress: '',
        unKnownManager: ''
      }

      const searchResultData = [
        {
          ammount: '3,080,000',
          currency: 'JPY',
          documentId: '3064665f-a90a-5f2e-a9e1-d59988ef3591',
          expire: '2021-11-10',
          invoiceNo: 'PB1649meisai001',
          no: 1,
          sentBy: 'バイヤー1',
          sentTo: 'サプライヤー1',
          status: 0,
          updated: '2021-12-27'
        }
      ]

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[0])
      tenantControllerFindOneSpy.mockReturnValue(Tenants[0])

      getSearchResultSpy.mockReturnValueOnce(searchResultData)

      // inboxControllerのgetInobox実施結果設定
      getInboxSpy.mockReturnValue(searchResult1)
      // CSRF対策
      const dummyToken = 'testCsrfToken'
      request.csrfToken = jest.fn(() => {
        return dummyToken
      })

      contractControllerFindContractsBytenantIdSpy.mockReturnValue(Contracts[0])

      // 試験実施
      await inboxList.cbSearchApprovedInvoice(request, response, next)

      // 期待結果
      // userContextがLoggedInになっている
      expect(request.session?.userContext).toBe('LoggedIn')
      // session.userRoleが'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'になっている
      expect(request.session?.userRole).toBe('a6a3edcd-00d9-427c-bf03-4ef0112ba16d')
    })

    test('異常：SeviceTypeなし', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...user[0] }
      request.contractPlan = contractPlan
      request.body = {
        invoiceNumber: 'PB1649meisai001',
        minIssuedate: '',
        maxIssuedate: '',
        managerAddress: '',
        unKnownManager: ''
      }

      const searchResultData = [
        {
          ammount: '3,080,000',
          currency: 'JPY',
          documentId: '3064665f-a90a-5f2e-a9e1-d59988ef3591',
          expire: '2021-11-10',
          invoiceNo: 'PB1649meisai001',
          no: 1,
          sentBy: 'バイヤー1',
          sentTo: 'サプライヤー1',
          status: 0,
          updated: '2021-12-27'
        }
      ]

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[0])
      tenantControllerFindOneSpy.mockReturnValue(Tenants[0])

      getSearchResultSpy.mockReturnValueOnce(searchResultData)

      // inboxControllerのgetInobox実施結果設定
      getInboxSpy.mockReturnValue(searchResult1)
      // CSRF対策
      const dummyToken = 'testCsrfToken'
      request.csrfToken = jest.fn(() => {
        return dummyToken
      })

      contractControllerFindContractsBytenantIdSpy.mockReturnValue(Contracts[10])

      // 試験実施
      await inboxList.cbSearchApprovedInvoice(request, response, next)

      // 期待結果
      // userContextがLoggedInになっている
      expect(request.session?.userContext).toBe('LoggedIn')
      // session.userRoleが'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'になっている
      expect(request.session?.userRole).toBe('a6a3edcd-00d9-427c-bf03-4ef0112ba16d')
      // response.nextの関数が呼び出されて、５００エラーをチェックする。
      expect(next).toHaveBeenCalledWith(errorHelper.create(500))
    })

    test('正常：検索結果が０件の場合', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...user[0] }
      request.contractPlan = contractPlan
      request.body = {
        invoiceNumber: 'PB1649meisai001',
        minIssuedate: '',
        maxIssuedate: '',
        managerAddress: '',
        unKnownManager: ''
      }

      const searchResultData = []

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[0])
      tenantControllerFindOneSpy.mockReturnValue(Tenants[0])

      getSearchResultSpy.mockReturnValueOnce(searchResultData)

      // inboxControllerのgetInobox実施結果設定
      getInboxSpy.mockReturnValue(searchResult1)
      // CSRF対策
      const dummyToken = 'testCsrfToken'
      request.csrfToken = jest.fn(() => {
        return dummyToken
      })

      contractControllerFindContractsBytenantIdSpy.mockReturnValue(Contracts[9])

      // 試験実施
      await inboxList.cbSearchApprovedInvoice(request, response, next)

      // 期待結果
      // userContextがLoggedInになっている
      expect(request.session?.userContext).toBe('LoggedIn')
      // session.userRoleが'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'になっている
      expect(request.session?.userRole).toBe('a6a3edcd-00d9-427c-bf03-4ef0112ba16d')
      // response.renderでinboxList_light_planが呼ばれ「る」
      expect(response.render).toHaveBeenCalledWith('inboxList_light_plan', {
        listArr: searchResultData,
        numPages: searchResult1.numPages,
        currPage: searchResult1.currPage,
        rejectedFlag: false,
        message: '条件に合致する支払依頼が見つかりませんでした。',
        csrfToken: dummyToken,
        contractPlan: contractPlan,
        userRole: 'a6a3edcd-00d9-427c-bf03-4ef0112ba16d',
        isSearch: true
      })
    })

    test('正常：メールアドレスに「"」中に半角スペースがある場合', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...user[0] }
      request.contractPlan = contractPlan
      request.body = {
        invoiceNumber: 'PB1649meisai001',
        minIssuedate: '',
        maxIssuedate: '',
        managerAddress: '"test test"@test.com',
        unKnownManager: ''
      }

      const searchResultData = [
        {
          ammount: '3,080,000',
          currency: 'JPY',
          documentId: '3064665f-a90a-5f2e-a9e1-d59988ef3591',
          expire: '2021-11-10',
          invoiceNo: 'PB1649meisai001',
          no: 1,
          sentBy: 'バイヤー1',
          sentTo: 'サプライヤー1',
          status: 0,
          updated: '2021-12-27'
        }
      ]

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[0])
      tenantControllerFindOneSpy.mockReturnValue(Tenants[0])

      getSearchResultSpy.mockReturnValueOnce(searchResultData)

      // inboxControllerのgetInobox実施結果設定
      getInboxSpy.mockReturnValue(searchResult1)
      // CSRF対策
      const dummyToken = 'testCsrfToken'
      request.csrfToken = jest.fn(() => {
        return dummyToken
      })

      contractControllerFindContractsBytenantIdSpy.mockReturnValue(Contracts[9])

      // 試験実施
      await inboxList.cbSearchApprovedInvoice(request, response, next)

      // 期待結果
      // userContextがLoggedInになっている
      expect(request.session?.userContext).toBe('LoggedIn')
      // session.userRoleが'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'になっている
      expect(request.session?.userRole).toBe('a6a3edcd-00d9-427c-bf03-4ef0112ba16d')
      // response.renderでinboxList_light_planが呼ばれ「る」
      expect(response.render).toHaveBeenCalledWith('inboxList_light_plan', {
        listArr: searchResultData,
        numPages: searchResult1.numPages,
        currPage: searchResult1.currPage,
        rejectedFlag: false,
        csrfToken: dummyToken,
        contractPlan: contractPlan,
        userRole: 'a6a3edcd-00d9-427c-bf03-4ef0112ba16d',
        isSearch: true
      })
    })

    test('準正常：メールアドレスの形式が合わない場合', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...user[0] }
      request.contractPlan = contractPlan
      request.body = {
        invoiceNumber: 'PB1649meisai001',
        minIssuedate: '',
        maxIssuedate: '',
        managerAddress: 'test',
        unKnownManager: ''
      }

      const searchResultData = [
        {
          ammount: '3,080,000',
          currency: 'JPY',
          documentId: '3064665f-a90a-5f2e-a9e1-d59988ef3591',
          expire: '2021-11-10',
          invoiceNo: 'PB1649meisai001',
          no: 1,
          sentBy: 'バイヤー1',
          sentTo: 'サプライヤー1',
          status: 0,
          updated: '2021-12-27'
        }
      ]

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[0])
      tenantControllerFindOneSpy.mockReturnValue(Tenants[0])

      getSearchResultSpy.mockReturnValueOnce(searchResultData)

      // inboxControllerのgetInobox実施結果設定
      getInboxSpy.mockReturnValue(searchResult1)

      contractControllerFindContractsBytenantIdSpy.mockReturnValue(Contracts[9])

      // 試験実施
      await inboxList.cbSearchApprovedInvoice(request, response, next)

      // 期待結果
      // userContextがLoggedInになっている
      expect(request.session?.userContext).toBe('LoggedIn')
      // session.userRoleが'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'になっている
      expect(request.session?.userRole).toBe('a6a3edcd-00d9-427c-bf03-4ef0112ba16d')
      // response.flashの関数が呼び出される。
      expect(request.flash).toHaveBeenCalledWith('noti', [
        '支払依頼一覧',
        constantsDefine.statusConstants.INBOXLIST_CONTACT_EMAIL_NOT_VERIFY_TYPE
      ])
    })

    test('準正常：メールアドレスの「"」なくて、半角スペースがある場合」', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...user[0] }
      request.contractPlan = contractPlan
      request.body = {
        invoiceNumber: 'PB1649meisai001',
        minIssuedate: '',
        maxIssuedate: '',
        managerAddress: 'test test@test.com',
        unKnownManager: ''
      }

      const searchResultData = [
        {
          ammount: '3,080,000',
          currency: 'JPY',
          documentId: '3064665f-a90a-5f2e-a9e1-d59988ef3591',
          expire: '2021-11-10',
          invoiceNo: 'PB1649meisai001',
          no: 1,
          sentBy: 'バイヤー1',
          sentTo: 'サプライヤー1',
          status: 0,
          updated: '2021-12-27'
        }
      ]

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[0])
      tenantControllerFindOneSpy.mockReturnValue(Tenants[0])

      getSearchResultSpy.mockReturnValueOnce(searchResultData)

      // inboxControllerのgetInobox実施結果設定
      getInboxSpy.mockReturnValue(searchResult1)

      contractControllerFindContractsBytenantIdSpy.mockReturnValue(Contracts[9])

      // 試験実施
      await inboxList.cbSearchApprovedInvoice(request, response, next)

      // 期待結果
      // userContextがLoggedInになっている
      expect(request.session?.userContext).toBe('LoggedIn')
      // session.userRoleが'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'になっている
      expect(request.session?.userRole).toBe('a6a3edcd-00d9-427c-bf03-4ef0112ba16d')
      // response.flashの関数が呼び出される。
      expect(request.flash).toHaveBeenCalledWith('noti', [
        '支払依頼一覧',
        constantsDefine.statusConstants.INBOXLIST_CONTACT_EMAIL_NOT_VERIFY_SPACE
      ])
    })

    test('準正常：メールアドレスが128文字超過した場合', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...user[0] }
      request.contractPlan = contractPlan
      request.body = {
        invoiceNumber: 'PB1649meisai001',
        minIssuedate: '',
        maxIssuedate: '',
        managerAddress:
          'test.testtest.test.test.testtest.testtest.testtest.testtest.test@testestestestesttesttestestestestesttesttestestestestesttest.com',
        unKnownManager: ''
      }

      const searchResultData = [
        {
          ammount: '3,080,000',
          currency: 'JPY',
          documentId: '3064665f-a90a-5f2e-a9e1-d59988ef3591',
          expire: '2021-11-10',
          invoiceNo: 'PB1649meisai001',
          no: 1,
          sentBy: 'バイヤー1',
          sentTo: 'サプライヤー1',
          status: 0,
          updated: '2021-12-27'
        }
      ]

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[0])
      tenantControllerFindOneSpy.mockReturnValue(Tenants[0])

      getSearchResultSpy.mockReturnValueOnce(searchResultData)

      // inboxControllerのgetInobox実施結果設定
      getInboxSpy.mockReturnValue(searchResult1)

      contractControllerFindContractsBytenantIdSpy.mockReturnValue(Contracts[9])

      // 試験実施
      await inboxList.cbSearchApprovedInvoice(request, response, next)

      // 期待結果
      // userContextがLoggedInになっている
      expect(request.session?.userContext).toBe('LoggedIn')
      // session.userRoleが'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'になっている
      expect(request.session?.userRole).toBe('a6a3edcd-00d9-427c-bf03-4ef0112ba16d')
      // response.flashの関数が呼び出される。
      expect(request.flash).toHaveBeenCalledWith('noti', [
        '支払依頼一覧',
        constantsDefine.statusConstants.INBOXLIST_CONTACT_EMAIL_NOT_VERIFY_TYPE
      ])
    })

    test('異常：検索でエラーが発生した場合（APIエラー）', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...user[0] }
      request.contractPlan = contractPlan
      request.body = {
        invoiceNumber: 'PB1649meisai001',
        minIssuedate: '',
        maxIssuedate: '',
        managerAddress: '',
        unKnownManager: ''
      }

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[0])
      tenantControllerFindOneSpy.mockReturnValue(Tenants[0])

      const searchError = new Error()
      searchError.response = { status: 400 }
      getSearchResultSpy.mockReturnValueOnce(searchError)

      // inboxControllerのgetInobox実施結果設定
      getInboxSpy.mockReturnValue(searchResult1)

      contractControllerFindContractsBytenantIdSpy.mockReturnValue(Contracts[9])

      // 試験実施
      await inboxList.cbSearchApprovedInvoice(request, response, next)

      // 期待結果
      // userContextがLoggedInになっている
      expect(request.session?.userContext).toBe('LoggedIn')
      // session.userRoleが'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'になっている
      expect(request.session?.userRole).toBe('a6a3edcd-00d9-427c-bf03-4ef0112ba16d')
      // response.flashの関数が呼び出される。
      expect(request.flash).toHaveBeenCalledWith('noti', [
        '支払依頼一覧',
        constantsDefine.statusConstants.CSVDOWNLOAD_APIERROR
      ])
    })

    test('異常：検索でエラーが発生した場合（DBエラー）', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...user[0] }
      request.contractPlan = contractPlan
      request.body = {
        invoiceNumber: 'PB1649meisai001',
        minIssuedate: '',
        maxIssuedate: '',
        managerAddress: '',
        unKnownManager: ''
      }

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[0])
      tenantControllerFindOneSpy.mockReturnValue(Tenants[0])

      const searchError = new Error()
      searchError.response = { status: 500 }
      getSearchResultSpy.mockReturnValueOnce(searchError)

      // inboxControllerのgetInobox実施結果設定
      getInboxSpy.mockReturnValue(searchResult1)

      contractControllerFindContractsBytenantIdSpy.mockReturnValue(Contracts[9])

      // 試験実施
      await inboxList.cbSearchApprovedInvoice(request, response, next)

      // 期待結果
      // userContextがLoggedInになっている
      expect(request.session?.userContext).toBe('LoggedIn')
      // session.userRoleが'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'になっている
      expect(request.session?.userRole).toBe('a6a3edcd-00d9-427c-bf03-4ef0112ba16d')
      // response.nextの関数が呼び出されて、５００エラーをチェックする。
      expect(next).toHaveBeenCalledWith(errorHelper.create(500))
    })

    test('正常：解約申込中の場合', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...user[1] }
      request.body = {
        invoiceNumber: 'PB1649meisai001',
        minIssuedate: '',
        maxIssuedate: '',
        managerAddress: '',
        unKnownManager: ''
      }

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[6])
      tenantControllerFindOneSpy.mockReturnValue(Tenants[5])

      // inboxControllerのgetInobox実施結果設定
      getInboxSpy.mockReturnValue(searchResult1)

      contractControllerFindContractsBytenantIdSpy.mockReturnValue(Contracts[5])

      // 試験実施
      await inboxList.cbSearchApprovedInvoice(request, response, next)

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

      // inboxControllerのgetInobox実施結果設定
      getInboxSpy.mockReturnValue(searchResult1)
      // 試験実施
      await inboxList.cbSearchApprovedInvoice(request, response, next)

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
      await inboxList.cbSearchApprovedInvoice(request, response, next)

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
      request.body = {
        invoiceNumber: 'PB1649meisai001',
        minIssuedate: '',
        maxIssuedate: '',
        managerAddress: '',
        unKnownManager: ''
      }

      // DBからの正常なユーザデータの取得を想定する
      const userDbError = new Error('User Table Error')
      userControllerFindOneSpy.mockReturnValue(userDbError)

      // 試験実施
      await inboxList.cbSearchApprovedInvoice(request, response, next)

      // 期待結果
      // 404エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)

      // 500エラーがエラーハンドリング「される」
      expect(next).toHaveBeenCalledWith(errorHelper.create(500))
    })

    test('404エラー：user.statusが0ではない場合', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...user[2] }
      request.body = {
        invoiceNumber: 'PB1649meisai001',
        minIssuedate: '',
        maxIssuedate: '',
        managerAddress: '',
        unKnownManager: ''
      }

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[8])

      // 試験実施
      await inboxList.cbSearchApprovedInvoice(request, response, next)

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
      await inboxList.cbSearchApprovedInvoice(request, response, next)

      // 期待結果
      // 500エラーがエラーハンドリング「される」
      expect(next).toHaveBeenCalledWith(errorHelper.create(500))
    })

    test('500エラー：テナントと契約テーブル検索結果無', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...user[0] }
      request.body = {
        invoiceNumber: 'PB1649meisai001',
        minIssuedate: '',
        maxIssuedate: '',
        managerAddress: '',
        unKnownManager: ''
      }

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[0])
      contractControllerFindOneSpy.mockReturnValue(Contracts[0])
      tenantControllerFindOneSpy.mockReturnValue(null)
      contractControllerFindContractSpyon.mockReturnValue(null)

      // 試験実施
      await inboxList.cbSearchApprovedInvoice(request, response, next)

      // 期待結果
      // 500エラーがエラーハンドリング「される」
      expect(next).toHaveBeenCalledWith(errorHelper.create(500))
    })

    test('正常：担当者不明の請求書をチェックしない場合', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...user[0] }
      request.contractPlan = contractPlan
      request.body = {
        invoiceNumber: 'PB1649meisai001',
        minIssuedate: '',
        maxIssuedate: '',
        managerAddress: '',
        unKnownManager: ''
      }

      const searchResultData = [
        {
          ammount: '3,080,000',
          currency: 'JPY',
          documentId: '3064665f-a90a-5f2e-a9e1-d59988ef3591',
          expire: '2021-11-10',
          invoiceNo: 'PB1649meisai001',
          no: 1,
          sentBy: 'バイヤー1',
          sentTo: 'サプライヤー1',
          status: 0,
          updated: '2021-12-27',
          managerInfo: { managerAddress: 'test@test.com', managerName: 'サプライヤー1管理者1' }
        }
      ]

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[0])
      tenantControllerFindOneSpy.mockReturnValue(Tenants[0])

      getSearchResultSpy.mockReturnValueOnce(searchResultData)

      // inboxControllerのgetInobox実施結果設定
      getInboxSpy.mockReturnValue(searchResult1)
      // CSRF対策
      const dummyToken = 'testCsrfToken'
      request.csrfToken = jest.fn(() => {
        return dummyToken
      })

      contractControllerFindContractsBytenantIdSpy.mockReturnValue(Contracts[9])
      contractControllerFindLightPlanSpy.mockReturnValue(Contracts[9][0])

      // 試験実施
      await inboxList.cbSearchApprovedInvoice(request, response, next)

      // 期待結果
      // userContextがLoggedInになっている
      expect(request.session?.userContext).toBe('LoggedIn')
      // session.userRoleが'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'になっている
      expect(request.session?.userRole).toBe('a6a3edcd-00d9-427c-bf03-4ef0112ba16d')
      // response.renderでinboxList_light_planが呼ばれ「る」
      expect(response.render).toHaveBeenCalledWith('inboxList_light_plan', {
        listArr: searchResultData,
        numPages: searchResult1.numPages,
        currPage: searchResult1.currPage,
        rejectedFlag: false,
        csrfToken: dummyToken,
        contractPlan: contractPlan,
        userRole: 'a6a3edcd-00d9-427c-bf03-4ef0112ba16d',
        isSearch: true
      })
    })

    test('正常：担当者不明の請求書をチェックした場合', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...user[0] }
      request.contractPlan = contractPlan
      request.body = {
        invoiceNumber: 'PB1649meisai001',
        minIssuedate: '',
        maxIssuedate: '',
        managerAddress: '',
        unKnownManager: 'unKnownManager'
      }

      const searchResultData = [
        {
          ammount: '3,080,000',
          currency: 'JPY',
          documentId: '3064665f-a90a-5f2e-a9e1-d59988ef3591',
          expire: '2021-11-10',
          invoiceNo: 'PB1649meisai001',
          no: 1,
          sentBy: 'バイヤー1',
          sentTo: 'サプライヤー1',
          status: 0,
          updated: '2021-12-27',
          managerInfo: { managerAddress: '-', managerName: '（ユーザー登録なし）' }
        }
      ]

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[0])
      tenantControllerFindOneSpy.mockReturnValue(Tenants[0])

      getSearchResultSpy.mockReturnValueOnce(searchResultData)

      // inboxControllerのgetInobox実施結果設定
      getInboxSpy.mockReturnValue(searchResult1)
      // CSRF対策
      const dummyToken = 'testCsrfToken'
      request.csrfToken = jest.fn(() => {
        return dummyToken
      })

      contractControllerFindContractsBytenantIdSpy.mockReturnValue(Contracts[9])
      contractControllerFindLightPlanSpy.mockReturnValue(Contracts[9][0])

      // 試験実施
      await inboxList.cbSearchApprovedInvoice(request, response, next)

      // 期待結果
      // userContextがLoggedInになっている
      expect(request.session?.userContext).toBe('LoggedIn')
      // session.userRoleが'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'になっている
      expect(request.session?.userRole).toBe('a6a3edcd-00d9-427c-bf03-4ef0112ba16d')
      // response.renderでinboxList_light_planが呼ばれ「る」
      expect(response.render).toHaveBeenCalledWith('inboxList_light_plan', {
        listArr: searchResultData,
        numPages: searchResult1.numPages,
        currPage: searchResult1.currPage,
        rejectedFlag: false,
        csrfToken: dummyToken,
        contractPlan: contractPlan,
        userRole: 'a6a3edcd-00d9-427c-bf03-4ef0112ba16d',
        isSearch: true
      })
    })
  })
})
