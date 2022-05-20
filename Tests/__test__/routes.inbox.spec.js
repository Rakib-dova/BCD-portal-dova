'use strict'

jest.mock('../../Application/node_modules/express', () => {
  return require('jest-express')
})

const inbox = require('../../Application/routes/inbox')
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
const logger = require('../../Application/lib/logger.js')
const InvoiceDetail = require('../../Application/lib/invoiceDetail')

let request, response, infoSpy
let userControllerFindOneSpy,
  contractControllerFindOneSpy,
  tenantControllerFindOneSpy,
  contractControllerFindContractSpyon,
  inboxControllerSpy,
  getCodeSpy,
  insertAndUpdateJournalizeInvoiceSpy,
  getDepartmentSpy

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

const loggedInSession = {
  userContext: 'LoggedIn',
  userRole: 'dummy'
}

// モックテーブル定義
const Users = require('../mockDB/Users_Table')
const Tenants = require('../mockDB/Tenants_Table')
const Contracts = require('../mockDB/Contracts_Table')

describe('inboxのテスト', () => {
  beforeEach(() => {
    request = new Request()
    response = new Response()
    infoSpy = jest.spyOn(logger, 'info')
    apiManager.accessTradeshift = require('../lib/apiManager')
    userControllerFindOneSpy = jest.spyOn(userController, 'findOne')
    contractControllerFindOneSpy = jest.spyOn(contractController, 'findOne')
    tenantControllerFindOneSpy = jest.spyOn(tenantController, 'findOne')
    contractControllerFindContractSpyon = jest.spyOn(contractController, 'findContract')
    inboxControllerSpy = jest.spyOn(inboxController, 'getInvoiceDetail')
    getCodeSpy = jest.spyOn(inboxController, 'getCode')
    request.flash = jest.fn()
    insertAndUpdateJournalizeInvoiceSpy = jest.spyOn(inboxController, 'insertAndUpdateJournalizeInvoice')
    getDepartmentSpy = jest.spyOn(inboxController, 'getDepartment')
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
    inboxControllerSpy.mockRestore()
    getCodeSpy.mockRestore()
    insertAndUpdateJournalizeInvoiceSpy.mockRestore()
    getDepartmentSpy.mockRestore()
  })

  describe('ルーティング', () => {
    test('inboxのルーティングを確認', async () => {
      expect(inbox.router.get).toBeCalledWith('/:invoiceId', helper.isAuthenticated, inbox.cbGetIndex)
      expect(inbox.router.post).toBeCalledWith('/getCode', helper.isAuthenticated, inbox.cbPostGetCode)
      expect(inbox.router.post).toBeCalledWith('/:invoiceId', helper.isAuthenticated, inbox.cbPostIndex)
      expect(inbox.router.post).toBeCalledWith('/department', helper.isAuthenticated, inbox.cbPostDepartment)
    })
  })

  describe('コールバック:cbGetIndex', () => {
    test('正常', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...user[0] }
      request.params = {
        invoiceId: 'bfc26e3a-f2e8-5a05-9f8d-1e8f41196904'
      }

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[0])
      // DBからの正常な契約情報取得を想定する
      contractControllerFindOneSpy.mockReturnValue(Contracts[0])

      tenantControllerFindOneSpy.mockReturnValue(Tenants[0])

      contractControllerFindContractSpyon.mockReturnValue(Contracts[0])

      // inboxControllerのgetInvoiceDetail実施結果設定
      const dummyDocument = require('../mockInvoice/invoice32')
      const dummyData = new InvoiceDetail(dummyDocument, [])
      inboxControllerSpy.mockReturnValue(dummyData)

      // 試験実施
      await inbox.cbGetIndex(request, response, next)

      // 期待結果
      // userContextがLoggedInになっている
      expect(request.session?.userContext).toBe('LoggedIn')
      // session.userRoleが'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'になっている
      expect(request.session?.userRole).toBe('a6a3edcd-00d9-427c-bf03-4ef0112ba16d')
      // response.renderでinboxListが呼ばれ「る」
      expect(response.render).toHaveBeenCalledWith('readonlyInbox', {
        ...dummyData,
        optionLine1: createOptions(1, dummyData.options),
        optionLine2: createOptions(2, dummyData.options),
        optionLine3: createOptions(3, dummyData.options),
        optionLine4: createOptions(4, dummyData.options),
        optionLine5: createOptions(5, dummyData.options),
        optionLine6: createOptions(6, dummyData.options),
        optionLine7: createOptions(7, dummyData.options),
        optionLine8: createOptions(8, dummyData.options),
        documentId: request.params.invoiceId
      })
    })

    test('正常：割引がある場合', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...user[0] }
      request.params = {
        invoiceId: 'bfc26e3a-f2e8-5a05-9f8d-1e8f41196904'
      }

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[0])
      // DBからの正常な契約情報取得を想定する
      contractControllerFindOneSpy.mockReturnValue(Contracts[0])

      tenantControllerFindOneSpy.mockReturnValue(Tenants[0])

      contractControllerFindContractSpyon.mockReturnValue(Contracts[0])

      // inboxControllerのgetInvoiceDetail実施結果設定
      const dummyDocument = require('../mockInvoice/invoice42')
      const dummyData = new InvoiceDetail(dummyDocument, [])
      inboxControllerSpy.mockReturnValue(dummyData)

      // 試験実施
      await inbox.cbGetIndex(request, response, next)

      // 期待結果
      // userContextがLoggedInになっている
      expect(request.session?.userContext).toBe('LoggedIn')
      // session.userRoleが'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'になっている
      expect(request.session?.userRole).toBe('a6a3edcd-00d9-427c-bf03-4ef0112ba16d')
      // response.renderでinboxListが呼ばれ「る」
      expect(response.render).toHaveBeenCalledWith('readonlyInbox', {
        ...dummyData,
        optionLine1: createOptions(1, dummyData.options),
        optionLine2: createOptions(2, dummyData.options),
        optionLine3: createOptions(3, dummyData.options),
        optionLine4: createOptions(4, dummyData.options),
        optionLine5: createOptions(5, dummyData.options),
        optionLine6: createOptions(6, dummyData.options),
        optionLine7: {},
        optionLine8: {},
        documentId: request.params.invoiceId
      })
    })

    test('正常：追加料金がある場合', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...user[0] }
      request.params = {
        invoiceId: 'bfc26e3a-f2e8-5a05-9f8d-1e8f41196904'
      }

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[0])
      // DBからの正常な契約情報取得を想定する
      contractControllerFindOneSpy.mockReturnValue(Contracts[0])

      tenantControllerFindOneSpy.mockReturnValue(Tenants[0])

      contractControllerFindContractSpyon.mockReturnValue(Contracts[0])

      // inboxControllerのgetInvoiceDetail実施結果設定
      const dummyDocument = require('../mockInvoice/invoice43')
      const dummyData = new InvoiceDetail(dummyDocument, [])
      inboxControllerSpy.mockReturnValue(dummyData)

      // 試験実施
      await inbox.cbGetIndex(request, response, next)

      // 期待結果
      // userContextがLoggedInになっている
      expect(request.session?.userContext).toBe('LoggedIn')
      // session.userRoleが'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'になっている
      expect(request.session?.userRole).toBe('a6a3edcd-00d9-427c-bf03-4ef0112ba16d')
      // response.renderでinboxListが呼ばれ「る」
      expect(response.render).toHaveBeenCalledWith('readonlyInbox', {
        ...dummyData,
        optionLine1: createOptions(1, dummyData.options),
        optionLine2: createOptions(2, dummyData.options),
        optionLine3: createOptions(3, dummyData.options),
        optionLine4: createOptions(4, dummyData.options),
        optionLine5: createOptions(5, dummyData.options),
        optionLine6: createOptions(6, dummyData.options),
        optionLine7: {},
        optionLine8: {},
        documentId: request.params.invoiceId
      })
    })

    test('正常：割引・追加料金がある場合', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...user[0] }
      request.params = {
        invoiceId: 'bfc26e3a-f2e8-5a05-9f8d-1e8f41196904'
      }

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[0])
      // DBからの正常な契約情報取得を想定する
      contractControllerFindOneSpy.mockReturnValue(Contracts[0])

      tenantControllerFindOneSpy.mockReturnValue(Tenants[0])

      contractControllerFindContractSpyon.mockReturnValue(Contracts[0])

      // inboxControllerのgetInvoiceDetail実施結果設定
      const dummyDocument = require('../mockInvoice/invoice44')
      const dummyData = new InvoiceDetail(dummyDocument, [])
      inboxControllerSpy.mockReturnValue(dummyData)

      // 試験実施
      await inbox.cbGetIndex(request, response, next)

      // 期待結果
      // userContextがLoggedInになっている
      expect(request.session?.userContext).toBe('LoggedIn')
      // session.userRoleが'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'になっている
      expect(request.session?.userRole).toBe('a6a3edcd-00d9-427c-bf03-4ef0112ba16d')
      // response.renderでinboxListが呼ばれ「る」
      expect(response.render).toHaveBeenCalledWith('readonlyInbox', {
        ...dummyData,
        optionLine1: createOptions(1, dummyData.options),
        optionLine2: createOptions(2, dummyData.options),
        optionLine3: createOptions(3, dummyData.options),
        optionLine4: createOptions(4, dummyData.options),
        optionLine5: createOptions(5, dummyData.options),
        optionLine6: createOptions(6, dummyData.options),
        optionLine7: {},
        optionLine8: {},
        documentId: request.params.invoiceId
      })
    })

    test('正常：割引・追加料金に内容・税がない場合', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...user[0] }
      request.params = {
        invoiceId: 'bfc26e3a-f2e8-5a05-9f8d-1e8f41196904'
      }

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[0])
      // DBからの正常な契約情報取得を想定する
      contractControllerFindOneSpy.mockReturnValue(Contracts[0])

      tenantControllerFindOneSpy.mockReturnValue(Tenants[0])

      contractControllerFindContractSpyon.mockReturnValue(Contracts[0])

      // inboxControllerのgetInvoiceDetail実施結果設定
      const dummyDocument = require('../mockInvoice/invoice45')
      const dummyData = new InvoiceDetail(dummyDocument, [])
      inboxControllerSpy.mockReturnValue(dummyData)

      // 試験実施
      await inbox.cbGetIndex(request, response, next)

      // 期待結果
      // userContextがLoggedInになっている
      expect(request.session?.userContext).toBe('LoggedIn')
      // session.userRoleが'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'になっている
      expect(request.session?.userRole).toBe('a6a3edcd-00d9-427c-bf03-4ef0112ba16d')
      // response.renderでinboxListが呼ばれ「る」
      expect(response.render).toHaveBeenCalledWith('readonlyInbox', {
        ...dummyData,
        optionLine1: createOptions(1, dummyData.options),
        optionLine2: createOptions(2, dummyData.options),
        optionLine3: createOptions(3, dummyData.options),
        optionLine4: createOptions(4, dummyData.options),
        optionLine5: createOptions(5, dummyData.options),
        optionLine6: createOptions(6, dummyData.options),
        optionLine7: {},
        optionLine8: {},
        documentId: request.params.invoiceId
      })
    })

    test('正常：解約申込中の場合', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...user[1] }
      request.params = {
        invoiceId: 'bfc26e3a-f2e8-5a05-9f8d-1e8f41196904'
      }

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[6])
      // DBからの正常な契約情報取得を想定する
      contractControllerFindOneSpy.mockReturnValue(Contracts[5])

      tenantControllerFindOneSpy.mockReturnValue(Tenants[5])

      contractControllerFindContractSpyon.mockReturnValue(Contracts[5])

      // 試験実施
      await inbox.cbGetIndex(request, response, next)

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
      await inbox.cbGetIndex(request, response, next)

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
      await inbox.cbGetIndex(request, response, next)

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
      await inbox.cbGetIndex(request, response, next)

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
      await inbox.cbGetIndex(request, response, next)

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
      await inbox.cbGetIndex(request, response, next)

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
      await inbox.cbGetIndex(request, response, next)

      // 期待結果
      // 500エラーがエラーハンドリング「される」
      expect(next).toHaveBeenCalledWith(errorHelper.create(500))
    })

    test('正常：請求日、通貨のみ', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...user[0] }
      request.params = {
        invoiceId: 'bfc26e3a-f2e8-5a05-9f8d-1e8f41196904'
      }

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[0])
      // DBからの正常な契約情報取得を想定する
      contractControllerFindOneSpy.mockReturnValue(Contracts[0])

      tenantControllerFindOneSpy.mockReturnValue(Tenants[0])

      contractControllerFindContractSpyon.mockReturnValue(Contracts[0])

      // inboxControllerのgetInvoiceDetail実施結果設定
      const dummyDocument = require('../mockInvoice/invoice33')
      const dummyData = new InvoiceDetail(dummyDocument, [])
      inboxControllerSpy.mockReturnValue(dummyData)

      // 試験実施
      await inbox.cbGetIndex(request, response, next)

      // 期待結果
      // userContextがLoggedInになっている
      expect(request.session?.userContext).toBe('LoggedIn')
      // session.userRoleが'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'になっている
      expect(request.session?.userRole).toBe('a6a3edcd-00d9-427c-bf03-4ef0112ba16d')
      // response.renderでinboxListが呼ばれ「る」
      expect(response.render).toHaveBeenCalledWith('readonlyInbox', {
        ...dummyData,
        optionLine1: [
          { columnName: '請求日', columnData: '2022-01-07' },
          { columnName: '通貨', columnData: '円' }
        ],
        optionLine2: [],
        optionLine3: [],
        optionLine4: [],
        optionLine5: [],
        optionLine6: [],
        optionLine7: {},
        optionLine8: {},
        documentId: request.params.invoiceId
      })
    })

    test('準正常：APIエラー', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...user[0] }
      request.params = {
        invoiceId: 'bfc26e3a-f2e8-5a05-9f8d-1e8f41196904'
      }

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[0])
      // DBからの正常な契約情報取得を想定する
      contractControllerFindOneSpy.mockReturnValue(Contracts[0])

      tenantControllerFindOneSpy.mockReturnValue(Tenants[0])

      contractControllerFindContractSpyon.mockReturnValue(Contracts[0])

      // inboxControllerのgetInvoiceDetail実施結果設定
      const typeError = new Error("Cannot read property 'value' of undefined")
      inboxControllerSpy.mockImplementation(() => {
        throw typeError
      })

      // 試験実施
      await inbox.cbGetIndex(request, response, next)

      // 期待結果
      // userContextがLoggedInになっている
      expect(request.session?.userContext).toBe('LoggedIn')
      // session.userRoleが'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'になっている
      expect(request.session?.userRole).toBe('a6a3edcd-00d9-427c-bf03-4ef0112ba16d')
      // response.redirectでinboxListへ遷移される。
      expect(response.redirect).toHaveBeenCalledWith('/inboxList/1')
      expect(request.flash).toHaveBeenCalledWith('noti', ['仕分け情報設定', 'システムエラーが発生しました。'])
    })
  })

  describe('コールバック:cbPostGetCode', () => {
    test('正常：勘定科目、補助科目が存在する場合', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...loggedInSession }
      request.user = { ...user[0] }

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[0])
      // DBからの正常な契約情報取得を想定する
      contractControllerFindOneSpy.mockReturnValue(Contracts[0])

      tenantControllerFindOneSpy.mockReturnValue(Tenants[0])

      contractControllerFindContractSpyon.mockReturnValue(Contracts[0])

      getCodeSpy.mockReturnValue([
        {
          accountCodeId: '3e7d2225-90c6-410e-bed3-cd1384ca37a1',
          contractId: '7e02d351-e4e4-44c4-8e4a-b9d0a6e097d0',
          accountCodeName: 'テスト用勘定科目',
          accountCode: 'UT',
          createdAt: '2022-01-21T05:18:00.443Z',
          updatedAt: '2022-01-21T05:18:00.443Z',
          'SubAccountCodes.subAccountCodeId': '61e3dfd4-f2eb-409c-9064-2e1e742651c3',
          'SubAccountCodes.accountCodeId': '3e7d2225-90c6-410e-bed3-cd1384ca37a1',
          'SubAccountCodes.subjectCode': 'SUUT',
          'SubAccountCodes.subjectName': 'テスト用補助科目'
        }
      ])

      // 試験実施
      await inbox.cbPostGetCode(request, response, next)

      // 期待結果
      // userContextがLoggedInになっている
      expect(request.session?.userContext).toBe('LoggedIn')
      // session.userRoleが'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'になっている
      expect(request.session?.userRole).toBe('a6a3edcd-00d9-427c-bf03-4ef0112ba16d')
      // 予想したデータがある
      expect(response.send).toHaveBeenCalledWith([
        {
          accountCode: 'UT',
          accountCodeName: 'テスト用勘定科目',
          subAccountCode: 'SUUT',
          subAccountCodeName: 'テスト用補助科目'
        }
      ])
    })

    test('正常：勘定科のみ存在する場合', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...loggedInSession }
      request.user = { ...user[0] }

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[0])
      // DBからの正常な契約情報取得を想定する
      contractControllerFindOneSpy.mockReturnValue(Contracts[0])

      tenantControllerFindOneSpy.mockReturnValue(Tenants[0])

      contractControllerFindContractSpyon.mockReturnValue(Contracts[0])

      getCodeSpy.mockReturnValue([
        {
          accountCodeId: '3e7d2225-90c6-410e-bed3-cd1384ca37a1',
          contractId: '7e02d351-e4e4-44c4-8e4a-b9d0a6e097d0',
          accountCodeName: 'テスト用勘定科目',
          accountCode: 'UT',
          createdAt: '2022-01-21T05:18:00.443Z',
          updatedAt: '2022-01-21T05:18:00.443Z'
        }
      ])

      // 試験実施
      await inbox.cbPostGetCode(request, response, next)

      // 期待結果
      // userContextがLoggedInになっている
      expect(request.session?.userContext).toBe('LoggedIn')
      // session.userRoleが'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'になっている
      expect(request.session?.userRole).toBe('a6a3edcd-00d9-427c-bf03-4ef0112ba16d')
      // 予想したデータがある
      expect(response.send).toHaveBeenCalledWith([
        {
          accountCode: 'UT',
          accountCodeName: 'テスト用勘定科目',
          subAccountCode: '',
          subAccountCodeName: ''
        }
      ])
    })

    test('正常：解約申込中の場合', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...loggedInSession }
      request.user = { ...user[1] }

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[6])
      // DBからの正常な契約情報取得を想定する
      contractControllerFindOneSpy.mockReturnValue(Contracts[5])

      tenantControllerFindOneSpy.mockReturnValue(Tenants[5])

      contractControllerFindContractSpyon.mockReturnValue(Contracts[5])

      // 試験実施
      await inbox.cbPostGetCode(request, response, next)

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

    test('異常：勘定科目コード１０文字超過', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...loggedInSession }
      request.user = { ...user[0] }
      request.body = { accountCode: 'UTaccountCode' }

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[0])
      // DBからの正常な契約情報取得を想定する
      contractControllerFindOneSpy.mockReturnValue(Contracts[0])

      tenantControllerFindOneSpy.mockReturnValue(Tenants[0])

      contractControllerFindContractSpyon.mockReturnValue(Contracts[0])

      // 試験実施
      await inbox.cbPostGetCode(request, response, next)

      // 期待結果
      // response.statusが「400」
      expect(response.status).toHaveBeenCalledWith(400)
      expect(response.send).toHaveBeenCalledWith('400 Bad Request')
    })

    test('異常：勘定科目名４０文字超過', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...loggedInSession }
      request.user = { ...user[0] }
      request.body = {
        accountCode: 'AB001',
        accountCodeName: '勘定科目名40桁まで確認勘定科目名40桁まで確認勘定科目名40桁まで確認勘定科目名40桁まで確認'
      }

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[0])
      // DBからの正常な契約情報取得を想定する
      contractControllerFindOneSpy.mockReturnValue(Contracts[0])

      tenantControllerFindOneSpy.mockReturnValue(Tenants[0])

      contractControllerFindContractSpyon.mockReturnValue(Contracts[0])

      // 試験実施
      await inbox.cbPostGetCode(request, response, next)

      // 期待結果
      // response.statusが「400」
      expect(response.status).toHaveBeenCalledWith(400)
      expect(response.send).toHaveBeenCalledWith('400 Bad Request')
    })

    test('異常：userContextがLoggedInではない場合', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...user[0] }
      request.body = {
        accountCode: 'AB001',
        accountCodeName: '勘定科目名UT'
      }

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[0])
      // DBからの正常な契約情報取得を想定する
      contractControllerFindOneSpy.mockReturnValue(Contracts[0])

      tenantControllerFindOneSpy.mockReturnValue(Tenants[0])

      contractControllerFindContractSpyon.mockReturnValue(Contracts[0])

      // 試験実施
      await inbox.cbPostGetCode(request, response, next)

      // 期待結果
      // 400エラーがエラーハンドリング「される」
      expect(next).toHaveBeenCalledWith(errorHelper.create(400))
    })

    test('異常：DBエラーの場合', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...loggedInSession }
      request.user = { ...user[0] }

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[0])
      // DBからの正常な契約情報取得を想定する
      contractControllerFindOneSpy.mockReturnValue(Contracts[0])

      tenantControllerFindOneSpy.mockReturnValue(Tenants[0])

      contractControllerFindContractSpyon.mockReturnValue(Contracts[0])

      const dbError = new Error('dbError')
      getCodeSpy.mockReturnValue(dbError)

      // 試験実施
      await inbox.cbPostGetCode(request, response, next)

      // 期待結果
      // userContextがLoggedInになっている
      expect(request.session?.userContext).toBe('LoggedIn')
      // session.userRoleが'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'になっている
      expect(request.session?.userRole).toBe('a6a3edcd-00d9-427c-bf03-4ef0112ba16d')
      // request.flashが呼ばれ「る」
      expect(request.flash).toHaveBeenCalledWith('noti', [
        '仕分け情報設定',
        'APIエラーが発生しました。時間を空けてもう一度試してください。'
      ])
      // ポータルにリダイレクト「される」
      expect(response.redirect).toHaveBeenCalledWith(303, '/inboxList/1')
      expect(response.getHeader('Location')).toEqual('/inboxList/1')
    })

    test('500エラー:不正なContractデータの場合', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...loggedInSession }
      request.user = { ...user[1] }

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[0])
      // DBからの正常な契約情報取得を想定する
      contractControllerFindOneSpy.mockReturnValue(Contracts[7])

      tenantControllerFindOneSpy.mockReturnValue(Tenants[1])

      contractControllerFindContractSpyon.mockReturnValue(Contracts[7])

      // 試験実施
      await inbox.cbPostGetCode(request, response, next)

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
      await inbox.cbPostGetCode(request, response, next)

      // 期待結果
      // 404エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)

      // 500エラーがエラーハンドリング「される」
      expect(next).toHaveBeenCalledWith(errorHelper.create(500))
    })

    test('500エラー：user検索の時、DBエラー', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...loggedInSession }
      request.user = { ...user[2] }

      // DBからの正常なユーザデータの取得を想定する
      const userDbError = new Error('User Table Error')
      userControllerFindOneSpy.mockReturnValue(userDbError)

      // 試験実施
      await inbox.cbPostGetCode(request, response, next)

      // 期待結果
      // 404エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)

      // 500エラーがエラーハンドリング「される」
      expect(next).toHaveBeenCalledWith(errorHelper.create(500))
    })

    test('404エラー：user.statusが0ではない場合', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...loggedInSession }
      request.user = { ...user[2] }

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[8])

      // 試験実施
      await inbox.cbPostGetCode(request, response, next)

      // 期待結果
      // 404エラーがエラーハンドリング「される」
      expect(next).toHaveBeenCalledWith(errorHelper.create(404))
    })

    test('500エラー：contracts検索の時、DBエラー', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...loggedInSession }
      request.user = { ...user[0] }

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[0])
      const contractDbError = new Error('Contracts Table Error')
      tenantControllerFindOneSpy.mockReturnValue(Tenants[0])
      contractControllerFindOneSpy.mockReturnValue(contractDbError)

      // 試験実施
      await inbox.cbPostGetCode(request, response, next)

      // 期待結果
      // 500エラーがエラーハンドリング「される」
      expect(next).toHaveBeenCalledWith(errorHelper.create(500))
    })

    test('500エラー：テナントと契約テーブル検索結果無', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...loggedInSession }
      request.user = { ...user[0] }

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[0])
      contractControllerFindOneSpy.mockReturnValue(Contracts[0])
      tenantControllerFindOneSpy.mockReturnValue(null)
      contractControllerFindContractSpyon.mockReturnValue(null)

      // 試験実施
      await inbox.cbPostGetCode(request, response, next)

      // 期待結果
      // 500エラーがエラーハンドリング「される」
      expect(next).toHaveBeenCalledWith(errorHelper.create(500))
    })
  })

  describe('コールバック:cbPostIndex', () => {
    test('正常', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...user[0] }
      request.body = {
        lineId: '1',
        lineNo1_lineAccountCode1_accountCode: 'AB001',
        lineNo1_lineAccountCode1_subAccountCode: 'SU001',
        lineNo1_lineAccountCode1_departmentCode: 'DE002',
        lineNo1_lineCreditAccountCode1_creditAccountCode: 'AB002',
        lineNo1_lineCreditAccountCode1_creditSubAccountCode: 'SU002',
        lineNo1_lineCreditAccountCode1_creditDepartmentCode: 'DE002',
        lineNo1_lineAccountCode1_input_amount: '30,000'
      }
      request.params = {
        invoiceId: 'bfc26e3a-f2e8-5a05-9f8d-1e8f41196904'
      }

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[0])
      // DBからの正常な契約情報取得を想定する
      contractControllerFindOneSpy.mockReturnValue(Contracts[0])

      tenantControllerFindOneSpy.mockReturnValue(Tenants[0])

      contractControllerFindContractSpyon.mockReturnValue(Contracts[0])

      insertAndUpdateJournalizeInvoiceSpy.mockReturnValue({
        status: 0,
        lineId: '1',
        accountCode: 'AB001',
        subAccountCode: 'SU001',
        departmentCode: 'DE001',
        creditAccountCode: 'AB002',
        creditSubAccountCode: 'SU002',
        creditDepartmentCode: 'DE002',
        error: undefined
      })

      // 試験実施
      await inbox.cbPostIndex(request, response, next)

      // 期待結果
      // 404，500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(500))
      // userContextがLoggedInになっている
      expect(request.session?.userContext).toBe('LoggedIn')
      // session.userRoleが'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'になっている
      expect(request.session?.userRole).toBe('a6a3edcd-00d9-427c-bf03-4ef0112ba16d')
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
      await inbox.cbPostIndex(request, response, next)

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

    test('正常：未登録勘定科目の場合（借方）', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      const lineId = '1'
      const accountCode = 'AB111'

      request.session = { ...session }
      request.user = { ...user[0] }
      request.body = {
        lineId: '1',
        lineNo1_lineAccountCode1_accountCode: 'AB111',
        lineNo1_lineAccountCode1_subAccountCode: 'SU001',
        lineNo1_lineAccountCode1_departmentCode: '',
        lineNo1_lineCreditAccountCode1_creditAccountCode: '',
        lineNo1_lineCreditAccountCode1_creditSubAccountCode: '',
        lineNo1_lineCreditAccountCode1_creditDepartmentCode: '',
        lineNo1_lineAccountCode1_input_amount: '30,000'
      }
      request.params = {
        invoiceId: 'bfc26e3a-f2e8-5a05-9f8d-1e8f41196904'
      }

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[0])
      // DBからの正常な契約情報取得を想定する
      contractControllerFindOneSpy.mockReturnValue(Contracts[0])

      tenantControllerFindOneSpy.mockReturnValue(Tenants[0])

      contractControllerFindContractSpyon.mockReturnValue(Contracts[0])

      insertAndUpdateJournalizeInvoiceSpy.mockReturnValue({
        status: -1,
        lineId: lineId,
        accountCode: accountCode,
        error: undefined
      })

      // 試験実施
      await inbox.cbPostIndex(request, response, next)

      // 期待結果
      // 404，500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(500))
      // request.flashが呼ばれ「る」
      expect(request.flash).toHaveBeenCalledWith('noti', [
        '仕訳情報設定',
        `仕訳情報設定が完了できませんでした。<BR>※明細ID「${lineId}」の勘定科目「${accountCode}」は未登録勘定科目です。`,
        'SYSERR'
      ])
    })

    test('正常：未登録勘定科目の場合（貸方）', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      const lineId = '1'
      const creditAccountCode = 'AB112'

      request.session = { ...session }
      request.user = { ...user[0] }
      request.body = {
        lineId: '1',
        lineNo1_lineAccountCode1_accountCode: '',
        lineNo1_lineAccountCode1_subAccountCode: '',
        lineNo1_lineAccountCode1_departmentCode: '',
        lineNo1_lineCreditAccountCode1_creditAccountCode: 'AB112',
        lineNo1_lineCreditAccountCode1_creditSubAccountCode: 'SU002',
        lineNo1_lineCreditAccountCode1_creditDepartmentCode: '',
        lineNo1_lineAccountCode1_input_amount: '30,000'
      }
      request.params = {
        invoiceId: 'bfc26e3a-f2e8-5a05-9f8d-1e8f41196904'
      }

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[0])
      // DBからの正常な契約情報取得を想定する
      contractControllerFindOneSpy.mockReturnValue(Contracts[0])

      tenantControllerFindOneSpy.mockReturnValue(Tenants[0])

      contractControllerFindContractSpyon.mockReturnValue(Contracts[0])

      insertAndUpdateJournalizeInvoiceSpy.mockReturnValue({
        status: -1,
        lineId: lineId,
        accountCode: creditAccountCode,
        error: undefined
      })

      // 試験実施
      await inbox.cbPostIndex(request, response, next)

      // 期待結果
      // 404，500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(500))
      // request.flashが呼ばれ「る」
      expect(request.flash).toHaveBeenCalledWith('noti', [
        '仕訳情報設定',
        `仕訳情報設定が完了できませんでした。<BR>※明細ID「${lineId}」の勘定科目「${creditAccountCode}」は未登録勘定科目です。`,
        'SYSERR'
      ])
    })

    test('正常：未登録補助科目の場合（借方）', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      const lineId = '1'
      const subAccountCode = 'SU111'

      request.session = { ...session }
      request.user = { ...user[0] }
      request.body = {
        lineId: '1',
        lineNo1_lineAccountCode1_accountCode: 'AB001',
        lineNo1_lineAccountCode1_subAccountCode: 'SU111',
        lineNo1_lineAccountCode1_departmentCode: '',
        lineNo1_lineCreditAccountCode1_creditAccountCode: '',
        lineNo1_lineCreditAccountCode1_creditSubAccountCode: '',
        lineNo1_lineCreditAccountCode1_creditDepartmentCode: '',
        lineNo1_lineAccountCode1_input_amount: '30,000'
      }
      request.params = {
        invoiceId: 'bfc26e3a-f2e8-5a05-9f8d-1e8f41196904'
      }

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[0])
      // DBからの正常な契約情報取得を想定する
      contractControllerFindOneSpy.mockReturnValue(Contracts[0])

      tenantControllerFindOneSpy.mockReturnValue(Tenants[0])

      contractControllerFindContractSpyon.mockReturnValue(Contracts[0])

      insertAndUpdateJournalizeInvoiceSpy.mockReturnValue({
        status: -2,
        lineId: lineId,
        accountCode: 'AB001',
        subAccountCode: subAccountCode,
        error: undefined
      })

      // 試験実施
      await inbox.cbPostIndex(request, response, next)

      // 期待結果
      // 404，500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(500))
      // request.flashが呼ばれ「る」
      expect(request.flash).toHaveBeenCalledWith('noti', [
        '仕訳情報設定',
        `仕訳情報設定が完了できませんでした。<BR>※明細ID「${lineId}」の補助科目「${subAccountCode}」は未登録補助科目です。`,
        'SYSERR'
      ])
    })

    test('正常：未登録補助科目の場合（貸方）', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      const lineId = '1'
      const creditSubAccountCode = 'SU111'

      request.session = { ...session }
      request.user = { ...user[0] }
      request.body = {
        lineId: '1',
        lineNo1_lineAccountCode1_accountCode: '',
        lineNo1_lineAccountCode1_subAccountCode: '',
        lineNo1_lineAccountCode1_departmentCode: '',
        lineNo1_lineCreditAccountCode1_creditAccountCode: 'AB112',
        lineNo1_lineCreditAccountCode1_creditSubAccountCode: 'SU112',
        lineNo1_lineCreditAccountCode1_creditDepartmentCode: '',
        lineNo1_lineAccountCode1_input_amount: '30,000'
      }
      request.params = {
        invoiceId: 'bfc26e3a-f2e8-5a05-9f8d-1e8f41196904'
      }

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[0])
      // DBからの正常な契約情報取得を想定する
      contractControllerFindOneSpy.mockReturnValue(Contracts[0])

      tenantControllerFindOneSpy.mockReturnValue(Tenants[0])

      contractControllerFindContractSpyon.mockReturnValue(Contracts[0])

      insertAndUpdateJournalizeInvoiceSpy.mockReturnValue({
        status: -2,
        lineId: lineId,
        accountCode: 'AB112',
        subAccountCode: creditSubAccountCode,
        error: undefined
      })

      // 試験実施
      await inbox.cbPostIndex(request, response, next)

      // 期待結果
      // 404，500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(500))
      // request.flashが呼ばれ「る」
      expect(request.flash).toHaveBeenCalledWith('noti', [
        '仕訳情報設定',
        `仕訳情報設定が完了できませんでした。<BR>※明細ID「${lineId}」の補助科目「${creditSubAccountCode}」は未登録補助科目です。`,
        'SYSERR'
      ])
    })

    test('正常：未登録部門コードの場合（借方）', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      const lineId = '1'
      const departmentCode = 'DE001'

      request.session = { ...session }
      request.user = { ...user[0] }
      request.body = {
        lineId: '1',
        lineNo1_lineAccountCode1_accountCode: 'AB001',
        lineNo1_lineAccountCode1_subAccountCode: 'SU111',
        lineNo1_lineAccountCode1_departmentCode: 'DE001',
        lineNo1_lineCreditAccountCode1_creditAccountCode: '',
        lineNo1_lineCreditAccountCode1_creditSubAccountCode: '',
        lineNo1_lineCreditAccountCode1_creditDepartmentCode: '',
        lineNo1_lineAccountCode1_input_amount: '30,000'
      }
      request.params = {
        invoiceId: 'bfc26e3a-f2e8-5a05-9f8d-1e8f41196904'
      }

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[0])
      // DBからの正常な契約情報取得を想定する
      contractControllerFindOneSpy.mockReturnValue(Contracts[0])

      tenantControllerFindOneSpy.mockReturnValue(Tenants[0])

      contractControllerFindContractSpyon.mockReturnValue(Contracts[0])

      insertAndUpdateJournalizeInvoiceSpy.mockReturnValue({
        status: -3,
        lineId: lineId,
        accountCode: 'AB001',
        subAccountCode: 'SU111',
        departmentCode: departmentCode,
        error: undefined
      })

      // 試験実施
      await inbox.cbPostIndex(request, response, next)

      // 期待結果
      // 404，500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(500))
      // request.flashが呼ばれ「る」
      expect(request.flash).toHaveBeenCalledWith('noti', [
        '仕訳情報設定',
        `仕訳情報設定が完了できませんでした。<BR>※明細ID「${lineId}」の部門データ「${departmentCode}」は未登録部門データです。`,
        'SYSERR'
      ])
    })

    test('正常：未登録部門コードの場合（貸方）', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      const lineId = '1'
      const creditDepartmentCode = 'DE112'

      request.session = { ...session }
      request.user = { ...user[0] }
      request.body = {
        lineId: '1',
        lineNo1_lineAccountCode1_accountCode: '',
        lineNo1_lineAccountCode1_subAccountCode: '',
        lineNo1_lineAccountCode1_departmentCode: '',
        lineNo1_lineCreditAccountCode1_creditAccountCode: 'AB112',
        lineNo1_lineCreditAccountCode1_creditSubAccountCode: 'SU112',
        lineNo1_lineCreditAccountCode1_creditDepartmentCode: 'DE112',
        lineNo1_lineAccountCode1_input_amount: '30,000'
      }
      request.params = {
        invoiceId: 'bfc26e3a-f2e8-5a05-9f8d-1e8f41196904'
      }

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[0])
      // DBからの正常な契約情報取得を想定する
      contractControllerFindOneSpy.mockReturnValue(Contracts[0])

      tenantControllerFindOneSpy.mockReturnValue(Tenants[0])

      contractControllerFindContractSpyon.mockReturnValue(Contracts[0])

      insertAndUpdateJournalizeInvoiceSpy.mockReturnValue({
        status: -3,
        lineId: lineId,
        accountCode: 'AB001',
        subAccountCode: 'SU111',
        departmentCode: creditDepartmentCode,
        error: undefined
      })

      // 試験実施
      await inbox.cbPostIndex(request, response, next)

      // 期待結果
      // 404，500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(500))
      // request.flashが呼ばれ「る」
      expect(request.flash).toHaveBeenCalledWith('noti', [
        '仕訳情報設定',
        `仕訳情報設定が完了できませんでした。<BR>※明細ID「${lineId}」の部門データ「${creditDepartmentCode}」は未登録部門データです。`,
        'SYSERR'
      ])
    })

    test('異常:invoiceIdがUUIDではない場合', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...user[0] }
      request.body = {
        lineId: 'UT001',
        lineNo1_lineAccountCode1_accountCode: 'AB001',
        lineNo1_lineAccountCode1_subAccountCode: 'SU001',
        lineNo1_lineAccountCode1_input_amount: '30,000'
      }
      request.params = {
        invoiceId: 'TEST'
      }

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[0])
      // DBからの正常な契約情報取得を想定する
      contractControllerFindOneSpy.mockReturnValue(Contracts[0])

      tenantControllerFindOneSpy.mockReturnValue(Tenants[0])

      contractControllerFindContractSpyon.mockReturnValue(Contracts[0])

      // 試験実施
      await inbox.cbPostIndex(request, response, next)

      // 期待結果
      // response.statusが「400」
      expect(response.status).toHaveBeenCalledWith(400)
      expect(response.send).toHaveBeenCalledWith('400 Bad Request')
    })

    test('500エラー:DBエラーの場合', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...user[0] }
      request.body = {
        lineId: 'UT001',
        lineNo1_lineAccountCode1_accountCode: 'AB001',
        lineNo1_lineAccountCode1_subAccountCode: 'SU001',
        lineNo1_lineAccountCode1_input_amount: '30,000'
      }
      request.params = {
        invoiceId: 'bfc26e3a-f2e8-5a05-9f8d-1e8f41196904'
      }

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[0])
      // DBからの正常な契約情報取得を想定する
      contractControllerFindOneSpy.mockReturnValue(Contracts[0])

      tenantControllerFindOneSpy.mockReturnValue(Tenants[0])

      contractControllerFindContractSpyon.mockReturnValue(Contracts[0])

      const dbError = new Error('DB Error')
      insertAndUpdateJournalizeInvoiceSpy.mockReturnValue({
        status: 0,
        lineId: 'lineAccountCode4',
        accountCode: 'AB001',
        subAccountCode: 'SU001',
        error: dbError
      })

      // 試験実施
      await inbox.cbPostIndex(request, response, next)

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
      await inbox.cbPostIndex(request, response, next)

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
      // error.renderの49行目と競合が発生。
      request.user = {}
      // 試験実施
      await inbox.cbPostIndex(request, response, next)

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
      await inbox.cbPostIndex(request, response, next)

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
      await inbox.cbPostIndex(request, response, next)

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
      await inbox.cbPostIndex(request, response, next)

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
      await inbox.cbPostIndex(request, response, next)

      // 期待結果
      // 500エラーがエラーハンドリング「される」
      expect(next).toHaveBeenCalledWith(errorHelper.create(500))
    })
  })

  describe('コールバック:cbPostDepartment', () => {
    test('正常：部門データが存在する場合', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...loggedInSession }
      request.user = { ...user[0] }

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[0])
      // DBからの正常な契約情報取得を想定する
      contractControllerFindOneSpy.mockReturnValue(Contracts[0])

      tenantControllerFindOneSpy.mockReturnValue(Tenants[0])

      contractControllerFindContractSpyon.mockReturnValue(Contracts[0])

      getDepartmentSpy.mockReturnValueOnce({
        status: 0,
        searchResult: [
          {
            code: 'DE001',
            name: 'テスト用部門データ1'
          }
        ]
      })

      // 試験実施
      await inbox.cbPostDepartment(request, response, next)

      // 期待結果
      // userContextがLoggedInになっている
      expect(request.session?.userContext).toBe('LoggedIn')
      // session.userRoleが'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'になっている
      expect(request.session?.userRole).toBe('a6a3edcd-00d9-427c-bf03-4ef0112ba16d')
      // 予想したデータがある
      expect(response.send).toHaveBeenCalledWith([
        {
          code: 'DE001',
          name: 'テスト用部門データ1'
        }
      ])
    })

    test('正常：解約申込中の場合', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...loggedInSession }
      request.user = { ...user[1] }

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[6])
      // DBからの正常な契約情報取得を想定する
      contractControllerFindOneSpy.mockReturnValue(Contracts[5])

      tenantControllerFindOneSpy.mockReturnValue(Tenants[5])

      contractControllerFindContractSpyon.mockReturnValue(Contracts[5])

      // 試験実施
      await inbox.cbPostDepartment(request, response, next)

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

    test('異常：部門コード１０文字超過', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...loggedInSession }
      request.user = { ...user[0] }
      request.body = { departmentCode: 'UTDepartmentCode' }

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[0])
      // DBからの正常な契約情報取得を想定する
      contractControllerFindOneSpy.mockReturnValue(Contracts[0])

      tenantControllerFindOneSpy.mockReturnValue(Tenants[0])

      contractControllerFindContractSpyon.mockReturnValue(Contracts[0])

      // 試験実施
      await inbox.cbPostDepartment(request, response, next)

      // 期待結果
      // response.statusが「400」
      expect(response.status).toHaveBeenCalledWith(400)
      expect(response.send).toHaveBeenCalledWith('400 Bad Request')
    })

    test('異常：部門名４０文字超過', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...loggedInSession }
      request.user = { ...user[0] }
      request.body = {
        departmentCode: 'AB001',
        departmentCodeName: '部門名40桁まで確認部門名40桁まで確認部門名40桁まで確認部門名40桁まで確認部門名40桁まで確認'
      }

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[0])
      // DBからの正常な契約情報取得を想定する
      contractControllerFindOneSpy.mockReturnValue(Contracts[0])

      tenantControllerFindOneSpy.mockReturnValue(Tenants[0])

      contractControllerFindContractSpyon.mockReturnValue(Contracts[0])

      // 試験実施
      await inbox.cbPostDepartment(request, response, next)

      // 期待結果
      // response.statusが「400」
      expect(response.status).toHaveBeenCalledWith(400)
      expect(response.send).toHaveBeenCalledWith('400 Bad Request')
    })

    test('異常ー：部門データ検索の時、DBエラー', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...loggedInSession }
      request.user = { ...user[0] }

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[0])
      // DBからの正常な契約情報取得を想定する
      contractControllerFindOneSpy.mockReturnValue(Contracts[0])

      tenantControllerFindOneSpy.mockReturnValue(Tenants[0])

      contractControllerFindContractSpyon.mockReturnValue(Contracts[0])

      const departmentCodeDbError = new Error('DepartmentCode Table Error')

      getDepartmentSpy.mockReturnValueOnce({
        status: 0,
        searchResult: departmentCodeDbError
      })

      // 試験実施
      await inbox.cbPostDepartment(request, response, next)

      // 期待結果
      // response.statusが「500」
      expect(response.status).toHaveBeenCalledWith(500)
      expect(response.send).toHaveBeenCalledWith('500 Internal Server Error')
    })

    test('異常：userContextがLoggedInではない場合', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
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
      await inbox.cbPostDepartment(request, response, next)

      // 期待結果
      // 400エラーがエラーハンドリング「される」
      expect(next).toHaveBeenCalledWith(errorHelper.create(400))
    })

    test('500エラー:不正なContractデータの場合', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...loggedInSession }
      request.user = { ...user[1] }

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[0])
      // DBからの正常な契約情報取得を想定する
      contractControllerFindOneSpy.mockReturnValue(Contracts[7])

      tenantControllerFindOneSpy.mockReturnValue(Tenants[1])

      contractControllerFindContractSpyon.mockReturnValue(Contracts[7])

      // 試験実施
      await inbox.cbPostDepartment(request, response, next)

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
      await inbox.cbPostGetCode(request, response, next)

      // 期待結果
      // 404エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)

      // 500エラーがエラーハンドリング「される」
      expect(next).toHaveBeenCalledWith(errorHelper.create(500))
    })

    test('500エラー：user検索の時、DBエラー', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...loggedInSession }
      request.user = { ...user[2] }

      // DBからの正常なユーザデータの取得を想定する
      const userDbError = new Error('User Table Error')
      userControllerFindOneSpy.mockReturnValue(userDbError)

      // 試験実施
      await inbox.cbPostDepartment(request, response, next)

      // 期待結果
      // 404エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)

      // 500エラーがエラーハンドリング「される」
      expect(next).toHaveBeenCalledWith(errorHelper.create(500))
    })

    test('404エラー：user.statusが0ではない場合', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...loggedInSession }
      request.user = { ...user[2] }

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[8])

      // 試験実施
      await inbox.cbPostDepartment(request, response, next)

      // 期待結果
      // 404エラーがエラーハンドリング「される」
      expect(next).toHaveBeenCalledWith(errorHelper.create(404))
    })

    test('500エラー：contracts検索の時、DBエラー', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...loggedInSession }
      request.user = { ...user[0] }

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[0])
      const contractDbError = new Error('Contracts Table Error')
      tenantControllerFindOneSpy.mockReturnValue(Tenants[0])
      contractControllerFindOneSpy.mockReturnValue(contractDbError)

      // 試験実施
      await inbox.cbPostDepartment(request, response, next)

      // 期待結果
      // 500エラーがエラーハンドリング「される」
      expect(next).toHaveBeenCalledWith(errorHelper.create(500))
    })

    test('500エラー：テナントと契約テーブル検索結果無', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...loggedInSession }
      request.user = { ...user[0] }

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[0])
      contractControllerFindOneSpy.mockReturnValue(Contracts[0])
      tenantControllerFindOneSpy.mockReturnValue(null)
      contractControllerFindContractSpyon.mockReturnValue(null)

      // 試験実施
      await inbox.cbPostGetCode(request, response, next)

      // 期待結果
      // 500エラーがエラーハンドリング「される」
      expect(next).toHaveBeenCalledWith(errorHelper.create(500))
    })
  })
})

function createOptions(number, options) {
  let option = []
  switch (number) {
    case 1:
      if (options.issueDate) {
        option.push({ columnName: '請求日', columnData: options.issueDate })
      }
      if (options.taxPointDate) {
        option.push({ columnName: '課税日', columnData: options.taxPointDate })
      }
      if (options.bookingNumber) {
        option.push({ columnName: '予約番号', columnData: options.bookingNumber })
      }
      if (options.documentCurrencyCode) {
        option.push({ columnName: '通貨', columnData: options.documentCurrencyCode })
      }
      break
    case 2:
      if (options.paymentDueDate) {
        option.push({ columnName: '支払期日', columnData: options.paymentDueDate })
      }
      if (options.orderRef) {
        if (options.orderRef.no) {
          option.push({ columnName: '注文書番号', columnData: options.orderRef.no })
        }
        if (options.orderRef.issueDate) {
          option.push({ columnName: '注文書発行日', columnData: options.orderRef.issueDate })
        }
      }
      if (options.invoiceDocRef) {
        option.push({ columnName: '参考情報', columnData: options.invoiceDocRef })
      }
      break
    case 3:
      if (options.actualDeliveryDate) {
        option.push({ columnName: '納品日', columnData: options.actualDeliveryDate })
      }
      if (options.promisedDeliveryPeriod && options.promisedDeliveryPeriod.startDate) {
        option.push({ columnName: '納品開始日', columnData: options.promisedDeliveryPeriod.startDate })
      }

      if (options.contractDocumentRef) {
        option.push({ columnName: '契約書番号', columnData: options.contractDocumentRef })
      }

      if (options.accountingCost) {
        option.push({ columnName: '部門', columnData: options.accountingCost })
      }
      break
    case 4:
      if (options.promisedDeliveryPeriod && options.promisedDeliveryPeriod.endDate) {
        option.push({ columnName: '納品終了日', columnData: options.promisedDeliveryPeriod.endDate })
      }
      if (options.deliveryTerms) {
        option.push({ columnName: '納期', columnData: options.deliveryTerms })
      }
      if (options.customerAssAccId) {
        option.push({ columnName: 'ID', columnData: options.customerAssAccId })
      }
      if (options.boldId) {
        option.push({ columnName: '輸送情報', columnData: options.boldId })
      }
      break
    case 5:
      if (options.despatch) {
        option.push({ columnName: '販売者の手数料番号', columnData: options.despatch })
      }
      if (options.physicalLocation) {
        option.push({ columnName: 'DUNSナンバー', columnData: options.physicalLocation })
      }
      if (options.contactEmail) {
        option.push({ columnName: '取引先担当者(アドレス)', columnData: options.contactEmail })
      }
      break
    case 6:
      if (options.interimHours) {
        option.push({ columnName: '暫定時間', columnData: options.interimHours })
      }

      if (options.clearanceClave) {
        option.push({ columnName: '通関識別情報', columnData: options.clearanceClave })
      }

      if (options.tsClearance) {
        option.push({ columnName: 'Tradeshiftクリアランス', columnData: options.tsClearance })
      }
      break
    case 7:
      if (options.fileId) {
        option = {}
        option.columnName = '備考'
        option.columnData = options.fileId
      }
      break
    case 8:
      if (options.note) {
        option = {}
        option.columnName = 'その他特記事項'
        option.columnData = options.note
      }
  }
  return option
}
