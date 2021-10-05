'use strict'
jest.mock('../../Application/models')
jest.mock('../../Application/lib/logger')

const uploadFormatDetailController = require('../../Application/controllers/uploadFormatDetailController')
const uploadFormatController = require('../../Application/controllers/uploadFormatController')
const logger = require('../../Application/lib/logger')
const UploadFormatDetail = require('../../Application/models').UploadFormatDetail

let errorSpy, tenantId, contractId, uploadFormatId, findOneSpy, findAllSpy, findUploadFormatSpy, infoSpy, createSpy

describe('uploadFormatDetailControllerのテスト', () => {
  beforeEach(() => {
    createSpy = jest.spyOn(UploadFormatDetail, 'create')
    findOneSpy = jest.spyOn(UploadFormatDetail, 'findOne')
    findAllSpy = jest.spyOn(UploadFormatDetail, 'findAll')
    findUploadFormatSpy = jest.spyOn(uploadFormatController, 'findUploadFormat')
    errorSpy = jest.spyOn(logger, 'error')
    infoSpy = jest.spyOn(logger, 'info')
  })
  afterEach(() => {
    createSpy.mockRestore()
    findOneSpy.mockRestore()
    findAllSpy.mockRestore()
    findUploadFormatSpy.mockRestore()
    errorSpy.mockRestore()
    infoSpy.mockRestore()
  })
  tenantId = '12345678-bdac-4195-80b9-1ea64b8cb70c'
  contractId = '87654321-fbe6-4864-a866-7a3ce9aa517e'
  uploadFormatId = '55555555-fbe6-4864-a866-7a3ce9aa517e'

  const findUploadFormatResult = {
    dataValues: {
      uploadFormatId: uploadFormatId,
      contractId: contractId,
      setName: 'uploadFormatName',
      uploadType: '',
      createdAt: '2021-07-09T04:30:00.000Z',
      updatedAt: '2021-07-09T04:30:00.000Z'
    }
  }

  const uploadFormatDetailData = {
    uploadFormatId: uploadFormatId,
    serialNumber: 15245,
    uploadFormatItemName: 'aa',
    uploadFormatNumber: 1,
    defaultItemName: 'bbb',
    defaultNumber: 0
  }

  const uploadFormatDetailDataNotUploadFormatId = {
    serialNumber: 15245,
    uploadFormatItemName: 'aa',
    uploadFormatNumber: 1,
    defaultItemName: 'bbb',
    defaultNumber: 0
  }

  const findAllResult = [
    {
      uploadFormatId: uploadFormatId,
      serialNumber: '1',
      uploadFormatItemName: '発行日',
      uploadFormatNumber: '1',
      defaultItemName: '発行日',
      defaultNumber: '0',
      createdAt: '2021-07-09T04:30:00.000Z',
      updatedAt: '2021-07-09T04:30:00.000Z'
    },
    {
      uploadFormatId: uploadFormatId,
      serialNumber: '2',
      uploadFormatItemName: '請求書番号',
      uploadFormatNumber: '0',
      defaultItemName: '請求書番号',
      defaultNumber: '1',
      createdAt: '2021-07-09T04:30:00.000Z',
      updatedAt: '2021-07-09T04:30:00.000Z'
    },
    {
      uploadFormatId: uploadFormatId,
      serialNumber: '3',
      uploadFormatItemName: 'テナントID',
      uploadFormatNumber: '2',
      defaultItemName: 'テナントID',
      defaultNumber: '2',
      createdAt: '2021-07-09T04:30:00.000Z',
      updatedAt: '2021-07-09T04:30:00.000Z'
    },
    {
      uploadFormatId: uploadFormatId,
      serialNumber: '4',
      uploadFormatItemName: '明細-項目ID',
      uploadFormatNumber: '12',
      defaultItemName: '明細-項目ID',
      defaultNumber: '12',
      createdAt: '2021-07-09T04:30:00.000Z',
      updatedAt: '2021-07-09T04:30:00.000Z'
    },
    {
      uploadFormatId: uploadFormatId,
      serialNumber: '5',
      uploadFormatItemName: '明細-内容',
      uploadFormatNumber: '13',
      defaultItemName: '明細-内容',
      defaultNumber: '13',
      createdAt: '2021-07-09T04:30:00.000Z',
      updatedAt: '2021-07-09T04:30:00.000Z'
    },
    {
      uploadFormatId: uploadFormatId,
      serialNumber: '6',
      uploadFormatItemName: '明細-数量',
      uploadFormatNumber: '14',
      defaultItemName: '明細-数量',
      defaultNumber: '14',
      createdAt: '2021-07-09T04:30:00.000Z',
      updatedAt: '2021-07-09T04:30:00.000Z'
    },
    {
      uploadFormatId: uploadFormatId,
      serialNumber: '7',
      uploadFormatItemName: '明細-単位',
      uploadFormatNumber: '15',
      defaultItemName: '明細-単位',
      defaultNumber: '15',
      createdAt: '2021-07-09T04:30:00.000Z',
      updatedAt: '2021-07-09T04:30:00.000Z'
    },
    {
      uploadFormatId: uploadFormatId,
      serialNumber: '8',
      uploadFormatItemName: '明細-単価',
      uploadFormatNumber: '16',
      defaultItemName: '明細-単価',
      defaultNumber: '16',
      createdAt: '2021-07-09T04:30:00.000Z',
      updatedAt: '2021-07-09T04:30:00.000Z'
    },
    {
      uploadFormatId: uploadFormatId,
      serialNumber: '9',
      uploadFormatItemName: '明細-税（消費税／軽減税率／不課税／免税／非課税）',
      uploadFormatNumber: '17',
      defaultItemName: '明細-税（消費税／軽減税率／不課税／免税／非課税）',
      defaultNumber: '17',
      createdAt: '2021-07-09T04:30:00.000Z',
      updatedAt: '2021-07-09T04:30:00.000Z'
    }
  ]

  describe('insert', () => {
    test('正常', async () => {
      // 準備
      findUploadFormatSpy.mockReturnValue(findUploadFormatResult)
      createSpy.mockReturnValue({
        ...uploadFormatDetailData
      })

      // 試験実施
      const result = await uploadFormatDetailController.insert(uploadFormatDetailData)

      // 期待結果
      // 想定したデータがReturnされていること
      expect(result).toEqual(uploadFormatDetailData)
    })

    test('異常：uploadFormatIdなし', async () => {
      // 準備
      const dbError = new Error('DB error mock')
      findUploadFormatSpy.mockImplementation(() => {
        throw dbError
      })

      // 試験実施
      const result = await uploadFormatDetailController.insert(uploadFormatDetailDataNotUploadFormatId)

      // 期待結果
      // 想定したデータがReturnされていること
      expect(result).toEqual(undefined)
    })

    test('異常：uploadFormatIdエラー', async () => {
      // 準備
      findUploadFormatSpy.mockReturnValue(null)
      createSpy.mockReturnValue({
        ...uploadFormatDetailData
      })

      // 試験実施
      const result = await uploadFormatDetailController.insert(uploadFormatDetailData)

      // 期待結果
      // 想定したデータがReturnされていること
      expect(result).toEqual(undefined)
    })

    test('異常：UploadFormatDetail.create（DB）エラー', async () => {
      // 準備
      findUploadFormatSpy.mockReturnValue(findUploadFormatResult)
      const dbError = new Error('DB error mock')
      createSpy.mockImplementation(() => {
        throw dbError
      })

      // 試験実施
      const result = await uploadFormatDetailController.insert(uploadFormatDetailData)

      // 期待結果
      // undefinedが返されること
      expect(result).toEqual(undefined)
    })
  })

  describe('findByUploadFormatId', () => {
    test('正常', async () => {
      // 準備
      findAllSpy.mockReturnValue(findAllResult)

      // 試験実施
      const result = await uploadFormatDetailController.findByUploadFormatId(uploadFormatId)
      // 期待結果
      // 想定したデータがReturnされていること
      expect(result).toEqual(findAllResult)
    })

    test('異常：uploadFormat.findAll（DB）エラー', async () => {
      // 準備
      // DBエラーを想定する
      const dbError = new Error('DB error mock')
      findAllSpy.mockImplementation(() => {
        throw dbError
      })
      // 試験実施
      const result = await uploadFormatController.findByContractId(contractId)

      // 期待結果
      // undefinedが返されること
      expect(result).toEqual(dbError)
    })
  })
})
