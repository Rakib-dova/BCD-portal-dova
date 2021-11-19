'use strict'
jest.mock('../../Application/models')
jest.mock('../../Application/lib/logger')

const codeAccountController = require('../../Application/controllers/codeAccountController')
const logger = require('../../Application/lib/logger')
const CodeAccount = require('../../Application/models').CodeAccount

let errorSpy, contractId, findAllSpy, infoSpy, createSpy

describe('codeAccountControllerControllerのテスト', () => {
  beforeEach(() => {
    createSpy = jest.spyOn(CodeAccount, 'create')
    findAllSpy = jest.spyOn(CodeAccount, 'findAll')
    errorSpy = jest.spyOn(logger, 'error')
    infoSpy = jest.spyOn(logger, 'info')
  })
  afterEach(() => {
    createSpy.mockRestore()
    findAllSpy.mockRestore()
    errorSpy.mockRestore()
    infoSpy.mockRestore()
  })

  contractId = '87654321-fbe6-4864-a866-7a3ce9aa517e'

  const contractNormal = {
    contractId: contractId,
    tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089',
    contractStatus: '00',
    contractedAt: '2021-07-09T04:30:00.000Z',
    createdAt: '2021-07-09T04:30:00.000Z',
    updatedAt: '2021-07-09T04:30:00.000Z',
    canceledAt: null,
    dataValues: {
      contractId: contractId,
      tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089',
      contractStatus: '00',
      contractedAt: '2021-07-09T04:30:00.000Z',
      createdAt: '2021-07-09T04:30:00.000Z',
      updatedAt: '2021-07-09T04:30:00.000Z',
      canceledAt: null
    }
  }

  const codeAccountId = '5a927284-57c9-4594-9ed8-472d261a6102'

  describe('insert', () => {
    test('正常', async () => {
      // 準備
      const codeAccountDataResult = new CodeAccount()
      codeAccountDataResult.codeAccountId = codeAccountId
      codeAccountDataResult.contractId = contractId
      codeAccountDataResult.subjectName = 'a'
      codeAccountDataResult.subjectCode = 1
      codeAccountDataResult.createdAt = '2021-07-09T04:30:00.000Z'
      codeAccountDataResult.updatedAt = '2021-07-09T04:30:00.000Z'
      findAllSpy.mockReturnValue([])
      createSpy.mockReturnValue(codeAccountDataResult)

      const subjectName = 'a'
      const subjectCode = 1
      // 試験実施
      const result = await codeAccountController.insert(contractNormal, { subjectCode, subjectName })

      // 期待結果
      // 想定したデータがReturnされていること
      expect(result).toEqual(true)
    })

    test('異常：重複された勘定科目登録する時', async () => {
      // 準備
      const codeAccountDataResult = new CodeAccount()
      codeAccountDataResult.codeAccountId = codeAccountId
      codeAccountDataResult.contractId = contractId
      codeAccountDataResult.subjectName = 'a'
      codeAccountDataResult.subjectCode = 1
      codeAccountDataResult.createdAt = '2021-07-09T04:30:00.000Z'
      codeAccountDataResult.updatedAt = '2021-07-09T04:30:00.000Z'
      findAllSpy.mockReturnValue([codeAccountDataResult])
      createSpy.mockReturnValue(codeAccountDataResult)
      const subjectName = 'a'
      const subjectCode = 1
      // 試験実施
      const result = await codeAccountController.insert(contractNormal, { subjectCode, subjectName })

      // 期待結果
      // 想定したデータがReturnされていること
      expect(result).toEqual(false)
    })

    test('異常：登録エラー', async () => {
      // 準備
      findAllSpy.mockReturnValue([])
      createSpy.mockReturnValue(null)
      const subjectName = 'a'
      const subjectCode = 1
      // 試験実施
      const result = await codeAccountController.insert(contractNormal, { subjectCode, subjectName })

      // 期待結果
      // 想定したデータがReturnされていること
      expect(result).toEqual(false)
    })
    test('異常：FindAll DBエラー', async () => {
      // 準備
      const dbError = new Error()
      findAllSpy.mockReturnValue(dbError)
      createSpy.mockReturnValue(null)
      const subjectName = 'a'
      const subjectCode = 1
      // 試験実施
      await codeAccountController.insert(contractNormal, { subjectCode, subjectName })

      // 期待結果
      // 想定したデータがReturnされていること
      expect(errorSpy).toHaveBeenCalledWith({ contractId: contractId, stack: expect.anything(), status: 0 })
    })
    test('異常：create DBエラー', async () => {
      // 準備
      const dbError = new Error()
      findAllSpy.mockReturnValue([])
      createSpy.mockReturnValue(dbError)
      const subjectName = 'a'
      const subjectCode = 1
      // 試験実施
      const result = await codeAccountController.insert(contractNormal, { subjectCode, subjectName })

      // 期待結果
      // 想定したデータがReturnされていること
      expect(result).toEqual(false)
    })
  })
})
