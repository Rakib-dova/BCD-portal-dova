'use strict'
jest.mock('../../Application/node_modules/express', () => {
  return require('jest-express')
})
jest.mock('../../Application/controllers/applyOrderController.js')

const receiveIntroductionSupport = require('../../Application/routes/receiveIntroductionSupport')
const applyOrderController = require('../../Application/controllers/applyOrderController.js')
const contractController = require('../../Application/controllers/contractController.js')
const Request = require('jest-express').Request
const Response = require('jest-express').Response
const next = require('jest-express').Next
const logger = require('../../Application/lib/logger.js')
const middleware = require('../../Application/routes/helpers/middleware')
// const OrderData = require('../../Application/routes/helpers/OrderData')
const constants = require('../../Application/constants').statusConstants
// const constants = require('../../Application/constants').contractStatus
const errorHelper = require('../../Application/routes/helpers/error')
const noticeHelper = require('../../Application/routes/helpers/notice')

// 契約ステータス
const contractStatuses = constants.contractStatuses
// サービス種別
const serviceTypesIntroductionSupport = constants.serviceTypes.introductionSupport

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
  salesChannelDeptType: 'Com第一営業本部',
  salesChannelPhoneNumber: '000-0000-0000',
  salesChannelMailAddress: 'aaa@aaa.com'
}

let request, response, applyNewOrderSpy, findContractSpy, infoSpy

describe('receiveIntroductionSupportのテスト', () => {
  beforeEach(() => {
    request = new Request()
    response = new Response()

    request.user = user

    // 使っている内部モジュールの関数をspyOn
    applyNewOrderSpy = jest.spyOn(applyOrderController, 'applyNewOrder')
    findContractSpy = jest.spyOn(contractController, 'findContracts')
    infoSpy = jest.spyOn(logger, 'info')
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
    findContractSpy.mockRestore()
    infoSpy.mockRestore()
  })

  describe('ルーティング', () => {
    test('receiveIntroductionSupportのルーティングを確認', async () => {
      expect(receiveIntroductionSupport.router.get).toBeCalledWith(
        '/',
        middleware.isAuthenticated,
        middleware.isTenantRegistered,
        middleware.isUserRegistered,
        expect.any(Function),
        receiveIntroductionSupport.checkContractStatus,
        receiveIntroductionSupport.showIntroductionSupport
      )
      expect(receiveIntroductionSupport.router.post).toBeCalledWith(
        '/register',
        middleware.isAuthenticated,
        middleware.isTenantRegistered,
        middleware.isUserRegistered,
        expect.any(Function),
        receiveIntroductionSupport.checkContractStatus,
        receiveIntroductionSupport.registerIntroductionSupport
      )
    })
  })

  describe('checkContractStatus', () => {
    test('正常：導入支援申し込んでいない', async () => {
      // 準備
      findContractSpy.mockReturnValue([])

      // request.userに正常値を設定する
      request.user = user

      // 試験実施
      await receiveIntroductionSupport.checkContractStatus(request, response, next)

      // 期待結果
      expect(next).toHaveBeenCalledWith()
    })

    test('正常：申し込み済', async () => {
      // 準備
      findContractSpy.mockReturnValue([
        {
          contractId: '87654321-cb0b-48ad-857d-4b42a44ede13',
          tenantId: tenantId,
          serviceType: serviceTypesIntroductionSupport,
          numberN: '',
          contractStatus: contractStatuses.onContract,
          deleteFlag: false,
          createdAt: '2022-06-15 18:26:17',
          updatedAt: '2022-06-15 18:26:17'
        }
      ])

      // request.userに正常値を設定する
      request.user = user

      // 試験実施
      await receiveIntroductionSupport.checkContractStatus(request, response, next)

      // 期待結果
      expect(next).toHaveBeenCalledWith(noticeHelper.create('introductionSupportregistered'))
    })

    test('準正常：DBエラー時', async () => {
      // 準備
      findContractSpy.mockReturnValue(dbError)

      // request.userに正常値を設定する
      request.user = user

      // 試験実施
      await receiveIntroductionSupport.checkContractStatus(request, response, next)

      // 期待結果
      expect(next).toHaveBeenCalledWith(errorHelper.create(500))
    })
  })

  describe('showIntroductionSupport', () => {
    test('正常', async () => {
      // request.userに正常値を設定する
      request.user = user

      // 試験実施
      await receiveIntroductionSupport.showIntroductionSupport(request, response, next)

      // 期待結果
      expect(response.render).toHaveBeenCalledWith('introductionSupport', {
        title: '導入支援サービス申し込み',
        salesChannelDeptList: [
          { code: '001', name: 'Com第一営業本部' },
          { code: '002', name: 'Com第二営業本部' },
          { code: '003', name: 'Com第三営業本部' }
        ],
        csrfToken: dummyToken
      })
    })
  })

  describe('registerIntroductionSupport', () => {
    test('正常', async () => {
      // 準備
      applyNewOrderSpy.mockImplementation(async (tenantId, serviceType, OrderData) => {
        expect(tenantId).toEqual(tenantId)
        expect(serviceType).toEqual(serviceTypesIntroductionSupport)
        expect(OrderData).toBeDefined()
      })

      // requestに正常値を設定する
      request.user = user
      request.body = inputData

      // 試験実施
      await receiveIntroductionSupport.registerIntroductionSupport(request, response, next)

      // 期待結果
      expect(request.flash).toHaveBeenCalledWith('info', '導入支援サービスの申し込みが完了いたしました。')
      expect(response.redirect).toHaveBeenCalledWith(303, '/portal')
    })

    test('準正常：バリデーションエラー時', async () => {
      // 準備
      applyNewOrderSpy.mockImplementation(async (tenantId, serviceType, orderData) => {
        expect(tenantId).toEqual(tenantId)
        expect(serviceType).toEqual(serviceTypesIntroductionSupport)
        expect(orderData).toBeDefined()
      })

      // requestに正常値を設定する
      request.user = user
      request.body = {}

      // 試験実施
      await receiveIntroductionSupport.registerIntroductionSupport(request, response, next)

      // 期待結果
      expect(next).toHaveBeenCalledWith(errorHelper.create(404))
    })

    test('準正常：DBエラー時', async () => {
      // 準備
      applyNewOrderSpy.mockImplementation(async (tenantId, serviceType, orderData) => {
        expect(tenantId).toEqual(tenantId)
        expect(serviceType).toEqual(serviceTypesIntroductionSupport)
        expect(orderData).toBeDefined()
        return dbError
      })

      // requestに正常値を設定する
      request.user = user
      request.body = inputData

      // 試験実施
      await receiveIntroductionSupport.registerIntroductionSupport(request, response, next)

      // 期待結果
      expect(next).toHaveBeenCalledWith(errorHelper.create(500))
    })
  })
})
