'use strict'

jest.mock('../../Application/controllers/apiManager')
jest.mock('../../Application/lib/logger')
jest.mock('../../Application/lib/tokenenc')

const userController = require('../../Application/controllers/userController')
const db = require('../../Application/models').sequelize
const Tenant = require('../../Application/models').Tenant
const User = require('../../Application/models').User
const Contract = require('../../Application/models').Contract
const Order = require('../../Application/models').Order
const logger = require('../../Application/lib/logger')
const apiManager = require('../../Application/controllers/apiManager.js')
const tokenenc = require('../../Application/lib/tokenenc')

let userFindOneSpy,
  errorSpy,
  userId,
  tenantId,
  refreshToken,
  accessToken,
  accessTradeshiftSpy,
  transactionSpy,
  encryptSpy

const tenantDB = []
const tenantRecord = {
  tenantId: null,
  registeredBy: null,
  customerId: null,
  createdAt: null,
  updatedAt: null,
  deleteFlag: null
}
const userDB = []
const userRecord = {
  userId: null,
  tenantId: null,
  userRole: null,
  appVersion: null,
  refreshToken: null,
  subRefreshToken: null,
  userStatus: null,
  lastRefreshedAt: null,
  createdAt: null,
  updatedAt: null
}
const contractDB = []

describe('userControllerのテスト', () => {
  beforeEach(() => {
    process.env.TS_APP_VERSION = '0.0.1'
    accessTradeshiftSpy = jest.spyOn(apiManager, 'accessTradeshift')
    userFindOneSpy = jest.spyOn(User, 'findOne')
    errorSpy = jest.spyOn(logger, 'error')
    transactionSpy = jest.spyOn(db, 'transaction')
    encryptSpy = jest.spyOn(tokenenc, 'encrypt')
    Tenant.findOrCreate = jest.fn((values) => {
      const where = values.where
      const defaults = values.defaults
      const transaction = values.transaction
      const result = { dataValues: null }
      let recordFlag = false
      try {
        if (transaction.error !== undefined) {
          return null
        }
        tenantDB.forEach((record) => {
          const keys = Object.keys(where)
          keys.forEach((key) => {
            if (record[key] !== undefined && record[key] === where[key] && !recordFlag) {
              result.dataValues = record
              recordFlag = true
            }
          })
        })

        if (!recordFlag) {
          const timestamp = new Date()
          result.dataValues = {
            ...tenantRecord,
            ...defaults,
            createdAt: timestamp,
            updatedAt: timestamp
          }
          tenantDB.push(result.dataValues)
        }
        transaction.commit = true
        return [result]
      } catch (error) {
        transaction.error = error
        return null
      }
    })
    User.findOrCreate = jest.fn((values) => {
      const where = values.where
      const defaults = values.defaults
      const transaction = values.transaction
      const result = { dataValues: null }
      let recordFlag = false
      try {
        if (transaction.error !== undefined) {
          return null
        }
        userDB.forEach((record) => {
          const keys = Object.keys(where)
          keys.forEach((key) => {
            if (record[key] !== undefined && record[key] === where[key] && !recordFlag) {
              result.dataValues = record
              recordFlag = true
            }
          })
        })

        if (!recordFlag) {
          const timestamp = new Date()
          result.dataValues = {
            ...userRecord,
            ...defaults,
            createdAt: timestamp,
            updatedAt: timestamp
          }
          userDB.push(result.dataValues)
        }
        transaction.commit = true
        return result
      } catch (error) {
        transaction.error = error
        return null
      }
    })
    Contract.findOne = jest.fn((values) => {
      const where = values.where
      const tmpResult = []
      let recordFlag = false

      contractDB.forEach((record) => {
        const keys = Object.keys(where)
        keys.forEach((key) => {
          if (typeof where[key] !== 'object') {
            if (record[key] !== undefined && record[key] === where[key] && !recordFlag) {
              tmpResult.push(record)
              recordFlag = true
            }
          } else {
            const keyOfKey = Object.keys(where[key])
            switch (typeof keyOfKey) {
              case 'symbol':
                switch (keyOfKey.toString()) {
                  case 'Symbol(ne)':
                    tmpResult.map((record, idx, result) => {
                      if (record[key] === where[key][keyOfKey]) {
                        delete result[idx]
                      }
                      return ''
                    })
                    break
                }
                break
            }
          }
        })
      })

      const contractResult = []
      tmpResult.forEach((record) => {
        if (record !== undefined) {
          contractResult.push(record)
        }
      })

      if (contractResult[0] === undefined) {
        return null
      } else {
        return contractResult[0]
      }
    })
    Contract.findOrCreate = jest.fn((values) => {
      return ''
    })
    Order.findOrCreate = jest.fn((values) => {
      return ''
    })
    db.transaction = jest.fn(async (callback) => {
      const transactionObj = {}
      try {
        const result = await callback(transactionObj)
        return await result
      } catch (error) {
        const dbError = new Error('DB error')
        throw dbError
      }
    })
  })
  afterEach(() => {
    accessTradeshiftSpy.mockRestore()
    userFindOneSpy.mockRestore()
    errorSpy.mockRestore()
    transactionSpy.mockRestore()
    encryptSpy.mockRestore()
  })
  userId = '12345678-cb0b-48ad-857d-4b42a44ede13'
  tenantId = '12345678-8ba0-42a4-8582-b234cb4a2089'
  accessToken = 'dummyaccessToken'
  refreshToken = 'dummyRefreshToken'

  describe('findOne', () => {
    test('正常', async () => {
      // 準備
      // DBからの正常なユーザデータの取得を想定する
      userFindOneSpy.mockReturnValue({
        userId: userId,
        tenantId: tenantId,
        userRole: 'a6a3edcd-00d9-427c-bf03-4ef0112ba16d',
        appVersion: '0.0.1',
        refreshToken: 'dummyRefreshToken',
        subRefreshToken: null,
        userStatus: 0,
        lastRefreshedAt: null,
        createdAt: '2021-01-25T08:45:49.803Z',
        updatedAt: '2021-01-25T08:45:49.803Z'
      })

      // 試験実施
      const result = await userController.findOne(userId)

      // 期待結果
      // 取得した情報がReturnされていること
      expect(result).toEqual({
        userId: userId,
        tenantId: tenantId,
        userRole: 'a6a3edcd-00d9-427c-bf03-4ef0112ba16d',
        appVersion: '0.0.1',
        refreshToken: 'dummyRefreshToken',
        subRefreshToken: null,
        userStatus: 0,
        lastRefreshedAt: null,
        createdAt: '2021-01-25T08:45:49.803Z',
        updatedAt: '2021-01-25T08:45:49.803Z'
      })
    })

    test('status 0のErrorログ: DBエラー時', async () => {
      // 準備
      // DBエラーを想定
      const dbError = new Error('DB error mock')
      userFindOneSpy.mockImplementation(() => {
        throw dbError
      })

      // 試験実施
      const result = await userController.findOne(userId)

      // 期待結果
      // CatchしたDBエラーが返ること
      expect(result).toEqual(dbError)
      // status 0のErrorログが呼ばれること
      expect(errorSpy).toHaveBeenCalledWith({ user: userId, stack: dbError.stack, status: 0 }, dbError.name)
    })
  })
  describe('findAndUpdate', () => {
    test('正常', async () => {
      // 準備
      // DBからの正常なユーザデータの取得を想定する
      // saveをMock化するために含める
      userFindOneSpy.mockReturnValue({
        userId: userId,
        tenantId: tenantId,
        userRole: 'a6a3edcd-00d9-427c-bf03-4ef0112ba16d',
        appVersion: '0.0.1',
        refreshToken: 'dummyRefreshToken',
        subRefreshToken: null,
        userStatus: 0,
        lastRefreshedAt: null,
        createdAt: '2021-01-25T08:45:49.803Z',
        updatedAt: '2021-01-25T08:45:49.803Z',
        save: jest.fn()
      })
      // Tradeshiftからの正常なユーザデータの取得を想定する
      accessTradeshiftSpy.mockReturnValue({
        Id: userId,
        CompanyAccountId: tenantId,
        CompanyName: 'UnitTestCompany',
        Username: 'dummy@example.com',
        Language: 'ja',
        TimeZone: 'Asia/Tokyo',
        Memberships: [
          {
            UserId: userId,
            GroupId: tenantId,
            Role: 'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'
          }
        ],
        Created: '2021-01-25T08:45:49.803Z',
        State: 'ACTIVE',
        Type: 'PERSON',
        FirstName: 'Yamada',
        LastName: 'Taro',
        Visible: true
      })
      // リフレッシュトークンの正常な暗号化ができた場合を想定する
      encryptSpy.mockReturnValue('dummyEncryptedRefreshToken')

      // 試験実施
      const result = await userController.findAndUpdate(userId, accessToken, refreshToken)

      // 期待結果
      // 取得した情報がReturnされていること
      // subRefreshToken=refreshToken
      // refreshToken=暗号化されたrefreshToken
      // userRole=Memberships[0].Role
      expect(result).toEqual({
        userId: userId,
        tenantId: tenantId,
        userRole: 'a6a3edcd-00d9-427c-bf03-4ef0112ba16d',
        appVersion: '0.0.1',
        refreshToken: 'dummyEncryptedRefreshToken',
        subRefreshToken: 'dummyRefreshToken',
        userStatus: 0,
        lastRefreshedAt: null,
        createdAt: '2021-01-25T08:45:49.803Z',
        updatedAt: '2021-01-25T08:45:49.803Z',
        save: expect.any(Function)
      })
      // saveが引数なしで呼ばれていること
      const _userFindOne = userFindOneSpy()
      expect(_userFindOne.save).toHaveBeenCalledWith()
    })

    test('status 0のErrorログ: DBエラー時', async () => {
      // 準備
      // DBエラーを想定する
      const dbError = new Error('DB error mock')
      userFindOneSpy.mockImplementation(() => {
        throw dbError
      })

      // 試験実施
      const result = await userController.findAndUpdate(userId, accessToken, refreshToken)

      // 期待結果
      // CatchしたDBエラーが返ること
      expect(result).toEqual(dbError)
      // status 0のErrorログが呼ばれること
      expect(errorSpy).toHaveBeenCalledWith({ user: userId, stack: expect.anything(), status: 0 }, expect.anything())
    })

    test('null: DBからUserが取得できなかった場合', async () => {
      // 準備
      // DBからのユーザデータの取得がなかった場合を想定する
      userFindOneSpy.mockReturnValue(null)

      // 試験実施
      const result = await userController.findAndUpdate(userId, accessToken, refreshToken)

      // 期待結果
      // nullが返ること
      expect(result).toBe(null)
    })

    test('アクセスエラー: Tradeshift APIへのアクセスエラーの場合', async () => {
      // 準備
      // DBからの正常なユーザデータの取得を想定する
      userFindOneSpy.mockReturnValue({
        userId: userId,
        tenantId: tenantId,
        userRole: 'a6a3edcd-00d9-427c-bf03-4ef0112ba16d',
        appVersion: '0.0.1',
        refreshToken: 'dummyRefreshToken',
        subRefreshToken: null,
        userStatus: 0,
        lastRefreshedAt: null,
        createdAt: '2021-01-25T08:45:49.803Z',
        updatedAt: '2021-01-25T08:45:49.803Z'
      })
      // TradeShiftでのアクセスエラーを想定する
      const accessError = new Error('Access error mock')
      accessTradeshiftSpy.mockReturnValue(accessError)

      // 試験実施
      const result = await userController.findAndUpdate(userId, accessToken, refreshToken)

      // 期待結果
      // Catchしたアクセスエラーが返ること
      expect(result).toEqual(accessError)
    })

    test('status 2のErrorログ: 暗号化エラー時', async () => {
      // 準備
      // DBからの正常なユーザデータの取得を想定する
      userFindOneSpy.mockReturnValue({
        userId: userId,
        tenantId: tenantId,
        userRole: 'a6a3edcd-00d9-427c-bf03-4ef0112ba16d',
        appVersion: '0.0.1',
        refreshToken: 'dummyRefreshToken',
        subRefreshToken: null,
        userStatus: 0,
        lastRefreshedAt: null,
        createdAt: '2021-01-25T08:45:49.803Z',
        updatedAt: '2021-01-25T08:45:49.803Z'
      })
      // Tradeshiftからの正常なユーザデータの取得を想定する
      accessTradeshiftSpy.mockReturnValue({
        Id: userId,
        CompanyAccountId: tenantId,
        CompanyName: 'UnitTestCompany',
        Username: 'dummy@example.com',
        Language: 'ja',
        TimeZone: 'Asia/Tokyo',
        Memberships: [
          {
            UserId: userId,
            GroupId: tenantId,
            Role: 'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'
          }
        ],
        Created: '2021-01-25T08:45:49.803Z',
        State: 'ACTIVE',
        Type: 'PERSON',
        FirstName: 'Yamada',
        LastName: 'Taro',
        Visible: true
      })
      // リフレッシュトークンの暗号化でエラーが起こった場合を想定する
      const encryptError = new Error('Encrypt error mock')
      encryptSpy.mockImplementation(() => {
        throw encryptError
      })

      // 試験実施
      const result = await userController.findAndUpdate(userId, accessToken, refreshToken)

      // 期待結果
      // Catchした暗号化エラーが返ること
      expect(result).toEqual(encryptError)
      // status 2のErrorログが呼ばれること
      expect(errorSpy).toHaveBeenCalledWith({ user: userId, stack: encryptError.stack, status: 2 }, encryptError.name)
    })
  })
  describe('create', () => {
    test('正常(db.sequelize.transaction)', async () => {
      // 準備
      // Tradeshiftからの正常なユーザデータの取得を想定する
      accessTradeshiftSpy.mockReturnValue({
        Id: userId,
        CompanyAccountId: tenantId,
        CompanyName: 'UnitTestCompany',
        Username: 'dummy@example.com',
        Language: 'ja',
        TimeZone: 'Asia/Tokyo',
        Memberships: [
          {
            UserId: userId,
            GroupId: tenantId,
            Role: 'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'
          }
        ],
        Created: '2021-01-25T08:45:49.803Z',
        State: 'ACTIVE',
        Type: 'PERSON',
        FirstName: 'Yamada',
        LastName: 'Taro',
        Visible: true
      })

      const contractInformationNewOrder = require('../../Application/orderTemplate/contractInformationnewOrder.json')
      // リフレッシュトークンの正常な暗号化ができた場合を想定する
      encryptSpy.mockReturnValue('dummyEncryptedRefreshToken')

      // 試験実施
      const result = await userController.create(accessToken, refreshToken, contractInformationNewOrder)

      // 期待結果
      // DBから取得した情報がReturnされていること
      expect(result).toEqual({
        dataValues: {
          appVersion: '0.0.1',
          createdAt: result.dataValues.createdAt,
          lastRefreshedAt: null,
          refreshToken: 'dummyEncryptedRefreshToken',
          subRefreshToken: null,
          tenantId: '12345678-8ba0-42a4-8582-b234cb4a2089',
          updatedAt: result.dataValues.updatedAt,
          userId: '12345678-cb0b-48ad-857d-4b42a44ede13',
          userRole: 'a6a3edcd-00d9-427c-bf03-4ef0112ba16d',
          userStatus: 0
        }
      })
    })

    test('正常：Tenant.findOrCreateがnullの場合', async () => {
      // 準備
      // Tradeshiftからの正常なユーザデータ(必要最小限)の取得を想定する
      accessTradeshiftSpy.mockReturnValue({
        CompanyAccountId: null,
        Memberships: [
          {
            UserId: userId,
            Role: 'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'
          }
        ]
      })
      // リフレッシュトークンの正常な暗号化ができた場合を想定する
      encryptSpy.mockReturnValue('dummyEncryptedRefreshToken')
      // DBエラーを想定する
      Tenant.findOrCreate = jest.fn((values) => {
        const result = [
          {
            dataValues: {
              deleteFlag: true
            }
          }
        ]
        return result
      })

      const contractInformationNewOrder = require('../../Application/orderTemplate/contractInformationnewOrder.json')

      // 試験実施
      const result = await userController.create(accessToken, refreshToken, contractInformationNewOrder)

      // 期待結果
      // 想定したデータが返ること
      expect(result).toEqual({
        dataValues: {
          appVersion: '0.0.1',
          createdAt: result.dataValues.createdAt,
          lastRefreshedAt: null,
          refreshToken: 'dummyEncryptedRefreshToken',
          subRefreshToken: null,
          tenantId: '12345678-8ba0-42a4-8582-b234cb4a2089',
          updatedAt: result.dataValues.updatedAt,
          userId: '12345678-cb0b-48ad-857d-4b42a44ede13',
          userRole: 'a6a3edcd-00d9-427c-bf03-4ef0112ba16d',
          userStatus: 0
        }
      })
    })

    test('アクセスエラー: Tradeshift APIへのアクセスエラーの場合', async () => {
      // 準備
      // TradeShiftでのアクセスエラーを想定する
      const accessError = new Error('Access error mock')
      accessTradeshiftSpy.mockReturnValue(accessError)

      // 試験実施
      const result = await userController.create(accessToken, refreshToken)

      // 期待結果
      // Catchしたアクセスエラーが返ること
      expect(result).toEqual(accessError)
    })

    test('status 2のErrorログ: 暗号化処理でのエラー時', async () => {
      // 準備
      // Tradeshiftからの正常なユーザデータ(必要最小限)の取得を想定する
      accessTradeshiftSpy.mockReturnValue({
        CompanyAccountId: tenantId,
        Memberships: [
          {
            UserId: userId,
            Role: 'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'
          }
        ]
      })
      // リフレッシュトークンの暗号化でエラーが起こった場合を想定する
      const encryptError = new Error('Encrypt error mock')
      encryptSpy.mockImplementation(() => {
        throw encryptError
      })

      const contractInformationNewOrder = require('../../Application/orderTemplate/contractInformationnewOrder.json')

      // 試験実施
      const result = await userController.create(accessToken, refreshToken, contractInformationNewOrder)

      // 期待結果
      // Catchした暗号化エラーが返ること
      expect(result).toEqual(encryptError)
      // status 2のErrorログが呼ばれること
      expect(errorSpy).toHaveBeenCalledWith(
        { tenant: tenantId, user: userId, stack: encryptError.stack, status: 2 },
        encryptError.name
      )
    })

    test('status 0のErrorログ: DBエラー時(db.sequelize.transaction)', async () => {
      // 準備
      // Tradeshiftからの正常なユーザデータ(必要最小限)の取得を想定する
      accessTradeshiftSpy.mockReturnValue({
        CompanyAccountId: null,
        Memberships: [
          {
            UserId: userId,
            Role: 'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'
          }
        ]
      })
      // リフレッシュトークンの正常な暗号化ができた場合を想定する
      encryptSpy.mockReturnValue('dummyEncryptedRefreshToken')
      // DBエラーを想定する
      const dbError = new Error('DB error mock')
      db.transaction = jest.fn(async (callback) => {
        throw dbError
      })

      const contractInformationNewOrder = require('../../Application/orderTemplate/contractInformationnewOrder.json')

      // 試験実施
      const result = await userController.create(accessToken, refreshToken, contractInformationNewOrder)

      // 期待結果
      // CatchしたDBエラーが返ること
      expect(result).toEqual(dbError)
      // status 0のErrorログが呼ばれること
      expect(errorSpy).toHaveBeenCalledWith(
        { tenant: null, user: userId, stack: dbError.stack, status: 0 },
        dbError.name
      )
    })

    test('Contract.findOneの結果がnullの場合: DBエラー時(db.sequelize.transaction)', async () => {
      // 準備
      // Tradeshiftからの正常なユーザデータ(必要最小限)の取得を想定する
      accessTradeshiftSpy.mockReturnValue({
        CompanyAccountId: null,
        Memberships: [
          {
            UserId: userId,
            Role: 'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'
          }
        ]
      })

      // リフレッシュトークンの正常な暗号化ができた場合を想定する
      encryptSpy.mockReturnValue('dummyEncryptedRefreshToken')
      // findOneの結果を空のオブジェクトに想定する
      Contract.findOne = jest.fn((values) => {
        return {}
      })

      const contractInformationNewOrder = require('../../Application/orderTemplate/contractInformationnewOrder.json')

      // 試験実施
      const result = await userController.create(accessToken, refreshToken, contractInformationNewOrder)

      // 期待結果
      // 想定したデータが返ること
      expect(result).toEqual(null)
    })
    test('Contract.findOneでDBエラーの場合: DBエラー時(db.sequelize.transaction)', async () => {
      // 準備
      // Tradeshiftからの正常なユーザデータ(必要最小限)の取得を想定する
      accessTradeshiftSpy.mockReturnValue({
        CompanyAccountId: null,
        Memberships: [
          {
            UserId: userId,
            Role: 'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'
          }
        ]
      })
      // リフレッシュトークンの正常な暗号化ができた場合を想定する
      encryptSpy.mockReturnValue('dummyEncryptedRefreshToken')
      // DBエラーを想定する
      const dbError = new Error('DB error')
      Contract.findOne = jest.fn((values) => {
        throw dbError
      })

      const contractInformationNewOrder = require('../../Application/orderTemplate/contractInformationnewOrder.json')

      // 試験実施
      const result = await userController.create(accessToken, refreshToken, contractInformationNewOrder)

      // 期待結果
      // 想定したデータが返ること
      expect(result).toEqual(dbError)
    })
  })
  describe('delete', () => {
    test('正常(db.sequelize.transaction)', async () => {
      // 準備
      // DBからの正常なユーザデータの取得を想定する
      userFindOneSpy.mockReturnValue({
        userId: userId,
        tenantId: tenantId,
        userRole: 'a6a3edcd-00d9-427c-bf03-4ef0112ba16d',
        appVersion: '0.0.1',
        refreshToken: 'dummyRefreshToken',
        subRefreshToken: null,
        userStatus: 0,
        lastRefreshedAt: null,
        createdAt: '2021-01-25T08:45:49.803Z',
        updatedAt: '2021-01-25T08:45:49.803Z'
      })
      User.destroy = jest.fn((values) => {
        return 1
      })
      User.count = jest.fn((values) => {
        return 0
      })
      Tenant.destroy = jest.fn((values) => {
        return 1
      })
      // 試験実施
      const result = await userController.delete(userId)

      // 期待結果
      // DBから取得した情報がReturnされていること
      expect(result).toEqual(1)
    })

    test('異常：DBエラーの場合', async () => {
      // 準備

      // DBエラーを想定する
      const dbError = new Error('DB error')
      db.transaction = jest.fn(async (callback) => {
        throw dbError
      })

      // 試験実施
      await userController.delete(userId)

      // 期待結果
      // 想定したデータが返ること
      expect(errorSpy).toHaveBeenCalledWith(
        { user: userId, stack: dbError.stack, status: 0 },
        dbError.name
      )
    })
  })
})
