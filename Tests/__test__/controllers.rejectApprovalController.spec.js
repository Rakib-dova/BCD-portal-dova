'use strict'

const logger = require('../../Application/lib/logger')
const db = require('../../Application/models')
const RequestApproval = db.RequestApproval
const Approval = db.Approval
const Status = db.ApproveStatus
const rejectApporovalController = require('../../Application/controllers/rejectApporovalController')

let requestApprovalFindOneSpy,
  statusFindOne,
  requestApprovalUpdateSpy,
  approvalUpdateSpy,
  errorSpy,
  contractId,
  documentId,
  rejectMessage
describe('rejectApporovalControllerのテスト', () => {
  beforeEach(() => {
    requestApprovalFindOneSpy = jest.spyOn(RequestApproval, 'findOne')
    statusFindOne = jest.spyOn(Status, 'findOne')
    requestApprovalUpdateSpy = jest.spyOn(RequestApproval, 'update')
    approvalUpdateSpy = jest.spyOn(Approval, 'update')
    errorSpy = jest.spyOn(logger, 'error')
  })
  afterEach(() => {
    requestApprovalFindOneSpy.mockRestore()
    statusFindOne.mockRestore()
    requestApprovalUpdateSpy.mockRestore()
    errorSpy.mockRestore()
    approvalUpdateSpy.mockRestore()
  })

  contractId = '12345678-bdac-4195-80b9-1ea64b8cb70c'
  documentId = '12348765-bdac-4195-80b9-1ea64b8cb70c'
  rejectMessage = '差し戻し'

  const returnStatus = [
    {
      no: '90',
      name: '差し戻し'
    }
  ]
  const returnRequestApproval = {
    requestId: '7889aabe-9140-4127-ae60-7170ffa3a36d',
    contractId: '198851fe-f220-4c7a-9aca-a08f744e45ae',
    approveRouteId: '588b2c5c-f85b-4e1c-8fb4-c22e60c54dfc',
    invoiceId: 'c04da83f-d059-5d9a-8d43-56e281c3901f',
    requester: '6e45c7fa-e686-440b-8697-87da6c8ab41c',
    name: '差し戻し'
  }

  describe('rejectApprove', () => {
    test('正常', async () => {
      statusFindOne.mockReturnValue(returnStatus)
      requestApprovalFindOneSpy.mockReturnValue(returnRequestApproval)
      requestApprovalUpdateSpy.mockReturnValue(true)
      approvalUpdateSpy.mockReturnValue(true)

      // 試験実施
      const result = await rejectApporovalController.rejectApprove(contractId, documentId, rejectMessage)

      // 期待結果
      // 取得した結果がReturnされていること
      expect(result).toBe(true)
    })

    test('準正常:RequestApprovalのupdateの結果がfalseの場合', async () => {
      statusFindOne.mockReturnValue(returnStatus)
      requestApprovalFindOneSpy.mockReturnValue(returnRequestApproval)
      requestApprovalUpdateSpy.mockReturnValue(false)

      // 試験実施
      const result = await rejectApporovalController.rejectApprove(contractId, documentId, rejectMessage)

      // 期待結果
      //  取得した結果がReturnされていること
      expect(result).toBe(false)
    })

    test('準正常:Approvalのupdateの結果がfalseの場合', async () => {
      statusFindOne.mockReturnValue(returnStatus)
      requestApprovalFindOneSpy.mockReturnValue(returnRequestApproval)
      requestApprovalUpdateSpy.mockReturnValue(true)
      approvalUpdateSpy.mockReturnValue(false)

      // 試験実施
      const result = await rejectApporovalController.rejectApprove(contractId, documentId, rejectMessage)

      // 期待結果
      //  取得した結果がReturnされていること
      expect(result).toBe(false)
    })

    test('正常：DBエラー', async () => {
      const dbError = new Error('DB Conncetion Error')
      statusFindOne.mockImplementation(() => {
        throw dbError
      })

      // 試験実施
      await rejectApporovalController.rejectApprove(contractId, documentId, rejectMessage)

      expect(errorSpy).toHaveBeenCalledWith({
        invoiceId: documentId,
        stack: dbError.stack,
        status: 0
      })
    })
  })
})
