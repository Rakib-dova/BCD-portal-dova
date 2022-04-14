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

const transaction = {
  commit: () => {},
  rollback: () => {},
  LOCK: {}
}

describe('departmentCodeControllerのテスト', () => {
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
          departmentCodeId: item.departmentCodeId,
          departmentCode: item.departmentCodeName,
          departmentCodeName: item.departmentCode,
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

  describe('updatedDepartmentCode', () => {
    test('正常：正常変更の場合', async () => {
      // 準備
      // パラメータの用意
      const contractId = '9fdd2a54-ea5c-45a4-8bbe-3a2e5299e8f9'
      const departmentCodeId = '0ab2343d-9d98-4614-b68b-78929bd84fee'
      const departmentCode = 'AB0001'
      const departmentCodeName = '預金科目'

      // transactionモックの用意
      transactionSpy.mockReturnValue({ ...transaction })

      // DBから変更対象を取得
      const findOneData = new DepartmentCode({ ...departmentCodeMock[0] })
      findOneData._changed = new Set()
      findOneData._changed.add('departmentCode')
      findOneSpy.mockReturnValue(findOneData)

      // 重複コード検索用データの用意
      departmentCodefindAllSpy.mockReturnValue([])

      const result = await departmentCodeController.updatedDepartmentCode(
        contractId,
        departmentCodeId,
        departmentCode,
        departmentCodeName
      )

      expect(result).toBe(0)
    })

    test('準正常：部門コードと部門名の値を変更なく変更ボタンを押下する', async () => {
      // 準備
      // パラメータの用意
      const contractId = '9fdd2a54-ea5c-45a4-8bbe-3a2e5299e8f9'
      const departmentCodeId = '0ab2343d-9d98-4614-b68b-78929bd84fee'
      const departmentCode = 'AB001'
      const departmentCodeName = '預金科目'

      // transactionモックの用意
      transactionSpy.mockReturnValue({ ...transaction })

      // DBから変更対象を取得
      const findOneData = new DepartmentCode({ ...departmentCodeMock[0] })
      findOneData._changed = new Set()
      findOneSpy.mockReturnValue(findOneData)

      // 重複コード検索用データの用意
      departmentCodefindAllSpy.mockReturnValue([])

      const result = await departmentCodeController.updatedDepartmentCode(
        contractId,
        departmentCodeId,
        departmentCode,
        departmentCodeName
      )

      expect(result).toBe(1)
    })

    test('準正常：変更コードが既存データと重複の場合', async () => {
      // 準備
      // パラメータの用意
      const contractId = '9fdd2a54-ea5c-45a4-8bbe-3a2e5299e8f9'
      const departmentCodeId = '74a9717e-4ed8-4430-9109-9ab7e850bdc7'
      const departmentCode = 'DE008'
      const departmentCodeName = '預金科目'

      // transactionモックの用意
      transactionSpy.mockReturnValue({ ...transaction })

      // DBから変更対象を取得
      const findOneData = new DepartmentCode({ ...departmentCodeMock[0] })
      findOneData._changed = new Set()
      findOneData._changed.add('departmentCode')
      findOneSpy.mockReturnValue(findOneData)

      // 重複コード検索用データの用意
      departmentCodefindAllSpy.mockReturnValue([departmentCodeMock[7]])

      const result = await departmentCodeController.updatedDepartmentCode(
        contractId,
        departmentCodeId,
        departmentCode,
        departmentCodeName
      )

      expect(result).toBe(-1)
    })

    test('異常：検索対象がヌールの場合', async () => {
      // 準備
      // パラメータの用意
      const contractId = '9fdd2a54-ea5c-45a4-8bbe-3a2e5299e8f9'
      const departmentCodeId = '0ab2343d-9d98-4614-b68b-78929bd84fee'
      const departmentCode = 'AB0001'
      const departmentCodeName = '預金科目'

      // transactionモックの用意
      transactionSpy.mockReturnValue({ ...transaction })

      // DBから変更対象を取得
      findOneSpy.mockReturnValue(null)

      // 重複コード検索用データの用意
      departmentCodefindAllSpy.mockReturnValue([])

      const result = await departmentCodeController.updatedDepartmentCode(
        contractId,
        departmentCodeId,
        departmentCode,
        departmentCodeName
      )

      expect(result).toBe(-2)
    })

    test('異常：DBエラー発生', async () => {
      // 準備
      // パラメータの用意
      const contractId = '9fdd2a54-ea5c-45a4-8bbe-3a2e5299e8f9'
      const departmentCodeId = '0ab2343d-9d98-4614-b68b-78929bd84fee'
      const departmentCode = 'AB0001'
      const departmentCodeName = '預金科目'

      // エラーの定義
      const dbPoolError = new Error('DB POOL Error')
      // transactionモックの用意
      transactionSpy.mockReturnValue({ ...transaction })

      // DBから変更対象を取得
      findOneSpy.mockImplementation(() => {
        throw dbPoolError
      })

      // 重複コード検索用データの用意
      departmentCodefindAllSpy.mockReturnValue([])

      await departmentCodeController.updatedDepartmentCode(
        contractId,
        departmentCodeId,
        departmentCode,
        departmentCodeName
      )

      expect(errorSpy).toHaveBeenCalledWith({
        contractId: contractId,
        departmentCodeId: departmentCodeId,
        stack: expect.anything(),
        status: 0
      })
    })

    test('異常：対象部門データを検索失敗', async () => {
      // 準備
      // パラメータの用意
      const contractId = '9fdd2a54-ea5c-45a4-8bbe-3a2e5299e8f9'
      const departmentCodeId = '0ab2343d-9d98-4614-b68b-78929bd84fee'
      const departmentCode = 'AB0001'
      const departmentCodeName = '預金科目'

      // transactionモックの用意
      transactionSpy.mockReturnValue({ ...transaction })

      // DBから変更対象を取得
      findOneSpy.mockReturnValue(null)

      // 重複コード検索用データの用意
      departmentCodefindAllSpy.mockReturnValue([])

      const result = await departmentCodeController.updatedDepartmentCode(
        contractId,
        departmentCodeId,
        departmentCode,
        departmentCodeName
      )

      expect(result).toBe(-2)
    })
  })

  describe('searchDepartmentCode', () => {
    test('正常：検索対象がある場合（条件未入力検索）', async () => {
      // 準備
      // 部門データがある場合
      departmentCodefindAllSpy.mockReturnValue([departmentCodeMock[0], departmentCodeMock[1]])

      // contractId, departmentCode, departmentCodeName
      const contractId = '9fdd2a54-ea5c-45a4-8bbe-3a2e5299e8f9'
      const departmentCode = ''
      const departmentCodeName = ''

      // 試験実施
      const result = await departmentCodeController.searchDepartmentCode(contractId, departmentCode, departmentCodeName)

      expect(result).toEqual([
        {
          departmentCodeId: departmentCodeMock[0].departmentCodeId,
          departmentCode: departmentCodeMock[0].departmentCode,
          departmentCodeName: departmentCodeMock[0].departmentCodeName
        },
        {
          departmentCodeId: departmentCodeMock[1].departmentCodeId,
          departmentCode: departmentCodeMock[1].departmentCode,
          departmentCodeName: departmentCodeMock[1].departmentCodeName
        }
      ])
    })

    test('正常：検索対象がある場合（部門コード又は、部門名で検索）', async () => {
      // 準備
      // 部門データがある場合
      departmentCodefindAllSpy.mockReturnValue([departmentCodeMock[0]])

      // contractId, departmentCode, departmentCodeName
      const contractId = '9fdd2a54-ea5c-45a4-8bbe-3a2e5299e8f9'
      const departmentCode = 'AB001'
      const departmentCodeName = '預金科目'

      // 試験実施
      const result = await departmentCodeController.searchDepartmentCode(contractId, departmentCode, departmentCodeName)

      expect(result).toEqual([
        {
          departmentCodeId: departmentCodeMock[0].departmentCodeId,
          departmentCode: departmentCodeMock[0].departmentCode,
          departmentCodeName: departmentCodeMock[0].departmentCodeName
        }
      ])
    })

    test('正常：検索対象がある場合（部門コード又は部門名で部分一致検索）', async () => {
      // 準備
      // 部門データがある場合
      departmentCodefindAllSpy.mockReturnValue([departmentCodeMock[0]])

      // contractId, departmentCode, departmentCodeName
      const contractId = '9fdd2a54-ea5c-45a4-8bbe-3a2e5299e8f9'
      const departmentCode = 'AB001'
      const departmentCodeName = ''

      // 試験実施
      const result = await departmentCodeController.searchDepartmentCode(contractId, departmentCode, departmentCodeName)

      expect(result).toEqual([
        {
          departmentCodeId: departmentCodeMock[0].departmentCodeId,
          departmentCode: departmentCodeMock[0].departmentCode,
          departmentCodeName: departmentCodeMock[0].departmentCodeName
        }
      ])
    })

    test('正常：検索対象がある場合（部門名で検索）', async () => {
      // 準備
      // 部門データがある場合
      departmentCodefindAllSpy.mockReturnValue([departmentCodeMock[0], departmentCodeMock[1]])

      // contractId, departmentCode, departmentCodeName
      const contractId = '9fdd2a54-ea5c-45a4-8bbe-3a2e5299e8f9'
      const departmentCode = ''
      const departmentCodeName = '預金科目'

      // 試験実施
      const result = await departmentCodeController.searchDepartmentCode(contractId, departmentCode, departmentCodeName)

      expect(result).toEqual([
        {
          departmentCodeId: departmentCodeMock[0].departmentCodeId,
          departmentCode: departmentCodeMock[0].departmentCode,
          departmentCodeName: departmentCodeMock[0].departmentCodeName
        },
        {
          departmentCodeId: departmentCodeMock[1].departmentCodeId,
          departmentCode: departmentCodeMock[1].departmentCode,
          departmentCodeName: departmentCodeMock[1].departmentCodeName
        }
      ])
    })

    test('異常：DBエラー', async () => {
      // 準備
      // DBエラー
      const errorDbPool = new Error('DB POOL ERROR')
      departmentCodefindAllSpy.mockImplementation(() => {
        throw errorDbPool
      })

      // contractId, departmentCode, departmentCodeName
      const contractId = '9fdd2a54-ea5c-45a4-8bbe-3a2e5299e8f9'
      const departmentCode = 'AB001'
      const departmentCodeName = '預金科目'

      // 試験実施
      await departmentCodeController.searchDepartmentCode(contractId, departmentCode, departmentCodeName)

      expect(errorSpy).toHaveBeenCalledWith({
        contractId: contractId,
        departmentCode: departmentCode,
        departmentCodeName: departmentCodeName,
        stack: expect.anything(),
        status: 0
      })
    })
  })

  describe('deleteForDepartmentCode', () => {
    test('正常：部門データ削除', async () => {
      // departmentCodeId
      const departmentCodeId = '0ab2343d-9d98-4614-b68b-78929bd84fee'

      // 部門データ検索（Mockデータ）
      DepartmentCode.findOne = jest.fn((value) => {
        return {
          departmentCodeId: value,
          dataValues: {
            departmentCodeId: value
          },
          destroy: async () => {}
        }
      })

      // 試験実施
      const result = await departmentCodeController.deleteForDepartmentCode(departmentCodeId)

      // 正常削除の「1」を返す
      expect(result).toEqual(1)
    })

    test('準正常：部門データ削除（既に削除されている場合）', async () => {
      // departmentCodeId
      const departmentCodeId = '0ab2343d-9d98-4614-b68b-78929bd84fee'

      // 部門データ検索（Mockデータ）
      DepartmentCode.findOne = jest.fn((value) => {
        return null
      })

      // 試験実施
      const result = await departmentCodeController.deleteForDepartmentCode(departmentCodeId)

      // 準正常削除の場合、「-1」を返す
      expect(result).toBe(-1)
    })

    test('準正常：部門データ削除（DBエラー）', async () => {
      // departmentCodeId
      const departmentCodeId = '0ab2343d-9d98-4614-b68b-78929bd84fee'

      // 部門データ検索（Mockデータ）
      const dbError = new Error('DB Error')

      // 部門データ検索（Mockデータ）
      DepartmentCode.findOne = jest.fn((value) => {
        return dbError
      })

      // 試験実施
      const result = await departmentCodeController.deleteForDepartmentCode(departmentCodeId)

      // 準正常削除の場合、「0」を返す
      expect(result).toBe(0)
    })
  })

  describe('checkDataForDepartmentCode', () => {
    test('正常', async () => {
      // 準備
      // 契約番号
      const departmentCodeId = 'f194969f-9307-4e18-a097-843aa6ce7b73'

      // 試験実施
      const result = await departmentCodeController.checkDataForDepartmentCode(departmentCodeId)

      // 期待結果
      // 正常削除の「1」を返す
      expect(result).toEqual(1)
    })
    test('準正常：既に削除されたと想定する（既に削除されている場合）', async () => {
      // departmentCodeId
      const departmentCodeId = '308e7acf-072d-4533-94f5-dcdf5972007e'

      // 部門データ検索（Mockデータ）
      DepartmentCode.findOne = jest.fn((value) => {
        return null
      })

      // 試験実施
      const result = await departmentCodeController.checkDataForDepartmentCode(departmentCodeId)

      // 準正常削除の場合、「-1」を返す
      expect(result).toEqual(-1)
    })
    test('準正常：部門データチェック（DBエラー）', async () => {
      // departmentCodeId
      const departmentCodeId = '308e7acf-072d-4533-94f5-dcdf5972007e'

      // 部門データ検索（Mockデータ）
      const dbError = new Error('DB Error')
      DepartmentCode.findOne = jest.fn((value) => {
        throw dbError
      })

      // 試験実施
      const result = await departmentCodeController.checkDataForDepartmentCode(departmentCodeId)

      // 準正常削除の場合、「0」を返す
      expect(result).toEqual(0)
    })
  })
})
