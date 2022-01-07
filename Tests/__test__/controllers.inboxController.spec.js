'use strict'
jest.mock('../../Application/models')
jest.mock('../../Application/lib/logger')

const inboxController = require('../../Application/controllers/inboxController')
const apiManager = require('../../Application/controllers/apiManager.js')
const logger = require('../../Application/lib/logger')
const InvoiceDetailObj = require('../../Application/lib/invoiceDetail')
let accessTradeshiftSpy, errorSpy

const searchResult1 = {
  itemsPerPage: 20,
  itemCount: 4,
  indexing: false,
  numPages: 1,
  pageId: 0,
  Document: [
    {
      DocumentId: '3064665f-a90a-5f2e-a9e1-d59988ef3591',
      ID: 'PB1649meisai001',
      URI: 'https://api-sandbox.tradeshift.com/tradeshift/rest/external/documents/3064665f-a90a-5f2e-a9e1-d59988ef3591',
      DocumentType: [Object],
      State: 'LOCKED',
      CreatedDateTime: '2021-12-27T05:25:39.360Z',
      LastEdit: '2021-12-27T05:25:39.360Z',
      SenderCompanyName: 'サプライヤー1',
      Actor: [Object],
      ConversationId: '0ba5c4ea-3f67-42be-bbd4-9ec533dc6625',
      ReceiverCompanyName: 'バイヤー1',
      Tags: [Object],
      ItemInfos: [
        { type: 'document.currency', value: 'JPY' },
        { type: 'document.total', value: '3080000.00' },
        { type: 'document.issuedate', value: '2021-11-08' }
      ],
      ProcessState: 'PENDING',
      ConversationStates: [Array],
      UnifiedState: 'PAID_CONFIRMED',
      CopyIndicator: false,
      Deleted: false,
      DueDate: '2021-11-10',
      Note: '請求書一括作成_1649_test_no1.csv',
      TenantId: '011c0e85-aabb-437b-9dcd-5b941dd4e1aa',
      InvoiceTypeCode: '380',
      ProfileID: 'urn:www.cenbii.eu:profile:bii04:ver1.0',
      Properties: [],
      SettlementBusinessIds: []
    },
    {
      DocumentId: '0aa6c428-b1d0-5cef-8044-3fe78acb226f',
      ID: 'PBI2848supplier_送金済み',
      URI: 'https://api-sandbox.tradeshift.com/tradeshift/rest/external/documents/0aa6c428-b1d0-5cef-8044-3fe78acb226f',
      DocumentType: [Object],
      State: 'LOCKED',
      CreatedDateTime: '2021-12-16T05:42:23.097Z',
      LastEdit: '2021-12-16T05:42:23.097Z',
      SenderCompanyName: 'サプライヤー1',
      Actor: [Object],
      ApplicationResponse: [Object],
      ConversationId: 'daad8d3f-3402-46d4-b811-6f44fa8f19ef',
      ReceiverCompanyName: 'バイヤー1',
      Tags: [Object],
      ItemInfos: [
        { type: 'document.currency', value: 'JPY' },
        { type: 'document.total', value: '91000.00' },
        { type: 'document.issuedate', value: '2021-12-17' }
      ],
      ProcessState: 'PAID',
      ConversationStates: [Array],
      UnifiedState: 'PAID_CONFIRMED',
      CopyIndicator: false,
      Deleted: false,
      DueDate: '2021-12-22',
      TenantId: '011c0e85-aabb-437b-9dcd-5b941dd4e1aa',
      InvoiceTypeCode: '380',
      Properties: [],
      SettlementBusinessIds: []
    },
    {
      DocumentId: '5792b9b9-fe31-5b1d-a58f-9798089359fd',
      ID: 'PBI2848supplier_承認済み',
      URI: 'https://api-sandbox.tradeshift.com/tradeshift/rest/external/documents/5792b9b9-fe31-5b1d-a58f-9798089359fd',
      DocumentType: [Object],
      State: 'LOCKED',
      CreatedDateTime: '2021-12-28T05:31:27.567Z',
      LastEdit: '2021-12-16T05:31:27.567Z',
      SenderCompanyName: 'サプライヤー1',
      Actor: [Object],
      ApplicationResponse: [Object],
      ConversationId: 'f1457f53-fda9-4cc5-a754-d41cd8a4e59e',
      ReceiverCompanyName: 'バイヤー1',
      Tags: [Object],
      ItemInfos: [
        { type: 'document.currency', value: 'JPY' },
        { type: 'document.total', value: '178320.00' },
        { type: 'document.issuedate', value: '2021-12-17' }
      ],
      ProcessState: 'PAID',
      ConversationStates: [Array],
      UnifiedState: 'PAID_UNCONFIRMED',
      CopyIndicator: false,
      Deleted: false,
      DueDate: '2021-12-28',
      TenantId: '011c0e85-aabb-437b-9dcd-5b941dd4e1aa',
      InvoiceTypeCode: '380',
      Properties: [],
      SettlementBusinessIds: []
    },
    {
      DocumentId: '76b589ab-1fc2-5aa3-bdb4-151abadd9537',
      ID: 'PBI2848supplier_受信済み',
      URI: 'https://api-sandbox.tradeshift.com/tradeshift/rest/external/documents/76b589ab-1fc2-5aa3-bdb4-151abadd9537',
      DocumentType: [Object],
      State: 'LOCKED',
      CreatedDateTime: '2021-12-16T05:07:42.135Z',
      LastEdit: '2021-12-16T05:07:42.135Z',
      SenderCompanyName: 'サプライヤー1',
      Actor: [Object],
      ConversationId: 'a5c74fe7-03a3-4089-ac38-ec5a4c221919',
      ReceiverCompanyName: 'バイヤー1',
      Tags: [Object],
      ItemInfos: [
        { type: 'document.currency', value: 'JPY' },
        { type: 'document.total', value: '67000.00' },
        { type: 'document.issuedate', value: '2021-12-17' }
      ],
      ProcessState: 'ACCEPTED',
      ConversationStates: [Array],
      UnifiedState: 'ACCEPTED',
      CopyIndicator: false,
      Deleted: false,
      DueDate: '2021-12-28',
      TenantId: '011c0e85-aabb-437b-9dcd-5b941dd4e1aa',
      InvoiceTypeCode: '380',
      Properties: [],
      SettlementBusinessIds: []
    }
  ]
}

const result1 = {
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
      documentId: '3064665f-a90a-5f2e-a9e1-d59988ef3591'
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
      documentId: '0aa6c428-b1d0-5cef-8044-3fe78acb226f'
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
      documentId: '5792b9b9-fe31-5b1d-a58f-9798089359fd'
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
      documentId: '76b589ab-1fc2-5aa3-bdb4-151abadd9537'
    }
  ],
  numPages: 1,
  currPage: 1
}

const result0 = {
  previous: 0,
  next: 1,
  list: []
}

const searchResult2 = {
  itemsPerPage: 20,
  itemCount: 0,
  indexing: false,
  numPages: 1,
  pageId: 0,
  Document: undefined
}

const searchResult3 = {
  itemsPerPage: 20,
  itemCount: 4,
  indexing: false,
  numPages: 1,
  pageId: 0,
  Document: [
    {
      DocumentId: '3064665f-a90a-5f2e-a9e1-d59988ef3591',
      ID: 'PB1649meisai001',
      URI: 'https://api-sandbox.tradeshift.com/tradeshift/rest/external/documents/3064665f-a90a-5f2e-a9e1-d59988ef3591',
      DocumentType: [Object],
      State: 'LOCKED',
      CreatedDateTime: '2021-12-27T05:25:39.360Z',
      LastEdit: undefined,
      SenderCompanyName: undefined,
      Actor: [Object],
      ConversationId: '0ba5c4ea-3f67-42be-bbd4-9ec533dc6625',
      ReceiverCompanyName: undefined,
      Tags: [Object],
      ItemInfos: [
        { type: 'document.currency', value: undefined },
        { type: 'document.total', value: '3080000.00' },
        { type: 'document.issuedate', value: '2021-11-08' }
      ],
      ProcessState: 'PENDING',
      ConversationStates: [Array],
      UnifiedState: 'PAID_CONFIRMED',
      CopyIndicator: false,
      Deleted: false,
      DueDate: undefined,
      Note: '請求書一括作成_1649_test_no1.csv',
      TenantId: '011c0e85-aabb-437b-9dcd-5b941dd4e1aa',
      InvoiceTypeCode: '380',
      ProfileID: 'urn:www.cenbii.eu:profile:bii04:ver1.0',
      Properties: [],
      SettlementBusinessIds: []
    },
    {
      DocumentId: '0aa6c428-b1d0-5cef-8044-3fe78acb226f',
      ID: 'PBI2848supplier_送金済み',
      URI: 'https://api-sandbox.tradeshift.com/tradeshift/rest/external/documents/0aa6c428-b1d0-5cef-8044-3fe78acb226f',
      DocumentType: [Object],
      State: 'LOCKED',
      CreatedDateTime: '2021-12-16T05:42:23.097Z',
      LastEdit: '',
      SenderCompanyName: 'サプライヤー1',
      Actor: [Object],
      ApplicationResponse: [Object],
      ConversationId: 'daad8d3f-3402-46d4-b811-6f44fa8f19ef',
      ReceiverCompanyName: 'バイヤー1',
      Tags: [Object],
      ItemInfos: [
        { type: 'document.currency', value: 'JPY' },
        { type: 'document.total', value: '3080000.00' },
        { type: 'document.issuedate', value: '2021-11-08' }
      ],
      ProcessState: 'PAID',
      ConversationStates: [Array],
      UnifiedState: [
        { type: 'document.currency', value: 'JPY' },
        { type: 'document.total', value: '67000.00' },
        { type: 'document.issuedate', value: '2021-12-17' }
      ],
      CopyIndicator: false,
      Deleted: false,
      DueDate: '2021-12-22',
      TenantId: '011c0e85-aabb-437b-9dcd-5b941dd4e1aa',
      InvoiceTypeCode: '380',
      Properties: [],
      SettlementBusinessIds: []
    },
    {
      DocumentId: '5792b9b9-fe31-5b1d-a58f-9798089359fd',
      ID: 'PBI2848supplier_承認済み',
      URI: 'https://api-sandbox.tradeshift.com/tradeshift/rest/external/documents/5792b9b9-fe31-5b1d-a58f-9798089359fd',
      DocumentType: [Object],
      State: 'LOCKED',
      CreatedDateTime: '2021-12-16T05:31:27.567Z',
      LastEdit: '2021-12-16T05:07:42.135Z',
      SenderCompanyName: 'サプライヤー1',
      Actor: [Object],
      ApplicationResponse: [Object],
      ConversationId: 'f1457f53-fda9-4cc5-a754-d41cd8a4e59e',
      ReceiverCompanyName: 'バイヤー1',
      Tags: [Object],
      ItemInfos: [
        { type: 'document.currency', value: 'JPY' },
        { type: 'document.total', value: '178320.00' },
        { type: 'document.issuedate', value: '2021-12-17' }
      ],
      ProcessState: 'PAID',
      ConversationStates: [Array],
      UnifiedState: 'PAID_UNCONFIRMED',
      CopyIndicator: false,
      Deleted: false,
      DueDate: '2021-12-20',
      TenantId: '011c0e85-aabb-437b-9dcd-5b941dd4e1aa',
      InvoiceTypeCode: '380',
      Properties: [],
      SettlementBusinessIds: []
    },
    {
      DocumentId: '76b589ab-1fc2-5aa3-bdb4-151abadd9537',
      ID: 'PBI2848supplier_受信済み',
      URI: 'https://api-sandbox.tradeshift.com/tradeshift/rest/external/documents/76b589ab-1fc2-5aa3-bdb4-151abadd9537',
      DocumentType: [Object],
      State: 'LOCKED',
      CreatedDateTime: '2021-12-16T05:07:42.135Z',
      LastEdit: '2021-12-16T05:07:42.135Z',
      SenderCompanyName: 'サプライヤー1',
      Actor: [Object],
      ConversationId: 'a5c74fe7-03a3-4089-ac38-ec5a4c221919',
      ReceiverCompanyName: 'バイヤー1',
      Tags: [Object],
      ItemInfos: [
        { type: 'document.currency', value: 'JPY' },
        undefined,
        { type: 'document.issuedate', value: '2021-12-17' }
      ],
      ProcessState: 'ACCEPTED',
      ConversationStates: [Array],
      UnifiedState: 'ACCEPTED',
      CopyIndicator: false,
      Deleted: false,
      DueDate: '2021-12-28',
      TenantId: '011c0e85-aabb-437b-9dcd-5b941dd4e1aa',
      InvoiceTypeCode: '380',
      Properties: [],
      SettlementBusinessIds: []
    }
  ]
}

const result3 = {
  currPage: 1,
  list: [
    {
      ammount: '3,080,000',
      currency: '-',
      documentId: '3064665f-a90a-5f2e-a9e1-d59988ef3591',
      expire: '-',
      invoiceNo: 'PB1649meisai001',
      no: 1,
      sentBy: '-',
      sentTo: '-',
      status: 0,
      updated: '-'
    },
    {
      ammount: '3,080,000',
      currency: 'JPY',
      documentId: '0aa6c428-b1d0-5cef-8044-3fe78acb226f',
      expire: '2021-12-22',
      invoiceNo: 'PBI2848supplier_送金済み',
      no: 2,
      sentBy: 'バイヤー1',
      sentTo: 'サプライヤー1',
      status: '-',
      updated: ''
    },
    {
      ammount: '178,320',
      currency: 'JPY',
      documentId: '5792b9b9-fe31-5b1d-a58f-9798089359fd',
      expire: '2021-12-20',
      invoiceNo: 'PBI2848supplier_承認済み',
      no: 3,
      sentBy: 'バイヤー1',
      sentTo: 'サプライヤー1',
      status: 1,
      updated: '2021-12-16'
    },
    {
      ammount: '-',
      currency: 'JPY',
      documentId: '76b589ab-1fc2-5aa3-bdb4-151abadd9537',
      expire: '2021-12-28',
      invoiceNo: 'PBI2848supplier_受信済み',
      no: 4,
      sentBy: 'バイヤー1',
      sentTo: 'サプライヤー1',
      status: 2,
      updated: '2021-12-16'
    }
  ],
  numPages: 1
}

const searchResult4 = {
  itemsPerPage: 20,
  itemCount: 4,
  indexing: false,
  numPages: 1,
  pageId: 0,
  Document: [
    {
      DocumentId: '3064665f-a90a-5f2e-a9e1-d59988ef3591',
      ID: 'PB1649meisai001',
      URI: 'https://api-sandbox.tradeshift.com/tradeshift/rest/external/documents/3064665f-a90a-5f2e-a9e1-d59988ef3591',
      DocumentType: [Object],
      State: 'LOCKED',
      CreatedDateTime: '2021-12-27T05:25:39.360Z',
      LastEdit: undefined,
      SenderCompanyName: 'バイヤー1',
      Actor: [Object],
      ConversationId: '0ba5c4ea-3f67-42be-bbd4-9ec533dc6625',
      ReceiverCompanyName: 'サプライヤー1',
      Tags: [Object],
      ItemInfos: [
        { type: 'document.currency', value: 'JPY' },
        { type: 'document.total', value: '3080000.00' },
        { type: 'document.issuedate', value: '2021-11-08' }
      ],
      ProcessState: 'PENDING',
      ConversationStates: [Array],
      UnifiedState: 'PAID_CONFIRMED',
      CopyIndicator: false,
      Deleted: false,
      DueDate: '2021-12-01',
      Note: '請求書一括作成_1649_test_no1.csv',
      TenantId: '011c0e85-aabb-437b-9dcd-5b941dd4e1aa',
      InvoiceTypeCode: '380',
      ProfileID: 'urn:www.cenbii.eu:profile:bii04:ver1.0',
      Properties: [],
      SettlementBusinessIds: []
    },
    {
      DocumentId: '0aa6c428-b1d0-5cef-8044-3fe78acb226f',
      ID: 'PBI2848supplier_送金済み',
      URI: 'https://api-sandbox.tradeshift.com/tradeshift/rest/external/documents/0aa6c428-b1d0-5cef-8044-3fe78acb226f',
      DocumentType: [Object],
      State: 'LOCKED',
      CreatedDateTime: '2021-12-17T05:07:42.135Z',
      LastEdit: undefined,
      SenderCompanyName: 'サプライヤー1',
      Actor: [Object],
      ApplicationResponse: [Object],
      ConversationId: 'daad8d3f-3402-46d4-b811-6f44fa8f19ef',
      ReceiverCompanyName: 'バイヤー1',
      Tags: [Object],
      ItemInfos: [
        { type: 'document.currency', value: 'JPY' },
        { type: 'document.total', value: '3080000.00' },
        { type: 'document.issuedate', value: '2021-11-08' }
      ],
      ProcessState: 'PAID',
      ConversationStates: [Array],
      UnifiedState: [
        { type: 'document.currency', value: 'JPY' },
        { type: 'document.total', value: '67000.00' },
        { type: 'document.issuedate', value: '2021-12-17' }
      ],
      CopyIndicator: false,
      Deleted: false,
      DueDate: '2021-12-10',
      TenantId: '011c0e85-aabb-437b-9dcd-5b941dd4e1aa',
      InvoiceTypeCode: '380',
      Properties: [],
      SettlementBusinessIds: []
    },
    {
      DocumentId: '5792b9b9-fe31-5b1d-a58f-9798089359fd',
      ID: 'PBI2848supplier_承認済み',
      URI: 'https://api-sandbox.tradeshift.com/tradeshift/rest/external/documents/5792b9b9-fe31-5b1d-a58f-9798089359fd',
      DocumentType: [Object],
      State: 'LOCKED',
      CreatedDateTime: '2021-12-15T05:07:42.135Z',
      LastEdit: undefined,
      SenderCompanyName: 'サプライヤー1',
      Actor: [Object],
      ApplicationResponse: [Object],
      ConversationId: 'f1457f53-fda9-4cc5-a754-d41cd8a4e59e',
      ReceiverCompanyName: 'バイヤー1',
      Tags: [Object],
      ItemInfos: [
        { type: 'document.currency', value: 'JPY' },
        { type: 'document.total', value: '178320.00' },
        { type: 'document.issuedate', value: '2021-12-17' }
      ],
      ProcessState: 'PAID',
      ConversationStates: [Array],
      UnifiedState: 'PAID_UNCONFIRMED',
      CopyIndicator: false,
      Deleted: false,
      DueDate: '2021-12-07',
      TenantId: '011c0e85-aabb-437b-9dcd-5b941dd4e1aa',
      InvoiceTypeCode: '380',
      Properties: [],
      SettlementBusinessIds: []
    },
    {
      DocumentId: '76b589ab-1fc2-5aa3-bdb4-151abadd9537',
      ID: 'PBI2848supplier_受信済み',
      URI: 'https://api-sandbox.tradeshift.com/tradeshift/rest/external/documents/76b589ab-1fc2-5aa3-bdb4-151abadd9537',
      DocumentType: [Object],
      State: 'LOCKED',
      CreatedDateTime: '2021-12-15T05:07:42.135Z',
      LastEdit: undefined,
      SenderCompanyName: 'サプライヤー1',
      Actor: [Object],
      ConversationId: 'a5c74fe7-03a3-4089-ac38-ec5a4c221919',
      ReceiverCompanyName: 'バイヤー1',
      Tags: [Object],
      ItemInfos: [
        { type: 'document.currency', value: 'JPY' },
        undefined,
        { type: 'document.issuedate', value: '2021-12-17' }
      ],
      ProcessState: 'ACCEPTED',
      ConversationStates: [Array],
      UnifiedState: 'ACCEPTED',
      CopyIndicator: false,
      Deleted: false,
      DueDate: '2021-12-07',
      TenantId: '011c0e85-aabb-437b-9dcd-5b941dd4e1aa',
      InvoiceTypeCode: '380',
      Properties: [],
      SettlementBusinessIds: []
    }
  ]
}

const result4 = {
  currPage: 1,
  list: [
    {
      ammount: '3,080,000',
      currency: 'JPY',
      documentId: '3064665f-a90a-5f2e-a9e1-d59988ef3591',
      expire: '2021-12-01',
      invoiceNo: 'PB1649meisai001',
      no: 1,
      sentBy: 'サプライヤー1',
      sentTo: 'バイヤー1',
      status: 0,
      updated: '-'
    },
    {
      ammount: '178,320',
      currency: 'JPY',
      documentId: '5792b9b9-fe31-5b1d-a58f-9798089359fd',
      expire: '2021-12-07',
      invoiceNo: 'PBI2848supplier_承認済み',
      no: 3,
      sentBy: 'バイヤー1',
      sentTo: 'サプライヤー1',
      status: 1,
      updated: '-'
    },
    {
      ammount: '-',
      currency: 'JPY',
      documentId: '76b589ab-1fc2-5aa3-bdb4-151abadd9537',
      expire: '2021-12-07',
      invoiceNo: 'PBI2848supplier_受信済み',
      no: 4,
      sentBy: 'バイヤー1',
      sentTo: 'サプライヤー1',
      status: 2,
      updated: '-'
    },
    {
      ammount: '3,080,000',
      currency: 'JPY',
      documentId: '0aa6c428-b1d0-5cef-8044-3fe78acb226f',
      expire: '2021-12-10',
      invoiceNo: 'PBI2848supplier_送金済み',
      no: 2,
      sentBy: 'バイヤー1',
      sentTo: 'サプライヤー1',
      status: '-',
      updated: '-'
    }
  ],
  numPages: 1
}
const accessToken = 'dummyAccessToken'
const refreshToken = 'dummyRefreshToken'
const pageId = 1
const tenantId = '15e2d952-8ba0-42a4-8582-b234cb4a2089'

describe('inboxControllerのテスト', () => {
  beforeEach(() => {
    accessTradeshiftSpy = jest.spyOn(apiManager, 'accessTradeshift')
    errorSpy = jest.spyOn(logger, 'error')
  })
  afterEach(() => {
    accessTradeshiftSpy.mockRestore()
    errorSpy.mockRestore()
  })

  describe('getInbox', () => {
    test('正常', async () => {
      // 準備
      // APIからの正常情報の取得を想定する
      accessTradeshiftSpy.mockReturnValue(searchResult1)

      // 試験実施
      const result = await inboxController.getInbox(accessToken, refreshToken, pageId, tenantId)

      // 期待結果
      // 想定した契約情報がReturnされていること
      expect(result).toEqual(result1)
    })

    test('正常：文書をリスト化する時値がない場合', async () => {
      // 準備
      // APIからの正常情報の取得を想定する
      accessTradeshiftSpy.mockReturnValue(searchResult3)

      // 試験実施
      const result = await inboxController.getInbox(accessToken, refreshToken, pageId, tenantId)
      // 期待結果
      expect(result).toEqual(result3)
    })

    test('正常：更新日がない場合、期限日で整列', async () => {
      // 準備
      // APIからの正常情報の取得を想定する
      accessTradeshiftSpy.mockReturnValue(searchResult4)

      // 試験実施
      const result = await inboxController.getInbox(accessToken, refreshToken, pageId, tenantId)
      // 期待結果
      expect(result).toEqual(result4)
    })

    test('異常: アクセストークンの有効期限が終わるの場合の場合', async () => {
      // 準備
      // APIからの正常情報の取得を想定する
      accessTradeshiftSpy.mockReturnValue(searchResult2)

      // 試験実施
      const result = await inboxController.getInbox(accessToken, refreshToken, pageId, tenantId)
      // 期待結果
      expect(result).toEqual(result0)
    })
  })

  describe('getInvoiceDetail', () => {
    test('正常', async () => {
      const dummyData = require('../mockInvoice/invoice32')
      accessTradeshiftSpy.mockReturnValue(dummyData)
      const resultDummyData = new InvoiceDetailObj(dummyData)
      const result = await inboxController.getInvoiceDetail(accessToken, refreshToken, 'dummyInvoiceId')

      expect(result).toEqual(resultDummyData)
    })
  })
})
