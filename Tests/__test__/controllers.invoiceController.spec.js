'use strict'
jest.mock('../../Application/models')
jest.mock('../../Application/lib/logger')

const invoiceController = require('../../Application/controllers/invoiceController')
const tenantController = require('../../Application/controllers/tenantController')
const constantsDefine = require('../../Application/constants')
const logger = require('../../Application/lib/logger')
const Invoice = require('../../Application/models').Invoice
const { v4: uuidv4 } = require('uuid')

let errorSpy, tenantId, csvFileName, invoiceID, findOneSpy, infoSpy, createSpy, invoiceFindOneSpy, updateSpy, invoiceFindAllSpy
describe('contractControllerのテスト', () => {
  beforeEach(() => {
    createSpy = jest.spyOn(Invoice, 'create')
    invoiceFindOneSpy = jest.spyOn(Invoice, 'findOne')
    invoiceFindAllSpy = jest.spyOn(Invoice, 'findAll')
    findOneSpy = jest.spyOn(tenantController, 'findOne')
    errorSpy = jest.spyOn(logger, 'error')
    infoSpy = jest.spyOn(logger, 'info')
    updateSpy = jest.spyOn(Invoice, 'update')
  })
  afterEach(() => {
    invoiceFindOneSpy.mockRestore()
    invoiceFindAllSpy.mockRestore()
    createSpy.mockRestore()
    findOneSpy.mockRestore()
    errorSpy.mockRestore()
    infoSpy.mockRestore()
    updateSpy.mockRestore()
  })
  tenantId = '12345678-bdac-4195-80b9-1ea64b8cb70c'
  csvFileName = 'test.csv'
  invoiceID = uuidv4()

  const insertFunctionName = 'invoiceController.insert'

  const createReturn = {
    dataValues: {
      invoicesId: invoiceID,
      tenantId: '12345678-bdac-4195-80b9-1ea64b8cb70c',
      csvFileName: 'test.csv',
      successCount: -1,
      failCount: -1,
      skipCount: -1,
      updatedAt: '2021-08-26T09:53:57.555Z',
      createdAt: '2021-08-26T09:53:57.555Z'
    }
  }

  const invoiceFindOnReturn = {
    dataValues: {
      invoicesId: invoiceID,
      tenantId: '12345678-bdac-4195-80b9-1ea64b8cb70c',
      csvFileName: 'test.csv',
      successCount: -1,
      failCount: -1,
      skipCount: -1,
      createdAt: '2021-08-26T10:17:38.838Z',
      updatedAt: '2021-08-26T10:17:38.838Z'
    }
  }

  const invoiceFindAllReturn = {
    dataValues: {
      invoicesId: invoiceID,
      tenantId: '12345678-bdac-4195-80b9-1ea64b8cb70c',
      csvFileName: 'test.csv',
      successCount: -1,
      failCount: -1,
      skipCount: -1,
      createdAt: '2021-08-26T10:17:38.838Z',
      updatedAt: '2021-08-26T10:17:38.838Z'
    }
  }

  const findOneReturn = {
    dataValues: {
      tenantId: '12345678-bdac-4195-80b9-1ea64b8cb70c',
      customerId: null,
      deleteFlag: false,
      createdAt: '2021-08-19T02:46:35.480Z',
      updatedAt: '2021-08-19T02:46:35.480Z'
    }
  }

  const invoiceInfoData = {
    invoicesId: invoiceID,
    tenantId: tenantId,
    csvFileName: csvFileName,
    successCount: -1,
    failCount: -1,
    skipCount: -1
  }

  const invoiceInfoDataNonTenants = {
    invoicesId: invoiceID,
    tenantId: undefined,
    csvFileName: csvFileName,
    successCount: -1,
    failCount: -1,
    skipCount: -1
  }

  const updateCountReturn = {
    statuscode: 200,
    value: 'success',
    dataValues: {
      createdAt: '2021-08-26T09:53:57.555Z',
      csvFileName: 'test.csv',
      failCount: -1,
      invoicesId: '7345ba12-ccd2-4a46-9f70-6dc22fa3a8b3',
      skipCount: -1,
      successCount: -1,
      tenantId: '12345678-bdac-4195-80b9-1ea64b8cb70c',
      updatedAt: '2021-08-26T09:53:57.555Z'
    }
  }

  const updateCountValue = {
    statuscode: 200,
    value: 'success',
    dataValues: {
      createdAt: '2021-08-26T09:53:57.555Z',
      csvFileName: 'test.csv',
      failCount: -1,
      invoicesId: '7345ba12-ccd2-4a46-9f70-6dc22fa3a8b3',
      skipCount: -1,
      successCount: -1,
      tenantId: '12345678-bdac-4195-80b9-1ea64b8cb70c',
      updatedAt: '2021-08-26T09:53:57.555Z'
    }
  }

  const invoiceInfoDataCount0 = {}

  describe('insert', () => {
    test('正常', async () => {
      // 準備
      findOneSpy.mockReturnValue(findOneReturn)
      createSpy.mockReturnValue(createReturn)

      // 試験実施
      const result = await invoiceController.insert(invoiceInfoData)

      // 期待結果
      // 想定したデータがReturnされていること
      expect(result).toEqual(createReturn)
    })

    test('異常：テナントIDなし', async () => {
      // 試験実施
      const result = await invoiceController.insert(invoiceInfoDataNonTenants)

      // 期待結果
      expect(errorSpy).toHaveBeenCalledWith(`${constantsDefine.logMessage.CMMERR000}${insertFunctionName}`)

      // DBErrorが返されること
      expect(result).toEqual(undefined)
    })

    test('異常：テナントIDあり、検索なし', async () => {
      // 準備
      findOneSpy.mockReturnValueOnce(undefined)

      // 試験実施
      const result = await invoiceController.insert(invoiceInfoData)

      // 期待結果
      expect(infoSpy).toHaveBeenCalledWith(`${constantsDefine.logMessage.DBINF000}${insertFunctionName}`)
      // return値がない
      expect(result).toEqual(undefined)
    })

    test('異常：Controllerエラー(tenantController.findOne)', async () => {
      // 準備
      const errorDb = new Error('DB ERROR')
      findOneSpy.mockImplementation(() => {
        throw errorDb
      })

      // 試験実施
      const result = await invoiceController.insert(invoiceInfoData)

      // 期待結果
      expect(errorSpy).toHaveBeenCalledWith({ tenantId: invoiceInfoData.tenantId, stack: errorDb.stack, status: 0 })
      // return値がない
      expect(result).toEqual(undefined)
    })

    test('異常：DBエラー(Invoice.create)', async () => {
      // 準備
      findOneSpy.mockReturnValue(findOneReturn)
      const errorDb = new Error('DB ERROR')
      createSpy.mockImplementation(() => {
        throw errorDb
      })

      // 試験実施
      const result = await invoiceController.insert(invoiceInfoData)

      // 期待結果
      expect(errorSpy).toHaveBeenCalledWith({ tenantId: invoiceInfoData.tenantId, stack: errorDb.stack, status: 0 })
      // return値がない
      expect(result).toEqual(undefined)
    })
  })

  describe('findInvoice', () => {
    test('正常', async () => {
      // 準備
      // DBからの正常データ取得を想定する
      invoiceFindOneSpy.mockReturnValue(invoiceFindOnReturn)

      // 試験実施
      const result = await invoiceController.findInvoice(invoiceID)

      // 期待結果
      // 想定したデータがReturnされていること
      expect(result).toEqual(invoiceFindOnReturn)
    })

    test('正常：データ０件', async () => {
      // 準備
      // DBから取得したデータが「０件」を想定する
      invoiceFindOneSpy.mockReturnValue({})

      // 試験実施
      const result = await invoiceController.findInvoice(invoiceID)

      // 期待結果
      // 想定したデータがReturnされていること
      expect(result).toEqual(invoiceInfoDataCount0)
      expect(result.length).toEqual(undefined)
    })

    test('異常：DBエラーの場合', async () => {
      // 準備
      // DBエラーを想定する
      const dbError = new Error('DB error mock')
      invoiceFindOneSpy.mockImplementation(() => {
        throw dbError
      })
      // 試験実施
      await invoiceController.findInvoice(invoiceID)

      // 期待結果
      // エラーログが表示される
      expect(errorSpy).toHaveBeenCalledWith({ invoicesId: invoiceID, stack: dbError.stack, status: 0 })
    })
  })

  describe('findforTenant', () => {
    test('正常', async () => {
      // 準備
      // DBからの正常データ取得を想定する
      invoiceFindAllSpy.mockReturnValue(invoiceFindAllReturn)

      // 試験実施
      const result = await invoiceController.findforTenant(tenantId)

      // 期待結果
      // 想定したデータがReturnされていること
      expect(result).toEqual(invoiceFindAllReturn)
    })
    test('異常：DBエラーの場合', async () => {
      // 準備
      // DBエラーを想定する
      const dbError = new Error('DB error mock')
      invoiceFindAllSpy.mockImplementation(() => {
        throw dbError
      })
      // 試験実施
      await invoiceController.findforTenant(tenantId)

      // 期待結果
      // エラーログが表示される
      expect(errorSpy).toHaveBeenCalledWith({ tenantId: tenantId, stack: dbError.stack, status: 0 })
    })
  })

  describe('updateCount', () => {
    test('正常', async () => {
      // 準備
      findOneSpy.mockReturnValue(findOneReturn)
      updateSpy.mockReturnValue(updateCountReturn)

      // 試験実施
      const result = await invoiceController.updateCount({
        invoicesId: invoiceID,
        successCount: 1,
        failCount: 1,
        skipCount: 1,
        invoiceCount: 1
      })

      // 期待結果
      // 想定した結果がReturnされていること
      expect(result).toEqual(updateCountValue)
    })

    test('異常：DBエラーの場合', async () => {
      // 準備
      // DBエラーを想定する
      const dbError = new Error('DB error mock')
      Invoice.update = () => {
        throw dbError
      }

      // 試験実施
      await invoiceController.updateCount({
        invoicesId: invoiceID,
        successCount: 1,
        failCount: 1,
        skipCount: 1,
        invoiceCount: 1
      })

      // 期待結果
      // エラーログが表示される
      expect(errorSpy).toHaveBeenCalledWith({ invoicesId: invoiceID, stack: dbError.stack, status: 0 })
    })
  })
})
