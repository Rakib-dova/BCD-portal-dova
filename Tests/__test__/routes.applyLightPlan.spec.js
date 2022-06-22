'use strict'
jest.mock('../../Application/lib/logger')
jest.mock('../../Application/node_modules/express', () => {
  return require('jest-express')
})

const applyLightPlan = require('../../Application/routes/applyLightPlan')
const applyOrderController = require('../../Application/controllers/applyOrderController.js')
const contractController = require('../../Application/controllers/contractController.js')
const channelDepartmentController = require('../../Application/controllers/channelDepartmentController.js')
const Request = require('jest-express').Request
const Response = require('jest-express').Response
const next = require('jest-express').Next
const noticeHelper = require('../../Application/routes/helpers/notice')
const errorHelper = require('../../Application/routes/helpers/error')
const middleware = require('../../Application/routes/helpers/middleware')
const constants = require('../../Application/constants').statusConstants

// 契約ステータス
const contractStatuses = constants.contractStatuses
// サービス種別(lightPlan)
const serviceTypesLightPlan = constants.serviceTypes.lightPlan

const tenantId = '12345678-bdac-4195-80b9-1ea64b8cb70c'

const user = {
  tenantId: tenantId,
  userId: '976d46d7-cb0b-48ad-857d-4b42a44ede13',
  accessToken: 'dummyAccessToken',
  refreshToken: 'dummyRefreshToken'
}

const dbError = new Error('DB error')

// CSRF対策
const dummyToken = 'testCsrfToken'

const inputData = {
  commonCustomerId: '11111111111',
  contractorName: '契約者名',
  contractorKanaName: 'カナ',
  postalNumber: '1000004',
  contractAddressVal: '東京都千代田区大手町一丁目',
  banch1: '１番',
  tatemono1: '建物',
  contactPersonName: '連絡先担当者名',
  contactPhoneNumber: '000-0000-0000',
  contactMail: 'aaaaaa@aaa.com',
  campaignCode: '00000',
  salesPersonName: '販売担当者名',
  password: 'Aa11111111',
  passwordConfirm: 'Aa11111111',
  billMailingPostalNumber: '1000004',
  billMailingAddress: '東京都千代田区大手町一丁目',
  billMailingAddressBanchi1: '請求書送付先番地等',
  billMailingAddressBuilding1: '請求書送付先建物等',
  billMailingKanaName: '請求書送付先宛名',
  billMailingName: 'カナ',
  billMailingPersonName: '請求に関する連絡先',
  billMailingPhoneNumber: '000-0000-0000',
  billMailingMailAddress: 'aaa@aaa.com',
  openingDate: '2022-06-16',
  salesChannelCode: '000000',
  salesChannelName: '販売チャネル名',
  salesChannelDeptName: '部課名',
  salesChannelEmplyeeCode: '11111111',
  salesChannelPersonName: '担当者名',
  salesChannelDeptType: '{"code":"01","name":"Com第一営業本部"}',
  salesChannelPhoneNumber: '000-0000-0000',
  salesChannelMailAddress: 'aaa@aaa.com'
}

const onlyRequiredData = {
  commonCustomerId: '11111111111',
  contractorName: '契約者名',
  contractorKanaName: 'カナ',
  postalNumber: '1000004',
  contractAddressVal: '東京都千代田区大手町一丁目',
  banch1: '１番',
  tatemono1: '',
  contactPersonName: '連絡先担当者名',
  contactPhoneNumber: '000-0000-0000',
  contactMail: 'aaaaaa@aaa.com',
  campaignCode: '',
  salesPersonName: '',
  password: 'Aa11111111',
  passwordConfirm: 'Aa11111111',
  billMailingPostalNumber: '1000004',
  billMailingAddress: '東京都千代田区大手町一丁目',
  billMailingAddressBanchi1: '請求書送付先番地等',
  billMailingAddressBuilding1: '',
  billMailingKanaName: '請求書送付先宛名',
  billMailingName: 'カナ',
  billMailingPersonName: '請求に関する連絡先',
  billMailingPhoneNumber: '000-0000-0000',
  billMailingMailAddress: 'aaa@aaa.com',
  openingDate: '',
  salesChannelCode: '',
  salesChannelName: '',
  salesChannelDeptName: '',
  salesChannelEmplyeeCode: '',
  salesChannelPersonName: '',
  salesChannelDeptType: '',
  salesChannelPhoneNumber: '',
  salesChannelMailAddress: ''
}
const salesChannelDept = { code: '001', name: 'Com第一営業本部' }

const salesChannelDeptList = [
  { code: '001', name: 'Com第一営業本部' },
  { code: '002', name: 'Com第二営業本部' },
  { code: '003', name: 'Com第三営業本部' }
]

let request, response, applyNewOrderSpy, findContractsSpy, findAllDept, findOneDept

describe('applyLightPlanのテスト', () => {
  beforeEach(() => {
    request = new Request()
    response = new Response()

    // 使っている内部モジュールの関数をspyOn
    applyNewOrderSpy = jest.spyOn(applyOrderController, 'applyNewOrder')
    findContractsSpy = jest.spyOn(contractController, 'findContracts')
    findAllDept = jest.spyOn(channelDepartmentController, 'findAll')
    findOneDept = jest.spyOn(channelDepartmentController, 'findOne')
    request.csrfToken = jest.fn(() => {
      return dummyToken
    })
    request.flash = jest.fn()
  })

  afterEach(() => {
    request.resetMocked()
    response.resetMocked()
    next.mockReset()
    applyNewOrderSpy.mockRestore()
    findContractsSpy.mockRestore()
    findAllDept.mockRestore()
    findOneDept.mockRestore()
  })

  describe('ルーティング', () => {
    test('applyLightPlanのルーティングを確認', async () => {
      expect(applyLightPlan.router.get).toBeCalledWith(
        '/',
        middleware.isAuthenticated,
        middleware.isTenantRegistered,
        middleware.isUserRegistered,
        middleware.isOnOrChangeContract,
        expect.any(Function),
        applyLightPlan.checkContractStatus,
        applyLightPlan.showLightPlan
      )

      expect(applyLightPlan.router.post).toBeCalledWith(
        '/register',
        middleware.isAuthenticated,
        middleware.isTenantRegistered,
        middleware.isUserRegistered,
        middleware.isOnOrChangeContract,
        expect.any(Function),
        applyLightPlan.checkContractStatus,
        applyLightPlan.registerLightPlan
      )
    })
  })

  describe('checkContractStatus', () => {
    test('正常: ライトプラン契約したことがない', async () => {
      // 準備
      findContractsSpy.mockReturnValue([])

      // request.userに正常値を想定する
      request.user = user

      // 試験実施
      await applyLightPlan.checkContractStatus(request, response, next)

      // 期待結果
      expect(next).toHaveBeenCalledWith()
    })

    test('正常: 申込中', async () => {
      // 準備
      findContractsSpy.mockReturnValue([
        {
          contractId: '87654321-cb0b-48ad-857d-4b42a44ede13',
          tenantId: tenantId,
          serviceType: serviceTypesLightPlan,
          numberN: '',
          contractStatus: contractStatuses.newContractBeforeCompletion,
          deleteFlag: false,
          createdAt: '2022-06-15 18:26:17',
          updatedAt: '2022-06-15 18:26:17'
        }
      ])

      // request.userに正常値を想定する
      request.user = user

      // 試験実施
      await applyLightPlan.checkContractStatus(request, response, next)

      // 期待結果
      expect(next).toHaveBeenCalledWith(noticeHelper.create('lightPlanRegistering'))
    })

    test('正常: 契約中', async () => {
      // 準備
      findContractsSpy.mockReturnValue([
        {
          contractId: '87654321-cb0b-48ad-857d-4b42a44ede13',
          tenantId: tenantId,
          serviceType: serviceTypesLightPlan,
          numberN: '1234',
          contractStatus: contractStatuses.onContract,
          deleteFlag: false,
          createdAt: '2022-06-15 18:26:17',
          updatedAt: '2022-06-15 18:26:17'
        }
      ])

      // request.userに正常値を想定する
      request.user = user

      // 試験実施
      await applyLightPlan.checkContractStatus(request, response, next)

      // 期待結果
      expect(next).toHaveBeenCalledWith(noticeHelper.create('lightPlanRegistered'))
    })

    test('準正常: DBエラー時', async () => {
      // 準備
      findContractsSpy.mockReturnValue(dbError)

      // request.userに正常値を想定する
      request.user = user

      // 試験実施
      await applyLightPlan.checkContractStatus(request, response, next)

      // 期待結果
      expect(next).toHaveBeenCalledWith(errorHelper.create(500))
    })
  })

  describe('showLightPlan', () => {
    test('正常', async () => {
      // 準備
      findAllDept.mockReturnValue(salesChannelDeptList)

      // request.userに正常値を想定する
      request.user = user

      // 試験実施
      await applyLightPlan.showLightPlan(request, response, next)

      // 期待結果
      expect(response.render).toHaveBeenCalledWith('lightPlan', {
        title: 'ライトプラン申込',
        salesChannelDeptList: salesChannelDeptList,
        csrfToken: dummyToken
      })
    })

    test('準正常: DBエラー時', async () => {
      // 準備
      findAllDept.mockImplementation(async () => {
        return dbError
      })

      // requestに正常値を想定する
      request.user = user

      // 試験実施
      await applyLightPlan.showLightPlan(request, response, next)

      // 期待結果
      expect(next).toHaveBeenCalledWith(errorHelper.create(500))
    })
  })

  describe('registerLightPlan', () => {
    test('正常 全入力', async () => {
      // 準備
      findOneDept.mockReturnValue(salesChannelDept)
      applyNewOrderSpy.mockImplementation(async (tenantId, serviceType, orderData) => {
        expect(tenantId).toEqual(tenantId)
        expect(serviceType).toEqual(serviceTypesLightPlan)
        expect(orderData).toBeDefined()
      })

      // requestに正常値を想定する
      request.user = user
      request.body = inputData

      // 試験実施
      await applyLightPlan.registerLightPlan(request, response, next)

      // 期待結果
      expect(request.flash).toHaveBeenCalledWith('info', 'ライトプラン申込が完了いたしました。')
      expect(response.redirect).toHaveBeenCalledWith(303, '/portal')
    })

    test('正常 必須のみ入力', async () => {
      // 準備
      findOneDept.mockReturnValue(salesChannelDept)
      applyNewOrderSpy.mockImplementation(async (tenantId, serviceType, orderData) => {
        expect(tenantId).toEqual(tenantId)
        expect(serviceType).toEqual(serviceTypesLightPlan)
        expect(orderData).toBeDefined()
      })

      // requestに正常値を想定する
      request.user = user
      request.body = onlyRequiredData

      // 試験実施
      await applyLightPlan.registerLightPlan(request, response, next)

      // 期待結果
      expect(request.flash).toHaveBeenCalledWith('info', 'ライトプラン申込が完了いたしました。')
      expect(response.redirect).toHaveBeenCalledWith(303, '/portal')
    })

    test('準正常: バリデーションエラー時', async () => {
      // 準備
      applyNewOrderSpy.mockImplementation(async (tenantId, serviceType, orderData) => {
        expect(tenantId).toEqual(tenantId)
        expect(serviceType).toEqual(serviceTypesLightPlan)
        expect(orderData).toBeDefined()
      })

      // requestに正常値を想定する
      request.user = user
      request.body = {}

      // 試験実施
      await applyLightPlan.registerLightPlan(request, response, next)

      // 期待結果
      expect(next).toHaveBeenCalledWith(errorHelper.create(404))
    })

    test('準正常: DBエラー時-組織区分取得', async () => {
      // 準備
      findOneDept.mockImplementation(async () => {
        return dbError
      })

      // requestに正常値を想定する
      request.user = user
      request.body = inputData

      // 試験実施
      await applyLightPlan.registerLightPlan(request, response, next)

      // 期待結果
      expect(next).toHaveBeenCalledWith(errorHelper.create(500))
    })

    test('準正常: DBエラー時-契約情報登録', async () => {
      // 準備
      findOneDept.mockReturnValue(salesChannelDept)
      applyNewOrderSpy.mockImplementation(async (tenantId, serviceType, orderData) => {
        expect(tenantId).toEqual(tenantId)
        expect(serviceType).toEqual(serviceTypesLightPlan)
        expect(orderData).toBeDefined()
        return dbError
      })

      // requestに正常値を想定する
      request.user = user
      request.body = inputData

      // 試験実施
      await applyLightPlan.registerLightPlan(request, response, next)

      // 期待結果
      expect(next).toHaveBeenCalledWith(errorHelper.create(500))
    })
  })
})
