'use strict'
jest.mock('../../Application/models')
jest.mock('../../Application/lib/logger')

const accountUploadController = require('../../Application/controllers/accountUploadController')
const accountCodeController = require('../../Application/controllers/accountCodeController')
const logger = require('../../Application/lib/logger')
const AccountCode = require('../../Application/models').AccountCode
const sequelize = require('../../Application/models').sequelize
const codeAccountId = '5a927284-57c9-4594-9ed8-472d261a6102'
const codeAccountDataResult = new AccountCode()
codeAccountDataResult.accountCodeId = codeAccountId
codeAccountDataResult.contractId = 'f10b95a4-74a1-4691-880a-827c9f1a1faf'
codeAccountDataResult.accountCodeName = 'パソコン'
codeAccountDataResult.accountCode = 'AAA'
codeAccountDataResult.createdAt = new Date('2021-07-09T04:30:00.000Z')
codeAccountDataResult.updatedAt = new Date('2021-07-09T04:30:00.000Z')
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

let errorSpy, contractId, findAllSpy, infoSpy, createSpy, findOneSpy, transactionSpy
let pathSpy, accountCodeControllerInsertSpy

describe('accountUploadControllerのテスト', () => {
  beforeEach(() => {
    createSpy = jest.spyOn(AccountCode, 'create')
    findAllSpy = jest.spyOn(AccountCode, 'findAll')
    findOneSpy = jest.spyOn(AccountCode, 'findOne')
    errorSpy = jest.spyOn(logger, 'error')
    infoSpy = jest.spyOn(logger, 'info')
    transactionSpy = jest.spyOn(sequelize, 'transaction')
    pathSpy = jest.spyOn(path, 'resolve')
    accountCodeControllerInsertSpy = jest.spyOn(accountCodeController, 'insert')
  })
  afterEach(() => {
    createSpy.mockRestore()
    findAllSpy.mockRestore()
    findOneSpy.mockRestore()
    errorSpy.mockRestore()
    infoSpy.mockRestore()
    transactionSpy.mockRestore()
    pathSpy.mockRestore()
    accountCodeControllerInsertSpy.mockRestore()
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

  // 勘定科目データ1
  // 請求書が1つの場合
  const accountCodeFileData1 = Buffer.from(
    fs.readFileSync('./testData/accountCodeUpload_test1.csv', {
      encoding: 'utf-8',
      flag: 'r'
    })
  ).toString('base64')

  // 異常系1
  const accountCodeFileData2 = Buffer.from(
    fs.readFileSync('./testData/accountCodeUpload_test2.csv', {
      encoding: 'utf-8',
      flag: 'r'
    })
  ).toString('base64')

  // 異常系2
  const accountCodeFileData3 = Buffer.from(
    fs.readFileSync('./testData/accountCodeUpload_test3.csv', {
      encoding: 'utf-8',
      flag: 'r'
    })
  ).toString('base64')

  // 異常系3
  const accountCodeFileData4 = Buffer.from(
    fs.readFileSync('./testData/accountCodeUpload_test4.csv', {
      encoding: 'utf-8',
      flag: 'r'
    })
  ).toString('base64')

  // 異常系4
  const accountCodeFileData5 = Buffer.from(
    fs.readFileSync('./testData/accountCodeUpload_test5.csv', {
      encoding: 'utf-8',
      flag: 'r'
    })
  ).toString('base64')

  // 異常系5
  const accountCodeFileData6 = Buffer.from(
    fs.readFileSync('./testData/accountCodeUpload_test6.csv', {
      encoding: 'utf-8',
      flag: 'r'
    })
  ).toString('base64')

  // 異常系6
  const accountCodeFileData7 = Buffer.from(
    fs.readFileSync('./testData/accountCodeUpload_test7.csv', {
      encoding: 'utf-8',
      flag: 'r'
    })
  ).toString('base64')

  // 異常系7
  const accountCodeFileData8 = Buffer.from(
    fs.readFileSync('./testData/accountCodeUpload_test8.csv', {
      encoding: 'utf-8',
      flag: 'r'
    })
  ).toString('base64')

  // 異常系8
  const accountCodeFileData9 = Buffer.from(
    fs.readFileSync('./testData/accountCodeUpload_test9.csv', {
      encoding: 'utf-8',
      flag: 'r'
    })
  ).toString('base64')

  // 異常系9
  const accountCodeFileData10 = Buffer.from(
    fs.readFileSync('./testData/accountCodeUpload_test10.csv', {
      encoding: 'utf-8',
      flag: 'r'
    })
  ).toString('base64')

  // 英数字以外の特殊文字
  const accountCodeFileData12 = Buffer.from(
    fs.readFileSync('./testData/accountCodeUpload_test12.csv', {
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

      // 勘定科目一括作成
      const today = new Date().getTime()
      const filename = '勘定科目' + '_' + today + '_' + file.userId + '_' + file.originalname + '.csv'
      const newFilePath = path.resolve('/home/upload', filename)
      fs.writeFileSync(newFilePath, Buffer.from(decodeURIComponent(accountCodeFileData1), 'base64').toString('utf8'))

      pathSpy.mockReturnValue(newFilePath)

      accountCodeControllerInsertSpy.mockReturnValue(true)

      // 試験実施
      const result = await accountUploadController.upload(file, contractNormal)

      // 期待結果
      // 想定したデータがReturnされていること
      expect(result).toEqual(0)
    })

    test('異常：ヘッダ異常', async () => {
      // 準備
      findAllSpy.mockReturnValue(dbAccountCodeTable)
      createSpy.mockReturnValue(codeAccountDataResult)
      // 勘定科目一括作成
      const fs = require('fs')
      const uploadFilePath = path.resolve('/home/upload/test2.csv')
      fs.writeFileSync(uploadFilePath, Buffer.from(decodeURIComponent(accountCodeFileData2), 'base64').toString('utf8'))
      pathSpy.mockReturnValue('/home/upload/test2.csv')
      const file = {
        userId: 'userId',
        originalname: 'test2.csv',
        filename: '8d73eae9e5bcd33f5863b9251a76c551'
      }
      accountCodeControllerInsertSpy.mockReturnValue(true)

      // 試験実施
      const result = await accountUploadController.upload(file, contractNormal)

      // 期待結果
      // 想定したデータがReturnされていること
      expect(result).toEqual(-1)
    })

    test('異常：データなし', async () => {
      // 準備
      findAllSpy.mockReturnValue(dbAccountCodeTable)
      createSpy.mockReturnValue(codeAccountDataResult)
      // 勘定科目一括作成
      const fs = require('fs')
      const uploadFilePath = path.resolve('/home/upload/test3.csv')
      fs.writeFileSync(uploadFilePath, Buffer.from(decodeURIComponent(accountCodeFileData3), 'base64').toString('utf8'))
      pathSpy.mockReturnValue('/home/upload/test3.csv')
      const file = {
        userId: 'userId',
        originalname: 'test3.csv',
        filename: '8d73eae9e5bcd33f5863b9251a76c551'
      }
      accountCodeControllerInsertSpy.mockReturnValue(true)

      // 試験実施
      const result = await accountUploadController.upload(file, contractNormal)

      // 期待結果
      // 想定したデータがReturnされていること
      expect(result).toEqual(-2)
    })

    test('異常：200データ以上', async () => {
      // 準備
      findAllSpy.mockReturnValue(dbAccountCodeTable)
      createSpy.mockReturnValue(codeAccountDataResult)
      // 勘定科目一括作成
      const fs = require('fs')
      const uploadFilePath = path.resolve('/home/upload/test4.csv')
      fs.writeFileSync(uploadFilePath, Buffer.from(decodeURIComponent(accountCodeFileData4), 'base64').toString('utf8'))
      pathSpy.mockReturnValue('/home/upload/test4.csv')
      const file = {
        userId: 'userId',
        originalname: 'test4.csv',
        filename: '8d73eae9e5bcd33f5863b9251a76c551'
      }
      accountCodeControllerInsertSpy.mockReturnValue(true)

      // 試験実施
      const result = await accountUploadController.upload(file, contractNormal)

      // 期待結果
      // 想定したデータがReturnされていること
      expect(result).toEqual(-3)
    })

    test('異常：勘定科目行ごとバリデーションチェック', async () => {
      // 準備
      findAllSpy.mockReturnValue(dbAccountCodeTable)
      createSpy.mockReturnValue(codeAccountDataResult)
      // 勘定科目一括作成
      const fs = require('fs')
      const uploadFilePath = path.resolve('/home/upload/test5.csv')
      fs.writeFileSync(uploadFilePath, Buffer.from(decodeURIComponent(accountCodeFileData5), 'base64').toString('utf8'))
      pathSpy.mockReturnValue('/home/upload/test5.csv')
      const file = {
        userId: 'userId',
        originalname: 'test5.csv',
        filename: '8d73eae9e5bcd33f5863b9251a76c551'
      }
      accountCodeControllerInsertSpy.mockReturnValue(true)

      // 試験実施
      const result = await accountUploadController.upload(file, contractNormal)

      // 期待結果
      // 想定したデータがReturnされていること
      expect(result).toEqual(-4)
    })

    test('異常：勘定科目行ごとバリデーションチェック(勘定科目コードと名)', async () => {
      // 準備
      findAllSpy.mockReturnValue(dbAccountCodeTable)
      createSpy.mockReturnValue(codeAccountDataResult)
      // 勘定科目一括作成
      const fs = require('fs')
      const uploadFilePath = path.resolve('/home/upload/test6.csv')
      fs.writeFileSync(uploadFilePath, Buffer.from(decodeURIComponent(accountCodeFileData6), 'base64').toString('utf8'))
      pathSpy.mockReturnValue('/home/upload/test6.csv')
      const file = {
        userId: 'userId',
        originalname: 'test6.csv',
        filename: '8d73eae9e5bcd33f5863b9251a76c551'
      }
      accountCodeControllerInsertSpy.mockReturnValue(true)

      // 試験実施
      const result = await accountUploadController.upload(file, contractNormal)

      // 期待結果
      // 想定したデータがReturnされていること
      expect(result).toEqual([
        { header: ['行数', '勘定科目コード', '勘定科目名', '詳細'] },
        {
          code: 'TEST333322222222222222',
          errorData: '勘定科目コードは10文字以内で入力してください。,勘定科目名は40文字以内で入力してください。',
          idx: 1,
          name: '結合テスト12結合テスト12結合テスト12結合テスト12結合テスト12結合テスト12結合テスト12結合テスト12結合テスト12結合テスト12結合テスト12結合テスト12結合テスト12結合テスト12結合テスト12結合テスト12結合テスト12結合テスト12結合テスト12結合テスト12結合テスト12'
        }
      ])
    })

    test('異常：10桁数チェック', async () => {
      // 準備
      findAllSpy.mockReturnValue(dbAccountCodeTable)
      createSpy.mockReturnValue(codeAccountDataResult)
      // 勘定科目一括作成
      const fs = require('fs')
      const uploadFilePath = path.resolve('/home/upload/test7.csv')
      fs.writeFileSync(uploadFilePath, Buffer.from(decodeURIComponent(accountCodeFileData7), 'base64').toString('utf8'))
      pathSpy.mockReturnValue('/home/upload/test7.csv')
      const file = {
        userId: 'userId',
        originalname: 'test7.csv',
        filename: '8d73eae9e5bcd33f5863b9251a76c551'
      }
      accountCodeControllerInsertSpy.mockReturnValue(false)

      // 試験実施
      const result = await accountUploadController.upload(file, contractNormal)

      // 期待結果
      // 想定したデータがReturnされていること
      expect(result).toEqual([
        { header: ['行数', '勘定科目コード', '勘定科目名', '詳細'] },
        { code: '11111111111', errorData: '勘定科目コードは10文字以内で入力してください。', idx: 1, name: '現金' }
      ])
    })

    test('異常：BUG3763対応(特殊文字バリデーションチェック)', async () => {
      // 準備
      findAllSpy.mockReturnValue(dbAccountCodeTable)
      createSpy.mockReturnValue(codeAccountDataResult)
      // 勘定科目一括作成
      const fs = require('fs')
      const uploadFilePath = path.resolve('/home/upload/testBUG3763.csv')
      fs.writeFileSync(
        uploadFilePath,
        Buffer.from(decodeURIComponent(accountCodeFileData12), 'base64').toString('utf8')
      )
      pathSpy.mockReturnValue('/home/upload/testBUG3763.csv')
      const file = {
        userId: 'userId',
        originalname: 'testBUG3763.csv',
        filename: '8d73eae9e5bcd33f5863b9251a76c551'
      }
      accountCodeControllerInsertSpy.mockReturnValue(false)

      // 試験実施
      const result = await accountUploadController.upload(file, contractNormal)

      // 期待結果
      // 想定したデータがReturnされていること
      expect(result).toEqual([
        { header: ['行数', '勘定科目コード', '勘定科目名', '詳細'] },
        { code: 'BUG3763!', errorData: '勘定科目コードは英数字で入力してください。', idx: 1, name: 'BUG3763' },
        { code: 'BUG3763"', errorData: '勘定科目コードは英数字で入力してください。', idx: 2, name: 'BUG3763' },
        { code: 'BUG3763#', errorData: '勘定科目コードは英数字で入力してください。', idx: 3, name: 'BUG3763' },
        { code: 'BUG3763$', errorData: '勘定科目コードは英数字で入力してください。', idx: 4, name: 'BUG3763' },
        { code: 'BUG3763%', errorData: '勘定科目コードは英数字で入力してください。', idx: 5, name: 'BUG3763' },
        { code: 'BUG3763&', errorData: '勘定科目コードは英数字で入力してください。', idx: 6, name: 'BUG3763' },
        { code: "BUG3763'", errorData: '勘定科目コードは英数字で入力してください。', idx: 7, name: 'BUG3763' },
        { code: 'BUG3763(', errorData: '勘定科目コードは英数字で入力してください。', idx: 8, name: 'BUG3763' },
        { code: 'BUG3763)', errorData: '勘定科目コードは英数字で入力してください。', idx: 9, name: 'BUG3763' },
        { code: 'BUG3763-', errorData: '勘定科目コードは英数字で入力してください。', idx: 10, name: 'BUG3763' },
        { code: 'BUG3763=', errorData: '勘定科目コードは英数字で入力してください。', idx: 11, name: 'BUG3763' },
        { code: 'BUG3763~', errorData: '勘定科目コードは英数字で入力してください。', idx: 12, name: 'BUG3763' },
        { code: 'BUG3763^', errorData: '勘定科目コードは英数字で入力してください。', idx: 13, name: 'BUG3763' },
        { code: 'BUG3763\\', errorData: '勘定科目コードは英数字で入力してください。', idx: 14, name: 'BUG3763' },
        { code: 'BUG3763|', errorData: '勘定科目コードは英数字で入力してください。', idx: 15, name: 'BUG3763' },
        { code: 'BUG3763@', errorData: '勘定科目コードは英数字で入力してください。', idx: 16, name: 'BUG3763' },
        { code: 'BUG3763`', errorData: '勘定科目コードは英数字で入力してください。', idx: 17, name: 'BUG3763' },
        { code: 'BUG3763[', errorData: '勘定科目コードは英数字で入力してください。', idx: 18, name: 'BUG3763' },
        { code: 'BUG3763{', errorData: '勘定科目コードは英数字で入力してください。', idx: 19, name: 'BUG3763' },
        { code: 'BUG3763]', errorData: '勘定科目コードは英数字で入力してください。', idx: 20, name: 'BUG3763' },
        { code: 'BUG3763}', errorData: '勘定科目コードは英数字で入力してください。', idx: 21, name: 'BUG3763' },
        { code: 'BUG3763+', errorData: '勘定科目コードは英数字で入力してください。', idx: 22, name: 'BUG3763' },
        { code: 'BUG3763;', errorData: '勘定科目コードは英数字で入力してください。', idx: 23, name: 'BUG3763' },
        { code: 'BUG3763*', errorData: '勘定科目コードは英数字で入力してください。', idx: 24, name: 'BUG3763' },
        { code: 'BUG3763:', errorData: '勘定科目コードは英数字で入力してください。', idx: 25, name: 'BUG3763' },
        { code: 'BUG3763<', errorData: '勘定科目コードは英数字で入力してください。', idx: 26, name: 'BUG3763' },
        { code: 'BUG3763>', errorData: '勘定科目コードは英数字で入力してください。', idx: 27, name: 'BUG3763' },
        { code: 'BUG3763.', errorData: '勘定科目コードは英数字で入力してください。', idx: 28, name: 'BUG3763' },
        { code: 'BUG3763/', errorData: '勘定科目コードは英数字で入力してください。', idx: 29, name: 'BUG3763' },
        { code: 'BUG3763?', errorData: '勘定科目コードは英数字で入力してください。', idx: 30, name: 'BUG3763' },
        { code: 'BUG3763\\', errorData: '勘定科目コードは英数字で入力してください。', idx: 31, name: 'BUG3763' },
        { code: 'BUG3763_', errorData: '勘定科目コードは英数字で入力してください。', idx: 32, name: 'BUG3763' }
      ])
    })

    test('異常：40桁数チェック', async () => {
      // 準備
      findAllSpy.mockReturnValue(dbAccountCodeTable)
      createSpy.mockReturnValue(codeAccountDataResult)
      // 勘定科目一括作成
      const fs = require('fs')
      const uploadFilePath = path.resolve('/home/upload/test8.csv')
      fs.writeFileSync(uploadFilePath, Buffer.from(decodeURIComponent(accountCodeFileData8), 'base64').toString('utf8'))
      pathSpy.mockReturnValue('/home/upload/test8.csv')
      const file = {
        userId: 'userId',
        originalname: 'test8.csv',
        filename: '8d73eae9e5bcd33f5863b9251a76c551'
      }
      accountCodeControllerInsertSpy.mockReturnValue(true)

      // 試験実施
      const result = await accountUploadController.upload(file, contractNormal)

      // 期待結果
      // 想定したデータがReturnされていること
      expect(result).toEqual([
        { header: ['行数', '勘定科目コード', '勘定科目名', '詳細'] },
        {
          code: 'A2021',
          errorData: '勘定科目名は40文字以内で入力してください。',
          idx: 1,
          name: '現金現金現金現金現金現金現金現金現金現金現金現金現金現金現金現金現金現金現金現金金'
        }
      ])
    })

    test('異常：重複チェック', async () => {
      // 準備
      // DBから勘定科目登録時、返す勘定科目インスタンス
      findAllSpy.mockReturnValue(dbAccountCodeTable)
      createSpy.mockReturnValue(codeAccountDataResult)
      const file = {
        originalname: 'test11.csv',
        filename: '8d73eae9e5bcd33f5863b9251a76c551',
        userId: 'userId'
      }

      // 勘定科目一括作成
      const fs = require('fs')
      const uploadFilePath = path.resolve('/home/upload/test11.csv')
      fs.writeFileSync(
        uploadFilePath,
        Buffer.from(decodeURIComponent(accountCodeFileData10), 'base64').toString('utf8')
      )
      pathSpy.mockReturnValue('/home/upload/test11.csv')
      accountCodeControllerInsertSpy.mockClear()
      accountCodeControllerInsertSpy.mockReturnValueOnce(false)

      // // 試験実施
      const result = await accountUploadController.upload(file, contractNormal)

      // 期待結果
      // 想定したデータがReturnされていること
      expect(result).toEqual([
        { header: ['行数', '勘定科目コード', '勘定科目名', '詳細'] },
        {
          code: 'TEST302',
          errorData: '入力した勘定科目コードは既に登録されています。',
          idx: 1,
          name: '結合テスト12'
        }
      ])
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

      // 勘定科目一括作成
      const fs = require('fs')
      const uploadFilePath = path.resolve('/home/upload/test1.csv')
      fs.writeFileSync(uploadFilePath, Buffer.from(decodeURIComponent(accountCodeFileData1), 'base64').toString('utf8'))
      pathSpy.mockReturnValue('/home/upload/test1.csv')
      const insertError = new Error('insert Error')
      accountCodeControllerInsertSpy.mockReturnValue(insertError)

      // // 試験実施
      const result = await accountUploadController.upload(file, contractNormal)

      // 期待結果
      // 想定したデータがReturnされていること
      expect(result).toEqual(insertError)
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

      // 勘定科目一括作成
      const fs = require('fs')
      const uploadFilePath = path.resolve('/home/upload/test1.csv')
      fs.writeFileSync(uploadFilePath, Buffer.from(decodeURIComponent(accountCodeFileData1), 'base64').toString('utf8'))
      pathSpy.mockReturnValue('/home/upload/test1.csv')
      accountCodeControllerInsertSpy.mockImplementation(() => {
        throw new Error('CSVファイル削除エラー')
      })

      // // 試験実施
      const result = await accountUploadController.upload(file, contractNormal)

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
      // 勘定科目一括作成
      const fs = require('fs')
      const uploadFilePath = path.resolve('/home/upload/test9.csv')
      fs.writeFileSync(uploadFilePath, Buffer.from(decodeURIComponent(accountCodeFileData9), 'base64').toString('utf8'))
      pathSpy.mockReturnValue('/home/upload/test9.csv')

      accountCodeControllerInsertSpy.mockReturnValue(true)

      // 試験実施
      const result = await accountUploadController.remove(uploadFilePath)

      // 期待結果
      expect(result).toEqual(true)
    })

    test('異常:削除エラー(存在しないデータを削除する場合)', async () => {
      // 準備
      findAllSpy.mockReturnValue(dbAccountCodeTable)
      createSpy.mockReturnValue(codeAccountDataResult)
      // 勘定科目一括作成
      const fs = require('fs')
      const uploadFilePath = path.resolve('/home/upload/test9.csv')
      fs.writeFileSync(uploadFilePath, Buffer.from(decodeURIComponent(accountCodeFileData9), 'base64').toString('utf8'))
      pathSpy.mockReturnValue('/home/upload/test9.csv')

      accountCodeControllerInsertSpy.mockReturnValue(true)

      // 試験実施
      const noUploadFilePath = '/home/upload\\/test9.csv'
      let result
      try {
        result = await accountUploadController.remove(noUploadFilePath)
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
        result = await accountUploadController.remove(noUploadFilePath)
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
