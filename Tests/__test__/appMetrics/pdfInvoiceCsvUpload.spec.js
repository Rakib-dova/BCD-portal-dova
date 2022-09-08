'use strict'
const fs = require('fs')
jest.mock('../../../Application/node_modules/express', () => {
  return require('jest-express')
})

const Request = require('jest-express').Request
const Response = require('jest-express').Response
const next = require('jest-express').Next

const pdfInvoice = require('../../../Application/routes/pdfInvoice.js')
const pdfInvoiceCsvUpload = require('../../../Application/routes/pdfInvoiceCsvUpload')
const pdfInvoiceController = require('../../../Application/controllers/pdfInvoiceController.js')
const pdfInvoiceHistoryController = require('../../../Application/controllers/pdfInvoiceHistoryController.js')

const logger = require('../../../Application/lib/logger.js')
const csv = require('../../../Application/lib/csv')
const validation = require('../../../Application/lib/pdfInvoiceCsvUploadValidation')
const db = require('../../../Application/models')
const csvString = fs.readFileSync('./testData/pdfInvoiceUpload/success.csv', 'utf8')

jest.mock('../../../Application/lib/bconCsv')
jest.mock('../../../Application/routes/helpers/error', () => {
  return { create: () => {} }
}) // setErrorLog() でエラーを出力させない為に必要

let request, response, infoSpy
let validateSpy
let createInvoicesAndLinesSpy, createUploadHistoryAndRowsSpy
let fsSpy
let pdfInvoiceGetAccountAndSenderInfoSpy
let convertCsvStringToMultiArray, convertToDataObject
let convertCsvDataArrayToPdfInvoiceModels

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

const user = [
  {
    userId: '388014b9-d667-4144-9cc4-5da420981438',
    email: 'dummy@testdummy.com',
    tenantId: 'dummyTenantId',
    accessToken: 'dummyAccessToken',
    refreshToken: 'dummyRefreshToken'
  }
]

const session = {
  userContext: 'NotLoggedIn',
  userRole: 'dummy'
}
const validInvoicesData = {
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
  ]
}
const validLinesData = {
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
  ]
}
const uploadHistoryData = {
  success: { successCount: 1, failCount: 0, skipCount: 0 }
}
const csvRowsData = {
  success: [
    {
      historyDetailId: 'd88c54a1-7e78-4a2a-980a-35d2f50a98d1',
      historyId: 'd82b45fc-8c4b-48f7-b6a1-37caaa5ae018',
      lines: 1,
      invoiceNo: 'upload001',
      status: 0,
      errorData: ''
    }
  ]
}

describe('アプリ効果測定UT_デジトレ', () => {
  beforeEach(() => {
    request = new Request()
    request.user = user[0]
    request.file = { buffer: Buffer.from(csvString) }
    request.csrfToken = () => 'dummyCsrfToken'
    request.session = session
    response = new Response()
    infoSpy = jest.spyOn(logger, 'info')
    validateSpy = jest.spyOn(validation, 'validate')
    createInvoicesAndLinesSpy = jest.spyOn(pdfInvoiceController, 'createInvoicesAndLines')
    createUploadHistoryAndRowsSpy = jest.spyOn(pdfInvoiceHistoryController, 'createUploadHistoryAndRows')
    fsSpy = jest.spyOn(fs, 'readFileSync')
    fsSpy.mockReturnValue(defaultCsvData)
    pdfInvoiceGetAccountAndSenderInfoSpy = jest.spyOn(pdfInvoice, 'getAccountAndSenderInfo')
    pdfInvoiceGetAccountAndSenderInfoSpy.mockReturnValue({ senderInfo })
    convertCsvStringToMultiArray = jest.spyOn(csv, 'convertCsvStringToMultiArray')
    convertCsvStringToMultiArray.mockReturnValue([[], []])
    convertToDataObject = jest.spyOn(csv, 'convertToDataObject')
    convertToDataObject.mockReturnValue({})
    convertCsvDataArrayToPdfInvoiceModels = jest.spyOn(csv, 'convertCsvDataArrayToPdfInvoiceModels')
  })
  afterEach(() => {
    request.resetMocked()
    response.resetMocked()
    next.mockReset()
    infoSpy.mockRestore()
    validateSpy.mockRestore()
    createInvoicesAndLinesSpy.mockRestore()
    createUploadHistoryAndRowsSpy.mockRestore()
    fsSpy.mockRestore()
    convertCsvDataArrayToPdfInvoiceModels.mockRestore()
  })
  describe('請求書一括アップロード', () => {
    test('アップロードに成功する場合', async () => {
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

      // 呼ばれること
      expect(infoSpy).nthCalledWith(2, {
        tenantId: 'dummyTenantId',
        action: 'csvUploadedPdfInvoice',
        csvUploadedPdfInvoiceCount: 1,
        invoices: validInvoicesData.success
      })
    })

    test('アップロードに失敗する場合', async () => {
      convertCsvDataArrayToPdfInvoiceModels.mockReturnValue({ pdfInvoices: [], pdfInvoiceLines: [] })
      validateSpy.mockReturnValue({
        validInvoices: validInvoicesData.success,
        validLines: validLinesData.success,
        uploadHistory: uploadHistoryData.success,
        csvRows: csvRowsData.success
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

      // 呼ばれないこと
      expect(infoSpy).not.nthCalledWith(2, {
        tenantId: 'dummyTenantId',
        action: 'csvUploadedPdfInvoice',
        csvUploadedPdfInvoiceCount: 1,
        invoices: validInvoicesData.success
      })
    })
  })
})
