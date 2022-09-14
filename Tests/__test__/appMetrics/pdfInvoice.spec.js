'use strict'
jest.mock('../../../Application/node_modules/express', () => {
  return require('jest-express')
})

const pdfInvoice = require('../../../Application/routes/pdfInvoice.js')
const Request = require('jest-express').Request
const Response = require('jest-express').Response
const next = require('jest-express').Next
const errorHelper = require('../../../Application/routes/helpers/error')
const apiManager = require('../../../Application/controllers/apiManager.js')
const pdfInvoiceController = require('../../../Application/controllers/pdfInvoiceController.js')
const logger = require('../../../Application/lib/logger.js')
const pdfGenerator = require('../../../Application/lib/pdfGenerator')
jest.mock('../../../Application/lib/pdfGenerator')

let request, response, infoSpy, errorSpy, accessTradeshift
let pdfInvoiceControllerfindInvoiceSpy, deleteInvoiceSpy

// 戻り値定義
const user = [
  {
    userId: '388014b9-d667-4144-9cc4-5da420981438',
    email: 'dummy@testdummy.com',
    tenantId: 'dummyTenantId',
    accessToken: 'dummyAccessToken',
    refreshToken: 'dummyRefreshToken'
  }
]
const accountInfoTestData = {
  noLogo: {
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
    LogoURL: null,
    PublicProfile: false,
    NonuserInvoicing: false,
    AutoAcceptConnections: false,
    Restricted: true,
    Created: '2021-07-27T09:10:59.241Z',
    Modified: '2021-07-27T09:13:17.436Z',
    AccountType: 'FREE'
  }
}

const pdfInvoiceTestData = {
  hasPdfSealImp: {
    dataValues: {
      invoiceId: 'fddebebb-6bd2-4e79-9343-af7be96091e5',
      invoiceNo: '111111',
      tmpFlg: false,
      outputDate: new Date('2022-05-12T04:16:21.170Z'),
      billingDate: new Date('2022-05-13T00:00:00.000Z'),
      currency: 'JPY',
      paymentDate: new Date('2022-05-14T00:00:00.000Z'),
      deliveryDate: new Date('2022-05-15T00:00:00.000Z'),
      recCompany: '宛先ダミー企業',
      recPost: '0000000',
      recAddr1: '東京都',
      recAddr2: '大手町',
      recAddr3: '大手町ビル',
      sendTenantId: '795e60d0-1cf4-4bb3-a3e5-06d94ad438af',
      sendCompany: '送信先ダミー企業',
      sendPost: '100-8019',
      sendAddr1: '東京都',
      sendAddr2: '大手町',
      sendAddr3: '大手町プレイスウエスト',
      sendRegistrationNo: 'T1234567890123',
      bankName: '銀行名',
      branchName: '支店',
      accountType: '科目',
      accountName: 'あああ',
      accountNumber: '1234567',
      note: '備考備考備考\n備考',
      createdAt: new Date('2022-05-13T00:00:00.000Z'),
      updatedAt: new Date('2022-05-13T00:00:00.000Z'),
      PdfSealImp: {
        dataValues: { invoiceId: 'fddebebb-6bd2-4e79-9343-af7be96091e5', image: 'dummyBuffer' }
      }
    },
    PdfInvoiceLines: [
      {
        dataValues: {
          invoiceId: 'fddebebb-6bd2-4e79-9343-af7be96091e5',
          lineIndex: 0,
          lineId: 'a0001',
          lineDescription: '内容１',
          unit: 'KG',
          unitPrice: 100,
          quantity: 20,
          taxType: 'tax8p'
        }
      },
      {
        dataValues: {
          invoiceId: 'fddebebb-6bd2-4e79-9343-af7be96091e5',
          lineIndex: 1,
          lineId: 'a0002',
          lineDescription: '内容２',
          unit: 'KG',
          unitPrice: 200,
          quantity: 20,
          taxType: 'tax8p'
        }
      }
    ],
    PdfSealImp: { dataValues: { image: null } }
  }
}

describe('アプリ効果測定UT_デジトレ', () => {
  beforeEach(() => {
    request = new Request()
    request.user = user[0]
    request.csrfToken = () => 'dummyCsrfToken'
    response = new Response()
    infoSpy = jest.spyOn(logger, 'info')
    errorSpy = jest.spyOn(logger, 'error')
    accessTradeshift = jest.spyOn(apiManager, 'accessTradeshift')
    request.flash = jest.fn()
    pdfInvoiceControllerfindInvoiceSpy = jest.spyOn(pdfInvoiceController, 'findInvoice')
    deleteInvoiceSpy = jest.spyOn(pdfInvoiceController, 'deleteInvoice')
  })
  afterEach(() => {
    request.resetMocked()
    response.resetMocked()
    next.mockReset()
    infoSpy.mockRestore()
    errorSpy.mockRestore()
    accessTradeshift.mockRestore()
    pdfInvoiceControllerfindInvoiceSpy.mockRestore()
    deleteInvoiceSpy.mockRestore()
  })
  describe('コールバック:outputPdfInvoice', () => {
    test('正常', async () => {
      request.body = { invoice: '{"billingDate":null,"paymentDate":null,"deliveryDate":null}', lines: '[]' }
      accessTradeshift.mockReturnValue(accountInfoTestData.noLogo) // ユーザ情報正常取得を想定する
      pdfGenerator.renderInvoiceHTML.mockReturnValue('<html></html>')
      pdfGenerator.generatePdf.mockResolvedValue('dummyBuffer')

      await pdfInvoice.outputPdfInvoice(request, response, next)

      expect(response.status).toHaveBeenCalledWith(200)
      expect(response.send).toHaveBeenCalledWith('dummyBuffer')
      // 呼ばれること
      expect(infoSpy).nthCalledWith(1, {
        tenantId: 'dummyTenantId',
        action: 'downloadedPdfInvoice',
        downloadedPdfInvoiceCount: 1
      })
    })
    test('準正常: PDF生成失敗', async () => {
      request.body = { invoice: '{"billingDate":null,"paymentDate":null,"deliveryDate":null}', lines: '[]' }
      accessTradeshift.mockReturnValue(accountInfoTestData.noLogo) // ユーザ情報正常取得を想定する
      pdfGenerator.renderInvoiceHTML.mockReturnValue('<html></html>')
      pdfGenerator.generatePdf.mockImplementation(() => {
        throw new Error('pdf generate failed')
      })

      await pdfInvoice.outputPdfInvoice(request, response, next)

      expect(next).toHaveBeenCalledWith(errorHelper.create(500))

      // 呼ばれないこと
      expect(infoSpy).not.nthCalledWith(1, {
        tenantId: 'dummyTenantId',
        action: 'downloadedPdfInvoice',
        downloadedPdfInvoiceCount: 1
      })
    })
  })
  describe('コールバック:deleteAndOutputPdfInvoice', () => {
    test('正常', async () => {
      request.params.invoiceId = 'dummyID'
      request.body = { invoice: '{"billingDate":null,"paymentDate":null,"deliveryDate":null}', lines: '[]' }
      pdfInvoiceControllerfindInvoiceSpy.mockResolvedValue(pdfInvoiceTestData.hasPdfSealImp)
      accessTradeshift.mockReturnValue(accountInfoTestData.noLogo)
      pdfGenerator.renderInvoiceHTML.mockReturnValue('<html></html>')
      pdfGenerator.generatePdf.mockResolvedValue('dummyBuffer')
      deleteInvoiceSpy.mockReturnValue(1)

      await pdfInvoice.deleteAndOutputPdfInvoice(request, response, next)

      expect(response.status).toHaveBeenCalledWith(200)
      expect(response.send).toHaveBeenCalledWith('dummyBuffer')
      // 呼ばれること
      expect(infoSpy).nthCalledWith(2, {
        tenantId: 'dummyTenantId',
        action: 'downloadedPdfInvoice',
        downloadedPdfInvoiceCount: 1
      })
    })
    test('準正常: PDF生成失敗', async () => {
      request.params.invoiceId = 'dummyID'
      request.body = { invoice: '{"billingDate":null,"paymentDate":null,"deliveryDate":null}', lines: '[]' }
      pdfInvoiceControllerfindInvoiceSpy.mockResolvedValue(pdfInvoiceTestData.hasPdfSealImp)
      accessTradeshift.mockReturnValue(accountInfoTestData.noLogo)
      pdfGenerator.renderInvoiceHTML.mockReturnValue('<html></html>')
      pdfGenerator.generatePdf.mockImplementation(() => {
        throw new Error('pdf generate failed')
      })

      await pdfInvoice.deleteAndOutputPdfInvoice(request, response, next)

      expect(next).toHaveBeenCalledWith(errorHelper.create(500))

      // 呼ばれないこと
      expect(infoSpy).not.nthCalledWith(2, {
        tenantId: 'dummyTenantId',
        action: 'downloadedPdfInvoice',
        downloadedPdfInvoiceCount: 1
      })
    })
  })
})
