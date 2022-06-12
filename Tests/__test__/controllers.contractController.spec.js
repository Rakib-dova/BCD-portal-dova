'use strict'
jest.mock('../../Application/models')
jest.mock('../../Application/lib/logger')

const contractController = require('../../Application/controllers/contractController')
const constantsDefine = require('../../Application/constants')
const cStatus = constantsDefine.statusConstants.contractStatus
const cServiceTyp = constantsDefine.statusConstants.serviceType

let findAllSpy, findOneSpy, errorSpy, tenantId, findContractSpy, updateSpy
describe('contractControllerのテスト', () => {
  beforeEach(() => {
    const Contract = require('../../Application/models').Contract
    const Contractcontroller = require('../../Application/controllers/contractController')
    const logger = require('../../Application/lib/logger')
    findAllSpy = jest.spyOn(Contract, 'findAll')
    findOneSpy = jest.spyOn(Contract, 'findOne')
    updateSpy = jest.spyOn(Contract, 'update')
    findContractSpy = jest.spyOn(Contractcontroller, 'findContract')

    errorSpy = jest.spyOn(logger, 'error')
  })
  afterEach(() => {
    findAllSpy.mockRestore()
    findOneSpy.mockRestore()
    findContractSpy.mockRestore()
    errorSpy.mockRestore()
    updateSpy.mockRestore()
  })
  tenantId = '12345678-bdac-4195-80b9-1ea64b8cb70c'

  // 正常系契約情報
  const normalContracts = [
    {
      serviceType: cServiceTyp.bcd,
      contractStatus: cStatus.onContract,
      deleteFlag: false
    }
  ]

  const contractInfoDataCount0 = {}

  const contractInfoDataNotNumberN = {
    contractId: '87654321-fbe6-4864-a866-7a3ce9aa517e',
    tenantId: tenantId,
    numberN: '',
    contractStatus: constantsDefine.statusConstants.contractStatusNewContractReceive,
    deleteFlag: false,
    createdAt: '2021-07-09T04:30:00.000Z',
    updatedAt: '2021-07-09T04:30:00.000Z'
  }

  const contractInfoData = {
    contractId: '87654321-fbe6-4864-a866-7a3ce9aa517e',
    tenantId: tenantId,
    numberN: '1234567890',
    contractStatus: constantsDefine.statusConstants.contractStatusNewContractReceive,
    deleteFlag: false,
    createdAt: '2021-07-09T04:30:00.000Z',
    updatedAt: '2021-07-09T04:30:00.000Z'
  }

  const contractInfoDataUpdated = {
    contractId: '87654321-fbe6-4864-a866-7a3ce9aa517e',
    tenantId: tenantId,
    numberN: '1234567890',
    contractStatus: constantsDefine.statusConstants.contractStatusCancellationOrder,
    deleteFlag: false,
    createdAt: '2021-07-09T04:30:00.000Z',
    updatedAt: '2021-07-09T04:30:00.000Z'
  }

  describe('findContractsBytenantId', () => {
    test('正常： 契約情報配列を返す', async () => {
      findAllSpy.mockResolvedValue(normalContracts)

      const contracts = await contractController.findContractsBytenantId(tenantId)

      expect(contracts).toEqual(normalContracts)
    })

    test('正常：データ０件', async () => {
      findAllSpy.mockReturnValueOnce([])

      const contracts = await contractController.findContractsBytenantId(tenantId)

      expect(contracts.length).toEqual(0)
    })

    test('準正常: DBエラー時', async () => {
      const dbError = new Error('DB error mock')
      findAllSpy.mockImplementation(() => new Promise((resolve, reject) => reject(dbError)))

      const contracts = await contractController.findContractsBytenantId(tenantId)

      expect(errorSpy).toHaveBeenCalledWith({ user: tenantId, stack: expect.anything(), status: 0 }, expect.anything())
      expect(contracts).toEqual(null)
    })
  })

  describe('findOne', () => {
    test('正常：N番なし', async () => {
      // 準備
      // DBからの正常契約情報の取得を想定する
      findOneSpy.mockReturnValueOnce(contractInfoDataNotNumberN)

      // 試験実施
      const result = await contractController.findOne(tenantId)

      // 期待結果
      // 想定した契約情報がReturnされていること
      expect(result).toEqual(contractInfoDataNotNumberN)
    })

    test('正常：N番あり', async () => {
      // 準備
      // DBからの正常契約情報の取得を想定する
      findOneSpy.mockReturnValueOnce(contractInfoData)

      // 試験実施
      const result = await contractController.findOne(tenantId)

      // 期待結果
      // 想定した契約情報がReturnされていること
      expect(result).toEqual(contractInfoData)
    })

    test('正常：データ０件', async () => {
      // 準備
      // DBから取得したデータが「０件」を想定する
      findOneSpy.mockReturnValueOnce(contractInfoDataCount0)

      // 試験実施
      const result = await contractController.findOne(tenantId)

      // 期待結果
      // 想定した契約情報がReturnされていること
      expect(result).toEqual(contractInfoDataCount0)
      expect(result.length).toEqual(undefined)
    })

    test('status 0のErrorログ: DBエラー時', async () => {
      // 準備
      // 1回目のアクセストークンによるアクセスは401エラーを想定する
      const dbError = new Error('DB error mock')
      findOneSpy.mockImplementation(() => {
        throw dbError
      })

      // 試験実施
      const result = await contractController.findOne(tenantId)

      // 期待結果
      expect(errorSpy).toHaveBeenCalledWith({ user: tenantId, stack: expect.anything(), status: 0 }, expect.anything())
      // DBErrorが返されること
      expect(result).toEqual(new Error('DB error mock'))
    })
  })

  describe('findContract', () => {
    test('正常：N番なし', async () => {
      // 準備
      // DBからの正常契約情報の取得を想定する
      findContractSpy.mockReturnValueOnce(contractInfoDataNotNumberN)

      // 試験実施
      const result = await contractController.findContract(
        { tenantId: 'tenantId', deleteFlag: false },
        'createdAt DESC'
      )

      // 期待結果
      // 想定した契約情報がReturnされていること
      expect(result).toEqual(contractInfoDataNotNumberN)
    })

    test('正常：N番あり', async () => {
      // 準備
      // DBからの正常契約情報の取得を想定する
      findOneSpy.mockReturnValueOnce(contractInfoData)

      // 試験実施
      const result = await contractController.findContract(
        { tenantId: 'tenantId', deleteFlag: false },
        'createdAt DESC'
      )

      // 期待結果
      // 想定した契約情報がReturnされていること
      expect(result).toEqual(contractInfoData)
    })

    test('正常：データ０件', async () => {
      // 準備
      // DBから取得したデータが「０件」を想定する
      findOneSpy.mockReturnValueOnce(contractInfoDataCount0)

      // 試験実施
      const result = await contractController.findContract(
        { tenantId: 'tenantId', deleteFlag: false },
        'createdAt DESC'
      )

      // 期待結果
      // 想定した契約情報がReturnされていること
      expect(result).toEqual(contractInfoDataCount0)
      expect(result.length).toEqual(undefined)
    })

    test('status 0のErrorログ: DBエラー時', async () => {
      // 準備
      // 1回目のアクセストークンによるアクセスは401エラーを想定する
      const dbError = new Error('DB error mock')
      findOneSpy.mockImplementation(() => {
        throw dbError
      })

      // 試験実施
      const result = await contractController.findContract({ tenantId: 'tenantId', deleteFlag: false }, 'createdAt DESC')
      // 期待結果
      // DBErrorが返されること
      expect(result).toEqual(new Error('DB error mock'))
    })
  })

  describe('updateStatus', () => {
    test('正常：正常にupdateできる', async () => {
      // 準備
      const contractId = '87654321-fbe6-4864-a866-7a3ce9aa517e'
      const orderType = constantsDefine.statusConstants.contractStatusCancellationOrder
      // DBからの正常契約情報の取得を想定する
      updateSpy.mockReturnValueOnce(contractInfoDataUpdated)

      // 試験実施
      const result = await contractController.updateStatus(
        contractId,
        orderType
      )

      // 期待結果
      // 想定した契約情報がReturnされていること
      expect(result).toEqual(contractInfoDataUpdated)
    })

    test('status 0のErrorログ: DBエラー時', async () => {
      // 準備
      const contractId = '87654321-fbe6-4864-a866-7a3ce9aa517e'
      const orderType = constantsDefine.statusConstants.contractStatusCancellationOrder
      // 1回目のアクセストークンによるアクセスは401エラーを想定する
      const dbError = new Error('DB error mock')
      updateSpy.mockImplementation(() => {
        throw dbError
      })

      // 試験実施
      const result = await contractController.updateStatus(
        contractId,
        orderType
      )
      // 期待結果
      // DBErrorが返されること
      expect(result).toEqual(dbError)
    })
  })
})
