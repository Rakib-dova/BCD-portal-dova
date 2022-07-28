'use strict'
jest.mock('../../../Application/node_modules/express', () => {
  return require('jest-express')
})
const helper = require('../../../Application/routes/helpers/middleware')
const isAuthenticatedSpy = jest.spyOn(helper, 'isAuthenticated')
const isTenantRegisteredSpy = jest.spyOn(helper, 'isTenantRegistered')
const isUserRegisteredSpy = jest.spyOn(helper, 'isUserRegistered')
const getContractPlanSpy = jest.spyOn(helper, 'getContractPlan')
isAuthenticatedSpy.mockImplementation((req, res, next) => next())
isTenantRegisteredSpy.mockImplementation((req, res, next) => next())
isUserRegisteredSpy.mockImplementation((req, res, next) => next())
getContractPlanSpy.mockImplementation((req, res, next) => next())

const Request = require('jest-express').Request
const Response = require('jest-express').Response
const next = require('jest-express').Next

const portal = require('../../../Application/routes/portal')
const { RequestApproval } = require('../../../Application/models')
const userController = require('../../../Application/controllers/userController')
const contractController = require('../../../Application/controllers/contractController')
const inboxController = require('../../../Application/controllers/inboxController')
const logger = require('../../../Application/lib/logger.js')

let request, response, infoSpy
let userControllerFindOneSpy, contractControllerFindOneSpy, checkContractStatusSpy
let getWorkflowSpy, findAllSpy

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
  userRole: 'dummy',
  memberSiteCoopSession: { memberSiteFlg: false }
}

describe('アプリ効果測定UT_デジトレ', () => {
  beforeEach(() => {
    request = new Request()
    request.user = user[0]
    request.session = session
    request.csrfToken = () => 'dummyCsrfToken'
    response = new Response()
    infoSpy = jest.spyOn(logger, 'info')
    checkContractStatusSpy = jest.spyOn(helper, 'checkContractStatus')
    userControllerFindOneSpy = jest.spyOn(userController, 'findOne')
    contractControllerFindOneSpy = jest.spyOn(contractController, 'findOne')
    getWorkflowSpy = jest.spyOn(inboxController, 'getWorkflow')
    findAllSpy = jest.spyOn(RequestApproval, 'findAll')
  })
  afterEach(() => {
    request.resetMocked()
    response.resetMocked()
    next.mockReset()
    infoSpy.mockRestore()
    userControllerFindOneSpy.mockRestore()
    contractControllerFindOneSpy.mockRestore()
    checkContractStatusSpy.mockRestore()
    getWorkflowSpy.mockRestore()
    findAllSpy.mockRestore()
  })

  describe('使用ブラウザ検知', () => {
    test('最初のセッションの場合', async () => {
      request.headers = { 'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/102.0.0.0 Safari/537.36' }
      userControllerFindOneSpy.mockResolvedValue({ dataValues: { userRole: 'a6a3edcd-00d9-427c-bf03-4ef0112ba16d', userStatus: 0 } })
      contractControllerFindOneSpy.mockResolvedValue({ dataValues: { contractId: '232457c2-07af-4235-8fff-6dfa32e37f5e', deleteFlag: false } })
      checkContractStatusSpy.mockResolvedValue(10)
      getWorkflowSpy.mockResolvedValue([])
      findAllSpy.mockResolvedValue([])

      await portal.cbGetIndex(request, response, next)

      expect(infoSpy).nthCalledWith(1, { action: 'detectedBrowser', tenantId: 'dummyTenantId', browser: 'chrome' })
    })

    test('同一セッションでブラウザを複数使用する場合', async () => {
      request.headers = { 'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/102.0.0.0 Safari/537.36' }
      request.session = { browserInfo: { browsers: ['firefox'] }, memberSiteCoopSession: { memberSiteFlg: false } }
      userControllerFindOneSpy.mockResolvedValue({ dataValues: { userRole: 'a6a3edcd-00d9-427c-bf03-4ef0112ba16d', userStatus: 0 } })
      contractControllerFindOneSpy.mockResolvedValue({ dataValues: { contractId: '232457c2-07af-4235-8fff-6dfa32e37f5e', deleteFlag: false } })
      checkContractStatusSpy.mockResolvedValue(10)
      getWorkflowSpy.mockResolvedValue([])
      findAllSpy.mockResolvedValue([])

      await portal.cbGetIndex(request, response, next)

      expect(infoSpy).nthCalledWith(1, { action: 'detectedBrowser', tenantId: 'dummyTenantId', browser: 'chrome' })
    })

    test('同一セッションでブラウザ検知後、同じブラウザを使用する場合', async () => {
      request.headers = { 'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/102.0.0.0 Safari/537.36' }
      request.session = { browserInfo: { browsers: ['chrome'] }, memberSiteCoopSession: { memberSiteFlg: false } }
      userControllerFindOneSpy.mockResolvedValue({ dataValues: { userRole: 'a6a3edcd-00d9-427c-bf03-4ef0112ba16d', userStatus: 0 } })
      contractControllerFindOneSpy.mockResolvedValue({ dataValues: { contractId: '232457c2-07af-4235-8fff-6dfa32e37f5e', deleteFlag: false } })
      checkContractStatusSpy.mockResolvedValue(10)
      getWorkflowSpy.mockResolvedValue([])
      findAllSpy.mockResolvedValue([])

      await portal.cbGetIndex(request, response, next)

      expect(infoSpy).not.nthCalledWith(1, { action: 'detectedBrowser', tenantId: 'dummyTenantId', browser: 'chrome' })
    })
  })
})
