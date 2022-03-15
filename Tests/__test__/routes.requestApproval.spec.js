'use strict'

jest.mock('../../Application/node_modules/express', () => {
  return require('jest-express')
})

const Request = require('jest-express').Request
const Response = require('jest-express').Response
const next = require('jest-express').Next
const logger = require('../../Application/lib/logger')
const requestApproval = require('../../Application/routes/requestApproval')
const helper = require('../../Application/routes/helpers/middleware')
const userController = require('../../Application/controllers/userController')
const contractController = require('../../Application/controllers/contractController.js')
const noticeHelper = require('../../Application/routes/helpers/notice')
const errorHelper = require('../../Application/routes/helpers/error')
const approverController = require('../../Application/controllers/approverController')
const inboxController = require('../../Application/controllers/inboxController')

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
  },
  {
    // 差し戻し用
    userId: 'dummyRequester'
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

// data

const inboxControllerGetInvoiceDetailResult = {
  invoiceId: 'PBI3580TEST1_Edge',
  supplier: {
    name: 'サプライヤー1',
    address: {
      streetName: '大手町',
      additionalStreetName: '大手町プレイスウエストタワー',
      cityName: '東京都',
      postbox: '201号 トレシフ',
      postalNumber: '100-8019',
      country: '日本'
    },
    id: [],
    email: 'dev.master.bconnection+supplier1.001@gmail.com'
  },
  customer: {
    name: 'バイヤー1',
    address: {
      streetName: '大手町',
      additionalStreetName: '大手町フレイスウエスト',
      cityName: '東京',
      postbox: '101号 トレシフテスト2 宛',
      postalNumber: '100-8019',
      country: '日本'
    },
    id: []
  },
  taxAmount: 100,
  taxSubtotal: [
    {
      taxableAmount: 1000,
      taxCategoryId: 'S',
      categoryName: 'JP 消費税 10%',
      taxAmount: 100,
      transactionCurrTaxAmount: null
    }
  ],
  transactionCurrTaxAmount: {},
  subtotal: 1000,
  subtotalOftax: 100,
  total: 1100,
  payableAmount: 1100,
  allowanceTotalAmount: null,
  chargeTotalAmount: null,
  extenstionContent: '',
  payments: [],
  invoiceLine: [
    {
      id: '1',
      '明細-項目ID': '1',
      '明細-内容': [],
      '明細-数量': [],
      '明細-単位': [],
      allowanceCharge: [],
      taxTotal: [],
      '明細-単価': [],
      '明細-税（消費税／軽減税率／不課税／免税／非課税）': [],
      '明細-小計 (税抜)': '1,000'
    }
  ],
  allowanceCharge: [],
  options: {
    humanReadableVersion: '1',
    issueDate: '2022-02-28',
    paymentDueDate: '2022-03-30',
    documentCurrencyCode: '円',
    actualDeliveryDate: '2022-03-31',
    taxPointDate: '2022-03-31',
    bookingNumber: '10',
    orderRef: {
      no: 'dummyNo',
      issueDate: '2022-02-28'
    },
    invoiceDocRef: 'dummyInvoiceDocRef',
    promisedDeliveryPeriod: {
      startDate: '2022-02-28',
      endDate: '2022-03-31'
    },
    contractDocumentRef: 'dummyContractDocumentRef',
    accountingCost: '1000',
    deliveryTerms: '2022-03-31',
    customerAssAccId: 'dummyCustomerAssAccId',
    boldId: 'dummyBoldId',
    despatch: '10',
    physicalLocation: 'dummyPhysicalLocation',
    contactEmail: 'abc@mail.com',
    interimHours: '2022-02-28',
    clearanceClave: 'dummyClearanceClave',
    tsClearance: 'dummyTsClearance',
    fileId: 'dummyFileId',
    note: 'dummyNote'
  }
}

const optionLine1 = [
  { columnName: '請求日', columnData: '2022-02-28' },
  { columnData: '2022-03-31', columnName: '課税日' },
  { columnData: '10', columnName: '予約番号' },
  { columnName: '通貨', columnData: '円' }
]
const optionLine2 = [
  { columnName: '支払期日', columnData: '2022-03-30' },
  { columnName: '注文書番号', columnData: 'dummyNo' },
  { columnName: '注文書発行日', columnData: '2022-02-28' },
  { columnName: '参考情報', columnData: 'dummyInvoiceDocRef' }
]
const optionLine3 = [
  { columnName: '納品日', columnData: '2022-03-31' },
  { columnName: '納品開始日', columnData: '2022-02-28' },
  { columnName: '契約書番号', columnData: 'dummyContractDocumentRef' },
  { columnName: '部門', columnData: '1000' }
]
const optionLine4 = [
  { columnName: '納品終了日', columnData: '2022-03-31' },
  { columnName: '納期', columnData: '2022-03-31' },
  { columnName: 'ID', columnData: 'dummyCustomerAssAccId' },
  { columnName: '輸送情報', columnData: 'dummyBoldId' }
]

const optionLine5 = [
  { columnName: '販売者の手数料番号', columnData: '10' },
  { columnName: 'DUNSナンバー', columnData: 'dummyPhysicalLocation' },
  { columnName: '取引先担当者(アドレス)', columnData: 'abc@mail.com' }
]

const optionLine6 = [
  { columnName: '暫定時間', columnData: '2022-02-28' },
  { columnName: '通関識別情報', columnData: 'dummyClearanceClave' },
  { columnName: 'Tradeshiftクリアランス', columnData: 'dummyTsClearance' }
]

const optionLine7 = { columnName: '備考', columnData: 'dummyFileId' }
const optionLine8 = { columnName: 'その他特記事項', columnData: 'dummyNote' }

// searchResult
const searchResult1 = {
  status: 0,
  searchResult: [
    {
      No: 1,
      approveRouteName: 'hello2',
      approverCount: 1,
      uuid: '25061cf2-f4e4-485f-9077-60372329f38e'
    },
    {
      No: 2,
      approveRouteName: 'awet4we',
      approverCount: 4,
      uuid: '634e5222-2e99-4fa8-bb4b-4a7bb2c9f54e'
    },
    {
      No: 3,
      approveRouteName: 'hello6',
      approverCount: 1,
      uuid: '6bfb4f2b-382e-44ea-817a-ef781d833114'
    },
    {
      No: 4,
      approveRouteName: 'hello4',
      approverCount: 1,
      uuid: '9a729326-bb14-49f1-bd10-36f38e5e96e9'
    },
    {
      No: 5,
      approveRouteName: 'test123',
      approverCount: 1,
      uuid: 'a06b4411-8950-4ff0-ac61-99a229800952'
    },
    {
      No: 6,
      approveRouteName: 'hello3',
      approverCount: 1,
      uuid: 'a0e9af94-bd04-4da4-abb5-9e14ca1c0363'
    },
    {
      No: 7,
      approveRouteName: 'hello5',
      approverCount: 1,
      uuid: 'a8312c5c-694a-4abe-92e8-b07cff7e2353'
    },
    {
      No: 8,
      approveRouteName: 'w6twae456',
      approverCount: 3,
      uuid: 'aa43a072-59ce-4972-bdbc-1143fbf41061'
    },
    {
      No: 9,
      approveRouteName: 'hello',
      approverCount: 1,
      uuid: 'bdaea953-79f3-4560-8209-8d0e1710a224'
    }
  ]
}

const searchResult2 = {
  name: 'hello2',
  users: [
    {
      Id: 'dummyId',
      tenantId: 'dummytenantId',
      FirstName: 'dummyFirstName',
      LastName: 'dummyLastName',
      Username: 'dummyUsername'
    }
  ]
}

const readApprovalResult = {
  requestId: 'dummyRequestId',
  contractId: 'dummyContractId',
  approveRouteId: 'dummyApproveRouteId',
  invoiceId: 'dummyInvoiceId',
  requester: 'dummyRequester',
  status: '80',
  message: 'test',
  create: '2022-02-28',
  isSaved: false
}

const readApprovalResult2 = {
  requestId: 'dummyRequestId',
  contractId: 'dummyContractId',
  approveRouteId: 'dummyApproveRouteId',
  invoiceId: 'dummyInvoiceId',
  requester: 'dummyRequester',
  status: '90',
  message: 'test',
  create: '2022-02-28',
  isSaved: false
}

let errorSpy, infoSpy
let request, response
let userControllerFindOneSpy, contractControllerFindOneSpy, checkContractStatusSpy
let approverControllerSearchApproveRouteList, inboxControllerGetInvoiceDetail
let approverControllerGetApproveRoute,
  approverControllerRequestApproval,
  approverControllerCheckApproveRoute,
  approverControllerSaveApproval
let approverControllerReadApproval, approverControllerSaveMessage, approverControllerGetApprovalFromRejected

describe('requestApprovalのテスト', () => {
  beforeEach(() => {
    request = new Request()
    request.flash = jest.fn()
    response = new Response()
    errorSpy = jest.spyOn(logger, 'error')
    infoSpy = jest.spyOn(logger, 'info')
    userControllerFindOneSpy = jest.spyOn(userController, 'findOne')
    contractControllerFindOneSpy = jest.spyOn(contractController, 'findOne')
    checkContractStatusSpy = jest.spyOn(helper, 'checkContractStatus')
    approverControllerSearchApproveRouteList = jest.spyOn(approverController, 'searchApproveRouteList')
    inboxControllerGetInvoiceDetail = jest.spyOn(inboxController, 'getInvoiceDetail')
    approverControllerGetApproveRoute = jest.spyOn(approverController, 'getApproveRoute')
    approverControllerRequestApproval = jest.spyOn(approverController, 'requestApproval')
    approverControllerReadApproval = jest.spyOn(approverController, 'readApproval')
    approverControllerSaveMessage = jest.spyOn(approverController, 'saveMessage')
    approverControllerCheckApproveRoute = jest.spyOn(approverController, 'checkApproveRoute')
    approverControllerSaveApproval = jest.spyOn(approverController, 'saveApproval')
    approverControllerGetApprovalFromRejected = jest.spyOn(approverController, 'getApprovalFromRejected')
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
    approverControllerSearchApproveRouteList.mockRestore()
    inboxControllerGetInvoiceDetail.mockRestore()
    approverControllerGetApproveRoute.mockRestore()
    approverControllerRequestApproval.mockRestore()
    approverControllerReadApproval.mockRestore()
    approverControllerSaveMessage.mockRestore()
    approverControllerCheckApproveRoute.mockRestore()
    approverControllerSaveApproval.mockRestore()
    approverControllerGetApprovalFromRejected.mockRestore()
  })

  describe('ルーティング', () => {
    test('requestApprovalのルーティングを確認', async () => {
      expect(requestApproval.router.get).toBeCalledWith(
        '/:invoiceId',
        helper.isAuthenticated,
        requestApproval.cbGetRequestApproval
      )

      expect(requestApproval.router.post).toBeCalledWith(
        '/approveRoute',
        helper.isAuthenticated,
        requestApproval.cbPostGetApproveRoute
      )

      expect(requestApproval.router.post).toBeCalledWith(
        '/detailApproveRoute',
        helper.isAuthenticated,
        requestApproval.cbPostGetDetailApproveRoute
      )

      expect(requestApproval.router.post).toBeCalledWith(
        '/:invoiceId',
        helper.isAuthenticated,
        requestApproval.cbPostApproval
      )
    })
  })

  describe('コールバック:cbGetRequestApproval', () => {
    test('正常', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = {
        ...session,
        requestApproval: { message: 'test', approveRouteId: '', isSaved: true },
        isSaved: true
      }
      request.user = { ...user[0] }
      request.params = {
        invoiceId: 'bfc26e3a-f2e8-5a05-9f8d-1e8f41196904'
      }

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[0])
      // DBからの正常な契約情報取得を想定する
      contractControllerFindOneSpy.mockReturnValue(Contracts[0])

      // ユーザ権限チェック結果設定
      checkContractStatusSpy.mockReturnValue(Contracts[0].dataValues.contractStatus)

      inboxControllerGetInvoiceDetail.mockReturnValue(inboxControllerGetInvoiceDetailResult)
      // approverControllerReadApproval.mockReturnValue(null)

      // 試験実施
      await requestApproval.cbGetRequestApproval(request, response, next)

      // 結果確認
      // 承認ルートページレンダリングを呼び出し
      expect(response.render).toBeCalledWith('requestApproval', {
        ...inboxControllerGetInvoiceDetailResult,
        optionLine1: optionLine1,
        optionLine2: optionLine2,
        optionLine3: optionLine3,
        optionLine4: optionLine4,
        optionLine5: optionLine5,
        optionLine6: optionLine6,
        optionLine7: optionLine7,
        optionLine8: optionLine8,
        documentId: 'bfc26e3a-f2e8-5a05-9f8d-1e8f41196904',
        message: 'test',
        approveRoute: null,
        rejectedUser: null
      })
    })

    test('正常：保存したデータがある場合', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session, isSaved: false }
      request.user = { ...user[0] }
      request.params = {
        invoiceId: 'bfc26e3a-f2e8-5a05-9f8d-1e8f41196904'
      }

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[0])
      // DBからの正常な契約情報取得を想定する
      contractControllerFindOneSpy.mockReturnValue(Contracts[0])

      // ユーザ権限チェック結果設定
      checkContractStatusSpy.mockReturnValue(Contracts[0].dataValues.contractStatus)

      inboxControllerGetInvoiceDetail.mockReturnValue(inboxControllerGetInvoiceDetailResult)
      approverControllerReadApproval.mockReturnValue(readApprovalResult)

      approverControllerGetApproveRoute.mockReturnValue(searchResult2)
      // 試験実施
      await requestApproval.cbGetRequestApproval(request, response, next)

      // 結果確認
      // 承認ルートページレンダリングを呼び出し
      expect(response.render).toBeCalledWith('requestApproval', {
        ...inboxControllerGetInvoiceDetailResult,
        optionLine1: optionLine1,
        optionLine2: optionLine2,
        optionLine3: optionLine3,
        optionLine4: optionLine4,
        optionLine5: optionLine5,
        optionLine6: optionLine6,
        optionLine7: optionLine7,
        optionLine8: optionLine8,
        documentId: 'bfc26e3a-f2e8-5a05-9f8d-1e8f41196904',
        message: readApprovalResult.message,
        approveRoute: searchResult2,
        rejectedUser: null
      })
    })

    test('正常：差し戻しの場合', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session, isSaved: false }
      request.user = { ...user[3] }
      request.params = {
        invoiceId: 'bfc26e3a-f2e8-5a05-9f8d-1e8f41196904'
      }

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[0])
      // DBからの正常な契約情報取得を想定する
      contractControllerFindOneSpy.mockReturnValue(Contracts[0])

      // ユーザ権限チェック結果設定
      checkContractStatusSpy.mockReturnValue(Contracts[0].dataValues.contractStatus)

      inboxControllerGetInvoiceDetail.mockReturnValue(inboxControllerGetInvoiceDetailResult)
      approverControllerReadApproval.mockReturnValue(readApprovalResult2)

      approverControllerGetApproveRoute.mockReturnValue(searchResult2)
      // 試験実施
      await requestApproval.cbGetRequestApproval(request, response, next)

      // 結果確認
      // 承認ルートページレンダリングを呼び出し
      expect(response.render).toBeCalledWith('requestApproval', {
        ...inboxControllerGetInvoiceDetailResult,
        optionLine1: optionLine1,
        optionLine2: optionLine2,
        optionLine3: optionLine3,
        optionLine4: optionLine4,
        optionLine5: optionLine5,
        optionLine6: optionLine6,
        optionLine7: optionLine7,
        optionLine8: optionLine8,
        documentId: 'bfc26e3a-f2e8-5a05-9f8d-1e8f41196904',
        message: null,
        approveRoute: null,
        rejectedUser: false
      })
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

      await requestApproval.cbGetRequestApproval(request, response, next)

      // 結果確認
      // 404エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)

      // userContextがLoggedInになっている
      expect(request.session?.userContext).toBe('LoggedIn')
      // session.userRoleが'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'になっている
      expect(request.session?.userRole).toBe('a6a3edcd-00d9-427c-bf03-4ef0112ba16d')
      // 解約手続き中画面が表示「される」
      expect(next).toHaveBeenCalledWith(noticeHelper.create('cancelprocedure'))
    })

    test('500エラー：差し戻しの承認データ取得エラー', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session, isSaved: false }
      request.user = { ...user[3] }
      request.params = {
        invoiceId: 'bfc26e3a-f2e8-5a05-9f8d-1e8f41196904'
      }

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[0])
      // DBからの正常な契約情報取得を想定する
      contractControllerFindOneSpy.mockReturnValue(Contracts[0])

      // ユーザ権限チェック結果設定
      checkContractStatusSpy.mockReturnValue(Contracts[0].dataValues.contractStatus)

      inboxControllerGetInvoiceDetail.mockReturnValue(inboxControllerGetInvoiceDetailResult)
      approverControllerReadApproval.mockReturnValue(readApprovalResult2)

      const dbError = new Error()
      approverControllerGetApprovalFromRejected.mockReturnValue(dbError)

      approverControllerGetApproveRoute.mockReturnValue(searchResult2)
      // 試験実施
      await requestApproval.cbGetRequestApproval(request, response, next)

      // 結果確認
      expect(next).toHaveBeenCalledWith(errorHelper.create(500))
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

      await requestApproval.cbGetRequestApproval(request, response, next)

      // 結果確認
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

      await requestApproval.cbGetRequestApproval(request, response, next)

      // 結果確認
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
      await requestApproval.cbGetRequestApproval(request, response, next)

      // 結果確認
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

      await requestApproval.cbGetRequestApproval(request, response, next)

      // 結果確認
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
      await requestApproval.cbGetRequestApproval(request, response, next)

      // 結果確認
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
      await requestApproval.cbGetRequestApproval(request, response, next)

      // 結果確認
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
      await requestApproval.cbGetRequestApproval(request, response, next)

      // 結果確認
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
      await requestApproval.cbGetRequestApproval(request, response, next)

      // 結果確認
      // 404エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      expect(next).toHaveBeenCalledWith(errorHelper.create(500))
    })

    test('準正常：getInvoiceDetailError', async () => {
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

      const dbError = new Error('DBerror')
      inboxControllerGetInvoiceDetail.mockImplementation(() => {
        throw dbError
      })

      // 試験実施
      await requestApproval.cbGetRequestApproval(request, response, next)

      // 結果確認
      // 受領請求書への仕訳情報設定へリダイレクトされ「る」
      expect(request.flash).toBeCalledWith('noti', ['支払依頼', 'システムエラーが発生しました。'])
      expect(response.redirect).toHaveBeenCalledWith('/inboxList/1')
    })
  })

  describe('コールバック:cbPostGetApproveRoute', () => {
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

      approverControllerSearchApproveRouteList.mockReturnValue(searchResult1)

      // 試験実施
      await requestApproval.cbPostGetApproveRoute(request, response, next)

      // 結果確認
      // 承認ルートページレンダリングを呼び出し
      expect(response.status).toHaveBeenCalledWith(200)
      expect(response.send).toHaveBeenCalledWith(searchResult1.searchResult)
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

      await requestApproval.cbPostGetApproveRoute(request, response, next)

      // 結果確認
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

      await requestApproval.cbPostGetApproveRoute(request, response, next)

      // 結果確認
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

      await requestApproval.cbPostGetApproveRoute(request, response, next)

      // 結果確認
      // 404エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      // userContextがLoggedInになっている
      expect(request.session?.userContext).toBe('LoggedIn')
      // 500エラーがエラーハンドリング「される」
      expect(next).toHaveBeenCalledWith(errorHelper.create(500))
    })

    test('500エラー：requestのsession,userIdがnullの場合', async () => {
      // 実施
      await requestApproval.cbPostGetApproveRoute(request, response, next)

      // 結果確認
      // 404エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
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

      await requestApproval.cbPostGetApproveRoute(request, response, next)

      // 結果確認
      // 404，500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
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
      await requestApproval.cbPostGetApproveRoute(request, response, next)

      // 結果確認
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
      await requestApproval.cbPostGetApproveRoute(request, response, next)

      // 結果確認
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
      await requestApproval.cbPostGetApproveRoute(request, response, next)

      // 結果確認
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
      await requestApproval.cbPostGetApproveRoute(request, response, next)

      // 結果確認
      // 404エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      expect(next).toHaveBeenCalledWith(errorHelper.create(500))
    })

    test('500エラー：承認ルートを検索error', async () => {
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

      // approverControllerの結果にエラーが含めてる場合
      const dbError = new Error()
      approverControllerSearchApproveRouteList.mockReturnValue({ status: 0, searchResult: dbError })

      // 試験実施
      await requestApproval.cbPostGetApproveRoute(request, response, next)

      // 結果確認
      // 500エラーがエラーハンドリング「される」
      expect(response.status).toHaveBeenCalledWith(500)
      expect(response.send).toHaveBeenCalledWith('500 Internal Server Error')
    })
  })

  describe('コールバック:cbPostSave', () => {
    test('正常', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...user[0] }
      request.body = {
        approveRouteId: 'dummyId'
      }
      request.params = {
        invoiceId: 'bfc26e3a-f2e8-5a05-9f8d-1e8f41196904'
      }

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[0])
      // DBからの正常な契約情報取得を想定する
      contractControllerFindOneSpy.mockReturnValue(Contracts[0])

      // ユーザ権限チェック結果設定
      checkContractStatusSpy.mockReturnValue(Contracts[0].dataValues.contractStatus)

      approverControllerSaveMessage.mockReturnValue(0)

      // 試験実施
      await requestApproval.cbPostSave(request, response, next)

      // 結果確認
      expect(request.flash).toBeCalledWith('info', 'メッセージを保存しました。')
      expect(response.redirect).toHaveBeenCalledWith('/requestApproval/bfc26e3a-f2e8-5a05-9f8d-1e8f41196904')
    })

    test('正常：保存失敗した場合', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...user[0] }
      request.body = {
        approveRouteId: 'dummyId'
      }
      request.params = {
        invoiceId: 'bfc26e3a-f2e8-5a05-9f8d-1e8f41196904'
      }

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[0])
      // DBからの正常な契約情報取得を想定する
      contractControllerFindOneSpy.mockReturnValue(Contracts[0])

      // ユーザ権限チェック結果設定
      checkContractStatusSpy.mockReturnValue(Contracts[0].dataValues.contractStatus)

      // 試験実施
      await requestApproval.cbPostSave(request, response, next)

      // 結果確認
      expect(request.flash).toBeCalledWith('noti', ['支払依頼', '保存失敗しました。'])
      expect(response.redirect).toHaveBeenCalledWith('/requestApproval/bfc26e3a-f2e8-5a05-9f8d-1e8f41196904')
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

      await requestApproval.cbPostSave(request, response, next)

      // 結果確認
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

      await requestApproval.cbPostSave(request, response, next)

      // 結果確認
      expect(next).not.toHaveBeenCalledWith(error404)
      expect(next).toHaveBeenCalledWith(errorHelper.create(400))
    })

    test('400エラー:requestのbodyのapproveRouteIdの値がundefinedの場合', async () => {
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

      approverControllerGetApproveRoute.mockReturnValue(searchResult2)

      // 試験実施
      await requestApproval.cbPostSave(request, response, next)

      // 結果確認
      expect(response.status).toHaveBeenCalledWith(400)
      expect(response.send).toHaveBeenCalledWith('400 Bad Request')
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

      await requestApproval.cbPostSave(request, response, next)

      // 結果確認
      // 404エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      // userContextがLoggedInになっている
      expect(request.session?.userContext).toBe('LoggedIn')
      // 500エラーがエラーハンドリング「される」
      expect(next).toHaveBeenCalledWith(errorHelper.create(500))
    })

    test('500エラー：requestのsession,userIdがnullの場合', async () => {
      // 実施
      await requestApproval.cbPostSave(request, response, next)

      // 結果確認
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

      await requestApproval.cbPostSave(request, response, next)

      // 結果確認
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
      await requestApproval.cbPostSave(request, response, next)

      // 結果確認
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
      await requestApproval.cbPostSave(request, response, next)

      // 結果確認
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
      await requestApproval.cbPostSave(request, response, next)

      // 結果確認
      // 404エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      // 500エラーがエラーハンドリング「される」
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
      await requestApproval.cbPostSave(request, response, next)

      // 結果確認
      // 404エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      // 500エラーがエラーハンドリング「される」
      expect(next).toHaveBeenCalledWith(errorHelper.create(500))
    })
  })

  describe('コールバック:cbPostGetDetailApproveRoute', () => {
    test('正常', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...user[0] }
      request.body = {
        approveRouteId: 'dummyId'
      }

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[0])
      // DBからの正常な契約情報取得を想定する
      contractControllerFindOneSpy.mockReturnValue(Contracts[0])

      // ユーザ権限チェック結果設定
      checkContractStatusSpy.mockReturnValue(Contracts[0].dataValues.contractStatus)

      approverControllerGetApproveRoute.mockReturnValue(searchResult2)

      // 試験実施
      await requestApproval.cbPostGetDetailApproveRoute(request, response, next)
      // 結果確認
      // 承認ルートページレンダリングを呼び出し
      expect(response.status).toHaveBeenCalledWith(200)
      expect(response.send).toHaveBeenCalledWith({
        approveRouteId: request.body.approveRouteId,
        name: searchResult2.name,
        users: searchResult2.users
      })
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

      await requestApproval.cbPostGetDetailApproveRoute(request, response, next)

      // 結果確認
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

      await requestApproval.cbPostGetDetailApproveRoute(request, response, next)

      // 結果確認
      // 404，500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      expect(next).toHaveBeenCalledWith(errorHelper.create(400))
    })

    test('400エラー:requestのbodyのapproveRouteIdの値がundefinedの場合', async () => {
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

      approverControllerGetApproveRoute.mockReturnValue(searchResult2)

      // 試験実施
      await requestApproval.cbPostGetDetailApproveRoute(request, response, next)
      // 結果確認
      // 承認ルートページレンダリングを呼び出し
      expect(response.status).toHaveBeenCalledWith(400)
      expect(response.send).toHaveBeenCalledWith('bad request')
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

      await requestApproval.cbPostGetDetailApproveRoute(request, response, next)

      // 結果確認
      // 404エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      // userContextがLoggedInになっている
      expect(request.session?.userContext).toBe('LoggedIn')
      // 500エラーがエラーハンドリング「される」
      expect(next).toHaveBeenCalledWith(errorHelper.create(500))
    })

    test('500エラー：requestのsession,userIdがnullの場合', async () => {
      // 実施
      await requestApproval.cbPostGetDetailApproveRoute(request, response, next)

      // 結果確認
      // 404エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
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

      await requestApproval.cbPostGetDetailApproveRoute(request, response, next)

      // 結果確認
      // 404，500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
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
      await requestApproval.cbPostGetDetailApproveRoute(request, response, next)

      // 結果確認
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
      await requestApproval.cbPostGetDetailApproveRoute(request, response, next)

      // 結果確認
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
      await requestApproval.cbPostGetDetailApproveRoute(request, response, next)

      // 結果確認
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
      await requestApproval.cbPostGetDetailApproveRoute(request, response, next)

      // 結果確認
      // 404エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      expect(next).toHaveBeenCalledWith(errorHelper.create(500))
    })
  })

  describe('コールバック:cbPostApproval', () => {
    test('正常', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...user[0] }
      request.body = {
        approveRouteId: 'dummyId'
      }
      request.params = {
        invoiceId: '343b34d1-f4db-484e-b822-8e2ce9017d14'
      }

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[0])
      // DBからの正常な契約情報取得を想定する
      contractControllerFindOneSpy.mockReturnValue(Contracts[0])

      // ユーザ権限チェック結果設定
      checkContractStatusSpy.mockReturnValue(Contracts[0].dataValues.contractStatus)

      approverControllerCheckApproveRoute.mockReturnValue(true)
      approverControllerRequestApproval.mockReturnValue(0)
      approverControllerSaveApproval.mockReturnValue(0)

      // 試験実施
      await requestApproval.cbPostApproval(request, response, next)
      // 結果確認
      // 支払依頼ページレンダリングを呼び出し
      expect(request.flash).toBeCalledWith('info', '支払依頼を完了しました。')
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

      await requestApproval.cbPostApproval(request, response, next)

      // 結果確認
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

      await requestApproval.cbPostApproval(request, response, next)

      // 結果確認
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

      await requestApproval.cbPostApproval(request, response, next)

      // 結果確認
      // 404エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      // userContextがLoggedInになっている
      expect(request.session?.userContext).toBe('LoggedIn')
      // 500エラーがエラーハンドリング「される」
      expect(next).toHaveBeenCalledWith(errorHelper.create(500))
    })

    test('500エラー：requestのsession,userIdがnullの場合', async () => {
      // 実施
      await requestApproval.cbPostApproval(request, response, next)

      // 結果確認
      // 404エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
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

      await requestApproval.cbPostApproval(request, response, next)

      // 結果確認
      // 404，500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
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
      await requestApproval.cbPostApproval(request, response, next)

      // 結果確認
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
      await requestApproval.cbPostApproval(request, response, next)

      // 結果確認
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
      await requestApproval.cbPostApproval(request, response, next)

      // 結果確認
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
      await requestApproval.cbPostApproval(request, response, next)

      // 結果確認
      // 404エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      expect(next).toHaveBeenCalledWith(errorHelper.create(500))
    })

    test('500エラー：approverController結果が0以外', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...user[0] }
      request.body = {
        approveRouteId: 'dummyId'
      }
      request.params = {
        invoiceId: 'bfc26e3a-f2e8-5a05-9f8d-1e8f41196904'
      }

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[0])
      // DBからの正常な契約情報取得を想定する
      contractControllerFindOneSpy.mockReturnValue(Contracts[0])

      // ユーザ権限チェック結果設定
      checkContractStatusSpy.mockReturnValue(Contracts[0].dataValues.contractStatus)

      approverControllerCheckApproveRoute.mockReturnValue(true)
      approverControllerRequestApproval.mockReturnValue(-1)

      // 試験実施
      await requestApproval.cbPostApproval(request, response, next)
      // 結果確認
      // 前のページを呼び出し
      expect(response.redirect).toHaveBeenCalledWith('/requestApproval/bfc26e3a-f2e8-5a05-9f8d-1e8f41196904')
    })

    test('500エラー：approverControllerのcheckApproveRouteがfalseの場合', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...user[0] }
      request.body = {
        approveRouteId: 'dummyId'
      }
      request.params = {
        invoiceId: 'bfc26e3a-f2e8-5a05-9f8d-1e8f41196904'
      }

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[0])
      // DBからの正常な契約情報取得を想定する
      contractControllerFindOneSpy.mockReturnValue(Contracts[0])

      // ユーザ権限チェック結果設定
      checkContractStatusSpy.mockReturnValue(Contracts[0].dataValues.contractStatus)

      approverControllerCheckApproveRoute.mockReturnValue(false)
      approverControllerRequestApproval.mockReturnValue(-1)

      // 試験実施
      await requestApproval.cbPostApproval(request, response, next)
      // 結果確認
      // 前のページを呼び出し
      expect(response.redirect).toHaveBeenCalledWith('/requestApproval/bfc26e3a-f2e8-5a05-9f8d-1e8f41196904')
    })
  })
})
