'use strict'
jest.mock('../../Application/models')
jest.mock('../../Application/lib/logger')

const departmentCodeUploadController = require('../../Application/controllers/departmentCodeUploadController')
const departmentCodeController = require('../../Application/controllers/departmentCodeController')
const logger = require('../../Application/lib/logger')
const DepartmentCode = require('../../Application/models').DepartmentCode
const sequelize = require('../../Application/models').sequelize
const codeDepartmenttId = '5a927284-57c9-4594-9ed8-472d261a6102'
const codeDepartmentDataResult = new DepartmentCode()
codeDepartmentDataResult.accountCodeId = codeDepartmenttId
codeDepartmentDataResult.contractId = 'f10b95a4-74a1-4691-880a-827c9f1a1faf'
codeDepartmentDataResult.accountCodeName = 'パソコン'
codeDepartmentDataResult.accountCode = 'AAA'
codeDepartmentDataResult.createdAt = new Date('2021-07-09T04:30:00.000Z')
codeDepartmentDataResult.updatedAt = new Date('2021-07-09T04:30:00.000Z')
const path = require('path')
const fs = require('fs')

const dbDepartmentCodeTable = []

dbDepartmentCodeTable.push(codeDepartmentDataResult)

let errorSpy, contractId, findAllSpy, infoSpy, createSpy, findOneSpy, transactionSpy
let pathSpy, departmentCodeControllerInsertSpy

describe('departmentCodeUploadControllerのテスト', () => {
  beforeEach(() => {
    createSpy = jest.spyOn(DepartmentCode, 'create')
    findAllSpy = jest.spyOn(DepartmentCode, 'findAll')
    findOneSpy = jest.spyOn(DepartmentCode, 'findOne')
    errorSpy = jest.spyOn(logger, 'error')
    infoSpy = jest.spyOn(logger, 'info')
    transactionSpy = jest.spyOn(sequelize, 'transaction')
    pathSpy = jest.spyOn(path, 'resolve')
    departmentCodeControllerInsertSpy = jest.spyOn(departmentCodeController, 'insert')
  })
  afterEach(() => {
    createSpy.mockRestore()
    findAllSpy.mockRestore()
    findOneSpy.mockRestore()
    errorSpy.mockRestore()
    infoSpy.mockRestore()
    transactionSpy.mockRestore()
    pathSpy.mockRestore()
    departmentCodeControllerInsertSpy.mockRestore()
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

  // 部門データ1
  // 部門データが1つの場合
  const departmentCodeFileData1 = Buffer.from(
    fs.readFileSync('./testData/departmentCodeUpload_test1.csv', {
      encoding: 'utf-8',
      flag: 'r'
    })
  ).toString('base64')

  // 異常系1
  const departmentCodeFileData2 = Buffer.from(
    fs.readFileSync('./testData/departmentCodeUpload_test2.csv', {
      encoding: 'utf-8',
      flag: 'r'
    })
  ).toString('base64')

  // 異常系2
  const departmentCodeFileData3 = Buffer.from(
    fs.readFileSync('./testData/departmentCodeUpload_test3.csv', {
      encoding: 'utf-8',
      flag: 'r'
    })
  ).toString('base64')

  // 異常系3
  const departmentCodeFileData4 = Buffer.from(
    fs.readFileSync('./testData/departmentCodeUpload_test4.csv', {
      encoding: 'utf-8',
      flag: 'r'
    })
  ).toString('base64')

  // 異常系4
  const departmentCodeFileData5 = Buffer.from(
    fs.readFileSync('./testData/departmentCodeUpload_test5.csv', {
      encoding: 'utf-8',
      flag: 'r'
    })
  ).toString('base64')

  // 異常系5
  const departmentCodeFileData6 = Buffer.from(
    fs.readFileSync('./testData/departmentCodeUpload_test6.csv', {
      encoding: 'utf-8',
      flag: 'r'
    })
  ).toString('base64')

  // 異常系6
  const departmentCodeFileData7 = Buffer.from(
    fs.readFileSync('./testData/departmentCodeUpload_test7.csv', {
      encoding: 'utf-8',
      flag: 'r'
    })
  ).toString('base64')

  // 異常系7
  const departmentCodeFileData8 = Buffer.from(
    fs.readFileSync('./testData/departmentCodeUpload_test8.csv', {
      encoding: 'utf-8',
      flag: 'r'
    })
  ).toString('base64')

  // 異常系8
  const departmentCodeFileData9 = Buffer.from(
    fs.readFileSync('./testData/departmentCodeUpload_test9.csv', {
      encoding: 'utf-8',
      flag: 'r'
    })
  ).toString('base64')

  // 異常系9
  const departmentCodeFileData10 = Buffer.from(
    fs.readFileSync('./testData/departmentCodeUpload_test10.csv', {
      encoding: 'utf-8',
      flag: 'r'
    })
  ).toString('base64')

  // 異常系10
  const departmentCodeFileData12 = Buffer.from(
    fs.readFileSync('./testData/departmentCodeUpload_test12.csv', {
      encoding: 'utf-8',
      flag: 'r'
    })
  ).toString('base64')

  describe('upload', () => {
    test('正常', async () => {
      // 準備
      // DBから部門データ登録時、返す部門データインスタンス
      findAllSpy.mockReturnValue(dbDepartmentCodeTable)
      createSpy.mockReturnValue(codeDepartmentDataResult)
      const file = {
        originalname: 'test1.csv',
        filename: '8d73eae9e5bcd33f5863b9251a76c551',
        userId: 'userId'
      }

      // 部門データ一括作成
      const today = new Date().getTime()
      const filename = '部門データ' + '_' + today + '_' + file.userId + '_' + file.originalname + '.csv'
      const newFilePath = path.resolve('/home/upload', filename)
      fs.writeFileSync(newFilePath, Buffer.from(decodeURIComponent(departmentCodeFileData1), 'base64').toString('utf8'))

      pathSpy.mockReturnValue(newFilePath)

      departmentCodeControllerInsertSpy.mockReturnValue(true)

      // 試験実施
      const result = await departmentCodeUploadController.upload(file, contractNormal)

      // 期待結果
      // 想定したデータがReturnされていること
      expect(result).toEqual(0)
    })

    test('異常：ヘッダ異常', async () => {
      // 準備
      findAllSpy.mockReturnValue(dbDepartmentCodeTable)
      createSpy.mockReturnValue(codeDepartmentDataResult)
      // 部門データ一括作成
      const fs = require('fs')
      const uploadFilePath = path.resolve('/home/upload/test2.csv')
      fs.writeFileSync(
        uploadFilePath,
        Buffer.from(decodeURIComponent(departmentCodeFileData2), 'base64').toString('utf8')
      )
      pathSpy.mockReturnValue('/home/upload/test2.csv')
      const file = {
        userId: 'userId',
        originalname: 'test2.csv',
        filename: '8d73eae9e5bcd33f5863b9251a76c551'
      }
      departmentCodeControllerInsertSpy.mockReturnValue(true)

      // 試験実施
      const result = await departmentCodeUploadController.upload(file, contractNormal)

      // 期待結果
      // 想定したデータがReturnされていること
      expect(result).toEqual(-1)
    })

    test('異常：データなし', async () => {
      // 準備
      findAllSpy.mockReturnValue(dbDepartmentCodeTable)
      createSpy.mockReturnValue(codeDepartmentDataResult)
      // 部門データ一括作成
      const fs = require('fs')
      const uploadFilePath = path.resolve('/home/upload/test3.csv')
      fs.writeFileSync(
        uploadFilePath,
        Buffer.from(decodeURIComponent(departmentCodeFileData3), 'base64').toString('utf8')
      )
      pathSpy.mockReturnValue('/home/upload/test3.csv')
      const file = {
        userId: 'userId',
        originalname: 'test3.csv',
        filename: '8d73eae9e5bcd33f5863b9251a76c551'
      }
      departmentCodeControllerInsertSpy.mockReturnValue(true)

      // 試験実施
      const result = await departmentCodeUploadController.upload(file, contractNormal)

      // 期待結果
      // 想定したデータがReturnされていること
      expect(result).toEqual(-2)
    })

    test('異常：200データ以上', async () => {
      // 準備
      findAllSpy.mockReturnValue(dbDepartmentCodeTable)
      createSpy.mockReturnValue(codeDepartmentDataResult)
      // 部門データ一括作成
      const fs = require('fs')
      const uploadFilePath = path.resolve('/home/upload/test4.csv')
      fs.writeFileSync(
        uploadFilePath,
        Buffer.from(decodeURIComponent(departmentCodeFileData4), 'base64').toString('utf8')
      )
      pathSpy.mockReturnValue('/home/upload/test4.csv')
      const file = {
        userId: 'userId',
        originalname: 'test4.csv',
        filename: '8d73eae9e5bcd33f5863b9251a76c551'
      }
      departmentCodeControllerInsertSpy.mockReturnValue(true)

      // 試験実施
      const result = await departmentCodeUploadController.upload(file, contractNormal)

      // 期待結果
      // 想定したデータがReturnされていること
      expect(result).toEqual(-3)
    })

    test('異常：部門データ行ごとバリデーションチェック', async () => {
      // 準備
      findAllSpy.mockReturnValue(dbDepartmentCodeTable)
      createSpy.mockReturnValue(codeDepartmentDataResult)
      // 部門データ一括作成
      const fs = require('fs')
      const uploadFilePath = path.resolve('/home/upload/test5.csv')
      fs.writeFileSync(
        uploadFilePath,
        Buffer.from(decodeURIComponent(departmentCodeFileData5), 'base64').toString('utf8')
      )
      pathSpy.mockReturnValue('/home/upload/test5.csv')
      const file = {
        userId: 'userId',
        originalname: 'test5.csv',
        filename: '8d73eae9e5bcd33f5863b9251a76c551'
      }
      departmentCodeControllerInsertSpy.mockReturnValue(true)

      // 試験実施
      const result = await departmentCodeUploadController.upload(file, contractNormal)

      // 期待結果
      // 想定したデータがReturnされていること
      expect(result).toEqual(-4)
    })

    test('異常：部門データ行ごとバリデーションチェック(部門コードと名)', async () => {
      // 準備
      findAllSpy.mockReturnValue(dbDepartmentCodeTable)
      createSpy.mockReturnValue(codeDepartmentDataResult)
      // 部門データ一括作成
      const fs = require('fs')
      const uploadFilePath = path.resolve('/home/upload/test6.csv')
      fs.writeFileSync(
        uploadFilePath,
        Buffer.from(decodeURIComponent(departmentCodeFileData6), 'base64').toString('utf8')
      )
      pathSpy.mockReturnValue('/home/upload/test6.csv')
      const file = {
        userId: 'userId',
        originalname: 'test6.csv',
        filename: '8d73eae9e5bcd33f5863b9251a76c551'
      }
      departmentCodeControllerInsertSpy.mockReturnValue(true)

      // 試験実施
      const result = await departmentCodeUploadController.upload(file, contractNormal)

      // 期待結果
      // 想定したデータがReturnされていること
      expect(result).toEqual([
        { header: ['行数', '部門コード', '部門名', '詳細'] },
        {
          code: 'TEST333322222222222222',
          errorData: '部門コードは10文字以内で入力してください。部門名は40文字以内で入力してください。',
          idx: 1,
          name: '結合テスト12結合テスト12結合テスト12結合テスト12結合テスト12結合テスト12結合テスト12結合テスト12結合テスト12結合テスト12結合テスト12結合テスト12結合テスト12結合テスト12結合テスト12結合テスト12結合テスト12結合テスト12結合テスト12結合テスト12結合テスト12'
        }
      ])
    })

    test('異常：10桁数チェック', async () => {
      // 準備
      findAllSpy.mockReturnValue(dbDepartmentCodeTable)
      createSpy.mockReturnValue(codeDepartmentDataResult)
      // 部門データ一括作成
      const fs = require('fs')
      const uploadFilePath = path.resolve('/home/upload/test7.csv')
      fs.writeFileSync(
        uploadFilePath,
        Buffer.from(decodeURIComponent(departmentCodeFileData7), 'base64').toString('utf8')
      )
      pathSpy.mockReturnValue('/home/upload/test7.csv')
      const file = {
        userId: 'userId',
        originalname: 'test7.csv',
        filename: '8d73eae9e5bcd33f5863b9251a76c551'
      }
      departmentCodeControllerInsertSpy.mockReturnValue(false)

      // 試験実施
      const result = await departmentCodeUploadController.upload(file, contractNormal)

      // 期待結果
      // 想定したデータがReturnされていること
      expect(result).toEqual([
        { header: ['行数', '部門コード', '部門名', '詳細'] },
        { code: '11111111111', errorData: '部門コードは10文字以内で入力してください。', idx: 1, name: '現金' }
      ])
    })

    test('異常：BUG3763対応(特殊文字バリデーションチェック)', async () => {
      // 準備
      findAllSpy.mockReturnValue(dbDepartmentCodeTable)
      createSpy.mockReturnValue(codeDepartmentDataResult)
      // 部門データ一括作成
      const fs = require('fs')
      const uploadFilePath = path.resolve('/home/upload/testBUG3763.csv')
      fs.writeFileSync(
        uploadFilePath,
        Buffer.from(decodeURIComponent(departmentCodeFileData12), 'base64').toString('utf8')
      )
      pathSpy.mockReturnValue('/home/upload/testBUG3763.csv')
      const file = {
        userId: 'userId',
        originalname: 'testBUG3763.csv',
        filename: '8d73eae9e5bcd33f5863b9251a76c551'
      }
      departmentCodeControllerInsertSpy.mockReturnValue(false)

      // 試験実施
      const result = await departmentCodeUploadController.upload(file, contractNormal)

      // 期待結果
      // 想定したデータがReturnされていること
      expect(result).toEqual([
        { header: ['行数', '部門コード', '部門名', '詳細'] },
        { code: 'ブモンtest1!', errorData: '部門コードは英数字カナで入力してください。', idx: 1, name: 'test1' },
        { code: 'ブモンtest1"', errorData: '部門コードは英数字カナで入力してください。', idx: 2, name: 'test1' },
        { code: 'ブモンtest1#', errorData: '部門コードは英数字カナで入力してください。', idx: 3, name: 'test1' },
        { code: 'ブモンtest1$', errorData: '部門コードは英数字カナで入力してください。', idx: 4, name: 'test1' },
        { code: 'ブモンtest1%', errorData: '部門コードは英数字カナで入力してください。', idx: 5, name: 'test1' },
        { code: 'ブモンtest1&', errorData: '部門コードは英数字カナで入力してください。', idx: 6, name: 'test1' },
        { code: "ブモンtest1'", errorData: '部門コードは英数字カナで入力してください。', idx: 7, name: 'test1' },
        { code: 'ブモンtest1(', errorData: '部門コードは英数字カナで入力してください。', idx: 8, name: 'test1' },
        { code: 'ブモンtest1)', errorData: '部門コードは英数字カナで入力してください。', idx: 9, name: 'test1' },
        { code: 'ブモンtest1-', errorData: '部門コードは英数字カナで入力してください。', idx: 10, name: 'test1' },
        { code: 'ブモンtest1=', errorData: '部門コードは英数字カナで入力してください。', idx: 11, name: 'test1' },
        { code: 'ブモンtest1~', errorData: '部門コードは英数字カナで入力してください。', idx: 12, name: 'test1' },
        { code: 'ブモンtest1^', errorData: '部門コードは英数字カナで入力してください。', idx: 13, name: 'test1' },
        { code: 'ブモンtest1\\', errorData: '部門コードは英数字カナで入力してください。', idx: 14, name: 'test1' },
        { code: 'ブモンtest1|', errorData: '部門コードは英数字カナで入力してください。', idx: 15, name: 'test1' },
        { code: 'ブモンtest1@', errorData: '部門コードは英数字カナで入力してください。', idx: 16, name: 'test1' },
        { code: 'ブモンtest1`', errorData: '部門コードは英数字カナで入力してください。', idx: 17, name: 'test1' },
        { code: 'ブモンtest1[', errorData: '部門コードは英数字カナで入力してください。', idx: 18, name: 'test1' },
        { code: 'ブモンtest1{', errorData: '部門コードは英数字カナで入力してください。', idx: 19, name: 'test1' },
        { code: 'ブモンtest1]', errorData: '部門コードは英数字カナで入力してください。', idx: 20, name: 'test1' },
        { code: 'ブモンtest1}', errorData: '部門コードは英数字カナで入力してください。', idx: 21, name: 'test1' },
        { code: 'ブモンtest1+', errorData: '部門コードは英数字カナで入力してください。', idx: 22, name: 'test1' },
        { code: 'ブモンtest1;', errorData: '部門コードは英数字カナで入力してください。', idx: 23, name: 'test1' },
        { code: 'ブモンtest1*', errorData: '部門コードは英数字カナで入力してください。', idx: 24, name: 'test1' },
        { code: 'ブモンtest1:', errorData: '部門コードは英数字カナで入力してください。', idx: 25, name: 'test1' },
        { code: 'ブモンtest1<', errorData: '部門コードは英数字カナで入力してください。', idx: 26, name: 'test1' },
        { code: 'ブモンtest1>', errorData: '部門コードは英数字カナで入力してください。', idx: 27, name: 'test1' },
        { code: 'ブモンtest1.', errorData: '部門コードは英数字カナで入力してください。', idx: 28, name: 'test1' },
        { code: 'ブモンtest1/', errorData: '部門コードは英数字カナで入力してください。', idx: 29, name: 'test1' },
        { code: 'ブモンtest1?', errorData: '部門コードは英数字カナで入力してください。', idx: 30, name: 'test1' },
        { code: 'ブモンtest1\\', errorData: '部門コードは英数字カナで入力してください。', idx: 31, name: 'test1' },
        { code: 'ブモンtest1_', errorData: '部門コードは英数字カナで入力してください。', idx: 32, name: 'test1' },
        { code: 'ブモンあtest1', errorData: '部門コードは英数字カナで入力してください。', idx: 33, name: 'test1' },
        { code: 'ブモンいtest1', errorData: '部門コードは英数字カナで入力してください。', idx: 34, name: 'test1' },
        { code: 'ブモンうtest1', errorData: '部門コードは英数字カナで入力してください。', idx: 35, name: 'test1' },
        { code: 'ブモンえtest1', errorData: '部門コードは英数字カナで入力してください。', idx: 36, name: 'test1' },
        { code: 'ブモンおtest1', errorData: '部門コードは英数字カナで入力してください。', idx: 37, name: 'test1' },
        { code: 'ブモンかtest1', errorData: '部門コードは英数字カナで入力してください。', idx: 38, name: 'test1' },
        { code: 'ブモンきtest1', errorData: '部門コードは英数字カナで入力してください。', idx: 39, name: 'test1' },
        { code: 'ブモンくtest1', errorData: '部門コードは英数字カナで入力してください。', idx: 40, name: 'test1' },
        { code: 'ブモンけtest1', errorData: '部門コードは英数字カナで入力してください。', idx: 41, name: 'test1' },
        { code: 'ブモンこtest1', errorData: '部門コードは英数字カナで入力してください。', idx: 42, name: 'test1' },
        { code: 'ブモンさtest1', errorData: '部門コードは英数字カナで入力してください。', idx: 43, name: 'test1' },
        { code: 'ブモンしtest1', errorData: '部門コードは英数字カナで入力してください。', idx: 44, name: 'test1' },
        { code: 'ブモンすtest1', errorData: '部門コードは英数字カナで入力してください。', idx: 45, name: 'test1' },
        { code: 'ブモンせtest1', errorData: '部門コードは英数字カナで入力してください。', idx: 46, name: 'test1' },
        { code: 'ブモンそtest1', errorData: '部門コードは英数字カナで入力してください。', idx: 47, name: 'test1' },
        { code: 'ブモンたtest1', errorData: '部門コードは英数字カナで入力してください。', idx: 48, name: 'test1' },
        { code: 'ブモンちtest1', errorData: '部門コードは英数字カナで入力してください。', idx: 49, name: 'test1' },
        { code: 'ブモンつtest1', errorData: '部門コードは英数字カナで入力してください。', idx: 50, name: 'test1' },
        { code: 'ブモンてtest1', errorData: '部門コードは英数字カナで入力してください。', idx: 51, name: 'test1' },
        { code: 'ブモンとtest1', errorData: '部門コードは英数字カナで入力してください。', idx: 52, name: 'test1' },
        { code: 'ブモンなtest1', errorData: '部門コードは英数字カナで入力してください。', idx: 53, name: 'test1' },
        { code: 'ブモンにtest1', errorData: '部門コードは英数字カナで入力してください。', idx: 54, name: 'test1' },
        { code: 'ブモンぬtest1', errorData: '部門コードは英数字カナで入力してください。', idx: 55, name: 'test1' },
        { code: 'ブモンねtest1', errorData: '部門コードは英数字カナで入力してください。', idx: 56, name: 'test1' },
        { code: 'ブモンのtest1', errorData: '部門コードは英数字カナで入力してください。', idx: 57, name: 'test1' },
        { code: 'ブモンはtest1', errorData: '部門コードは英数字カナで入力してください。', idx: 58, name: 'test1' },
        { code: 'ブモンひtest1', errorData: '部門コードは英数字カナで入力してください。', idx: 59, name: 'test1' },
        { code: 'ブモンふtest1', errorData: '部門コードは英数字カナで入力してください。', idx: 60, name: 'test1' },
        { code: 'ブモンへtest1', errorData: '部門コードは英数字カナで入力してください。', idx: 61, name: 'test1' },
        { code: 'ブモンほtest1', errorData: '部門コードは英数字カナで入力してください。', idx: 62, name: 'test1' },
        { code: 'ブモンばtest1', errorData: '部門コードは英数字カナで入力してください。', idx: 63, name: 'test1' },
        { code: 'ブモンびtest1', errorData: '部門コードは英数字カナで入力してください。', idx: 64, name: 'test1' },
        { code: 'ブモンぶtest1', errorData: '部門コードは英数字カナで入力してください。', idx: 65, name: 'test1' },
        { code: 'ブモンべtest1', errorData: '部門コードは英数字カナで入力してください。', idx: 66, name: 'test1' },
        { code: 'ブモンぼtest1', errorData: '部門コードは英数字カナで入力してください。', idx: 67, name: 'test1' },
        { code: 'ブモンぱtest1', errorData: '部門コードは英数字カナで入力してください。', idx: 68, name: 'test1' },
        { code: 'ブモンぴtest1', errorData: '部門コードは英数字カナで入力してください。', idx: 69, name: 'test1' },
        { code: 'ブモンぷtest1', errorData: '部門コードは英数字カナで入力してください。', idx: 70, name: 'test1' },
        { code: 'ブモンぺtest1', errorData: '部門コードは英数字カナで入力してください。', idx: 71, name: 'test1' },
        { code: 'ブモンぽtest1', errorData: '部門コードは英数字カナで入力してください。', idx: 72, name: 'test1' },
        { code: 'ブモンまtest1', errorData: '部門コードは英数字カナで入力してください。', idx: 73, name: 'test1' },
        { code: 'ブモンみtest1', errorData: '部門コードは英数字カナで入力してください。', idx: 74, name: 'test1' },
        { code: 'ブモンむtest1', errorData: '部門コードは英数字カナで入力してください。', idx: 75, name: 'test1' },
        { code: 'ブモンめtest1', errorData: '部門コードは英数字カナで入力してください。', idx: 76, name: 'test1' },
        { code: 'ブモンもtest1', errorData: '部門コードは英数字カナで入力してください。', idx: 77, name: 'test1' },
        { code: 'ブモンやtest1', errorData: '部門コードは英数字カナで入力してください。', idx: 78, name: 'test1' },
        { code: 'ブモンゆtest1', errorData: '部門コードは英数字カナで入力してください。', idx: 79, name: 'test1' },
        { code: 'ブモンよtest1', errorData: '部門コードは英数字カナで入力してください。', idx: 80, name: 'test1' },
        { code: 'ブモンらtest1', errorData: '部門コードは英数字カナで入力してください。', idx: 81, name: 'test1' },
        { code: 'ブモンりtest1', errorData: '部門コードは英数字カナで入力してください。', idx: 82, name: 'test1' },
        { code: 'ブモンるtest1', errorData: '部門コードは英数字カナで入力してください。', idx: 83, name: 'test1' },
        { code: 'ブモンれtest1', errorData: '部門コードは英数字カナで入力してください。', idx: 84, name: 'test1' },
        { code: 'ブモンろtest1', errorData: '部門コードは英数字カナで入力してください。', idx: 85, name: 'test1' },
        { code: 'ブモンわtest1', errorData: '部門コードは英数字カナで入力してください。', idx: 86, name: 'test1' },
        { code: 'ブモンをtest1', errorData: '部門コードは英数字カナで入力してください。', idx: 87, name: 'test1' },
        { code: 'ブモンんtest1', errorData: '部門コードは英数字カナで入力してください。', idx: 88, name: 'test1' }
      ])
    })

    test('異常：40桁数チェック', async () => {
      // 準備
      findAllSpy.mockReturnValue(dbDepartmentCodeTable)
      createSpy.mockReturnValue(codeDepartmentDataResult)
      // 部門データ一括作成
      const fs = require('fs')
      const uploadFilePath = path.resolve('/home/upload/test8.csv')
      fs.writeFileSync(
        uploadFilePath,
        Buffer.from(decodeURIComponent(departmentCodeFileData8), 'base64').toString('utf8')
      )
      pathSpy.mockReturnValue('/home/upload/test8.csv')
      const file = {
        userId: 'userId',
        originalname: 'test8.csv',
        filename: '8d73eae9e5bcd33f5863b9251a76c551'
      }
      departmentCodeControllerInsertSpy.mockReturnValue(true)

      // 試験実施
      const result = await departmentCodeUploadController.upload(file, contractNormal)

      // 期待結果
      // 想定したデータがReturnされていること
      expect(result).toEqual([
        { header: ['行数', '部門コード', '部門名', '詳細'] },
        {
          code: 'A2021',
          errorData: '部門名は40文字以内で入力してください。',
          idx: 1,
          name: '現金現金現金現金現金現金現金現金現金現金現金現金現金現金現金現金現金現金現金現金金'
        }
      ])
    })

    test('異常：重複チェック', async () => {
      // 準備
      // DBから部門データ登録時、返す部門データインスタンス
      findAllSpy.mockReturnValue(dbDepartmentCodeTable)
      createSpy.mockReturnValue(codeDepartmentDataResult)
      const file = {
        originalname: 'test11.csv',
        filename: '8d73eae9e5bcd33f5863b9251a76c551',
        userId: 'userId'
      }

      // 部門データ一括作成
      const fs = require('fs')
      const uploadFilePath = path.resolve('/home/upload/test11.csv')
      fs.writeFileSync(
        uploadFilePath,
        Buffer.from(decodeURIComponent(departmentCodeFileData10), 'base64').toString('utf8')
      )
      pathSpy.mockReturnValue('/home/upload/test11.csv')
      departmentCodeControllerInsertSpy.mockClear()
      departmentCodeControllerInsertSpy.mockReturnValueOnce(false)

      // 試験実施
      const result = await departmentCodeUploadController.upload(file, contractNormal)

      // 期待結果
      // 想定したデータがReturnされていること
      expect(result).toEqual([
        { header: ['行数', '部門コード', '部門名', '詳細'] },
        {
          code: 'TEST302',
          errorData: '入力した部門コードは既に登録されています。',
          idx: 1,
          name: '結合テスト12'
        }
      ])
    })

    test('異常：DBエラー(insertError)', async () => {
      // 準備
      // DBから部門データ登録時、返す部門データインスタンス
      findAllSpy.mockReturnValue(dbDepartmentCodeTable)
      createSpy.mockReturnValue(codeDepartmentDataResult)
      const file = {
        originalname: 'test1.csv',
        filename: '8d73eae9e5bcd33f5863b9251a76c551',
        userId: 'userId'
      }

      // 部門データ一括作成
      const fs = require('fs')
      const uploadFilePath = path.resolve('/home/upload/test1.csv')
      fs.writeFileSync(
        uploadFilePath,
        Buffer.from(decodeURIComponent(departmentCodeFileData1), 'base64').toString('utf8')
      )
      pathSpy.mockReturnValue('/home/upload/test1.csv')
      const insertError = new Error('insert Error')
      departmentCodeControllerInsertSpy.mockReturnValue(insertError)

      // 試験実施
      const result = await departmentCodeUploadController.upload(file, contractNormal)

      // 期待結果
      // 想定したデータがReturnされていること
      expect(result).toEqual(insertError)
    })

    test('異常：エラー処理', async () => {
      // 準備
      // DBから部門データ登録時、返す部門データインスタンス
      findAllSpy.mockReturnValue(dbDepartmentCodeTable)
      createSpy.mockReturnValue(codeDepartmentDataResult)
      const file = {
        originalname: 'test1.csv',
        filename: '8d73eae9e5bcd33f5863b9251a76c551',
        userId: 'userId'
      }

      // 部門データ一括作成
      const fs = require('fs')
      const uploadFilePath = path.resolve('/home/upload/test1.csv')
      fs.writeFileSync(
        uploadFilePath,
        Buffer.from(decodeURIComponent(departmentCodeFileData1), 'base64').toString('utf8')
      )
      pathSpy.mockReturnValue('/home/upload/test1.csv')
      departmentCodeControllerInsertSpy.mockImplementation(() => {
        throw new Error('CSVファイル削除エラー')
      })

      // 試験実施
      const result = await departmentCodeUploadController.upload(file, contractNormal)

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
      findAllSpy.mockReturnValue(dbDepartmentCodeTable)
      createSpy.mockReturnValue(codeDepartmentDataResult)
      // 部門データ一括作成
      const fs = require('fs')
      const uploadFilePath = path.resolve('/home/upload/test9.csv')
      fs.writeFileSync(
        uploadFilePath,
        Buffer.from(decodeURIComponent(departmentCodeFileData9), 'base64').toString('utf8')
      )
      pathSpy.mockReturnValue('/home/upload/test9.csv')

      departmentCodeControllerInsertSpy.mockReturnValue(true)

      // 試験実施
      const result = await departmentCodeUploadController.remove(uploadFilePath)

      // 期待結果
      expect(result).toEqual(true)
    })

    test('異常:削除エラー(存在しないデータを削除する場合)', async () => {
      // 準備
      findAllSpy.mockReturnValue(dbDepartmentCodeTable)
      createSpy.mockReturnValue(codeDepartmentDataResult)
      // 部門データ一括作成
      const fs = require('fs')
      const uploadFilePath = path.resolve('/home/upload/test9.csv')
      fs.writeFileSync(
        uploadFilePath,
        Buffer.from(decodeURIComponent(departmentCodeFileData9), 'base64').toString('utf8')
      )
      pathSpy.mockReturnValue('/home/upload/test9.csv')

      departmentCodeControllerInsertSpy.mockReturnValue(true)

      // 試験実施
      const noUploadFilePath = '/home/upload\\/test9.csv'
      let result
      try {
        result = await departmentCodeUploadController.remove(noUploadFilePath)
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
        result = await departmentCodeUploadController.remove(noUploadFilePath)
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
