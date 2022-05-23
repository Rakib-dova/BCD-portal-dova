'use strict'
jest.mock('../../Application/models')
jest.mock('../../Application/lib/logger')

const uploadUserController = require('../../Application/controllers/uploadUsersController')
const constantsDefine = require('../../Application/constants')
const logger = require('../../Application/lib/logger')
const TradeshiftDTO = require('../../Application/DTO/TradeshiftDTO')
const UploadUsersDTO = require('../../Application/DTO/UploadUsersDTO')

// DBのuploadData、バイナリ表示のため、EsLintチェック除外
const fs = require('fs')
const path = require('path')

let errorSpy,
  tenantId,
  infoSpy,
  getReadCsvDataSpy

let pathSpy

describe('uploadFormatControllerのテスト', () => {
  beforeEach(() => {
    errorSpy = jest.spyOn(logger, 'error')
    infoSpy = jest.spyOn(logger, 'info')
    pathSpy = jest.spyOn(path, 'resolve')
    getReadCsvDataSpy = jest.spyOn(uploadUserController, 'getReadCsvData')
  })
  afterEach(() => {
    errorSpy.mockRestore()
    infoSpy.mockRestore()
    pathSpy.mockRestore()
    getReadCsvDataSpy.mockRestore()
  })
  tenantId = '12345678-bdac-4195-80b9-1ea64b8cb70c'

  const user = {
    email: 'dummy@testdummy.com',
    userId: '12345678-cb0b-48ad-857d-4b42a44ede13',
    tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089',
    accessToken: 'dummyAccessToken',
    refreshToken: 'dummyRefreshToken'
  }

  const contractInfoData = {
    contractId: '87654321-fbe6-4864-a866-7a3ce9aa517e',
    tenantId: user.tenantId,
    numberN: '1234567890',
    contractStatus: constantsDefine.statusConstants.contractStatusNewContractReceive,
    deleteFlag: false,
    createdAt: '2021-07-09T04:30:00.000Z',
    updatedAt: '2021-07-09T04:30:00.000Z'
  }

  const usersUploadFileDataNotHeader = Buffer.from(
    fs.readFileSync('./testData/usersUpload_notHeader.csv', {
      encoding: 'utf-8',
      flag: 'r'
    })
  ).toString('base64')

  const usersUploadFileData1 = Buffer.from(
    fs.readFileSync('./testData/usersUpload_test1.csv', {
      encoding: 'utf-8',
      flag: 'r'
    })
  ).toString('base64')
  // 異常系8
  const usersUploadFileData9 = Buffer.from(
    fs.readFileSync('./testData/usersUpload_test9.csv', {
      encoding: 'utf-8',
      flag: 'r'
    })
  ).toString('base64')

  const result1 = {
    status: 0,
    data: [
      'test1@test.com,1',
      'test2@test.com,2',
      'test3@test.com,3',
      'test4@test.com,4'
    ]
  }
  const result2 = {
    status: -1,
    data: null
  }

  describe.only('upload', () => {
    let readFileSyncSpy
    beforeEach(() => {
      readFileSyncSpy = jest.spyOn(fs, 'readFileSync')
    })
    afterEach(() => {
      readFileSyncSpy.mockRestore()
    })

    test('準正常：readNominalListの結果エラー', async () => {
      // 準備
      const nominalList = {
        fieldname: 'userNameFileUpload',
        originalname: 'ユーザー一括作成フォーマット.csv',
        encoding: '7bit',
        mimetype: 'text/csv',
        destination: '/home/upload',
        filename: '784678d952882217242d1fb828c079f6',
        path: '/home/upload/784678d952882217242d1fb828c079f6',
        size: 51,
        userId: '30eec64f-b0e2-40aa-a771-ad6647a9224f'
      }
      // 試験実施
      const result = await uploadUserController.upload(tenantId, contractInfoData, nominalList)

      // 期待結果
      // undefinedが返されること
      expect(result).toEqual(undefined)
    })
  })

  describe('readNominalList', () => {
    let readFileSyncSpy
    beforeEach(() => {
      readFileSyncSpy = jest.spyOn(fs, 'readFileSync')
    })
    afterEach(() => {
      readFileSyncSpy.mockRestore()
    })

    test('正常：データを正常に読み込んだ場合', async () => {
      // 準備
      const destination = '/home/upload'
      const fileName = '2c2796e75ce6e5449e735b1b29225411'
      const pwdFile = path.resolve(destination, fileName)
      const uploadFilePath = path.resolve(`/home/upload/${fileName}`)
      fs.writeFileSync(uploadFilePath, Buffer.from(decodeURIComponent(usersUploadFileData1), 'base64').toString('utf8'))
      const fsResult = fs.readFileSync(pwdFile, { encoding: 'utf8', flag: 'r' })
      readFileSyncSpy.mockReturnValueOnce(fsResult)

      // 試験実施
      const result = await uploadUserController.readNominalList(pwdFile)
      expect(result).toEqual(result1)
    })

    test('準正常：データのヘッダーが間違ってる場合', async () => {
      // 準備
      const destination = '/home/upload'
      const fileName = '2c2796e75ce6e5449e735b1b29225412'
      const pwdFile = path.resolve(destination, fileName)
      const uploadFilePath = path.resolve(`/home/upload/${fileName}`)
      fs.writeFileSync(uploadFilePath, Buffer.from(decodeURIComponent(usersUploadFileDataNotHeader), 'base64').toString('utf8'))
      const fsResult = fs.readFileSync(pwdFile, { encoding: 'utf8', flag: 'r' })
      readFileSyncSpy.mockReturnValueOnce(fsResult)

      // 試験実施
      const result = await uploadUserController.readNominalList(pwdFile)
      expect(result).toEqual(result2)
    })
    test('準正常：データを読み込まなかった場合', async () => {
      // 準備
      const destination = '/home/upload'
      const fileName = '2c2796e75ce6e5449e735b1b29225413'
      const pwdFile = path.resolve(destination, fileName)

      const getReadCsvDataResult = new Error()
      readFileSyncSpy.mockReturnValueOnce(getReadCsvDataResult)

      // 試験実施
      const result = await uploadUserController.readNominalList(pwdFile)
      expect(result).toBe(getReadCsvDataResult)
    })
  })

  describe('getReadCsvData', () => {
    test('正常：データを正常に読み込んだ場合', async () => {
      // 準備
      const fs = require('fs')
      const file = {
        destination: '/home/upload',
        filename: '2c2796e75ce6e5449e735b1b292254cd'
      }
      const uploadFilePath = path.resolve(`/home/upload/${file.filename}`)
      fs.writeFileSync(uploadFilePath, Buffer.from(decodeURIComponent(usersUploadFileData1), 'base64').toString('utf8'))

      const destination = file.destination
      const fileName = file.filename
      const pwdFile = path.resolve(destination, fileName)

      // 試験実施
      const result = await uploadUserController.getReadCsvData(pwdFile)
      expect(result).toBe(Buffer.from(decodeURIComponent(usersUploadFileData1), 'base64').toString('utf8'))
    })

    test('準正常：システムエラーの場合', async () => {
      // 準備
      const fs = require('fs')
      const file = {
        destination: '/home/upload',
        filename: '2c2796e75ce6e5449e735b1b292254cd'
      }
      const uploadFilePath = path.resolve(`/home/upload/${file.filename}`)
      fs.writeFileSync(uploadFilePath, Buffer.from(decodeURIComponent(usersUploadFileData1), 'base64').toString('utf8'))

      const destination = file.destination
      const fileName = '2c2796e75ce6e5449e735b1b29225411'
      const pwdFile = path.resolve(destination, fileName)

      const error = new Error()
      error.code = 'ENOENT'
      error.errno = -2
      error.path = '/home/upload/2c2796e75ce6e5449e735b1b29225411'
      error.syscall = 'open'
      // 試験実施
      const result = await uploadUserController.getReadCsvData(pwdFile)
      expect(result).toEqual(error)
    })
  })

  describe('removeFile', () => {
    test('正常:データ削除', async () => {
      // ユーザー一括作成
      const fs = require('fs')
      const uploadFilePath = path.resolve('/home/upload/test9.csv')
      fs.writeFileSync(uploadFilePath, Buffer.from(decodeURIComponent(usersUploadFileData9), 'base64').toString('utf8'))
      pathSpy.mockReturnValue('/home/upload/test9.csv')

      // 試験実施
      const result = await uploadUserController.removeFile(uploadFilePath)

      // 期待結果
      expect(result).toEqual(true)
    })

    test('異常:削除エラー(存在しないデータを削除する場合)', async () => {
      // ユーザー一括作成
      const fs = require('fs')
      const uploadFilePath = path.resolve('/home/upload/test9.csv')
      fs.writeFileSync(uploadFilePath, Buffer.from(decodeURIComponent(usersUploadFileData9), 'base64').toString('utf8'))
      pathSpy.mockReturnValue('/home/upload/test9.csv')

      // 試験実施
      const noUploadFilePath = '/home/upload\\/test9.csv'
      let result
      try {
        result = await uploadUserController.removeFile(noUploadFilePath)
      } catch (err) {
        result = err
      }
      // 期待結果
      // 削除エラーが返されること
      expect(() => {
        throw result
      }).toThrowError('削除対象を見つかれませんでした。')
    })

    test('異常:削除エラー', async () => {
      // 準備
      const noUploadFilePath = '/etc/resolv.conf'

      // 試験実施
      let result
      try {
        result = await uploadUserController.removeFile(noUploadFilePath)
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
