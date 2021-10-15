'use strict'

jest.mock('../../Application/models')
jest.mock('../../Application/lib/logger')

const uploadFormatListController = require('../../Application/controllers/uploadFormatListController')
const logger = require('../../Application/lib/logger')
const uploadFormat = require('../../Application/models').UploadFormat

let errorSpy, tenantId, contractId, getUploadFormatListSpy

describe('uploadFormatListControllerのテスト', () => {
  beforeEach(() => {
    getUploadFormatListSpy = jest.spyOn(uploadFormat, 'getUploadFormatList')
    errorSpy = jest.spyOn(logger, 'error')
  })
  afterEach(() => {
    getUploadFormatListSpy.mockRestore()
    errorSpy.mockRestore()
  })

  tenantId = '12345678-bdac-4195-80b9-1ea64b8cb70c'
  contractId = '87654321-fbe6-4864-a866-7a3ce9aa517e'

  // DB検索結果が1件の場合
  const findOneResult = [
    {
      uploadFormatId: 'abc54321-fe0c-98qw-076c-7b88d12cfc01',
      contractId: contractId,
      setName: 'UT1',
      uploadType: '請求書データ',
      createdAt: new Date('2021-01-25T08:50:49.803Z'),
      updatedAt: new Date('2021-01-25T08:50:49.803Z')
    }
  ]

  // DB検索結果が4件の場合
  const findFourResult = [
    {
      uploadFormatId: 'abc54321-fe0c-98qw-076c-7b88d12cfc01',
      contractId: contractId,
      setName: 'UT1',
      itemRowNo: 1,
      dataStartRowNo: 2,
      uploadType: '請求書データ',
      createdAt: new Date('2021-01-25T08:50:49.803Z'),
      updatedAt: new Date('2021-01-25T08:50:49.803Z')
    },
    {
      uploadFormatId: 'abc54321-fe0c-98qw-076c-7b88d12cfc02',
      contractId: contractId,
      setName: 'UT2',
      itemRowNo: 2,
      dataStartRowNo: 3,
      uploadType: '請求書データ',
      createdAt: new Date('2021-01-25T08:49:49.803Z'),
      updatedAt: new Date('2021-01-25T08:49:49.803Z')
    },
    {
      uploadFormatId: 'abc54321-fe0c-98qw-076c-7b88d12cfc03',
      contractId: contractId,
      setName: 'UT3',
      itemRowNo: 1,
      dataStartRowNo: 2,
      uploadType: '請求書データ',
      createdAt: new Date('2021-01-25T08:48:49.803Z'),
      updatedAt: new Date('2021-01-25T08:48:49.803Z')
    },
    {
      uploadFormatId: 'abc54321-fe0c-98qw-076c-7b88d12cfc04',
      contractId: contractId,
      setName: 'UT4',
      itemRowNo: 3,
      dataStartRowNo: 4,
      uploadType: '請求書データ',
      createdAt: new Date('2021-01-25T08:47:49.803Z'),
      updatedAt: new Date('2021-01-25T08:47:49.803Z')
    }
  ]

  // DB検索結果が100件の場合
  const findOneHundredResult = []

  for (let idx = 1; idx < 101; idx++) {
    findOneHundredResult.push({
      uploadFormatId: `abc54321-fe0c-98qw-076c-7b88d12cfc0${idx}`,
      contractId: contractId,
      setName: `UT${idx}`,
      itemRowNo: 1,
      dataStartRowNo: 2,
      uploadType: '請求書データ',
      createdAt: new Date('2021-10-15T08:47:49.803Z'),
      updatedAt: new Date('2021-10-15T08:47:49.803Z')
    })
  }

  // 1件の場合、return値
  const findReturnOne = [
    {
      No: 1,
      setName: 'UT1',
      updatedAt: '2021/01/25',
      uploadType: '請求書データ',
      uuid: 'abc54321-fe0c-98qw-076c-7b88d12cfc01'
    }
  ]

  // 4件の場合、return値
  const findReturnFour = [
    {
      No: 1,
      setName: 'UT1',
      updatedAt: '2021/01/25',
      uploadType: '請求書データ',
      uuid: 'abc54321-fe0c-98qw-076c-7b88d12cfc01'
    },
    {
      No: 2,
      setName: 'UT2',
      updatedAt: '2021/01/25',
      uploadType: '請求書データ',
      uuid: 'abc54321-fe0c-98qw-076c-7b88d12cfc02'
    },
    {
      No: 3,
      setName: 'UT3',
      updatedAt: '2021/01/25',
      uploadType: '請求書データ',
      uuid: 'abc54321-fe0c-98qw-076c-7b88d12cfc03'
    },
    {
      No: 4,
      setName: 'UT4',
      updatedAt: '2021/01/25',
      uploadType: '請求書データ',
      uuid: 'abc54321-fe0c-98qw-076c-7b88d12cfc04'
    }
  ]

  // 100件の場合、return値
  const uploadFormatListArrOneHundred = []

  for (let idx = 1; idx < 101; idx++) {
    uploadFormatListArrOneHundred.push({
      No: idx,
      setName: `UT${idx}`,
      updatedAt: '2021/10/15',
      uploadType: '請求書データ',
      uuid: `abc54321-fe0c-98qw-076c-7b88d12cfc0${idx}`
    })
  }

  describe('getFormatList', () => {
    test('正常:1件', async () => {
      // 準備
      getUploadFormatListSpy.mockReturnValue(findOneResult)

      // 試験実施
      const result = await uploadFormatListController.getFormatList(tenantId)

      // 期待結果
      // 想定したデータがReturnされていること
      expect(result).toEqual(findReturnOne)
    })

    test('正常:4件', async () => {
      // 準備
      getUploadFormatListSpy.mockReturnValue(findFourResult)

      // 試験実施
      const result = await uploadFormatListController.getFormatList(tenantId)

      // 期待結果
      // 想定したデータがReturnされていること
      expect(result).toEqual(findReturnFour)
    })

    test('正常:0件', async () => {
      // 準備
      getUploadFormatListSpy.mockReturnValue([])

      // 試験実施
      const result = await uploadFormatListController.getFormatList(tenantId)

      // 期待結果
      // 想定したデータがReturnされていること
      expect(result).toEqual([])
    })

    test('正常:100件', async () => {
      // 準備
      getUploadFormatListSpy.mockReturnValue(findOneHundredResult)

      // 試験実施
      const result = await uploadFormatListController.getFormatList(tenantId)

      // 期待結果
      // 想定したデータがReturnされていること
      expect(result).toEqual(uploadFormatListArrOneHundred)
    })

    test('異常：uploadFormatListController.getFormatList（DB）エラー', async () => {
      // 準備
      const dbError = new Error('DB error mock')
      getUploadFormatListSpy.mockReturnValue(dbError)

      // 試験実施
      const result = await uploadFormatListController.getFormatList(tenantId)

      // 期待結果
      // エラーデータがReturnされていること
      expect(result).toEqual(dbError)
      // エラーログが表示されること
      expect(errorSpy).toHaveBeenCalledWith(dbError)
    })
  })
})
