'use strict'
jest.mock('../../Application/lib/logger')
jest.mock('../../Application/DTO/TradeshiftDTO')

const uploadUserController = require('../../Application/controllers/uploadUsersController')
const logger = require('../../Application/lib/logger')
const Contract = require('../../Application/models').Contract
const TradeshiftDTO = require('../../Application/DTO/TradeshiftDTO')
const removeFile = require('../../Application/lib/removeFile')

// DBのuploadData、バイナリ表示のため、EsLintチェック除外
const fs = require('fs')

const passport = {
  tenantId: '11367bd9-9710-4772-bdf7-10be2085976c',
  email: 'inte.kanri.user@gmail.com',
  userId: '53607702-b94b-4a94-9459-6cf3acd65603',
  accessToken: 'dummy',
  refreshToken: 'dummy'
}

const testTime = new Date()
const contract = Contract.build({
  contractId: 'f6133be0-1e7b-4792-841d-99c6fff801be',
  tenantId: '11367bd9-9710-4772-bdf7-10be2085976c',
  numberN: '1234567890',
  contractStatus: '00',
  deleteFlag: 0,
  createdAt: testTime,
  updatedAt: testTime
})

const nominalListTemplate = {
  fieldname: 'userNameFileUpload',
  originalname: 'ユーザー一括登録フォーマット.csv',
  encoding: '7bit',
  mimetype: 'text/csv',
  destination: './testData',
  filename: '',
  path: '',
  userId: '53607702-b94b-4a94-9459-6cf3acd65603'
}

const returnGetUserInformationByEmailValue = {
  CompanyAccountId: '',
  CompanyName: '',
  Created: '',
  FirstName: '',
  Id: '',
  Language: 'ja',
  LastName: '',
  Memberships: [{ UserId: '', GroupId: '', Role: '' }],
  GroupId: '',
  Role: '',
  UserId: '',
  State: '',
  TimeZone: 'Asia/Tokyo',
  Type: 'PERSON',
  Username: '',
  Visible: true
}

const returnGetUserInformationByEmailValue401 = new Error()
returnGetUserInformationByEmailValue401.response = {
  response: {
    status: 401,
    data: {}
  }
}

const returnGetUserInformationByEmailDuplicate = { ...returnGetUserInformationByEmailValue }

const returnInviteUser = 'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'
const returnInviteUserValue401 = new Error()
returnInviteUserValue401.response = {
  status: 401,
  data: ''
}

let errorSpy, infoSpy, removeFileSpy

describe('uploadUsersControllerのテスト', () => {
  beforeEach(() => {
    errorSpy = jest.spyOn(logger, 'error')
    infoSpy = jest.spyOn(logger, 'info')
    TradeshiftDTO.prototype.getUserInformationByEmail = jest.fn()
    TradeshiftDTO.prototype.registUser = jest.fn()
    TradeshiftDTO.prototype.inviteUser = jest.fn()
    fs.unlinkSync = jest.fn()
    removeFileSpy = jest.spyOn(removeFile, 'removeFile')
  })
  afterEach(() => {
    errorSpy.mockRestore()
    infoSpy.mockRestore()
    TradeshiftDTO.prototype.getUserInformationByEmail.mockRestore()
    TradeshiftDTO.prototype.registUser.mockRestore()
    TradeshiftDTO.prototype.inviteUser.mockRestore()
    removeFileSpy.mockRestore()
  })

  describe('upload', () => {
    test('正常:１名新規登録', async () => {
      // 準備
      const testNominal = { ...nominalListTemplate }
      testNominal.filename = 'usersUpload_test9.csv'

      TradeshiftDTO.prototype.getUserInformationByEmail.mockReturnValueOnce('test@test.com')
      TradeshiftDTO.prototype.registUser.mockReturnValueOnce({
        Username: 'test@test.com',
        role: 'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'
      })

      const [status, createdUser] = await uploadUserController.upload(passport, contract, testNominal)

      // 期待結果
      expect(status).toBe(0)
      expect(JSON.stringify(createdUser)).toMatch(
        JSON.stringify([
          { username: 'test@test.com', role: 'a6a3edcd-00d9-427c-bf03-4ef0112ba16d', status: 'Created', stack: null }
        ])
      )
    })

    test('準正常:新規登録時、APIエラー発生(401)', async () => {
      // 準備
      const testNominal = { ...nominalListTemplate }
      testNominal.filename = 'usersUpload_test9.csv'

      TradeshiftDTO.prototype.getUserInformationByEmail.mockReturnValueOnce('test@test.com')
      TradeshiftDTO.prototype.registUser.mockReturnValueOnce(returnInviteUserValue401)

      const [status, createdUser] = await uploadUserController.upload(passport, contract, testNominal)

      // 期待結果
      expect(status).toEqual(0)
      expect(createdUser).toEqual([
        {
          username: 'test@test.com',
          role: 'a6a3edcd-00d9-427c-bf03-4ef0112ba16d',
          status: 'Invited Api Error',
          stack: undefined
        }
      ])
    })

    test('準正常：readNominalListのファイルオープンエラー', async () => {
      // 準備
      const testNominal = { ...nominalListTemplate }
      testNominal.filename = 'usersUpload_test999.csv'

      // 試験実施
      const [result, created] = await uploadUserController.upload(passport, contract, testNominal)

      // 期待結果
      expect(result instanceof Error).toEqual(true)
      expect(created).toEqual(null)
    })

    test('準正常：readNominalListのUTF-8bom付きでは無の場合', async () => {
      // 準備
      const testNominal = { ...nominalListTemplate }
      testNominal.filename = 'usersUpload_test2.csv'

      // 試験実施
      const [status, createdUser] = await uploadUserController.upload(passport, contract, testNominal)

      // 期待結果
      expect(status).toEqual(-1)
      expect(logger.error).toHaveBeenCalledWith({
        contractId: contract.contractId,
        stack: 'ヘッダーが指定のものと異なります。',
        status: 0
      })
      expect(createdUser).toEqual(null)
    })

    test('準正常：readNominalListの200件以上', async () => {
      // 準備
      const testNominal = { ...nominalListTemplate }
      testNominal.filename = 'usersUpload_test3.csv'

      // 試験実施
      const [status, createdUser] = await uploadUserController.upload(passport, contract, testNominal)

      // 期待結果
      expect(status).toEqual(-3)
      expect(logger.error).toHaveBeenCalledWith({
        contractId: contract.contractId,
        stack: '一括登録ユーザーが200件を超えています。',
        status: 0
      })
      expect(createdUser).toEqual(null)
    })

    test('準正常：CSVの項目が異なる', async () => {
      // 準備
      const testNominal = { ...nominalListTemplate }
      testNominal.filename = 'usersUpload_test4.csv'

      // 試験実施
      const [status, createdUser] = await uploadUserController.upload(passport, contract, testNominal)

      // 期待結果
      expect(status).toEqual(-2)
      expect(logger.error).toHaveBeenCalledWith({
        contractId: contract.contractId,
        stack: '項目数が異なります。',
        status: 0
      })
      expect(createdUser).toEqual(null)
    })

    test('準正常：email(local桁数６４以上)', async () => {
      // 準備
      const testNominal = { ...nominalListTemplate }
      testNominal.filename = 'usersUpload_test5.csv'

      // 試験実施
      const [status, createdUser] = await uploadUserController.upload(passport, contract, testNominal)

      // 期待結果
      expect(status).toEqual(0)
      expect(JSON.stringify(createdUser)).toEqual(
        JSON.stringify([
          {
            username: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa@test.com',
            role: 'fe888fbb-172f-467c-b9ad-efe0720fecf9',
            status: 'Email Type Error',
            stack: null
          }
        ])
      )
    })

    test('準正常:roleの誤り', async () => {
      // 準備
      const testNominal = { ...nominalListTemplate }
      testNominal.filename = 'usersUpload_test6.csv'

      // 試験実施
      const [status, createdUser] = await uploadUserController.upload(passport, contract, testNominal)

      // 期待結果
      // undefinedが返されること
      expect(status).toEqual(0)
      expect(JSON.stringify(createdUser)).toEqual(
        JSON.stringify([
          {
            username: 'noRole@test.com',
            role: undefined,
            status: 'Role Type Error',
            stack: null
          }
        ])
      )
    })

    test('準正常:getUserInformationByEmail401エラー', async () => {
      // 準備
      const testNominal = { ...nominalListTemplate }
      testNominal.filename = 'usersUpload_test1.csv'
      TradeshiftDTO.prototype.getUserInformationByEmail.mockReturnValueOnce(returnGetUserInformationByEmailValue401)

      // 試験実施
      const [status, createdUser] = await uploadUserController.upload(passport, contract, testNominal)

      // 期待結果
      expect(status).toEqual(0)
      expect(errorSpy).toHaveBeenCalledWith({ contractId: contract.contractId, stack: expect.anything(), status: 0 })
      expect(createdUser).toEqual([
        {
          username: 'test1@test.com',
          role: 'a6a3edcd-00d9-427c-bf03-4ef0112ba16d',
          status: 'Error',
          stack: returnGetUserInformationByEmailValue401.stack
        }
      ])
    })

    test('準正常:重複ユーザー', async () => {
      // 準備
      const testNominal = { ...nominalListTemplate }
      testNominal.filename = 'usersUpload_test1.csv'
      returnGetUserInformationByEmailDuplicate.CompanyAccountId = contract.tenantId
      TradeshiftDTO.prototype.getUserInformationByEmail.mockReturnValueOnce(returnGetUserInformationByEmailDuplicate)
      const duplicatedUser = {
        username: 'test1@test.com',
        role: 'a6a3edcd-00d9-427c-bf03-4ef0112ba16d',
        status: 'Duplicated',
        stack: null
      }

      // 試験実施
      const [status, createdUser] = await uploadUserController.upload(passport, contract, testNominal)

      // 期待結果
      expect(status).toEqual(0)
      expect(JSON.stringify(createdUser)).toBe(JSON.stringify([duplicatedUser]))
    })

    test('正常:他社のユーザー', async () => {
      // 準備
      const testNominal = { ...nominalListTemplate }
      testNominal.filename = 'usersUpload_test1.csv'
      returnGetUserInformationByEmailDuplicate.CompanyAccountId = '11367bd9-9710-4772-bdf7-10be2085976a'
      TradeshiftDTO.prototype.getUserInformationByEmail.mockReturnValueOnce(returnGetUserInformationByEmailDuplicate)
      TradeshiftDTO.prototype.inviteUser.mockReturnValueOnce(returnInviteUser)
      const invitedUser = {
        username: 'test1@test.com',
        role: 'a6a3edcd-00d9-427c-bf03-4ef0112ba16d',
        status: 'Invited',
        stack: null
      }

      // 試験実施
      const [status, createdUser] = await uploadUserController.upload(passport, contract, testNominal)

      // 期待結果
      expect(status).toEqual(0)
      expect(JSON.stringify(createdUser)).toBe(JSON.stringify([invitedUser]))
    })

    test('準正常:他社のユーザーの時、APIエラー発生(401)', async () => {
      // 準備
      const testNominal = { ...nominalListTemplate }
      testNominal.filename = 'usersUpload_test1.csv'
      returnGetUserInformationByEmailDuplicate.CompanyAccountId = '11367bd9-9710-4772-bdf7-10be2085976a'
      TradeshiftDTO.prototype.getUserInformationByEmail.mockReturnValueOnce(returnGetUserInformationByEmailDuplicate)
      TradeshiftDTO.prototype.inviteUser.mockReturnValueOnce(returnInviteUserValue401)

      // 試験実施
      const [status, createdUser] = await uploadUserController.upload(passport, contract, testNominal)

      // 期待結果
      expect(status).toEqual(0)
      expect(createdUser).toEqual([
        {
          username: 'test1@test.com',
          role: 'a6a3edcd-00d9-427c-bf03-4ef0112ba16d',
          status: 'Invited Api Error',
          stack: undefined
        }
      ])
    })

    test('準正常:ファイル削除の時、エラーが発生した場合', async () => {
      // 準備
      const testNominal = { ...nominalListTemplate }
      testNominal.filename = 'usersUpload_test1.csv'
      returnGetUserInformationByEmailDuplicate.CompanyAccountId = contract.tenantId
      TradeshiftDTO.prototype.getUserInformationByEmail.mockReturnValueOnce(returnGetUserInformationByEmailDuplicate)
      TradeshiftDTO.prototype.inviteUser.mockReturnValueOnce(returnInviteUser)
      const deleteError = new Error('ファイル削除エラー')
      removeFileSpy.mockImplementationOnce(() => {
        throw deleteError
      })

      // 試験実施
      const [status, createdUser] = await uploadUserController.upload(passport, contract, testNominal)

      // 期待結果
      expect(status).toMatchObject(deleteError)
      expect(createdUser).toEqual(null)
    })
  })
})
