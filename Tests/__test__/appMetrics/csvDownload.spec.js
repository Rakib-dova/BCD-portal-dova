'use strict'
jest.mock('../../../Application/node_modules/express', () => {
  return require('jest-express')
})

const Request = require('jest-express').Request
const Response = require('jest-express').Response
const next = require('jest-express').Next

const csvDownloadRouter = require('../../../Application/routes/csvDownload')
const helper = require('../../../Application/routes/helpers/middleware')
const apiManager = require('../../../Application/controllers/apiManager')
const userController = require('../../../Application/controllers/userController')
const contractController = require('../../../Application/controllers/contractController')
const csvDownloadController = require('../../../Application/controllers/csvDownloadController')
const logger = require('../../../Application/lib/logger.js')

let request, response, infoSpy
let userControllerFindOneSpy, contractControllerFindOneSpy, checkContractStatusSpy, accessTradeshiftSpy
let createInvoiceDataForDownloadSpy

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

const resForDownload = {
  DocumentType: 'InvoiceType',
  UBLExtensions: { UBLExtension: [ [Object] ] },
  UBLVersionID: { value: '2.0' },
  CustomizationID: { value: 'urn:tradeshift.com:ubl-2.0-customizations:2010-06' },
  ProfileID: {
    value: 'urn:www.cenbii.eu:profile:bii04:ver1.0',
    schemeID: 'CWA 16073:2010',
    schemeAgencyID: 'CEN/ISSS WS/BII',
    schemeVersionID: '1'
  },
  ID: { value: 'test019' },
  IssueDate: { value: '2022-05-26' },
  InvoiceTypeCode: {
    value: '380',
    listID: 'UN/ECE 1001 Subset',
    listAgencyID: '6',
    listVersionID: 'D08B'
  },
  DocumentCurrencyCode: { value: 'JPY' },
  AdditionalDocumentReference: [
    { ID: [Object], DocumentTypeCode: [Object] },
    { ID: [Object], DocumentTypeCode: [Object], Attachment: [Object] }
  ],
  AccountingSupplierParty: {
    Party: {
      PartyIdentification: [{ ID: { schemeID: 'JP:CT', value: 'ダミー法人番号' } }],
      PartyName: [{ Name: { value: 'ダミー宛先企業' } }],
      PostalAddress: [Object],
      Contact: [Object],
      Person: [Object]
    }
  },
  AccountingCustomerParty: {
    Party: {
      PartyIdentification: [{ ID: { schemeID: 'JP:CT', value: 'ダミー法人番号' } }],
      PartyName: [{ Name: { value: 'ダミー宛先企業' } }],
      PostalAddress: [Object],
      Contact: {}
    }
  },
  PaymentMeans: [
    {
      ID: [Object],
      PaymentMeansCode: [Object],
      PaymentChannelCode: [Object],
      PayeeFinancialAccount: [Object]
    }
  ],
  TaxTotal: [ { TaxAmount: [Object], TaxSubtotal: [Array] } ],
  LegalMonetaryTotal: {
    LineExtensionAmount: { value: 5000, currencyID: 'JPY' },
    TaxExclusiveAmount: { value: 500, currencyID: 'JPY' },
    TaxInclusiveAmount: { value: 5500, currencyID: 'JPY' },
    PayableAmount: { value: 5500, currencyID: 'JPY' }
  },
  InvoiceLine: [
    {
      ID: [Object],
      InvoicedQuantity: [Object],
      LineExtensionAmount: [Object],
      TaxTotal: [{
        TaxSubtotal: [{ TaxCategory: { TaxScheme: { Name: { value: 'xxx' } } } }]
      }],
      Item: [Object],
      Price: [Object]
    },
    {
      ID: [Object],
      InvoicedQuantity: [Object],
      LineExtensionAmount: [Object],
      TaxTotal: [{
        TaxSubtotal: [{ TaxCategory: { TaxScheme: { Name: { value: 'xxx' } } } }]
      }],
      Item: [Object],
      Price: [Object]
    }
  ]
}

describe('アプリ効果測定UT_デジトレ', () => {
  beforeEach(() => {
    request = new Request()
    request.user = user[0]
    request.session = session
    response = new Response()
    infoSpy = jest.spyOn(logger, 'info')
    accessTradeshiftSpy = jest.spyOn(apiManager, 'accessTradeshift')
    userControllerFindOneSpy = jest.spyOn(userController, 'findOne')
    contractControllerFindOneSpy = jest.spyOn(contractController, 'findOne')
    checkContractStatusSpy = jest.spyOn(helper, 'checkContractStatus')
    createInvoiceDataForDownloadSpy = jest.spyOn(csvDownloadController, 'createInvoiceDataForDownload')
    request.flash = jest.fn()
  })
  afterEach(() => {
    request.resetMocked()
    response.resetMocked()
    next.mockReset()
    infoSpy.mockRestore()
    accessTradeshiftSpy.mockRestore()
    userControllerFindOneSpy.mockRestore()
    contractControllerFindOneSpy.mockRestore()
    checkContractStatusSpy.mockRestore()
    createInvoiceDataForDownloadSpy.mockRestore()
  })

  describe('請求書情報ダウンロード', () => {
    test('請求書番号を指定しない場合', async () => {
      request.body = { status: ['送信済み/受信済み'] }
      userControllerFindOneSpy.mockResolvedValue({ dataValues: { userRole: 'a6a3edcd-00d9-427c-bf03-4ef0112ba16d', userStatus: 0 } })
      contractControllerFindOneSpy.mockResolvedValue({ dataValues: { contractId: '232457c2-07af-4235-8fff-6dfa32e37f5e', deleteFlag: false } })
      checkContractStatusSpy.mockResolvedValue(10)
      accessTradeshiftSpy.mockResolvedValue({
        itemCount: 1,
        numPages: 1,
        pageId: 0,
        Document: [
          {
            DocumentId: '87a7dc36-6d70-47c9-83fc-1f99fa71ed21',
            ID: 'test019',
            URI: 'https://api-sandbox.tradeshift.com/tradeshift/rest/external/documents/87a7dc36-6d70-47c9-83fc-1f99fa71ed21',
            DocumentType: {},
            State: 'LOCKED',
            CreatedDateTime: '2022-05-26T02:57:52.634Z',
            LastEdit: '2022-05-26T03:03:42.129Z',
            SenderCompanyName: 'サプライヤー２ひろはし',
            Actor: {},
            ConversationId: '0891277a-28ca-4f1c-99e8-b54cbb5de189',
            ReceiverCompanyName: 'ウェブレッジ社向けテスト企業',
            Tags: {},
            ItemInfos: [],
            ProcessState: 'PENDING',
            ConversationStates: [],
            UnifiedState: 'DELIVERED',
            CopyIndicator: false,
            Deleted: false,
            TenantId: '691ed36b-7c2d-4fb2-92f3-f40a5b3faa2a',
            InvoiceTypeCode: '380',
            Properties: [],
            SettlementBusinessIds: []
          }
        ]
      })
      createInvoiceDataForDownloadSpy.mockResolvedValue([
        {
          DocumentType: 'InvoiceType',
          UBLExtensions: null,
          UBLVersionID: {},
          CustomizationID: {},
          ProfileID: {},
          ID: {},
          IssueDate: {},
          InvoiceTypeCode: {},
          DocumentCurrencyCode: {},
          AdditionalDocumentReference: [{ DocumentTypeCode: { value: '' } }],
          AccountingSupplierParty: { Party: { PartyIdentification: [] } },
          AccountingCustomerParty: { Party: { PartyIdentification: [] } },
          Delivery: null,
          PaymentMeans: null,
          TaxTotal: [],
          LegalMonetaryTotal: {},
          InvoiceLine: [{ ID: { value: null }, InvoicedQuantity: { value: null } }]
        }
      ])

      await csvDownloadRouter.cbPostIndex(request, response, next)

      expect(infoSpy).nthCalledWith(3, { action: 'downloadedInvoiceInfo', downloadedInvoiceCount: 1, tenantId: 'dummyTenantId' })
    })

    test('請求書番号を指定する場合', async () => {
      request.body = { status: ['送信済み/受信済み'], invoiceNumber: 'test019' }
      userControllerFindOneSpy.mockResolvedValue({ dataValues: { userRole: 'a6a3edcd-00d9-427c-bf03-4ef0112ba16d', userStatus: 0 } })
      contractControllerFindOneSpy.mockResolvedValue({ dataValues: { contractId: '232457c2-07af-4235-8fff-6dfa32e37f5e', deleteFlag: false } })
      checkContractStatusSpy.mockResolvedValue(10)
      accessTradeshiftSpy.mockResolvedValueOnce({
        itemCount: 1,
        numPages: 1,
        pageId: 0,
        Document: [
          {
            DocumentId: '87a7dc36-6d70-47c9-83fc-1f99fa71ed21',
            ID: 'test019',
            URI: 'https://api-sandbox.tradeshift.com/tradeshift/rest/external/documents/87a7dc36-6d70-47c9-83fc-1f99fa71ed21',
            DocumentType: {},
            State: 'LOCKED',
            CreatedDateTime: '2022-05-26T02:57:52.634Z',
            LastEdit: '2022-05-26T03:03:42.129Z',
            SenderCompanyName: 'サプライヤー２ひろはし',
            Actor: {},
            ConversationId: '0891277a-28ca-4f1c-99e8-b54cbb5de189',
            ReceiverCompanyName: 'ウェブレッジ社向けテスト企業',
            Tags: {},
            ItemInfos: [],
            ProcessState: 'PENDING',
            ConversationStates: [],
            UnifiedState: 'DELIVERED',
            CopyIndicator: false,
            Deleted: false,
            TenantId: '691ed36b-7c2d-4fb2-92f3-f40a5b3faa2a',
            InvoiceTypeCode: '380',
            Properties: [],
            SettlementBusinessIds: []
          }
        ]
      }).mockResolvedValueOnce(resForDownload)

      createInvoiceDataForDownloadSpy.mockResolvedValue('dummyInvoicesString')

      await csvDownloadRouter.cbPostIndex(request, response, next)

      expect(infoSpy).nthCalledWith(3, { action: 'downloadedInvoiceInfo', downloadedInvoiceCount: 1, tenantId: 'dummyTenantId' })
    })
  })
})
