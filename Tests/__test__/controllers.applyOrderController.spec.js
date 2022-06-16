'use strict'
jest.mock('../../Application/lib/logger')

const db = require('../../Application/models').sequelize
const Contract = require('../../Application/models').Contract
const Order = require('../../Application/models').Order
const applyOrderController = require('../../Application/controllers/applyOrderController')
const contractController = require('../../Application/controllers/contractController')
const logger = require('../../Application/lib/logger')
const constants = require('../../Application/constants').statusConstants
const OrderData = require('../../Application/routes/helpers/orderData')

// 契約ステータス
const contractStatuses = constants.contractStatuses
// オーダー種別
const orderTypes = constants.orderTypes
// 申込区分
const appTypes = constants.appTypes
// サービス種別(lightPlan)
const serviceTypesLightPlan = constants.serviceTypes.lightPlan
// 商品コード(lightPlan)
const prdtCodesLightPlan = constants.prdtCodes.lightPlan

const tenantId = '12345678-bdac-4195-80b9-1ea64b8cb70c'

const newOrderData = new OrderData(
  tenantId,
  {},
  orderTypes.newOrder,
  serviceTypesLightPlan,
  prdtCodesLightPlan,
  appTypes.new
)

const cancelOrderData = new OrderData(
  tenantId,
  {},
  orderTypes.cancelOrder,
  serviceTypesLightPlan,
  prdtCodesLightPlan,
  appTypes.cancel
)

const contractData = {
  contractId: '034d9315-46e3-4032-8258-8e30b417f1b1',
  tenantId: tenantId,
  serviceType: serviceTypesLightPlan,
  numberN: 'numberN',
  contractStatus: contractStatuses.onContract,
  deleteFlag: false,
  createdAt: '2022-06-15 17:41:38',
  updatedAt: '2022-06-15 17:41:38'
}

const dbError = new Error('DB error')

let contractCreateSpy, contractUpdateSpy, orderCreateSpy, findContractSpy, errorSpy

describe('applyOrderControllerのテスト', () => {
  beforeEach(() => {
    contractCreateSpy = jest.spyOn(Contract, 'create')
    contractUpdateSpy = jest.spyOn(Contract, 'update')
    orderCreateSpy = jest.spyOn(Order, 'create')
    findContractSpy = jest.spyOn(contractController, 'findContract')
    errorSpy = jest.spyOn(logger, 'error')

    db.transaction = jest.fn(async (callback) => {
      const transactionObj = {}
      const result = await callback(transactionObj)
      return await result
    })
  })

  afterEach(() => {
    contractCreateSpy.mockRestore()
    contractUpdateSpy.mockRestore()
    orderCreateSpy.mockRestore()
    findContractSpy.mockRestore()
    errorSpy.mockRestore()
  })

  describe('applyNewOrder', () => {
    test('正常', async () => {
      // 準備
      contractCreateSpy.mockImplementation(async (record, transaction) => {
        expect(record.contractId).toBeDefined()
        expect(record.tenantId).toEqual(tenantId)
        expect(record.serviceType).toEqual(serviceTypesLightPlan)
        expect(record.numberN).toEqual('')
        expect(record.contractStatus).toEqual(contractStatuses.newContractOrder)
        expect(record.deleteFlag).toBeFalsy()
        expect(record.createdAt).toBeDefined()
        expect(record.updatedAt).toBeDefined()
      })

      orderCreateSpy.mockImplementation(async (record, transaction) => {
        expect(record.contractId).toBeDefined()
        expect(record.tenantId).toEqual(tenantId)
        expect(record.orderType).toEqual(orderTypes.newOrder)
        expect(record.orderData).toEqual(JSON.stringify(newOrderData))
      })

      // 試験実施
      const result = await applyOrderController.applyNewOrder(tenantId, serviceTypesLightPlan, newOrderData)

      // 期待結果
      expect(result).toBeUndefined()
    })

    test('準正常: DBエラー時', async () => {
      // 準備
      contractCreateSpy.mockImplementation(async (record, transaction) => {
        throw dbError
      })

      // 試験実施
      const result = await applyOrderController.applyNewOrder(tenantId, serviceTypesLightPlan, newOrderData)

      // 期待結果
      expect(result).toEqual(dbError)
    })
  })

  describe('cancelOrder', () => {
    test('正常', async () => {
      // 準備
      findContractSpy.mockReturnValueOnce(contractData)
      contractUpdateSpy.mockImplementation(async (updateData, transaction) => {
        expect(updateData.contractStatus).toEqual(contractStatuses.cancellationOrder)
        expect(updateData.updatedAt).toBeDefined()
      })

      orderCreateSpy.mockImplementation(async (record, transaction) => {
        expect(record.contractId).toEqual(contractData.contractId)
        expect(record.tenantId).toEqual(tenantId)
        expect(record.orderType).toEqual(orderTypes.cancelOrder)
        expect(record.orderData).toEqual(JSON.stringify(cancelOrderData))
      })

      // 試験実施
      const result = await applyOrderController.cancelOrder(tenantId, serviceTypesLightPlan, cancelOrderData)

      // 期待結果
      expect(result).toBeUndefined()
    })

    test('準正常: DBエラー時', async () => {
      // 準備
      findContractSpy.mockReturnValueOnce(contractData)
      contractUpdateSpy.mockImplementation(async (record, transaction) => {
        throw dbError
      })

      // 試験実施
      const result = await applyOrderController.cancelOrder(tenantId, serviceTypesLightPlan, cancelOrderData)

      // 期待結果
      expect(result).toEqual(dbError)
    })

    test('準正常: Not Founded ContractId', async () => {
      // 準備
      findContractSpy.mockReturnValueOnce({ contractId: '' })
      contractUpdateSpy.mockImplementation(async (record, transaction) => {
        throw dbError
      })

      // 試験実施
      const result = await applyOrderController.cancelOrder(tenantId, serviceTypesLightPlan, cancelOrderData)

      // 期待結果
      expect(result).toEqual(new Error('Not Founded ContractId'))
    })
  })
})
