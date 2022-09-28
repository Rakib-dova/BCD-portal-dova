'use strict'
jest.mock('../../../Application/node_modules/express', () => {
  return require('jest-express')
})

const Request = require('jest-express').Request
const Response = require('jest-express').Response
const next = require('jest-express').Next

const requestApproval = require('../../../Application/routes/requestApproval')
const helper = require('../../../Application/routes/helpers/middleware')
const apiManager = require('../../../Application/controllers/apiManager')
const userController = require('../../../Application/controllers/userController')
const contractController = require('../../../Application/controllers/contractController')
const approverController = require('../../../Application/controllers/approverController')
const requestApprovalController = require('../../../Application/controllers/requestApprovalController.js') // requestApprovalController.findOneRequestApproval() でエラーを出力させない為に必要
const logger = require('../../../Application/lib/logger.js')

let request, response, infoSpy
let userControllerFindOneSpy, contractControllerFindOneSpy, checkContractStatusSpy, accessTradeshiftSpy
let checkApproveRouteSpy, requestApprovalSpy, saveApprovalSpy, findOneRequestApprovalSpy

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
  userContext: 'LoggedIn',
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
    checkApproveRouteSpy = jest.spyOn(approverController, 'checkApproveRoute')
    requestApprovalSpy = jest.spyOn(approverController, 'requestApproval')
    saveApprovalSpy = jest.spyOn(approverController, 'saveApproval')
    findOneRequestApprovalSpy = jest.spyOn(requestApprovalController, 'findOneRequestApproval')
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
    accessTradeshiftSpy.mockRestore()
    checkApproveRouteSpy.mockRestore()
    requestApprovalSpy.mockRestore()
    saveApprovalSpy.mockRestore()
    findOneRequestApprovalSpy.mockRestore()
  })

  describe('支払依頼申請', () => {
    test('支払依頼が失敗する場合', async () => {
      request.params = { invoiceId: 'dummyInvoiceId' }
      request.body = { message: 'dummyMessage', approveRouteId: 'dummyApproveRouteId' }
      userControllerFindOneSpy.mockResolvedValue({ dataValues: { userId: 'dummyUserId', userRole: 'a6a3edcd-00d9-427c-bf03-4ef0112ba16d', userStatus: 0 } })
      contractControllerFindOneSpy.mockResolvedValue({ dataValues: { contractId: '232457c2-07af-4235-8fff-6dfa32e37f5e', deleteFlag: false } })
      checkContractStatusSpy.mockResolvedValue(10)
      accessTradeshiftSpy.mockResolvedValue({})
      checkApproveRouteSpy.mockResolvedValue(false) // 承認ルートバリデーションに失敗

      await requestApproval.cbPostApproval(request, response, next)

      expect(response.redirect).toHaveBeenCalledWith(`/requestApproval/${request.params.invoiceId}`)
      expect(infoSpy).nthCalledWith(2, { action: 'requestApprovalRequest', tenantId: 'dummyTenantId' })
      expect(infoSpy).not.nthCalledWith(3, {
        tenantId: 'dummyTenantId',
        action: 'requestedApprovalInfo',
        requestId: 'dummyRequestId',
        invoiceId: 'dummyInvoiceId',
        requesterId: '388014b9-d667-4144-9cc4-5da420981438',
        approveRouteId: 'dummyApproveRouteId',
        status: 'dummyStatus'
      })
    })

    test('支払依頼が成功する場合', async () => {
      request.params = { invoiceId: 'dummyInvoiceId' }
      request.body = { message: 'dummyMessage', approveRouteId: 'dummyApproveRouteId' }
      userControllerFindOneSpy.mockResolvedValue({ dataValues: { userId: 'dummyUserId', userRole: 'a6a3edcd-00d9-427c-bf03-4ef0112ba16d', userStatus: 0 } })
      contractControllerFindOneSpy.mockResolvedValue({ dataValues: { contractId: '232457c2-07af-4235-8fff-6dfa32e37f5e', deleteFlag: false } })
      checkContractStatusSpy.mockResolvedValue(10)
      accessTradeshiftSpy.mockResolvedValue({})
      checkApproveRouteSpy.mockResolvedValue(true)
      requestApprovalSpy.mockResolvedValue({ requestId: 'dummyRequestId', status: 'dummyStatus' })
      saveApprovalSpy.mockResolvedValue(0)
      findOneRequestApprovalSpy.mockResolvedValue({}) // requestApprovalController.findOneRequestApproval() でエラーを出力させない為に必要

      await requestApproval.cbPostApproval(request, response, next)

      expect(infoSpy).nthCalledWith(2, { action: 'requestApprovalRequest', tenantId: 'dummyTenantId' })
      expect(infoSpy).nthCalledWith(3, {
        tenantId: 'dummyTenantId',
        action: 'requestedApprovalInfo',
        requestId: 'dummyRequestId',
        invoiceId: 'dummyInvoiceId',
        requesterId: '388014b9-d667-4144-9cc4-5da420981438',
        approveRouteId: 'dummyApproveRouteId',
        status: 'dummyStatus'
      })
    })
  })
})
