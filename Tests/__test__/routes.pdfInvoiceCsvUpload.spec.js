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
const Encoding = require('encoding-japanese')

const apiManager = require('../../Application/controllers/apiManager.js')
const pdfInvoiceController = require('../../Application/controllers/pdfInvoiceController.js')
const pdfInvoiceHistoryController = require('../../Application/controllers/pdfInvoiceHistoryController.js')
const pdfInvoiceHistoryDetailController = require('../../Application/controllers/pdfInvoiceHistoryDetailController.js')
const logger = require('../../Application/lib/logger.js')
const csv = require('../../Application/lib/csv')
const validation = require('../../Application/lib/pdfInvoiceCsvUploadValidation')
const db = require('../../Application/models')
const csvString = fs.readFileSync('./testData/pdfInvoiceUpload/success.csv', 'utf8')

let request, response, infoSpy, errorSpy, accessTradeshift
let createUploadHistoryAndRowsSpy
let pdfInvoiceFindforTenantSpy, createInvoicesAndLinesSpy
let findInvoiceDetailSpy
let fsSpy
let validateSpy, validateHeaderSpy
let pdfInvoiceGetAccountAndSenderInfoSpy
let convertCsvStringToMultiArray, convertToDataObject, convertCsvDataArrayToPdfInvoiceModels
let encodingSpy

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
const senderInfo = {
  sendCompany: '送信先ダミー企業',
  sendPost: '100-8019',
  sendAddr1: '東京都',
  sendAddr2: '大手町',
  sendAddr3: '大手町プレイスウエスト'
}

const defaultCsvData =
  '登録番号,請求書番号,支払期日,請求日,納品日,宛先企業名,宛先郵便番号,宛先都道府県,宛先住所,宛先ビル名/フロア等,銀行名,支店名,科目,口座番号,口座名義,備考,請求書割引内容1,請求書割引数値1,請求書割引種別1,請求書割引内容2,請求書割引数値2,請求書割引種別2,請求書割引内容3,請求書割引数値3,請求書割引種別3,明細-項目ID,明細-内容,明細-数量,明細-単位,明細-単価,明細-税（消費税／軽減税率／不課税／免税／非課税）,明細-割引内容1,明細-割引数値1,明細-割引種別1,明細-割引内容2,明細-割引数値2,明細-割引種別2,明細-割引内容3,明細-割引数値3,明細-割引種別3'

const invoiceData = {
  singleValid: [{}]
}

const uploadHistoryData = {
  success: { successCount: 1, failCount: 0, skipCount: 0 },
  skip: { successCount: 0, failCount: 0, skipCount: 1 },
  fail: { successCount: 0, failCount: 1, skipCount: 1 },
  successFail: { successCount: 1, failCount: 1, skipCount: 0 },
  successSkip: { successCount: 1, failCount: 0, skipCount: 1 },
  failSkip: { successCount: 0, failCount: 1, skipCount: 1 },
  all: { successCount: 1, failCount: 1, skipCount: 1 }
}

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
    request.file = { buffer: Buffer.from(csvString) }
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
    fsSpy = jest.spyOn(fs, 'readFileSync')
    fsSpy.mockReturnValue(defaultCsvData)
    validateSpy = jest.spyOn(validation, 'validate')
    validateHeaderSpy = jest.spyOn(validation, 'validateHeader')
    validateHeaderSpy.mockReturnValue(true)
    pdfInvoiceGetAccountAndSenderInfoSpy = jest.spyOn(pdfInvoice, 'getAccountAndSenderInfo')
    pdfInvoiceGetAccountAndSenderInfoSpy.mockReturnValue({ senderInfo })
    convertCsvStringToMultiArray = jest.spyOn(csv, 'convertCsvStringToMultiArray')
    convertCsvStringToMultiArray.mockReturnValue([[], []])
    convertToDataObject = jest.spyOn(csv, 'convertToDataObject')
    convertToDataObject.mockReturnValue({})
    convertCsvDataArrayToPdfInvoiceModels = jest.spyOn(csv, 'convertCsvDataArrayToPdfInvoiceModels')
    encodingSpy = jest.spyOn(Encoding, 'detect')
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
    fsSpy.mockRestore()
    validateSpy.mockRestore()
    validateHeaderSpy.mockRestore()
    pdfInvoiceGetAccountAndSenderInfoSpy.mockRestore()
    convertCsvStringToMultiArray.mockRestore()
    convertToDataObject.mockRestore()
    convertCsvDataArrayToPdfInvoiceModels.mockRestore()
    encodingSpy.mockRestore()
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
    test('正常: 成功のみ', async () => {
      validateSpy.mockReturnValue({
        validInvoices: invoiceData.singleValid,
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
    test('正常: 失敗のみ', async () => {
      validateSpy.mockReturnValue({
        validInvoices: invoiceData.singleValid,
        validLines: validLinesData.skip,
        uploadHistory: uploadHistoryData.fail,
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
    test('正常-スキップのみ', async () => {
      validateSpy.mockReturnValue({
        validInvoices: invoiceData.singleValid,
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
    test('正常: 成功 & 失敗', async () => {
      validateSpy.mockReturnValue({
        validInvoices: invoiceData.singleValid,
        validLines: validLinesData.skip,
        uploadHistory: uploadHistoryData.successFail,
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
    test('正常: 成功 & スキップ', async () => {
      validateSpy.mockReturnValue({
        validInvoices: invoiceData.singleValid,
        validLines: validLinesData.skip,
        uploadHistory: uploadHistoryData.successSkip,
        csvRows: csvRowsData.skip
      })

      db.sequelize.transaction = jest.fn(async (callback) => {
        createInvoicesAndLinesSpy.mockReturnThis()
        createUploadHistoryAndRowsSpy.mockReturnThis()
        return await callback()
      })

      await pdfInvoiceCsvUpload.pdfInvoiceCsvUpload(request, response, next)

      expect(response.redirect).toHaveBeenCalledWith('/pdfInvoices/list')
    })
    test('正常: 失敗 & スキップ', async () => {
      validateSpy.mockReturnValue({
        validInvoices: invoiceData.singleValid,
        validLines: validLinesData.skip,
        uploadHistory: uploadHistoryData.failSkip,
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
    test('正常: 成功 & 失敗 & スキップ', async () => {
      validateSpy.mockReturnValue({
        validInvoices: invoiceData.singleValid,
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

    test('準正常: アップロードデータ空の不正リクエスト', async () => {
      request.file = { buffer: '' }

      await pdfInvoiceCsvUpload.pdfInvoiceCsvUpload(request, response, next)

      expect(response.send).toHaveBeenCalledWith(
        '{"message":"CSVファイルのデータに不備があります。CSVファイルの内容を確認の上、再度実行をお願いします。"}'
      )
      expect(response.status).toHaveBeenCalledWith(400)
    })
    test('準正常: 文字コードがUTF-8以外', async () => {
      request.file = { buffer: 'あ' }
      encodingSpy.mockReturnValue(false)

      await pdfInvoiceCsvUpload.pdfInvoiceCsvUpload(request, response, next)

      expect(response.send).toHaveBeenCalledWith(
        '{"message":"文字コードはUTF-8 BOM付で作成してください。CSVファイルの内容を確認の上、再度実行をお願いします。"}'
      )
      expect(response.status).toHaveBeenCalledWith(400)
    })
    test('準正常: CSVファイル読込エラー', async () => {
      fsSpy.mockImplementation(() => {
        throw new Error('File Read Error')
      })
      encodingSpy.mockReturnValue('UTF8')

      await pdfInvoiceCsvUpload.pdfInvoiceCsvUpload(request, response, next)

      expect(response.send).toHaveBeenCalledWith('{"message":"システムエラーです。（後程、接続してください）"}')
      expect(response.status).toHaveBeenCalledWith(500)
    })
    test('準正常: デフォルトフォーマットデータ取得エラー', async () => {
      fsSpy.mockImplementation(() => {
        throw new Error('File Read Error')
      })

      await pdfInvoiceCsvUpload.pdfInvoiceCsvUpload(request, response, next)

      expect(response.send).toHaveBeenCalledWith('{"message":"システムエラーです。（後程、接続してください）"}')
      expect(response.status).toHaveBeenCalledWith(500)
    })
    test('準正常: CSV文字列データをCSV多次元配列データに変換時エラー', async () => {
      convertCsvStringToMultiArray.mockReturnValue(null)

      await pdfInvoiceCsvUpload.pdfInvoiceCsvUpload(request, response, next)

      expect(response.send).toHaveBeenCalledWith(
        '{"message":"CSVファイルのデータに不備があります。CSVファイルの内容を確認の上、再度実行をお願いします。"}'
      )
      expect(response.status).toHaveBeenCalledWith(400)
    })
    test('準正常: ヘッダーバリデーションエラー', async () => {
      validateHeaderSpy.mockReturnValue(false)

      await pdfInvoiceCsvUpload.pdfInvoiceCsvUpload(request, response, next)

      expect(response.send).toHaveBeenCalledWith(
        '{"message":"ヘッダーが指定のものと異なります。CSVファイルの内容を確認の上、再度実行をお願いします。"}'
      )
      expect(response.status).toHaveBeenCalledWith(400)
    })
    test('準正常: CSV多次元配列データをデータオブジェクト配列に変換時エラー', async () => {
      convertToDataObject.mockImplementation(() => {
        throw new Error('data convert Error')
      })

      await pdfInvoiceCsvUpload.pdfInvoiceCsvUpload(request, response, next)

      expect(response.send).toHaveBeenCalledWith(
        '{"message":"CSVファイルのデータに不備があります。CSVファイルの内容を確認の上、再度実行をお願いします。"}'
      )
      expect(response.status).toHaveBeenCalledWith(400)
    })
    test('準正常: CSVファイルにデータが存在しない', async () => {
      convertCsvStringToMultiArray.mockReturnValue([])

      await pdfInvoiceCsvUpload.pdfInvoiceCsvUpload(request, response, next)

      expect(response.send).toHaveBeenCalledWith(
        '{"message":"CSVファイルのデータが存在しません。CSVファイルの内容を確認の上、再度実行をお願いします。"}'
      )
      expect(response.status).toHaveBeenCalledWith(400)
    })
    test('準正常: CSVファイル空行エラー', async () => {
      convertToDataObject.mockReturnValue(undefined)

      await pdfInvoiceCsvUpload.pdfInvoiceCsvUpload(request, response, next)

      expect(response.send).toHaveBeenCalledWith(
        '{"message":"CSVファイルのデータに不備があります。CSVファイルの内容を確認の上、再度実行をお願いします。"}'
      )
      expect(response.status).toHaveBeenCalledWith(400)
    })
    test('準正常: 送信先情報取得失敗', async () => {
      pdfInvoiceGetAccountAndSenderInfoSpy.mockReturnValue({ senderInfo: null })

      await pdfInvoiceCsvUpload.pdfInvoiceCsvUpload(request, response, next)

      expect(response.status).toHaveBeenCalledWith(500)
      expect(response.send).toHaveBeenCalledWith(
        '{"message":"APIエラーです、時間を空けて再度実行をお願いいたします。"}'
      )
    })
    test('準正常: データオブジェクト配列をDBモデルに変換時にエラー', async () => {
      convertCsvDataArrayToPdfInvoiceModels.mockReturnValue({ pdfInvoices: null, pdfInvoiceLines: null })

      await pdfInvoiceCsvUpload.pdfInvoiceCsvUpload(request, response, next)

      expect(response.send).toHaveBeenCalledWith(
        '{"message":"CSVファイルのデータに不備があります。CSVファイルの内容を確認の上、再度実行をお願いします。"}'
      )
      expect(response.status).toHaveBeenCalledWith(500)
    })
    test('準正常: 請求書数200オーバーエラー', async () => {
      convertCsvDataArrayToPdfInvoiceModels.mockReturnValue({ pdfInvoices: Array(201), pdfInvoiceLines: [] })

      await pdfInvoiceCsvUpload.pdfInvoiceCsvUpload(request, response, next)

      expect(response.send).toHaveBeenCalledWith(
        '{"message":"作成できる請求書数は200までです。CSVファイルの内容を確認の上、再度実行をお願いします。"}'
      )
      expect(response.status).toHaveBeenCalledWith(400)
    })
    test('準正常: 明細数20オーバーエラー', async () => {
      convertCsvDataArrayToPdfInvoiceModels.mockReturnValue({ pdfInvoices: [], pdfInvoiceLines: Array(21) })

      await pdfInvoiceCsvUpload.pdfInvoiceCsvUpload(request, response, next)

      expect(response.send).toHaveBeenCalledWith(
        '{"message":"一つの請求書で作成できる明細数は20までです。CSVファイルの内容を確認の上、再度実行をお願いします。"}'
      )
      expect(response.status).toHaveBeenCalledWith(400)
    })
    test('準正常: バリデーション失敗', async () => {
      convertCsvDataArrayToPdfInvoiceModels.mockReturnValue({ pdfInvoices: [], pdfInvoiceLines: [] })
      validateSpy.mockReturnValue({})

      await pdfInvoiceCsvUpload.pdfInvoiceCsvUpload(request, response, next)

      expect(response.send).toHaveBeenCalledWith(
        '{"message":"CSVファイルのデータに不備があります。CSVファイルの内容を確認の上、再度実行をお願いします。"}'
      )
      expect(response.status).toHaveBeenCalledWith(500)
    })
    test('準正常: DB登録エラー createUploadHistoryAndRows', async () => {
      convertCsvDataArrayToPdfInvoiceModels.mockReturnValue({ pdfInvoices: [], pdfInvoiceLines: [] })
      validateSpy.mockReturnValue({
        validInvoices: validInvoicesData.all,
        validLines: validLinesData.all,
        uploadHistory: uploadHistoryData.all,
        csvRows: csvRowsData.all
      })

      db.sequelize.transaction = jest.fn(async (callback) => {
        createInvoicesAndLinesSpy.mockImplementation(() => {
          throw new Error('DB Error')
        })
        return await callback()
      })

      await pdfInvoiceCsvUpload.pdfInvoiceCsvUpload(request, response, next)

      expect(response.send).toHaveBeenCalledWith('{"message":"システムエラーです。（後程、接続してください）"}')
      expect(response.status).toHaveBeenCalledWith(500)
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
