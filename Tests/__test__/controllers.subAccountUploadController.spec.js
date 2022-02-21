'use strict'
jest.mock('../../Application/models')
jest.mock('../../Application/lib/logger')

const accountCodeController = require('../../Application/controllers/accountCodeController')
const subAccountUploadController = require('../../Application/controllers/subAccountUploadController')
const subAccountCodeController = require('../../Application/controllers/subAccountCodeController')
const logger = require('../../Application/lib/logger')
const AccountCode = require('../../Application/models').AccountCode
const SubAccountCode = require('../../Application/models').SubAccountCode
const sequelize = require('../../Application/models').sequelize
const codeAccountId = '5a927284-57c9-4594-9ed8-472d261a6102'
const subAccountCode = '12327284-57c9-4594-9ed8-472d261a6102'
const codeAccountDataResult = new AccountCode()
codeAccountDataResult.accountCodeId = codeAccountId
codeAccountDataResult.contractId = 'f10b95a4-74a1-4691-880a-827c9f1a1faf'
codeAccountDataResult.accountCodeName = 'TEST1'
codeAccountDataResult.accountCode = 'TEST1'
codeAccountDataResult.createdAt = new Date('2021-07-09T04:30:00.000Z')
codeAccountDataResult.updatedAt = new Date('2021-07-09T04:30:00.000Z')
const subAccountCodeResult = new SubAccountCode()
subAccountCodeResult.subAccountCodeId = subAccountCode
subAccountCodeResult.accountCodeId = codeAccountId
subAccountCodeResult.subjectName = 'TEST1homei'
subAccountCodeResult.subjectCode = 'TEST1hoko'
subAccountCodeResult.createdAt = new Date('2021-07-09T04:30:00.000Z')
subAccountCodeResult.updatedAt = new Date('2021-07-09T04:30:00.000Z')

const path = require('path')
const fs = require('fs')

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

const dbSubAccountCodeTable = []
dbSubAccountCodeTable.push(subAccountCodeResult)

let errorSpy, contractId, findAllSpy, infoSpy, createSpy, findOneSpy, transactionSpy
let pathSpy, subAccountCodeControllerInsertSpy, subAccountCodefindAllSpy, searchAccountCodeSpy

describe('subAccountUploadControllerのテスト', () => {
  beforeEach(() => {
    createSpy = jest.spyOn(AccountCode, 'create')
    findAllSpy = jest.spyOn(AccountCode, 'findAll')
    subAccountCodefindAllSpy = jest.spyOn(SubAccountCode, 'findAll')
    findOneSpy = jest.spyOn(AccountCode, 'findOne')
    errorSpy = jest.spyOn(logger, 'error')
    infoSpy = jest.spyOn(logger, 'info')
    transactionSpy = jest.spyOn(sequelize, 'transaction')
    pathSpy = jest.spyOn(path, 'resolve')
    subAccountCodeControllerInsertSpy = jest.spyOn(subAccountCodeController, 'insert')
    searchAccountCodeSpy = jest.spyOn(accountCodeController, 'searchAccountCode')
  })
  afterEach(() => {
    createSpy.mockRestore()
    findAllSpy.mockRestore()
    subAccountCodefindAllSpy.mockRestore()
    findOneSpy.mockRestore()
    errorSpy.mockRestore()
    infoSpy.mockRestore()
    transactionSpy.mockRestore()
    pathSpy.mockRestore()
    subAccountCodeControllerInsertSpy.mockRestore()
    searchAccountCodeSpy.mockRestore()
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

  // 補助科目データ
  // データが1つの場合
  const subAccountCodeFileData1 = Buffer.from(
    fs.readFileSync('./testData/subAccountCodeUpload_test1.csv', {
      encoding: 'utf-8',
      flag: 'r'
    })
  ).toString('base64')

  // 異常系1
  const subAccountCodeFileData2 = Buffer.from(
    fs.readFileSync('./testData/subAccountCodeUpload_test2.csv', {
      encoding: 'utf-8',
      flag: 'r'
    })
  ).toString('base64')

  // 異常系2
  const subAccountCodeFileData3 = Buffer.from(
    fs.readFileSync('./testData/subAccountCodeUpload_test3.csv', {
      encoding: 'utf-8',
      flag: 'r'
    })
  ).toString('base64')

  // 異常系3
  const subAccountCodeFileData4 = Buffer.from(
    fs.readFileSync('./testData/subAccountCodeUpload_test4.csv', {
      encoding: 'utf-8',
      flag: 'r'
    })
  ).toString('base64')

  // 異常系4
  const subAccountCodeFileData5 = Buffer.from(
    fs.readFileSync('./testData/subAccountCodeUpload_test5.csv', {
      encoding: 'utf-8',
      flag: 'r'
    })
  ).toString('base64')

  // 異常系5
  const subAccountCodeFileData6 = Buffer.from(
    fs.readFileSync('./testData/subAccountCodeUpload_test6.csv', {
      encoding: 'utf-8',
      flag: 'r'
    })
  ).toString('base64')

  // 異常系6
  const subAccountCodeFileData7 = Buffer.from(
    fs.readFileSync('./testData/subAccountCodeUpload_test7.csv', {
      encoding: 'utf-8',
      flag: 'r'
    })
  ).toString('base64')

  // 異常系7
  const subAccountCodeFileData8 = Buffer.from(
    fs.readFileSync('./testData/subAccountCodeUpload_test8.csv', {
      encoding: 'utf-8',
      flag: 'r'
    })
  ).toString('base64')

  // 異常系8
  const subAccountCodeFileData9 = Buffer.from(
    fs.readFileSync('./testData/subAccountCodeUpload_test9.csv', {
      encoding: 'utf-8',
      flag: 'r'
    })
  ).toString('base64')

  // 異常系9
  const subAccountCodeFileData10 = Buffer.from(
    fs.readFileSync('./testData/subAccountCodeUpload_test10.csv', {
      encoding: 'utf-8',
      flag: 'r'
    })
  ).toString('base64')

  // 異常系10
  const subAccountCodeFileData11 = Buffer.from(
    fs.readFileSync('./testData/subAccountCodeUpload_test11.csv', {
      encoding: 'utf-8',
      flag: 'r'
    })
  ).toString('base64')

  // BUG3763対応
  const subAccountCodeFileData12 = Buffer.from(
    fs.readFileSync('./testData/subAccountCodeUpload_test12.csv', {
      encoding: 'utf-8',
      flag: 'r'
    })
  ).toString('base64')

  describe('upload', () => {
    test('正常', async () => {
      // 準備
      // DBから勘定科目登録時、返す勘定科目インスタンス
      findAllSpy.mockReturnValue(dbAccountCodeTable)
      createSpy.mockReturnValue(codeAccountDataResult)
      const file = {
        originalname: 'test1.csv',
        filename: '8d73eae9e5bcd33f5863b9251a76c551',
        userId: 'userId'
      }

      // 補助科目一括作成
      const today = new Date().getTime()
      const filename = '補助科目' + '_' + today + '_' + file.userId + '_' + file.originalname + '.csv'
      const newFilePath = path.resolve('/home/upload', filename)
      fs.writeFileSync(newFilePath, Buffer.from(decodeURIComponent(subAccountCodeFileData1), 'base64').toString('utf8'))

      pathSpy.mockReturnValue(newFilePath)

      subAccountCodeControllerInsertSpy.mockReturnValueOnce(0)

      // 試験実施
      const result = await subAccountUploadController.upload(file, contractNormal)

      // 期待結果
      // 想定したデータがReturnされていること
      expect(result).toEqual(0)
    })

    test('異常：ヘッダ異常', async () => {
      // 準備
      findAllSpy.mockReturnValue(dbAccountCodeTable)
      createSpy.mockReturnValue(codeAccountDataResult)
      // 補助科目一括作成
      const fs = require('fs')
      const uploadFilePath = path.resolve('/home/upload/test2.csv')
      fs.writeFileSync(
        uploadFilePath,
        Buffer.from(decodeURIComponent(subAccountCodeFileData2), 'base64').toString('utf8')
      )
      pathSpy.mockReturnValue('/home/upload/test2.csv')
      const file = {
        userId: 'userId',
        originalname: 'test2.csv',
        filename: '8d73eae9e5bcd33f5863b9251a76c551'
      }
      subAccountCodeControllerInsertSpy.mockReturnValue(0)

      // 試験実施
      const result = await subAccountUploadController.upload(file, contractNormal)

      // 期待結果
      // 想定したデータがReturnされていること
      expect(result).toEqual(-1)
    })

    test('異常：データなし', async () => {
      // 準備
      findAllSpy.mockReturnValue(dbAccountCodeTable)
      createSpy.mockReturnValue(codeAccountDataResult)
      // 補助科目一括作成
      const fs = require('fs')
      const uploadFilePath = path.resolve('/home/upload/test3.csv')
      fs.writeFileSync(
        uploadFilePath,
        Buffer.from(decodeURIComponent(subAccountCodeFileData3), 'base64').toString('utf8')
      )
      pathSpy.mockReturnValue('/home/upload/test3.csv')
      const file = {
        userId: 'userId',
        originalname: 'test3.csv',
        filename: '8d73eae9e5bcd33f5863b9251a76c551'
      }
      subAccountCodeControllerInsertSpy.mockReturnValue(0)

      // 試験実施
      const result = await subAccountUploadController.upload(file, contractNormal)

      // 期待結果
      // 想定したデータがReturnされていること
      expect(result).toEqual(-2)
    })

    test('異常：勘定科目コード検索結果なし', async () => {
      // 準備
      findAllSpy.mockReturnValue(dbAccountCodeTable)
      createSpy.mockReturnValue(codeAccountDataResult)
      // 補助科目一括作成
      const fs = require('fs')
      const uploadFilePath = path.resolve('/home/upload/test12.csv')
      fs.writeFileSync(
        uploadFilePath,
        Buffer.from(decodeURIComponent(subAccountCodeFileData11), 'base64').toString('utf8')
      )
      pathSpy.mockReturnValue('/home/upload/test12.csv')
      const file = {
        userId: 'userId',
        originalname: 'test12.csv',
        filename: '8d73eae9e5bcd33f5863b9251a76c551'
      }
      subAccountCodeControllerInsertSpy.mockReturnValue(0)
      searchAccountCodeSpy.mockReturnValue([])

      // 試験実施
      const result = await subAccountUploadController.upload(file, contractNormal)

      // 期待結果
      // 想定したデータがReturnされていること
      expect(result).toEqual([
        { header: ['行数', '勘定科目コード', '補助科目コード', '補助科目名', '詳細'] },
        {
          accountCode: 'TEST2',
          errorData: '未登録の勘定科目コードです。事前に「勘定科目登録画面」から勘定科目コードを登録してください。',
          idx: 1,
          subjectCode: 'TEST1hoko',
          subjectName: 'TEST1homei'
        }
      ])
    })

    test('異常：200データ以上', async () => {
      // 準備
      findAllSpy.mockReturnValue(dbAccountCodeTable)
      createSpy.mockReturnValue(codeAccountDataResult)
      // 補助科目一括作成
      const fs = require('fs')
      const uploadFilePath = path.resolve('/home/upload/test4.csv')
      fs.writeFileSync(
        uploadFilePath,
        Buffer.from(decodeURIComponent(subAccountCodeFileData4), 'base64').toString('utf8')
      )
      pathSpy.mockReturnValue('/home/upload/test4.csv')
      const file = {
        userId: 'userId',
        originalname: 'test4.csv',
        filename: '8d73eae9e5bcd33f5863b9251a76c551'
      }
      subAccountCodeControllerInsertSpy.mockReturnValue(0)

      // 試験実施
      const result = await subAccountUploadController.upload(file, contractNormal)

      // 期待結果
      // 想定したデータがReturnされていること
      expect(result).toEqual(-3)
    })

    test('異常：行ごとバリデーションチェック', async () => {
      // 準備
      findAllSpy.mockReturnValue(dbAccountCodeTable)
      createSpy.mockReturnValue(codeAccountDataResult)
      // 補助科目一括作成
      const fs = require('fs')
      const uploadFilePath = path.resolve('/home/upload/test5.csv')
      fs.writeFileSync(
        uploadFilePath,
        Buffer.from(decodeURIComponent(subAccountCodeFileData5), 'base64').toString('utf8')
      )
      pathSpy.mockReturnValue('/home/upload/test5.csv')
      const file = {
        userId: 'userId',
        originalname: 'test5.csv',
        filename: '8d73eae9e5bcd33f5863b9251a76c551'
      }
      subAccountCodeControllerInsertSpy.mockReturnValue(0)

      // 試験実施
      const result = await subAccountUploadController.upload(file, contractNormal)

      // 期待結果
      // 想定したデータがReturnされていること
      expect(result).toEqual(-4)
    })

    test('異常：行ごとバリデーションチェック(勘定科目コード、補助科目コードと名)', async () => {
      // 準備
      findAllSpy.mockReturnValue(dbAccountCodeTable)
      createSpy.mockReturnValue(codeAccountDataResult)
      // 補助科目一括作成
      const fs = require('fs')
      const uploadFilePath = path.resolve('/home/upload/test6.csv')
      fs.writeFileSync(
        uploadFilePath,
        Buffer.from(decodeURIComponent(subAccountCodeFileData6), 'base64').toString('utf8')
      )
      pathSpy.mockReturnValue('/home/upload/test6.csv')
      const file = {
        userId: 'userId',
        originalname: 'test6.csv',
        filename: '8d73eae9e5bcd33f5863b9251a76c551'
      }
      subAccountCodeControllerInsertSpy.mockReturnValue(0)

      // 試験実施
      const result = await subAccountUploadController.upload(file, contractNormal)

      // 期待結果
      // 想定したデータがReturnされていること
      expect(result).toEqual([
        { header: ['行数', '勘定科目コード', '補助科目コード', '補助科目名', '詳細'] },
        {
          accountCode: 'TEST1kankoaaaaaa',
          errorData:
            '勘定科目コードは10文字以内で入力してください。補助科目コードは10文字以内で入力してください。補助科目名は40文字以内で入力してください。',
          idx: 1,
          subjectCode: 'TEST1hokoaaaaaaaaaaaaaa',
          subjectName: 'TEST1homeiaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
        }
      ])
    })

    test('異常：10桁数チェック', async () => {
      // 準備
      findAllSpy.mockReturnValue(dbAccountCodeTable)
      createSpy.mockReturnValue(codeAccountDataResult)
      // 補助科目一括作成
      const fs = require('fs')
      const uploadFilePath = path.resolve('/home/upload/test7.csv')
      fs.writeFileSync(
        uploadFilePath,
        Buffer.from(decodeURIComponent(subAccountCodeFileData7), 'base64').toString('utf8')
      )
      pathSpy.mockReturnValue('/home/upload/test7.csv')
      const file = {
        userId: 'userId',
        originalname: 'test7.csv',
        filename: '8d73eae9e5bcd33f5863b9251a76c551'
      }

      // 試験実施
      const result = await subAccountUploadController.upload(file, contractNormal)

      // 期待結果
      // 想定したデータがReturnされていること
      expect(result).toEqual([
        { header: ['行数', '勘定科目コード', '補助科目コード', '補助科目名', '詳細'] },
        {
          accountCode: 'TEST1kanko',
          errorData: '補助科目コードは10文字以内で入力してください。',
          idx: 1,
          subjectCode: '1111111111111111',
          subjectName: 'TEST1homei'
        }
      ])
    })

    test('異常：BUG3763対応(特殊文字バリデーションチェック)', async () => {
      // 準備
      findAllSpy.mockReturnValue(dbAccountCodeTable)
      createSpy.mockReturnValue(codeAccountDataResult)
      // 補助科目一括作成
      const fs = require('fs')
      const uploadFilePath = path.resolve('/home/upload/testBUG3763.csv')
      fs.writeFileSync(
        uploadFilePath,
        Buffer.from(decodeURIComponent(subAccountCodeFileData12), 'base64').toString('utf8')
      )
      pathSpy.mockReturnValue('/home/upload/testBUG3763.csv')
      const file = {
        userId: 'userId',
        originalname: 'testBUG3763.csv',
        filename: '8d73eae9e5bcd33f5863b9251a76c551'
      }

      // 試験実施
      const result = await subAccountUploadController.upload(file, contractNormal)

      // 期待結果
      // 想定したデータがReturnされていること
      expect(result).toEqual([
        { header: ['行数', '勘定科目コード', '補助科目コード', '補助科目名', '詳細'] },
        {
          idx: 1,
          accountCode: 'TEST2',
          errorData: '補助科目コードは英数字で入力してください。',
          subjectCode: 'BUG3673!',
          subjectName: 'BUG3673'
        },
        {
          idx: 2,
          accountCode: 'TEST2',
          errorData: '補助科目コードは英数字で入力してください。',
          subjectCode: 'BUG3673"',
          subjectName: 'BUG3673'
        },
        {
          idx: 3,
          accountCode: 'TEST2',
          errorData: '補助科目コードは英数字で入力してください。',
          subjectCode: 'BUG3673#',
          subjectName: 'BUG3673'
        },
        {
          idx: 4,
          accountCode: 'TEST2',
          errorData: '補助科目コードは英数字で入力してください。',
          subjectCode: 'BUG3673$',
          subjectName: 'BUG3673'
        },
        {
          idx: 5,
          accountCode: 'TEST2',
          errorData: '補助科目コードは英数字で入力してください。',
          subjectCode: 'BUG3673%',
          subjectName: 'BUG3673'
        },
        {
          idx: 6,
          accountCode: 'TEST2',
          errorData: '補助科目コードは英数字で入力してください。',
          subjectCode: 'BUG3673&',
          subjectName: 'BUG3673'
        },
        {
          idx: 7,
          accountCode: 'TEST2',
          errorData: '補助科目コードは英数字で入力してください。',
          subjectCode: "BUG3673'",
          subjectName: 'BUG3673'
        },
        {
          idx: 8,
          accountCode: 'TEST2',
          errorData: '補助科目コードは英数字で入力してください。',
          subjectCode: 'BUG3673(',
          subjectName: 'BUG3673'
        },
        {
          idx: 9,
          accountCode: 'TEST2',
          errorData: '補助科目コードは英数字で入力してください。',
          subjectCode: 'BUG3673)',
          subjectName: 'BUG3673'
        },
        {
          idx: 10,
          accountCode: 'TEST2',
          errorData: '補助科目コードは英数字で入力してください。',
          subjectCode: 'BUG3673-',
          subjectName: 'BUG3673'
        },
        {
          idx: 11,
          accountCode: 'TEST2',
          errorData: '補助科目コードは英数字で入力してください。',
          subjectCode: 'BUG3673=',
          subjectName: 'BUG3673'
        },
        {
          idx: 12,
          accountCode: 'TEST2',
          errorData: '補助科目コードは英数字で入力してください。',
          subjectCode: 'BUG3673~',
          subjectName: 'BUG3673'
        },
        {
          idx: 13,
          accountCode: 'TEST2',
          errorData: '補助科目コードは英数字で入力してください。',
          subjectCode: 'BUG3673^',
          subjectName: 'BUG3673'
        },
        {
          idx: 14,
          accountCode: 'TEST2',
          errorData: '補助科目コードは英数字で入力してください。',
          subjectCode: 'BUG3673\\',
          subjectName: 'BUG3673'
        },
        {
          idx: 15,
          accountCode: 'TEST2',
          errorData: '補助科目コードは英数字で入力してください。',
          subjectCode: 'BUG3673|',
          subjectName: 'BUG3673'
        },
        {
          idx: 16,
          accountCode: 'TEST2',
          errorData: '補助科目コードは英数字で入力してください。',
          subjectCode: 'BUG3673@',
          subjectName: 'BUG3673'
        },
        {
          idx: 17,
          accountCode: 'TEST2',
          errorData: '補助科目コードは英数字で入力してください。',
          subjectCode: 'BUG3673`',
          subjectName: 'BUG3673'
        },
        {
          idx: 18,
          accountCode: 'TEST2',
          errorData: '補助科目コードは英数字で入力してください。',
          subjectCode: 'BUG3673[',
          subjectName: 'BUG3673'
        },
        {
          idx: 19,
          accountCode: 'TEST2',
          errorData: '補助科目コードは英数字で入力してください。',
          subjectCode: 'BUG3673{',
          subjectName: 'BUG3673'
        },
        {
          idx: 20,
          accountCode: 'TEST2',
          errorData: '補助科目コードは英数字で入力してください。',
          subjectCode: 'BUG3673]',
          subjectName: 'BUG3673'
        },
        {
          idx: 21,
          accountCode: 'TEST2',
          errorData: '補助科目コードは英数字で入力してください。',
          subjectCode: 'BUG3673}',
          subjectName: 'BUG3673'
        },
        {
          idx: 22,
          accountCode: 'TEST2',
          errorData: '補助科目コードは英数字で入力してください。',
          subjectCode: 'BUG3673+',
          subjectName: 'BUG3673'
        },
        {
          idx: 23,
          accountCode: 'TEST2',
          errorData: '補助科目コードは英数字で入力してください。',
          subjectCode: 'BUG3673;',
          subjectName: 'BUG3673'
        },
        {
          idx: 24,
          accountCode: 'TEST2',
          errorData: '補助科目コードは英数字で入力してください。',
          subjectCode: 'BUG3673*',
          subjectName: 'BUG3673'
        },
        {
          idx: 25,
          accountCode: 'TEST2',
          errorData: '補助科目コードは英数字で入力してください。',
          subjectCode: 'BUG3673:',
          subjectName: 'BUG3673'
        },
        {
          idx: 26,
          accountCode: 'TEST2',
          errorData: '補助科目コードは英数字で入力してください。',
          subjectCode: 'BUG3673<',
          subjectName: 'BUG3673'
        },
        {
          idx: 27,
          accountCode: 'TEST2',
          errorData: '補助科目コードは英数字で入力してください。',
          subjectCode: 'BUG3673>',
          subjectName: 'BUG3673'
        },
        {
          idx: 28,
          accountCode: 'TEST2',
          errorData: '補助科目コードは英数字で入力してください。',
          subjectCode: 'BUG3673.',
          subjectName: 'BUG3673'
        },
        {
          idx: 29,
          accountCode: 'TEST2',
          errorData: '補助科目コードは英数字で入力してください。',
          subjectCode: 'BUG3673/',
          subjectName: 'BUG3673'
        },
        {
          idx: 30,
          accountCode: 'TEST2',
          errorData: '補助科目コードは英数字で入力してください。',
          subjectCode: 'BUG3673?',
          subjectName: 'BUG3673'
        },
        {
          idx: 31,
          accountCode: 'TEST2',
          errorData: '補助科目コードは英数字で入力してください。',
          subjectCode: 'BUG3673\\',
          subjectName: 'BUG3673'
        },
        {
          idx: 32,
          accountCode: 'TEST2',
          errorData: '補助科目コードは英数字で入力してください。',
          subjectCode: 'BUG3673_',
          subjectName: 'BUG3673'
        }
      ])
    })

    test('異常：40桁数チェック', async () => {
      // 準備
      findAllSpy.mockReturnValue(dbAccountCodeTable)
      createSpy.mockReturnValue(codeAccountDataResult)
      // 補助科目一括作成
      const fs = require('fs')
      const uploadFilePath = path.resolve('/home/upload/test8.csv')
      fs.writeFileSync(
        uploadFilePath,
        Buffer.from(decodeURIComponent(subAccountCodeFileData8), 'base64').toString('utf8')
      )
      pathSpy.mockReturnValue('/home/upload/test8.csv')
      const file = {
        userId: 'userId',
        originalname: 'test8.csv',
        filename: '8d73eae9e5bcd33f5863b9251a76c551'
      }
      subAccountCodeControllerInsertSpy.mockReturnValue(0)

      // 試験実施
      const result = await subAccountUploadController.upload(file, contractNormal)

      // 期待結果
      // 想定したデータがReturnされていること
      expect(result).toEqual([
        { header: ['行数', '勘定科目コード', '補助科目コード', '補助科目名', '詳細'] },
        {
          accountCode: 'TEST1kanko',
          errorData: '補助科目名は40文字以内で入力してください。',
          idx: 1,
          subjectCode: 'TEST1hoko',
          subjectName: 'TEST1homeiTEST1homeiTEST1homeiTEST1homeia'
        }
      ])
    })

    test('異常：未登録勘定科目コード', async () => {
      // 準備
      findAllSpy.mockReturnValue(dbAccountCodeTable)
      createSpy.mockReturnValue(codeAccountDataResult)
      searchAccountCodeSpy.mockReturnValue([{ accountCodeId: codeAccountId }])
      findOneSpy.mockReturnValue([{ accountCodeId: codeAccountId }])
      // 補助科目一括作成
      const fs = require('fs')
      const uploadFilePath = path.resolve('/home/upload/test10.csv')
      fs.writeFileSync(
        uploadFilePath,
        Buffer.from(decodeURIComponent(subAccountCodeFileData10), 'base64').toString('utf8')
      )
      pathSpy.mockReturnValue('/home/upload/test10.csv')
      const file = {
        userId: 'userId',
        originalname: 'test8.csv',
        filename: '8d73eae9e5bcd33f5863b9251a76c551'
      }

      subAccountCodeControllerInsertSpy.mockReturnValueOnce(-1)

      // 試験実施
      const result = await subAccountUploadController.upload(file, contractNormal)

      expect(result).toEqual([
        { header: ['行数', '勘定科目コード', '補助科目コード', '補助科目名', '詳細'] },
        {
          accountCode: 'TEST1',
          errorData: '未登録の勘定科目コードです。事前に「勘定科目登録画面」から勘定科目コードを登録してください。',
          idx: 1,
          subjectCode: 'TEST1hoko',
          subjectName: 'TEST1homei'
        }
      ])
    })

    test('異常：重複チェック（補助科目コード）', async () => {
      // 準備
      findAllSpy.mockReturnValue(dbAccountCodeTable)
      createSpy.mockReturnValue(codeAccountDataResult)
      searchAccountCodeSpy.mockReturnValue([{ accountCodeId: codeAccountId }])
      findOneSpy.mockReturnValue([{ accountCodeId: codeAccountId }])
      // 補助科目一括作成
      const fs = require('fs')
      const uploadFilePath = path.resolve('/home/upload/test10.csv')
      fs.writeFileSync(
        uploadFilePath,
        Buffer.from(decodeURIComponent(subAccountCodeFileData10), 'base64').toString('utf8')
      )
      pathSpy.mockReturnValue('/home/upload/test10.csv')
      const file = {
        userId: 'userId',
        originalname: 'test8.csv',
        filename: '8d73eae9e5bcd33f5863b9251a76c551'
      }

      subAccountCodeControllerInsertSpy.mockReturnValueOnce(1)

      // 試験実施
      const result = await subAccountUploadController.upload(file, contractNormal)

      expect(result).toEqual([
        { header: ['行数', '勘定科目コード', '補助科目コード', '補助科目名', '詳細'] },
        {
          accountCode: 'TEST1',
          errorData: '入力した補助科目コードは既に登録されています。',
          idx: 1,
          subjectCode: 'TEST1hoko',
          subjectName: 'TEST1homei'
        }
      ])
    })

    test('異常：DBエラー(acountTableError)', async () => {
      // 準備
      // DBから勘定科目登録時、返す勘定科目インスタンス
      findAllSpy.mockReturnValue(dbAccountCodeTable)
      createSpy.mockReturnValue(codeAccountDataResult)
      findOneSpy.mockReturnValue([{ accountCodeId: codeAccountId }])
      const file = {
        originalname: 'test1.csv',
        filename: '8d73eae9e5bcd33f5863b9251a76c551',
        userId: 'userId'
      }

      // 補助科目一括作成
      const fs = require('fs')
      const uploadFilePath = path.resolve('/home/upload/test1.csv')
      fs.writeFileSync(
        uploadFilePath,
        Buffer.from(decodeURIComponent(subAccountCodeFileData1), 'base64').toString('utf8')
      )
      pathSpy.mockReturnValue('/home/upload/test1.csv')
      const searchAccountError = new Error('AcountTable Error')
      searchAccountCodeSpy.mockReturnValue(searchAccountError)

      // 試験実施
      const result = await subAccountUploadController.upload(file, contractNormal)

      // 期待結果
      // 想定したデータがReturnされていること
      expect(result).toEqual(searchAccountError)
    })

    test('異常：DBエラー(insertError)', async () => {
      // 準備
      // DBから勘定科目登録時、返す勘定科目インスタンス
      findAllSpy.mockReturnValue(dbAccountCodeTable)
      createSpy.mockReturnValue(codeAccountDataResult)
      const file = {
        originalname: 'test1.csv',
        filename: '8d73eae9e5bcd33f5863b9251a76c551',
        userId: 'userId'
      }

      // 補助科目一括作成
      const fs = require('fs')
      const uploadFilePath = path.resolve('/home/upload/test1.csv')
      fs.writeFileSync(
        uploadFilePath,
        Buffer.from(decodeURIComponent(subAccountCodeFileData1), 'base64').toString('utf8')
      )
      pathSpy.mockReturnValue('/home/upload/test1.csv')
      const insertError = new Error('insert Error')
      subAccountCodeControllerInsertSpy.mockReturnValue(insertError)

      // 試験実施
      const result = await subAccountUploadController.upload(file, contractNormal)

      // 期待結果
      // 想定したデータがReturnされていること
      expect(result).toEqual(insertError)
    })

    test('異常：DBエラー（subAccountCodeテーブルエラー）', async () => {
      // 準備
      // DBから勘定科目登録時、返す勘定科目インスタンス
      findAllSpy.mockReturnValue(dbAccountCodeTable)
      createSpy.mockReturnValue(codeAccountDataResult)
      const file = {
        originalname: 'test1.csv',
        filename: '8d73eae9e5bcd33f5863b9251a76c551',
        userId: 'userId'
      }

      // 補助科目一括作成
      const fs = require('fs')
      const uploadFilePath = path.resolve('/home/upload/test1.csv')
      fs.writeFileSync(
        uploadFilePath,
        Buffer.from(decodeURIComponent(subAccountCodeFileData1), 'base64').toString('utf8')
      )
      pathSpy.mockReturnValue('/home/upload/test1.csv')
      const subAccountCodeError = new Error(
        "SequelizeDatabaseError: Invalid object name 'SubAccountCode'.\n at Query.formatError"
      )
      subAccountCodeControllerInsertSpy.mockReturnValue(subAccountCodeError)

      // 試験実施
      const result = await subAccountUploadController.upload(file, contractNormal)

      // 期待結果
      // 想定したデータがReturnされていること
      expect(result).toEqual(subAccountCodeError)
    })

    test('異常：エラー処理', async () => {
      // 準備
      // DBから勘定科目登録時、返す勘定科目インスタンス
      findAllSpy.mockReturnValue(dbAccountCodeTable)
      createSpy.mockReturnValue(codeAccountDataResult)
      const file = {
        originalname: 'test1.csv',
        filename: '8d73eae9e5bcd33f5863b9251a76c551',
        userId: 'userId'
      }

      // 補助科目一括作成
      const fs = require('fs')
      const uploadFilePath = path.resolve('/home/upload/test1.csv')
      fs.writeFileSync(
        uploadFilePath,
        Buffer.from(decodeURIComponent(subAccountCodeFileData1), 'base64').toString('utf8')
      )
      pathSpy.mockReturnValue('/home/upload/test1.csv')
      subAccountCodeControllerInsertSpy.mockImplementation(() => {
        throw new Error('CSVファイル削除エラー')
      })

      // 試験実施
      const result = await subAccountUploadController.upload(file, contractNormal)

      // 期待結果
      // 想定したデータがReturnされていること
      expect(() => {
        throw result
      }).toThrowError('CSVファイル削除エラー')
    })
  })

  describe('removeFile', () => {
    test('正常:データ削除', async () => {
      // 準備
      findAllSpy.mockReturnValue(dbAccountCodeTable)
      createSpy.mockReturnValue(codeAccountDataResult)
      // 補助科目一括作成
      const fs = require('fs')
      const uploadFilePath = path.resolve('/home/upload/test9.csv')
      fs.writeFileSync(
        uploadFilePath,
        Buffer.from(decodeURIComponent(subAccountCodeFileData9), 'base64').toString('utf8')
      )
      pathSpy.mockReturnValue('/home/upload/test9.csv')

      subAccountCodeControllerInsertSpy.mockReturnValue(0)

      // 試験実施
      const result = await subAccountUploadController.removeFile(uploadFilePath)

      // 期待結果
      expect(result).toEqual(true)
    })

    test('異常:削除エラー(存在しないデータを削除する場合)', async () => {
      // 準備
      findAllSpy.mockReturnValue(dbAccountCodeTable)
      createSpy.mockReturnValue(codeAccountDataResult)
      // 補助科目一括作成
      const fs = require('fs')
      const uploadFilePath = path.resolve('/home/upload/test9.csv')
      fs.writeFileSync(
        uploadFilePath,
        Buffer.from(decodeURIComponent(subAccountCodeFileData9), 'base64').toString('utf8')
      )
      pathSpy.mockReturnValue('/home/upload/test9.csv')

      subAccountCodeControllerInsertSpy.mockReturnValue(0)

      // 試験実施
      const noUploadFilePath = '/home/upload\\/test9.csv'
      let result
      try {
        result = await subAccountUploadController.removeFile(noUploadFilePath)
      } catch (err) {
        result = err
      }
      // 期待結果
      // 削除エラーが返されること
      expect(() => {
        throw result
      }).toThrowError('CSVファイル削除エラー')
    })

    test('異常:削除エラー', async () => {
      // 準備
      const noUploadFilePath = '/etc/resolv.conf'

      // 試験実施
      let result
      try {
        result = await subAccountUploadController.removeFile(noUploadFilePath)
      } catch (err) {
        result = err
      }
      // 期待結果
      // 削除エラー（権限エラー）が返されること
      expect(() => {
        throw result
      }).toThrowError('permission denied')
    })
  })
})
