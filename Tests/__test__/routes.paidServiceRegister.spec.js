'use strict'
jest.mock('../../Application/lib/logger')
jest.mock('../../Application/node_modules/express', () => {
  return require('jest-express')
})

const paidServiceRegister = require('../../Application/routes/paidServiceRegister')
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
// サービス種別
const serviceTypes = constants.serviceTypes

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
  contractorName: '契約者名',
  contractorKanaName: 'カナ',
  postalNumber: '1000004',
  contractAddressVal: '東京都千代田区大手町一丁目',
  banch1: '１番',
  tatemono1: '建物',
  contactPersonName: '連絡先担当者名',
  contactPhoneNumber: '000-0000-0000',
  contactMail: 'aaaaaa@aaa.com',
  billMailingPostalNumber: '1000004',
  billMailingAddress: '東京都千代田区大手町一丁目',
  billMailingAddressBanchi1: '請求書送付先番地等',
  billMailingAddressBuilding1: '請求書送付先建物等',
  billMailingKanaName: '請求書送付先宛名',
  billMailingName: 'カナ',
  billMailingPersonName: '請求に関する連絡先',
  billMailingPhoneNumber: '000-0000-0000',
  billMailingMailAddress: 'aaa@aaa.com',
  password: 'Aa11111111',
  passwordConfirm: 'Aa11111111',
  openingDate: '2022-06-16',
  salesChannelCode: '000000',
  salesChannelName: '販売チャネル名',
  commonCustomerId: '11111111111',
  salesChannelDeptName: '部課名',
  salesChannelEmplyeeCode: '11111111',
  salesChannelPersonName: '担当者名',
  salesChannelDeptType: '{"code":"01","name":"Com第一営業本部"}',
  salesChannelPhoneNumber: '000-0000-0000',
  salesChannelMailAddress: 'aaa@aaa.com'
}

const onlyRequiredData = {
  contractorName: '契約者名',
  contractorKanaName: 'カナ',
  postalNumber: '1000004',
  contractAddressVal: '東京都千代田区大手町一丁目',
  banch1: '１番',
  tatemono1: '',
  contactPersonName: '連絡先担当者名',
  contactPhoneNumber: '000-0000-0000',
  contactMail: 'aaaaaa@aaa.com',
  billMailingPostalNumber: '1000004',
  billMailingAddress: '東京都千代田区大手町一丁目',
  billMailingAddressBanchi1: '請求書送付先番地等',
  billMailingAddressBuilding1: '',
  billMailingKanaName: '請求書送付先宛名',
  billMailingName: 'カナ',
  billMailingPersonName: '請求に関する連絡先',
  billMailingPhoneNumber: '000-0000-0000',
  billMailingMailAddress: 'aaa@aaa.com',
  password: 'Aa11111111',
  passwordConfirm: 'Aa11111111',
  openingDate: '',
  salesChannelCode: '',
  salesChannelName: '',
  commonCustomerId: '',
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

let request, response, applyNewOrdersSpy, findContractsSpy, findAllDept, findOneDept

describe('paidServiceRegisterのテスト', () => {
  beforeEach(() => {
    request = new Request()
    response = new Response()

    // 使っている内部モジュールの関数をspyOn
    applyNewOrdersSpy = jest.spyOn(applyOrderController, 'applyNewOrders')
    findContractsSpy = jest.spyOn(contractController, 'findContracts')
    findAllDept = jest.spyOn(channelDepartmentController, 'findAll')
    findOneDept = jest.spyOn(channelDepartmentController, 'findOne')
    request.csrfToken = jest.fn(() => {
      return dummyToken
    })
    request.flash = jest.fn()
    request.session = {}
    request.user = user
  })

  afterEach(() => {
    request.resetMocked()
    response.resetMocked()
    next.mockReset()
    applyNewOrdersSpy.mockRestore()
    findContractsSpy.mockRestore()
    findAllDept.mockRestore()
    findOneDept.mockRestore()
  })

  describe('ルーティング', () => {
    test('paidServiceRegisterのルーティングを確認', async () => {
      expect(paidServiceRegister.router.get).toBeCalledWith(
        '/:serviceType?',
        expect.any(Function),
        middleware.bcdAuthenticate,
        middleware.isTenantManager,
        middleware.isOnOrChangeContract,
        paidServiceRegister.showPaidServiceRegisterTerms
      )

      expect(paidServiceRegister.router.post).toBeCalledWith(
        '/showForm',
        expect.any(Function),
        middleware.bcdAuthenticate,
        middleware.isTenantManager,
        middleware.isOnOrChangeContract,
        paidServiceRegister.showPaidServiceRegister
      )

      expect(paidServiceRegister.router.post).toBeCalledWith(
        '/apply',
        expect.any(Function),
        middleware.bcdAuthenticate,
        middleware.isTenantManager,
        middleware.isOnOrChangeContract,
        paidServiceRegister.applyPaidServiceRegister
      )
    })
  })

  describe('getAndCheckContracts', () => {
    describe('正常', () => {
      describe('スタンダードプランのみ申込', () => {
        test('スタンダードプラン申込可能', async () => {
          // 準備
          findContractsSpy.mockReturnValue([])

          // 試験実施
          const contracts = await paidServiceRegister.getAndCheckContracts(tenantId, ['030'], next)

          // 期待結果
          expect(contracts).toEqual([])
        })

        describe('スタンダードプラン申込中', () => {
          test('契約ステータス:10', async () => {
            const returnValue = [
              {
                contractId: '87654321-cb0b-48ad-857d-4b42a44ede13',
                tenantId: tenantId,
                serviceType: serviceTypes.lightPlan,
                numberN: '',
                contractStatus: contractStatuses.newContractOrder,
                deleteFlag: false,
                createdAt: '2022-06-15 18:26:17',
                updatedAt: '2022-06-15 18:26:17'
              }
            ]
            // 準備
            findContractsSpy.mockReturnValue(returnValue)

            // 試験実施
            const contracts = await paidServiceRegister.getAndCheckContracts(tenantId, ['030'], next)

            // 期待結果
            expect(next).toHaveBeenCalledWith(noticeHelper.create('standardRegistering'))
            expect(contracts).toBeUndefined()
          })

          test('契約ステータス:11', async () => {
            const returnValue = [
              {
                contractId: '87654321-cb0b-48ad-857d-4b42a44ede13',
                tenantId: tenantId,
                serviceType: serviceTypes.lightPlan,
                numberN: '',
                contractStatus: contractStatuses.newContractReceive,
                deleteFlag: false,
                createdAt: '2022-06-15 18:26:17',
                updatedAt: '2022-06-15 18:26:17'
              }
            ]
            // 準備
            findContractsSpy.mockReturnValue(returnValue)

            // 試験実施
            const contracts = await paidServiceRegister.getAndCheckContracts(tenantId, ['030'], next)

            // 期待結果
            expect(next).toHaveBeenCalledWith(noticeHelper.create('standardRegistering'))
            expect(contracts).toBeUndefined()
          })

          test('契約ステータス:12', async () => {
            const returnValue = [
              {
                contractId: '87654321-cb0b-48ad-857d-4b42a44ede13',
                tenantId: tenantId,
                serviceType: serviceTypes.lightPlan,
                numberN: '',
                contractStatus: contractStatuses.newContractBeforeCompletion,
                deleteFlag: false,
                createdAt: '2022-06-15 18:26:17',
                updatedAt: '2022-06-15 18:26:17'
              }
            ]
            // 準備
            findContractsSpy.mockReturnValue(returnValue)

            // 試験実施
            const contracts = await paidServiceRegister.getAndCheckContracts(tenantId, ['030'], next)

            // 期待結果
            expect(next).toHaveBeenCalledWith(noticeHelper.create('standardRegistering'))
            expect(contracts).toBeUndefined()
          })
        })

        describe('スタンダードプラン契約中', () => {
          test('契約ステータス:00', async () => {
            const returnValue = [
              {
                contractId: '87654321-cb0b-48ad-857d-4b42a44ede13',
                tenantId: tenantId,
                serviceType: serviceTypes.lightPlan,
                numberN: '',
                contractStatus: contractStatuses.onContract,
                deleteFlag: false,
                createdAt: '2022-06-15 18:26:17',
                updatedAt: '2022-06-15 18:26:17'
              }
            ]
            // 準備
            findContractsSpy.mockReturnValue(returnValue)

            // 試験実施
            const contracts = await paidServiceRegister.getAndCheckContracts(tenantId, ['030'], next)

            // 期待結果
            expect(next).toHaveBeenCalledWith(noticeHelper.create('standardRegistered'))
            expect(contracts).toBeUndefined()
          })

          test('契約ステータス:30', async () => {
            const returnValue = [
              {
                contractId: '87654321-cb0b-48ad-857d-4b42a44ede13',
                tenantId: tenantId,
                serviceType: serviceTypes.lightPlan,
                numberN: '',
                contractStatus: contractStatuses.cancellationOrder,
                deleteFlag: false,
                createdAt: '2022-06-15 18:26:17',
                updatedAt: '2022-06-15 18:26:17'
              }
            ]
            // 準備
            findContractsSpy.mockReturnValue(returnValue)

            // 試験実施
            const contracts = await paidServiceRegister.getAndCheckContracts(tenantId, ['030'], next)

            // 期待結果
            expect(next).toHaveBeenCalledWith(noticeHelper.create('standardRegistered'))
            expect(contracts).toBeUndefined()
          })

          test('契約ステータス:31', async () => {
            const returnValue = [
              {
                contractId: '87654321-cb0b-48ad-857d-4b42a44ede13',
                tenantId: tenantId,
                serviceType: serviceTypes.lightPlan,
                numberN: '',
                contractStatus: contractStatuses.cancellationReceive,
                deleteFlag: false,
                createdAt: '2022-06-15 18:26:17',
                updatedAt: '2022-06-15 18:26:17'
              }
            ]
            // 準備
            findContractsSpy.mockReturnValue(returnValue)

            // 試験実施
            const contracts = await paidServiceRegister.getAndCheckContracts(tenantId, ['030'], next)

            // 期待結果
            expect(next).toHaveBeenCalledWith(noticeHelper.create('standardRegistered'))
            expect(contracts).toBeUndefined()
          })
        })
      })

      describe('導入支援サービスのみ申込', () => {
        describe('導入支援サービス申込可能', () => {
          test('契約なし', async () => {
            // 準備
            findContractsSpy.mockReturnValue([])

            // 試験実施
            const contracts = await paidServiceRegister.getAndCheckContracts(tenantId, ['020'], next)

            // 期待結果
            expect(contracts).toEqual([])
          })

          test('契約ステータス:00', async () => {
            const returnValue = [
              {
                contractId: '87654321-cb0b-48ad-857d-4b42a44ede13',
                tenantId: tenantId,
                serviceType: serviceTypes.introductionSupport,
                numberN: '',
                contractStatus: contractStatuses.onContract,
                deleteFlag: false,
                createdAt: '2022-06-15 18:26:17',
                updatedAt: '2022-06-15 18:26:17'
              }
            ]
            // 準備
            findContractsSpy.mockReturnValue(returnValue)

            // 試験実施
            const contracts = await paidServiceRegister.getAndCheckContracts(tenantId, ['020'], next)

            // 期待結果
            expect(contracts).toEqual(returnValue)
          })
        })

        describe('導入支援サービス申込済', () => {
          test('契約ステータス:10', async () => {
            const returnValue = [
              {
                contractId: '87654321-cb0b-48ad-857d-4b42a44ede13',
                tenantId: tenantId,
                serviceType: serviceTypes.introductionSupport,
                numberN: '',
                contractStatus: contractStatuses.newContractOrder,
                deleteFlag: false,
                createdAt: '2022-06-15 18:26:17',
                updatedAt: '2022-06-15 18:26:17'
              }
            ]
            // 準備
            findContractsSpy.mockReturnValue(returnValue)

            // 試験実施
            const contracts = await paidServiceRegister.getAndCheckContracts(tenantId, ['020'], next)

            // 期待結果
            expect(next).toHaveBeenCalledWith(noticeHelper.create('introductionSupportregistered'))
            expect(contracts).toBeUndefined()
          })

          test('契約ステータス:11', async () => {
            const returnValue = [
              {
                contractId: '87654321-cb0b-48ad-857d-4b42a44ede13',
                tenantId: tenantId,
                serviceType: serviceTypes.introductionSupport,
                numberN: '',
                contractStatus: contractStatuses.newContractReceive,
                deleteFlag: false,
                createdAt: '2022-06-15 18:26:17',
                updatedAt: '2022-06-15 18:26:17'
              }
            ]
            // 準備
            findContractsSpy.mockReturnValue(returnValue)

            // 試験実施
            const contracts = await paidServiceRegister.getAndCheckContracts(tenantId, ['020'], next)

            // 期待結果
            expect(next).toHaveBeenCalledWith(noticeHelper.create('introductionSupportregistered'))
            expect(contracts).toBeUndefined()
          })

          test('契約ステータス:12', async () => {
            const returnValue = [
              {
                contractId: '87654321-cb0b-48ad-857d-4b42a44ede13',
                tenantId: tenantId,
                serviceType: serviceTypes.introductionSupport,
                numberN: '',
                contractStatus: contractStatuses.newContractBeforeCompletion,
                deleteFlag: false,
                createdAt: '2022-06-15 18:26:17',
                updatedAt: '2022-06-15 18:26:17'
              }
            ]
            // 準備
            findContractsSpy.mockReturnValue(returnValue)

            // 試験実施
            const contracts = await paidServiceRegister.getAndCheckContracts(tenantId, ['020'], next)

            // 期待結果
            expect(next).toHaveBeenCalledWith(noticeHelper.create('introductionSupportregistered'))
            expect(contracts).toBeUndefined()
          })
        })
      })

      describe('スタンダードプラン・導入支援サービス申込', () => {
        test('申込可能', async () => {
          // 準備
          findContractsSpy.mockReturnValue([])

          // 試験実施
          const contracts = await paidServiceRegister.getAndCheckContracts(tenantId, ['020', '030'], next)

          // 期待結果
          expect(contracts).toEqual([])
        })
      })
    })

    describe('準正常', () => {
      test('DBエラー時', async () => {
        // 準備
        findContractsSpy.mockReturnValue(dbError)

        // 試験実施
        const contracts = await paidServiceRegister.getAndCheckContracts(tenantId, ['020'], next)

        // 期待結果
        expect(next).toHaveBeenCalledWith(errorHelper.create(500))
        expect(contracts).toBeUndefined()
      })

      test('希望サービスが存在しない', async () => {
        // 準備
        findContractsSpy.mockReturnValue([])

        // 試験実施
        const contracts = await paidServiceRegister.getAndCheckContracts(tenantId, [], next)

        // 期待結果
        expect(next).toHaveBeenCalledWith(errorHelper.create(500))
        expect(contracts).toBeUndefined()
      })

      test('想定外希望サービス', async () => {
        // 準備
        findContractsSpy.mockReturnValue([])

        // 試験実施
        const contracts = await paidServiceRegister.getAndCheckContracts(tenantId, ['any'], next)

        // 期待結果
        expect(next).toHaveBeenCalledWith(errorHelper.create(500))
        expect(contracts).toBeUndefined()
      })
    })
  })

  describe('showPaidServiceRegisterTerms', () => {
    describe('正常 申込サービスタイプあり(オプションサービス申込から遷移)', () => {
      describe('申込サービスタイプ:スタンダードプラン(030)', () => {
        test('導入支援サービス未申込', async () => {
          // 準備
          findContractsSpy.mockReturnValue([])
          request.params.serviceType = '030'
          request.session.serviceList = null

          // 試験実施
          await paidServiceRegister.showPaidServiceRegisterTerms(request, response, next)

          // 期待結果
          expect(response.render).toHaveBeenCalledWith('paidServiceRegisterTerms', {
            title: '有料サービス利用登録',
            engTitle: 'PAID SERVICE REGISTER',
            csrfToken: dummyToken,
            paidServiceInfo: {
              standardChecked: true,
              introductionSupportChecked: false,
              standardDisabled: false,
              introductionSupportDisabled: false
            }
          })
        })

        test('導入支援サービス申込済', async () => {
          // 準備
          findContractsSpy.mockReturnValue([
            {
              contractId: '87654321-cb0b-48ad-857d-4b42a44ede13',
              tenantId: tenantId,
              serviceType: serviceTypes.introductionSupport,
              numberN: '',
              contractStatus: contractStatuses.newContractOrder,
              deleteFlag: false,
              createdAt: '2022-06-15 18:26:17',
              updatedAt: '2022-06-15 18:26:17'
            }
          ])
          request.params.serviceType = '030'
          request.session.serviceList = null

          // 試験実施
          await paidServiceRegister.showPaidServiceRegisterTerms(request, response, next)

          // 期待結果
          expect(response.render).toHaveBeenCalledWith('paidServiceRegisterTerms', {
            title: '有料サービス利用登録',
            engTitle: 'PAID SERVICE REGISTER',
            csrfToken: dummyToken,
            paidServiceInfo: {
              standardChecked: true,
              introductionSupportChecked: false,
              standardDisabled: false,
              introductionSupportDisabled: true
            }
          })
        })
      })

      describe('申込サービスタイプ:導入支援サービス(020)', () => {
        test('スタンダードプラン未申込', async () => {
          // 準備
          findContractsSpy.mockReturnValue([])
          request.params.serviceType = '020'
          request.session.serviceList = null

          // 試験実施
          await paidServiceRegister.showPaidServiceRegisterTerms(request, response, next)

          // 期待結果
          expect(response.render).toHaveBeenCalledWith('paidServiceRegisterTerms', {
            title: '有料サービス利用登録',
            engTitle: 'PAID SERVICE REGISTER',
            csrfToken: dummyToken,
            paidServiceInfo: {
              standardChecked: false,
              introductionSupportChecked: true,
              standardDisabled: false,
              introductionSupportDisabled: false
            }
          })
        })

        test('スタンダードプラン申込済', async () => {
          // 準備
          findContractsSpy.mockReturnValue([
            {
              contractId: '87654321-cb0b-48ad-857d-4b42a44ede13',
              tenantId: tenantId,
              serviceType: serviceTypes.lightPlan,
              numberN: '',
              contractStatus: contractStatuses.newContractOrder,
              deleteFlag: false,
              createdAt: '2022-06-15 18:26:17',
              updatedAt: '2022-06-15 18:26:17'
            }
          ])
          request.params.serviceType = '020'
          request.session.serviceList = null

          // 試験実施
          await paidServiceRegister.showPaidServiceRegisterTerms(request, response, next)

          // 期待結果
          expect(response.render).toHaveBeenCalledWith('paidServiceRegisterTerms', {
            title: '有料サービス利用登録',
            engTitle: 'PAID SERVICE REGISTER',
            csrfToken: dummyToken,
            paidServiceInfo: {
              standardChecked: false,
              introductionSupportChecked: true,
              standardDisabled: true,
              introductionSupportDisabled: false
            }
          })
        })
      })
    })

    describe('正常 申込サービスタイプなし(申込画面の戻るボタンで遷移)', () => {
      test('申込サービスリスト:スタンダードプラン(030)', async () => {
        // 準備
        findContractsSpy.mockReturnValue([])
        request.session.serviceList = ['030']

        // 試験実施
        await paidServiceRegister.showPaidServiceRegisterTerms(request, response, next)

        // 期待結果
        expect(response.render).toHaveBeenCalledWith('paidServiceRegisterTerms', {
          title: '有料サービス利用登録',
          engTitle: 'PAID SERVICE REGISTER',
          csrfToken: dummyToken,
          paidServiceInfo: {
            standardChecked: true,
            introductionSupportChecked: false,
            standardDisabled: false,
            introductionSupportDisabled: false
          }
        })
      })

      test('申込サービスリスト:導入支援サービス(020)', async () => {
        // 準備
        findContractsSpy.mockReturnValue([])
        request.session.serviceList = ['020']

        // 試験実施
        await paidServiceRegister.showPaidServiceRegisterTerms(request, response, next)

        // 期待結果
        expect(response.render).toHaveBeenCalledWith('paidServiceRegisterTerms', {
          title: '有料サービス利用登録',
          engTitle: 'PAID SERVICE REGISTER',
          csrfToken: dummyToken,
          paidServiceInfo: {
            standardChecked: false,
            introductionSupportChecked: true,
            standardDisabled: false,
            introductionSupportDisabled: false
          }
        })
      })

      test('申込サービスリスト:スタンダードプラン(030)、導入支援サービス(020)', async () => {
        // 準備
        findContractsSpy.mockReturnValue([])
        request.session.serviceList = ['030', '020']

        // 試験実施
        await paidServiceRegister.showPaidServiceRegisterTerms(request, response, next)

        // 期待結果
        expect(response.render).toHaveBeenCalledWith('paidServiceRegisterTerms', {
          title: '有料サービス利用登録',
          engTitle: 'PAID SERVICE REGISTER',
          csrfToken: dummyToken,
          paidServiceInfo: {
            standardChecked: true,
            introductionSupportChecked: true,
            standardDisabled: false,
            introductionSupportDisabled: false
          }
        })
      })
    })
  })

  describe('showPaidServiceRegister', () => {
    describe('正常', () => {
      test('チェックされている申込サービス:スタンダードプラン(030)', async () => {
        // 準備
        findContractsSpy.mockReturnValue([])
        findAllDept.mockReturnValue(salesChannelDeptList)
        request.body = {}
        request.body.services = '030'

        // 試験実施
        await paidServiceRegister.showPaidServiceRegister(request, response, next)

        // 期待結果
        expect(response.render).toHaveBeenCalledWith('paidServiceRegister', {
          title: '有料サービス利用登録',
          engTitle: 'PAID SERVICE REGISTER',
          csrfToken: dummyToken,
          salesChannelDeptList: salesChannelDeptList,
          serviceList: ['030']
        })
      })

      test('チェックされている申込サービス:導入支援サービス(020)', async () => {
        // 準備
        findContractsSpy.mockReturnValue([])
        findAllDept.mockReturnValue(salesChannelDeptList)
        request.body = {}
        request.body.services = '020'

        // 試験実施
        await paidServiceRegister.showPaidServiceRegister(request, response, next)

        // 期待結果
        expect(response.render).toHaveBeenCalledWith('paidServiceRegister', {
          title: '有料サービス利用登録',
          engTitle: 'PAID SERVICE REGISTER',
          csrfToken: dummyToken,
          salesChannelDeptList: salesChannelDeptList,
          serviceList: ['020']
        })
      })

      test('チェックされている申込サービス:スタンダードプラン(030)、導入支援サービス(020)', async () => {
        // 準備
        findContractsSpy.mockReturnValue([])
        findAllDept.mockReturnValue(salesChannelDeptList)
        request.body = {}
        request.body.services = ['030', '020']

        // 試験実施
        await paidServiceRegister.showPaidServiceRegister(request, response, next)

        // 期待結果
        expect(response.render).toHaveBeenCalledWith('paidServiceRegister', {
          title: '有料サービス利用登録',
          engTitle: 'PAID SERVICE REGISTER',
          csrfToken: dummyToken,
          salesChannelDeptList: salesChannelDeptList,
          serviceList: ['030', '020']
        })
      })
    })

    test('準正常 DBエラー時-組織区分取得', async () => {
      // 準備
      findContractsSpy.mockReturnValue([])
      findAllDept.mockReturnValue(dbError)
      request.body = {}
      request.body.services = '030'

      // 試験実施
      await paidServiceRegister.showPaidServiceRegister(request, response, next)

      // 期待結果
      expect(next).toHaveBeenCalledWith(errorHelper.create(500))
    })
  })

  describe('applyPaidServiceRegister', () => {
    describe('正常', () => {
      test('申込サービスリスト:スタンダードプラン(030)', async () => {
        // 準備
        findContractsSpy.mockReturnValue([])
        findOneDept.mockReturnValue(salesChannelDept)
        applyNewOrdersSpy.mockImplementation(async (tenantId, orderDatas) => {
          expect(tenantId).toEqual(tenantId)
          expect(orderDatas.length).toEqual(1)
          expect(orderDatas[0].contractBasicInfo.serviceType).toEqual(serviceTypes.lightPlan)
        })
        request.session.serviceList = ['030']
        request.body = inputData

        // 試験実施
        await paidServiceRegister.applyPaidServiceRegister(request, response, next)

        // 期待結果
        expect(response.render).toHaveBeenCalledWith('paidServiceRegisterComplete', {
          title: '有料サービス利用登録',
          engTitle: 'PAID SERVICE REGISTER',
          serviceList: ['030']
        })
      })

      test('申込サービスリスト:導入支援サービス(020)', async () => {
        // 準備
        findContractsSpy.mockReturnValue([])
        findOneDept.mockReturnValue(salesChannelDept)
        applyNewOrdersSpy.mockImplementation(async (tenantId, orderDatas) => {
          expect(tenantId).toEqual(tenantId)
          expect(orderDatas.length).toEqual(1)
          expect(orderDatas[0].contractBasicInfo.serviceType).toEqual(serviceTypes.introductionSupport)
        })
        request.session.serviceList = ['020']
        // openingDateなし
        request.body = {
          contractorName: '契約者名',
          contractorKanaName: 'カナ',
          postalNumber: '1000004',
          contractAddressVal: '東京都千代田区大手町一丁目',
          banch1: '１番',
          tatemono1: '建物',
          contactPersonName: '連絡先担当者名',
          contactPhoneNumber: '000-0000-0000',
          contactMail: 'aaaaaa@aaa.com',
          billMailingPostalNumber: '1000004',
          billMailingAddress: '東京都千代田区大手町一丁目',
          billMailingAddressBanchi1: '請求書送付先番地等',
          billMailingAddressBuilding1: '請求書送付先建物等',
          billMailingKanaName: '請求書送付先宛名',
          billMailingName: 'カナ',
          billMailingPersonName: '請求に関する連絡先',
          billMailingPhoneNumber: '000-0000-0000',
          billMailingMailAddress: 'aaa@aaa.com',
          password: 'Aa11111111',
          passwordConfirm: 'Aa11111111',
          salesChannelCode: '000000',
          salesChannelName: '販売チャネル名',
          commonCustomerId: '11111111111',
          salesChannelDeptName: '部課名',
          salesChannelEmplyeeCode: '11111111',
          salesChannelPersonName: '担当者名',
          salesChannelDeptType: '{"code":"01","name":"Com第一営業本部"}',
          salesChannelPhoneNumber: '000-0000-0000',
          salesChannelMailAddress: 'aaa@aaa.com'
        }

        // 試験実施
        await paidServiceRegister.applyPaidServiceRegister(request, response, next)

        // 期待結果
        expect(response.render).toHaveBeenCalledWith('paidServiceRegisterComplete', {
          title: '有料サービス利用登録',
          engTitle: 'PAID SERVICE REGISTER',
          serviceList: ['020']
        })
      })

      test('申込サービスリスト:スタンダードプラン(030)、導入支援サービス(020)', async () => {
        // 準備
        findContractsSpy.mockReturnValue([])
        findOneDept.mockReturnValue(salesChannelDept)
        applyNewOrdersSpy.mockImplementation(async (tenantId, orderDatas) => {
          expect(tenantId).toEqual(tenantId)
          expect(orderDatas.length).toEqual(2)
          expect(orderDatas[0].contractBasicInfo.serviceType).toEqual(serviceTypes.lightPlan)
          expect(orderDatas[1].contractBasicInfo.serviceType).toEqual(serviceTypes.introductionSupport)
        })
        request.session.serviceList = ['030', '020']
        request.body = inputData

        // 試験実施
        await paidServiceRegister.applyPaidServiceRegister(request, response, next)

        // 期待結果
        expect(response.render).toHaveBeenCalledWith('paidServiceRegisterComplete', {
          title: '有料サービス利用登録',
          engTitle: 'PAID SERVICE REGISTER',
          serviceList: ['030', '020']
        })
      })

      test('必須のみ入力', async () => {
        // 準備
        findContractsSpy.mockReturnValue([])
        findOneDept.mockReturnValue(salesChannelDept)
        applyNewOrdersSpy.mockImplementation(async (tenantId, orderDatas) => {
          expect(tenantId).toEqual(tenantId)
          expect(orderDatas.length).toEqual(1)
          expect(orderDatas[0].contractBasicInfo.serviceType).toEqual(serviceTypes.lightPlan)
        })
        request.session.serviceList = ['030']
        request.body = onlyRequiredData

        // 試験実施
        await paidServiceRegister.applyPaidServiceRegister(request, response, next)

        // 期待結果
        expect(response.render).toHaveBeenCalledWith('paidServiceRegisterComplete', {
          title: '有料サービス利用登録',
          engTitle: 'PAID SERVICE REGISTER',
          serviceList: ['030']
        })
      })
    })

    describe('準正常', () => {
      test('バリデーションエラー時', async () => {
        // 準備
        findContractsSpy.mockReturnValue([])
        findOneDept.mockReturnValue(salesChannelDept)
        applyNewOrdersSpy.mockImplementation(async (tenantId, orderDatas) => {
          expect(tenantId).toEqual(tenantId)
          expect(orderDatas.length).toEqual(1)
          expect(orderDatas[0].contractBasicInfo.serviceType).toEqual(serviceTypes.lightPlan)
        })
        request.session.serviceList = ['030']
        request.body = {}

        // 試験実施
        await paidServiceRegister.applyPaidServiceRegister(request, response, next)

        // 期待結果
        expect(next).toHaveBeenCalledWith(errorHelper.create(404))
      })

      test('DBエラー時-組織区分取得', async () => {
        // 準備
        findContractsSpy.mockReturnValue([])
        findOneDept.mockImplementation(async () => {
          return dbError
        })

        request.session.serviceList = ['030']
        request.body = inputData

        // 試験実施
        await paidServiceRegister.applyPaidServiceRegister(request, response, next)

        // 期待結果
        expect(next).toHaveBeenCalledWith(errorHelper.create(500))
      })

      test('DBエラー時-契約情報登録', async () => {
        // 準備
        findContractsSpy.mockReturnValue([])
        findOneDept.mockReturnValue(salesChannelDept)
        applyNewOrdersSpy.mockImplementation(async (tenantId, orderData) => {
          return dbError
        })
        request.session.serviceList = ['030']
        request.body = inputData

        // 試験実施
        await paidServiceRegister.applyPaidServiceRegister(request, response, next)

        // 期待結果
        expect(next).toHaveBeenCalledWith(errorHelper.create(500))
      })
    })
  })
})
