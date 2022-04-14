'use strict'

const logger = require('../../Application/lib/logger')
const db = require('../../Application/models')
const RequestApproval = db.RequestApproval
const requestApprovalController = require('../../Application/controllers/requestApprovalController')

let findOneSpy, errorSpy, contractId, documentId
describe('requestApprovalControllerのテスト', () => {
  beforeEach(() => {
    findOneSpy = jest.spyOn(RequestApproval, 'findOne')
    errorSpy = jest.spyOn(logger, 'error')
  })
  afterEach(() => {
    findOneSpy.mockRestore()
    errorSpy.mockRestore()
  })

  contractId = '12345678-bdac-4195-80b9-1ea64b8cb70c'
  documentId = '12348765-bdac-4195-80b9-1ea64b8cb70c'

  const returnValue = [
    {
      contractId: '1e5e24aa-77c3-4571-a93c-5caa0e336ddb',
      approveRouteId: '6693f071-9150-4005-bb06-3f8d30724f9b',
      invoiceId: 'aa974511-8188-4022-bd86-45e251fd259e',
      requester: '8b087e49-6a91-4fc2-8dc8-f30f56d9acd6',
      status: '00',
      message: 'test'
    }
  ]

  describe('findOneRequestApproval', () => {
    test('正常', async () => {
      findOneSpy.mockReturnValueOnce(returnValue)

      // 試験実施
      const result = await requestApprovalController.findOneRequestApproval(contractId, documentId)

      // 期待結果
      // 取得したテナントデータがReturnされていること
      expect(result).toBe(returnValue)
    })

    test('正常：DBエラー', async () => {
      const dbError = new Error('DB Conncetion Error')
      findOneSpy.mockImplementation(() => {
        throw dbError
      })

      // 試験実施
      await requestApprovalController.findOneRequestApproval(contractId, documentId)

      expect(errorSpy).toHaveBeenCalledWith(
        {
          contractId: contractId,
          invoiceId: documentId,
          stack: dbError.stack,
          status: 0
        },
        dbError.name
      )
    })
  })
})
