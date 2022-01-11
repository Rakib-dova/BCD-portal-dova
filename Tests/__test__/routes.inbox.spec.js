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
  inboxControllerSpy

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
const Contracts = require('../mockDB/Contracts_Table')

// 実装ダミーデータ
const invoiceLine = [
  {
    '明細-項目ID': 1,
    '明細-内容': [
      { item: '内容', value: '画面作成明細１' },
      { item: '割引', value: '明細割引１' }, // 明細-割引1-内容
      { item: '追加料金1', value: '追加料金１' }, // 明細-追加料金1-内容
      { item: '注文書番号', value: '注文書番号' },
      { item: '注文明細番号', value: '注文明細番号' },
      { item: '輸送情報', value: '輸送情報' },
      { item: '商品分類コード: ECCN', value: '商品分類コード: ECCN' },
      { item: '納品日', value: '22/02/10' },
      { item: '配送先', value: '市区町村・番地、ビル、マンション名、都道府県、100-0000、JP' }
    ],
    '明細-数量': [20, 5, 5],
    '明細-単位': ['個', '%', '%'],
    '明細-単価': ['100,000', '-100,000', '100,000'],
    '明細-税（消費税／軽減税率／不課税／免税／非課税）': '10%',
    '明細-小計 (税抜)': '2,000,000'
  },
  {
    '明細-項目ID': 2,
    '明細-内容': [{ item: '内容', value: '画面作成明細2' }],
    '明細-数量': [40],
    '明細-単位': ['個'],
    '明細-単価': ['200,000'],
    '明細-税（消費税／軽減税率／不課税／免税／非課税）': '10%',
    '明細-小計 (税抜)': '8,000,000'
  },

  {
    割引: [
      {
        '割引-項目ID': '割引',
        '割引-内容': '割引１',
        '割引-数量': 2,
        '割引-単位': '%',
        '割引-税（消費税／軽減税率／不課税／免税／非課税）': '10%',
        '割引-小計（税抜）': '-188,109'
      },
      {
        '割引-項目ID': '割引',
        '割引-内容': '割引2',
        '割引-数量': 4,
        '割引-単位': '%',
        '割引-税（消費税／軽減税率／不課税／免税／非課税）': '10%',
        '割引-小計（税抜）': '-376,218'
      }
    ],
    追加料金: [
      {
        '追加料金-項目ID': '追加料金',
        '追加料金-内容': '追加料金１',
        '追加料金-数量': 3,
        '追加料金-単位': '%',
        '追加料金-税（消費税／軽減税率／不課税／免税／非課税）': '10%',
        '追加料金-小計（税抜）': '300,235'
      },
      {
        '追加料金-項目ID': '追加料金',
        '追加料金-内容': '追加料金2',
        '追加料金-数量': 6,
        '追加料金-単位': '%',
        '追加料金-税（消費税／軽減税率／不課税／免税／非課税）': '10%',
        '追加料金-小計（税抜）': '563,693'
      }
    ]
  }
]
// 支払い条件と手段ダミーデータ
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
    inboxControllerSpy.mockRestore()
  })

  describe('ルーティング', () => {
    test('inboxのルーティングを確認', async () => {
      expect(inbox.router.get).toBeCalledWith('/:invoiceId', helper.isAuthenticated, inbox.cbGetIndex)
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
      const dummyData = new InvoiceDetail(dummyDocument)
      inboxControllerSpy.mockReturnValue(dummyData)

      // 試験実施
      await inbox.cbGetIndex(request, response, next)

      // 期待結果
      // userContextがLoggedInになっている
      expect(request.session?.userContext).toBe('LoggedIn')
      // session.userRoleが'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'になっている
      expect(request.session?.userRole).toBe('a6a3edcd-00d9-427c-bf03-4ef0112ba16d')
      // response.renderでinboxListが呼ばれ「る」
      expect(response.render).toHaveBeenCalledWith('inbox', {
        ...dummyData,
        optionLine1: createOptions(1, dummyData.options),
        optionLine2: createOptions(2, dummyData.options),
        optionLine3: createOptions(3, dummyData.options),
        optionLine4: createOptions(4, dummyData.options),
        optionLine5: createOptions(5, dummyData.options),
        optionLine6: createOptions(6, dummyData.options),
        optionLine7: createOptions(7, dummyData.options),
        optionLine8: createOptions(8, dummyData.options)
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
      const dummyData = new InvoiceDetail(dummyDocument)
      inboxControllerSpy.mockReturnValue(dummyData)

      // 試験実施
      await inbox.cbGetIndex(request, response, next)

      // 期待結果
      // userContextがLoggedInになっている
      expect(request.session?.userContext).toBe('LoggedIn')
      // session.userRoleが'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'になっている
      expect(request.session?.userRole).toBe('a6a3edcd-00d9-427c-bf03-4ef0112ba16d')
      // response.renderでinboxListが呼ばれ「る」
      expect(response.render).toHaveBeenCalledWith('inbox', {
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
        optionLine8: {}
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
