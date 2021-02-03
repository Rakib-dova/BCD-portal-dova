'use strict'

jest.mock('../../Application/models')
jest.mock('../../Application/controllers/apiManager')
jest.mock('../../Application/lib/logger')
jest.mock('../../Application/lib/tokenenc')

const userController = require('../../Application/controllers/userController')
const db = require('../../Application/models').sequelize
// const Tenant = require('../../Application/models').Tenant
const User = require('../../Application/models').User
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
  //  tenantFindOrCreateSpy,
  //  userFindOrCreateSpy,
  transactionSpy,
  encryptSpy
describe('userControllerのテスト', () => {
  beforeEach(() => {
    accessTradeshiftSpy = jest.spyOn(apiManager, 'accessTradeshift')
    //    tenantFindOrCreateSpy = jest.spyOn(Tenant, 'findOrCreate')
    //    userFindOrCreateSpy = jest.spyOn(User, 'findOrCreate')
    userFindOneSpy = jest.spyOn(User, 'findOne')
    errorSpy = jest.spyOn(logger, 'error')
    transactionSpy = jest.spyOn(db, 'transaction')
    encryptSpy = jest.spyOn(tokenenc, 'encrypt')
  })
  afterEach(() => {
    accessTradeshiftSpy.mockRestore()
    //    tenantFindOrCreateSpy.mockRestore()
    //    userFindOrCreateSpy.mockRestore()
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
      // リフレッシュトークンの正常な暗号化ができた場合を想定する
      encryptSpy.mockReturnValue('dummyEncryptedRefreshToken')
      // DBからの正常なユーザデータの取得を想定する
      transactionSpy.mockReturnValue([
        {
          dataValues: {
            userId: userId,
            tenantId: tenantId,
            userRole: 'a6a3edcd-00d9-427c-bf03-4ef0112ba16d',
            appVersion: '0.0.1',
            refreshToken: 'dummyRefreshToken',
            userStatus: 0
          }
        },
        true
      ])

      // 試験実施
      const result = await userController.create(accessToken, refreshToken)

      // 期待結果
      // DBから取得した情報がReturnされていること
      expect(result).toEqual([
        {
          dataValues: {
            userId: userId,
            tenantId: tenantId,
            userRole: 'a6a3edcd-00d9-427c-bf03-4ef0112ba16d',
            appVersion: '0.0.1',
            refreshToken: 'dummyRefreshToken',
            userStatus: 0
          }
        },
        true
      ])
    })

    //    test('正常(Tenant.findOrCreate,User.findOrCreate)', async () => {
    //      // 準備
    //      // Tradeshiftからの正常なユーザデータの取得を想定する
    //      accessTradeshiftSpy.mockReturnValue({
    //        Id: userId,
    //        CompanyAccountId: tenantId,
    //        CompanyName: 'UnitTestCompany',
    //        Username: 'dummy@example.com',
    //        Language: 'ja',
    //        TimeZone: 'Asia/Tokyo',
    //        Memberships: [
    //          {
    //            UserId: userId,
    //            GroupId: tenantId,
    //            Role: 'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'
    //          }
    //        ],
    //        Created: '2021-01-25T08:45:49.803Z',
    //        State: 'ACTIVE',
    //        Type: 'PERSON',
    //        FirstName: 'Yamada',
    //        LastName: 'Taro',
    //        Visible: true
    //      })
    //      // リフレッシュトークンの正常な暗号化ができた場合を想定する
    //      encryptSpy.mockReturnValue('dummyEncryptedRefreshToken')
    //      // DBからの正常なテナントデータの取得を想定する
    //      tenantFindOrCreateSpy.mockReturnValue([
    //        {
    //          dataValues: {
    //            tenantId: tenantId,
    //            registeredBy: userId,
    //            customerId: null,
    //            createdAt: '2021-01-25T10:15:15.035Z',
    //            updatedAt: '2021-01-25T10:15:15.035Z'
    //          }
    //        },
    //        true
    //      ])
    //      // DBからの正常なユーザデータの取得を想定する
    //      userFindOrCreateSpy.mockReturnValue([
    //        {
    //          dataValues: {
    //            userId: userId,
    //            tenantId: tenantId,
    //            userRole: 'a6a3edcd-00d9-427c-bf03-4ef0112ba16d',
    //            appVersion: '0.0.1',
    //            refreshToken: 'dummyRefreshToken',
    //            userStatus: 0
    //          }
    //        },
    //        true
    //      ])
    //
    //      // 試験実施
    //      const result = await userController.create(accessToken, refreshToken)
    //
    //      // 期待結果
    //      // DBから取得したユーザー情報がReturnされていること
    //      expect(result).toEqual([
    //        {
    //          dataValues: {
    //            userId: userId,
    //            tenantId: tenantId,
    //            userRole: 'a6a3edcd-00d9-427c-bf03-4ef0112ba16d',
    //            appVersion: '0.0.1',
    //            refreshToken: 'dummyRefreshToken',
    //            userStatus: 0
    //          }
    //        },
    //        true
    //      ])
    //    })

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

      // 試験実施
      const result = await userController.create(accessToken, refreshToken)

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
        CompanyAccountId: tenantId,
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
      transactionSpy.mockImplementation(() => {
        throw dbError
      })

      // 試験実施
      const result = await userController.create(accessToken, refreshToken)

      // 期待結果
      // CatchしたDBエラーが返ること
      expect(result).toEqual(dbError)
      // status 0のErrorログが呼ばれること
      expect(errorSpy).toHaveBeenCalledWith(
        { tenant: tenantId, user: userId, stack: dbError.stack, status: 0 },
        dbError.name
      )
    })

    //    test('status 0のErrorログ: DBエラー時(Tenant.findOrCreate)', async () => {
    //      // 準備
    //      // Tradeshiftからの正常なユーザデータ(必要最小限)の取得を想定する
    //      accessTradeshiftSpy.mockReturnValue({
    //        CompanyAccountId: tenantId,
    //        Memberships: [
    //          {
    //            UserId: userId,
    //            Role: 'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'
    //          }
    //        ]
    //      })
    //      // リフレッシュトークンの正常な暗号化ができた場合を想定する
    //      encryptSpy.mockReturnValue('dummyEncryptedRefreshToken')
    //      // DBからのテナントデータ取得時のエラーを想定する
    //      const dbError = new Error('DB error mock')
    //      tenantFindOrCreateSpy.mockImplementation(() => {
    //        throw dbError
    //      })
    //
    //      // 試験実施
    //      const result = await userController.create(accessToken, refreshToken)
    //
    //      // 期待結果
    //      // CatchしたDBエラーが返ること
    //      expect(result).toEqual(dbError)
    //      // status 0のErrorログが呼ばれること
    //      expect(errorSpy).toHaveBeenCalledWith(
    //        { tenant: tenantId, user: userId, stack: dbError.stack, status: 0 },
    //        dbError.name
    //      )
    //    })
    //
    //    test('status 0のErrorログ: DBエラー時(User.findOrCreate)', async () => {
    //      // 準備
    //      // Tradeshiftからの正常なユーザデータ(必要最小限)の取得を想定する
    //      accessTradeshiftSpy.mockReturnValue({
    //        CompanyAccountId: tenantId,
    //        Memberships: [
    //          {
    //            UserId: userId,
    //            Role: 'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'
    //          }
    //        ]
    //      })
    //      // リフレッシュトークンの正常な暗号化ができた場合を想定する
    //      encryptSpy.mockReturnValue('dummyEncryptedRefreshToken')
    //      // DBからの正常なテナントデータの取得を想定する
    //      tenantFindOrCreateSpy.mockReturnValue([
    //        {
    //          dataValues: {
    //            tenantId: tenantId,
    //            registeredBy: userId,
    //            customerId: null,
    //            createdAt: '2021-01-25T10:15:15.035Z',
    //            updatedAt: '2021-01-25T10:15:15.035Z'
    //          }
    //        },
    //        true
    //      ])
    //      // DBからのユーザデータ取得時のエラーを想定する
    //      const dbError = new Error('DB error mock')
    //      userFindOrCreateSpy.mockImplementation(() => {
    //        throw dbError
    //      })
    //
    //      // 試験実施
    //      const result = await userController.create(accessToken, refreshToken)
    //
    //      // 期待結果
    //      // CatchしたDBエラーが返ること
    //      expect(result).toEqual(dbError)
    //      // status 0のErrorログが呼ばれること
    //      expect(errorSpy).toHaveBeenCalledWith(
    //        { tenant: tenantId, user: userId, stack: dbError.stack, status: 0 },
    //        dbError.name
    //      )
    //    })
  })
})
