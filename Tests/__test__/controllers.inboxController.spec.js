'use strict'
jest.mock('../../Application/models')
jest.mock('../../Application/lib/logger')

const inboxController = require('../../Application/controllers/inboxController')
const apiManager = require('../../Application/controllers/apiManager.js')
const logger = require('../../Application/lib/logger')
const InvoiceDetailObj = require('../../Application/lib/invoiceDetail')
const AccountCode = require('../../Application/models').AccountCode
const SubAccountCode = require('../../Application/models').SubAccountCode
const JournalizeInvoice = require('../../Application/models').JournalizeInvoice

let accessTradeshiftSpy,
  errorSpy,
  journalizeInvoiceFindAllSpy,
  accountCodeFindOneSpy,
  accountCodeFindAllSpy,
  subAccountCodeFindOneSpy,
  journalizeInvoiceCreateSpy

const accountCodeMock = require('../mockDB/AccountCode_Table')
const subAccountCodeMock = require('../mockDB/SubAccountCode_Table')

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
const contractId = 'f10b95a4-74a1-4691-880a-827c9f1a1faf'

describe('inboxControllerのテスト', () => {
  beforeEach(() => {
    accessTradeshiftSpy = jest.spyOn(apiManager, 'accessTradeshift')
    journalizeInvoiceFindAllSpy = jest.spyOn(JournalizeInvoice, 'findAll')
    errorSpy = jest.spyOn(logger, 'error')
    accountCodeFindOneSpy = jest.spyOn(AccountCode, 'findOne')
    accountCodeFindAllSpy = jest.spyOn(AccountCode, 'findAll')
    subAccountCodeFindOneSpy = jest.spyOn(SubAccountCode, 'findOne')
    journalizeInvoiceCreateSpy = jest.spyOn(JournalizeInvoice, 'create')
    JournalizeInvoice.build = jest.fn(function (values) {
      const keys = Object.keys(values)
      const newJournal = new JournalizeInvoice()
      keys.forEach((key) => {
        newJournal[key] = values[key]
      })
      return newJournal
    })
    JournalizeInvoice.save = jest.fn(async function () {})
    JournalizeInvoice.destory = jest.fn(async function () {})
    JournalizeInvoice.set = jest.fn(function () {})
  })
  afterEach(() => {
    accessTradeshiftSpy.mockRestore()
    errorSpy.mockRestore()
    subAccountCodeFindOneSpy.mockRestore()
    journalizeInvoiceFindAllSpy.mockRestore()
    accountCodeFindOneSpy.mockRestore()
    accountCodeFindAllSpy.mockRestore()
    journalizeInvoiceCreateSpy.mockRestore()
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
      journalizeInvoiceFindAllSpy.mockReturnValue([])
      const resultDummyData = new InvoiceDetailObj(dummyData, [])
      const result = await inboxController.getInvoiceDetail(accessToken, refreshToken, 'dummyInvoiceId')
      expect(result).toEqual(resultDummyData)
    })

    test('正常：支払い条件ない', async () => {
      const dummyData = require('../mockInvoice/invoice33')
      accessTradeshiftSpy.mockReturnValue(dummyData)
      journalizeInvoiceFindAllSpy.mockReturnValue([])
      const result = await inboxController.getInvoiceDetail(accessToken, refreshToken, 'dummyInvoiceId')

      expect(result.payments).toEqual([])
    })

    test('正常：現金支払い', async () => {
      const dummyData = require('../mockInvoice/invoice34')
      accessTradeshiftSpy.mockReturnValue(dummyData)
      journalizeInvoiceFindAllSpy.mockReturnValue([])
      const result = await inboxController.getInvoiceDetail(accessToken, refreshToken, 'dummyInvoiceId')

      expect(result.payments).toEqual([
        {
          現金払い: {}
        }
      ])
    })

    test('正常：小切手払い', async () => {
      const dummyData = require('../mockInvoice/invoice35')
      accessTradeshiftSpy.mockReturnValue(dummyData)
      journalizeInvoiceFindAllSpy.mockReturnValue([])
      const result = await inboxController.getInvoiceDetail(accessToken, refreshToken, 'dummyInvoiceId')

      expect(result.payments).toEqual([
        {
          小切手払い: {}
        }
      ])
    })

    test('正常：BankCard', async () => {
      const dummyData = require('../mockInvoice/invoice36')
      accessTradeshiftSpy.mockReturnValue(dummyData)
      journalizeInvoiceFindAllSpy.mockReturnValue([])
      const result = await inboxController.getInvoiceDetail(accessToken, refreshToken, 'dummyInvoiceId')

      expect(result.payments).toEqual([
        {
          'Payment by bank card': {}
        }
      ])
    })

    test('正常：DirectDebit', async () => {
      const dummyData = require('../mockInvoice/invoice37')
      accessTradeshiftSpy.mockReturnValue(dummyData)
      journalizeInvoiceFindAllSpy.mockReturnValue([])
      const result = await inboxController.getInvoiceDetail(accessToken, refreshToken, 'dummyInvoiceId')

      expect(result.payments).toEqual([
        {
          'Payment by direct debit': [
            { item: '銀行名', value: '赤銀行' },
            { item: '支店名', value: '上野' },
            { item: '科目', value: '当座' },
            { item: '口座番号', value: '1130008' },
            { item: '口座名義', value: '太郎' },
            { item: '番地', value: '所在地１（任意）' },
            { item: 'ビル名/フロア等', value: '所在地２（任意）' },
            { item: '家屋番号', value: 'ビル名（任意）' },
            { item: '都道府県', value: '市区町村（任意）' },
            { item: '都道府県', value: '都道府県（任意）' },
            { item: '郵便番号', value: '100-0000' },
            { item: '所在地', value: '所在地（任意）' },
            { item: '国', value: '国名（任意）' }
          ]
        }
      ])
    })

    test('正常：銀行口座情報(国内)', async () => {
      const dummyData = require('../mockInvoice/invoice38')
      accessTradeshiftSpy.mockReturnValue(dummyData)
      journalizeInvoiceFindAllSpy.mockReturnValue([])
      const result = await inboxController.getInvoiceDetail(accessToken, refreshToken, 'dummyInvoiceId')

      expect(result.payments).toEqual([
        {
          '銀行口座情報(国内)': [
            { item: '銀行名', value: '赤銀行' },
            { item: '支店名', value: '上野' },
            { item: '科目', value: '当座' },
            { item: '口座番号', value: '1130008' },
            { item: '口座名義', value: '太郎' },
            { item: '番地', value: '所在地１（任意）' },
            { item: 'ビル名/フロア等', value: '所在地２（任意）' },
            { item: '家屋番号', value: 'ビル名（任意）' },
            { item: '都道府県', value: '市区町村（任意）' },
            { item: '都道府県', value: '都道府県（任意）' },
            { item: '郵便番号', value: '100-0000' },
            { item: '所在地', value: '所在地（任意）' },
            { item: '国', value: '国名（任意）' }
          ]
        }
      ])
    })

    test('正常：IBAN', async () => {
      const dummyData = require('../mockInvoice/invoice39')
      accessTradeshiftSpy.mockReturnValue(dummyData)
      journalizeInvoiceFindAllSpy.mockReturnValue([])
      const result = await inboxController.getInvoiceDetail(accessToken, refreshToken, 'dummyInvoiceId')

      expect(result.payments).toEqual([
        {
          IBANで支払う: [
            { item: '銀行識別コード<br>/SWIFTコード', value: 'ABCDJPJSXXX' },
            { item: 'IBAN', value: 'SWiftcodedesusu' },
            { item: '説明', value: '国際電信送金で送金する' }
          ]
        }
      ])
    })

    test('正常：国際電信送金', async () => {
      const dummyData = require('../mockInvoice/invoice40')
      accessTradeshiftSpy.mockReturnValue(dummyData)
      journalizeInvoiceFindAllSpy.mockReturnValue([])
      const result = await inboxController.getInvoiceDetail(accessToken, refreshToken, 'dummyInvoiceId')

      expect(result.payments).toEqual([
        {
          国際電信送金で支払う: [
            { item: 'ABAナンバー', value: 'abanumber' },
            { item: 'SWIFTコード', value: 'swiftcode' },
            { item: 'IBAN', value: 'IBAN' },
            { item: '銀行名', value: '' },
            { item: '口座名義', value: '口座' },
            { item: '番地', value: '所在地１（任意）' },
            { item: 'ビル名/フロア等', value: '所在地２（任意）' },
            { item: '家屋番号', value: 'ビル名（任意）' },
            { item: '都道府県', value: '市区町村（任意）' },
            { item: '都道府県', value: '都道府県（任意）' },
            { item: '郵便番号', value: '100-0000' },
            { item: '所在地', value: '所在地（任意）' },
            { item: '国', value: '国名（任意）' },
            { item: '説明', value: '支払いメモ - 支払いオプションがIBANの場合' }
          ]
        }
      ])
    })

    test('正常：支払い条件', async () => {
      const dummyData = require('../mockInvoice/invoice41')
      accessTradeshiftSpy.mockReturnValue(dummyData)
      journalizeInvoiceFindAllSpy.mockReturnValue([])
      const result = await inboxController.getInvoiceDetail(accessToken, refreshToken, 'dummyInvoiceId')

      expect(result.payments).toEqual([
        {
          支払い条件: [
            { item: '税コード', value: 'bd067e19-e7c4-4562-b511-56dbaa17aa37' },
            { item: '説明', value: '説明' },
            { item: '割引率', value: 10 },
            { item: '決済開始日', value: '2021-12-10' },
            { item: '決済終了日', value: '2021-12-16' },
            { item: '割増率', value: 12 },
            { item: 'ペナルティ開始日', value: '2021-12-10' },
            { item: 'ペナルティ終了日', value: '2021-12-17' }
          ]
        }
      ])
    })
  })

  describe('getCode', () => {
    test('正常：パラメタが4個ある場合', async () => {
      const accountCode = accountCodeMock[0].accountCode
      const accountCodeName = accountCodeMock[0].accountCodeName
      const subAccountCode = subAccountCodeMock[0].subjectCode
      const subACcountCodeName = subAccountCodeMock[0].subjectName
      const expectResult = []
      accountCodeFindAllSpy.mockReturnValueOnce(expectResult)

      const result = await inboxController.getCode(
        contractId,
        accountCode,
        accountCodeName,
        subAccountCode,
        subACcountCodeName
      )

      expect(JSON.stringify(result, null, 2)).toMatch(JSON.stringify(expectResult, null, 2))
    })

    test('正常：パラメタがない場合', async () => {
      const accountCode = undefined
      const accountCodeName = undefined
      const subAccountCode = undefined
      const subACcountCodeName = undefined

      accountCodeFindAllSpy.mockReturnValueOnce([accountCodeMock[0]])
      accountCodeFindAllSpy.mockReturnValueOnce([subAccountCodeMock[0]])

      const result = await inboxController.getCode(
        contractId,
        accountCode,
        accountCodeName,
        subAccountCode,
        subACcountCodeName
      )

      expect(JSON.stringify(result, null, 2)).toMatch(
        JSON.stringify([subAccountCodeMock[0], accountCodeMock[0]], null, 2)
      )
    })

    test('正常：パラメタがない場合', async () => {
      const accountCode = undefined
      const accountCodeName = undefined
      const subAccountCode = undefined
      const subACcountCodeName = undefined

      const dummyTargetAccountCodeSubAccountCodeJoin = []
      accountCodeMock.forEach((item) => {
        subAccountCodeMock.forEach((subAccount) => {
          if (item.accountCodeId === subAccount.accountCodeId) {
            dummyTargetAccountCodeSubAccountCodeJoin.push({
              ...item,
              'SubAccountCodes.subjectCode': subAccount.subjectCode,
              'SubAccountCodes.subjectName': subAccount.subjectName,
              'SubAccountCodes.subAccountCodeId': subAccount.subAccountCodeId
            })
          }
        })
      })

      const expectResult = accountCodeMock.concat(dummyTargetAccountCodeSubAccountCodeJoin)

      accountCodeFindAllSpy.mockReturnValueOnce(dummyTargetAccountCodeSubAccountCodeJoin)
      accountCodeFindAllSpy.mockReturnValueOnce(accountCodeMock)

      const result = await inboxController.getCode(
        contractId,
        accountCode,
        accountCodeName,
        subAccountCode,
        subACcountCodeName
      )

      expectResult.sort((a, b) => {
        if (a.accountCode > b.accountCode) return 1
        else if (a.accountCode < b.accountCode) return -1
        else {
          if (a['SubAccountCodes.subjectCode'] > b['SubAccountCodes.subjectCode']) return 1
          else if (a['SubAccountCodes.subjectCode'] < b['SubAccountCodes.subjectCode']) return -1
          else return 0
        }
      })

      expect(JSON.stringify(result, null, 2)).toMatch(JSON.stringify(expectResult, null, 2))
    })

    test('正常：DBエラー', async () => {
      const accountCode = accountCodeMock[0].accountCode
      const accountCodeName = accountCodeMock[0].accountCodeName
      const subAccountCode = subAccountCodeMock[0].subjectCode
      const subACcountCodeName = subAccountCodeMock[0].subjectName

      const dbError = new Error('DB Conncetion Error')
      accountCodeFindAllSpy.mockImplementation(() => {
        throw dbError
      })

      const result = await inboxController.getCode(
        contractId,
        accountCode,
        accountCodeName,
        subAccountCode,
        subACcountCodeName
      )

      expect(errorSpy).toHaveBeenCalledWith({
        contractId: contractId,
        stack: dbError.stack,
        status: 0
      })
      expect(result).toEqual(dbError)
    })
  })

  describe('insertAndUpdateJournalizeInvoice', () => {
    const data = {
      lineNo: 1,
      lineNo1_lineAccountCode1_accountCode: '',
      lineNo1_lineAccountCode1_subAccountCode: '',
      lineNo1_lineAccountCode1_input_amount: '1000'
    }
    test('正常：明細が１個の時、何も操作なく「登録」ボタンを押す', async () => {
      const invoiceId = '3064665f-a90a-5f2e-a9e1-d59988ef3591'
      journalizeInvoiceFindAllSpy.mockReturnValueOnce([])
      const result = await inboxController.insertAndUpdateJournalizeInvoice(contractId, invoiceId, data)
      expect(result.status).toBe(0)
    })

    test('正常：明細が２個の時、何も操作なく「登録」ボタンを押す', async () => {
      const invoiceId = '3064665f-a90a-5f2e-a9e1-d59988ef3591'
      data.lineNo = ['1', '2']
      data.lineId = ['1', '2']
      journalizeInvoiceFindAllSpy.mockReturnValueOnce([])
      const result = await inboxController.insertAndUpdateJournalizeInvoice(contractId, invoiceId, data)
      expect(result.status).toBe(0)
    })

    test('正常：明細が１個の時、勘定科目のみ操作し「登録」ボタンを押す', async () => {
      const invoiceId = '3064665f-a90a-5f2e-a9e1-d59988ef3591'
      data.lineNo = '1'
      data.lineNo1_lineAccountCode1_accountCode = 'AB001'
      const ab001 = new AccountCode()
      ab001.accountCodeId = accountCodeMock[0].accountCodeId
      ab001.contractId = accountCodeMock[0].contractId
      ab001.accountCodeName = accountCodeMock[0].accountCodeName
      ab001.accountCode = accountCodeMock[0].accountCode
      ab001.createdAt = accountCodeMock[0].createdAt
      ab001.updatedAt = accountCodeMock[0].updatedAt
      accountCodeFindOneSpy.mockReturnValueOnce(ab001)
      accountCodeFindAllSpy.mockReturnValueOnce([])
      journalizeInvoiceFindAllSpy.mockReturnValueOnce([])
      const result = await inboxController.insertAndUpdateJournalizeInvoice(contractId, invoiceId, data)
      expect(result.status).toBe(0)
    })

    test('正常：明細が１個の時、勘定科目のみ操作し「登録」ボタンを押す、勘定科目がない場合', async () => {
      const invoiceId = '3064665f-a90a-5f2e-a9e1-d59988ef3591'
      data.lineNo = ['1', '2']
      data.lineNo1_lineAccountCode1_accountCode = 'AB001'
      accountCodeFindOneSpy.mockReturnValueOnce(null)
      journalizeInvoiceFindAllSpy.mockReturnValueOnce([])
      const result = await inboxController.insertAndUpdateJournalizeInvoice(contractId, invoiceId, data)
      expect(result.status).toBe(-1)
    })

    test('正常：明細が１個の時、勘定科目と補助科目操作し「登録」ボタンを押す、補助科目ない場合', async () => {
      const invoiceId = '3064665f-a90a-5f2e-a9e1-d59988ef3591'
      data.lineNo = '1'
      data.lineNo1_lineAccountCode1_accountCode = 'AB001'
      data.lineNo1_lineAccountCode1_subAccountCode = 'AB001001'
      const ab001 = new AccountCode()
      ab001.accountCodeId = accountCodeMock[0].accountCodeId
      ab001.contractId = accountCodeMock[0].contractId
      ab001.accountCodeName = accountCodeMock[0].accountCodeName
      ab001.accountCode = accountCodeMock[0].accountCode
      ab001.createdAt = accountCodeMock[0].createdAt
      ab001.updatedAt = accountCodeMock[0].updatedAt
      accountCodeFindOneSpy.mockReturnValueOnce(ab001)
      accountCodeFindAllSpy.mockReturnValueOnce([])
      journalizeInvoiceFindAllSpy.mockReturnValueOnce([])
      const result = await inboxController.insertAndUpdateJournalizeInvoice(contractId, invoiceId, data)
      expect(result.status).toBe(-2)
    })

    test('正常：明細が１個の時、勘定科目と補助科目操作し「登録」ボタンを押す、DBにはデータがない場合', async () => {
      const invoiceId = '3064665f-a90a-5f2e-a9e1-d59988ef3591'
      data.lineNo = '1'
      data.lineNo1_lineAccountCode1_accountCode = 'AB001'
      data.lineNo1_lineAccountCode1_subAccountCode = 'AB001001'
      const ab001 = new AccountCode()
      ab001.accountCodeId = accountCodeMock[0].accountCodeId
      ab001.contractId = accountCodeMock[0].contractId
      ab001.accountCodeName = accountCodeMock[0].accountCodeName
      ab001.accountCode = accountCodeMock[0].accountCode
      ab001.createdAt = accountCodeMock[0].createdAt
      ab001.updatedAt = accountCodeMock[0].updatedAt
      const suut = new SubAccountCode()
      suut.subAccountCodeId = subAccountCodeMock[0].subAccountCodeId
      suut.accountCodeId = subAccountCodeMock[0].accountCodeId
      suut.subjectName = subAccountCodeMock[0].subjectName
      suut.subjectCode = subAccountCodeMock[0].subjectCode
      suut.createdAt = subAccountCodeMock[0].createdAt
      suut.updatedAt = subAccountCodeMock[0].updatedAt
      accountCodeFindOneSpy.mockReturnValueOnce(ab001)
      accountCodeFindAllSpy.mockReturnValueOnce([suut])
      accountCodeFindAllSpy.mockReturnValueOnce([suut])
      journalizeInvoiceFindAllSpy.mockReturnValueOnce([])
      const result = await inboxController.insertAndUpdateJournalizeInvoice(contractId, invoiceId, data)
      expect(result.status).toBe(0)
    })

    test('正常：明細が１個の時、勘定科目と補助科目操作し「登録」ボタンを押す、データ変更', async () => {
      const invoiceId = '3064665f-a90a-5f2e-a9e1-d59988ef3591'
      data.lineNo = '1'
      data.lineNo1_lineAccountCode1_accountCode = 'AB001'
      data.lineNo1_lineAccountCode1_subAccountCode = 'AB001001'
      const ab001 = new AccountCode()
      ab001.accountCodeId = accountCodeMock[0].accountCodeId
      ab001.contractId = accountCodeMock[0].contractId
      ab001.accountCodeName = accountCodeMock[0].accountCodeName
      ab001.accountCode = accountCodeMock[0].accountCode
      ab001.createdAt = accountCodeMock[0].createdAt
      ab001.updatedAt = accountCodeMock[0].updatedAt
      const suut = new SubAccountCode()
      suut.subAccountCodeId = subAccountCodeMock[0].subAccountCodeId
      suut.accountCodeId = subAccountCodeMock[0].accountCodeId
      suut.subjectName = subAccountCodeMock[0].subjectName
      suut.subjectCode = subAccountCodeMock[0].subjectCode
      suut.createdAt = subAccountCodeMock[0].createdAt
      suut.updatedAt = subAccountCodeMock[0].updatedAt
      const date = new Date()
      const dbJournal = JournalizeInvoice.build({
        journalId: '7a7cb163-421e-4c6a-affb-88a481b335fe',
        contractId: '9fdd2a54-ea5c-45a4-8bbe-3a2e5299e8f9',
        invoiceId: invoiceId,
        lineNo: 1,
        journalNo: 'lineAccountCode1',
        accountCode: ab001.accountCode,
        subAccountCode: suut.subjectCode,
        departmentCode: null,
        installmentAmount: 1000000.0,
        createdAt: date,
        updatedAt: date
      })
      accountCodeFindOneSpy.mockReturnValueOnce(ab001)
      journalizeInvoiceFindAllSpy.mockReturnValueOnce([dbJournal])
      accountCodeFindAllSpy.mockReturnValueOnce([suut])

      const result = await inboxController.insertAndUpdateJournalizeInvoice(contractId, invoiceId, data)
      expect(result.status).toBe(0)
    })

    test('正常：明細が１個の時、勘定科目と補助科目操作し「登録」ボタンを押す、データ削除', async () => {
      const invoiceId = '3064665f-a90a-5f2e-a9e1-d59988ef3591'
      data.lineNo = '1'
      data.lineNo1_lineAccountCode1_accountCode = 'AB001'
      data.lineNo1_lineAccountCode1_subAccountCode = 'AB001001'
      const ab001 = new AccountCode()
      ab001.accountCodeId = accountCodeMock[0].accountCodeId
      ab001.contractId = accountCodeMock[0].contractId
      ab001.accountCodeName = accountCodeMock[0].accountCodeName
      ab001.accountCode = accountCodeMock[0].accountCode
      ab001.createdAt = accountCodeMock[0].createdAt
      ab001.updatedAt = accountCodeMock[0].updatedAt
      const suut = new SubAccountCode()
      suut.subAccountCodeId = subAccountCodeMock[0].subAccountCodeId
      suut.accountCodeId = subAccountCodeMock[0].accountCodeId
      suut.subjectName = subAccountCodeMock[0].subjectName
      suut.subjectCode = subAccountCodeMock[0].subjectCode
      suut.createdAt = subAccountCodeMock[0].createdAt
      suut.updatedAt = subAccountCodeMock[0].updatedAt
      const date = new Date()
      const dbJournal = JournalizeInvoice.build({
        journalId: '7a7cb163-421e-4c6a-affb-88a481b335fe',
        contractId: '9fdd2a54-ea5c-45a4-8bbe-3a2e5299e8f9',
        invoiceId: invoiceId,
        lineNo: 1,
        journalNo: 'lineAccountCode2',
        accountCode: ab001.accountCode,
        subAccountCode: suut.subjectCode,
        departmentCode: null,
        installmentAmount: 1000000.0,
        createdAt: date,
        updatedAt: date
      })
      accountCodeFindOneSpy.mockReturnValueOnce(ab001)
      journalizeInvoiceFindAllSpy.mockReturnValueOnce([dbJournal])
      accountCodeFindAllSpy.mockReturnValueOnce([suut])

      const result = await inboxController.insertAndUpdateJournalizeInvoice(contractId, invoiceId, data)
      expect(result.status).toBe(0)
    })

    test('正常：明細が１個の時、勘定科目と補助科目操作し「登録」ボタンを押す、DBエラー', async () => {
      const invoiceId = '3064665f-a90a-5f2e-a9e1-d59988ef3591'
      data.lineNo = '1'
      data.lineNo1_lineAccountCode1_accountCode = 'AB001'
      data.lineNo1_lineAccountCode1_subAccountCode = 'AB001001'
      const ab001 = new AccountCode()
      ab001.accountCodeId = accountCodeMock[0].accountCodeId
      ab001.contractId = accountCodeMock[0].contractId
      ab001.accountCodeName = accountCodeMock[0].accountCodeName
      ab001.accountCode = accountCodeMock[0].accountCode
      ab001.createdAt = accountCodeMock[0].createdAt
      ab001.updatedAt = accountCodeMock[0].updatedAt
      const suut = new SubAccountCode()
      suut.subAccountCodeId = subAccountCodeMock[0].subAccountCodeId
      suut.accountCodeId = subAccountCodeMock[0].accountCodeId
      suut.subjectName = subAccountCodeMock[0].subjectName
      suut.subjectCode = subAccountCodeMock[0].subjectCode
      suut.createdAt = subAccountCodeMock[0].createdAt
      suut.updatedAt = subAccountCodeMock[0].updatedAt
      const date = new Date()
      const dbJournal = JournalizeInvoice.build({
        journalId: '7a7cb163-421e-4c6a-affb-88a481b335fe',
        contractId: '9fdd2a54-ea5c-45a4-8bbe-3a2e5299e8f9',
        invoiceId: invoiceId,
        lineNo: 1,
        journalNo: 'lineAccountCode2',
        accountCode: ab001.accountCode,
        subAccountCode: suut.subjectCode,
        departmentCode: null,
        installmentAmount: 1000000.0,
        createdAt: date,
        updatedAt: date
      })
      const dbError = new Error('DB Conncetion Error')
      accountCodeFindOneSpy.mockImplementation(() => {
        throw dbError
      })
      journalizeInvoiceFindAllSpy.mockReturnValueOnce([dbJournal])
      accountCodeFindAllSpy.mockReturnValueOnce([suut])

      const result = await inboxController.insertAndUpdateJournalizeInvoice(contractId, invoiceId, data)
      expect(result.error).toBe(dbError)
    })
  })
})
