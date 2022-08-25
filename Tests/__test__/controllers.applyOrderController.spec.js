'use strict'
jest.mock('../../Application/lib/logger')

const db = require('../../Application/models').sequelize
const Contract = require('../../Application/models').Contract
const Order = require('../../Application/models').Order
const applyOrderController = require('../../Application/controllers/applyOrderController')
const contractController = require('../../Application/controllers/contractController')
const constants = require('../../Application/constants').statusConstants
const OrderData = require('../../Application/routes/helpers/orderData')
const TradeshiftDTO = require('../../Application/DTO/TradeshiftDTO')
const apiManager = require('../../Application/controllers/apiManager.js')
const logger = require('../../Application/lib/logger')

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

// ユーザー情報
const user = {
  tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089',
  userId: '976d46d7-cb0b-48ad-857d-4b42a44ede13',
  accessToken: 'dummyAccessToken',
  refreshToken: 'dummyRefreshToken'
}

// ドキュメントリスト
const getDocumentsResult = {
  itemsPerPage: 2,
  itemCount: 4,
  indexing: false,
  numPages: 2,
  pageId: 0,
  Document: [
    {
      DocumentId: '3064665f-a90a-5f2e-a9e1-d59988ef3591',
      TenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089'
    },
    {
      DocumentId: '0aa6c428-b1d0-5cef-8044-3fe78acb226f',
      TenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089'
    },
    {
      DocumentId: '5792b9b9-fe31-5b1d-a58f-9798089359fd',
      TenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089'
    },
    {
      DocumentId: '76b589ab-1fc2-5aa3-bdb4-151abadd9537',
      TenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089'
    }
  ]
}

const apiError = new Error('API ERROR')
const api404Error = new Error('API 404ERROR')
let getDocumentErrorCount = 0
let contractBulkCreateSpy,
  contractUpdateSpy,
  orderBulkCreateSpy,
  orderCreateSpy,
  findContractSpy,
  tradeshiftDTOGetDocuments,
  tradeshiftDTOCreateTags,
  errorSpy

describe('applyOrderControllerのテスト', () => {
  beforeEach(() => {
    contractBulkCreateSpy = jest.spyOn(Contract, 'bulkCreate')
    contractUpdateSpy = jest.spyOn(Contract, 'update')
    orderBulkCreateSpy = jest.spyOn(Order, 'bulkCreate')
    orderCreateSpy = jest.spyOn(Order, 'create')
    findContractSpy = jest.spyOn(contractController, 'findContract')
    tradeshiftDTOGetDocuments = jest.spyOn(TradeshiftDTO.prototype, 'getDocuments')
    tradeshiftDTOCreateTags = jest.spyOn(TradeshiftDTO.prototype, 'createTags')
    errorSpy = jest.spyOn(logger, 'error')
    apiManager.accessTradeshift = jest.fn((accToken, refreshToken, method, query, body = {}, config = {}) => {
      if (query.match(/documents/i)) {
        if (query.match(/Error/i)) {
          getDocumentErrorCount += 1
          if (getDocumentErrorCount === 2) {
            // 1回失敗後、成功した場合
            const resultGetDocument = require('../mockInvoice/invoice2')
            return resultGetDocument
          } else if (getDocumentErrorCount === 4) {
            // 2回失敗後、成功した場合
            const resultGetDocument = require('../mockInvoice/invoice2')
            return resultGetDocument
          } else {
            return apiError
          }
        } else {
          const documentId = query.replace('/documents/', '')
          if (documentId === '0aa6c428-b1d0-5cef-8044-3fe78acb226f') {
            // 正しくない担当者メールアドレス
            const resultGetDocument = require('../mockInvoice/invoice2')
            return resultGetDocument
          } else if (documentId === '5792b9b9-fe31-5b1d-a58f-9798089359fd') {
            // 担当者メールアドレスなし
            const resultGetDocument = require('../mockInvoice/invoice3')
            return resultGetDocument
          } else if (documentId === '76b589ab-1fc2-5aa3-bdb4-151abadd9537') {
            // ユーザー情報がない担当者メールアドレス
            const resultGetDocument = require('../mockInvoice/invoice5')
            return resultGetDocument
          } else {
            // 担当者メールアドレスあり
            const resultGetDocument = require('../mockInvoice/invoice1')
            return resultGetDocument
          }
        }
      } else if (query.match(/byemail/i)) {
        if (query.match(/noUserInfo/i)) {
          return api404Error
        } else {
          return ''
        }
      }
    })

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
    tradeshiftDTOGetDocuments.mockRestore()
    tradeshiftDTOCreateTags.mockRestore()
    errorSpy.mockRestore()
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
      expect(result.length).toBe(1)
      expect(result[0].contractId).toBeDefined()
      expect(result[0].tenantId).toEqual(tenantId)
      expect(result[0].serviceType).toEqual(serviceTypes.lightPlan)
      expect(result[0].numberN).toEqual('')
      expect(result[0].contractStatus).toEqual(contractStatuses.newContractOrder)
      expect(result[0].deleteFlag).toBeFalsy()
      expect(result[0].createdAt).toBeDefined()
      expect(result[0].updatedAt).toBeDefined()
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
      expect(result.length).toBe(2)
      for (const data of result) {
        expect(data.contractId).toBeDefined()
        expect(data.tenantId).toEqual(tenantId)
        expect(data.numberN).toEqual('')
        expect(data.deleteFlag).toBeFalsy()
        expect(data.createdAt).toBeDefined()
        expect(data.updatedAt).toBeDefined()
      }
      expect(result[0].serviceType).toEqual(serviceTypes.lightPlan)
      expect(result[1].serviceType).toEqual(serviceTypes.introductionSupport)
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

  describe('tagCreate', () => {
    test('正常', async () => {
      // 準備
      tradeshiftDTOGetDocuments.mockReturnValue(getDocumentsResult)
      tradeshiftDTOCreateTags.mockReturnValue('')

      // 試験実施
      const result = await applyOrderController.tagCreate(user, new Date())

      // 期待結果
      expect(result).toBeUndefined()
    })

    test('正常系: getDocumentsAPI - 1回失敗後、Retryで成功した場合', async () => {
      // 準備
      const apiError = new Error('API ERROR')
      tradeshiftDTOGetDocuments.mockReturnValueOnce(apiError).mockReturnValue(getDocumentsResult)
      tradeshiftDTOCreateTags.mockReturnValue('')

      // 試験実施
      const result = await applyOrderController.tagCreate(user, new Date())

      // 期待結果
      expect(result).toEqual()
      expect(errorSpy).not.toHaveBeenCalledWith(
        { tenant: user.tenantId, stack: apiError.stack, status: 0 },
        'applyOrderController_tagCreate_getDocuments_retry3_failed'
      )
    })

    test('正常系: getDocumentsAPI - 2回失敗後、Retryで成功した場合', async () => {
      // 準備
      const apiError = new Error('API ERROR')
      tradeshiftDTOGetDocuments
        .mockReturnValueOnce(apiError)
        .mockReturnValueOnce(apiError)
        .mockReturnValue(getDocumentsResult)
      tradeshiftDTOCreateTags.mockReturnValue('')

      // 試験実施
      const result = await applyOrderController.tagCreate(user, new Date())

      // 期待結果
      expect(result).toEqual()
      expect(errorSpy).not.toHaveBeenCalledWith(
        { tenant: user.tenantId, stack: apiError.stack, status: 0 },
        'applyOrderController_tagCreate_getDocuments_retry3_failed'
      )
    })

    test('異常系: getDocumentsAPI - 3回以上失敗した場合', async () => {
      // 準備
      const apiError = new Error('API ERROR')
      tradeshiftDTOGetDocuments.mockReturnValue(apiError)

      // 試験実施
      const result = await applyOrderController.tagCreate(user, new Date())

      // 期待結果
      expect(result).toEqual(apiError)
      expect(errorSpy).toHaveBeenCalledWith(
        { tenant: user.tenantId, stack: apiError.stack, status: 0 },
        'applyOrderController_tagCreate_getDocuments_retry3_failed'
      )
    })

    test('正常系: getDocumentAPI - 1回失敗後、Retryで成功した場合', async () => {
      // 準備
      const getDocumentsResultWithError = {
        itemsPerPage: 1,
        itemCount: 1,
        indexing: false,
        numPages: 1,
        pageId: 0,
        Document: [
          {
            DocumentId: 'Error',
            TenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089'
          }
        ]
      }
      tradeshiftDTOGetDocuments.mockReturnValue(getDocumentsResultWithError)
      tradeshiftDTOCreateTags.mockReturnValue('')

      // 試験実施
      const result = await applyOrderController.tagCreate(user, new Date())

      // 期待結果
      expect(result).toBeUndefined()
      expect(errorSpy).not.toHaveBeenCalledWith(
        {
          tenant: user.tenantId,
          documentid: getDocumentsResultWithError.Document[0].DocumentId,
          stack: apiError.stack,
          status: 0
        },
        'applyOrderController_tagCreate_tagging_retry3_failed'
      )
    })

    test('正常系: getDocumentAPI - 2回失敗後、Retryで成功した場合', async () => {
      // 準備
      const getDocumentsResultWithError = {
        itemsPerPage: 1,
        itemCount: 1,
        indexing: false,
        numPages: 1,
        pageId: 0,
        Document: [
          {
            DocumentId: 'Error',
            TenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089'
          }
        ]
      }
      tradeshiftDTOGetDocuments.mockReturnValue(getDocumentsResultWithError)
      tradeshiftDTOCreateTags.mockReturnValue('')

      // 試験実施
      const result = await applyOrderController.tagCreate(user, new Date())

      // 期待結果
      expect(result).toBeUndefined()
      expect(errorSpy).not.toHaveBeenCalledWith(
        {
          tenant: user.tenantId,
          documentid: getDocumentsResultWithError.Document[0].DocumentId,
          stack: apiError.stack,
          status: 0
        },
        'applyOrderController_tagCreate_tagging_retry3_failed'
      )
    })

    test('準正常系: getDocumentAPI - 3回以上失敗した場合（1件成功、1件3回失敗、1件成功）', async () => {
      // 準備
      const getDocumentsResultWithError = {
        itemsPerPage: 1,
        itemCount: 3,
        indexing: false,
        numPages: 1,
        pageId: 0,
        Document: [
          {
            DocumentId: '3064665f-a90a-5f2e-a9e1-d59988ef3591',
            TenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089'
          },
          {
            DocumentId: 'Error',
            TenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089'
          },
          {
            DocumentId: '76b589ab-1fc2-5aa3-bdb4-151abadd9537',
            TenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089'
          }
        ]
      }
      tradeshiftDTOGetDocuments.mockReturnValue(getDocumentsResultWithError)
      tradeshiftDTOCreateTags.mockReturnValue('')

      // 試験実施
      const result = await applyOrderController.tagCreate(user, new Date())

      // 期待結果
      expect(result).toBeUndefined()
      expect(errorSpy).toHaveBeenCalledWith(
        {
          tenant: user.tenantId,
          documentid: getDocumentsResultWithError.Document[1].DocumentId,
          stack: apiError.stack,
          status: 0
        },
        'applyOrderController_tagCreate_tagging_retry3_failed'
      )
    })

    test('異常系: getDocumentAPI - 3回以上失敗した場合', async () => {
      // 準備
      const getDocumentsResultWithError = {
        itemsPerPage: 1,
        itemCount: 1,
        indexing: false,
        numPages: 1,
        pageId: 0,
        Document: [
          {
            DocumentId: 'Error',
            TenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089'
          }
        ]
      }
      tradeshiftDTOGetDocuments.mockReturnValue(getDocumentsResultWithError)
      tradeshiftDTOCreateTags.mockReturnValue('')

      // 試験実施
      const result = await applyOrderController.tagCreate(user, new Date())

      // 期待結果
      expect(result).toBeUndefined()
      expect(errorSpy).toHaveBeenCalledWith(
        {
          tenant: user.tenantId,
          documentid: getDocumentsResultWithError.Document[0].DocumentId,
          stack: apiError.stack,
          status: 0
        },
        'applyOrderController_tagCreate_tagging_retry3_failed'
      )
    })

    test('正常系: createTagsAPI - 1回失敗後、Retryで成功した場合', async () => {
      // 準備
      const apiError = new Error('API ERROR')
      tradeshiftDTOGetDocuments.mockReturnValue(getDocumentsResult)
      tradeshiftDTOCreateTags.mockReturnValueOnce('').mockReturnValueOnce(apiError).mockReturnValue('')

      // 試験実施
      const result = await applyOrderController.tagCreate(user, new Date())

      // 期待結果
      expect(result).toBeUndefined()
      expect(errorSpy).not.toHaveBeenCalledWith(
        {
          tenant: user.tenantId,
          documentid: getDocumentsResult.Document[0].DocumentId,
          stack: apiError.stack,
          status: 0
        },
        'applyOrderController_tagCreate_tagging_retry3_failed'
      )
    })

    test('正常系: createTagsAPI - 2回失敗後、Retryで成功した場合', async () => {
      // 準備
      const apiError = new Error('API ERROR')
      tradeshiftDTOGetDocuments.mockReturnValue(getDocumentsResult)
      tradeshiftDTOCreateTags
        .mockReturnValueOnce('')
        .mockReturnValueOnce(apiError)
        .mockReturnValueOnce('')
        .mockReturnValueOnce(apiError)
        .mockReturnValue('')

      // 試験実施
      const result = await applyOrderController.tagCreate(user, new Date())

      // 期待結果
      expect(result).toBeUndefined()
      expect(errorSpy).not.toHaveBeenCalledWith(
        {
          tenant: user.tenantId,
          documentid: getDocumentsResult.Document[0].DocumentId,
          stack: apiError.stack,
          status: 0
        },
        'applyOrderController_tagCreate_tagging_retry3_failed'
      )
    })

    test('準正常系: createTagsAPI - 3回以上失敗した場合（1件3回失敗、7件成功）', async () => {
      // 準備
      const apiError = new Error('API ERROR')
      tradeshiftDTOGetDocuments.mockReturnValue(getDocumentsResult)
      tradeshiftDTOCreateTags
        .mockReturnValueOnce('')
        .mockReturnValueOnce(apiError)
        .mockReturnValueOnce(apiError)
        .mockReturnValueOnce('')
        .mockReturnValueOnce('')
        .mockReturnValueOnce(apiError)
        .mockReturnValue('')

      // 試験実施
      const result = await applyOrderController.tagCreate(user, new Date())

      // 期待結果
      expect(result).toBeUndefined()
      expect(errorSpy).toHaveBeenCalledWith(
        {
          tenant: user.tenantId,
          documentid: getDocumentsResult.Document[0].DocumentId,
          stack: apiError.stack,
          status: 0
        },
        'applyOrderController_tagCreate_tagging_retry3_failed'
      )
    })

    test('異常系: createTagsAPI - 3回以上失敗した場合', async () => {
      // 準備
      const apiError = new Error('API ERROR')
      tradeshiftDTOGetDocuments.mockReturnValue(getDocumentsResult)
      tradeshiftDTOCreateTags.mockReturnValue(apiError)

      // 試験実施
      const result = await applyOrderController.tagCreate(user, new Date())

      // 期待結果
      expect(result).toBeUndefined()
      expect(errorSpy).toHaveBeenCalledWith(
        {
          tenant: user.tenantId,
          documentid: getDocumentsResult.Document[0].DocumentId,
          stack: apiError.stack,
          status: 0
        },
        'applyOrderController_tagCreate_tagging_retry3_failed'
      )
    })
  })
})
