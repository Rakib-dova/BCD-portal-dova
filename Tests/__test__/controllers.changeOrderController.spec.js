'use strict'
jest.mock('../../Application/models')
jest.mock('../../Application/lib/logger')

const changOrderController = require('../../Application/controllers/changeOrderController')
const Contractcontroller = require('../../Application/controllers/contractController')
const logger = require('../../Application/lib/logger')

let findContractSpy, errorSpy, tenantId, updateStatusSpy
describe('changOrderControllerのテスト', () => {
  beforeEach(() => {
    findContractSpy = jest.spyOn(Contractcontroller, 'findContract')
    updateStatusSpy = jest.spyOn(Contractcontroller, 'updateStatus')
    errorSpy = jest.spyOn(logger, 'error')
  })
  afterEach(() => {
    findContractSpy.mockRestore()
    updateStatusSpy.mockRestore()
    errorSpy.mockRestore()
  })

  tenantId = '3ca50e1a-d3ab-431a-b526-14fd65a3cda8'

  const dbReturnValue = {
    dataValues: {
      contractId: '034d9315-46e3-4032-8258-8e30b417f1b1',
      tenantId: '3ca50e1a-d3ab-431a-b526-14fd65a3cda8',
      numberN: 'a1B2c3D4e5',
      contractStatus: '00',
      deleteFlag: false,
      createdAt: '2021-07-29 14:00:38',
      updatedAt: '2021-07-29 14:00:38',
      contractedAt: '',
      canceledAt: ''
    }
  }

  const returnValue = {
    statuscode: 200,
    value: 'success'
  }

  const contractInformationcancelOrder = {
    contractBasicInfo: {
      tradeshiftId: 'f783be0e-e716-4eab-a7ec-5ce36b3c7b31',
      orderId: '',
      orderType: '020',
      contractChangeName: '1',
      contractChangeAddress: '',
      contractChangeContact: '',
      appDate: '',
      OpeningDate: '',
      contractNumber: '1234567890',
      salesChannelCode: '',
      kaianPassword: ''
    },
    contractAccountInfo: {
      contractAccountId: '',
      customerType: '',
      commonCustomerId: '',
      contractorName: 'テスト１',
      contractorKanaName: 'テスト２',
      postalNumber: '',
      contractAddress: '',
      banch1: '',
      tatemono1: ''
    }
  }

  describe('create', () => {
    test('正常', async () => {
      // 準備
      // DBからの正常解約情報の取得を想定する
      findContractSpy.mockReturnValue(dbReturnValue)
      updateStatusSpy.mockReturnValue(1)

      // 試験実施
      const result = await changOrderController.create(tenantId, contractInformationcancelOrder)

      // 期待結果
      // 想定した契約情報がReturnされていること
      expect(result).toEqual(returnValue)
    })

    test('異常：データ０件', async () => {
      // 準備
      // DBから取得したデータが「０件」を想定する
      findContractSpy.mockReturnValueOnce(undefined)
      const tenantIdNotExist = 'asdf'
      // 試験実施
      const result = await changOrderController.create(tenantIdNotExist, contractInformationcancelOrder)
      // 期待結果
      // 想定した契約情報がReturnされていること
      expect(errorSpy).toHaveBeenCalledWith(
        { user: tenantIdNotExist, stack: expect.anything(), status: 0 },
        expect.anything()
      )
      expect(result).toEqual({ statuscode: '051', value: new Error('ERR051 Not Founded ContractId') })
    })

    test('異常: DBエラーの場合', async () => {
      // 準備
      // 1回目のアクセストークンによるアクセスは401エラーを想定する
      const dbError = new Error('ERR051 Not Founded ContractId')
      findContractSpy.mockImplementation(() => {
        throw dbError
      })

      // 試験実施
      const result = await changOrderController.create(tenantId, contractInformationcancelOrder)

      // 期待結果
      expect(errorSpy).toHaveBeenCalledWith({ user: tenantId, stack: expect.anything(), status: 0 }, expect.anything())
      // DBErrorが返されること
      expect(result).toEqual({ statuscode: '051', value: new Error('ERR051 Not Founded ContractId') })
    })

    test('異常：updateエラの場合', async () => {
      // 準備
      findContractSpy.mockReturnValue(dbReturnValue)
      updateStatusSpy.mockReturnValue(null)

      // 試験実施
      const result = await changOrderController.create(tenantId, contractInformationcancelOrder)

      // 期待結果
      // status: 0のErrorログ出力が呼ばれること
      expect(errorSpy).toHaveBeenCalledWith({ user: tenantId, stack: expect.anything(), status: 0 }, expect.anything())
      // DBErrorが返されること
      expect(result).toEqual({ statuscode: '052', value: new Error('ERR052 Not updated ContratStatus') })
    })
  })
})
