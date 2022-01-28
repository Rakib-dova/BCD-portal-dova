'use strict'
jest.mock('../../Application/models')
jest.mock('../../Application/lib/logger')

const departmentCodeController = require('../../Application/controllers/departmentCodeController')
const logger = require('../../Application/lib/logger')
const DepartmentCode = require('../../Application/models').DepartmentCode
const sequelize = require('../../Application/models').sequelize
const codeDepartmentId = '5a927284-57c9-4594-9ed8-472d261a6102'
const codeDepartmentDataResult = new DepartmentCode()
codeDepartmentDataResult.departmentCodeId = codeDepartmentId
codeDepartmentDataResult.contractId = 'f10b95a4-74a1-4691-880a-827c9f1a1faf'
codeDepartmentDataResult.departmentCodeName = 'パソコン'
codeDepartmentDataResult.departmentCode = 'DEP'
codeDepartmentDataResult.createdAt = new Date('2022-01-28T04:30:00.000Z')
codeDepartmentDataResult.updatedAt = new Date('2022-01-28T04:30:00.000Z')

const dbDepartmentCodeTable = []
dbDepartmentCodeTable.push(codeDepartmentDataResult)

let errorSpy, contractId, departmentCodefindAllSpy, infoSpy, createSpy, findOneSpy, transactionSpy

describe('accountCodeControllerのテスト', () => {
  beforeEach(() => {
    createSpy = jest.spyOn(DepartmentCode, 'create')
    departmentCodefindAllSpy = jest.spyOn(DepartmentCode, 'findAll')
    findOneSpy = jest.spyOn(DepartmentCode, 'findOne')
    errorSpy = jest.spyOn(logger, 'error')
    infoSpy = jest.spyOn(logger, 'info')
    transactionSpy = jest.spyOn(sequelize, 'transaction')
  })
  afterEach(() => {
    createSpy.mockRestore()
    departmentCodefindAllSpy.mockRestore()
    findOneSpy.mockRestore()
    errorSpy.mockRestore()
    infoSpy.mockRestore()
    transactionSpy.mockRestore()
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
      // DBから部門データ登録時、返す部門データインスタンス
      departmentCodefindAllSpy.mockReturnValue(dbDepartmentCodeTable)
      createSpy.mockReturnValue(codeDepartmentDataResult)

      // 部門データ登録時、画面から渡されるデータ
      const departmentCodeName = 'パソコン1'
      const departmentCode = 'DEP2'

      // 試験実施
      const result = await departmentCodeController.insert(contractNormal, { departmentCode, departmentCodeName })

      // 期待結果
      // 想定したデータがReturnされていること
      expect(result).toEqual(true)
    })

    test('異常：重複された勘定科目登録する時', async () => {
      // 準備
      departmentCodefindAllSpy.mockReturnValue([codeDepartmentDataResult])
      createSpy.mockReturnValue(codeDepartmentDataResult)

      // 部門データ登録時、画面から渡されるデータ
      const departmentCodeName = 'パソコン'
      const departmentCode = 'DEP'

      // 試験実施
      const result = await departmentCodeController.insert(contractNormal, { departmentCode, departmentCodeName })

      // 期待結果
      // 想定したデータがReturnされていること
      expect(result).toEqual(false)
    })

    test('異常：登録エラー', async () => {
      // 準備
      departmentCodefindAllSpy.mockReturnValue([])
      createSpy.mockReturnValue(null)

      // 部門データ登録時、画面から渡されるデータ
      const departmentCodeName = '登録エラー'
      const departmentCode = 'ABC'

      // 試験実施
      const result = await departmentCodeController.insert(contractNormal, { departmentCode, departmentCodeName })

      // 期待結果
      // 想定したデータがReturnされていること
      expect(result).toEqual(false)
    })

    test('異常：FindAll DBエラー', async () => {
      // 準備
      // 重複コード検索時、エラーが発生する場合
      const dbError = new Error()
      departmentCodefindAllSpy.mockReturnValue(dbError)
      createSpy.mockReturnValue(null)

      // 部門データ登録時、画面から渡されるデータ
      const departmentCodeName = 'パソコン'
      const departmentCode = 'AAA'

      // 試験実施
      await departmentCodeController.insert(contractNormal, { departmentCode, departmentCodeName })

      // 期待結果
      // 想定したデータがReturnされていること
      expect(errorSpy).toHaveBeenCalledWith({ contractId: contractId, stack: expect.anything(), status: 0 })
    })

    test('異常：create DBエラー', async () => {
      // 準備
      // DB登録時、エラーが発生する場合
      const dbError = new Error()
      departmentCodefindAllSpy.mockReturnValue([])
      createSpy.mockReturnValue(dbError)

      // 勘定科目登録時、画面から渡されるデータ
      const departmentCodeName = 'パソコン'
      const departmentCode = 'AAA'

      // 試験実施
      const result = await departmentCodeController.insert(contractNormal, { departmentCode, departmentCodeName })

      // 期待結果
      // 想定したデータがReturnされていること
      expect(result).toEqual(false)
    })
  })
})
