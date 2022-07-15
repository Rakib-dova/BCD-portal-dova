'use strict'

jest.mock('../../Application/node_modules/express', () => {
  return require('jest-express')
})

const pdfInvoice = require('../../Application/routes/pdfInvoice.js')
const pdfInvoiceCsvUpload = require('../../Application/routes/pdfInvoiceCsvUpload.js')
const Request = require('jest-express').Request
const Response = require('jest-express').Response
const next = require('jest-express').Next
const fs = require('fs')

const errorHelper = require('../../Application/routes/helpers/error')
const apiManager = require('../../Application/controllers/apiManager.js')
const pdfInvoiceController = require('../../Application/controllers/pdfInvoiceController.js')
const pdfInvoiceHistoryController = require('../../Application/controllers/pdfInvoiceHistoryController.js')
const pdfInvoiceHistoryDetailController = require('../../Application/controllers/pdfInvoiceHistoryDetailController.js')
const logger = require('../../Application/lib/logger.js')
const csv = require('../../Application/lib/csv.js')
const validation = require('../../Application/lib/pdfInvoiceCsvUpdateValidation')
const db = require('../../Application/models')

let request, response, infoSpy, errorSpy, accessTradeshift
let createUploadHistoryAndRowsSpy
let pdfInvoiceFindforTenantSpy, createInvoicesAndLinesSpy
let findInvoiceDetailSpy
let fsSpy
let validateSpy, validateHeaderSpy
let pdfInvoiceGetAccountAndSenderInfoSpy
let convertCsvStringToMultiArraySpy

// 404エラー定義
const error404 = new Error('お探しのページは見つかりませんでした。')
error404.name = 'Not Found'
error404.status = 404

const user = [
  {
    // 契約ステータス：契約中
    userId: '388014b9-d667-4144-9cc4-5da420981438',
    email: 'dummy@testdummy.com',
    tenantId: '795e60d0-1cf4-4bb3-a3e5-06d94ad438af',
    accessToken: 'dummyAccessToken',
    refreshToken: 'dummyRefreshToken'
  }
]

// 戻り値定義
const accountInfo = {
  CompanyName: '送信先ダミー企業',
  Country: 'JP',
  CompanyAccountId: '795e60d0-1cf4-4bb3-a3e5-06d94ad438af',
  State: 'ACTIVE',
  Description: '送信先ダミー企業',
  Identifiers: [{ scheme: 'TS:ID', value: '795e60d0-1cf4-4bb3-a3e5-06d94ad438af' }],
  AddressLines: [
    { scheme: 'city', value: '東京都' },
    { scheme: 'locality', value: '大手町プレイスウエスト' },
    { scheme: 'street', value: '大手町' },
    { scheme: 'zip', value: '100-8019' }
  ],
  LogoURL: 'https://res.cloudinary.com/tradeshift-test/image/upload/fa0cc2df-fa4f-5052-b22a-b6984d326ab6.png',
  PublicProfile: false,
  NonuserInvoicing: false,
  AutoAcceptConnections: false,
  Restricted: true,
  Created: '2021-07-27T09:10:59.241Z',
  Modified: '2021-07-27T09:13:17.436Z',
  AccountType: 'FREE'
}

const senderInfo = {
  sendCompany: '送信先ダミー企業',
  sendPost: '100-8019',
  sendAddr1: '東京都',
  sendAddr2: '大手町',
  sendAddr3: '大手町プレイスウエスト'
}

const uploadFileData =
  '登録番号,請求書番号,支払期日,請求日,納品日,宛先企業名,宛先郵便番号,宛先都道府県,宛先住所,宛先ビル名/フロア等,銀行名,支店名,科目,口座番号,口座名義,備考,明細-項目ID,明細-内容,明細-数量,明細-単位,明細-単価,明細-税（消費税／軽減税率／不課税／免税／非課税）' +
  '\r\n' +
  'T1234567890123,upload001,2021-5-1,2021-5-2,2021-5-3,宛先企業１,000-0000,宛先東京,宛先中央区,宛先びる１Ｆ,ＡＢＣ銀行,１２３支店,普通,1234567,MEIGI KOZA,備考備考,a001,明細１,1,個,単価,消費税' +
  '\r\n' +
  'T1234567890123,upload002,2021-5-1,2021-5-2,2021-5-3,宛先企業１,000-0000,宛先東京,宛先中央区,宛先びる１Ｆ,ＡＢＣ銀行,１２３支店,普通,1234567,MEIGI KOZA,備考備考,a001,明細１,1,1000,100000,消費税' +
  '\r\n' +
  'T1234567890123,upload003,2021-5-1,2021-5-2,2021-5-3,宛先企業１,000-0000,宛先東京,宛先中央区,宛先びる１Ｆ,ＡＢＣ銀行,１２３支店,普通,1234567,MEIGI KOZA,備考備考,a001,明細１,1,1000,100000,消費税'

const uploadFileDataSuccess =
  '登録番号,請求書番号,支払期日,請求日,納品日,宛先企業名,宛先郵便番号,宛先都道府県,宛先住所,宛先ビル名/フロア等,銀行名,支店名,科目,口座番号,口座名義,備考,明細-項目ID,明細-内容,明細-数量,明細-単位,明細-単価,明細-税（消費税／軽減税率／不課税／免税／非課税）' +
  '\r\n' +
  'T1234567890123,upload001,2021-5-1,2021-5-2,2021-5-3,宛先企業１,000-0000,宛先東京,宛先中央区,宛先びる１Ｆ,ＡＢＣ銀行,１２３支店,普通,1234567,MEIGI KOZA,備考備考,a001,明細１,1,個,単価,消費税' +
  '\r\n' +
  'T1234567890123,upload001,2021-5-1,2021-5-2,2021-5-3,宛先企業１,000-0000,宛先東京,宛先中央区,宛先びる１Ｆ,ＡＢＣ銀行,１２３支店,普通,1234567,MEIGI KOZA,備考備考,a002,明細１,1,個,単価,消費税'

const uploadFileDataNull =
  '登録番号,請求書番号,支払期日,請求日,納品日,宛先企業名,宛先郵便番号,宛先都道府県,宛先住所,宛先ビル名/フロア等,銀行名,支店名,科目,口座番号,口座名義,備考,明細-項目ID,明細-内容,明細-数量,明細-単位,明細-単価,明細-税（消費税／軽減税率／不課税／免税／非課税）' +
  '\r\n' +
  '\r\n'

const defaultCsvData =
  '登録番号,請求書番号,支払期日,請求日,納品日,宛先企業名,宛先郵便番号,宛先都道府県,宛先住所,宛先ビル名/フロア等,銀行名,支店名,科目,口座番号,口座名義,備考,明細-項目ID,明細-内容,明細-数量,明細-単位,明細-単価,明細-税（消費税／軽減税率／不課税／免税／非課税）'

const validInvoicesData = {
  all: [
    {
      sendTenantId: '795e60d0-1cf4-4bb3-a3e5-06d94ad438af',
      invoiceId: '9994113d-79aa-4222-837d-46423f292ba1',
      invoiceNo: 'upload001',
      billingDate: '2021-05-02T00:00:00.000Z',
      paymentDate: '2021-05-01T00:00:00.000Z',
      deliveryDate: '2021-05-03T00:00:00.000Z',
      currency: 'JPY',
      recCompany: '宛先企業１',
      recPost: '000-0000',
      recAddr1: '宛先東京',
      recAddr2: '宛先中央区',
      recAddr3: '宛先びる１Ｆ',
      sendCompany: '送信先ダミー企業',
      sendPost: '100-8019',
      sendAddr1: '東京都',
      sendAddr2: '大手町',
      sendAddr3: '大手町プレイスウエスト',
      sendRegistrationNo: 'T1234567890123',
      bankName: 'ＡＢＣ銀行',
      branchName: '１２３支店',
      accountType: '普通',
      accountName: 'MEIGI KOZA',
      accountNumber: '1234567',
      note: '備考備考'
    },
    {
      sendTenantId: '795e60d0-1cf4-4bb3-a3e5-06d94ad438af',
      invoiceId: '915f6baf-1aa5-41a2-9ba0-e8734b9bb9cc',
      invoiceNo: 'upload003',
      billingDate: '2021-05-02T00:00:00.000Z',
      paymentDate: '2021-05-01T00:00:00.000Z',
      deliveryDate: '2021-05-03T00:00:00.000Z',
      currency: 'JPY',
      recCompany: '宛先企業１',
      recPost: '000-0000',
      recAddr1: '宛先東京',
      recAddr2: '宛先中央区',
      recAddr3: '宛先びる１Ｆ',
      sendCompany: '送信先ダミー企業',
      sendPost: '100-8019',
      sendAddr1: '東京都',
      sendAddr2: '大手町',
      sendAddr3: '大手町プレイスウエスト',
      sendRegistrationNo: 'T1234567890123',
      bankName: 'ＡＢＣ銀行',
      branchName: '１２３支店',
      accountType: '普通',
      accountName: 'MEIGI KOZA',
      accountNumber: '1234567',
      note: '備考備考'
    }
  ],
  success: [
    {
      sendTenantId: '795e60d0-1cf4-4bb3-a3e5-06d94ad438af',
      invoiceId: '9994113d-79aa-4222-837d-46423f292ba1',
      invoiceNo: 'upload001',
      billingDate: '2021-05-02T00:00:00.000Z',
      paymentDate: '2021-05-01T00:00:00.000Z',
      deliveryDate: '2021-05-03T00:00:00.000Z',
      currency: 'JPY',
      recCompany: '宛先企業１',
      recPost: '000-0000',
      recAddr1: '宛先東京',
      recAddr2: '宛先中央区',
      recAddr3: '宛先びる１Ｆ',
      sendCompany: '送信先ダミー企業',
      sendPost: '100-8019',
      sendAddr1: '東京都',
      sendAddr2: '大手町',
      sendAddr3: '大手町プレイスウエスト',
      sendRegistrationNo: 'T1234567890123',
      bankName: 'ＡＢＣ銀行',
      branchName: '１２３支店',
      accountType: '普通',
      accountName: 'MEIGI KOZA',
      accountNumber: '1234567',
      note: '備考備考'
    }
  ],
  skip: [
    {
      sendTenantId: '795e60d0-1cf4-4bb3-a3e5-06d94ad438af',
      invoiceId: '9994113d-79aa-4222-837d-46423f292ba1',
      invoiceNo: 'upload001',
      billingDate: '2021-05-02T00:00:00.000Z',
      paymentDate: '2021-05-01T00:00:00.000Z',
      deliveryDate: '2021-05-03T00:00:00.000Z',
      currency: 'JPY',
      recCompany: '宛先企業１',
      recPost: '000-0000',
      recAddr1: '宛先東京',
      recAddr2: '宛先中央区',
      recAddr3: '宛先びる１Ｆ',
      sendCompany: '送信先ダミー企業',
      sendPost: '100-8019',
      sendAddr1: '東京都',
      sendAddr2: '大手町',
      sendAddr3: '大手町プレイスウエスト',
      sendRegistrationNo: 'T1234567890123',
      bankName: 'ＡＢＣ銀行',
      branchName: '１２３支店',
      accountType: '普通',
      accountName: 'MEIGI KOZA',
      accountNumber: '1234567',
      note: '備考備考'
    }
  ]
}
const validLinesData = {
  all: [
    {
      invoiceId: '9994113d-79aa-4222-837d-46423f292ba1',
      lineIndex: 0,
      lineId: 'a001',
      lineDescription: '明細１',
      unit: '個',
      unitPrice: '単価',
      quantity: '1',
      taxType: 'tax10p'
    },
    {
      invoiceId: '915f6baf-1aa5-41a2-9ba0-e8734b9bb9cc',
      lineIndex: 0,
      lineId: 'a001',
      lineDescription: '明細１',
      unit: '1000',
      unitPrice: '100000',
      quantity: '1',
      taxType: 'tax10p'
    }
  ],
  success: [
    {
      invoiceId: '9994113d-79aa-4222-837d-46423f292ba1',
      lineIndex: 0,
      lineId: 'a001',
      lineDescription: '明細１',
      unit: '個',
      unitPrice: '単価',
      quantity: '1',
      taxType: 'tax10p'
    }
  ],

  skip: [
    {
      invoiceId: '9994113d-79aa-4222-837d-46423f292ba1',
      lineIndex: 0,
      lineId: 'a001',
      lineDescription: '明細１',
      unit: '個',
      unitPrice: '単価',
      quantity: '1',
      taxType: 'tax10p'
    }
  ]
}

const uploadHistoryData = {
  all: {
    historyId: 'd82b45fc-8c4b-48f7-b6a1-37caaa5ae018',
    tenantId: '795e60d0-1cf4-4bb3-a3e5-06d94ad438af',
    csvFileName: 'PDF請求書ドラフト一括作成フォーマット.csv',
    successCount: 1,
    failCount: 1,
    skipCount: 1,
    invoiceCount: 1
  },
  success: {
    historyId: 'd82b45fc-8c4b-48f7-b6a1-37caaa5ae018',
    tenantId: '795e60d0-1cf4-4bb3-a3e5-06d94ad438af',
    csvFileName: 'PDF請求書ドラフト一括作成フォーマット.csv',
    successCount: 1,
    failCount: 0,
    skipCount: 0,
    invoiceCount: 1
  },
  skip: {
    historyId: 'd82b45fc-8c4b-48f7-b6a1-37caaa5ae018',
    tenantId: '795e60d0-1cf4-4bb3-a3e5-06d94ad438af',
    csvFileName: 'PDF請求書ドラフト一括作成フォーマット.csv',
    successCount: 0,
    failCount: 0,
    skipCount: 1,
    invoiceCount: 1
  }
}

const csvRowsData = {
  all: [
    {
      historyDetailId: '032771bf-214b-4ab5-91bb-0b855577e689',
      historyId: 'd82b45fc-8c4b-48f7-b6a1-37caaa5ae018',
      lines: 1,
      invoiceNo: 'upload001',
      status: 2,
      errorData: '明細-単価は整数 0 ～ 999999999999 の範囲で入力してください。\r\n'
    },
    {
      historyDetailId: 'c209d341-d377-4948-813f-af51f28492f5',
      historyId: 'd82b45fc-8c4b-48f7-b6a1-37caaa5ae018',
      lines: 2,
      invoiceNo: 'upload002',
      status: 1,
      errorData: '取込済みのため、処理をスキップしました。'
    },
    {
      historyDetailId: 'd88c54a1-7e78-4a2a-980a-35d2f50a98d1',
      historyId: 'd82b45fc-8c4b-48f7-b6a1-37caaa5ae018',
      lines: 3,
      invoiceNo: 'upload003',
      status: 0,
      errorData: ''
    }
  ],
  success: [
    {
      historyDetailId: 'd88c54a1-7e78-4a2a-980a-35d2f50a98d1',
      historyId: 'd82b45fc-8c4b-48f7-b6a1-37caaa5ae018',
      lines: 1,
      invoiceNo: 'upload001',
      status: 0,
      errorData: ''
    }
  ],
  skip: [
    {
      historyDetailId: 'c209d341-d377-4948-813f-af51f28492f5',
      historyId: 'd82b45fc-8c4b-48f7-b6a1-37caaa5ae018',
      lines: 1,
      invoiceNo: 'upload001',
      status: 1,
      errorData: '取込済みのため、処理をスキップしました。'
    }
  ]
}

const exprectedResultData = {
  ok: {
    title: '取込結果一覧',
    engTitle: 'Result LIST',
    resultArr: [
      {
        index: 1,
        date: '2022/05/01 09:00:00',
        filename: 'PDF請求書ドラフト一括作成フォーマット1.csv',
        invoicesAll: 6,
        invoicesCount: 6,
        invoicesSuccess: 1,
        invoicesSkip: 3,
        invoicesFail: 2,
        status: false,
        historyId: '3287e409-d064-4896-ae54-e8b8e2aee037'
      },
      {
        index: 2,
        date: '2022/12/11 21:59:59',
        filename: 'PDF請求書ドラフト一括作成フォーマット2.csv',
        invoicesAll: 9,
        invoicesCount: 0,
        invoicesSuccess: 0,
        invoicesSkip: 9,
        invoicesFail: 0,
        status: true,
        historyId: '0b906415-308c-449f-964c-18662c33c592'
      }
    ],
    csrfToken: 'dummyCsrfToken'
  },
  err: {
    title: '取込結果一覧',
    engTitle: 'Result LIST',
    resultArr: [],
    csrfToken: 'dummyCsrfToken'
  }
}

const historyData = [
  {
    dataValues: {
      historyId: '3287e409-d064-4896-ae54-e8b8e2aee037',
      tenantId: '795e60d0-1cf4-4bb3-a3e5-06d94ad438af',
      csvFileName: 'PDF請求書ドラフト一括作成フォーマット1.csv',
      successCount: 1,
      failCount: 2,
      skipCount: 3,
      invoiceCount: 6,
      createdAt: '2022-05-01T00:00:00.000Z',
      updatedAt: '2022-05-01T00:00:00.000Z'
    }
  },
  {
    dataValues: {
      historyId: '0b906415-308c-449f-964c-18662c33c592',
      tenantId: '795e60d0-1cf4-4bb3-a3e5-06d94ad438af',
      csvFileName: 'PDF請求書ドラフト一括作成フォーマット2.csv',
      successCount: 0,
      failCount: 0,
      skipCount: 9,
      invoiceCount: 0,
      createdAt: '2022-12-11T12:59:59.000Z',
      updatedAt: '2022-12-11T12:59:59.000Z'
    }
  }
]

const historyDetailData = [
  {
    dataValues: {
      historyDetailId: 'bbcbbe53-101c-4dca-89a0-c5709c4c790f',
      historyId: '3287e409-d064-4896-ae54-e8b8e2aee037',
      lines: 1,
      invoiceNo: 'detail001',
      status: 0,
      errorData: ''
    }
  },
  {
    dataValues: {
      historyDetailId: '77c6b3d2-33fb-4698-8241-48359704d5c6',
      historyId: '3287e409-d064-4896-ae54-e8b8e2aee037',
      lines: 2,
      invoiceNo: 'detail002',
      status: 1,
      errorData: '取込済みのため、処理をスキップしました。'
    }
  },
  {
    dataValues: {
      historyDetailId: '5fef89d8-3639-4d12-ae1e-b4ef4b7ff2d8',
      historyId: '3c8204ac-1a7f-4d88-833f-270aa919f937',
      lines: 3,
      invoiceNo: 'detail003',
      status: 2,
      errorData: '明細-単価は整数 0 ～ 999999999999 の範囲で入力してください。\r\n'
    }
  }
]

const exprectedResultDetailData = [
  { lines: 1, invoiceNo: 'detail001', status: '成功', errorData: '' },
  { lines: 2, invoiceNo: 'detail002', status: 'スキップ', errorData: '取込済みのため、処理をスキップしました。' },
  {
    lines: 3,
    invoiceNo: 'detail003',
    status: '失敗',
    errorData: '明細-単価は整数 0 ～ 999999999999 の範囲で入力してください。\r\n'
  }
]

describe('pdfInvoiceCsvUploadのテスト', () => {
  beforeEach(() => {
    request = new Request()
    request.user = user[0]
    request.csrfToken = () => 'dummyCsrfToken'
    response = new Response()
    infoSpy = jest.spyOn(logger, 'info')
    errorSpy = jest.spyOn(logger, 'error')
    accessTradeshift = jest.spyOn(apiManager, 'accessTradeshift')
    request.flash = jest.fn()
    pdfInvoiceFindforTenantSpy = jest.spyOn(pdfInvoiceHistoryController, 'findforTenant')
    findInvoiceDetailSpy = jest.spyOn(pdfInvoiceHistoryDetailController, 'findInvoiceDetail')
    createInvoicesAndLinesSpy = jest.spyOn(pdfInvoiceController, 'createInvoicesAndLines')
    createUploadHistoryAndRowsSpy = jest.spyOn(pdfInvoiceHistoryController, 'createUploadHistoryAndRows')
    convertCsvStringToMultiArraySpy = jest.spyOn(csv, 'convertCsvStringToMultiArray')
    fsSpy = jest.spyOn(fs, 'readFileSync')
    validateSpy = jest.spyOn(validation, 'validate')
    validateHeaderSpy = jest.spyOn(validation, 'validateHeader')
    pdfInvoiceGetAccountAndSenderInfoSpy = jest.spyOn(pdfInvoice, 'getAccountAndSenderInfo')
  })

  afterEach(() => {
    request.resetMocked()
    response.resetMocked()
    next.mockReset()
    infoSpy.mockRestore()
    errorSpy.mockRestore()
    accessTradeshift.mockRestore()
    pdfInvoiceFindforTenantSpy.mockRestore()
    findInvoiceDetailSpy.mockRestore()
    createInvoicesAndLinesSpy.mockRestore()
    createUploadHistoryAndRowsSpy.mockRestore()
    convertCsvStringToMultiArraySpy.mockRestore()
    fsSpy.mockRestore()
    validateSpy.mockRestore()
    validateHeaderSpy.mockRestore()
    pdfInvoiceGetAccountAndSenderInfoSpy.mockRestore()
  })

  describe('コールバック:pdfInvoiceCsvUploadIndex', () => {
    test('正常', async () => {
      await pdfInvoiceCsvUpload.pdfInvoiceCsvUploadIndex(request, response, next)

      expect(response.render).toHaveBeenCalledWith('pdfInvoiceCsvUpload', {
        title: 'PDF請求書ドラフト一括作成',
        engTitle: 'CSV UPLOAD for PDF',
        csrfToken: 'dummyCsrfToken'
      })
    })
  })

  describe('コールバック:pdfInvoiceCsvUpload', () => {
    test('正常-成功失敗スキップ含む', async () => {
      request.file = { buffer: Buffer.from(uploadFileData) }

      fsSpy.mockReturnValue(defaultCsvData)
      validateHeaderSpy.mockReturnValue(true)
      pdfInvoiceGetAccountAndSenderInfoSpy.mockReturnValue({ accountInfo, senderInfo })
      validateSpy.mockReturnValue({
        validInvoices: validInvoicesData.all,
        validLines: validLinesData.all,
        uploadHistory: uploadHistoryData.all,
        csvRows: csvRowsData.all
      })

      db.sequelize.transaction = jest.fn(async (callback) => {
        createInvoicesAndLinesSpy.mockReturnThis()
        createUploadHistoryAndRowsSpy.mockReturnThis()
        return await callback()
      })

      await pdfInvoiceCsvUpload.pdfInvoiceCsvUpload(request, response, next)

      expect(response.redirect).toHaveBeenCalledWith('/pdfInvoiceCsvUpload/resultList')
    })

    test('正常-成功のみ', async () => {
      request.file = { buffer: Buffer.from(uploadFileDataSuccess) }

      fsSpy.mockReturnValue(defaultCsvData)
      validateHeaderSpy.mockReturnValue(true)
      pdfInvoiceGetAccountAndSenderInfoSpy.mockReturnValue({ accountInfo, senderInfo })

      validateSpy.mockReturnValue({
        validInvoices: validInvoicesData.success,
        validLines: validLinesData.success,
        uploadHistory: uploadHistoryData.success,
        csvRows: csvRowsData.success
      })

      db.sequelize.transaction = jest.fn(async (callback) => {
        createInvoicesAndLinesSpy.mockReturnThis()
        createUploadHistoryAndRowsSpy.mockReturnThis()
        return await callback()
      })

      await pdfInvoiceCsvUpload.pdfInvoiceCsvUpload(request, response, next)

      expect(response.redirect).toHaveBeenCalledWith('/pdfInvoices/list')
    })
    test('正常-スキップのみ', async () => {
      request.file = { buffer: Buffer.from(uploadFileDataSuccess) }
      fsSpy.mockReturnValue(defaultCsvData)
      validateHeaderSpy.mockReturnValue(true)
      pdfInvoiceGetAccountAndSenderInfoSpy.mockReturnValue({ accountInfo, senderInfo })

      validateSpy.mockReturnValue({
        validInvoices: validInvoicesData.skip,
        validLines: validLinesData.skip,
        uploadHistory: uploadHistoryData.skip,
        csvRows: csvRowsData.skip
      })

      db.sequelize.transaction = jest.fn(async (callback) => {
        createInvoicesAndLinesSpy.mockReturnThis()
        createUploadHistoryAndRowsSpy.mockReturnThis()
        return await callback()
      })

      await pdfInvoiceCsvUpload.pdfInvoiceCsvUpload(request, response, next)

      expect(response.redirect).toHaveBeenCalledWith('/pdfInvoiceCsvUpload/resultList')
    })
    test('準正常: ユーザIDなしの不正リクエスト', async () => {
      request.user = null

      await pdfInvoiceCsvUpload.pdfInvoiceCsvUpload(request, response, next)

      expect(next).toHaveBeenCalledWith(errorHelper.create(500))
    })

    test('準正常: アップロードデータ空の不正リクエスト', async () => {
      request.file = { buffer: '' }

      await pdfInvoiceCsvUpload.pdfInvoiceCsvUpload(request, response, next)

      expect(next).toHaveBeenCalledWith(errorHelper.create(500))
    })
    test('準正常: デフォルトフォーマットデータ取得エラー', async () => {
      fsSpy.mockReturnValue(() => {
        throw new Error('File Read Error')
      })

      await pdfInvoiceCsvUpload.pdfInvoiceCsvUpload(request, response, next)

      expect(next).toHaveBeenCalledWith(errorHelper.create(500))
    })
    test('準正常: ヘッダーバリデーションエラー', async () => {
      request.file = { buffer: Buffer.from(uploadFileData) }
      fsSpy.mockReturnValue(defaultCsvData)
      validateHeaderSpy.mockReturnValue(false)

      await pdfInvoiceCsvUpload.pdfInvoiceCsvUpload(request, response, next)

      expect(next).toHaveBeenCalledWith(errorHelper.create(500))
    })
    test('準正常: バリデーションエラー', async () => {
      request.file = { buffer: Buffer.from(uploadFileDataSuccess) }
      fsSpy.mockReturnValue(defaultCsvData)
      validateHeaderSpy.mockReturnValue(true)
      pdfInvoiceGetAccountAndSenderInfoSpy.mockReturnValue({ accountInfo, senderInfo })

      validateSpy.mockReturnValue({
        validInvoices: null,
        validLines: validLinesData.skip,
        uploadHistory: uploadHistoryData.skip,
        csvRows: csvRowsData.skip
      })

      await pdfInvoiceCsvUpload.pdfInvoiceCsvUpload(request, response, next)

      expect(next).toHaveBeenCalledWith(errorHelper.create(500))
    })
    test('準正常: CSVファイル空行エラー', async () => {
      request.file = { buffer: Buffer.from(uploadFileDataNull) }
      fsSpy.mockReturnValue(defaultCsvData)
      validateHeaderSpy.mockReturnValue(false)

      await pdfInvoiceCsvUpload.pdfInvoiceCsvUpload(request, response, next)

      expect(next).toHaveBeenCalledWith(errorHelper.create(500))
    })
    test('準正常: 送信先情報取得APIエラー', async () => {
      request.file = { buffer: Buffer.from(uploadFileData) }
      fsSpy.mockReturnValue(defaultCsvData)
      validateHeaderSpy.mockReturnValue(true)
      pdfInvoiceGetAccountAndSenderInfoSpy.mockReturnValue({ accountInfo, senderInfo: null })

      await pdfInvoiceCsvUpload.pdfInvoiceCsvUpload(request, response, next)

      expect(next).toHaveBeenCalledWith(errorHelper.create(500))
    })
    test('準正常: 送信先情報取得エラー', async () => {
      request.file = { buffer: Buffer.from(uploadFileData) }
      fsSpy.mockReturnValue(defaultCsvData)
      validateHeaderSpy.mockReturnValue(true)
      pdfInvoiceGetAccountAndSenderInfoSpy.mockReturnValue({ accountInfo, senderInfo: 'senderInfo' })

      await pdfInvoiceCsvUpload.pdfInvoiceCsvUpload(request, response, next)

      expect(next).toHaveBeenCalledWith(errorHelper.create(500))
    })
    test('準正常: DB登録エラー createUploadHistoryAndRows', async () => {
      request.file = { buffer: Buffer.from(uploadFileData) }

      fsSpy.mockReturnValue(defaultCsvData)
      validateHeaderSpy.mockReturnValue(true)
      pdfInvoiceGetAccountAndSenderInfoSpy.mockReturnValue({ accountInfo, senderInfo })
      validateSpy.mockReturnValue({
        validInvoices: validInvoicesData.all,
        validLines: validLinesData.all,
        uploadHistory: uploadHistoryData.all,
        csvRows: csvRowsData.all
      })

      db.sequelize.transaction = jest.fn(async (callback) => {
        createInvoicesAndLinesSpy.mockReturnValue(() => {
          throw new Error('DB Error')
        })
        return await callback()
      })

      await pdfInvoiceCsvUpload.pdfInvoiceCsvUpload(request, response, next)

      expect(next).toHaveBeenCalledWith(errorHelper.create(500))
    })
  })

  describe('コールバック:pdfInvoiceCsvUploadResult', () => {
    test('正常:', async () => {
      request.params.tenantId = 'dummyId'
      pdfInvoiceFindforTenantSpy.mockReturnValue(historyData) // DBからの正常なPDF請求書情報の取得を想定する

      await pdfInvoiceCsvUpload.pdfInvoiceCsvUploadResult(request, response, next)

      expect(response.render).toHaveBeenCalledWith('pdfInvoiceCsvUploadResult', exprectedResultData.ok)
    })
    test('準正常: テナントIDなしの不正リクエスト', async () => {
      request.params.tenantId = undefined
      pdfInvoiceFindforTenantSpy.mockReturnValue(null)

      await pdfInvoiceCsvUpload.pdfInvoiceCsvUploadResult(request, response, next)

      expect(response.render).toHaveBeenCalledWith('pdfInvoiceCsvUploadResult', exprectedResultData.err)
    })
    test('準正常: PDF請求書情報取得時、DBエラー', async () => {
      request.params.tenantId = 'dummyId'

      pdfInvoiceFindforTenantSpy.mockReturnValue(() => {
        throw new Error('DB Error')
      })

      await pdfInvoiceCsvUpload.pdfInvoiceCsvUploadResult(request, response, next)

      expect(response.render).toHaveBeenCalledWith('pdfInvoiceCsvUploadResult', exprectedResultData.err)
    })
  })

  describe('コールバック:pdfInvoiceCsvUploadResultDetail', () => {
    test('正常:', async () => {
      request.params.historyId = 'dummyId'

      findInvoiceDetailSpy.mockReturnValue(historyDetailData) // DBからの正常なPDF請求書情報の取得を想定する

      await pdfInvoiceCsvUpload.pdfInvoiceCsvUploadResultDetail(request, response, next)

      expect(response.status).toHaveBeenCalledWith(200)
      expect(response.status(200).send).toHaveBeenCalledWith(JSON.stringify(exprectedResultDetailData))
    })
    test('準正常: historyIdなしの不正リクエスト', async () => {
      request.params.historyId = undefined
      await pdfInvoiceCsvUpload.pdfInvoiceCsvUploadResultDetail(request, response, next)

      expect(response.status).toHaveBeenCalledWith(400)
      expect(response.status(400).send).toHaveBeenCalledWith()
    })
    test('準正常: PDF請求書詳細情報取得時、DBエラー', async () => {
      request.params.historyId = 'dummyId'

      findInvoiceDetailSpy.mockReturnValue(() => {
        throw new Error('DB Error')
      })

      await pdfInvoiceCsvUpload.pdfInvoiceCsvUploadResultDetail(request, response, next)

      expect(response.status).toHaveBeenCalledWith(500)
      expect(response.status(500).send).toHaveBeenCalledWith(JSON.stringify([]))
    })
  })
})
