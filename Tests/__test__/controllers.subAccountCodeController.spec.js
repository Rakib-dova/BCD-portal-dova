'use strict'
jest.mock('../../Application/models')
jest.mock('../../Application/lib/logger')

const subAccountCodeController = require('../../Application/controllers/subAccountCodeController')
const logger = require('../../Application/lib/logger')
const AccountCode = require('../../Application/models').AccountCode
const SubAccountCode = require('../../Application/models').SubAccountCode
const accountCodeMock = require('../mockDB/AccountCode_Table')
const sequelize = require('../../Application/models').sequelize
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

const transaction = {
  commit: () => {},
  rollback: () => {},
  LOCK: {}
}

let errorSpy, contractId, findAllSpy, infoSpy, createSpy, accountCodefindOneSpy, transactionSpy

describe('subAccountCodeControllerのテスト', () => {
  beforeEach(() => {
    createSpy = jest.spyOn(SubAccountCode, 'create')
    findAllSpy = jest.spyOn(SubAccountCode, 'findAll')
    accountCodefindOneSpy = jest.spyOn(AccountCode, 'findOne')
    errorSpy = jest.spyOn(logger, 'error')
    infoSpy = jest.spyOn(logger, 'info')
    transactionSpy = jest.spyOn(sequelize, 'transaction')
  })
  afterEach(() => {
    createSpy.mockRestore()
    findAllSpy.mockRestore()
    accountCodefindOneSpy.mockRestore()
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
      // 勘定科目検索結果
      accountCodefindOneSpy.mockReturnValue(accountCodeMock[0])

      // DBから補助科目登録時、返す補助科目インスタンス
      findAllSpy.mockReturnValue(dbSubAccountCodeTable)
      createSpy.mockReturnValue(subAccountCodeDataResult)

      // transactionモックの用意
      transactionSpy.mockReturnValue({ ...transaction })

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

    test('異常：重複された補助科目登録する時', async () => {
      // 準備
      // 勘定科目検索結果
      accountCodefindOneSpy.mockReturnValue(accountCodeMock[0])

      // DBから補助科目登録時、返す補助科目インスタンス
      findAllSpy.mockReturnValue([subAccountCodeDataResult])
      createSpy.mockReturnValue(subAccountCodeDataResult)

      // transactionモックの用意
      transactionSpy.mockReturnValue({ ...transaction })

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
      accountCodefindOneSpy.mockReturnValue(accountCodeMock[0])

      // DBから補助科目登録時、返す補助科目インスタンス
      findAllSpy.mockReturnValue([])
      createSpy.mockReturnValue(null)

      // transactionモックの用意
      transactionSpy.mockReturnValue({ ...transaction })

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
      findAllSpy.mockReturnValue([])
      createSpy.mockReturnValue(null)

      // transactionモックの用意
      transactionSpy.mockReturnValue({ ...transaction })

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
      findAllSpy.mockReturnValue(dbError)
      createSpy.mockReturnValue(null)

      // transactionモックの用意
      transactionSpy.mockReturnValue({ ...transaction })

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
      findAllSpy.mockReturnValue([])
      createSpy.mockReturnValue(dbError)

      // transactionモックの用意
      transactionSpy.mockReturnValue({ ...transaction })

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
})
