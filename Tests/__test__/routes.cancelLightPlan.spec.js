'use strict'
jest.mock('../../Application/node_modules/express', () => {
  return require('jest-express')
})
jest.mock('../../Application/controllers/applyOrderController.js')

const cancelLightPlan = require('../../Application/routes/cancelLightPlan')
const applyOrderController = require('../../Application/controllers/applyOrderController.js')
const contractController = require('../../Application/controllers/contractController.js')
const Request = require('jest-express').Request
const Response = require('jest-express').Response
const next = require('jest-express').Next
const noticeHelper = require('../../Application/routes/helpers/notice')
const errorHelper = require('../../Application/routes/helpers/error')
const middleware = require('../../Application/routes/helpers/middleware')
const logger = require('../../Application/lib/logger.js')
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
const dummyTokne = 'testCsrfToken'

const inputData = {
  salesChannelCode: '000000',
  salesChannelName: '販売チャネル名',
  salesChannelDeptName: '部課名',
  salesChannelEmplyeeCode: '11111111',
  salesChannelPersonName: '担当者名',
  salesChannelDeptType: 'Com第一営業本部',
  salesChannelPhoneNumber: '000-0000-0000',
  salesChannelMailAddress: 'aaa@aaa.com'
}

const onContractContracts = [
  {
    contractId: '87654321-cb0b-48ad-857d-4b42a44ede13',
    tenantId: tenantId,
    serviceType: serviceTypesLightPlan,
    numberN: '123',
    contractStatus: contractStatuses.onContract,
    deleteFlag: false,
    createdAt: '2022-06-15 18:26:17',
    updatedAt: '2022-06-15 18:26:17'
  }
]

let request, response, infoSpy, cancelOrderSpy, findContractsSpy

describe('cancelLightPlanのテスト', () => {
  beforeEach(() => {
    request = new Request()
    response = new Response()

    // 使っている内部モジュールの関数をspyOn
    cancelOrderSpy = jest.spyOn(applyOrderController, 'cancelOrder')
    findContractsSpy = jest.spyOn(contractController, 'findContracts')
    infoSpy = jest.spyOn(logger, 'info')
    request.csrfToken = jest.fn(() => {
      return dummyTokne
    })
    request.flash = jest.fn()
  })
  afterEach(() => {
    request.resetMocked()
    response.resetMocked()
    next.mockReset()
    cancelOrderSpy.mockRestore()
    findContractsSpy.mockRestore()
    infoSpy.mockRestore()
  })

  describe('ルーティング', () => {
    test('cancelLightPlanのルーティングを確認', async () => {
      expect(cancelLightPlan.router.get).toBeCalledWith(
        '/',
        middleware.isAuthenticated,
        middleware.isTenantRegistered,
        middleware.isUserRegistered,
        expect.any(Function),
        cancelLightPlan.showCancelLightPlan
      )

      expect(cancelLightPlan.router.post).toBeCalledWith(
        '/register',
        middleware.isAuthenticated,
        middleware.isTenantRegistered,
        middleware.isUserRegistered,
        expect.any(Function),
        cancelLightPlan.cancelLightPlan
      )
    })
  })

  describe('checkContractStatus', () => {
    test('正常: 契約中', async () => {
      // 準備
      findContractsSpy.mockReturnValue(onContractContracts)

      // request.userに正常値を想定する
      request.user = user

      // 試験実施
      const result = await cancelLightPlan.checkContractStatus(request, response, next)

      // 期待結果
      expect(result).toEqual(onContractContracts)
    })

    test('正常: 申し込み前', async () => {
      // 準備
      findContractsSpy.mockReturnValue([])

      // request.userに正常値を想定する
      request.user = user

      // 試験実施
      await cancelLightPlan.checkContractStatus(request, response, next)

      // 期待結果
      expect(next).toHaveBeenCalledWith(noticeHelper.create('lightPlanUnregistered'))
    })

    test('正常: 申し込み～申し込み竣工完了まで', async () => {
      // 準備
      const contracts = [
        {
          contractId: '87654321-cb0b-48ad-857d-4b42a44ede13',
          tenantId: tenantId,
          serviceType: serviceTypesLightPlan,
          numberN: '123',
          contractStatus: contractStatuses.newContractBeforeCompletion,
          deleteFlag: false,
          createdAt: '2022-06-15 18:26:17',
          updatedAt: '2022-06-15 18:26:17'
        }
      ]
      findContractsSpy.mockReturnValue(contracts)

      // request.userに正常値を想定する
      request.user = user

      // 試験実施
      await cancelLightPlan.checkContractStatus(request, response, next)

      // 期待結果
      expect(next).toHaveBeenCalledWith(noticeHelper.create('lightPlanUnregistered'))
    })

    test('正常: 解約完了', async () => {
      // 準備
      const contracts = [
        {
          contractId: '87654321-cb0b-48ad-857d-4b42a44ede13',
          tenantId: tenantId,
          serviceType: serviceTypesLightPlan,
          numberN: '123',
          contractStatus: contractStatuses.canceledContract,
          deleteFlag: false,
          createdAt: '2022-06-15 18:26:17',
          updatedAt: '2022-06-15 18:26:17'
        }
      ]
      findContractsSpy.mockReturnValue(contracts)

      // request.userに正常値を想定する
      request.user = user

      // 試験実施
      await cancelLightPlan.checkContractStatus(request, response, next)

      // 期待結果
      expect(next).toHaveBeenCalledWith(noticeHelper.create('lightPlanUnregistered'))
    })

    test('正常: 解約中(解約着手待ち～解約完了竣工まで)', async () => {
      // 準備
      const contracts = [
        {
          contractId: '87654321-cb0b-48ad-857d-4b42a44ede13',
          tenantId: tenantId,
          serviceType: serviceTypesLightPlan,
          numberN: '123',
          contractStatus: contractStatuses.cancellationReceive,
          deleteFlag: false,
          createdAt: '2022-06-15 18:26:17',
          updatedAt: '2022-06-15 18:26:17'
        }
      ]
      findContractsSpy.mockReturnValue(contracts)

      // request.userに正常値を想定する
      request.user = user

      // 試験実施
      await cancelLightPlan.checkContractStatus(request, response, next)

      // 期待結果
      expect(next).toHaveBeenCalledWith(noticeHelper.create('lightPlanCanceling'))
    })

    test('準正常: DBエラー時', async () => {
      // 準備
      findContractsSpy.mockReturnValue(dbError)

      // request.userに正常値を想定する
      request.user = user

      // 試験実施
      await cancelLightPlan.checkContractStatus(request, response, next)

      // 期待結果
      expect(next).toHaveBeenCalledWith(errorHelper.create(500))
    })
  })

  describe('showCancelLightPlan', () => {
    test('正常', async () => {
      // 準備
      findContractsSpy.mockReturnValue(onContractContracts)

      // request.userに正常値を想定する
      request.user = user

      // 試験実施
      await cancelLightPlan.showCancelLightPlan(request, response, next)

      // 期待結果
      expect(response.render).toHaveBeenCalledWith('cancelLightPlan', {
        title: 'ライトプラン解約',
        numberN: '123',
        salesChannelDeptList: [
          { code: '001', name: 'Com第一営業本部' },
          { code: '002', name: 'Com第二営業本部' },
          { code: '003', name: 'Com第三営業本部' }
        ],
        csrfToken: dummyTokne
      })
    })
  })

  describe('cancelLightPlan', () => {
    test('正常', async () => {
      // 準備
      findContractsSpy.mockReturnValue(onContractContracts)
      cancelOrderSpy.mockImplementation(async (tenantId, serviceType, orderData) => {
        expect(tenantId).toEqual(tenantId)
        expect(serviceType).toEqual(serviceTypesLightPlan)
        expect(orderData).toBeDefined()
      })

      // requestに正常値を想定する
      request.user = user
      request.body = inputData

      // 試験実施
      await cancelLightPlan.cancelLightPlan(request, response, next)

      // 期待結果
      expect(request.flash).toHaveBeenCalledWith('info', 'ライトプラン解約が完了いたしました。')
      expect(response.redirect).toHaveBeenCalledWith(303, '/portal')
    })

    test('準正常: DBエラー時', async () => {
      // 準備
      findContractsSpy.mockReturnValue(onContractContracts)
      cancelOrderSpy.mockImplementation(async (tenantId, serviceType, orderData) => {
        expect(tenantId).toEqual(tenantId)
        expect(serviceType).toEqual(serviceTypesLightPlan)
        expect(orderData).toBeDefined()
        return dbError
      })

      // requestに正常値を想定する
      request.user = user
      request.body = inputData

      // 試験実施
      await cancelLightPlan.cancelLightPlan(request, response, next)

      // 期待結果
      expect(next).toHaveBeenCalledWith(errorHelper.create(500))
    })
  })
})
