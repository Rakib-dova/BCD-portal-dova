'use strict'
jest.mock('../../Application/node_modules/express', () => {
  return require('jest-express')
})

const noticeCount = require('../../Application/routes/api/noticeCount')
const Request = require('jest-express').Request
const Response = require('jest-express').Response
const next = require('jest-express').Next
const contractController = require('../../Application/controllers/contractController.js')
const approvalInboxController = require('../../Application/controllers/approvalInboxController')
const db = require('../../Application/models')
const requestApprovalModel = db.RequestApproval

describe('noticeCountのテスト', () => {
  let request,
    response,
    findOneSpyContracts,
    approvalInboxControllerHasPowerOfEditingSpy,
    requestApprovalModelFindAllSpy

  beforeEach(() => {
    request = new Request()
    response = new Response()
    findOneSpyContracts = jest.spyOn(contractController, 'findOne')
    approvalInboxControllerHasPowerOfEditingSpy = jest.spyOn(approvalInboxController, 'hasPowerOfEditing')
    requestApprovalModelFindAllSpy = jest.spyOn(requestApprovalModel, 'findAll')
  })
  afterEach(() => {
    request.resetMocked()
    response.resetMocked()
    next.mockReset()
    findOneSpyContracts.mockReset()
    approvalInboxControllerHasPowerOfEditingSpy.mockRestore()
    requestApprovalModelFindAllSpy.mockRestore()
  })

  const session = {
    userContext: 'LoggedIn',
    userRole: 'dummy'
  }

  const user = {
    userId: '12345678-cb0b-48ad-857d-4b42a44ede13',
    tenantId: '5778c070-5dd3-42db-aaa8-848424fb80f9'
  }

  const resultofRequestApprovals = [
    {
      requestId: '0e11ba9a-bd33-46f0-87db-cca918e2bb87',
      contractId: '198851fe-f220-4c7a-9aca-a08f744e45ae',
      approveRouteId: 'bdaea953-79f3-4560-8209-8d0e1710a224',
      invoiceId: 'd58ce0d1-87fb-5ea3-8abe-03549b981939',
      requester: 'c7dc9c91-41ec-4209-8c11-b68e4f84c1de',
      status: '10',
      message: 'test1234',
      create: '2022-03-15T04:59:18.436Z',
      isSaved: false
    },
    {
      requestId: '14c82982-1562-4cfb-b13a-a83578db0f39',
      contractId: '198851fe-f220-4c7a-9aca-a08f744e45ae',
      approveRouteId: 'bdaea953-79f3-4560-8209-8d0e1710a224',
      invoiceId: 'd58ce0d1-87fb-5ea3-8abe-03549b981939',
      requester: '12345678-cb0b-48ad-857d-4b42a44ede13',
      status: '90',
      message: 'test1234',
      create: '2022-03-15T04:59:18.436Z',
      isSaved: false
    }
  ]

  const Contracts = require('../mockDB/Contracts_Table')

  describe('ルーティング', () => {
    test('正常', async () => {
      // 準備
      request.session = { ...session }
      request.user = { ...user }
      findOneSpyContracts.mockReturnValueOnce(Contracts[0])
      requestApprovalModelFindAllSpy.mockReturnValueOnce(resultofRequestApprovals)
      approvalInboxControllerHasPowerOfEditingSpy.mockReturnValueOnce(true).mockReturnValueOnce(false)

      // 試験実施
      await noticeCount(request, response, next)

      // 期待結果
      // response.statusが200
      expect(response.status).toHaveBeenCalledWith(200)
      expect(response.send).toBeCalledWith({ rejectedNoticeCnt: 1, requestNoticeCnt: 1 })
    })

    test('403エラー：認証情報取得失敗した場合', async () => {
      // 試験実施
      noticeCount(request, response, next)

      // 期待結果
      // response.statusが200
      expect(response.status).toHaveBeenCalledWith(403)
    })

    test('500エラー：DBエラーが発生した場合（Contract）', async () => {
      // 準備
      request.session = { ...session }
      request.user = { ...user }
      const dbError = new Error('DB Error')
      findOneSpyContracts.mockReturnValueOnce(dbError)
      // 試験実施
      await noticeCount(request, response, next)

      // 期待結果
      // response.statusが500
      expect(response.status).toHaveBeenCalledWith(500)
    })

    test('500エラー：DBエラーが発生した場合（RequestApproval）', async () => {
      // 準備
      request.session = { ...session }
      request.user = { ...user }
      findOneSpyContracts.mockReturnValueOnce(Contracts[0])
      const dbError = new Error('DB Error')
      requestApprovalModelFindAllSpy.mockReturnValueOnce(dbError)
      approvalInboxControllerHasPowerOfEditingSpy.mockReturnValueOnce(true).mockReturnValueOnce(false)

      // 試験実施
      await noticeCount(request, response, next)

      // 期待結果
      // response.statusが500
      expect(response.status).toHaveBeenCalledWith(500)
    })

    test('500エラー：承認者確認中エラーが発生した場合', async () => {
      // 準備
      request.session = { ...session }
      request.user = { ...user }
      findOneSpyContracts.mockReturnValueOnce(Contracts[0])
      requestApprovalModelFindAllSpy.mockReturnValueOnce(resultofRequestApprovals)
      approvalInboxControllerHasPowerOfEditingSpy.mockReturnValueOnce(-1)

      // 試験実施
      await noticeCount(request, response, next)

      // 期待結果
      // response.statusが200
      expect(response.status).toHaveBeenCalledWith(500)
      expect(response.send).toBeCalledWith(null)
    })
  })
})
