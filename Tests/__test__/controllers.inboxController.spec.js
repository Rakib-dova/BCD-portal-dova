'use strict'
jest.mock('../../Application/models')
jest.mock('../../Application/lib/logger')
jest.mock('../../Application/DAO/RequestApprovalDAO')
jest.mock('../../Application/DTO/TradeshiftDTO')
jest.mock('../../Application/DAO/ApprovalDAO')

const inboxController = require('../../Application/controllers/inboxController')
const apiManager = require('../../Application/controllers/apiManager.js')
const logger = require('../../Application/lib/logger')
const constantsDefine = require('../../Application/constants')
const InvoiceDetailObj = require('../../Application/lib/invoiceDetail')
const AccountCode = require('../../Application/models').AccountCode
const SubAccountCode = require('../../Application/models').SubAccountCode
const DepartmentCode = require('../../Application/models').DepartmentCode
const JournalizeInvoice = require('../../Application/models').JournalizeInvoice
const RequestApproval = require('../../Application/models').RequestApproval
const Approval = require('../../Application/models').Approval
const RequestApprovalDAO = require('../../Application/DAO/RequestApprovalDAO')
const TradeshiftDTO = require('../../Application/DTO/TradeshiftDTO')
const ApprovalDAO = require('../../Application/DAO/ApprovalDAO')
const timeStamp = require('../../Application/lib/utils').timestampForList
const processStatus = {
  PAID_CONFIRMED: 0, // 入金確認済み
  PAID_UNCONFIRMED: 1, // 送金済み
  ACCEPTED: 2, // 受理済み
  DELIVERED: 3 // 受信済み
}

const modelsBuilder = function (modelName) {
  return function (values) {
    const models = require('../../Application/models')
    const keys = Object.keys(values)
    const modes = new models[modelName]()
    keys.forEach((key) => {
      modes[key] = values[key]
    })
    return modes
  }
}

const getWorkflowStatusCode = (name) => {
  switch (name) {
    case '最終承認済み':
      return '00'
    case '差し戻し':
      return '90'
    case '未処理':
      return '80'
  }
}

const accountCodeMock = require('../mockDB/AccountCode_Table')
const subAccountCodeMock = require('../mockDB/SubAccountCode_Table')
const departmentCodeMock = require('../mockDB/DepartmentCode_Table')

// JournalFindAll結果
const dbAllJournal = [
  {
    journalId: '3ad79a8c-44e7-45a2-8df3-a362aece83bd',
    contractId: 'd4ab57d5-55ac-4329-ad60-c56ab482d22a',
    invoiceId: '87344782-c2ad-5ff4-9c92-c3be2323b538',
    lineNo: 2,
    lineId: '2',
    accountCode: 'PBI3165AC0',
    subAccountCode: 'PBI3165SU1',
    departmentCode: null,
    installmentAmount: 1000,
    createdAt: new Date('2022-01-31T04:30:00.000Z'),
    updatedAt: new Date('2021-01-31T04:30:00.000Z'),
    journalNo: 'lineAccountCode1'
  },
  {
    journalId: '3ad79a8c-44e7-45a2-8df3-a362aece83bd',
    contractId: 'd4ab57d5-55ac-4329-ad60-c56ab482d22a',
    invoiceId: '87344782-c2ad-5ff4-9c92-c3be2323b538',
    lineNo: 2,
    lineId: '2',
    accountCode: 'PBI3165AC0',
    subAccountCode: 'PBI3165SU2',
    departmentCode: null,
    installmentAmount: 1000,
    createdAt: new Date('2022-01-31T04:30:00.000Z'),
    updatedAt: new Date('2021-01-31T04:30:00.000Z'),
    journalNo: 'lineAccountCode2'
  }
]

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

const managerInfoResult = {
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

const noNameManagerInfoResult = {
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

const freeManagerInfoResult = {
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

const noManagerInfoResult = {
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

const userInfo = {
  Id: '27f7188b-f6c7-4b5e-9826-96052bba495c',
  Person: { LastName: 'UT', FirstName: 'テスト' },
  CompanyAccountId: 'f783be0e-e716-4eab-a7ec-5ce36b3c7b31',
  UserName: 'abc@test.co.jp',
  Credentials: [],
  State: 'ACTIVE',
  Language: 'ja',
  Kind: 'PERSON',
  LastLogin: 1657590818711,
  TimeZone: 'Asia/Tokyo',
  Visible: false,
  CompanyAccountIdModifyDate: '2021-06-01T08:49:08.410Z'
}

const noNameUserInfo = {
  Id: '27f7188b-f6c7-4b5e-9826-96052bba495c',
  Person: { LastName: ' ', FirstName: ' ' },
  CompanyAccountId: 'f783be0e-e716-4eab-a7ec-5ce36b3c7b31',
  UserName: 'abc@test.co.jp',
  Credentials: [],
  State: 'ACTIVE',
  Language: 'ja',
  Kind: 'PERSON',
  LastLogin: 1657590818711,
  TimeZone: 'Asia/Tokyo',
  Visible: false,
  CompanyAccountIdModifyDate: '2021-06-01T08:49:08.410Z'
}

const accessToken = 'dummyAccessToken'
const refreshToken = 'dummyRefreshToken'
const pageId = 1
const tenantId = '15e2d952-8ba0-42a4-8582-b234cb4a2089'
const contractId = 'f10b95a4-74a1-4691-880a-827c9f1a1faf'

let accessTradeshiftSpy,
  errorSpy,
  warnSpy,
  journalizeInvoiceFindAllSpy,
  accountCodeFindOneSpy,
  accountCodeFindAllSpy,
  subAccountCodeFindOneSpy,
  journalizeInvoiceCreateSpy,
  departmentCodeFindOneSpy,
  departmentCodeFindAllSpy,
  requestApprovalFindOneSpy,
  requestApprovalDTOgetWaitingWorkflowisMineSpy,
  requestApprovalDAOGetAllRequestApproval,
  tradeshiftDTOFindDocuments,
  approvalDAOGetWaitingApprovals,
  requestApprovalFindAll,
  tradeshiftDTOGetDocuments,
  tradeshiftDTOGetDocument,
  tradeshiftDTOGetDocumentSearch,
  tradeshiftDTOCreateTags,
  requestApprovalFindOne

describe('inboxControllerのテスト', () => {
  beforeEach(() => {
    accessTradeshiftSpy = jest.spyOn(apiManager, 'accessTradeshift')
    journalizeInvoiceFindAllSpy = jest.spyOn(JournalizeInvoice, 'findAll')
    errorSpy = jest.spyOn(logger, 'error')
    warnSpy = jest.spyOn(logger, 'warn')
    accountCodeFindOneSpy = jest.spyOn(AccountCode, 'findOne')
    accountCodeFindAllSpy = jest.spyOn(AccountCode, 'findAll')
    subAccountCodeFindOneSpy = jest.spyOn(SubAccountCode, 'findOne')
    departmentCodeFindOneSpy = jest.spyOn(DepartmentCode, 'findOne')
    departmentCodeFindAllSpy = jest.spyOn(DepartmentCode, 'findAll')
    journalizeInvoiceCreateSpy = jest.spyOn(JournalizeInvoice, 'create')
    JournalizeInvoice.build = jest.fn(modelsBuilder('JournalizeInvoice'))
    JournalizeInvoice.save = jest.fn(async function () {})
    JournalizeInvoice.destory = jest.fn(async function () {})
    JournalizeInvoice.set = jest.fn(function () {})
    requestApprovalFindOneSpy = jest.spyOn(RequestApproval, 'findOne')
    requestApprovalDTOgetWaitingWorkflowisMineSpy = jest.fn(async function () {})
    requestApprovalDAOGetAllRequestApproval = jest.spyOn(RequestApprovalDAO.prototype, 'getAllRequestApproval')
    tradeshiftDTOFindDocuments = jest.spyOn(TradeshiftDTO.prototype, 'findDocuments')
    approvalDAOGetWaitingApprovals = jest.spyOn(ApprovalDAO.prototype, 'getWaitingApprovals')
    RequestApproval.build = jest.fn(modelsBuilder('RequestApproval'))
    RequestApproval.prototype.getWorkflowStatusCode = jest.fn(getWorkflowStatusCode)
    requestApprovalFindAll = jest.fn(Approval, 'findAll')
    Approval.build = jest.fn(modelsBuilder('Approval'))
    tradeshiftDTOGetDocuments = jest.spyOn(TradeshiftDTO.prototype, 'getDocuments')
    tradeshiftDTOGetDocument = jest.spyOn(TradeshiftDTO.prototype, 'getDocument')
    tradeshiftDTOGetDocumentSearch = jest.spyOn(TradeshiftDTO.prototype, 'getDocumentSearch')
    tradeshiftDTOCreateTags = jest.spyOn(TradeshiftDTO.prototype, 'createTags')
    requestApprovalFindOne = jest.spyOn(RequestApproval, 'findOne')
  })
  afterEach(() => {
    accessTradeshiftSpy.mockRestore()
    errorSpy.mockRestore()
    warnSpy.mockRestore()
    subAccountCodeFindOneSpy.mockRestore()
    journalizeInvoiceFindAllSpy.mockRestore()
    accountCodeFindOneSpy.mockRestore()
    accountCodeFindAllSpy.mockRestore()
    journalizeInvoiceCreateSpy.mockRestore()
    departmentCodeFindOneSpy.mockRestore()
    departmentCodeFindAllSpy.mockRestore()
    requestApprovalFindOneSpy.mockRestore()
    requestApprovalDTOgetWaitingWorkflowisMineSpy.mockRestore()
    requestApprovalDAOGetAllRequestApproval.mockRestore()
    requestApprovalDAOGetAllRequestApproval.mockRestore()
    tradeshiftDTOFindDocuments.mockRestore()
    approvalDAOGetWaitingApprovals.mockRestore()
    requestApprovalFindAll.mockRestore()
    tradeshiftDTOGetDocuments.mockRestore()
    tradeshiftDTOGetDocument.mockRestore()
    tradeshiftDTOGetDocumentSearch.mockRestore()
    tradeshiftDTOCreateTags.mockRestore()
    requestApprovalFindOne.mockRestore()
  })

  describe('getInbox', () => {
    test('正常：担当者アドレスがある場合（無償）', async () => {
      // 準備
      // APIからの正常情報の取得を想定する
      tradeshiftDTOGetDocuments.mockReturnValue(searchResult1)
      const resultGetDocument = require('../mockInvoice/invoice1')
      tradeshiftDTOGetDocument.mockReturnValue(resultGetDocument)
      const presentation = 'inboxList'

      // 試験実施
      const result = await inboxController.getInbox(accessToken, refreshToken, pageId, tenantId, presentation)

      // 期待結果
      // 想定した契約情報がReturnされていること
      expect(result).toEqual(freeManagerInfoResult)
    })

    test('正常：担当者アドレスがない場合（無償）', async () => {
      // 準備
      // APIからの正常情報の取得を想定する
      tradeshiftDTOGetDocuments.mockReturnValue(searchResult1)
      const resultGetDocument = require('../mockInvoice/invoice2')
      tradeshiftDTOGetDocument.mockReturnValue(resultGetDocument)
      const presentation = 'inboxList'

      // 試験実施
      const result = await inboxController.getInbox(accessToken, refreshToken, pageId, tenantId, presentation)

      // 期待結果
      // 想定した契約情報がReturnされていること
      expect(result).toEqual(noManagerInfoResult)
    })

    test('正常：担当者アドレスがある場合、ユーザー情報あり（有償）', async () => {
      // 準備
      // APIからの正常情報の取得を想定する
      tradeshiftDTOGetDocuments.mockReturnValue(searchResult1)
      const resultGetDocument = require('../mockInvoice/invoice1')
      tradeshiftDTOGetDocument.mockReturnValue(resultGetDocument)
      accessTradeshiftSpy.mockReturnValue(userInfo)
      const presentation = 'inboxList_light_plan'

      // 試験実施
      const result = await inboxController.getInbox(accessToken, refreshToken, pageId, tenantId, presentation)

      // 期待結果
      // 想定した契約情報がReturnされていること
      expect(result).toEqual(managerInfoResult)
    })

    test('正常：担当者アドレスがある場合、ユーザー情報あり：名前なし（有償）', async () => {
      // 準備
      // APIからの正常情報の取得を想定する
      tradeshiftDTOGetDocuments.mockReturnValue(searchResult1)
      const resultGetDocument = require('../mockInvoice/invoice1')
      tradeshiftDTOGetDocument.mockReturnValue(resultGetDocument)
      accessTradeshiftSpy.mockReturnValue(noNameUserInfo)
      const presentation = 'inboxList_light_plan'

      // 試験実施
      const result = await inboxController.getInbox(accessToken, refreshToken, pageId, tenantId, presentation)

      // 期待結果
      // 想定した契約情報がReturnされていること
      expect(result).toEqual(noNameManagerInfoResult)
    })

    test('正常：担当者アドレスがある場合、ユーザー情報なし（有償）', async () => {
      // 準備
      // APIからの正常情報の取得を想定する
      tradeshiftDTOGetDocuments.mockReturnValue(searchResult1)
      const resultGetDocument = require('../mockInvoice/invoice1')
      tradeshiftDTOGetDocument.mockReturnValue(resultGetDocument)
      const noUser = new Error()
      accessTradeshiftSpy.mockReturnValue(noUser)
      const presentation = 'inboxList_light_plan'

      // 試験実施
      const result = await inboxController.getInbox(accessToken, refreshToken, pageId, tenantId, presentation)

      // 期待結果
      // 想定した契約情報がReturnされていること
      expect(result).toEqual(freeManagerInfoResult)
    })

    test('正常：文書をリスト化する時値がない場合', async () => {
      // 準備
      // APIからの正常情報の取得を想定する
      tradeshiftDTOGetDocuments.mockReturnValue(searchResult3)
      const resultGetDocument = require('../mockInvoice/invoice2')
      tradeshiftDTOGetDocument.mockReturnValue(resultGetDocument)
      const presentation = 'inboxList'

      // 試験実施
      const result = await inboxController.getInbox(accessToken, refreshToken, pageId, tenantId, presentation)
      // 期待結果
      expect(result).toEqual(result3)
    })

    test('正常：更新日がない場合、期限日で整列', async () => {
      // 準備
      // APIからの正常情報の取得を想定する
      tradeshiftDTOGetDocuments.mockReturnValue(searchResult4)
      const resultGetDocument = require('../mockInvoice/invoice2')
      tradeshiftDTOGetDocument.mockReturnValue(resultGetDocument)
      const presentation = 'inboxList'

      // 試験実施
      const result = await inboxController.getInbox(accessToken, refreshToken, pageId, tenantId, presentation)
      // 期待結果
      expect(result).toEqual(result4)
    })

    test('異常: アクセストークンの有効期限が終わるの場合の場合', async () => {
      // 準備
      // APIからの正常情報の取得を想定する
      tradeshiftDTOGetDocuments.mockReturnValue(searchResult2)
      const resultGetDocument = require('../mockInvoice/invoice2')
      tradeshiftDTOGetDocument.mockReturnValue(resultGetDocument)
      const presentation = 'inboxList'

      // 試験実施
      const result = await inboxController.getInbox(accessToken, refreshToken, pageId, tenantId, presentation)
      // 期待結果
      expect(result).toEqual(result0)
    })

    test('異常：GetDocumentAPIエラー(500)が発生した場合', async () => {
      // 準備
      // APIからの正常情報の取得を想定する
      tradeshiftDTOGetDocuments.mockReturnValue(searchResult1)
      const apiError = new Error('API ERROR')
      apiError.status = 500
      tradeshiftDTOGetDocument.mockReturnValue(apiError)
      const presentation = 'inboxList_light_plan'

      // 試験実施
      const result = await inboxController.getInbox(accessToken, refreshToken, pageId, tenantId, presentation)

      // 期待結果
      // 想定した契約情報がReturnされていること
      expect(result).toEqual(noManagerInfoResult)
    })
  })

  describe('getInvoiceDetail', () => {
    test('正常', async () => {
      const dummyData = require('../mockInvoice/invoice32')
      accessTradeshiftSpy.mockReturnValue(dummyData)
      journalizeInvoiceFindAllSpy.mockReturnValue(dbAllJournal)
      const resultDummyData = new InvoiceDetailObj(dummyData, dbAllJournal)
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
    const dummyToken = 'testCsrfToken'
    const data = {
      lineNo: 1,
      _csrf: dummyToken,
      lineNo1_lineAccountCode1_accountCode: '',
      lineNo1_lineAccountCode1_subAccountCode: '',
      lineNo1_lineAccountCode1_departmentCode: '',
      lineNo1_lineCreditAccountCode1_creditAccountCode: '',
      lineNo1_lineCreditAccountCode1_creditSubAccountCode: '',
      lineNo1_lineCreditAccountCode1_creditDepartmentCode: '',
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

    test('正常：明細が１個の時、勘定科目のみ操作し「登録」ボタンを押す（借方）', async () => {
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

    test('正常：明細が１個の時、勘定科目のみ操作し「登録」ボタンを押す、勘定科目がない場合（借方）', async () => {
      const invoiceId = '3064665f-a90a-5f2e-a9e1-d59988ef3591'
      data.lineNo = '1'
      data.lineNo1_lineAccountCode1_accountCode = 'AB001'
      accountCodeFindOneSpy.mockReturnValueOnce(null)
      journalizeInvoiceFindAllSpy.mockReturnValueOnce([])
      const result = await inboxController.insertAndUpdateJournalizeInvoice(contractId, invoiceId, data)
      expect(result.status).toBe(-1)
    })

    test('正常：明細が１個の時、勘定科目のみ操作し「登録」ボタンを押す（貸方）', async () => {
      const invoiceId = '3064665f-a90a-5f2e-a9e1-d59988ef3591'
      data.lineNo = '1'
      data.lineNo1_lineAccountCode1_accountCode = ''
      data.lineNo1_lineCreditAccountCode1_creditAccountCode = 'AB001'
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

    test('正常：明細が１個の時、勘定科目のみ操作し「登録」ボタンを押す、勘定科目がない場合（貸方）', async () => {
      const invoiceId = '3064665f-a90a-5f2e-a9e1-d59988ef3591'
      data.lineNo = '1'
      data.lineNo1_lineCreditAccountCode1_creditAccountCode = 'AB001'
      accountCodeFindOneSpy.mockReturnValueOnce(null)
      journalizeInvoiceFindAllSpy.mockReturnValueOnce([])
      const result = await inboxController.insertAndUpdateJournalizeInvoice(contractId, invoiceId, data)
      expect(result.status).toBe(-1)
    })

    test('正常：明細が１個の時、勘定科目と補助科目操作し「登録」ボタンを押す（借方）', async () => {
      const invoiceId = '3064665f-a90a-5f2e-a9e1-d59988ef3591'
      data.lineNo = '1'
      data.lineNo1_lineAccountCode1_accountCode = 'AB001'
      data.lineNo1_lineAccountCode1_subAccountCode = 'AB001001'
      data.lineNo1_lineAccountCode1_departmentCode = ''
      data.lineNo1_lineCreditAccountCode1_creditAccountCode = ''
      data.lineNo1_lineCreditAccountCode1_creditSubAccountCode = ''
      data.lineNo1_lineCreditAccountCode1_creditDepartmentCode = ''
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

    test('正常：明細が１個の時、勘定科目と補助科目操作し「登録」ボタンを押す（貸方）', async () => {
      const invoiceId = '3064665f-a90a-5f2e-a9e1-d59988ef3591'
      data.lineNo = '1'
      data.lineNo1_lineAccountCode1_accountCode = ''
      data.lineNo1_lineAccountCode1_subAccountCode = ''
      data.lineNo1_lineAccountCode1_departmentCode = ''
      data.lineNo1_lineCreditAccountCode1_creditAccountCode = 'AB001'
      data.lineNo1_lineCreditAccountCode1_creditSubAccountCode = 'AB001001'
      data.lineNo1_lineCreditAccountCode1_creditDepartmentCode = ''
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

    test('正常：明細が１個の時、勘定科目と補助科目操作し「登録」ボタンを押す、補助科目ない場合（借方）', async () => {
      const invoiceId = '3064665f-a90a-5f2e-a9e1-d59988ef3591'
      data.lineNo = '1'
      data.lineNo1_lineAccountCode1_accountCode = 'AB001'
      data.lineNo1_lineAccountCode1_subAccountCode = 'AB001001'
      data.lineNo1_lineCreditAccountCode1_creditAccountCode = ''
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

    test('正常：明細が１個の時、勘定科目と補助科目操作し「登録」ボタンを押す、補助科目ない場合（貸方）', async () => {
      const invoiceId = '3064665f-a90a-5f2e-a9e1-d59988ef3591'
      data.lineNo = '1'
      data.lineNo1_lineAccountCode1_accountCode = ''
      data.lineNo1_lineAccountCode1_subAccountCode = ''
      data.lineNo1_lineAccountCode1_departmentCode = ''
      data.lineNo1_lineCreditAccountCode1_creditAccountCode = 'AB001'
      data.lineNo1_lineCreditAccountCode1_creditSubAccountCode = 'AB001001'
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

    test('正常：明細が１個の時、勘定科目と部門データ操作し「登録」ボタンを押す（借方）', async () => {
      const invoiceId = '3064665f-a90a-5f2e-a9e1-d59988ef3591'
      data.lineNo = '1'
      data.lineNo1_lineAccountCode1_accountCode = 'AB001'
      data.lineNo1_lineAccountCode1_subAccountCode = ''
      data.lineNo1_lineAccountCode1_departmentCode = 'DE001'
      data.lineNo1_lineCreditAccountCode1_creditAccountCode = ''
      data.lineNo1_lineCreditAccountCode1_creditSubAccountCode = ''
      data.lineNo1_lineCreditAccountCode1_creditDepartmentCode = ''
      const ab001 = new AccountCode()
      ab001.accountCodeId = accountCodeMock[0].accountCodeId
      ab001.contractId = accountCodeMock[0].contractId
      ab001.accountCodeName = accountCodeMock[0].accountCodeName
      ab001.accountCode = accountCodeMock[0].accountCode
      ab001.createdAt = accountCodeMock[0].createdAt
      ab001.updatedAt = accountCodeMock[0].updatedAt
      const de001 = new DepartmentCode()
      de001.departmentCodeId = departmentCodeMock[0].departmentCodeId
      de001.contractId = departmentCodeMock[0].contractId
      de001.departmentCodeName = departmentCodeMock[0].departmentCodeName
      de001.departmentCode = departmentCodeMock[0].departmentCode
      de001.createdAt = departmentCodeMock[0].createdAt
      de001.updatedAt = departmentCodeMock[0].updatedAt
      accountCodeFindOneSpy.mockReturnValueOnce(ab001)
      journalizeInvoiceFindAllSpy.mockReturnValueOnce([])
      departmentCodeFindOneSpy.mockReturnValueOnce(de001)
      const result = await inboxController.insertAndUpdateJournalizeInvoice(contractId, invoiceId, data)
      expect(result.status).toBe(0)
    })

    test('正常：明細が１個の時、勘定科目と部門データ操作し「登録」ボタンを押す、部門データない場合（借方）', async () => {
      const invoiceId = '3064665f-a90a-5f2e-a9e1-d59988ef3591'
      data.lineNo = '1'
      data.lineNo1_lineAccountCode1_accountCode = 'AB001'
      data.lineNo1_lineAccountCode1_subAccountCode = ''
      data.lineNo1_lineAccountCode1_departmentCode = 'DE001'
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
      departmentCodeFindOneSpy.mockReturnValueOnce([])
      const result = await inboxController.insertAndUpdateJournalizeInvoice(contractId, invoiceId, data)
      expect(result.status).toBe(-3)
    })

    test('正常：明細が１個の時、勘定科目と部門データ操作し「登録」ボタンを押す（貸方）', async () => {
      const invoiceId = '3064665f-a90a-5f2e-a9e1-d59988ef3591'
      data.lineNo = '1'
      data.lineNo1_lineAccountCode1_accountCode = ''
      data.lineNo1_lineAccountCode1_subAccountCode = ''
      data.lineNo1_lineAccountCode1_departmentCode = ''
      data.lineNo1_lineCreditAccountCode1_creditAccountCode = 'AB001'
      data.lineNo1_lineCreditAccountCode1_creditSubAccountCode = ''
      data.lineNo1_lineCreditAccountCode1_creditDepartmentCode = 'DE001'
      const ab001 = new AccountCode()
      ab001.accountCodeId = accountCodeMock[0].accountCodeId
      ab001.contractId = accountCodeMock[0].contractId
      ab001.accountCodeName = accountCodeMock[0].accountCodeName
      ab001.accountCode = accountCodeMock[0].accountCode
      ab001.createdAt = accountCodeMock[0].createdAt
      ab001.updatedAt = accountCodeMock[0].updatedAt
      const de001 = new DepartmentCode()
      de001.departmentCodeId = departmentCodeMock[0].departmentCodeId
      de001.contractId = departmentCodeMock[0].contractId
      de001.departmentCodeName = departmentCodeMock[0].departmentCodeName
      de001.departmentCode = departmentCodeMock[0].departmentCode
      de001.createdAt = departmentCodeMock[0].createdAt
      de001.updatedAt = departmentCodeMock[0].updatedAt
      accountCodeFindOneSpy.mockReturnValueOnce(ab001)
      accountCodeFindAllSpy.mockReturnValueOnce([])
      journalizeInvoiceFindAllSpy.mockReturnValueOnce([])
      departmentCodeFindOneSpy.mockReturnValueOnce(de001)
      const result = await inboxController.insertAndUpdateJournalizeInvoice(contractId, invoiceId, data)
      expect(result.status).toBe(0)
    })

    test('正常：明細が１個の時、勘定科目と部門データ操作し「登録」ボタンを押す、部門データない場合（貸方）', async () => {
      const invoiceId = '3064665f-a90a-5f2e-a9e1-d59988ef3591'
      data.lineNo = '1'
      data.lineNo1_lineAccountCode1_accountCode = ''
      data.lineNo1_lineAccountCode1_subAccountCode = ''
      data.lineNo1_lineAccountCode1_departmentCode = ''
      data.lineNo1_lineCreditAccountCode1_creditAccountCode = 'AB001'
      data.lineNo1_lineCreditAccountCode1_creditSubAccountCode = ''
      data.lineNo1_lineCreditAccountCode1_creditDepartmentCode = 'DE001'
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
      departmentCodeFindOneSpy.mockReturnValueOnce([])
      const result = await inboxController.insertAndUpdateJournalizeInvoice(contractId, invoiceId, data)
      expect(result.status).toBe(-3)
    })

    test('正常：明細が１個の時、勘定科目と補助科目操作し「登録」ボタンを押す、データ変更（借方）', async () => {
      const invoiceId = '3064665f-a90a-5f2e-a9e1-d59988ef3591'
      data.lineNo = '1'
      data.lineNo1_lineAccountCode1_accountCode = 'AB001'
      data.lineNo1_lineAccountCode1_subAccountCode = 'AB001001'
      data.lineNo1_lineCreditAccountCode1_creditAccountCode = ''
      data.lineNo1_lineCreditAccountCode1_creditSubAccountCode = ''
      data.lineNo1_lineCreditAccountCode1_creditDepartmentCode = ''
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

    test('正常：明細が１個の時、勘定科目と補助科目操作し「登録」ボタンを押す、データ変更（貸方）', async () => {
      const invoiceId = '3064665f-a90a-5f2e-a9e1-d59988ef3591'
      data.lineNo = '1'
      data.lineNo1_lineAccountCode1_accountCode = ''
      data.lineNo1_lineAccountCode1_subAccountCode = ''
      data.lineNo1_lineCreditAccountCode1_creditAccountCode = 'AB001'
      data.lineNo1_lineCreditAccountCode1_creditSubAccountCode = 'AB001001'
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

    test('正常：明細が１個の時、勘定科目と補助科目操作し「登録」ボタンを押す、データ削除（借方）', async () => {
      const invoiceId = '3064665f-a90a-5f2e-a9e1-d59988ef3591'
      data.lineNo = '1'
      data.lineNo1_lineAccountCode1_accountCode = 'AB001'
      data.lineNo1_lineAccountCode1_subAccountCode = 'AB001001'
      data.lineNo1_lineCreditAccountCode1_creditAccountCode = ''
      data.lineNo1_lineCreditAccountCode1_creditSubAccountCode = ''
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

    test('正常：明細が１個の時、勘定科目と補助科目操作し「登録」ボタンを押す、データ削除（貸方）', async () => {
      const invoiceId = '3064665f-a90a-5f2e-a9e1-d59988ef3591'
      data.lineNo = '1'
      data.lineNo1_lineAccountCode1_accountCode = ''
      data.lineNo1_lineAccountCode1_subAccountCode = ''
      data.lineNo1_lineCreditAccountCode1_creditAccountCode = 'AB001'
      data.lineNo1_lineCreditAccountCode1_creditSubAccountCode = 'AB001001'
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

    test('正常：明細が２００個の時、１明細あたり仕訳情報1１０個を設定し「登録」ボタンを押す', async () => {
      const invoiceId = '3064665f-a90a-5f2e-a9e1-d59988ef3591'
      const invoiceLines = Array(200)
        .fill()
        .map((v, i) => i + 1)

      const param = { lineNo: invoiceLines, lineId: invoiceLines }

      for (let lines = 1; lines < 201; lines++) {
        for (let idx = 1; idx < 11; idx++) {
          param[`lineNo${lines}_lineAccountCode${idx}_accountCode`] = `A${lines}${idx}`
          param[`lineNo${lines}_lineAccountCode${idx}_subAccountCode`] = `S${lines}${idx}`
          param[`lineNo${lines}_lineAccountCode${idx}_departmentCode`] = `D${lines}${idx}`
          param[`lineNo${lines}_lineCreditAccountCode${idx}_creditAccountCode`] = `CA${lines}${idx}`
          param[`lineNo${lines}_lineCreditAccountCode${idx}_creditSubAccountCode`] = `CS${lines}${idx}`
          param[`lineNo${lines}_lineCreditAccountCode${idx}_creditDepartmentCode`] = `CD${lines}${idx}`
          param[`lineNo${lines}_lineAccountCode${idx}_input_amount`] = '1,000'
        }
      }
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

      const de001 = new DepartmentCode()
      de001.departmentCodeId = departmentCodeMock[0].departmentCodeId
      de001.contractId = departmentCodeMock[0].contractId
      de001.departmentCodeName = departmentCodeMock[0].departmentCodeName
      de001.departmentCode = departmentCodeMock[0].departmentCode
      de001.createdAt = departmentCodeMock[0].createdAt
      de001.updatedAt = departmentCodeMock[0].updatedAt

      accountCodeFindOneSpy.mockImplementation((option) => {
        if (option.where.accountCode !== undefined) {
          return ab001
        }
        if (option.where.departmentCode !== undefined) {
          return de001
        }
        return null
      })
      journalizeInvoiceFindAllSpy.mockReturnValueOnce([])
      departmentCodeFindOneSpy.mockImplementation((option) => {
        if (option.where.departmentCode !== undefined) {
          return de001
        }
        if (option.where.accountCode !== undefined) {
          return ab001
        }
        return null
      })
      accountCodeFindAllSpy.mockReturnValue([suut])

      const result = await inboxController.insertAndUpdateJournalizeInvoice(contractId, invoiceId, param)
      expect(result.status).toBe(0)
    })

    test('正常：明細が１個の時、勘定科目と補助科目操作し「登録」ボタンを押す、DBエラー（借方）', async () => {
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

    test('正常：明細が１個の時、勘定科目と補助科目操作し「登録」ボタンを押す、DBエラー（貸方）', async () => {
      const invoiceId = '3064665f-a90a-5f2e-a9e1-d59988ef3591'
      data.lineNo = '1'
      data.lineNo1_lineAccountCode1_accountCode = ''
      data.lineNo1_lineAccountCode1_subAccountCode = ''
      data.lineNo1_lineCreditAccountCode1_creditAccountCode = 'AB001'
      data.lineNo1_lineCreditAccountCode1_creditSubAccountCode = 'AB001001'
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

  describe('getDepartment', () => {
    test('正常：パラメタが2個ある場合', async () => {
      const departmentCode = departmentCodeMock[0].departmentCode
      const departmentCodeName = departmentCodeMock[0].departmentCodeName
      const expectResult = []
      departmentCodeFindAllSpy.mockReturnValueOnce(expectResult)

      const result = await inboxController.getDepartment(contractId, departmentCode, departmentCodeName)

      expect(JSON.stringify(result, null, 2)).toMatch(JSON.stringify(expectResult, null, 2))
    })

    test('正常：パラメタがない場合', async () => {
      const departmentCode = undefined
      const departmentCodeName = undefined

      const expectResult = [
        {
          status: 0,
          searchResult: [
            {
              code: 'DE003',
              name: 'テスト用部門データ3'
            }
          ]
        }
      ]

      departmentCodeFindAllSpy.mockReturnValueOnce([departmentCodeMock[0]])

      const result = await inboxController.getDepartment(contractId, departmentCode, departmentCodeName)

      expect(JSON.stringify(result, null, 2)).toMatch(JSON.stringify(expectResult[0], null, 2))
    })

    test('正常：パラメタがない場合（複数）', async () => {
      const departmentCode = undefined
      const departmentCodeName = undefined

      const departments = departmentCodeMock.map((department) => {
        return {
          code: department.departmentCode,
          name: department.departmentCodeName
        }
      })

      departments.sort((a, b) => {
        if (a.code > b.code) return 1
        else {
          return -1
        }
      })

      const expectResult = { status: 0, searchResult: departments }

      departmentCodeFindAllSpy.mockReturnValueOnce(departmentCodeMock)

      const result = await inboxController.getDepartment(contractId, departmentCode, departmentCodeName)

      expect(JSON.stringify(result, null, 2)).toMatch(JSON.stringify(expectResult, null, 2))
    })

    test('正常：DBエラー', async () => {
      const departmentCode = departmentCodeMock[0].departmentCode
      const departmentCodeName = departmentCodeMock[0].departmentCodeName

      const dbError = new Error('DB Conncetion Error')
      departmentCodeFindAllSpy.mockImplementation(() => {
        throw dbError
      })

      const result = await inboxController.getDepartment(contractId, departmentCode, departmentCodeName)

      expect(errorSpy).toHaveBeenCalledWith({
        contractId: contractId,
        stack: dbError.stack,
        status: 0
      })
      expect(result).toEqual({ status: -1, searchResult: dbError })
    })
  })

  describe('getRequestApproval', () => {
    test('正常：DB検索の結果が支払依頼の場合', async () => {
      const invoiceId = '3064665f-a90a-5f2e-a9e1-d59988ef3591'
      const expectApprovalFindOne = new RequestApproval({})
      requestApprovalFindOneSpy.mockReturnValueOnce(expectApprovalFindOne)

      const result = await inboxController.getRequestApproval(contractId, invoiceId)

      expect(result).toBe(true)
    })

    test('正常：DB検索の結果が支払依頼形式ではない場合', async () => {
      const invoiceId = '3064665f-a90a-5f2e-a9e1-d59988ef3591'
      const expectApprovalFindOne = {}
      requestApprovalFindOneSpy.mockReturnValueOnce(expectApprovalFindOne)

      const result = await inboxController.getRequestApproval(contractId, invoiceId)

      expect(result).toBe(false)
    })
    test('正常：DBエラー', async () => {
      const invoiceId = '3064665f-a90a-5f2e-a9e1-d59988ef3591'
      const dbError = new Error('DB Conncetion Error')
      requestApprovalFindOneSpy.mockImplementation(() => {
        throw dbError
      })

      const result = await inboxController.getRequestApproval(contractId, invoiceId)
      expect(result).toEqual(dbError)
    })
  })

  describe('getWorkflow', () => {
    test('正常:対象がない', async () => {
      // 準備
      const userId = 'dummyUserId'
      const req = {
        user: {
          accessToken: 'dummy-accessToken',
          refreshToken: 'dummy-refreshToken'
        }
      }
      const accessToken = req.user.accessToken
      const refreshToken = req.user.refreshToken
      const tradeshiftDTO = new TradeshiftDTO(accessToken, refreshToken)
      requestApprovalDAOGetAllRequestApproval.mockReturnValueOnce([])
      approvalDAOGetWaitingApprovals.mockReturnValueOnce([])
      const presentation = 'inboxList'
      const finalExpectResult = []

      // 実施
      const result = await inboxController.getWorkflow(userId, contractId, tradeshiftDTO, presentation)

      // 期待結果
      expect(result).toStrictEqual(finalExpectResult)
    })

    test('正常:担当者アドレスがある場合(無償)', async () => {
      // 準備
      const userId = 'dummyUserId'
      const req = {
        user: {
          accessToken: 'dummy-accessToken',
          refreshToken: 'dummy-refreshToken'
        }
      }
      const accessToken = req.user.accessToken
      const refreshToken = req.user.refreshToken
      const tradeshiftDTO = new TradeshiftDTO(accessToken, refreshToken)
      const getAllRequestApproval = []
      getAllRequestApproval.push(
        RequestApproval.build({
          requester: userId,
          status: '10',
          invoiceId: '3064665f-a90a-5f2e-a9e1-d59988ef3591'
        })
      )
      requestApprovalDAOGetAllRequestApproval.mockReturnValueOnce(getAllRequestApproval)
      approvalDAOGetWaitingApprovals.mockReturnValueOnce([])
      const document1 = {
        ID: 'UTテスト1',
        UnifiedState: 'PAID_UNCONFIRMED',
        ItemInfos: [
          { type: 'document.currency', value: 'JPY' },
          { type: 'document.total', value: '100.00' }
        ],
        SenderCompanyName: 'UTSenderCompanyName',
        ReceiverCompanyName: 'UTReceiverCompanyName',
        LastEdit: new Date(),
        DueDate: new Date()
      }
      tradeshiftDTOFindDocuments.mockReturnValueOnce(document1)
      const resultGetDocument = require('../mockInvoice/invoice1')
      tradeshiftDTOGetDocument.mockReturnValue(resultGetDocument)
      const presentation = 'inboxList'

      // 実施
      const result = await inboxController.getWorkflow(userId, contractId, tradeshiftDTO, presentation)

      // 期待結果
      expect(result.length).toBe(1)
      expect(result[0]).toHaveProperty('documentId', '3064665f-a90a-5f2e-a9e1-d59988ef3591')
      expect(result[0]).toHaveProperty('invoiceid', 'UTテスト1')
      expect(result[0]).toHaveProperty('status', 1)
      expect(result[0]).toHaveProperty('workflowStatus', '支払依頼中')
      expect(result[0]).toHaveProperty('currency', 'JPY')
      expect(result[0]).toHaveProperty('amount', '100')
      expect(result[0]).toHaveProperty('sendBy', 'UTSenderCompanyName')
      expect(result[0]).toHaveProperty('sendTo', 'UTReceiverCompanyName')
      expect(result[0]).toHaveProperty('updatedAt', timeStamp(new Date()))
      expect(result[0]).toHaveProperty('expire', timeStamp(new Date()))
      expect(result[0]).toHaveProperty('managerInfo', {
        managerAddress: 'abc@test.co.jp',
        managerName: '（ユーザー登録なし）'
      })
    })

    test('正常:担当者アドレスがある場合、ユーザー情報あり(有償)', async () => {
      // 準備
      const userId = 'dummyUserId'
      const req = {
        user: {
          accessToken: 'dummy-accessToken',
          refreshToken: 'dummy-refreshToken'
        }
      }
      const accessToken = req.user.accessToken
      const refreshToken = req.user.refreshToken
      const tradeshiftDTO = new TradeshiftDTO(accessToken, refreshToken)
      const getAllRequestApproval = []
      getAllRequestApproval.push(
        RequestApproval.build({
          requester: userId,
          status: '10',
          invoiceId: '3064665f-a90a-5f2e-a9e1-d59988ef3591'
        })
      )
      requestApprovalDAOGetAllRequestApproval.mockReturnValueOnce(getAllRequestApproval)
      approvalDAOGetWaitingApprovals.mockReturnValueOnce([])
      const document1 = {
        ID: 'UTテスト1',
        UnifiedState: 'PAID_UNCONFIRMED',
        ItemInfos: [
          { type: 'document.currency', value: 'JPY' },
          { type: 'document.total', value: '100.00' }
        ],
        SenderCompanyName: 'UTSenderCompanyName',
        ReceiverCompanyName: 'UTReceiverCompanyName',
        LastEdit: new Date(),
        DueDate: new Date()
      }

      tradeshiftDTOFindDocuments.mockReturnValueOnce(document1)
      const resultGetDocument = require('../mockInvoice/invoice1')
      tradeshiftDTOGetDocument.mockReturnValue(resultGetDocument)
      accessTradeshiftSpy.mockReturnValue(userInfo)
      const presentation = 'inboxList_light_plan'

      // 実施
      const result = await inboxController.getWorkflow(userId, contractId, tradeshiftDTO, presentation)

      // 期待結果
      expect(result.length).toBe(1)
      expect(result[0]).toHaveProperty('documentId', '3064665f-a90a-5f2e-a9e1-d59988ef3591')
      expect(result[0]).toHaveProperty('invoiceid', 'UTテスト1')
      expect(result[0]).toHaveProperty('status', 1)
      expect(result[0]).toHaveProperty('workflowStatus', '支払依頼中')
      expect(result[0]).toHaveProperty('currency', 'JPY')
      expect(result[0]).toHaveProperty('amount', '100')
      expect(result[0]).toHaveProperty('sendBy', 'UTSenderCompanyName')
      expect(result[0]).toHaveProperty('sendTo', 'UTReceiverCompanyName')
      expect(result[0]).toHaveProperty('updatedAt', timeStamp(new Date()))
      expect(result[0]).toHaveProperty('expire', timeStamp(new Date()))
      expect(result[0]).toHaveProperty('managerInfo', {
        managerAddress: 'abc@test.co.jp',
        managerName: 'UT テスト'
      })
    })

    test('正常:担当者アドレスがある場合、ユーザー情報あり:名前なし(有償)', async () => {
      // 準備
      const userId = 'dummyUserId'
      const req = {
        user: {
          accessToken: 'dummy-accessToken',
          refreshToken: 'dummy-refreshToken'
        }
      }
      const accessToken = req.user.accessToken
      const refreshToken = req.user.refreshToken
      const tradeshiftDTO = new TradeshiftDTO(accessToken, refreshToken)
      const getAllRequestApproval = []
      getAllRequestApproval.push(
        RequestApproval.build({
          requester: userId,
          status: '10',
          invoiceId: '3064665f-a90a-5f2e-a9e1-d59988ef3591'
        })
      )
      requestApprovalDAOGetAllRequestApproval.mockReturnValueOnce(getAllRequestApproval)
      approvalDAOGetWaitingApprovals.mockReturnValueOnce([])
      const document1 = {
        ID: 'UTテスト1',
        UnifiedState: 'PAID_UNCONFIRMED',
        ItemInfos: [
          { type: 'document.currency', value: 'JPY' },
          { type: 'document.total', value: '100.00' }
        ],
        SenderCompanyName: 'UTSenderCompanyName',
        ReceiverCompanyName: 'UTReceiverCompanyName',
        LastEdit: new Date(),
        DueDate: new Date()
      }

      tradeshiftDTOFindDocuments.mockReturnValueOnce(document1)
      const resultGetDocument = require('../mockInvoice/invoice1')
      tradeshiftDTOGetDocument.mockReturnValue(resultGetDocument)
      accessTradeshiftSpy.mockReturnValue(noNameUserInfo)
      const presentation = 'inboxList_light_plan'

      // 実施
      const result = await inboxController.getWorkflow(userId, contractId, tradeshiftDTO, presentation)

      // 期待結果
      expect(result.length).toBe(1)
      expect(result[0]).toHaveProperty('documentId', '3064665f-a90a-5f2e-a9e1-d59988ef3591')
      expect(result[0]).toHaveProperty('invoiceid', 'UTテスト1')
      expect(result[0]).toHaveProperty('status', 1)
      expect(result[0]).toHaveProperty('workflowStatus', '支払依頼中')
      expect(result[0]).toHaveProperty('currency', 'JPY')
      expect(result[0]).toHaveProperty('amount', '100')
      expect(result[0]).toHaveProperty('sendBy', 'UTSenderCompanyName')
      expect(result[0]).toHaveProperty('sendTo', 'UTReceiverCompanyName')
      expect(result[0]).toHaveProperty('updatedAt', timeStamp(new Date()))
      expect(result[0]).toHaveProperty('expire', timeStamp(new Date()))
      expect(result[0]).toHaveProperty('managerInfo', {
        managerAddress: 'abc@test.co.jp',
        managerName: '-'
      })
    })

    test('正常:担当者アドレスがある場合、ユーザー情報なし(有償)', async () => {
      // 準備
      const userId = 'dummyUserId'
      const req = {
        user: {
          accessToken: 'dummy-accessToken',
          refreshToken: 'dummy-refreshToken'
        }
      }
      const accessToken = req.user.accessToken
      const refreshToken = req.user.refreshToken
      const tradeshiftDTO = new TradeshiftDTO(accessToken, refreshToken)
      const getAllRequestApproval = []
      getAllRequestApproval.push(
        RequestApproval.build({
          requester: userId,
          status: '10',
          invoiceId: '3064665f-a90a-5f2e-a9e1-d59988ef3591'
        })
      )
      requestApprovalDAOGetAllRequestApproval.mockReturnValueOnce(getAllRequestApproval)
      approvalDAOGetWaitingApprovals.mockReturnValueOnce([])
      const document1 = {
        ID: 'UTテスト1',
        UnifiedState: 'PAID_UNCONFIRMED',
        ItemInfos: [
          { type: 'document.currency', value: 'JPY' },
          { type: 'document.total', value: '100.00' }
        ],
        SenderCompanyName: 'UTSenderCompanyName',
        ReceiverCompanyName: 'UTReceiverCompanyName',
        LastEdit: new Date(),
        DueDate: new Date()
      }
      tradeshiftDTOFindDocuments.mockReturnValueOnce(document1)
      const resultGetDocument = require('../mockInvoice/invoice1')
      tradeshiftDTOGetDocument.mockReturnValue(resultGetDocument)
      const noUser = new Error()
      noUser.status = 403
      accessTradeshiftSpy.mockReturnValue(noUser)
      const presentation = 'inboxList_light_plan'

      // 実施
      const result = await inboxController.getWorkflow(userId, contractId, tradeshiftDTO, presentation)

      // 期待結果
      expect(result.length).toBe(1)
      expect(result[0]).toHaveProperty('documentId', '3064665f-a90a-5f2e-a9e1-d59988ef3591')
      expect(result[0]).toHaveProperty('invoiceid', 'UTテスト1')
      expect(result[0]).toHaveProperty('status', 1)
      expect(result[0]).toHaveProperty('workflowStatus', '支払依頼中')
      expect(result[0]).toHaveProperty('currency', 'JPY')
      expect(result[0]).toHaveProperty('amount', '100')
      expect(result[0]).toHaveProperty('sendBy', 'UTSenderCompanyName')
      expect(result[0]).toHaveProperty('sendTo', 'UTReceiverCompanyName')
      expect(result[0]).toHaveProperty('updatedAt', timeStamp(new Date()))
      expect(result[0]).toHaveProperty('expire', timeStamp(new Date()))
      expect(result[0]).toHaveProperty('managerInfo', {
        managerAddress: 'abc@test.co.jp',
        managerName: '（ユーザー登録なし）'
      })
    })

    test('正常:自分が依頼した場合', async () => {
      // 準備
      const userId = 'dummyUserId'
      const req = {
        user: {
          accessToken: 'dummy-accessToken',
          refreshToken: 'dummy-refreshToken'
        }
      }
      const accessToken = req.user.accessToken
      const refreshToken = req.user.refreshToken
      const tradeshiftDTO = new TradeshiftDTO(accessToken, refreshToken)

      const getAllRequestApproval = []
      getAllRequestApproval.push(
        RequestApproval.build({
          requester: userId,
          status: '10',
          invoiceId: 'ut-test1'
        })
      )
      getAllRequestApproval.push(
        RequestApproval.build({
          requester: userId,
          status: '10',
          invoiceId: 'ut-test2'
        })
      )
      getAllRequestApproval.push(
        RequestApproval.build({
          requester: userId,
          status: '10',
          invoiceId: 'ut-test3'
        })
      )
      getAllRequestApproval.push(
        RequestApproval.build({
          requester: userId,
          status: '10',
          invoiceId: 'ut-test4'
        })
      )
      requestApprovalDAOGetAllRequestApproval.mockReturnValueOnce(getAllRequestApproval)
      approvalDAOGetWaitingApprovals.mockReturnValueOnce([])
      const document1 = {
        ID: '3064665f-a90a-5f2e-a9e1-d59988ef3591',
        UnifiedState: 'PAID_UNCONFIRMED',
        ItemInfos: [
          { type: 'document.currency', value: 'JPY' },
          { type: 'document.total', value: '100.00' }
        ],
        SenderCompanyName: 'UTSenderCompanyName',
        ReceiverCompanyName: 'UTReceiverCompanyName',
        LastEdit: new Date(),
        DueDate: new Date()
      }
      const document2 = {
        ID: 'UTテスト2',
        UnifiedState: 'PAID_CONFIRMED',
        ItemInfos: [
          { type: 'document.currency', value: 'JPY' },
          { type: 'document.total', value: '200.00' }
        ],
        ReceiverCompanyName: 'UTReceiverCompanyName',
        LastEdit: new Date(),
        DueDate: new Date()
      }
      const document3 = {
        ID: 'UTテスト3',
        UnifiedState: 'ACCEPTED',
        ItemInfos: [
          { type: 'document.currency', value: 'JPY' },
          { type: 'document.total', value: '300.00' }
        ],
        SenderCompanyName: 'UTSenderCompanyName',
        LastEdit: new Date(),
        DueDate: new Date()
      }
      const document4 = {
        ID: 'UTテスト4',
        UnifiedState: 'DELIVERED',
        ItemInfos: [
          { type: 'document.currency', value: 'JPY' },
          { type: 'document.total', value: '400.00' }
        ],
        SenderCompanyName: 'UTSenderCompanyName',
        ReceiverCompanyName: 'UTReceiverCompanyName',
        LastEdit: null,
        DueDate: null
      }
      tradeshiftDTOFindDocuments.mockReturnValueOnce(document1)
      tradeshiftDTOFindDocuments.mockReturnValueOnce(document2)
      tradeshiftDTOFindDocuments.mockReturnValueOnce(document3)
      tradeshiftDTOFindDocuments.mockReturnValueOnce(document4)
      const resultGetDocument = require('../mockInvoice/invoice2')
      tradeshiftDTOGetDocument.mockReturnValue(resultGetDocument)
      const presentation = 'inboxList'

      // 実施
      const result = await inboxController.getWorkflow(userId, contractId, tradeshiftDTO, presentation)

      // 期待結果
      expect(result.length).toBe(4)
      expect(result[0]).toHaveProperty('documentId', 'ut-test1')
      expect(result[0]).toHaveProperty('invoiceid', '3064665f-a90a-5f2e-a9e1-d59988ef3591')
      expect(result[0]).toHaveProperty('status', 1)
      expect(result[0]).toHaveProperty('workflowStatus', '支払依頼中')
      expect(result[0]).toHaveProperty('currency', 'JPY')
      expect(result[0]).toHaveProperty('amount', '100')
      expect(result[0]).toHaveProperty('sendBy', 'UTSenderCompanyName')
      expect(result[0]).toHaveProperty('sendTo', 'UTReceiverCompanyName')
      expect(result[0]).toHaveProperty('updatedAt', timeStamp(new Date()))
      expect(result[0]).toHaveProperty('expire', timeStamp(new Date()))
      expect(result[0]).toHaveProperty('managerInfo', { managerAddress: '-', managerName: '（ユーザー登録なし）' })

      expect(result[1]).toHaveProperty('documentId', 'ut-test2')
      expect(result[1]).toHaveProperty('invoiceid', 'UTテスト2')
      expect(result[1]).toHaveProperty('status', 0)
      expect(result[1]).toHaveProperty('workflowStatus', '支払依頼中')
      expect(result[1]).toHaveProperty('currency', 'JPY')
      expect(result[1]).toHaveProperty('amount', '200')
      expect(result[1]).toHaveProperty('sendBy', '-')
      expect(result[1]).toHaveProperty('sendTo', 'UTReceiverCompanyName')
      expect(result[1]).toHaveProperty('updatedAt', timeStamp(new Date()))
      expect(result[1]).toHaveProperty('expire', timeStamp(new Date()))
      expect(result[1]).toHaveProperty('managerInfo', { managerAddress: '-', managerName: '（ユーザー登録なし）' })

      expect(result[2]).toHaveProperty('documentId', 'ut-test3')
      expect(result[2]).toHaveProperty('invoiceid', 'UTテスト3')
      expect(result[2]).toHaveProperty('status', 2)
      expect(result[2]).toHaveProperty('workflowStatus', '支払依頼中')
      expect(result[2]).toHaveProperty('currency', 'JPY')
      expect(result[2]).toHaveProperty('amount', '300')
      expect(result[2]).toHaveProperty('sendBy', 'UTSenderCompanyName')
      expect(result[2]).toHaveProperty('sendTo', '-')
      expect(result[2]).toHaveProperty('updatedAt', timeStamp(new Date()))
      expect(result[2]).toHaveProperty('expire', timeStamp(new Date()))
      expect(result[2]).toHaveProperty('managerInfo', { managerAddress: '-', managerName: '（ユーザー登録なし）' })

      expect(result[3]).toHaveProperty('documentId', 'ut-test4')
      expect(result[3]).toHaveProperty('invoiceid', 'UTテスト4')
      expect(result[3]).toHaveProperty('status', 3)
      expect(result[3]).toHaveProperty('workflowStatus', '支払依頼中')
      expect(result[3]).toHaveProperty('currency', 'JPY')
      expect(result[3]).toHaveProperty('amount', '400')
      expect(result[3]).toHaveProperty('sendBy', 'UTSenderCompanyName')
      expect(result[3]).toHaveProperty('sendTo', 'UTReceiverCompanyName')
      expect(result[3]).toHaveProperty('updatedAt', '-')
      expect(result[3]).toHaveProperty('expire', '-')
      expect(result[3]).toHaveProperty('managerInfo', { managerAddress: '-', managerName: '（ユーザー登録なし）' })
    })

    test('正常:自分に依頼がきた時', async () => {
      // 準備
      const userId = 'dummyUserId'
      const req = {
        user: {
          accessToken: 'dummy-accessToken',
          refreshToken: 'dummy-refreshToken'
        }
      }
      const accessToken = req.user.accessToken
      const refreshToken = req.user.refreshToken
      const tradeshiftDTO = new TradeshiftDTO(accessToken, refreshToken)
      requestApprovalDAOGetAllRequestApproval.mockReturnValueOnce([])
      const waitingApprovals = []
      // 最終承認者になって、承認担当者になっているもの
      waitingApprovals.push(
        Approval.build({
          requestId: 'dummyRequestid1',
          requestUserId: 'dummyRequester1',
          approveRouteId: 'dummyRouteId',
          approveStatus: '10',
          approveRouteName: 'UTテスト1',
          approveUser1: null,
          approvalAt1: null,
          message1: null,
          approveUser2: null,
          approvalAt2: null,
          message2: null,
          approveUser3: null,
          approvalAt3: null,
          message3: null,
          approveUser4: null,
          approvalAt4: null,
          message4: null,
          approveUser5: null,
          approvalAt5: null,
          message5: null,
          approveUser6: null,
          approvalAt6: null,
          message6: null,
          approveUser7: null,
          approvalAt7: null,
          message7: null,
          approveUser8: null,
          approvalAt8: null,
          message8: null,
          approveUser9: null,
          approvalAt9: null,
          message9: null,
          approveUser10: null,
          approvalAt10: null,
          message10: null,
          approveUserLast: 'dummyUserId',
          approvalAtLast: null,
          messageLast: null,
          approveUserCount: 1,
          rejectedUser: null,
          rejectedAt: null,
          rejectedMessage: null,
          'RequestApproval.invoiceId': 'ut-test1'
        })
      )
      // まだ、承認担当者になっていないもの
      waitingApprovals.push(
        Approval.build({
          requestId: 'dummyRequestid1',
          requestUserId: 'dummyRequester1',
          approveRouteId: 'dummyRouteId',
          approveStatus: '10',
          approveRouteName: 'UTテスト2',
          approveUser1: 'approveUser1',
          approvalAt1: null,
          message1: null,
          approveUser2: 'dummyUserId',
          approvalAt2: null,
          message2: null,
          approveUser3: null,
          approvalAt3: null,
          message3: null,
          approveUser4: null,
          approvalAt4: null,
          message4: null,
          approveUser5: null,
          approvalAt5: null,
          message5: null,
          approveUser6: null,
          approvalAt6: null,
          message6: null,
          approveUser7: null,
          approvalAt7: null,
          message7: null,
          approveUser8: null,
          approvalAt8: null,
          message8: null,
          approveUser9: null,
          approvalAt9: null,
          message9: null,
          approveUser10: null,
          approvalAt10: null,
          message10: null,
          approveUserLast: 'UtLastUser',
          approvalAtLast: null,
          messageLast: null,
          approveUserCount: 3,
          rejectedUser: null,
          rejectedAt: null,
          rejectedMessage: null,
          'RequestApproval.invoiceId': 'ut-test2'
        })
      )
      // 承認担当者になったもの
      waitingApprovals.push(
        Approval.build({
          requestId: 'dummyRequestid1',
          requestUserId: 'dummyRequester1',
          approveRouteId: 'dummyRouteId',
          approveStatus: '11',
          approveRouteName: 'UTテスト2',
          approveUser1: 'approveUser1',
          approvalAt1: new Date(2022, 4, 14),
          message1: 'Thank you',
          approveUser2: 'dummyUserId',
          approvalAt2: null,
          message2: null,
          approveUser3: null,
          approvalAt3: null,
          message3: null,
          approveUser4: null,
          approvalAt4: null,
          message4: null,
          approveUser5: null,
          approvalAt5: null,
          message5: null,
          approveUser6: null,
          approvalAt6: null,
          message6: null,
          approveUser7: null,
          approvalAt7: null,
          message7: null,
          approveUser8: null,
          approvalAt8: null,
          message8: null,
          approveUser9: null,
          approvalAt9: null,
          message9: null,
          approveUser10: null,
          approvalAt10: null,
          message10: null,
          approveUserLast: 'UtLastUser',
          approvalAtLast: null,
          messageLast: null,
          approveUserCount: 3,
          rejectedUser: null,
          rejectedAt: null,
          rejectedMessage: null,
          'RequestApproval.invoiceId': 'ut-test3'
        })
      )
      // 承認担当者が終わったもの
      waitingApprovals.push(
        Approval.build({
          requestId: 'dummyRequestid1',
          requestUserId: 'dummyRequester1',
          approveRouteId: 'dummyRouteId',
          approveStatus: '12',
          approveRouteName: 'UTテスト2',
          approveUser1: 'approveUser1',
          approvalAt1: new Date(2022, 4, 14),
          message1: 'Thank you',
          approveUser2: 'dummyUserId',
          approvalAt2: new Date(2022, 4, 14),
          message2: 'ありがとう',
          approveUser3: 'approveUser3',
          approvalAt3: null,
          message3: null,
          approveUser4: null,
          approvalAt4: null,
          message4: null,
          approveUser5: null,
          approvalAt5: null,
          message5: null,
          approveUser6: null,
          approvalAt6: null,
          message6: null,
          approveUser7: null,
          approvalAt7: null,
          message7: null,
          approveUser8: null,
          approvalAt8: null,
          message8: null,
          approveUser9: null,
          approvalAt9: null,
          message9: null,
          approveUser10: null,
          approvalAt10: null,
          message10: null,
          approveUserLast: 'UtLastUser',
          approvalAtLast: null,
          messageLast: null,
          approveUserCount: 4,
          rejectedUser: null,
          rejectedAt: null,
          rejectedMessage: null,
          'RequestApproval.invoiceId': 'ut-test4'
        })
      )
      approvalDAOGetWaitingApprovals.mockReturnValueOnce(waitingApprovals)
      const document1 = {
        ID: 'UTテスト1',
        UnifiedState: 'PAID_UNCONFIRMED',
        ItemInfos: [
          { type: 'document.currency', value: 'JPY' },
          { type: 'document.total', value: '100.00' }
        ],
        SenderCompanyName: 'UTSenderCompanyName',
        ReceiverCompanyName: 'UTReceiverCompanyName',
        LastEdit: new Date(),
        DueDate: new Date()
      }
      const document2 = {
        ID: 'UTテスト3',
        UnifiedState: 'PAID_CONFIRMED',
        ItemInfos: [
          { type: 'document.currency', value: 'JPY' },
          { type: 'document.total', value: '200.00' }
        ],
        ReceiverCompanyName: 'UTReceiverCompanyName',
        LastEdit: new Date(),
        DueDate: new Date()
      }
      tradeshiftDTOFindDocuments.mockReturnValueOnce(document1)
      tradeshiftDTOFindDocuments.mockReturnValueOnce(document2)
      const resultGetDocument = require('../mockInvoice/invoice2')
      tradeshiftDTOGetDocument.mockReturnValue(resultGetDocument)
      const presentation = 'inboxList'

      // 実施
      const result = await inboxController.getWorkflow(userId, contractId, tradeshiftDTO, presentation)

      // 期待結果
      expect(result.length).toBe(2)
      expect(result[0]).toHaveProperty('documentId', 'ut-test1')
      expect(result[0]).toHaveProperty('invoiceid', 'UTテスト1')
      expect(result[0]).toHaveProperty('status', 1)
      expect(result[0]).toHaveProperty('workflowStatus', '支払依頼中')
      expect(result[0]).toHaveProperty('currency', 'JPY')
      expect(result[0]).toHaveProperty('amount', '100')
      expect(result[0]).toHaveProperty('sendBy', 'UTSenderCompanyName')
      expect(result[0]).toHaveProperty('sendTo', 'UTReceiverCompanyName')
      expect(result[0]).toHaveProperty('updatedAt', timeStamp(new Date()))
      expect(result[0]).toHaveProperty('expire', timeStamp(new Date()))
      expect(result[0]).toHaveProperty('managerInfo', { managerAddress: '-', managerName: '（ユーザー登録なし）' })

      expect(result[1]).toHaveProperty('documentId', 'ut-test3')
      expect(result[1]).toHaveProperty('invoiceid', 'UTテスト3')
      expect(result[1]).toHaveProperty('status', 0)
      expect(result[1]).toHaveProperty('workflowStatus', '一次承認済み')
      expect(result[1]).toHaveProperty('currency', 'JPY')
      expect(result[1]).toHaveProperty('amount', '200')
      expect(result[1]).toHaveProperty('sendBy', '-')
      expect(result[1]).toHaveProperty('sendTo', 'UTReceiverCompanyName')
      expect(result[1]).toHaveProperty('updatedAt', timeStamp(new Date()))
      expect(result[1]).toHaveProperty('expire', timeStamp(new Date()))
      expect(result[1]).toHaveProperty('managerInfo', { managerAddress: '-', managerName: '（ユーザー登録なし）' })
    })

    test('異常:GetDocumentAPIエラー(500)', async () => {
      // 準備
      const userId = 'dummyUserId'
      const req = {
        user: {
          accessToken: 'dummy-accessToken',
          refreshToken: 'dummy-refreshToken'
        }
      }
      const accessToken = req.user.accessToken
      const refreshToken = req.user.refreshToken
      const tradeshiftDTO = new TradeshiftDTO(accessToken, refreshToken)
      const getAllRequestApproval = []
      getAllRequestApproval.push(
        RequestApproval.build({
          requester: userId,
          status: '10',
          invoiceId: '3064665f-a90a-5f2e-a9e1-d59988ef3591'
        })
      )
      requestApprovalDAOGetAllRequestApproval.mockReturnValueOnce(getAllRequestApproval)
      approvalDAOGetWaitingApprovals.mockReturnValueOnce([])
      const document1 = {
        ID: 'UTテスト1',
        UnifiedState: 'PAID_UNCONFIRMED',
        ItemInfos: [
          { type: 'document.currency', value: 'JPY' },
          { type: 'document.total', value: '100.00' }
        ],
        SenderCompanyName: 'UTSenderCompanyName',
        ReceiverCompanyName: 'UTReceiverCompanyName',
        LastEdit: new Date(),
        DueDate: new Date()
      }
      tradeshiftDTOFindDocuments.mockReturnValueOnce(document1)
      const apiError = new Error('API ERROR')
      apiError.status = 500
      tradeshiftDTOGetDocument.mockReturnValue(apiError)
      const presentation = 'inboxList_light_plan'

      // 実施
      const result = await inboxController.getWorkflow(userId, contractId, tradeshiftDTO, presentation)

      // 期待結果
      expect(result.length).toBe(1)
      expect(result[0]).toHaveProperty('documentId', '3064665f-a90a-5f2e-a9e1-d59988ef3591')
      expect(result[0]).toHaveProperty('invoiceid', 'UTテスト1')
      expect(result[0]).toHaveProperty('status', 1)
      expect(result[0]).toHaveProperty('workflowStatus', '支払依頼中')
      expect(result[0]).toHaveProperty('currency', 'JPY')
      expect(result[0]).toHaveProperty('amount', '100')
      expect(result[0]).toHaveProperty('sendBy', 'UTSenderCompanyName')
      expect(result[0]).toHaveProperty('sendTo', 'UTReceiverCompanyName')
      expect(result[0]).toHaveProperty('updatedAt', timeStamp(new Date()))
      expect(result[0]).toHaveProperty('expire', timeStamp(new Date()))
      expect(result[0]).toHaveProperty('managerInfo', {
        managerAddress: '-',
        managerName: '（ユーザー登録なし）'
      })
    })
  })

  describe('getSearchResult', () => {
    test('正常', async () => {
      // パラメータ作成
      const requestId = '111b34d1-f4db-484e-b822-8e2ce9017d14'
      const contractId = '343b34d1-f4db-484e-b822-8e2ce9017d14'
      const approveRouteId = 'eb9835ae-afc7-4a55-92b3-9df762b3d6e6'
      const invoiceId = '48c8e45e-376f-5f02-a1a4-5862c5c35baf'
      const message = 'messege'
      const userId = '12345678-cb0b-48ad-857d-4b42a44ede13'

      const tradeshiftDTO = new TradeshiftDTO(accessToken, refreshToken, tenantId)
      const keyword = {
        invoiceNumber: 'buyer2',
        issueDate: ['2022-03-01', '2022-04-01'],
        sentBy: ['011c0e85-aabb-437b-9dcd-5b941dd4e1aa'],
        status: ['80', '10', '11', '12'],
        contactEmail: 'abc@test.co.jp',
        unKnownManager: undefined
      }

      const resultGetDocumentSearch = [
        {
          DocumentId: '48c8e45e-376f-5f02-a1a4-5862c5c35baf',
          ID: 'PBI2848buyer2_入金確認済み',
          URI: 'https://api-sandbox.tradeshift.com/tradeshift/rest/external/documents/48c8e45e-376f-5f02-a1a4-5862c5c35baf',
          DocumentType: { type: 'invoice' },
          State: 'LOCKED',
          CreatedDateTime: '2021-12-16T07:34:03.248Z',
          LastEdit: '2021-12-16T07:34:03.248Z',
          SenderCompanyName: 'バイヤー2',
          Actor: {
            Created: '2021-07-27T08:58:14.266Z',
            Modified: '2021-07-27T08:58:14.266Z',
            FirstName: '管理者1',
            LastName: 'サプライヤー2',
            Email: 'dev.master.bconnection+supplier2.001@gmail.com',
            MobileNumberVerified: false
          },
          ApplicationResponse: { ResponseDate: '2021-12-16' },
          ConversationId: '48b89f82-c92e-4356-8ce7-66781b7d3d55',
          ReceiverCompanyName: 'サプライヤー2',
          Tags: { Tag: [] },
          ItemInfos: [
            { type: 'document.currency', value: 'JPY' },
            { type: 'document.total', value: '1000.00' },
            { type: 'document.issuedate', value: '2022-04-01' }
          ],
          ProcessState: 'PENDING',
          ConversationStates: [[Object], [Object]],
          UnifiedState: 'PAID_CONFIRMED',
          CopyIndicator: false,
          Deleted: false,
          DueDate: '2021-12-23',
          TenantId: '7e5255fe-05e6-4fc9-acf0-076574bc35f7',
          InvoiceTypeCode: '380',
          Properties: [],
          SettlementBusinessIds: []
        }
      ]
      const resultGetDocument = require('../mockInvoice/invoice1')
      tradeshiftDTOGetDocument.mockReturnValue(resultGetDocument)
      accessTradeshiftSpy.mockReturnValue(userInfo)

      const rejectTestData = await RequestApproval.build({
        requestId: requestId,
        contractId: contractId,
        approveRouteId: approveRouteId,
        invoiceId: invoiceId,
        requester: userId,
        status: '10',
        message: message,
        create: '2021-01-25T08:45:49.803Z',
        isSaved: true
      })

      tradeshiftDTOGetDocuments.mockReturnValue(searchResult1)
      tradeshiftDTOGetDocumentSearch.mockReturnValueOnce(resultGetDocumentSearch)
      requestApprovalFindOne.mockReturnValueOnce(rejectTestData)

      const result = await inboxController.getSearchResult(tradeshiftDTO, keyword, contractId, tenantId)

      // 結果確認
      expect(result).toEqual([
        {
          no: 1,
          invoiceNo: 'PBI2848buyer2_入金確認済み',
          status: 0,
          currency: 'JPY',
          ammount: '1,000',
          sentTo: 'バイヤー2',
          sentBy: 'サプライヤー2',
          updated: '2021-12-16',
          expire: '2021-12-23',
          documentId: '48c8e45e-376f-5f02-a1a4-5862c5c35baf',
          approveStatus: '10',
          managerInfo: {
            managerAddress: '-',
            managerName: '（ユーザー登録なし）'
          }
        }
      ])
    })

    test('正常:担当者ユーザー情報あり', async () => {
      // パラメータ作成
      const requestId = '111b34d1-f4db-484e-b822-8e2ce9017d14'
      const contractId = '343b34d1-f4db-484e-b822-8e2ce9017d14'
      const approveRouteId = 'eb9835ae-afc7-4a55-92b3-9df762b3d6e6'
      const invoiceId = '48c8e45e-376f-5f02-a1a4-5862c5c35baf'
      const message = 'messege'
      const userId = '12345678-cb0b-48ad-857d-4b42a44ede13'

      const tradeshiftDTO = new TradeshiftDTO(accessToken, refreshToken, tenantId)
      const keyword = {
        invoiceNumber: 'buyer2',
        issueDate: ['2022-03-01', '2022-04-01'],
        sentBy: ['011c0e85-aabb-437b-9dcd-5b941dd4e1aa'],
        status: ['80', '10', '11', '12'],
        contactEmail: 'abc@test.co.jp',
        unKnownManager: undefined
      }

      const resultGetDocumentSearch = [
        {
          DocumentId: '3064665f-a90a-5f2e-a9e1-d59988ef3591',
          ID: 'PBI2848buyer2_入金確認済み',
          URI: 'https://api-sandbox.tradeshift.com/tradeshift/rest/external/documents/3064665f-a90a-5f2e-a9e1-d59988ef3591',
          DocumentType: { type: 'invoice' },
          State: 'LOCKED',
          CreatedDateTime: '2021-12-16T07:34:03.248Z',
          LastEdit: '2021-12-16T07:34:03.248Z',
          SenderCompanyName: 'バイヤー2',
          Actor: {
            Created: '2021-07-27T08:58:14.266Z',
            Modified: '2021-07-27T08:58:14.266Z',
            FirstName: '管理者1',
            LastName: 'サプライヤー2',
            Email: 'dev.master.bconnection+supplier2.001@gmail.com',
            MobileNumberVerified: false
          },
          ApplicationResponse: { ResponseDate: '2021-12-16' },
          ConversationId: '48b89f82-c92e-4356-8ce7-66781b7d3d55',
          ReceiverCompanyName: 'サプライヤー2',
          Tags: { Tag: [] },
          ItemInfos: [
            { type: 'document.currency', value: 'JPY' },
            { type: 'document.total', value: '1000.00' },
            { type: 'document.issuedate', value: '2022-04-01' }
          ],
          ProcessState: 'PENDING',
          ConversationStates: [[Object], [Object]],
          UnifiedState: 'PAID_CONFIRMED',
          CopyIndicator: false,
          Deleted: false,
          DueDate: '2021-12-23',
          TenantId: '7e5255fe-05e6-4fc9-acf0-076574bc35f7',
          InvoiceTypeCode: '380',
          Properties: [],
          SettlementBusinessIds: []
        }
      ]
      const resultGetDocument = require('../mockInvoice/invoice1')
      tradeshiftDTOGetDocument.mockReturnValue(resultGetDocument)
      accessTradeshiftSpy.mockReturnValue(userInfo)

      const rejectTestData = await RequestApproval.build({
        requestId: requestId,
        contractId: contractId,
        approveRouteId: approveRouteId,
        invoiceId: invoiceId,
        requester: userId,
        status: '10',
        message: message,
        create: '2021-01-25T08:45:49.803Z',
        isSaved: true
      })

      tradeshiftDTOGetDocuments.mockReturnValue(searchResult1)
      tradeshiftDTOGetDocumentSearch.mockReturnValueOnce(resultGetDocumentSearch)
      requestApprovalFindOne.mockReturnValueOnce(rejectTestData)

      const result = await inboxController.getSearchResult(tradeshiftDTO, keyword, contractId, tenantId)

      // 結果確認
      expect(result).toEqual([
        {
          no: 1,
          invoiceNo: 'PBI2848buyer2_入金確認済み',
          status: 0,
          currency: 'JPY',
          ammount: '1,000',
          sentTo: 'バイヤー2',
          sentBy: 'サプライヤー2',
          updated: '2021-12-16',
          expire: '2021-12-23',
          documentId: '3064665f-a90a-5f2e-a9e1-d59988ef3591',
          approveStatus: '10',
          managerInfo: {
            managerAddress: 'abc@test.co.jp',
            managerName: 'UT テスト'
          }
        }
      ])
    })

    test('正常:担当者ユーザー情報あり、名前なし', async () => {
      // パラメータ作成
      const requestId = '111b34d1-f4db-484e-b822-8e2ce9017d14'
      const contractId = '343b34d1-f4db-484e-b822-8e2ce9017d14'
      const approveRouteId = 'eb9835ae-afc7-4a55-92b3-9df762b3d6e6'
      const invoiceId = '48c8e45e-376f-5f02-a1a4-5862c5c35baf'
      const message = 'messege'
      const userId = '12345678-cb0b-48ad-857d-4b42a44ede13'

      const tradeshiftDTO = new TradeshiftDTO(accessToken, refreshToken, tenantId)
      const keyword = {
        invoiceNumber: 'buyer2',
        issueDate: ['2022-03-01', '2022-04-01'],
        sentBy: ['011c0e85-aabb-437b-9dcd-5b941dd4e1aa'],
        status: ['80', '10', '11', '12'],
        contactEmail: 'abc@test.co.jp',
        unKnownManager: undefined
      }

      const resultGetDocumentSearch = [
        {
          DocumentId: '3064665f-a90a-5f2e-a9e1-d59988ef3591',
          ID: 'PBI2848buyer2_入金確認済み',
          URI: 'https://api-sandbox.tradeshift.com/tradeshift/rest/external/documents/3064665f-a90a-5f2e-a9e1-d59988ef3591',
          DocumentType: { type: 'invoice' },
          State: 'LOCKED',
          CreatedDateTime: '2021-12-16T07:34:03.248Z',
          LastEdit: '2021-12-16T07:34:03.248Z',
          SenderCompanyName: 'バイヤー2',
          Actor: {
            Created: '2021-07-27T08:58:14.266Z',
            Modified: '2021-07-27T08:58:14.266Z',
            FirstName: '管理者1',
            LastName: 'サプライヤー2',
            Email: 'dev.master.bconnection+supplier2.001@gmail.com',
            MobileNumberVerified: false
          },
          ApplicationResponse: { ResponseDate: '2021-12-16' },
          ConversationId: '48b89f82-c92e-4356-8ce7-66781b7d3d55',
          ReceiverCompanyName: 'サプライヤー2',
          Tags: { Tag: [] },
          ItemInfos: [
            { type: 'document.currency', value: 'JPY' },
            { type: 'document.total', value: '1000.00' },
            { type: 'document.issuedate', value: '2022-04-01' }
          ],
          ProcessState: 'PENDING',
          ConversationStates: [[Object], [Object]],
          UnifiedState: 'PAID_CONFIRMED',
          CopyIndicator: false,
          Deleted: false,
          DueDate: '2021-12-23',
          TenantId: '7e5255fe-05e6-4fc9-acf0-076574bc35f7',
          InvoiceTypeCode: '380',
          Properties: [],
          SettlementBusinessIds: []
        }
      ]
      const resultGetDocument = require('../mockInvoice/invoice1')
      tradeshiftDTOGetDocument.mockReturnValue(resultGetDocument)
      accessTradeshiftSpy.mockReturnValue(noNameUserInfo)
      const rejectTestData = await RequestApproval.build({
        requestId: requestId,
        contractId: contractId,
        approveRouteId: approveRouteId,
        invoiceId: invoiceId,
        requester: userId,
        status: '10',
        message: message,
        create: '2021-01-25T08:45:49.803Z',
        isSaved: true
      })

      tradeshiftDTOGetDocuments.mockReturnValue(searchResult1)
      tradeshiftDTOGetDocumentSearch.mockReturnValueOnce(resultGetDocumentSearch)
      requestApprovalFindOne.mockReturnValueOnce(rejectTestData)

      const result = await inboxController.getSearchResult(tradeshiftDTO, keyword, contractId, tenantId)

      // 結果確認
      expect(result).toEqual([
        {
          no: 1,
          invoiceNo: 'PBI2848buyer2_入金確認済み',
          status: 0,
          currency: 'JPY',
          ammount: '1,000',
          sentTo: 'バイヤー2',
          sentBy: 'サプライヤー2',
          updated: '2021-12-16',
          expire: '2021-12-23',
          documentId: '3064665f-a90a-5f2e-a9e1-d59988ef3591',
          approveStatus: '10',
          managerInfo: {
            managerAddress: 'abc@test.co.jp',
            managerName: '-'
          }
        }
      ])
    })

    test('正常:担当者ユーザー情報なし', async () => {
      // パラメータ作成
      const requestId = '111b34d1-f4db-484e-b822-8e2ce9017d14'
      const contractId = '343b34d1-f4db-484e-b822-8e2ce9017d14'
      const approveRouteId = 'eb9835ae-afc7-4a55-92b3-9df762b3d6e6'
      const invoiceId = '48c8e45e-376f-5f02-a1a4-5862c5c35baf'
      const message = 'messege'
      const userId = '12345678-cb0b-48ad-857d-4b42a44ede13'

      const tradeshiftDTO = new TradeshiftDTO(accessToken, refreshToken, tenantId)
      const keyword = {
        invoiceNumber: 'buyer2',
        issueDate: ['2022-03-01', '2022-04-01'],
        sentBy: ['011c0e85-aabb-437b-9dcd-5b941dd4e1aa'],
        status: ['80', '10', '11', '12'],
        contactEmail: 'abc@test.co.jp',
        unKnownManager: undefined
      }

      const resultGetDocumentSearch = [
        {
          DocumentId: '3064665f-a90a-5f2e-a9e1-d59988ef3591',
          ID: 'PBI2848buyer2_入金確認済み',
          URI: 'https://api-sandbox.tradeshift.com/tradeshift/rest/external/documents/3064665f-a90a-5f2e-a9e1-d59988ef3591',
          DocumentType: { type: 'invoice' },
          State: 'LOCKED',
          CreatedDateTime: '2021-12-16T07:34:03.248Z',
          LastEdit: '2021-12-16T07:34:03.248Z',
          SenderCompanyName: 'バイヤー2',
          Actor: {
            Created: '2021-07-27T08:58:14.266Z',
            Modified: '2021-07-27T08:58:14.266Z',
            FirstName: '管理者1',
            LastName: 'サプライヤー2',
            Email: 'dev.master.bconnection+supplier2.001@gmail.com',
            MobileNumberVerified: false
          },
          ApplicationResponse: { ResponseDate: '2021-12-16' },
          ConversationId: '48b89f82-c92e-4356-8ce7-66781b7d3d55',
          ReceiverCompanyName: 'サプライヤー2',
          Tags: { Tag: [] },
          ItemInfos: [
            { type: 'document.currency', value: 'JPY' },
            { type: 'document.total', value: '1000.00' },
            { type: 'document.issuedate', value: '2022-04-01' }
          ],
          ProcessState: 'PENDING',
          ConversationStates: [[Object], [Object]],
          UnifiedState: 'PAID_CONFIRMED',
          CopyIndicator: false,
          Deleted: false,
          DueDate: '2021-12-23',
          TenantId: '7e5255fe-05e6-4fc9-acf0-076574bc35f7',
          InvoiceTypeCode: '380',
          Properties: [],
          SettlementBusinessIds: []
        }
      ]
      const resultGetDocument = require('../mockInvoice/invoice1')
      tradeshiftDTOGetDocument.mockReturnValue(resultGetDocument)
      const noUesrinfo = new Error('NO USER INFO')
      accessTradeshiftSpy.mockReturnValue(noUesrinfo)
      const rejectTestData = await RequestApproval.build({
        requestId: requestId,
        contractId: contractId,
        approveRouteId: approveRouteId,
        invoiceId: invoiceId,
        requester: userId,
        status: '10',
        message: message,
        create: '2021-01-25T08:45:49.803Z',
        isSaved: true
      })

      tradeshiftDTOGetDocuments.mockReturnValue(searchResult1)
      tradeshiftDTOGetDocumentSearch.mockReturnValueOnce(resultGetDocumentSearch)
      requestApprovalFindOne.mockReturnValueOnce(rejectTestData)

      const result = await inboxController.getSearchResult(tradeshiftDTO, keyword, contractId, tenantId)

      // 結果確認
      expect(result).toEqual([
        {
          no: 1,
          invoiceNo: 'PBI2848buyer2_入金確認済み',
          status: 0,
          currency: 'JPY',
          ammount: '1,000',
          sentTo: 'バイヤー2',
          sentBy: 'サプライヤー2',
          updated: '2021-12-16',
          expire: '2021-12-23',
          documentId: '3064665f-a90a-5f2e-a9e1-d59988ef3591',
          approveStatus: '10',
          managerInfo: {
            managerAddress: 'abc@test.co.jp',
            managerName: '（ユーザー登録なし）'
          }
        }
      ])
    })

    test('正常：送信企業がない場合', async () => {
      // パラメータ作成
      const requestId = '111b34d1-f4db-484e-b822-8e2ce9017d14'
      const contractId = '343b34d1-f4db-484e-b822-8e2ce9017d14'
      const approveRouteId = 'eb9835ae-afc7-4a55-92b3-9df762b3d6e6'
      const invoiceId = '48c8e45e-376f-5f02-a1a4-5862c5c35baf'
      const message = 'messege'
      const userId = '12345678-cb0b-48ad-857d-4b42a44ede13'

      const tradeshiftDTO = new TradeshiftDTO(accessToken, refreshToken, tenantId)
      const keyword = {
        invoiceNumber: 'buyer2',
        issueDate: ['2022-03-01', '2022-04-01'],
        sentBy: [],
        status: ['80', '10', '11', '12'],
        contactEmail: 'abc@test.co.jp',
        unKnownManager: undefined
      }

      const resultGetDocumentSearch = [
        {
          DocumentId: '48c8e45e-376f-5f02-a1a4-5862c5c35baf',
          ID: 'PBI2848buyer2_入金確認済み',
          URI: 'https://api-sandbox.tradeshift.com/tradeshift/rest/external/documents/48c8e45e-376f-5f02-a1a4-5862c5c35baf',
          DocumentType: { type: 'invoice' },
          State: 'LOCKED',
          CreatedDateTime: '2021-12-16T07:34:03.248Z',
          LastEdit: '2021-12-16T07:34:03.248Z',
          SenderCompanyName: 'バイヤー2',
          Actor: {
            Created: '2021-07-27T08:58:14.266Z',
            Modified: '2021-07-27T08:58:14.266Z',
            FirstName: '管理者1',
            LastName: 'サプライヤー2',
            Email: 'dev.master.bconnection+supplier2.001@gmail.com',
            MobileNumberVerified: false
          },
          ApplicationResponse: { ResponseDate: '2021-12-16' },
          ConversationId: '48b89f82-c92e-4356-8ce7-66781b7d3d55',
          ReceiverCompanyName: 'サプライヤー2',
          Tags: { Tag: [] },
          ItemInfos: [
            { type: 'document.currency', value: 'JPY' },
            { type: 'document.total', value: '1000.00' },
            { type: 'document.issuedate', value: '2022-04-01' }
          ],
          ProcessState: 'PENDING',
          ConversationStates: [[Object], [Object]],
          UnifiedState: 'PAID_CONFIRMED',
          CopyIndicator: false,
          Deleted: false,
          DueDate: '2021-12-23',
          TenantId: '7e5255fe-05e6-4fc9-acf0-076574bc35f7',
          InvoiceTypeCode: '380',
          Properties: [],
          SettlementBusinessIds: [],
          approveStatus: '11'
        }
      ]

      const rejectTestData = await RequestApproval.build({
        requestId: requestId,
        contractId: contractId,
        approveRouteId: approveRouteId,
        invoiceId: invoiceId,
        requester: userId,
        status: '12',
        message: message,
        create: '2021-01-25T08:45:49.803Z',
        isSaved: true
      })

      tradeshiftDTOGetDocuments.mockReturnValue(searchResult1)
      const resultGetDocument = require('../mockInvoice/invoice3')
      tradeshiftDTOGetDocument.mockReturnValue(resultGetDocument)
      accessTradeshiftSpy.mockReturnValue(userInfo)
      tradeshiftDTOGetDocumentSearch.mockReturnValueOnce(resultGetDocumentSearch)
      requestApprovalFindOne.mockReturnValueOnce(rejectTestData)

      const result = await inboxController.getSearchResult(tradeshiftDTO, keyword, contractId, tenantId)

      // 結果確認
      expect(result).toEqual([
        {
          no: 1,
          invoiceNo: 'PBI2848buyer2_入金確認済み',
          status: 0,
          currency: 'JPY',
          ammount: '1,000',
          sentTo: 'バイヤー2',
          sentBy: 'サプライヤー2',
          updated: '2021-12-16',
          expire: '2021-12-23',
          documentId: '48c8e45e-376f-5f02-a1a4-5862c5c35baf',
          approveStatus: '12',
          managerInfo: {
            managerAddress: '-',
            managerName: '（ユーザー登録なし）'
          }
        }
      ])
    })

    test('正常：ステータスが未処理の請求書の場合', async () => {
      // パラメータ作成
      const contractId = '343b34d1-f4db-484e-b822-8e2ce9017d14'
      const tradeshiftDTO = new TradeshiftDTO(accessToken, refreshToken, tenantId)
      const keyword = {
        invoiceNumber: 'buyer2',
        issueDate: ['2022-03-01', '2022-04-01'],
        sentBy: [],
        status: ['80', '10', '11', '12'],
        contactEmail: 'abc@test.co.jp',
        unKnownManager: undefined
      }

      const resultGetDocumentSearch = [
        {
          ID: 'PBI2848buyer2_入金確認済み',
          URI: 'https://api-sandbox.tradeshift.com/tradeshift/rest/external/documents/48c8e45e-376f-5f02-a1a4-5862c5c35baf',
          DocumentType: { type: 'invoice' },
          State: 'LOCKED',
          CreatedDateTime: '2021-12-16T07:34:03.248Z',
          Actor: {
            Created: '2021-07-27T08:58:14.266Z',
            Modified: '2021-07-27T08:58:14.266Z',
            FirstName: '管理者1',
            LastName: 'サプライヤー2',
            Email: 'dev.master.bconnection+supplier2.001@gmail.com',
            MobileNumberVerified: false
          },
          ApplicationResponse: { ResponseDate: '2021-12-16' },
          ConversationId: '48b89f82-c92e-4356-8ce7-66781b7d3d55',
          Tags: { Tag: [] },
          ItemInfos: [
            { type: 'document.currency' },
            { type: 'document.total' },
            { type: 'document.issuedate', value: '2022-04-01' }
          ],
          ProcessState: 'PENDING',
          ConversationStates: [[Object], [Object]],
          CopyIndicator: false,
          Deleted: false,
          TenantId: '7e5255fe-05e6-4fc9-acf0-076574bc35f7',
          InvoiceTypeCode: '380',
          Properties: [],
          SettlementBusinessIds: []
        }
      ]

      tradeshiftDTOGetDocuments.mockReturnValue(searchResult1)
      tradeshiftDTOGetDocumentSearch.mockReturnValueOnce(resultGetDocumentSearch)
      const resultGetDocument = require('../mockInvoice/invoice1')
      tradeshiftDTOGetDocument.mockReturnValue(resultGetDocument)
      accessTradeshiftSpy.mockReturnValue(userInfo)
      requestApprovalFindOne.mockReturnValueOnce(null)

      const result = await inboxController.getSearchResult(tradeshiftDTO, keyword, contractId, tenantId)

      // 結果確認
      expect(result).toEqual([
        {
          no: 1,
          invoiceNo: 'PBI2848buyer2_入金確認済み',
          status: '-',
          currency: '-',
          ammount: 'NaN',
          sentTo: '-',
          sentBy: '-',
          updated: '-',
          expire: '-',
          documentId: undefined,
          approveStatus: '',
          managerInfo: {
            managerAddress: '-',
            managerName: '（ユーザー登録なし）'
          }
        }
      ])
    })

    test('正常:担当者不明の請求書をチェックした場合', async () => {
      // パラメータ作成
      const requestId = '111b34d1-f4db-484e-b822-8e2ce9017d14'
      const contractId = '343b34d1-f4db-484e-b822-8e2ce9017d14'
      const approveRouteId = 'eb9835ae-afc7-4a55-92b3-9df762b3d6e6'
      const invoiceId = '48c8e45e-376f-5f02-a1a4-5862c5c35baf'
      const message = 'messege'
      const userId = '12345678-cb0b-48ad-857d-4b42a44ede13'

      const tradeshiftDTO = new TradeshiftDTO(accessToken, refreshToken, tenantId)
      const keyword = {
        invoiceNumber: 'buyer2',
        issueDate: ['2022-03-01', '2022-04-01'],
        sentBy: ['011c0e85-aabb-437b-9dcd-5b941dd4e1aa'],
        status: ['80', '10', '11', '12'],
        contactEmail: 'abc@test.co.jp',
        unKnownManager: 'unKnownManager'
      }

      const resultGetDocumentSearch = [
        {
          DocumentId: '48c8e45e-376f-5f02-a1a4-5862c5c35baf',
          ID: 'PBI2848buyer2_入金確認済み',
          URI: 'https://api-sandbox.tradeshift.com/tradeshift/rest/external/documents/48c8e45e-376f-5f02-a1a4-5862c5c35baf',
          DocumentType: { type: 'invoice' },
          State: 'LOCKED',
          CreatedDateTime: '2021-12-16T07:34:03.248Z',
          LastEdit: '2021-12-16T07:34:03.248Z',
          SenderCompanyName: 'バイヤー2',
          Actor: {
            Created: '2021-07-27T08:58:14.266Z',
            Modified: '2021-07-27T08:58:14.266Z',
            FirstName: '管理者1',
            LastName: 'サプライヤー2',
            Email: 'dev.master.bconnection+supplier2.001@gmail.com',
            MobileNumberVerified: false
          },
          ApplicationResponse: { ResponseDate: '2021-12-16' },
          ConversationId: '48b89f82-c92e-4356-8ce7-66781b7d3d55',
          ReceiverCompanyName: 'サプライヤー2',
          Tags: { Tag: [] },
          ItemInfos: [
            { type: 'document.currency', value: 'JPY' },
            { type: 'document.total', value: '1000.00' },
            { type: 'document.issuedate', value: '2022-04-01' }
          ],
          ProcessState: 'PENDING',
          ConversationStates: [[Object], [Object]],
          UnifiedState: 'PAID_CONFIRMED',
          CopyIndicator: false,
          Deleted: false,
          DueDate: '2021-12-23',
          TenantId: '7e5255fe-05e6-4fc9-acf0-076574bc35f7',
          InvoiceTypeCode: '380',
          Properties: [],
          SettlementBusinessIds: []
        }
      ]
      const resultGetDocument = require('../mockInvoice/invoice1')
      tradeshiftDTOGetDocument.mockReturnValue(resultGetDocument)
      accessTradeshiftSpy.mockReturnValue(userInfo)

      const rejectTestData = await RequestApproval.build({
        requestId: requestId,
        contractId: contractId,
        approveRouteId: approveRouteId,
        invoiceId: invoiceId,
        requester: userId,
        status: '10',
        message: message,
        create: '2021-01-25T08:45:49.803Z',
        isSaved: true
      })

      tradeshiftDTOGetDocuments.mockReturnValue(searchResult1)
      tradeshiftDTOGetDocumentSearch.mockReturnValueOnce(resultGetDocumentSearch)
      requestApprovalFindOne.mockReturnValueOnce(rejectTestData)

      const result = await inboxController.getSearchResult(tradeshiftDTO, keyword, contractId, tenantId)

      // 結果確認
      expect(result).toEqual([
        {
          no: 1,
          invoiceNo: 'PBI2848buyer2_入金確認済み',
          status: 0,
          currency: 'JPY',
          ammount: '1,000',
          sentTo: 'バイヤー2',
          sentBy: 'サプライヤー2',
          updated: '2021-12-16',
          expire: '2021-12-23',
          documentId: '48c8e45e-376f-5f02-a1a4-5862c5c35baf',
          approveStatus: '10',
          managerInfo: {
            managerAddress: '-',
            managerName: '（ユーザー登録なし）'
          }
        }
      ])
    })

    test('正常：合計金額がない場合', async () => {
      // パラメータ作成
      const requestId = '111b34d1-f4db-484e-b822-8e2ce9017d14'
      const contractId = '343b34d1-f4db-484e-b822-8e2ce9017d14'
      const approveRouteId = 'eb9835ae-afc7-4a55-92b3-9df762b3d6e6'
      const invoiceId = '48c8e45e-376f-5f02-a1a4-5862c5c35baf'
      const message = 'messege'
      const userId = '12345678-cb0b-48ad-857d-4b42a44ede13'

      const tradeshiftDTO = new TradeshiftDTO(accessToken, refreshToken, tenantId)
      const keyword = {
        invoiceNumber: 'buyer2',
        issueDate: ['2022-03-01', '2022-04-01'],
        sentBy: ['011c0e85-aabb-437b-9dcd-5b941dd4e1aa'],
        status: ['80', '10', '11', '12'],
        contactEmail: 'abc@test.co.jp',
        unKnownManager: undefined
      }

      const resultGetDocumentSearch = [
        {
          DocumentId: '48c8e45e-376f-5f02-a1a4-5862c5c35baf',
          ID: 'PBI2848buyer2_入金確認済み',
          URI: 'https://api-sandbox.tradeshift.com/tradeshift/rest/external/documents/48c8e45e-376f-5f02-a1a4-5862c5c35baf',
          DocumentType: { type: 'invoice' },
          State: 'LOCKED',
          CreatedDateTime: '2021-12-16T07:34:03.248Z',
          LastEdit: '2021-12-16T07:34:03.248Z',
          SenderCompanyName: 'バイヤー2',
          Actor: {
            Created: '2021-07-27T08:58:14.266Z',
            Modified: '2021-07-27T08:58:14.266Z',
            FirstName: '管理者1',
            LastName: 'サプライヤー2',
            Email: 'dev.master.bconnection+supplier2.001@gmail.com',
            MobileNumberVerified: false
          },
          ApplicationResponse: { ResponseDate: '2021-12-16' },
          ConversationId: '48b89f82-c92e-4356-8ce7-66781b7d3d55',
          ReceiverCompanyName: 'サプライヤー2',
          Tags: { Tag: [] },
          ItemInfos: [{ type: 'document.currency', value: 'JPY' }],
          ProcessState: 'PENDING',
          ConversationStates: [[Object], [Object]],
          UnifiedState: 'PAID_CONFIRMED',
          CopyIndicator: false,
          Deleted: false,
          DueDate: '2021-12-23',
          TenantId: '7e5255fe-05e6-4fc9-acf0-076574bc35f7',
          InvoiceTypeCode: '380',
          Properties: [],
          SettlementBusinessIds: []
        }
      ]

      const rejectTestData = await RequestApproval.build({
        requestId: requestId,
        contractId: contractId,
        approveRouteId: approveRouteId,
        invoiceId: invoiceId,
        requester: userId,
        status: '10',
        message: message,
        create: '2021-01-25T08:45:49.803Z',
        isSaved: true
      })

      tradeshiftDTOGetDocuments.mockReturnValue(searchResult1)
      tradeshiftDTOGetDocumentSearch.mockReturnValueOnce(resultGetDocumentSearch)
      const resultGetDocument = require('../mockInvoice/invoice1')
      tradeshiftDTOGetDocument.mockReturnValue(resultGetDocument)
      accessTradeshiftSpy.mockReturnValue(userInfo)
      requestApprovalFindOne.mockReturnValueOnce(rejectTestData)

      const result = await inboxController.getSearchResult(tradeshiftDTO, keyword, contractId, tenantId)

      // 結果確認
      expect(result).toEqual([
        {
          no: 1,
          invoiceNo: 'PBI2848buyer2_入金確認済み',
          status: 0,
          currency: 'JPY',
          ammount: '-',
          sentTo: 'バイヤー2',
          sentBy: 'サプライヤー2',
          updated: '2021-12-16',
          expire: '2021-12-23',
          documentId: '48c8e45e-376f-5f02-a1a4-5862c5c35baf',
          approveStatus: '10',
          managerInfo: {
            managerAddress: '-',
            managerName: '（ユーザー登録なし）'
          }
        }
      ])
    })

    test('正常：検索結果が０件の場合', async () => {
      // パラメータ作成
      const requestId = '111b34d1-f4db-484e-b822-8e2ce9017d14'
      const contractId = '343b34d1-f4db-484e-b822-8e2ce9017d14'
      const approveRouteId = 'eb9835ae-afc7-4a55-92b3-9df762b3d6e6'
      const invoiceId = '48c8e45e-376f-5f02-a1a4-5862c5c35baf'
      const message = 'messege'
      const userId = '12345678-cb0b-48ad-857d-4b42a44ede13'

      const tradeshiftDTO = new TradeshiftDTO(accessToken, refreshToken, tenantId)
      const keyword = {
        invoiceNumber: 'abc',
        issueDate: ['2022-03-01', '2022-04-01'],
        sentBy: [],
        status: ['80', '10', '11', '12'],
        contactEmail: 'abc@test.co.jp',
        unKnownManager: undefined
      }

      const resultGetDocumentSearch = []

      const rejectTestData = await RequestApproval.build({
        requestId: requestId,
        contractId: contractId,
        approveRouteId: approveRouteId,
        invoiceId: invoiceId,
        requester: userId,
        status: '12',
        message: message,
        create: '2021-01-25T08:45:49.803Z',
        isSaved: true
      })

      tradeshiftDTOGetDocuments.mockReturnValue(searchResult1)
      tradeshiftDTOGetDocumentSearch.mockReturnValueOnce(resultGetDocumentSearch)
      requestApprovalFindOne.mockReturnValueOnce(rejectTestData)

      const result = await inboxController.getSearchResult(tradeshiftDTO, keyword, contractId, tenantId)

      // 結果確認
      expect(result).toEqual([])
    })

    test('正常：キーワード無の場合', async () => {
      // パラメータ作成
      const contractId = '343b34d1-f4db-484e-b822-8e2ce9017d14'

      const tradeshiftDTO = new TradeshiftDTO(accessToken, refreshToken, tenantId)
      const keyword = {
        invoiceNumber: '',
        issueDate: ['', ''],
        sentBy: [],
        status: [],
        contactEmail: '',
        unKnownManager: undefined
      }

      tradeshiftDTOGetDocuments.mockReturnValue(searchResult1)
      const tradeshiftDocumentTable = require('../mockDB/TradeshiftDocumentsTable')
      tradeshiftDTOGetDocumentSearch.mockReturnValueOnce(tradeshiftDocumentTable)
      const resultGetDocument = require('../mockInvoice/invoice1')
      tradeshiftDTOGetDocument.mockReturnValue(resultGetDocument)
      accessTradeshiftSpy.mockReturnValue(userInfo)
      requestApprovalFindOne.mockReturnValue(null)

      const result = await inboxController.getSearchResult(tradeshiftDTO, keyword, contractId, tenantId)

      const expectedResult = tradeshiftDocumentTable.map((document, idx) => {
        const ammount = function () {
          if (document.ItemInfos[1] === undefined) return '-'
          return Math.floor(document.ItemInfos[1].value).toLocaleString('ja-JP')
        }
        return {
          no: idx + 1,
          invoiceNo: document.ID,
          status: processStatus[`${document.UnifiedState}`] ?? '-',
          currency: document.ItemInfos[0].value ?? '-',
          ammount: ammount(),
          sentTo: document.SenderCompanyName ?? '-',
          sentBy: document.ReceiverCompanyName ?? '-',
          updated: document.LastEdit !== undefined ? document.LastEdit.substring(0, 10) : '-',
          expire: document.DueDate ?? '-',
          documentId: document.DocumentId,
          approveStatus: document.approveStatus ?? '',
          managerInfo: {
            managerAddress: '-',
            managerName: '（ユーザー登録なし）'
          }
        }
      })

      // 結果確認
      expect(result).toEqual(expectedResult)
    })

    test('正常：複数企業の検索', async () => {
      // パラメータ作成
      const contractId = '343b34d1-f4db-484e-b822-8e2ce9017d14'

      const tradeshiftDTO = new TradeshiftDTO(accessToken, refreshToken, tenantId)
      const keyword = {
        invoiceNumber: '',
        issueDate: ['', ''],
        sentBy: ['11367bd9-9710-4772-bdf7-10be2085976c', '9bd4923d-1b65-43b9-9b8d-34dbd1c9ac40'],
        status: [],
        contactEmail: '',
        unKnownManager: undefined
      }

      tradeshiftDTOGetDocuments.mockReturnValue(searchResult1)
      const tradeshiftDocumentTable = require('../mockDB/TradeshiftDocumentsTable')
      tradeshiftDTOGetDocumentSearch.mockReturnValueOnce([tradeshiftDocumentTable[0], tradeshiftDocumentTable[1]])
      tradeshiftDTOGetDocumentSearch.mockReturnValueOnce([tradeshiftDocumentTable[2]])
      const resultGetDocument = require('../mockInvoice/invoice1')
      tradeshiftDTOGetDocument.mockReturnValue(resultGetDocument)
      accessTradeshiftSpy.mockReturnValue(userInfo)
      requestApprovalFindOne.mockReturnValue(null)

      const result = await inboxController.getSearchResult(tradeshiftDTO, keyword, contractId, tenantId)

      const expectedResult = tradeshiftDocumentTable.map((document, idx) => {
        const ammount = function () {
          if (document.ItemInfos[1] === undefined) return '-'
          return Math.floor(document.ItemInfos[1].value).toLocaleString('ja-JP')
        }
        return {
          no: idx + 1,
          invoiceNo: document.ID,
          status: processStatus[`${document.UnifiedState}`] ?? '-',
          currency: document.ItemInfos[0].value ?? '-',
          ammount: ammount(),
          sentTo: document.SenderCompanyName ?? '-',
          sentBy: document.ReceiverCompanyName ?? '-',
          updated: document.LastEdit !== undefined ? document.LastEdit.substring(0, 10) : '-',
          expire: document.DueDate ?? '-',
          documentId: document.DocumentId,
          approveStatus: document.approveStatus ?? '',
          managerInfo: {
            managerAddress: '-',
            managerName: '（ユーザー登録なし）'
          }
        }
      })

      // 結果確認
      expect(result).toEqual(expectedResult)
    })

    test('正常：タグがない請求書がある場合', async () => {
      // パラメータ作成
      const requestId = '111b34d1-f4db-484e-b822-8e2ce9017d14'
      const contractId = '343b34d1-f4db-484e-b822-8e2ce9017d14'
      const approveRouteId = 'eb9835ae-afc7-4a55-92b3-9df762b3d6e6'
      const invoiceId = '48c8e45e-376f-5f02-a1a4-5862c5c35baf'
      const message = 'messege'
      const userId = '12345678-cb0b-48ad-857d-4b42a44ede13'
      const tenantId = '011c0e85-aabb-437b-9dcd-5b941dd4e1aa'

      const tradeshiftDTO = new TradeshiftDTO(accessToken, refreshToken, tenantId)
      const keyword = {
        invoiceNumber: 'buyer2',
        issueDate: ['2022-03-01', '2022-04-01'],
        sentBy: [],
        status: ['80', '10', '11', '12'],
        contactEmail: 'abc@test.co.jp',
        unKnownManager: undefined
      }

      const resultGetDocumentSearch = [
        {
          DocumentId: '48c8e45e-376f-5f02-a1a4-5862c5c35baf',
          ID: 'PBI2848buyer2_入金確認済み',
          URI: 'https://api-sandbox.tradeshift.com/tradeshift/rest/external/documents/48c8e45e-376f-5f02-a1a4-5862c5c35baf',
          DocumentType: { type: 'invoice' },
          State: 'LOCKED',
          CreatedDateTime: '2021-12-16T07:34:03.248Z',
          LastEdit: '2021-12-16T07:34:03.248Z',
          SenderCompanyName: 'バイヤー2',
          Actor: {
            Created: '2021-07-27T08:58:14.266Z',
            Modified: '2021-07-27T08:58:14.266Z',
            FirstName: '管理者1',
            LastName: 'サプライヤー2',
            Email: 'dev.master.bconnection+supplier2.001@gmail.com',
            MobileNumberVerified: false
          },
          ApplicationResponse: { ResponseDate: '2021-12-16' },
          ConversationId: '48b89f82-c92e-4356-8ce7-66781b7d3d55',
          ReceiverCompanyName: 'サプライヤー2',
          Tags: { Tag: [] },
          ItemInfos: [
            { type: 'document.currency', value: 'JPY' },
            { type: 'document.total', value: '1000.00' },
            { type: 'document.issuedate', value: '2022-04-01' }
          ],
          ProcessState: 'PENDING',
          ConversationStates: [[Object], [Object]],
          UnifiedState: 'PAID_CONFIRMED',
          CopyIndicator: false,
          Deleted: false,
          DueDate: '2021-12-23',
          TenantId: '011c0e85-aabb-437b-9dcd-5b941dd4e1aa',
          InvoiceTypeCode: '380',
          Properties: [],
          SettlementBusinessIds: []
        }
      ]

      const rejectTestData = await RequestApproval.build({
        requestId: requestId,
        contractId: contractId,
        approveRouteId: approveRouteId,
        invoiceId: invoiceId,
        requester: userId,
        status: '10',
        message: message,
        create: '2021-01-25T08:45:49.803Z',
        isSaved: true
      })

      const resultGetDocument = require('../mockInvoice/invoice1')

      tradeshiftDTOGetDocuments.mockReturnValue(searchResult1)
      tradeshiftDTOGetDocument.mockReturnValue(resultGetDocument)
      tradeshiftDTOCreateTags.mockReturnValue('')
      tradeshiftDTOGetDocumentSearch.mockReturnValueOnce(resultGetDocumentSearch)
      requestApprovalFindOne.mockReturnValueOnce(rejectTestData)

      const result = await inboxController.getSearchResult(tradeshiftDTO, keyword, contractId, tenantId)

      // 結果確認
      expect(result).toEqual([
        {
          no: 1,
          invoiceNo: 'PBI2848buyer2_入金確認済み',
          status: 0,
          currency: 'JPY',
          ammount: '1,000',
          sentTo: 'バイヤー2',
          sentBy: 'サプライヤー2',
          updated: '2021-12-16',
          expire: '2021-12-23',
          documentId: '48c8e45e-376f-5f02-a1a4-5862c5c35baf',
          approveStatus: '10',
          managerInfo: {
            managerAddress: '-',
            managerName: '（ユーザー登録なし）'
          }
        }
      ])
    })

    test('正常：タグがない請求書がある場合,担当者メールアドレスがない場合', async () => {
      // パラメータ作成
      const requestId = '111b34d1-f4db-484e-b822-8e2ce9017d14'
      const contractId = '343b34d1-f4db-484e-b822-8e2ce9017d14'
      const approveRouteId = 'eb9835ae-afc7-4a55-92b3-9df762b3d6e6'
      const invoiceId = '48c8e45e-376f-5f02-a1a4-5862c5c35baf'
      const message = 'messege'
      const userId = '12345678-cb0b-48ad-857d-4b42a44ede13'
      const tenantId = '011c0e85-aabb-437b-9dcd-5b941dd4e1aa'

      const tradeshiftDTO = new TradeshiftDTO(accessToken, refreshToken, tenantId)
      const keyword = {
        invoiceNumber: 'buyer2',
        issueDate: ['2022-03-01', '2022-04-01'],
        sentBy: [],
        status: ['80', '10', '11', '12'],
        contactEmail: 'abc@test.co.jp',
        unKnownManager: undefined
      }

      const resultGetDocumentSearch = [
        {
          DocumentId: '48c8e45e-376f-5f02-a1a4-5862c5c35baf',
          ID: 'PBI2848buyer2_入金確認済み',
          URI: 'https://api-sandbox.tradeshift.com/tradeshift/rest/external/documents/48c8e45e-376f-5f02-a1a4-5862c5c35baf',
          DocumentType: { type: 'invoice' },
          State: 'LOCKED',
          CreatedDateTime: '2021-12-16T07:34:03.248Z',
          LastEdit: '2021-12-16T07:34:03.248Z',
          SenderCompanyName: 'バイヤー2',
          Actor: {
            Created: '2021-07-27T08:58:14.266Z',
            Modified: '2021-07-27T08:58:14.266Z',
            FirstName: '管理者1',
            LastName: 'サプライヤー2',
            Email: 'dev.master.bconnection+supplier2.001@gmail.com',
            MobileNumberVerified: false
          },
          ApplicationResponse: { ResponseDate: '2021-12-16' },
          ConversationId: '48b89f82-c92e-4356-8ce7-66781b7d3d55',
          ReceiverCompanyName: 'サプライヤー2',
          Tags: { Tag: [] },
          ItemInfos: [
            { type: 'document.currency', value: 'JPY' },
            { type: 'document.total', value: '1000.00' },
            { type: 'document.issuedate', value: '2022-04-01' }
          ],
          ProcessState: 'PENDING',
          ConversationStates: [[Object], [Object]],
          UnifiedState: 'PAID_CONFIRMED',
          CopyIndicator: false,
          Deleted: false,
          DueDate: '2021-12-23',
          TenantId: '011c0e85-aabb-437b-9dcd-5b941dd4e1aa',
          InvoiceTypeCode: '380',
          Properties: [],
          SettlementBusinessIds: []
        }
      ]

      const rejectTestData = await RequestApproval.build({
        requestId: requestId,
        contractId: contractId,
        approveRouteId: approveRouteId,
        invoiceId: invoiceId,
        requester: userId,
        status: '10',
        message: message,
        create: '2021-01-25T08:45:49.803Z',
        isSaved: true
      })

      const resultGetDocument = require('../mockInvoice/invoice3')

      tradeshiftDTOGetDocuments.mockReturnValue(searchResult1)
      tradeshiftDTOGetDocument.mockReturnValue(resultGetDocument)
      tradeshiftDTOCreateTags.mockReturnValue('')
      tradeshiftDTOGetDocumentSearch.mockReturnValueOnce(resultGetDocumentSearch)
      requestApprovalFindOne.mockReturnValueOnce(rejectTestData)

      const result = await inboxController.getSearchResult(tradeshiftDTO, keyword, contractId, tenantId)

      // 結果確認
      expect(result).toEqual([
        {
          no: 1,
          invoiceNo: 'PBI2848buyer2_入金確認済み',
          status: 0,
          currency: 'JPY',
          ammount: '1,000',
          sentTo: 'バイヤー2',
          sentBy: 'サプライヤー2',
          updated: '2021-12-16',
          expire: '2021-12-23',
          documentId: '48c8e45e-376f-5f02-a1a4-5862c5c35baf',
          approveStatus: '10',
          managerInfo: {
            managerAddress: '-',
            managerName: '（ユーザー登録なし）'
          }
        }
      ])
    })

    test('正常：タグがない請求書がある場合（メールアドレスの形式が正しくない場合）', async () => {
      // パラメータ作成
      const requestId = '111b34d1-f4db-484e-b822-8e2ce9017d14'
      const contractId = '343b34d1-f4db-484e-b822-8e2ce9017d14'
      const approveRouteId = 'eb9835ae-afc7-4a55-92b3-9df762b3d6e6'
      const invoiceId = '48c8e45e-376f-5f02-a1a4-5862c5c35baf'
      const message = 'messege'
      const userId = '12345678-cb0b-48ad-857d-4b42a44ede13'
      const tenantId = '011c0e85-aabb-437b-9dcd-5b941dd4e1aa'

      const tradeshiftDTO = new TradeshiftDTO(accessToken, refreshToken, tenantId)
      const keyword = {
        invoiceNumber: 'buyer2',
        issueDate: ['2022-03-01', '2022-04-01'],
        sentBy: [],
        status: ['80', '10', '11', '12'],
        contactEmail: 'abc@test.co.jp',
        unKnownManager: undefined
      }

      const searchResultTag = {
        itemsPerPage: 20,
        itemCount: 1,
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
          }
        ]
      }

      const resultGetDocumentSearch = [
        {
          DocumentId: '48c8e45e-376f-5f02-a1a4-5862c5c35baf',
          ID: 'PBI2848buyer2_入金確認済み',
          URI: 'https://api-sandbox.tradeshift.com/tradeshift/rest/external/documents/48c8e45e-376f-5f02-a1a4-5862c5c35baf',
          DocumentType: { type: 'invoice' },
          State: 'LOCKED',
          CreatedDateTime: '2021-12-16T07:34:03.248Z',
          LastEdit: '2021-12-16T07:34:03.248Z',
          SenderCompanyName: 'バイヤー2',
          Actor: {
            Created: '2021-07-27T08:58:14.266Z',
            Modified: '2021-07-27T08:58:14.266Z',
            FirstName: '管理者1',
            LastName: 'サプライヤー2',
            Email: 'dev.master.bconnection+supplier2.001@gmail.com',
            MobileNumberVerified: false
          },
          ApplicationResponse: { ResponseDate: '2021-12-16' },
          ConversationId: '48b89f82-c92e-4356-8ce7-66781b7d3d55',
          ReceiverCompanyName: 'サプライヤー2',
          Tags: { Tag: [] },
          ItemInfos: [
            { type: 'document.currency', value: 'JPY' },
            { type: 'document.total', value: '1000.00' },
            { type: 'document.issuedate', value: '2022-04-01' }
          ],
          ProcessState: 'PENDING',
          ConversationStates: [[Object], [Object]],
          UnifiedState: 'PAID_CONFIRMED',
          CopyIndicator: false,
          Deleted: false,
          DueDate: '2021-12-23',
          TenantId: '011c0e85-aabb-437b-9dcd-5b941dd4e1aa',
          InvoiceTypeCode: '380',
          Properties: [],
          SettlementBusinessIds: []
        }
      ]

      const rejectTestData = await RequestApproval.build({
        requestId: requestId,
        contractId: contractId,
        approveRouteId: approveRouteId,
        invoiceId: invoiceId,
        requester: userId,
        status: '10',
        message: message,
        create: '2021-01-25T08:45:49.803Z',
        isSaved: true
      })

      const resultGetDocument = require('../mockInvoice/invoice2')

      tradeshiftDTOGetDocuments.mockReturnValue(searchResultTag)
      tradeshiftDTOGetDocument.mockReturnValue(resultGetDocument)
      tradeshiftDTOCreateTags.mockReturnValue('')
      tradeshiftDTOGetDocumentSearch.mockReturnValueOnce(resultGetDocumentSearch)
      requestApprovalFindOne.mockReturnValueOnce(rejectTestData)

      const result = await inboxController.getSearchResult(tradeshiftDTO, keyword, contractId, tenantId)

      // 結果確認
      expect(logger.warn).toHaveBeenCalledWith(
        `contractId:${contractId}, DocumentId:${searchResultTag.Document[0].DocumentId}, msg: ${constantsDefine.statusConstants.FAILED_TO_CREATE_TAG}(${constantsDefine.statusConstants.INVOICE_CONTACT_EMAIL_NOT_VERIFY})`
      )
      expect(result).toEqual([
        {
          no: 1,
          invoiceNo: 'PBI2848buyer2_入金確認済み',
          status: 0,
          currency: 'JPY',
          ammount: '1,000',
          sentTo: 'バイヤー2',
          sentBy: 'サプライヤー2',
          updated: '2021-12-16',
          expire: '2021-12-23',
          documentId: '48c8e45e-376f-5f02-a1a4-5862c5c35baf',
          approveStatus: '10',
          managerInfo: {
            managerAddress: '-',
            managerName: '（ユーザー登録なし）'
          }
        }
      ])
    })

    test('異常：検索結果がnullの場合', async () => {
      // パラメータ作成
      const requestId = '111b34d1-f4db-484e-b822-8e2ce9017d14'
      const contractId = '343b34d1-f4db-484e-b822-8e2ce9017d14'
      const approveRouteId = 'eb9835ae-afc7-4a55-92b3-9df762b3d6e6'
      const invoiceId = '48c8e45e-376f-5f02-a1a4-5862c5c35baf'
      const message = 'messege'
      const userId = '12345678-cb0b-48ad-857d-4b42a44ede13'

      const tradeshiftDTO = new TradeshiftDTO(accessToken, refreshToken, tenantId)
      const keyword = {
        invoiceNumber: 'abc',
        issueDate: ['2022-03-01', '2022-04-01'],
        sentBy: [],
        status: ['80', '10', '11', '12'],
        contactEmail: 'abc@test.co.jp',
        unKnownManager: undefined
      }

      const resultGetDocumentSearch = null

      const rejectTestData = await RequestApproval.build({
        requestId: requestId,
        contractId: contractId,
        approveRouteId: approveRouteId,
        invoiceId: invoiceId,
        requester: userId,
        status: '12',
        message: message,
        create: '2021-01-25T08:45:49.803Z',
        isSaved: true
      })

      tradeshiftDTOGetDocuments.mockReturnValue(searchResult1)
      tradeshiftDTOGetDocumentSearch.mockReturnValueOnce(resultGetDocumentSearch)
      requestApprovalFindOne.mockReturnValueOnce(rejectTestData)

      const result = await inboxController.getSearchResult(tradeshiftDTO, keyword, contractId, tenantId)

      // 結果確認
      expect(result).toEqual(new Error("Cannot read property 'length' of null"))
    })

    test('異常：検索結果でAPIエラーの場合（getDocumentSearch）', async () => {
      // パラメータ作成
      const tradeshiftDTO = new TradeshiftDTO(accessToken, refreshToken, tenantId)
      const keyword = {
        invoiceNumber: 'abc',
        issueDate: ['2022-03-01', '2022-04-01'],
        sentBy: [],
        status: ['80', '10', '11', '12'],
        contactEmail: 'abc@test.co.jp',
        unKnownManager: undefined
      }

      const resultGetDocumentSearch = new Error()

      tradeshiftDTOGetDocuments.mockReturnValue(searchResult1)
      tradeshiftDTOGetDocumentSearch.mockReturnValueOnce(resultGetDocumentSearch)

      const result = await inboxController.getSearchResult(tradeshiftDTO, keyword, contractId, tenantId)

      // 結果確認
      expect(result).toEqual(resultGetDocumentSearch)
    })

    test('異常：検索結果でAPIエラーの場合（getDocuments）', async () => {
      const tradeshiftDTO = new TradeshiftDTO(accessToken, refreshToken, tenantId)
      const keyword = {
        invoiceNumber: 'abc',
        issueDate: ['2022-03-01', '2022-04-01'],
        sentBy: [],
        status: [],
        contactEmail: 'abc@test.co.jp',
        unKnownManager: undefined
      }

      const getDocumentsError = new Error()

      tradeshiftDTOGetDocuments.mockReturnValue(getDocumentsError)

      const result = await inboxController.getSearchResult(tradeshiftDTO, keyword, contractId, tenantId)

      // 結果確認
      expect(result).toEqual(getDocumentsError)
    })

    test('異常：検索結果でAPIエラーの場合（getDocument）', async () => {
      // パラメータ作成
      const contractId = '343b34d1-f4db-484e-b822-8e2ce9017d14'
      const tenantId = '011c0e85-aabb-437b-9dcd-5b941dd4e1aa'

      const tradeshiftDTO = new TradeshiftDTO(accessToken, refreshToken, tenantId)
      const keyword = {
        invoiceNumber: 'abc',
        issueDate: ['2022-03-01', '2022-04-01'],
        sentBy: [],
        status: [],
        contactEmail: 'abc@test.co.jp',
        unKnownManager: undefined
      }

      const getDocumentError = new Error()

      tradeshiftDTOGetDocuments.mockReturnValue(searchResult1)
      tradeshiftDTOGetDocument.mockReturnValue(getDocumentError)

      const result = await inboxController.getSearchResult(tradeshiftDTO, keyword, contractId, tenantId)

      // 結果確認
      expect(result).toEqual(getDocumentError)
    })
  })
})
