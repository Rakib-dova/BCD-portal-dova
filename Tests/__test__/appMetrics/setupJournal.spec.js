'use strict'
jest.mock('../../../Application/node_modules/express', () => {
  return require('jest-express')
})

const Request = require('jest-express').Request
const Response = require('jest-express').Response
const next = require('jest-express').Next

const inbox = require('../../../Application/routes/inbox')

const helper = require('../../../Application/routes/helpers/middleware')
const errorHelper = require('../../../Application/routes/helpers/error')
const userController = require('../../../Application/controllers/userController')
const contractController = require('../../../Application/controllers/contractController')
const inboxController = require('../../../Application/controllers/inboxController')
const logger = require('../../../Application/lib/logger.js')

let request, response, infoSpy
let userControllerFindOneSpy, contractControllerFindOneSpy, checkContractStatusSpy
let insertAndUpdateJournalizeInvoiceSpy

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
    userControllerFindOneSpy = jest.spyOn(userController, 'findOne')
    contractControllerFindOneSpy = jest.spyOn(contractController, 'findOne')
    insertAndUpdateJournalizeInvoiceSpy = jest.spyOn(inboxController, 'insertAndUpdateJournalizeInvoice')
    request.flash = jest.fn()
  })
  afterEach(() => {
    request.resetMocked()
    response.resetMocked()
    next.mockReset()
    infoSpy.mockRestore()
    userControllerFindOneSpy.mockRestore()
    contractControllerFindOneSpy.mockRestore()
    checkContractStatusSpy.mockRestore()
    insertAndUpdateJournalizeInvoiceSpy.mockRestore()
  })

  describe('仕分情報設定', () => {
    test('仕分情報設定に失敗する場合', async () => {
      request.params = { invoiceId: '232457c2-07af-4235-8fff-6dfa32e37f5e' }
      userControllerFindOneSpy.mockResolvedValue({ dataValues: { userId: 'dummyUserId', userRole: 'a6a3edcd-00d9-427c-bf03-4ef0112ba16d', userStatus: 0 } })
      contractControllerFindOneSpy.mockResolvedValue({ dataValues: { contractId: '232457c2-07af-4235-8fff-6dfa32e37f5e', deleteFlag: false } })
      checkContractStatusSpy.mockResolvedValue(10)
      insertAndUpdateJournalizeInvoiceSpy.mockResolvedValue({
        status: 0,
        lineId: 'dummyLineId',
        accountCode: 'dummyAccountCode',
        subAccountCode: 'dummySubAccountCode',
        departmentCode: 'dummyDepartmentCode',
        error: new Error('DB error')
      })

      await inbox.cbPostIndex(request, response, next)

      expect(next).toHaveBeenCalledWith(errorHelper.create(500))
      expect(infoSpy).nthCalledWith(2, { action: 'journalSetupRequest', tenantId: 'dummyTenantId' })
      expect(infoSpy).not.nthCalledWith(3, {
        action: 'setupJournalInfo',
        tenantId: 'dummyTenantId',
        status: 0,
        accountCode: 'dummyAccountCode',
        subAccountCode: 'dummySubAccountCode',
        departmentCode: 'dummyDepartmentCode'
      })
    })

    test('仕分情報設定に成功する場合', async () => {
      request.params = { invoiceId: '232457c2-07af-4235-8fff-6dfa32e37f5e' }
      userControllerFindOneSpy.mockResolvedValue({ dataValues: { userId: 'dummyUserId', userRole: 'a6a3edcd-00d9-427c-bf03-4ef0112ba16d', userStatus: 0 } })
      contractControllerFindOneSpy.mockResolvedValue({ dataValues: { contractId: '232457c2-07af-4235-8fff-6dfa32e37f5e', deleteFlag: false } })
      checkContractStatusSpy.mockResolvedValue(10)
      insertAndUpdateJournalizeInvoiceSpy.mockResolvedValue({
        status: 0,
        lineId: 'dummyLineId',
        accountCode: 'dummyAccountCode',
        subAccountCode: 'dummySubAccountCode',
        departmentCode: 'dummyDepartmentCode',
        error: null
      })

      await inbox.cbPostIndex(request, response, next)

      expect(infoSpy).nthCalledWith(2, { action: 'journalSetupRequest', tenantId: 'dummyTenantId' })
      expect(infoSpy).nthCalledWith(3, {
        action: 'setupJournalInfo',
        tenantId: 'dummyTenantId',
        status: 0,
        accountCode: 'dummyAccountCode',
        subAccountCode: 'dummySubAccountCode',
        departmentCode: 'dummyDepartmentCode'
      })
    })
  })
})
