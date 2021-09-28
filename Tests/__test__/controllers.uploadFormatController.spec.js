'use strict'
jest.mock('../../Application/models')
jest.mock('../../Application/lib/logger')

const uploadFormatController = require('../../Application/controllers/uploadFormatController')
const contractController = require('../../Application/controllers/contractController')
const constantsDefine = require('../../Application/constants')
const logger = require('../../Application/lib/logger')
const UploadFormat = require('../../Application/models').UploadFormat

let errorSpy, tenantId, contractId, uploadFormatId, findOneSpy, findContractSpy, infoSpy, createSpy

describe('uploadFormatControllerのテスト', () => {
  beforeEach(() => {
    createSpy = jest.spyOn(UploadFormat, 'create')
    findOneSpy = jest.spyOn(UploadFormat, 'findOne')
    findContractSpy = jest.spyOn(contractController, 'findContract')
    errorSpy = jest.spyOn(logger, 'error')
    infoSpy = jest.spyOn(logger, 'info')
  })
  afterEach(() => {
    createSpy.mockRestore()
    findOneSpy.mockRestore()
    findContractSpy.mockRestore()
    errorSpy.mockRestore()
    infoSpy.mockRestore()
  })
  tenantId = '12345678-bdac-4195-80b9-1ea64b8cb70c'
  contractId = '87654321-fbe6-4864-a866-7a3ce9aa517e'
  uploadFormatId = '55555555-fbe6-4864-a866-7a3ce9aa517e'

  const findOneReturn = {
    dataValues: {
      contractId: contractId,
      tenantId: tenantId,
      numberN: '1234567890',
      contractStatus: constantsDefine.statusConstants.contractStatusNewContractReceive,
      deleteFlag: false,
      createdAt: '2021-07-09T04:30:00.000Z',
      updatedAt: '2021-07-09T04:30:00.000Z'
    }
  }

  const findOneResult = {
    uploadFormatId: uploadFormatId,
    contractId: contractId,
    setName: 'uploadFormatName',
    uploadType: '',
    createdAt: '2021-07-09T04:30:00.000Z',
    updatedAt: '2021-07-09T04:30:00.000Z'
  }

  const uploadFormatData = {
    contractId: contractId,
    setName: 'uploadFormatName',
    uploadType: ''
  }
  
  const uploadFormatDataNotContractId = {
    contractId: null,
    setName: 'uploadFormatName',
    uploadType: ''
  }

  const uploadFormatDataDifferentContractId = {
    contractId: 'null',
    setName: 'uploadFormatName',
    uploadType: ''
  }


  describe('insert', () => {
    test('正常', async () => {
      // 準備
      findContractSpy.mockReturnValue(findOneReturn)
      createSpy.mockReturnValue({
        ...uploadFormatData,
        contractId: contractId
      })

      // 試験実施
      const result = await uploadFormatController.insert(tenantId, uploadFormatData)

      // 期待結果
      // 想定したデータがReturnされていること
      expect(result).toEqual(uploadFormatData)
    })

    test('異常：ContractIdなし', async () => {
      // 準備
      findContractSpy.mockReturnValue(findOneReturn)
      createSpy.mockReturnValue({
        ...uploadFormatDataNotContractId,
        contractId: contractId
      })

      // 試験実施
      const result = await uploadFormatController.insert(tenantId, null)

      // 期待結果
      // 想定したデータがReturnされていること
      expect(result).toEqual(undefined)
    })

    test('異常：findContract（DB）エラー', async () => {
      // 準備
      const dbError = new Error('DB error mock')
      findContractSpy.mockImplementation(() => {
        throw dbError
      })

      // 試験実施
      const result = await uploadFormatController.insert(tenantId, uploadFormatData)

      // 期待結果
      // undefinedが返されること
      expect(result).toEqual(undefined)
    })

    test('異常：ContractIdエラー', async () => {
      // 準備
      findContractSpy.mockReturnValue(findOneReturn)
      createSpy.mockReturnValue({
        ...uploadFormatData,
        contractId: contractId
      })

      // 試験実施
      const result = await uploadFormatController.insert(tenantId, uploadFormatDataDifferentContractId)

      // 期待結果
      // 想定したデータがReturnされていること
      expect(result).toEqual(undefined)
    })

    test('異常：Upload.create（DB）エラー', async () => {
      // 準備
      findContractSpy.mockReturnValue(findOneReturn)
      const dbError = new Error('DB error mock')
      createSpy.mockImplementation(() => {
        throw dbError
      })

      // 試験実施
      const result = await uploadFormatController.insert(tenantId, uploadFormatData)

      // 期待結果
      // undefinedが返されること
      expect(result).toEqual(undefined)
    })
  })

  describe('findUploadFormat', () => {
    test('正常', async () => {
      // 準備
      findOneSpy.mockReturnValue(findOneResult)
      
      // 試験実施
      const result = await uploadFormatController.findUploadFormat(uploadFormatId)

      // 期待結果
      // 想定したデータがReturnされていること
      expect(result).toEqual(findOneResult)
    })

    test('異常：uploadFormat.findOne（DB）エラー', async () => {
      // 準備
      // DBエラーを想定する
      const dbError = new Error('DB error mock')
      findOneSpy.mockImplementation(() => {
        throw dbError
      })
      // 試験実施
      const result = await uploadFormatController.findUploadFormat(uploadFormatId)

      // 期待結果
      // undefinedが返されること
      expect(result).toEqual(undefined)
    })
  })
})
