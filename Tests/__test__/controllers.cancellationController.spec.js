'use strict'
jest.mock('../../Application/models')
jest.mock('../../Application/lib/logger')

const cancellationsController = require('../../Application/controllers/cancellationsController')

let findContractSpy, errorSpy, tenantId, updateStatusSpy
describe('cancellationsControllerのテスト', () => {
  beforeEach(() => {
    const Contractcontroller = require('../../Application/controllers/contractController')
    const logger = require('../../Application/lib/logger')
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

  const cancelData = {}
  const dbReturnValue = {
    dataValues: {
      contractId: '034d9315-46e3-4032-8258-8e30b417f1b1',
      tenantId: '3ca50e1a-d3ab-431a-b526-14fd65a3cda8',
      numberN: 'numberN',
      contractStatus: '10',
      deleteFlag: false,
      createdAt: '2021-07-15 17:41:38',
      updatedAt: '2021-07-15 17:41:38',
      contractedAt: '',
      canceledAt: ''
    }
  }

  const returnValue = {
    statuscode: 200,
    value: 'success'
  }

  describe('create', () => {
    test('正常：created', async () => {
      // 準備
      // DBからの正常解約情報の取得を想定する
      findContractSpy.mockReturnValueOnce(dbReturnValue)
      updateStatusSpy.mockReturnValueOnce(1)

      // 試験実施
      const result = await cancellationsController.create(tenantId, cancelData)

      // 期待結果
      // 想定した契約情報がReturnされていること
      expect(result).toEqual(returnValue)
    })

    test('正常：データ０件', async () => {
      // 準備
      // DBから取得したデータが「０件」を想定する
      findContractSpy.mockReturnValueOnce(undefined)
      const tenantIdNotExist = 'asdf'
      // 試験実施
      const result = await cancellationsController.create(tenantIdNotExist, cancelData)
      // 期待結果
      // 想定した契約情報がReturnされていること
      expect(errorSpy).toHaveBeenCalledWith({ user: tenantIdNotExist, stack: expect.anything(), status: 0 }, expect.anything())
      expect(result).toEqual({ statuscode: '051', value: new Error('ERR051 Not Founded ContractId') })
      // expect(result.length).toEqual(undefined)
    })

    test('status 0のErrorログ: DBエラー時', async () => {
      // 準備
      // 1回目のアクセストークンによるアクセスは401エラーを想定する
      const dbError = new Error('ERR051 Not Founded ContractId')
      findContractSpy.mockImplementation(() => {
        throw dbError
      })

      // 試験実施
      const result = await cancellationsController.create(tenantId, cancelData)

      // 期待結果
      // status: 0のErrorログ出力が呼ばれること
      expect(errorSpy).toHaveBeenCalledWith({ user: tenantId, stack: expect.anything(), status: 0 }, expect.anything())
      // DBErrorが返されること
      expect(result).toEqual({ statuscode: '051', value: new Error('ERR051 Not Founded ContractId') })
    })

    test('updateのErrorログ: DBエラー時', async () => {
      // 準備
      // 1回目のアクセストークンによるアクセスは401エラーを想定する
      // const dbError = new Error('ERR052 Not updated ContratStatus')
      // findContractSpy.mockReturnValueOnce({ contractId: '' })
      findContractSpy.mockReturnValueOnce(dbReturnValue)
      updateStatusSpy.mockReturnValueOnce(null)
      // 試験実施
      const result = await cancellationsController.create(tenantId, cancelData)

      // 期待結果
      // status: 0のErrorログ出力が呼ばれること
      expect(errorSpy).toHaveBeenCalledWith({ user: tenantId, stack: expect.anything(), status: 0 }, expect.anything())
      // DBErrorが返されること
      expect(result).toEqual({ statuscode: '052', value: new Error('ERR052 Not updated ContratStatus') })
    })
  })
})
