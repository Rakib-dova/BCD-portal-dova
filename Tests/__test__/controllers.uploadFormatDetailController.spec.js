'use strict'
jest.mock('../../Application/models')
jest.mock('../../Application/lib/logger')

const uploadFormatDetailController = require('../../Application/controllers/uploadFormatDetailController')
const uploadFormatController = require('../../Application/controllers/uploadFormatController')
const logger = require('../../Application/lib/logger')
const UploadFormatDetail = require('../../Application/models').UploadFormatDetail

let errorSpy, tenantId, contractId, uploadFormatId, findOneSpy, findUploadFormatSpy, infoSpy, createSpy

describe('uploadFormatDetailControllerのテスト', () => {
  beforeEach(() => {
    createSpy = jest.spyOn(UploadFormatDetail, 'create')
    findOneSpy = jest.spyOn(UploadFormatDetail, 'findOne')
    findUploadFormatSpy = jest.spyOn(uploadFormatController, 'findUploadFormat')
    errorSpy = jest.spyOn(logger, 'error')
    infoSpy = jest.spyOn(logger, 'info')
  })
  afterEach(() => {
    createSpy.mockRestore()
    findOneSpy.mockRestore()
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
})