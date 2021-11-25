'use strict'
jest.mock('../../Application/models')
jest.mock('../../Application/lib/logger')

const uploadFormatIdentifierController = require('../../Application/controllers/uploadFormatIdentifierController')
const uploadFormatController = require('../../Application/controllers/uploadFormatController')
const logger = require('../../Application/lib/logger')
const UploadFormatIdentifier = require('../../Application/models').UploadFormatIdentifier

let errorSpy, contractId, uploadFormatId, findAllSpy, findUploadFormatSpy, infoSpy, createSpy

describe('uploadFormatIdentifierControllerのテスト', () => {
  beforeEach(() => {
    createSpy = jest.spyOn(UploadFormatIdentifier, 'create')
    findAllSpy = jest.spyOn(UploadFormatIdentifier, 'findAll')
    findUploadFormatSpy = jest.spyOn(uploadFormatController, 'findUploadFormat')
    errorSpy = jest.spyOn(logger, 'error')
    infoSpy = jest.spyOn(logger, 'info')
  })
  afterEach(() => {
    createSpy.mockRestore()
    findAllSpy.mockRestore()
    findUploadFormatSpy.mockRestore()
    errorSpy.mockRestore()
    infoSpy.mockRestore()
  })

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

  const uploadFormatIdentifierData = {
    uploadFormatId: uploadFormatId,
    serialNumber: 15245,
    extensionType: 'aa',
    uploadFormatExtension: 'bb',
    defaultExtension: 'cc'
  }

  const uploadFormatIdentifierDataNotUploadFormatId = {
    serialNumber: 15245,
    extensionType: 'aa',
    uploadFormatExtension: 'bb',
    defaultExtension: 'cc'
  }

  const uploadFormatIdentifierResult = [
    {
      uploadFormatId: uploadFormatId,
      serialNumber: '1',
      extensionType: '0',
      uploadFormatExtension: 'tax1',
      defaultExtension: '消費税',
      createdAt: '2021-07-09T04:30:00.000Z',
      updatedAt: '2021-07-09T04:30:00.000Z'
    },
    {
      uploadFormatId: uploadFormatId,
      serialNumber: '2',
      extensionType: '0',
      uploadFormatExtension: 'tax2',
      defaultExtension: '消費税',
      createdAt: '2021-07-09T04:30:00.000Z',
      updatedAt: '2021-07-09T04:30:00.000Z'
    },
    {
      uploadFormatId: uploadFormatId,
      serialNumber: '6',
      extensionType: '1',
      uploadFormatExtension: 'unit1',
      defaultExtension: '人月',
      createdAt: '2021-07-09T04:30:00.000Z',
      updatedAt: '2021-07-09T04:30:00.000Z'
    }
  ]

  describe('insert', () => {
    test('正常', async () => {
      // 準備
      findUploadFormatSpy.mockReturnValue(findUploadFormatResult)
      createSpy.mockReturnValue({
        ...uploadFormatIdentifierData
      })

      // 試験実施
      const result = await uploadFormatIdentifierController.insert(uploadFormatIdentifierData)

      // 期待結果
      // 想定したデータがReturnされていること
      expect(result).toEqual(uploadFormatIdentifierData)
    })

    test('異常：uploadFormatIdなし', async () => {
      // 準備
      const dbError = new Error('DB error mock')
      findUploadFormatSpy.mockImplementation(() => {
        throw dbError
      })

      // 試験実施
      const result = await uploadFormatIdentifierController.insert(uploadFormatIdentifierDataNotUploadFormatId)

      // 期待結果
      // 想定したデータがReturnされていること
      expect(result).toEqual(undefined)
    })

    test('異常：uploadFormatIdエラー', async () => {
      // 準備
      findUploadFormatSpy.mockReturnValue(null)
      createSpy.mockReturnValue({
        ...uploadFormatIdentifierData
      })

      // 試験実施
      const result = await uploadFormatIdentifierController.insert(uploadFormatIdentifierData)

      // 期待結果
      // 想定したデータがReturnされていること
      expect(result).toEqual(undefined)
    })

    test('異常：UploadFormatIdentifier.findAll（DB）エラー', async () => {
      // 準備
      findUploadFormatSpy.mockReturnValue(findUploadFormatResult)
      const dbError = new Error('DB error mock')
      createSpy.mockImplementation(() => {
        throw dbError
      })

      // 試験実施
      const result = await uploadFormatIdentifierController.insert(uploadFormatIdentifierData)

      // 期待結果
      // undefinedが返されること
      expect(result).toEqual(undefined)
    })
  })

  describe('findByUploadFormatId', () => {
    test('正常', async () => {
      // 準備
      findAllSpy.mockReturnValue(uploadFormatIdentifierResult)

      // 試験実施
      const result = await uploadFormatIdentifierController.findByUploadFormatId(uploadFormatId)

      // 期待結果
      // 想定したデータがReturnされていること
      expect(result).toEqual(uploadFormatIdentifierResult)
    })

    test('異常：UploadFormatIdentifier.create（DB）エラー', async () => {
      // 準備
      const dbError = new Error('DB error mock')
      findAllSpy.mockImplementation(() => {
        throw dbError
      })

      // 試験実施
      const result = await uploadFormatIdentifierController.findByUploadFormatId(uploadFormatId)

      // 期待結果
      // errorが返されること
      expect(result).toEqual(dbError)
    })
  })
})
