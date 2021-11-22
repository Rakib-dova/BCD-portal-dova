'use strict'
jest.mock('../../Application/models')
jest.mock('../../Application/lib/logger')

const codeAccountController = require('../../Application/controllers/codeAccountController')
const logger = require('../../Application/lib/logger')
const CodeAccount = require('../../Application/models').CodeAccount

const codeAccountId = '5a927284-57c9-4594-9ed8-472d261a6102'
const codeAccountDataResult = new CodeAccount()
codeAccountDataResult.codeAccountId = codeAccountId
codeAccountDataResult.contractId = 'f10b95a4-74a1-4691-880a-827c9f1a1faf'
codeAccountDataResult.subjectName = 'パソコン'
codeAccountDataResult.subjectCode = 'AAA'
codeAccountDataResult.createdAt = '2021-07-09T04:30:00.000Z'
codeAccountDataResult.updatedAt = '2021-07-09T04:30:00.000Z'

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

  describe('insert', () => {
    test('正常', async () => {
      // 準備
      // DBから勘定科目登録時、返す勘定科目インスタンス
      findAllSpy.mockReturnValue([])
      createSpy.mockReturnValue(codeAccountDataResult)

      // 勘定科目登録時、画面から渡されるデータ
      const subjectName = 'パソコン'
      const subjectCode = 'AAA'

      // 試験実施
      const result = await codeAccountController.insert(contractNormal, { subjectCode, subjectName })

      // 期待結果
      // 想定したデータがReturnされていること
      expect(result).toEqual(true)
    })

    test('異常：重複された勘定科目登録する時', async () => {
      // 準備
      findAllSpy.mockReturnValue([codeAccountDataResult])
      createSpy.mockReturnValue(codeAccountDataResult)

      // 勘定科目登録時、画面から渡されるデータ
      const subjectName = 'パソコン'
      const subjectCode = 'AAA'

      // 試験実施
      const result = await codeAccountController.insert(contractNormal, { subjectCode, subjectName })

      // 期待結果
      // 想定したデータがReturnされていること
      // expect(result).toEqual(false)
    })

    test('異常：登録エラー', async () => {
      // 準備
      findAllSpy.mockReturnValue([])
      createSpy.mockReturnValue(null)

      // 勘定科目登録時、画面から渡されるデータ
      const subjectName = '登録エラー'
      const subjectCode = 'ABC'

      // 試験実施
      const result = await codeAccountController.insert(contractNormal, { subjectCode, subjectName })

      // 期待結果
      // 想定したデータがReturnされていること
      expect(result).toEqual(false)
    })

    test('異常：FindAll DBエラー', async () => {
      // 準備
      // 重複コード検索時、エラーが発生する場合
      const dbError = new Error()
      findAllSpy.mockReturnValue(dbError)
      createSpy.mockReturnValue(null)

      // 勘定科目登録時、画面から渡されるデータ
      const subjectName = 'パソコン'
      const subjectCode = 'AAA'

      // 試験実施
      await codeAccountController.insert(contractNormal, { subjectCode, subjectName })

      // 期待結果
      // 想定したデータがReturnされていること
      expect(errorSpy).toHaveBeenCalledWith({ contractId: contractId, stack: expect.anything(), status: 0 })
    })

    test('異常：create DBエラー', async () => {
      // 準備
      // DB登録時、エラーが発生する場合
      const dbError = new Error()
      findAllSpy.mockReturnValue([])
      createSpy.mockReturnValue(dbError)

      // 勘定科目登録時、画面から渡されるデータ
      const subjectName = 'パソコン'
      const subjectCode = 'AAA'

      // 試験実施
      const result = await codeAccountController.insert(contractNormal, { subjectCode, subjectName })

      // 期待結果
      // 想定したデータがReturnされていること
      expect(result).toEqual(false)
    })
  })
})
