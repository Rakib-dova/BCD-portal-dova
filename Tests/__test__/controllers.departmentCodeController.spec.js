'use strict'
jest.mock('../../Application/models')
jest.mock('../../Application/lib/logger')

const departmentCodeController = require('../../Application/controllers/departmentCodeController')
const logger = require('../../Application/lib/logger')
const DepartmentCode = require('../../Application/models').DepartmentCode
const sequelize = require('../../Application/models').sequelize
const timestamp = require('../../Application/lib/utils').timestampForList
const departmentCodeMock = require('../mockDB/DepartmentCode_Table')
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

const dbDepartmentCode100Table = []
dbDepartmentCode100Table.length = 100
dbDepartmentCode100Table.forEach((item, idx, arr) => {
  const { v4: uuidV4 } = require('uuid')
  arr[idx] = new DepartmentCode()
  item.departmentCodeId = uuidV4()
  item.contractId = 'f10b95a4-74a1-4691-880a-827c9f1a1faf'
  item.departmentCodeName = `DEP${idx}`
  item.departmentCode = `部門名${idx + 1}`
  item.updatedAt = new Date('2021-11-25T04:30:00.000Z')
})

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

    test('異常：重複された部門データ登録する時', async () => {
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

      // 部門データ登録時、画面から渡されるデータ
      const departmentCodeName = 'パソコン'
      const departmentCode = 'AAA'

      // 試験実施
      const result = await departmentCodeController.insert(contractNormal, { departmentCode, departmentCodeName })

      // 期待結果
      // 想定したデータがReturnされていること
      expect(result).toEqual(false)
    })
  })

  describe('getDepartmentCodeList', () => {
    test('正常:データがない場合', async () => {
      // 準備
      // 部門データDB
      departmentCodefindAllSpy.mockReturnValue([])

      // コントラクターID
      const contractId = '6e396429-169b-4a3a-9a66-07d4f3ffd23e'

      // 試験実施
      const result = await departmentCodeController.getDepartmentCodeList(contractId)

      // 期待結果
      expect(result).toEqual([])
    })

    test('正常:データ100件ある場合', async () => {
      // 準備
      // 部門データDB
      departmentCodefindAllSpy.mockReturnValue(dbDepartmentCode100Table)

      // コントラクターID
      const contractId = '6e396429-169b-4a3a-9a66-07d4f3ffd23e'

      // 試験実施
      const result = await departmentCodeController.getDepartmentCodeList(contractId)

      // 期待値作成
      const expectResult = dbDepartmentCode100Table.map((item, idx) => {
        return {
          no: idx + 1,
          accountCodeId: item.accountCodeId,
          accountCode: item.accountCodeName,
          accountCodeName: item.accountCode,
          updatedAt: timestamp(item.updatedAt)
        }
      })

      // 期待結果
      expect(result).toEqual(expectResult)
    })

    test('正常:データ1件ある場合', async () => {
      // 準備
      // 部門データDB
      departmentCodefindAllSpy.mockReturnValue([dbDepartmentCodeTable[0]])

      // コントラクターID
      const contractId = '6e396429-169b-4a3a-9a66-07d4f3ffd23e'

      // 試験実施
      const result = await departmentCodeController.getDepartmentCodeList(contractId)

      // 期待値作成
      const expectResult = [
        {
          no: 1,
          departmentCodeId: dbDepartmentCodeTable[0].departmentCodeId,
          departmentCode: dbDepartmentCodeTable[0].departmentCode,
          departmentCodeName: dbDepartmentCodeTable[0].departmentCodeName,
          updatedAt: timestamp(new Date(dbDepartmentCodeTable[0].updatedAt))
        }
      ]

      // 期待結果
      expect(result).toEqual(expectResult)
    })

    test('異常：FindAll DBエラー', async () => {
      // 準備
      // コード検索時、エラーが発生する場合
      const dbPoolError = new Error('DB POOL Error')
      departmentCodefindAllSpy.mockReturnValue(dbPoolError)

      // コントラクターID
      const contractId = '6e396429-169b-4a3a-9a66-07d4f3ffd23e'

      // 試験実施
      await departmentCodeController.getDepartmentCodeList(contractId)

      // 期待結果
      // 想定したデータがReturnされていること
      expect(errorSpy).toHaveBeenCalledWith({ contractId: contractId, stack: expect.anything(), status: 0 })
    })
  })

  describe('getDepartmentCode', () => {
    test('正常：検索対象がある場合', async () => {
      // 準備
      // 部門データがある場合
      findOneSpy.mockReturnValue(departmentCodeMock[0])

      // contractId
      const contractId = '9fdd2a54-ea5c-45a4-8bbe-3a2e5299e8f9'

      // 試験実施
      const result = await departmentCodeController.getDepartmentCode(contractId)

      expect(result).toEqual({
        departmentCode: departmentCodeMock[0].departmentCode,
        departmentCodeName: departmentCodeMock[0].departmentCodeName
      })
    })
    test('異常：findOne DBエラー', async () => {
      // 準備
      // DBエラー
      const errorDbPool = new Error('DB POOL ERROR')
      findOneSpy.mockImplementation(() => {
        throw errorDbPool
      })

      // contractId
      const contractId = '9fdd2a54-ea5c-45a4-8bbe-3a2e5299e8f9'

      // 試験実施
      await departmentCodeController.getDepartmentCode(contractId)

      expect(errorSpy).toHaveBeenCalledWith({
        contractId: contractId,
        stack: expect.anything(),
        status: 0
      })
    })
  })
})
