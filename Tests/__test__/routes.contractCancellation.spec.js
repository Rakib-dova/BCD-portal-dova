'use strict'
jest.mock('../../Application/lib/logger')
jest.mock('../../Application/node_modules/express', () => {
  return require('jest-express')
})

const contractCancellation = require('../../Application/routes/contractCancellation')
const applyOrderController = require('../../Application/controllers/applyOrderController.js')
const contractController = require('../../Application/controllers/contractController.js')
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

let request, response, cancelOrderSpy, findContractsSpy

describe('contractCancellationのテスト', () => {
  beforeEach(() => {
    request = new Request()
    response = new Response()

    // 使っている内部モジュールの関数をspyOn
    cancelOrderSpy = jest.spyOn(applyOrderController, 'cancelOrder')
    findContractsSpy = jest.spyOn(contractController, 'findContracts')
    request.csrfToken = jest.fn(() => {
      return dummyToken
    })
    request.flash = jest.fn()
    request.user = user
  })

  afterEach(() => {
    request.resetMocked()
    response.resetMocked()
    next.mockReset()
    cancelOrderSpy.mockRestore()
    findContractsSpy.mockRestore()
  })

  describe('ルーティング', () => {
    test('contractCancellationのルーティングを確認', async () => {
      expect(contractCancellation.router.get).toBeCalledWith(
        '/',
        expect.any(Function),
        middleware.bcdAuthenticate,
        middleware.isTenantManager,
        middleware.isOnOrChangeContract,
        contractCancellation.showContractCancel
      )

      expect(contractCancellation.router.post).toBeCalledWith(
        '/register',
        expect.any(Function),
        middleware.bcdAuthenticate,
        middleware.isTenantManager,
        middleware.isOnOrChangeContract,
        contractCancellation.contractCancel
      )
    })
  })

  describe('checkContractStatus', () => {
    test('正常: 契約中', async () => {
      // 準備
      findContractsSpy.mockReturnValue(onContractContracts)

      // 試験実施
      const result = await contractCancellation.checkContractStatus(tenantId, next)

      // 期待結果
      expect(result).toEqual(onContractContracts)
    })

    test('正常: 申し込み前', async () => {
      // 準備
      findContractsSpy.mockReturnValue([])

      // 試験実施
      await contractCancellation.checkContractStatus(tenantId, next)

      // 期待結果
      expect(next).toHaveBeenCalledWith(noticeHelper.create('standardUnregistered'))
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

      // 試験実施
      await contractCancellation.checkContractStatus(tenantId, next)

      // 期待結果
      expect(next).toHaveBeenCalledWith(noticeHelper.create('standardUnregistered'))
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

      // 試験実施
      await contractCancellation.checkContractStatus(tenantId, next)

      // 期待結果
      expect(next).toHaveBeenCalledWith(noticeHelper.create('standardCanceling'))
    })

    test('準正常: DBエラー時', async () => {
      // 準備
      findContractsSpy.mockReturnValue(dbError)

      // 試験実施
      await contractCancellation.checkContractStatus(tenantId, next)

      // 期待結果
      expect(next).toHaveBeenCalledWith(errorHelper.create(500))
    })
  })

  describe('showContractCancel', () => {
    test('正常', async () => {
      // 準備
      findContractsSpy.mockReturnValue(onContractContracts)

      // 試験実施
      await contractCancellation.showContractCancel(request, response, next)

      // 期待結果
      expect(response.render).toHaveBeenCalledWith('contractCancellation', {
        title: '契約情報解約',
        engTitle: 'CONTRACT CANCELLATION',
        numberN: '123',
        csrfToken: dummyToken
      })
    })
  })

  describe('contractCancel', () => {
    test('正常', async () => {
      // 準備
      findContractsSpy.mockReturnValue(onContractContracts)
      cancelOrderSpy.mockImplementation(async (tenantId, orderData) => {
        expect(tenantId).toEqual(tenantId)
        expect(orderData.contractBasicInfo.serviceType).toEqual(serviceTypesLightPlan)
      })

      // 試験実施
      await contractCancellation.contractCancel(request, response, next)

      // 期待結果
      expect(response.render).toHaveBeenCalledWith('contractCancellationComplete', {
        title: '契約情報解約',
        engTitle: 'CONTRACT CANCELLATION'
      })
    })

    test('準正常: DBエラー時-解約情報登録', async () => {
      // 準備
      findContractsSpy.mockReturnValue(onContractContracts)
      cancelOrderSpy.mockImplementation(async (tenantId, orderData) => {
        expect(tenantId).toEqual(tenantId)
        expect(orderData.contractBasicInfo.serviceType).toEqual(serviceTypesLightPlan)
        return dbError
      })

      // 試験実施
      await contractCancellation.contractCancel(request, response, next)

      // 期待結果
      expect(next).toHaveBeenCalledWith(errorHelper.create(500))
    })
  })
})
