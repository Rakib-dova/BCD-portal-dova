'use strict'
jest.mock('../../Application/models')
jest.mock('../../Application/lib/logger')

const subAccountCodeController = require('../../Application/controllers/subAccountCodeController')
const logger = require('../../Application/lib/logger')
const AccountCode = require('../../Application/models').AccountCode
const SubAccountCode = require('../../Application/models').SubAccountCode
const accountCodeMock = require('../mockDB/AccountCode_Table')

const codeAccountId = '5a927284-57c9-4594-9ed8-472d261a6102'
const subAccountCodeId = 'f10b95a4-74a1-4691-880a-827c9f1a1faf'
const subAccountCodeDataResult = new SubAccountCode()
subAccountCodeDataResult.accountCodeId = codeAccountId
subAccountCodeDataResult.subAccountCodeId = subAccountCodeId
subAccountCodeDataResult.subjectName = '開発'
subAccountCodeDataResult.subjectCode = 'AAA'
subAccountCodeDataResult.createdAt = new Date('2021-07-09T04:30:00.000Z')
subAccountCodeDataResult.updatedAt = new Date('2021-07-09T04:30:00.000Z')

const dbSubAccountCodeTable = []
const dbAccountCode100Table = []
dbAccountCode100Table.length = 100

dbAccountCode100Table.forEach((item, idx, arr) => {
  const { v4: uuidV4 } = require('uuid')
  arr[idx] = new AccountCode()
  item.accountCodeId = uuidV4()
  item.contractId = 'f10b95a4-74a1-4691-880a-827c9f1a1faf'
  item.accountCodeName = `AA00${idx}`
  item.accountCode = `補助科目${idx + 1}`
  item.updatedAt = new Date('2021-11-25T04:30:00.000Z')
})

dbSubAccountCodeTable.push(subAccountCodeDataResult)

let errorSpy,
  contractId,
  subAccountCodefindAllSpy,
  infoSpy,
  subAccountCodeCreateSpy,
  accountCodefindOneSpy,
  checkAndLockSubAccountCodeSpy,
  SubAccountCodeGetsubAccountCodeListSpy,
  accountCodeFindAllSpy,
  subAccountcodeFindOneSpy

describe('subAccountCodeControllerのテスト', () => {
  beforeEach(() => {
    subAccountCodeCreateSpy = jest.spyOn(SubAccountCode, 'create')
    subAccountCodefindAllSpy = jest.spyOn(SubAccountCode, 'findAll')
    subAccountcodeFindOneSpy = jest.spyOn(SubAccountCode, 'findOne')
    accountCodefindOneSpy = jest.spyOn(AccountCode, 'findOne')
    accountCodeFindAllSpy = jest.spyOn(AccountCode, 'findAll')
    errorSpy = jest.spyOn(logger, 'error')
    infoSpy = jest.spyOn(logger, 'info')
    checkAndLockSubAccountCodeSpy = jest.spyOn(subAccountCodeController, 'checkAndLockSubAccountCode')
    SubAccountCodeGetsubAccountCodeListSpy = jest.spyOn(SubAccountCode, 'getsubAccountCodeList')
  })
  afterEach(() => {
    subAccountCodeCreateSpy.mockRestore()
    subAccountCodefindAllSpy.mockRestore()
    accountCodefindOneSpy.mockRestore()
    errorSpy.mockRestore()
    infoSpy.mockRestore()
    checkAndLockSubAccountCodeSpy.mockRestore()
    SubAccountCodeGetsubAccountCodeListSpy.mockRestore()
    accountCodeFindAllSpy.mockRestore()
    subAccountcodeFindOneSpy.mockRestore()
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

  const subAccountCodeListResult = [
    {
      subjectCode: 'TEST1',
      subjectName: '補助科目1',
      accountCodeName: '勘定科目1'
    },
    {
      subjectCode: 'TEST2',
      subjectName: '補助科目2',
      accountCodeName: '勘定科目2'
    },
    {
      subjectCode: 'TEST3',
      subjectName: '補助科目3',
      accountCodeName: '勘定科目3'
    }
  ]

  const subAccountControllerResult = [
    {
      no: 1,
      subjectCode: 'TEST1',
      subjectName: '補助科目1',
      accountCodeName: '勘定科目1'
    },
    {
      no: 2,
      subjectCode: 'TEST2',
      subjectName: '補助科目2',
      accountCodeName: '勘定科目2'
    },
    {
      no: 3,
      subjectCode: 'TEST3',
      subjectName: '補助科目3',
      accountCodeName: '勘定科目3'
    }
  ]

  describe('insert', () => {
    test('正常', async () => {
      // 準備
      // 勘定科目検索結果
      accountCodefindOneSpy.mockReturnValue(accountCodeMock[0])

      // DBから補助科目登録時、返す補助科目インスタンス
      subAccountCodefindAllSpy.mockReturnValue(dbSubAccountCodeTable)
      subAccountCodeCreateSpy.mockReturnValue(subAccountCodeDataResult)

      // パラメータの用意
      const values = {
        accountCodeId: 'AB001',
        subjectCode: 'AAA1',
        subjectName: '開発1'
      }

      // 試験実施
      const result = await subAccountCodeController.insert(contractNormal, values)

      // 期待結果
      // 想定したデータがReturnされていること
      expect(result).toEqual(0)
    })

    test('準正常：登録時、勘定科目が削除されたこと', async () => {
      // 準備
      // 勘定科目検索結果
      accountCodefindOneSpy.mockReturnValue(null)

      // DBから補助科目登録時、返す補助科目インスタンス
      subAccountCodefindAllSpy.mockReturnValue([subAccountCodeDataResult])
      subAccountCodeCreateSpy.mockReturnValue(subAccountCodeDataResult)

      // パラメータの用意
      const values = {
        accountCodeId: 'AB001',
        subjectCode: 'AAA',
        subjectName: '開発'
      }

      // 試験実施
      const result = await subAccountCodeController.insert(contractNormal, values)

      // 期待結果
      // 想定したデータがReturnされていること
      expect(result).toEqual(-1)
    })

    test('異常：重複された補助科目登録する時', async () => {
      // 準備
      // 勘定科目検索結果
      accountCodefindOneSpy.mockReturnValue(accountCodeMock[0])

      // DBから補助科目登録時、返す補助科目インスタンス
      subAccountCodefindAllSpy.mockReturnValue([subAccountCodeDataResult])
      subAccountCodeCreateSpy.mockReturnValue(subAccountCodeDataResult)

      // パラメータの用意
      const values = {
        accountCodeId: 'AB001',
        subjectCode: 'AAA',
        subjectName: '開発'
      }

      // 試験実施
      const result = await subAccountCodeController.insert(contractNormal, values)

      // 期待結果
      // 想定したデータがReturnされていること
      expect(result).toEqual(1)
    })

    test('異常：登録エラー', async () => {
      // 準備
      // 勘定科目検索結果
      accountCodefindOneSpy.mockReturnValue(null)

      // DBから補助科目登録時、返す補助科目インスタンスがnull
      subAccountCodefindAllSpy.mockReturnValue([])
      subAccountCodeCreateSpy.mockReturnValue(null)

      // パラメータの用意
      const values = {
        accountCodeId: 'AB001',
        subjectCode: 'AAA',
        subjectName: '開発'
      }

      // 試験実施
      const result = await subAccountCodeController.insert(contractNormal, values)

      // 期待結果
      // 想定したデータがReturnされていること
      expect(result).toEqual(-1)
    })

    test('異常：FinOne（AccountCode） DBエラー', async () => {
      // 準備
      // 勘定科目コード検索時、エラーが発生する場合
      const dbError = new Error()
      accountCodefindOneSpy.mockImplementation(() => {
        throw dbError
      })
      // DBから補助科目登録時、返す補助科目インスタンス
      subAccountCodefindAllSpy.mockReturnValue([])
      subAccountCodeCreateSpy.mockReturnValue(null)

      // パラメータの用意
      const values = {
        accountCodeId: 'AB001',
        subjectCode: 'AAA2',
        subjectName: '開発2'
      }

      // 試験実施
      await subAccountCodeController.insert(contractNormal, values)

      // 期待結果
      // 想定したデータがReturnされていること
      expect(errorSpy).toHaveBeenCalledWith({
        accountCodeId: values.accountCodeId,
        stack: expect.anything(),
        status: 0
      })
    })

    test('異常：FindAll DBエラー', async () => {
      // 準備
      // 勘定科目検索結果
      accountCodefindOneSpy.mockReturnValue(accountCodeMock[0])
      // 重複コード検索時、エラーが発生する場合
      const dbError = new Error()
      subAccountCodefindAllSpy.mockReturnValue(dbError)
      subAccountCodeCreateSpy.mockReturnValue(null)

      // パラメータの用意
      const values = {
        accountCodeId: 'AB001',
        subjectCode: 'AAA2',
        subjectName: '開発2'
      }

      // 試験実施
      await subAccountCodeController.insert(contractNormal, values)

      // 期待結果
      // 想定したデータがReturnされていること
      expect(errorSpy).toHaveBeenCalledWith({
        accountCodeId: values.accountCodeId,
        stack: expect.anything(),
        status: 0
      })
    })

    test('異常：create DBエラー', async () => {
      // 準備
      // 勘定科目検索結果
      accountCodefindOneSpy.mockReturnValue(accountCodeMock[0])
      // DB登録時、エラーが発生する場合
      const dbError = new Error()
      subAccountCodefindAllSpy.mockReturnValue([])
      subAccountCodeCreateSpy.mockReturnValue(dbError)

      // パラメータの用意
      const values = {
        accountCodeId: 'AB001',
        subjectCode: 'AAA4',
        subjectName: '開発4'
      }

      // 試験実施
      const result = await subAccountCodeController.insert(contractNormal, values)

      // 期待結果
      // 想定したデータがReturnされていること
      expect(result).toEqual(-1)
    })
  })

  describe('getSubAccountCodeList', () => {
    test('正常', async () => {
      // 準備
      // 勘定科目検索結果
      SubAccountCodeGetsubAccountCodeListSpy.mockReturnValue(subAccountCodeListResult)

      // 試験実施
      const result = await subAccountCodeController.getSubAccountCodeList()

      // 期待結果
      // 想定したデータがReturnされていること
      expect(result).toEqual(subAccountControllerResult)
    })

    test('異常：DBエラー', async () => {
      // 準備
      // 勘定科目検索結果
      const dbError = new Error()
      SubAccountCodeGetsubAccountCodeListSpy.mockImplementation(() => {
        throw dbError
      })

      // 試験実施
      await subAccountCodeController.getSubAccountCodeList()

      // 期待結果

      expect(errorSpy).toHaveBeenCalledWith({
        stack: expect.anything(),
        status: 0
      })
    })
  })

  describe('getSubAccountCode', () => {
    test('正常', async () => {
      // 準備
      // 勘定科目・補助科目テーブルOUTER JOIN結果
      const accountCodeAndSubAccount = {
        accountCodeId: 'f194969f-9307-4e18-a097-843aa6ce7b73',
        contractId: '6e2b28a9-84bb-41a4-b5af-6d6e421ea70a',
        accountCodeName: '普通預金',
        accountCode: '131',
        createdAt: '2021-12-20T02:12:40.549Z',
        updatedAt: '2021-12-20T02:12:40.549Z',
        'SubAccountCodes.subAccountCodeId': '308e7acf-072d-4533-94f5-dcdf5972007e',
        'SubAccountCodes.subjectCode': '188121',
        'SubAccountCodes.subjectName': 'テスト2'
      }
      subAccountCodefindAllSpy.mockReturnValue([accountCodeAndSubAccount])

      // 契約番号
      const contractId = '6e2b28a9-84bb-41a4-b5af-6d6e421ea70a'
      const subAccountCodeId = '308e7acf-072d-4533-94f5-dcdf5972007e'

      // 試験実施
      const result = await subAccountCodeController.getSubAccountCode(contractId, subAccountCodeId)

      // 期待結果
      expect(result).toMatchObject({
        subAccountCodeId: accountCodeAndSubAccount['SubAccountCodes.subAccountCodeId'],
        accountCodeId: accountCodeAndSubAccount.accountCodeId,
        accountCode: accountCodeAndSubAccount.accountCode,
        accountCodeName: accountCodeAndSubAccount.accountCodeName,
        subjectName: accountCodeAndSubAccount['SubAccountCodes.subjectName'],
        subjectCode: accountCodeAndSubAccount['SubAccountCodes.subjectCode']
      })
    })

    test('準正常：該当データがない場合', async () => {
      // 準備
      // データない場合
      subAccountCodefindAllSpy.mockReturnValue([])

      // 契約番号
      const contractId = '6e2b28a9-84bb-41a4-b5af-6d6e421ea70a'
      const subAccountCodeId = '308e7acf-072d-4533-94f5-dcdf5972007e'

      // 試験実施
      const result = await subAccountCodeController.getSubAccountCode(contractId, subAccountCodeId)

      // 期待結果
      expect(result).toBeNull()
    })

    test('異常：DBエラー発生', async () => {
      // 準備
      // データない場合
      const dbError = new Error("DatabaseError [SequelizeDatabaseError]: Invalid column name 'subAccountCodeId'.")
      dbError.code = 'EREQUEST'
      dbError.number = 207
      dbError.state = 1
      dbError.class = 16
      dbError.serverName = 'sqlserver'
      dbError.procName = ''
      dbError.lineNumber = 1
      dbError.sql = 'SELECT'
      subAccountCodefindAllSpy.mockImplementation(() => {
        throw dbError
      })

      // 契約番号
      const contractId = '6e2b28a9-84bb-41a4-b5af-6d6e421ea70a'
      const subAccountCodeId = '308e7acf-072d-4533-94f5-dcdf5972007e'

      // 試験実施
      const result = await subAccountCodeController.getSubAccountCode(contractId, subAccountCodeId)

      // 期待結果
      expect(errorSpy).toHaveBeenCalledWith({
        contractId: contractId,
        stack: expect.anything(),
        status: 0
      })
      expect(result).toMatchObject(dbError)
    })
  })

  describe('updateSubAccountCode', () => {
    test('正常', async () => {
      // 準備
      const contractId = '1af5541e-6d8c-4335-a570-b471ff8d58e7'
      const accountCodeId = '28559125-f0b9-4145-a3e0-7c31ad04eaee'
      const subAccountCodeId = '0a6eb23d-f91b-4266-ac72-eb59cb9f5ad1'
      const subjectCode = 'UTTEST01'
      const subAccountCodeName = 'テスト'

      accountCodeFindAllSpy.mockReturnValue([
        {
          subAccountCodeId: '0a6eb23d-f91b-4266-ac72-eb59cb9f5ad1',
          accountCodeId: '28559125-f0b9-4145-a3e0-7c31ad04eaee',
          accountCode: '112',
          accountCodeName: '小口現金',
          subjectName: 'テスト',
          subjectCode: '1'
        }
      ])

      const getUpdateTarget = new SubAccountCode()
      getUpdateTarget.subAccountCodeId = '0a6eb23d-f91b-4266-ac72-eb59cb9f5ad1'
      getUpdateTarget.accountCodeId = '28559125-f0b9-4145-a3e0-7c31ad04eaee'
      getUpdateTarget.subjectName = 'テスト'
      getUpdateTarget.subjectCode = '1'
      getUpdateTarget.createdAt = new Date('2021-12-23T02:10:35.708Z')
      getUpdateTarget.updatedAt = new Date('2021-12-23T02:10:35.708Z')
      getUpdateTarget._changed = new Set(['subjectCode'])

      subAccountcodeFindOneSpy.mockReturnValueOnce(getUpdateTarget)

      accountCodeFindAllSpy.mockReturnValueOnce([
        {
          accountCodeId: '28559125-f0b9-4145-a3e0-7c31ad04eae1',
          contractId: '1af5541e-6d8c-4335-a570-b471ff8d58e7',
          accountCodeName: '勘定テスト',
          accountCode: '0000',
          createdAt: new Date('2021-12-23T02:10:35.708Z'),
          updatedAt: new Date('2021-12-23T02:10:35.708Z'),
          'SubAccountCodes.subAccountCodeId': '0a6eb23d-f91b-4266-ac72-eb59cb9f5ad1',
          'SubAccountCodes.subjectCode': '123',
          'SubAccountCodes.subjectName': 'テスト'
        }
      ])

      // 実施
      const result = await subAccountCodeController.updateSubAccountCode(
        contractId,
        accountCodeId,
        subAccountCodeId,
        subjectCode,
        subAccountCodeName
      )

      // 期待結果
      // 正常の場合、「0」を返却
      expect(result).toBe(0)
    })

    test('準正常：subjectCode重複', async () => {
      // 準備
      const contractId = '1af5541e-6d8c-4335-a570-b471ff8d58e7'
      const accountCodeId = '28559125-f0b9-4145-a3e0-7c31ad04eae1'
      const subAccountCodeId = '0a6eb23d-f91b-4266-ac72-eb59cb9f5ad1'
      const subjectCode = 'UTTEST01'
      const subAccountCodeName = 'テスト'

      const motoSubAccountCode = {
        subAccountCodeId: '0a6eb23d-f91b-4266-ac72-eb59cb9f5ad1',
        accountCodeId: '28559125-f0b9-4145-a3e0-7c31ad04eaee',
        accountCode: '112',
        accountCodeName: '小口現金',
        subjectName: 'テスト',
        subjectCode: '1'
      }
      accountCodeFindAllSpy.mockReturnValueOnce([motoSubAccountCode])

      const getUpdateTarget = new SubAccountCode()
      getUpdateTarget.subAccountCodeId = '0a6eb23d-f91b-4266-ac72-eb59cb9f5ad1'
      getUpdateTarget.accountCodeId = '28559125-f0b9-4145-a3e0-7c31ad04eaee'
      getUpdateTarget.subjectName = 'テスト'
      getUpdateTarget.subjectCode = '1'
      getUpdateTarget.createdAt = new Date('2021-12-23T02:10:35.708Z')
      getUpdateTarget.updatedAt = new Date('2021-12-23T02:10:35.708Z')
      getUpdateTarget._changed = new Set(['subjectCode'])

      subAccountcodeFindOneSpy.mockReturnValue(getUpdateTarget)

      accountCodeFindAllSpy.mockReturnValueOnce([
        {
          accountCodeId: '28559125-f0b9-4145-a3e0-7c31ad04eae1',
          contractId: '1af5541e-6d8c-4335-a570-b471ff8d58e7',
          accountCodeName: '勘定テスト',
          accountCode: '0000',
          createdAt: new Date('2021-12-23T02:10:35.708Z'),
          updatedAt: new Date('2021-12-23T02:10:35.708Z'),
          'SubAccountCodes.subAccountCodeId': '0a6eb23d-f91b-4266-ac72-eb59cb9f5ad1',
          'SubAccountCodes.subjectCode': 'UTTEST01',
          'SubAccountCodes.subjectName': '重複テスト'
        }
      ])

      // 実施
      const result = await subAccountCodeController.updateSubAccountCode(
        contractId,
        accountCodeId,
        subAccountCodeId,
        subjectCode,
        subAccountCodeName
      )

      // 期待結果
      // 重複の場合、「-1」を返却
      expect(result).toBe(-1)
    })

    test('準正常：変更内容なし', async () => {
      // 準備
      const contractId = '1af5541e-6d8c-4335-a570-b471ff8d58e7'
      const accountCodeId = '28559125-f0b9-4145-a3e0-7c31ad04eaee'
      const subAccountCodeId = '0a6eb23d-f91b-4266-ac72-eb59cb9f5ad1'
      const subjectCode = '1'
      const subAccountCodeName = 'テスト'

      accountCodeFindAllSpy.mockReturnValue([
        {
          subAccountCodeId: '0a6eb23d-f91b-4266-ac72-eb59cb9f5ad1',
          accountCodeId: '28559125-f0b9-4145-a3e0-7c31ad04eaee',
          accountCode: '112',
          accountCodeName: '小口現金',
          subjectName: 'テスト',
          subjectCode: '1'
        }
      ])

      const getUpdateTarget = new SubAccountCode()
      getUpdateTarget.subAccountCodeId = '0a6eb23d-f91b-4266-ac72-eb59cb9f5ad1'
      getUpdateTarget.accountCodeId = '28559125-f0b9-4145-a3e0-7c31ad04eaee'
      getUpdateTarget.subjectName = 'テスト'
      getUpdateTarget.subjectCode = '1'
      getUpdateTarget.createdAt = new Date('2021-12-23T02:10:35.708Z')
      getUpdateTarget.updatedAt = new Date('2021-12-23T02:10:35.708Z')
      getUpdateTarget._changed = new Set()

      subAccountcodeFindOneSpy.mockReturnValueOnce(getUpdateTarget)

      accountCodeFindAllSpy.mockReturnValueOnce([
        {
          accountCodeId: '28559125-f0b9-4145-a3e0-7c31ad04eae1',
          contractId: '1af5541e-6d8c-4335-a570-b471ff8d58e7',
          accountCodeName: '勘定テスト',
          accountCode: '0000',
          createdAt: new Date('2021-12-23T02:10:35.708Z'),
          updatedAt: new Date('2021-12-23T02:10:35.708Z'),
          'SubAccountCodes.subAccountCodeId': '0a6eb23d-f91b-4266-ac72-eb59cb9f5ad1',
          'SubAccountCodes.subjectCode': '1233',
          'SubAccountCodes.subjectName': 'テスト'
        }
      ])

      // 実施
      const result = await subAccountCodeController.updateSubAccountCode(
        contractId,
        accountCodeId,
        subAccountCodeId,
        subjectCode,
        subAccountCodeName
      )

      // 期待結果
      // 登録されている場合、「1」を返却
      expect(result).toBe(1)
    })

    test('準正常：DBエラー発生', async () => {
      // 準備
      const contractId = '1af5541e-6d8c-4335-a570-b471ff8d58e7'
      const accountCodeId = '28559125-f0b9-4145-a3e0-7c31ad04eaee'
      const subAccountCodeId = '0a6eb23d-f91b-4266-ac72-eb59cb9f5ad1'
      const subjectCode = '1'
      const subAccountCodeName = 'テスト'

      const dbError = new Error('DB ERROR')
      accountCodeFindAllSpy.mockImplementation(() => {
        throw dbError
      })

      const getUpdateTarget = new SubAccountCode()
      getUpdateTarget.subAccountCodeId = '0a6eb23d-f91b-4266-ac72-eb59cb9f5ad1'
      getUpdateTarget.accountCodeId = '28559125-f0b9-4145-a3e0-7c31ad04eaee'
      getUpdateTarget.subjectName = 'テスト'
      getUpdateTarget.subjectCode = '1'
      getUpdateTarget.createdAt = new Date('2021-12-23T02:10:35.708Z')
      getUpdateTarget.updatedAt = new Date('2021-12-23T02:10:35.708Z')
      getUpdateTarget._changed = new Set()

      subAccountcodeFindOneSpy.mockReturnValueOnce(getUpdateTarget)

      accountCodeFindAllSpy.mockReturnValueOnce([
        {
          accountCodeId: '28559125-f0b9-4145-a3e0-7c31ad04eae1',
          contractId: '1af5541e-6d8c-4335-a570-b471ff8d58e7',
          accountCodeName: '勘定テスト',
          accountCode: '0000',
          createdAt: new Date('2021-12-23T02:10:35.708Z'),
          updatedAt: new Date('2021-12-23T02:10:35.708Z'),
          'SubAccountCodes.subAccountCodeId': '0a6eb23d-f91b-4266-ac72-eb59cb9f5ad1',
          'SubAccountCodes.subjectCode': '1233',
          'SubAccountCodes.subjectName': 'テスト'
        }
      ])

      // 実施
      const result = await subAccountCodeController.updateSubAccountCode(
        contractId,
        accountCodeId,
        subAccountCodeId,
        subjectCode,
        subAccountCodeName
      )

      // 期待結果
      // DBエラーの場合、エラー内容を返却
      expect(logger.error).toHaveBeenCalledWith({
        contractId: contractId,
        stack: dbError.stack,
        status: 0
      })
      expect(result).toMatchObject(dbError)
    })

    test('準正常：補助科目オブジェクト取得失敗', async () => {
      // 準備
      const contractId = '1af5541e-6d8c-4335-a570-b471ff8d58e7'
      const accountCodeId = '28559125-f0b9-4145-a3e0-7c31ad04eaee'
      const subAccountCodeId = '0a6eb23d-f91b-4266-ac72-eb59cb9f5ad1'
      const subjectCode = '1'
      const subAccountCodeName = 'テスト'

      accountCodeFindAllSpy.mockReturnValue([
        {
          subAccountCodeId: '0a6eb23d-f91b-4266-ac72-eb59cb9f5ad1',
          accountCodeId: '28559125-f0b9-4145-a3e0-7c31ad04eaee',
          accountCode: '112',
          accountCodeName: '小口現金',
          subjectName: 'テスト',
          subjectCode: '1'
        }
      ])

      const getUpdateTarget = new SubAccountCode()
      getUpdateTarget.subAccountCodeId = '0a6eb23d-f91b-4266-ac72-eb59cb9f5ad1'
      getUpdateTarget.accountCodeId = '28559125-f0b9-4145-a3e0-7c31ad04eaee'
      getUpdateTarget.subjectName = 'テスト'
      getUpdateTarget.subjectCode = '1'
      getUpdateTarget.createdAt = new Date('2021-12-23T02:10:35.708Z')
      getUpdateTarget.updatedAt = new Date('2021-12-23T02:10:35.708Z')
      getUpdateTarget._changed = new Set()

      subAccountcodeFindOneSpy.mockReturnValueOnce(null)

      accountCodeFindAllSpy.mockReturnValueOnce([
        {
          accountCodeId: '28559125-f0b9-4145-a3e0-7c31ad04eae1',
          contractId: '1af5541e-6d8c-4335-a570-b471ff8d58e7',
          accountCodeName: '勘定テスト',
          accountCode: '0000',
          createdAt: new Date('2021-12-23T02:10:35.708Z'),
          updatedAt: new Date('2021-12-23T02:10:35.708Z'),
          'SubAccountCodes.subAccountCodeId': '0a6eb23d-f91b-4266-ac72-eb59cb9f5ad1',
          'SubAccountCodes.subjectCode': '1233',
          'SubAccountCodes.subjectName': 'テスト'
        }
      ])

      // 実施
      const result = await subAccountCodeController.updateSubAccountCode(
        contractId,
        accountCodeId,
        subAccountCodeId,
        subjectCode,
        subAccountCodeName
      )

      // 期待結果
      // 補助科目がない場合「-2」を返却する
      expect(result).toBe(-2)
    })

    test('準正常：勘定科目と補助科目JOINデータなし', async () => {
      // 準備
      const contractId = '1af5541e-6d8c-4335-a570-b471ff8d58e7'
      const accountCodeId = '28559125-f0b9-4145-a3e0-7c31ad04eaee'
      const subAccountCodeId = '0a6eb23d-f91b-4266-ac72-eb59cb9f5ad1'
      const subjectCode = '1'
      const subAccountCodeName = 'テスト'

      accountCodeFindAllSpy.mockReturnValueOnce(null)

      const getUpdateTarget = new SubAccountCode()
      getUpdateTarget.subAccountCodeId = '0a6eb23d-f91b-4266-ac72-eb59cb9f5ad1'
      getUpdateTarget.accountCodeId = '28559125-f0b9-4145-a3e0-7c31ad04eaee'
      getUpdateTarget.subjectName = 'テスト'
      getUpdateTarget.subjectCode = '1'
      getUpdateTarget.createdAt = new Date('2021-12-23T02:10:35.708Z')
      getUpdateTarget.updatedAt = new Date('2021-12-23T02:10:35.708Z')
      getUpdateTarget._changed = new Set()

      subAccountcodeFindOneSpy.mockReturnValueOnce(null)

      accountCodeFindAllSpy.mockReturnValueOnce([
        {
          accountCodeId: '28559125-f0b9-4145-a3e0-7c31ad04eae1',
          contractId: '1af5541e-6d8c-4335-a570-b471ff8d58e7',
          accountCodeName: '勘定テスト',
          accountCode: '0000',
          createdAt: new Date('2021-12-23T02:10:35.708Z'),
          updatedAt: new Date('2021-12-23T02:10:35.708Z'),
          'SubAccountCodes.subAccountCodeId': '0a6eb23d-f91b-4266-ac72-eb59cb9f5ad1',
          'SubAccountCodes.subjectCode': '1233',
          'SubAccountCodes.subjectName': 'テスト'
        }
      ])

      // 実施
      const result = await subAccountCodeController.updateSubAccountCode(
        contractId,
        accountCodeId,
        subAccountCodeId,
        subjectCode,
        subAccountCodeName
      )

      // 期待結果
      // JOIN失敗の場合「-3」を返却
      expect(result).toBe(-3)
    })

    test('準正常：transactionエラー', async () => {
      // 準備
      const contractId = '1af5541e-6d8c-4335-a570-b471ff8d58e7'
      const accountCodeId = '28559125-f0b9-4145-a3e0-7c31ad04eaee'
      const subAccountCodeId = '0a6eb23d-f91b-4266-ac72-eb59cb9f5ad1'
      const subjectCode = 'UTTEST01'
      const subAccountCodeName = 'テスト'

      const dbError = new Error('DB ERROR')

      accountCodeFindAllSpy.mockReturnValue([
        {
          subAccountCodeId: '0a6eb23d-f91b-4266-ac72-eb59cb9f5ad1',
          accountCodeId: '28559125-f0b9-4145-a3e0-7c31ad04eaee',
          accountCode: '112',
          accountCodeName: '小口現金',
          subjectName: 'テスト',
          subjectCode: '1'
        }
      ])

      const getUpdateTarget = new SubAccountCode()
      getUpdateTarget.subAccountCodeId = '0a6eb23d-f91b-4266-ac72-eb59cb9f5ad1'
      getUpdateTarget.accountCodeId = '28559125-f0b9-4145-a3e0-7c31ad04eaee'
      getUpdateTarget.subjectName = 'テスト'
      getUpdateTarget.subjectCode = '1'
      getUpdateTarget.createdAt = new Date('2021-12-23T02:10:35.708Z')
      getUpdateTarget.updatedAt = new Date('2021-12-23T02:10:35.708Z')
      getUpdateTarget._changed = new Set(['subjectCode'])

      subAccountcodeFindOneSpy.mockReturnValue(getUpdateTarget)

      checkAndLockSubAccountCodeSpy.mockImplementation(() => {
        throw dbError
      })

      // 実施
      const result = await subAccountCodeController.updateSubAccountCode(
        contractId,
        accountCodeId,
        subAccountCodeId,
        subjectCode,
        subAccountCodeName
      )

      // 期待結果
      // エラーの場合、エラー内容を返却
      expect(logger.error).toHaveBeenCalledWith({
        contractId: contractId,
        stack: dbError.stack,
        status: 0
      })
      expect(result).toMatchObject(dbError)
    })
  })

  // 補助科目削除
  describe('deleteForSubAccountCode', () => {
    test('正常', async () => {
      // 準備
      // 契約番号
      const accountCodeId = 'f194969f-9307-4e18-a097-843aa6ce7b73'
      const subAccountCodeId = '308e7acf-072d-4533-94f5-dcdf5972007e'

      // 補助科目検索（Mockデータ）、削除対象の勘定科目と紐づいてる補助科目
      const savedDate = new Date().toISOString()
      const subAccounts = {
        subAccountCodeId: '308e7acf-072d-4533-94f5-dcdf5972007e',
        accountCodeId: accountCodeId,
        subjectName: '補助科目1',
        subjectCode: 'TEST1',
        createdAt: savedDate,
        updatedAt: savedDate,
        dataValues: {
          accountCodeId: accountCodeId
        },
        destroy: async () => {}
      }
      subAccountcodeFindOneSpy.mockReturnValue(subAccounts)
      // 試験実施
      const result = await subAccountCodeController.deleteForSubAccountCode(subAccountCodeId)

      // 期待結果
      // 正常削除の「1」を返す
      expect(result).toEqual(1)
    })

    test('準正常：補助科目削除（既に削除されている場合）', async () => {
      // subAccountCodeId
      const subAccountCodeId = '308e7acf-072d-4533-94f5-dcdf5972007e'

      // 勘定科目検索（Mockデータ）
      SubAccountCode.findOne = jest.fn((value) => {
        return null
      })

      // 試験実施
      const result = await subAccountCodeController.deleteForSubAccountCode(subAccountCodeId)

      // 準正常削除の場合、「-1」を返す
      expect(result).toBe(-1)
    })
    test('準正常：補助科目削除（DBエラー）', async () => {
      // subAccountCodeId
      const subAccountCodeId = '308e7acf-072d-4533-94f5-dcdf5972007e'

      // 勘定科目検索（Mockデータ）
      const dbError = new Error('DB Error')
      SubAccountCode.findOne = jest.fn((value) => {
        return dbError
      })

      // 試験実施
      const result = await subAccountCodeController.deleteForSubAccountCode(subAccountCodeId)

      // 準正常削除の場合、「0」を返す
      expect(result).toBe(0)
    })
  })

  describe('checkDataForSubAccountCode', () => {
    test('正常', async () => {
      // 準備
      // 契約番号
      const accountCodeId = 'f194969f-9307-4e18-a097-843aa6ce7b73'
      const subAccountCodeId = '308e7acf-072d-4533-94f5-dcdf5972007e'

      // 補助科目検索（Mockデータ）、削除対象の勘定科目と紐づいてる補助科目
      const savedDate = new Date().toISOString()
      const subAccounts = {
        subAccountCodeId: '308e7acf-072d-4533-94f5-dcdf5972007e',
        accountCodeId: accountCodeId,
        subjectName: '補助科目1',
        subjectCode: 'TEST1',
        createdAt: savedDate,
        updatedAt: savedDate,
        dataValues: {
          accountCodeId: accountCodeId
        },
        destroy: async () => {}
      }
      subAccountcodeFindOneSpy.mockReturnValue(subAccounts)
      // 試験実施
      const result = await subAccountCodeController.checkDataForSubAccountCode(subAccountCodeId)

      // 期待結果
      // 正常削除の「1」を返す
      expect(result).toEqual(1)
    })
    test('準正常：既に削除されたと想定する（既に削除されている場合）', async () => {
      // subAccountCodeId
      const subAccountCodeId = '308e7acf-072d-4533-94f5-dcdf5972007e'

      // 勘定科目検索（Mockデータ）
      SubAccountCode.findOne = jest.fn((value) => {
        return null
      })

      // 試験実施
      const result = await subAccountCodeController.checkDataForSubAccountCode(subAccountCodeId)

      // 準正常削除の場合、「-1」を返す
      expect(result).toEqual(-1)
    })
    test('準正常：補助科目削除（DBエラー）', async () => {
      // subAccountCodeId
      const subAccountCodeId = '308e7acf-072d-4533-94f5-dcdf5972007e'

      // 勘定科目検索（Mockデータ）
      const dbError = new Error('DB Error')
      SubAccountCode.findOne = jest.fn((value) => {
        throw dbError
      })

      // 試験実施
      const result = await subAccountCodeController.checkDataForSubAccountCode(subAccountCodeId)

      // 準正常削除の場合、「0」を返す
      expect(result).toEqual(0)
    })
  })
})
