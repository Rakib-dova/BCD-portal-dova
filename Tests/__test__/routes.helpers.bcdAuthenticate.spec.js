'use strict'
jest.mock('../../Application/node_modules/express', () => {
  return require('jest-express')
})

const middleware = require('../../Application/routes/helpers/middleware')
const Request = require('jest-express').Request
const Response = require('jest-express').Response
const next = require('jest-express').Next
const tenantController = require('../../Application/controllers/tenantController.js')
const userController = require('../../Application/controllers/userController.js')
const contractController = require('../../Application/controllers/contractController.js')
const noticeHelper = require('../../Application/routes/helpers/notice')
const errorHelper = require('../../Application/routes/helpers/error')
const apiManager = require('../../Application/controllers/apiManager.js')
const constantsDefine = require('../../Application/constants')
const cStatus = constantsDefine.statusConstants.contractStatus
const cServiceTyp = constantsDefine.statusConstants.serviceType

let request, response, accessTradeshiftSpy, userFindOneSpy, tenantFindOneSpy, findContractsSpy

describe('helpers/middleware.bcdAuthenthicete()のテスト', () => {
  beforeEach(() => {
    request = new Request()
    response = new Response()
    userFindOneSpy = jest.spyOn(userController, 'findOne')
    tenantFindOneSpy = jest.spyOn(tenantController, 'findOne')
    findContractsSpy = jest.spyOn(contractController, 'findContractsBytenantId')
    accessTradeshiftSpy = jest.spyOn(apiManager, 'accessTradeshift')
  })
  afterEach(() => {
    request.resetMocked()
    response.resetMocked()
    next.mockReset()
    userFindOneSpy.mockRestore()
    tenantFindOneSpy.mockRestore()
    findContractsSpy.mockRestore()
    accessTradeshiftSpy.mockRestore()
  })

  test('正常: 管理者ユーザー', async () => {
    request.user = { userId: '12345678-cb0b-48ad-857d-4b42a44ede13' }
    request.session = {}
    userFindOneSpy.mockResolvedValue({
      dataValues: {
        userStatus: 0,
        userRole: constantsDefine.userRoleConstants.tenantManager
      }
    })
    findContractsSpy.mockResolvedValue([
      {
        serviceType: cServiceTyp.bcd,
        contractStatus: cStatus.onContract,
        deleteFlag: false
      }
    ])

    await middleware.bcdAuthenticate(request, response, next)

    expect(next).toHaveBeenCalledWith()
  })
  test('正常: 一般ユーザー', async () => {
    request.user = { userId: '12345678-cb0b-48ad-857d-4b42a44ede13' }
    request.session = {}
    userFindOneSpy.mockReturnValue({
      dataValues: {
        userStatus: 0,
        userRole: 'non tenantManager'
      }
    })
    findContractsSpy.mockResolvedValue([
      {
        serviceType: cServiceTyp.bcd,
        contractStatus: cStatus.onContract,
        deleteFlag: false
      }
    ])

    await middleware.bcdAuthenticate(request, response, next)

    expect(next).toHaveBeenCalledWith()
  })

  describe('OAuth2認証', () => {
    test('準正常: OAuth2認証を通ってない場合', async () => {
      request.user = null

      await middleware.bcdAuthenticate(request, response, next)

      // 303エラーでauthにリダイレクトされる
      expect(response.redirect).toHaveBeenCalledWith(303, '/auth')
      expect(response.getHeader('Location')).toEqual('/auth')
    })

    test('準正常: OAuth2認証を通ってない場合 (DELETE method)', async () => {
      request.user = null
      request.method = 'DELETE'

      await middleware.bcdAuthenticate(request, response, next)

      expect(response.send).toHaveBeenCalledWith({ result: 0 })
    })

    test('準正常: 不正なUserIDでアクセスしてきた場合の場合', async () => {
      request.user = { userId: 'dummy' }

      await middleware.bcdAuthenticate(request, response, next)

      expect(next).toHaveBeenCalledWith(errorHelper.create(500))
    })

    test('準正常: 不正なUserIDでアクセスしてきた場合の場合 (DELETE method)', async () => {
      request.user = { userId: 'dummy' }
      request.method = 'DELETE'

      await middleware.bcdAuthenticate(request, response, next)

      expect(response.send).toHaveBeenCalledWith({ result: 0 })
    })
  })

  describe('DBのユーザー情報確認', () => {
    test('準正常: レコードを取得できなかった場合', async () => {
      request.user = { userId: '12345678-cb0b-48ad-857d-4b42a44ede13' }
      userFindOneSpy.mockReturnValue(null)

      await middleware.bcdAuthenticate(request, response, next)

      expect(next).toHaveBeenCalledWith(errorHelper.create(500))
    })

    test('準正常: レコードを取得できなかった場合 (DELETE method)', async () => {
      request.user = { userId: '12345678-cb0b-48ad-857d-4b42a44ede13' }
      request.method = 'DELETE'
      userFindOneSpy.mockReturnValue(null)

      await middleware.bcdAuthenticate(request, response, next)

      expect(response.send).toHaveBeenCalledWith({ result: 0 })
    })

    test('準正常: DB Error になった場合', async () => {
      request.user = { userId: '12345678-cb0b-48ad-857d-4b42a44ede13' }
      userFindOneSpy.mockReturnValue(new Error('DB Error'))

      await middleware.bcdAuthenticate(request, response, next)

      expect(next).toHaveBeenCalledWith(errorHelper.create(500))
    })

    test('準正常: DB Error になった場合 (DELETE method)', async () => {
      request.user = { userId: '12345678-cb0b-48ad-857d-4b42a44ede13' }
      request.method = 'DELETE'
      userFindOneSpy.mockReturnValue(new Error('DB Error'))

      await middleware.bcdAuthenticate(request, response, next)

      expect(response.send).toHaveBeenCalledWith({ result: 0 })
    })

    test('準正常: userStatus が0以外の場合', async () => {
      request.user = { userId: '12345678-cb0b-48ad-857d-4b42a44ede13' }
      userFindOneSpy.mockReturnValue({
        dataValues: { userStatus: 'invalid' }
      })

      await middleware.bcdAuthenticate(request, response, next)

      expect(next).toHaveBeenCalledWith(errorHelper.create(404))
    })

    test('準正常: userStatus が0以外の場合 (DELETE method)', async () => {
      request.user = { userId: '12345678-cb0b-48ad-857d-4b42a44ede13' }
      request.method = 'DELETE'
      userFindOneSpy.mockReturnValue({
        dataValues: { userStatus: 'invalid' }
      })

      await middleware.bcdAuthenticate(request, response, next)

      expect(response.send).toHaveBeenCalledWith({ result: 0 })
    })
  })

  describe('DBの契約情報確認', () => {
    test('準正常: DBから契約情報を取得できなかった場合', async () => {
      request.user = { userId: '12345678-cb0b-48ad-857d-4b42a44ede13' }
      request.session = {}
      userFindOneSpy.mockResolvedValue({
        dataValues: {
          userStatus: 0,
          userRole: 'dummyRole'
        }
      })
      findContractsSpy.mockResolvedValue(null)

      await middleware.bcdAuthenticate(request, response, next)

      expect(next).toHaveBeenCalledWith(errorHelper.create(500))
    })
    test('準正常: DBから契約情報を取得できなかった場合 (DELETE method)', async () => {
      request.user = { userId: '12345678-cb0b-48ad-857d-4b42a44ede13' }
      request.method = 'DELETE'
      request.session = {}
      userFindOneSpy.mockResolvedValue({
        dataValues: {
          userStatus: 0,
          userRole: 'dummyRole'
        }
      })
      findContractsSpy.mockResolvedValue(null)

      await middleware.bcdAuthenticate(request, response, next)

      expect(response.send).toHaveBeenCalledWith({ result: 0 })
    })
    test('準正常: DB Error になった場合', async () => {
      request.user = { userId: '12345678-cb0b-48ad-857d-4b42a44ede13' }
      request.session = {}
      userFindOneSpy.mockResolvedValue({
        dataValues: {
          userStatus: 0,
          userRole: 'dummyRole'
        }
      })
      findContractsSpy.mockResolvedValue(new Error('DB Error'))

      await middleware.bcdAuthenticate(request, response, next)

      expect(next).toHaveBeenCalledWith(errorHelper.create(500))
    })
    test('準正常: DB Error になった場合 (DELETE method)', async () => {
      request.user = { userId: '12345678-cb0b-48ad-857d-4b42a44ede13' }
      request.method = 'DELETE'
      request.session = {}
      userFindOneSpy.mockResolvedValue({
        dataValues: {
          userStatus: 0,
          userRole: 'dummyRole'
        }
      })
      findContractsSpy.mockResolvedValue(new Error('DB Error'))

      await middleware.bcdAuthenticate(request, response, next)

      expect(response.send).toHaveBeenCalledWith({ result: 0 })
    })
    test('準正常: DB から取得した契約情報が0件の場合', async () => {
      request.user = { userId: '12345678-cb0b-48ad-857d-4b42a44ede13' }
      request.session = {}
      userFindOneSpy.mockResolvedValue({
        dataValues: {
          userStatus: 0,
          userRole: 'dummyRole'
        }
      })
      findContractsSpy.mockResolvedValue([])

      await middleware.bcdAuthenticate(request, response, next)

      expect(next).toHaveBeenCalledWith(errorHelper.create(500))
    })
    test('準正常: DB から取得した契約情報が0件の (DELETE method)', async () => {
      request.user = { userId: '12345678-cb0b-48ad-857d-4b42a44ede13' }
      request.method = 'DELETE'
      request.session = {}
      userFindOneSpy.mockResolvedValue({
        dataValues: {
          userStatus: 0,
          userRole: 'dummyRole'
        }
      })
      findContractsSpy.mockResolvedValue([])

      await middleware.bcdAuthenticate(request, response, next)

      expect(response.send).toHaveBeenCalledWith({ result: 0 })
    })

    test('準正常: DB からBCD契約情報が取得できなかった場合', async () => {
      request.user = { userId: '12345678-cb0b-48ad-857d-4b42a44ede13' }
      request.session = {}
      userFindOneSpy.mockResolvedValue({
        dataValues: {
          userStatus: 0,
          userRole: 'dummyRole'
        }
      })
      findContractsSpy.mockResolvedValue([{ serviceType: 'XXX', deleteFlag: false }])

      await middleware.bcdAuthenticate(request, response, next)

      expect(next).toHaveBeenCalledWith(errorHelper.create(500))
    })
    test('準正常: DB からBCD契約情報が取得できなかった場合 (DELETE method)', async () => {
      request.user = { userId: '12345678-cb0b-48ad-857d-4b42a44ede13' }
      request.method = 'DELETE'
      request.session = {}
      userFindOneSpy.mockResolvedValue({
        dataValues: {
          userStatus: 0,
          userRole: 'dummyRole'
        }
      })
      findContractsSpy.mockResolvedValue([{ serviceType: 'XXX', deleteFlag: false }])

      await middleware.bcdAuthenticate(request, response, next)

      expect(response.send).toHaveBeenCalledWith({ result: 0 })
    })
    test('準正常: 取得したBCD契約情報に contractStatus がなかった場合', async () => {
      request.user = { userId: '12345678-cb0b-48ad-857d-4b42a44ede13' }
      request.session = {}
      userFindOneSpy.mockResolvedValue({
        dataValues: {
          userStatus: 0,
          userRole: 'dummyRole'
        }
      })
      findContractsSpy.mockResolvedValue([{ serviceType: cServiceTyp.bcd, deleteFlag: false }])

      await middleware.bcdAuthenticate(request, response, next)

      expect(next).toHaveBeenCalledWith(errorHelper.create(500))
    })
    test('準正常: 取得したBCD契約情報に contractStatus がなかった場合 (DELETE method)', async () => {
      request.user = { userId: '12345678-cb0b-48ad-857d-4b42a44ede13' }
      request.method = 'DELETE'
      request.session = {}
      userFindOneSpy.mockResolvedValue({
        dataValues: {
          userStatus: 0,
          userRole: 'dummyRole'
        }
      })
      findContractsSpy.mockResolvedValue([{ serviceType: cServiceTyp.bcd, deleteFlag: false }])

      await middleware.bcdAuthenticate(request, response, next)

      expect(response.send).toHaveBeenCalledWith({ result: 0 })
    })

    test('準正常: BCD contractStatus が解約着手待ち(30)の場合', async () => {
      request.user = { userId: '12345678-cb0b-48ad-857d-4b42a44ede13' }
      request.session = {}
      userFindOneSpy.mockResolvedValue({
        dataValues: {
          userStatus: 0,
          userRole: 'dummyRole'
        }
      })
      findContractsSpy.mockResolvedValue([
        {
          serviceType: cServiceTyp.bcd,
          contractStatus: cStatus.cancellationOrder,
          deleteFlag: false
        }
      ])

      await middleware.bcdAuthenticate(request, response, next)

      expect(next).toHaveBeenCalledWith(noticeHelper.create('cancelprocedure'))
    })
    test('準正常: BCD contractStatus が解約着手待ち(30)の場合 (DELETE method)', async () => {
      request.user = { userId: '12345678-cb0b-48ad-857d-4b42a44ede13' }
      request.method = 'DELETE'
      request.session = {}
      userFindOneSpy.mockResolvedValue({
        dataValues: {
          userStatus: 0,
          userRole: 'dummyRole'
        }
      })
      findContractsSpy.mockResolvedValue([
        {
          serviceType: cServiceTyp.bcd,
          contractStatus: cStatus.cancellationOrder,
          deleteFlag: false
        }
      ])

      await middleware.bcdAuthenticate(request, response, next)

      expect(response.send).toHaveBeenCalledWith({ result: 0 })
    })
    test('準正常: BCD contractStatus が解約対応中(31)の場合', async () => {
      request.user = { userId: '12345678-cb0b-48ad-857d-4b42a44ede13' }
      request.session = {}
      userFindOneSpy.mockResolvedValue({
        dataValues: {
          userStatus: 0,
          userRole: 'dummyRole'
        }
      })
      findContractsSpy.mockResolvedValue([
        {
          serviceType: cServiceTyp.bcd,
          contractStatus: cStatus.cancellationReceive,
          deleteFlag: false
        }
      ])

      await middleware.bcdAuthenticate(request, response, next)

      expect(next).toHaveBeenCalledWith(noticeHelper.create('cancelprocedure'))
    })
    test('準正常: BCD contractStatus が解約対応中(31)の場合 (DELETE method)', async () => {
      request.user = { userId: '12345678-cb0b-48ad-857d-4b42a44ede13' }
      request.method = 'DELETE'
      request.session = {}
      userFindOneSpy.mockResolvedValue({
        dataValues: {
          userStatus: 0,
          userRole: 'dummyRole'
        }
      })
      findContractsSpy.mockResolvedValue([
        {
          serviceType: cServiceTyp.bcd,
          contractStatus: cStatus.cancellationReceive,
          deleteFlag: false
        }
      ])

      await middleware.bcdAuthenticate(request, response, next)

      expect(response.send).toHaveBeenCalledWith({ result: 0 })
    })
  })
})
