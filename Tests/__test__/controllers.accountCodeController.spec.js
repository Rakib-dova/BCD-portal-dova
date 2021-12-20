'use strict'
jest.mock('../../Application/models')
jest.mock('../../Application/lib/logger')

const accountCodeController = require('../../Application/controllers/accountCodeController')
const logger = require('../../Application/lib/logger')
const AccountCode = require('../../Application/models').AccountCode
const timestamp = require('../../Application/lib/utils').timestampForList
const accountCodeMock = require('../mockDB/AccountCode_Table')
const sequelize = require('../../Application/models').sequelize
const codeAccountId = '5a927284-57c9-4594-9ed8-472d261a6102'
const codeAccountDataResult = new AccountCode()
codeAccountDataResult.accountCodeId = codeAccountId
codeAccountDataResult.contractId = 'f10b95a4-74a1-4691-880a-827c9f1a1faf'
codeAccountDataResult.accountCodeName = 'パソコン'
codeAccountDataResult.accountCode = 'AAA'
codeAccountDataResult.createdAt = new Date('2021-07-09T04:30:00.000Z')
codeAccountDataResult.updatedAt = new Date('2021-07-09T04:30:00.000Z')

const dbAccountCodeTable = []
const dbAccountCode100Table = []
dbAccountCode100Table.length = 100

dbAccountCode100Table.forEach((item, idx, arr) => {
  const { v4: uuidV4 } = require('uuid')
  arr[idx] = new AccountCode()
  item.accountCodeId = uuidV4()
  item.contractId = 'f10b95a4-74a1-4691-880a-827c9f1a1faf'
  item.accountCodeName = `AA00${idx}`
  item.accountCode = `勘定科目${idx + 1}`
  item.updatedAt = new Date('2021-11-25T04:30:00.000Z')
})

dbAccountCodeTable.push(codeAccountDataResult)

const transaction = {
  commit: () => {},
  rollback: () => {},
  LOCK: {}
}

let errorSpy, contractId, accountCodefindAllSpy, infoSpy, createSpy, findOneSpy, transactionSpy

describe('accountCodeControllerのテスト', () => {
  beforeEach(() => {
    createSpy = jest.spyOn(AccountCode, 'create')
    accountCodefindAllSpy = jest.spyOn(AccountCode, 'findAll')
    findOneSpy = jest.spyOn(AccountCode, 'findOne')
    errorSpy = jest.spyOn(logger, 'error')
    infoSpy = jest.spyOn(logger, 'info')
    transactionSpy = jest.spyOn(sequelize, 'transaction')
  })
  afterEach(() => {
    createSpy.mockRestore()
    accountCodefindAllSpy.mockRestore()
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
      // DBから勘定科目登録時、返す勘定科目インスタンス
      accountCodefindAllSpy.mockReturnValue(dbAccountCodeTable)
      createSpy.mockReturnValue(codeAccountDataResult)

      // 勘定科目登録時、画面から渡されるデータ
      const accountCodeName = 'パソコン1'
      const accountCode = 'AAA2'

      // 試験実施
      const result = await accountCodeController.insert(contractNormal, { accountCode, accountCodeName })

      // 期待結果
      // 想定したデータがReturnされていること
      expect(result).toEqual(true)
    })

    test('異常：重複された勘定科目登録する時', async () => {
      // 準備
      accountCodefindAllSpy.mockReturnValue([codeAccountDataResult])
      createSpy.mockReturnValue(codeAccountDataResult)

      // 勘定科目登録時、画面から渡されるデータ
      const accountCodeName = 'パソコン'
      const accountCode = 'AAA'

      // 試験実施
      const result = await accountCodeController.insert(contractNormal, { accountCode, accountCodeName })

      // 期待結果
      // 想定したデータがReturnされていること
      expect(result).toEqual(false)
    })

    test('異常：登録エラー', async () => {
      // 準備
      accountCodefindAllSpy.mockReturnValue([])
      createSpy.mockReturnValue(null)

      // 勘定科目登録時、画面から渡されるデータ
      const accountCodeName = '登録エラー'
      const accountCode = 'ABC'

      // 試験実施
      const result = await accountCodeController.insert(contractNormal, { accountCode, accountCodeName })

      // 期待結果
      // 想定したデータがReturnされていること
      expect(result).toEqual(false)
    })

    test('異常：FindAll DBエラー', async () => {
      // 準備
      // 重複コード検索時、エラーが発生する場合
      const dbError = new Error()
      accountCodefindAllSpy.mockReturnValue(dbError)
      createSpy.mockReturnValue(null)

      // 勘定科目登録時、画面から渡されるデータ
      const accountCodeName = 'パソコン'
      const accountCode = 'AAA'

      // 試験実施
      await accountCodeController.insert(contractNormal, { accountCode, accountCodeName })

      // 期待結果
      // 想定したデータがReturnされていること
      expect(errorSpy).toHaveBeenCalledWith({ contractId: contractId, stack: expect.anything(), status: 0 })
    })

    test('異常：create DBエラー', async () => {
      // 準備
      // DB登録時、エラーが発生する場合
      const dbError = new Error()
      accountCodefindAllSpy.mockReturnValue([])
      createSpy.mockReturnValue(dbError)

      // 勘定科目登録時、画面から渡されるデータ
      const accountCodeName = 'パソコン'
      const accountCode = 'AAA'

      // 試験実施
      const result = await accountCodeController.insert(contractNormal, { accountCode, accountCodeName })

      // 期待結果
      // 想定したデータがReturnされていること
      expect(result).toEqual(false)
    })
  })

  describe('getAccountList', () => {
    test('正常:データがない場合', async () => {
      // 準備
      // 勘定科目DB
      accountCodefindAllSpy.mockReturnValue([])

      // コントラクターID
      const contractId = '6e396429-169b-4a3a-9a66-07d4f3ffd23e'

      // 試験実施
      const result = await accountCodeController.getAccountCodeList(contractId)

      // 期待結果
      expect(result).toEqual([])
    })

    test('正常:データ1件ある場合', async () => {
      // 準備
      // 勘定科目DB
      accountCodefindAllSpy.mockReturnValue(dbAccountCode100Table)

      // コントラクターID
      const contractId = '6e396429-169b-4a3a-9a66-07d4f3ffd23e'

      // 試験実施
      const result = await accountCodeController.getAccountCodeList(contractId)

      // 期待値作成
      const expectResult = dbAccountCode100Table.map((item, idx) => {
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

    test('正常:データ100件ある場合', async () => {
      // 準備
      // 勘定科目DB
      accountCodefindAllSpy.mockReturnValue([dbAccountCodeTable[0]])

      // コントラクターID
      const contractId = '6e396429-169b-4a3a-9a66-07d4f3ffd23e'

      // 試験実施
      const result = await accountCodeController.getAccountCodeList(contractId)

      // 期待値作成
      const expectResult = [
        {
          no: 1,
          accountCodeId: dbAccountCodeTable[0].accountCodeId,
          accountCode: dbAccountCodeTable[0].accountCode,
          accountCodeName: dbAccountCodeTable[0].accountCodeName,
          updatedAt: timestamp(new Date(dbAccountCodeTable[0].updatedAt))
        }
      ]

      // 期待結果
      expect(result).toEqual(expectResult)
    })

    test('異常：FindAll DBエラー', async () => {
      // 準備
      // コード検索時、エラーが発生する場合
      const dbPoolError = new Error('DB POOL Error')
      accountCodefindAllSpy.mockReturnValue(dbPoolError)

      // コントラクターID
      const contractId = '6e396429-169b-4a3a-9a66-07d4f3ffd23e'

      // 試験実施
      await accountCodeController.getAccountCodeList(contractId)

      // 期待結果
      // 想定したデータがReturnされていること
      expect(errorSpy).toHaveBeenCalledWith({ contractId: contractId, stack: expect.anything(), status: 0 })
    })
  })

  describe('getAccountCode', () => {
    test('正常：検索対象がある場合', async () => {
      // 準備
      // 勘定科目がある場合
      findOneSpy.mockReturnValue(accountCodeMock[0])

      // contractId, accountCodeId
      const contractId = '9fdd2a54-ea5c-45a4-8bbe-3a2e5299e8f9'
      const accountCodeId = '0ab2343d-9d98-4614-b68b-78929bd84fee'

      // 試験実施
      const result = await accountCodeController.getAccountCode(contractId, accountCodeId)

      expect(result).toEqual({
        accountCode: accountCodeMock[0].accountCode,
        accountCodeName: accountCodeMock[0].accountCodeName
      })
    })
    test('異常：findOne DBエラー', async () => {
      // 準備
      // DBエラー
      const errorDbPool = new Error('DB POOL ERROR')
      findOneSpy.mockImplementation(() => {
        throw errorDbPool
      })

      // contractId, accountCodeId
      const contractId = '9fdd2a54-ea5c-45a4-8bbe-3a2e5299e8f9'
      const accountCodeId = '0ab2343d-9d98-4614-b68b-78929bd84fee'

      // 試験実施
      await accountCodeController.getAccountCode(contractId, accountCodeId)

      expect(errorSpy).toHaveBeenCalledWith({
        contractId: contractId,
        accountCodeId: accountCodeId,
        stack: expect.anything(),
        status: 0
      })
    })
  })

  describe('updatedAccountCode', () => {
    test('正常：正常変更の場合', async () => {
      // 準備
      // パラメータの用意
      const contractId = '9fdd2a54-ea5c-45a4-8bbe-3a2e5299e8f9'
      const accountCodeId = '0ab2343d-9d98-4614-b68b-78929bd84fee'
      const accountCode = 'AB0001'
      const accountCodeName = '預金科目'

      // transactionモックの用意
      transactionSpy.mockReturnValue({ ...transaction })

      // DBから変更対象を取得
      const findOneData = new AccountCode({ ...accountCodeMock[0] })
      findOneData._changed = new Set()
      findOneData._changed.add('accountCode')
      findOneSpy.mockReturnValue(findOneData)

      // 重複コード検索用データの用意
      accountCodefindAllSpy.mockReturnValue([])

      const result = await accountCodeController.updatedAccountCode(
        contractId,
        accountCodeId,
        accountCode,
        accountCodeName
      )

      expect(result).toBe(0)
    })

    test('準正常：勘定科目コードと勘定科目名の値を変更なく変更ボタンを押下する', async () => {
      // 準備
      // パラメータの用意
      const contractId = '9fdd2a54-ea5c-45a4-8bbe-3a2e5299e8f9'
      const accountCodeId = '0ab2343d-9d98-4614-b68b-78929bd84fee'
      const accountCode = 'AB001'
      const accountCodeName = '預金科目'

      // transactionモックの用意
      transactionSpy.mockReturnValue({ ...transaction })

      // DBから変更対象を取得
      const findOneData = new AccountCode({ ...accountCodeMock[0] })
      findOneData._changed = new Set()
      findOneSpy.mockReturnValue(findOneData)

      // 重複コード検索用データの用意
      accountCodefindAllSpy.mockReturnValue([])

      const result = await accountCodeController.updatedAccountCode(
        contractId,
        accountCodeId,
        accountCode,
        accountCodeName
      )

      expect(result).toBe(1)
    })

    test('準正常：変更コードが既存データと重複の場合', async () => {
      // 準備
      // パラメータの用意
      const contractId = '9fdd2a54-ea5c-45a4-8bbe-3a2e5299e8f9'
      const accountCodeId = '0ab2343d-9d98-4614-b68b-78929bd84fee'
      const accountCode = 'BC0001'
      const accountCodeName = '預金科目'

      // transactionモックの用意
      transactionSpy.mockReturnValue({ ...transaction })

      // DBから変更対象を取得
      const findOneData = new AccountCode({ ...accountCodeMock[0] })
      findOneData._changed = new Set()
      findOneData._changed.add('accountCode')
      findOneSpy.mockReturnValue(findOneData)

      // 重複コード検索用データの用意
      accountCodefindAllSpy.mockReturnValue([accountCodeMock[1]])

      const result = await accountCodeController.updatedAccountCode(
        contractId,
        accountCodeId,
        accountCode,
        accountCodeName
      )

      expect(result).toBe(-1)
    })

    test('異常：検索対象がヌールの場合', async () => {
      // 準備
      // パラメータの用意
      const contractId = '9fdd2a54-ea5c-45a4-8bbe-3a2e5299e8f9'
      const accountCodeId = '0ab2343d-9d98-4614-b68b-78929bd84fee'
      const accountCode = 'AB0001'
      const accountCodeName = '預金科目'

      // transactionモックの用意
      transactionSpy.mockReturnValue({ ...transaction })

      // DBから変更対象を取得
      findOneSpy.mockReturnValue(null)

      // 重複コード検索用データの用意
      accountCodefindAllSpy.mockReturnValue([])

      const result = await accountCodeController.updatedAccountCode(
        contractId,
        accountCodeId,
        accountCode,
        accountCodeName
      )

      expect(result).toBe(-2)
    })

    test('異常：DBエラー発生', async () => {
      // 準備
      // パラメータの用意
      const contractId = '9fdd2a54-ea5c-45a4-8bbe-3a2e5299e8f9'
      const accountCodeId = '0ab2343d-9d98-4614-b68b-78929bd84fee'
      const accountCode = 'AB0001'
      const accountCodeName = '預金科目'

      // エラーの定義
      const dbPoolError = new Error('DB POOL Error')
      // transactionモックの用意
      transactionSpy.mockReturnValue({ ...transaction })

      // DBから変更対象を取得
      findOneSpy.mockImplementation(() => {
        throw dbPoolError
      })

      // 重複コード検索用データの用意
      accountCodefindAllSpy.mockReturnValue([])

      await accountCodeController.updatedAccountCode(contractId, accountCodeId, accountCode, accountCodeName)

      expect(errorSpy).toHaveBeenCalledWith({
        contractId: contractId,
        accountCodeId: accountCodeId,
        stack: expect.anything(),
        status: 0
      })
    })

    test('異常：対象勘定科目を検索失敗', async () => {
      // 準備
      // パラメータの用意
      const contractId = '9fdd2a54-ea5c-45a4-8bbe-3a2e5299e8f9'
      const accountCodeId = '0ab2343d-9d98-4614-b68b-78929bd84fee'
      const accountCode = 'AB0001'
      const accountCodeName = '預金科目'

      // transactionモックの用意
      transactionSpy.mockReturnValue({ ...transaction })

      // DBから変更対象を取得
      findOneSpy.mockReturnValue(null)

      // 重複コード検索用データの用意
      accountCodefindAllSpy.mockReturnValue([])

      const result = await accountCodeController.updatedAccountCode(
        contractId,
        accountCodeId,
        accountCode,
        accountCodeName
      )

      expect(result).toBe(-2)
    })
  })

  describe('searchAccountCode', () => {
    test('正常：検索対象がある場合（条件未入力検索）', async () => {
      // 準備
      // 勘定科目がある場合
      accountCodefindAllSpy.mockReturnValue([accountCodeMock[0], accountCodeMock[1]])

      // contractId, accountCode, accountCodeName
      const contractId = '9fdd2a54-ea5c-45a4-8bbe-3a2e5299e8f9'
      const accountCode = ''
      const accountCodeName = ''

      // 試験実施
      const result = await accountCodeController.searchAccountCode(contractId, accountCode, accountCodeName)

      expect(result).toEqual([
        {
          accountCodeId: accountCodeMock[0].accountCodeId,
          accountCode: accountCodeMock[0].accountCode,
          accountCodeName: accountCodeMock[0].accountCodeName
        },
        {
          accountCodeId: accountCodeMock[1].accountCodeId,
          accountCode: accountCodeMock[1].accountCode,
          accountCodeName: accountCodeMock[1].accountCodeName
        }
      ])
    })

    test('正常：検索対象がある場合（勘定科目コード又は、勘定科目名で検索）', async () => {
      // 準備
      // 勘定科目がある場合
      accountCodefindAllSpy.mockReturnValue([accountCodeMock[0]])

      // contractId, accountCode, accountCodeName
      const contractId = '9fdd2a54-ea5c-45a4-8bbe-3a2e5299e8f9'
      const accountCode = 'AB001'
      const accountCodeName = '預金科目'

      // 試験実施
      const result = await accountCodeController.searchAccountCode(contractId, accountCode, accountCodeName)

      expect(result).toEqual([
        {
          accountCodeId: accountCodeMock[0].accountCodeId,
          accountCode: accountCodeMock[0].accountCode,
          accountCodeName: accountCodeMock[0].accountCodeName
        }
      ])
    })

    test('正常：検索対象がある場合（勘定科目コード又は勘定科目名で部分一致検索）', async () => {
      // 準備
      // 勘定科目がある場合
      accountCodefindAllSpy.mockReturnValue([accountCodeMock[0]])

      // contractId, accountCode, accountCodeName
      const contractId = '9fdd2a54-ea5c-45a4-8bbe-3a2e5299e8f9'
      const accountCode = 'AB001'
      const accountCodeName = ''

      // 試験実施
      const result = await accountCodeController.searchAccountCode(contractId, accountCode, accountCodeName)

      expect(result).toEqual([
        {
          accountCodeId: accountCodeMock[0].accountCodeId,
          accountCode: accountCodeMock[0].accountCode,
          accountCodeName: accountCodeMock[0].accountCodeName
        }
      ])
    })

    test('正常：検索対象がある場合（勘定科目名で検索）', async () => {
      // 準備
      // 勘定科目がある場合
      accountCodefindAllSpy.mockReturnValue([accountCodeMock[0], accountCodeMock[1]])

      // contractId, accountCode, accountCodeName
      const contractId = '9fdd2a54-ea5c-45a4-8bbe-3a2e5299e8f9'
      const accountCode = ''
      const accountCodeName = '預金科目'

      // 試験実施
      const result = await accountCodeController.searchAccountCode(contractId, accountCode, accountCodeName)

      expect(result).toEqual([
        {
          accountCodeId: accountCodeMock[0].accountCodeId,
          accountCode: accountCodeMock[0].accountCode,
          accountCodeName: accountCodeMock[0].accountCodeName
        },
        {
          accountCodeId: accountCodeMock[1].accountCodeId,
          accountCode: accountCodeMock[1].accountCode,
          accountCodeName: accountCodeMock[1].accountCodeName
        }
      ])
    })

    test('異常：DBエラー', async () => {
      // 準備
      // DBエラー
      const errorDbPool = new Error('DB POOL ERROR')
      accountCodefindAllSpy.mockImplementation(() => {
        throw errorDbPool
      })

      // contractId, accountCode, accountCodeName
      const contractId = '9fdd2a54-ea5c-45a4-8bbe-3a2e5299e8f9'
      const accountCode = 'AB001'
      const accountCodeName = '預金科目'

      // 試験実施
      await accountCodeController.searchAccountCode(contractId, accountCode, accountCodeName)

      expect(errorSpy).toHaveBeenCalledWith({
        contractId: contractId,
        accountCode: accountCode,
        accountCodeName: accountCodeName,
        stack: expect.anything(),
        status: 0
      })
    })
  })
})
