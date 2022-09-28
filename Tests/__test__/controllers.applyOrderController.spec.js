'use strict'
jest.mock('../../Application/lib/logger')

const db = require('../../Application/models').sequelize
const Contract = require('../../Application/models').Contract
const Order = require('../../Application/models').Order
const applyOrderController = require('../../Application/controllers/applyOrderController')
const contractController = require('../../Application/controllers/contractController')
const constants = require('../../Application/constants').statusConstants
const OrderData = require('../../Application/routes/helpers/orderData')

// 契約ステータス
const contractStatuses = constants.contractStatuses
// オーダー種別
const orderTypes = constants.orderTypes
// 申込区分
const appTypes = constants.appTypes
// サービス種別
const serviceTypes = constants.serviceTypes
// 商品コード
const prdtCodes = constants.prdtCodes

const tenantId = '12345678-bdac-4195-80b9-1ea64b8cb70c'

// スタンダードオーダー
const newStandardOrderData = new OrderData(
  tenantId,
  {},
  orderTypes.newOrder,
  serviceTypes.lightPlan,
  prdtCodes.lightPlan,
  appTypes.new,
  null
)

// 導入支援サービスオーダー
const newIntroductionSupportOrderData = new OrderData(
  tenantId,
  {},
  orderTypes.newOrder,
  serviceTypes.introductionSupport,
  prdtCodes.introductionSupport,
  appTypes.new,
  null
)

const cancelOrderData = new OrderData(
  tenantId,
  {},
  orderTypes.cancelOrder,
  serviceTypes.lightPlan,
  prdtCodes.lightPlan,
  appTypes.cancel,
  null
)

const contractData = {
  contractId: '034d9315-46e3-4032-8258-8e30b417f1b1',
  tenantId: tenantId,
  serviceType: serviceTypes.lightPlan,
  numberN: 'numberN',
  contractStatus: contractStatuses.onContract,
  deleteFlag: false,
  createdAt: '2022-06-15 17:41:38',
  updatedAt: '2022-06-15 17:41:38'
}

const dbError = new Error('DB error')

let contractBulkCreateSpy, contractUpdateSpy, orderBulkCreateSpy, orderCreateSpy, findContractSpy

describe('applyOrderControllerのテスト', () => {
  beforeEach(() => {
    contractBulkCreateSpy = jest.spyOn(Contract, 'bulkCreate')
    contractUpdateSpy = jest.spyOn(Contract, 'update')
    orderBulkCreateSpy = jest.spyOn(Order, 'bulkCreate')
    orderCreateSpy = jest.spyOn(Order, 'create')
    findContractSpy = jest.spyOn(contractController, 'findContract')

    db.transaction = jest.fn(async (callback) => {
      const transactionObj = {}
      const result = await callback(transactionObj)
      return await result
    })
  })

  afterEach(() => {
    contractBulkCreateSpy.mockRestore()
    contractUpdateSpy.mockRestore()
    orderBulkCreateSpy.mockRestore()
    orderCreateSpy.mockRestore()
    findContractSpy.mockRestore()
  })

  describe('applyNewOrders', () => {
    test('正常 1件オーダー', async () => {
      // 準備
      contractBulkCreateSpy.mockImplementation(async (records, transaction) => {
        expect(records.length).toBe(1)
        const record = records[0]
        expect(record.contractId).toBeDefined()
        expect(record.tenantId).toEqual(tenantId)
        expect(record.serviceType).toEqual(serviceTypes.lightPlan)
        expect(record.numberN).toEqual('')
        expect(record.contractStatus).toEqual(contractStatuses.newContractOrder)
        expect(record.deleteFlag).toBeFalsy()
        expect(record.createdAt).toBeDefined()
        expect(record.updatedAt).toBeDefined()
      })

      orderBulkCreateSpy.mockImplementation(async (records, transaction) => {
        expect(records.length).toBe(1)
        const record = records[0]
        expect(record.contractId).toBeDefined()
        expect(record.tenantId).toEqual(tenantId)
        expect(record.orderType).toEqual(orderTypes.newOrder)
        expect(record.orderData).toEqual(JSON.stringify(newStandardOrderData))
      })

      // 試験実施
      const result = await applyOrderController.applyNewOrders(tenantId, [newStandardOrderData])

      // 期待結果
      expect(result).toBeUndefined()
    })

    test('正常 2件オーダー', async () => {
      // 準備
      contractBulkCreateSpy.mockImplementation(async (records, transaction) => {
        expect(records.length).toBe(2)
        const standardRecord = records[0]
        expect(standardRecord.contractId).toBeDefined()
        expect(standardRecord.tenantId).toEqual(tenantId)
        expect(standardRecord.serviceType).toEqual(serviceTypes.lightPlan)
        expect(standardRecord.numberN).toEqual('')
        expect(standardRecord.contractStatus).toEqual(contractStatuses.newContractOrder)
        expect(standardRecord.deleteFlag).toBeFalsy()
        expect(standardRecord.createdAt).toBeDefined()
        expect(standardRecord.updatedAt).toBeDefined()

        const introductionSupportRecord = records[1]
        expect(introductionSupportRecord.contractId).toBeDefined()
        expect(introductionSupportRecord.tenantId).toEqual(tenantId)
        expect(introductionSupportRecord.serviceType).toEqual(serviceTypes.introductionSupport)
        expect(introductionSupportRecord.numberN).toEqual('')
        expect(introductionSupportRecord.contractStatus).toEqual(contractStatuses.newContractOrder)
        expect(introductionSupportRecord.deleteFlag).toBeFalsy()
        expect(introductionSupportRecord.createdAt).toBeDefined()
        expect(introductionSupportRecord.updatedAt).toBeDefined()
      })

      orderBulkCreateSpy.mockImplementation(async (records, transaction) => {
        expect(records.length).toBe(2)
        const standardRecord = records[0]
        expect(standardRecord.contractId).toBeDefined()
        expect(standardRecord.tenantId).toEqual(tenantId)
        expect(standardRecord.orderType).toEqual(orderTypes.newOrder)
        expect(standardRecord.orderData).toEqual(JSON.stringify(newStandardOrderData))

        const introductionSupportRecord = records[1]
        expect(introductionSupportRecord.contractId).toBeDefined()
        expect(introductionSupportRecord.tenantId).toEqual(tenantId)
        expect(introductionSupportRecord.orderType).toEqual(orderTypes.newOrder)
        expect(introductionSupportRecord.orderData).toEqual(JSON.stringify(newIntroductionSupportOrderData))
      })

      // 試験実施
      const result = await applyOrderController.applyNewOrders(tenantId, [
        newStandardOrderData,
        newIntroductionSupportOrderData
      ])

      // 期待結果
      expect(result).toBeUndefined()
    })

    test('準正常: DBエラー時', async () => {
      // 準備
      contractBulkCreateSpy.mockImplementation(async (record, transaction) => {
        throw dbError
      })

      // 試験実施
      const result = await applyOrderController.applyNewOrders(tenantId, [newStandardOrderData])

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
      const result = await applyOrderController.cancelOrder(tenantId, cancelOrderData)

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
      const result = await applyOrderController.cancelOrder(tenantId, cancelOrderData)

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
      const result = await applyOrderController.cancelOrder(tenantId, cancelOrderData)

      // 期待結果
      expect(result).toEqual(new Error('Not Founded ContractId'))
    })
  })
})
