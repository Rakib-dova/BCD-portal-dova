'use strict'
jest.mock('../../../Application/node_modules/express', () => {
  return require('jest-express')
})

const Request = require('jest-express').Request
const Response = require('jest-express').Response
const next = require('jest-express').Next

const journalDownloadRouter = require('../../../Application/routes/journalDownload')
const helper = require('../../../Application/routes/helpers/middleware')
const apiManager = require('../../../Application/controllers/apiManager')
const userController = require('../../../Application/controllers/userController')
const contractController = require('../../../Application/controllers/contractController')
const journalDownloadController = require('../../../Application/controllers/journalDownloadController')
const logger = require('../../../Application/lib/logger.js')

let request, response, infoSpy
let userControllerFindOneSpy, contractControllerFindOneSpy
let journalDownloadSpy
let accessTradeshiftSpy, checkContractStatusSpy

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

describe('アプリ効果測定UT_デジトレ', () => {
  beforeEach(() => {
    request = new Request()
    request.user = user[0]
    request.session = session
    response = new Response()
    infoSpy = jest.spyOn(logger, 'info')
    checkContractStatusSpy = jest.spyOn(helper, 'checkContractStatus')
    accessTradeshiftSpy = jest.spyOn(apiManager, 'accessTradeshift')
    userControllerFindOneSpy = jest.spyOn(userController, 'findOne')
    contractControllerFindOneSpy = jest.spyOn(contractController, 'findOne')
    journalDownloadSpy = jest.spyOn(journalDownloadController, 'createInvoiceDataForDownload')
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
    journalDownloadSpy.mockRestore()
  })

  describe('仕分情報ダウンロード', () => {
    test('請求書番号を指定しない場合', async () => {
      request.body = { status: ['送信済み/受信済み'], serviceDataFormat: 0, chkFinalapproval: true }
      userControllerFindOneSpy.mockResolvedValue({ dataValues: { userRole: 'a6a3edcd-00d9-427c-bf03-4ef0112ba16d', userStatus: 0 } })
      contractControllerFindOneSpy.mockResolvedValue({ dataValues: { contractId: '232457c2-07af-4235-8fff-6dfa32e37f5e', deleteFlag: false } })
      checkContractStatusSpy.mockResolvedValue(10)
      journalDownloadSpy.mockResolvedValue('dummyInvoicesString\rdummyInvoicesString2\rdummyInvoicesString3')
      accessTradeshiftSpy
        .mockResolvedValueOnce({ CompanyAccountId: 'dummyCompanyAccountId' })
        .mockResolvedValueOnce({
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

      await journalDownloadRouter.cbPostIndex(request, response, next)

      expect(infoSpy).nthCalledWith(1, 'INF001:Start - cbPostIndex')
      expect(infoSpy).nthCalledWith(2, { action: 'journalDownloadRequest', tenantId: 'dummyTenantId' })
      expect(infoSpy).nthCalledWith(3, { action: 'downloadedJournalInfo', downloadedJournalCount: 1, tenantId: 'dummyTenantId', finalApproved: true })
    })

    test('請求書番号を指定する場合', async () => {
      request.body = { status: ['送信済み/受信済み'], serviceDataFormat: 0, chkFinalapproval: true, invoiceNumber: 'test019' }
      userControllerFindOneSpy.mockResolvedValue({ dataValues: { userRole: 'a6a3edcd-00d9-427c-bf03-4ef0112ba16d', userStatus: 0 } })
      contractControllerFindOneSpy.mockResolvedValue({ dataValues: { contractId: '232457c2-07af-4235-8fff-6dfa32e37f5e', deleteFlag: false } })
      checkContractStatusSpy.mockResolvedValue(10)
      journalDownloadSpy.mockResolvedValue('dummyInvoicesString\rdummyInvoicesString2\rdummyInvoicesString3')
      accessTradeshiftSpy
        .mockResolvedValueOnce({ CompanyAccountId: 'dummyCompanyAccountId' })
        .mockResolvedValueOnce({
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

      await journalDownloadRouter.cbPostIndex(request, response, next)

      expect(infoSpy).nthCalledWith(1, 'INF001:Start - cbPostIndex')
      expect(infoSpy).nthCalledWith(2, { action: 'journalDownloadRequest', tenantId: 'dummyTenantId' })
      expect(infoSpy).nthCalledWith(3, { action: 'downloadedJournalInfo', downloadedJournalCount: 1, tenantId: 'dummyTenantId', finalApproved: true })
    })
  })
})
