'use strict'
jest.mock('../../Application/lib/logger')

const pdfInvoiceHistoryController = require('../../Application/controllers/pdfInvoiceHistoryController')
const logger = require('../../Application/lib/logger')
const pdfInvoiceHistory = require('../../Application/models').pdfInvoiceHistory
const pdfInvoiceHistoryDetail = require('../../Application/models').pdfInvoiceHistoryDetail
const Sequelize = require('../../Application/models').Sequelize
const Op = Sequelize.Op

let infoSpy, errorSpy
let createSpy, updateCountSpy, findAllSpy
let createDetailSpy

describe('contractControllerのテスト', () => {
  beforeEach(() => {
    infoSpy = jest.spyOn(logger, 'info')
    errorSpy = jest.spyOn(logger, 'error')
    createSpy = jest.spyOn(pdfInvoiceHistory, 'create')
    updateCountSpy = jest.spyOn(pdfInvoiceHistory, 'update')
    findAllSpy = jest.spyOn(pdfInvoiceHistory, 'findAll')
    createDetailSpy = jest.spyOn(pdfInvoiceHistoryDetail, 'create')
  })
  afterEach(() => {
    infoSpy.mockRestore()
    errorSpy.mockRestore()
    createSpy.mockRestore()
    updateCountSpy.mockRestore()
    findAllSpy.mockRestore()
    createDetailSpy.mockRestore()
  })

  describe('createUploadHistoryAndRows', () => {
    test('正常', async () => {
      createSpy.mockReturnValue(1)
      createDetailSpy.mockResolvedValue(new Promise((resolve) => resolve()))

      // 試験実施
      const result = await pdfInvoiceHistoryController.createUploadHistoryAndRows(
        { id: 'dummyHistory' },
        [{ id: 'dummyDetail_1' }, { id: 'dummyDetail_2' }, { id: 'dummyDetail_3' }],
        ['dummmy']
      )
      // 期待結果
      expect(result).toEqual(1)
      expect(createSpy).nthCalledWith(1, { id: 'dummyHistory' }, { transaction: ['dummmy'] })
      expect(createDetailSpy).nthCalledWith(1, { id: 'dummyDetail_1' }, { transaction: ['dummmy'] })
      expect(createDetailSpy).nthCalledWith(2, { id: 'dummyDetail_2' }, { transaction: ['dummmy'] })
      expect(createDetailSpy).nthCalledWith(3, { id: 'dummyDetail_3' }, { transaction: ['dummmy'] })
    })
    test('準正常：履歴情報なし', async () => {
      // 試験実施
      const result = await pdfInvoiceHistoryController.createUploadHistoryAndRows(
        {},
        [{ id: 'dummyDetail_1' }, { id: 'dummyDetail_2' }, { id: 'dummyDetail_3' }],
        ['dummmy']
      )
      // 期待結果
      expect(result).toEqual(null)
    })
    test('準正常：トランザクションなし', async () => {
      // 試験実施
      let result = await pdfInvoiceHistoryController.createUploadHistoryAndRows({}, [
        { id: 'dummyDetail_1' },
        { id: 'dummyDetail_2' },
        { id: 'dummyDetail_3' }
      ])
      // 期待結果
      expect(result).toEqual(null)

      // 試験実施
      result = await pdfInvoiceHistoryController.createUploadHistoryAndRows(
        {},
        [{ id: 'dummyDetail_1' }, { id: 'dummyDetail_2' }, { id: 'dummyDetail_3' }],
        null
      )
      // 期待結果
      expect(result).toEqual(null)

      // 試験実施
      result = await pdfInvoiceHistoryController.createUploadHistoryAndRows(
        {},
        [{ id: 'dummyDetail_1' }, { id: 'dummyDetail_2' }, { id: 'dummyDetail_3' }],
        ''
      )
      // 期待結果
      expect(result).toEqual(null)

      // 試験実施
      result = await pdfInvoiceHistoryController.createUploadHistoryAndRows(
        {},
        [{ id: 'dummyDetail_1' }, { id: 'dummyDetail_2' }, { id: 'dummyDetail_3' }],
        0
      )
      // 期待結果
      expect(result).toEqual(null)

      // 試験実施
      result = await pdfInvoiceHistoryController.createUploadHistoryAndRows(
        {},
        [{ id: 'dummyDetail_1' }, { id: 'dummyDetail_2' }, { id: 'dummyDetail_3' }],
        false
      )
      // 期待結果
      expect(result).toEqual(null)
    })

    test('異常：createエラー', async () => {
      const dbError = new Error('DB error mock')
      createSpy.mockImplementation(() => {
        throw dbError
      })

      // 試験実施
      const result = await pdfInvoiceHistoryController.createUploadHistoryAndRows(
        { id: 'dummyHistory' },
        [{ id: 'dummyDetail_1' }, { id: 'dummyDetail_2' }, { id: 'dummyDetail_3' }],
        ['dummmy']
      )
      expect(result).toEqual(dbError)
    })
    test('異常：detailCreateエラー', async () => {
      const dbError = new Error('DB error mock')
      createSpy.mockResolvedValue(new Promise((resolve) => resolve()))
      createDetailSpy.mockImplementation(() => {
        throw dbError
      })

      // 試験実施
      const result = await pdfInvoiceHistoryController.createUploadHistoryAndRows(
        { id: 'dummyHistory' },
        [{ id: 'dummyDetail_1' }, { id: 'dummyDetail_2' }, { id: 'dummyDetail_3' }],
        ['dummmy']
      )
      // 期待結果
      expect(result).toEqual(dbError)
    })
  })
  describe('updateCount', () => {
    test('正常', async () => {
      updateCountSpy.mockReturnValue(1)

      // 試験実施
      const result = await pdfInvoiceHistoryController.updateCount({
        historyId: 'dummy_historyId',
        successCount: 1,
        failCount: 2,
        skipCount: 3,
        invoiceCount: 6
      })

      // 期待結果
      expect(result).toEqual(1)
      expect(updateCountSpy).nthCalledWith(
        1,
        {
          successCount: 1,
          failCount: 2,
          skipCount: 3,
          invoiceCount: 6
        },
        {
          where: {
            historyId: 'dummy_historyId'
          }
        }
      )
    })

    test('異常：DBエラーの場合', async () => {
      const dbError = new Error('DB error mock')
      updateCountSpy.mockImplementation(() => {
        throw dbError
      })

      // 試験実施
      const result = await pdfInvoiceHistoryController.updateCount({
        historyId: 'dummy_historyId',
        successCount: 1,
        failCount: 2,
        skipCount: 3,
        invoiceCount: 6
      })

      // 期待結果
      expect(result).toEqual(dbError)
    })
  })

  describe('findforTenant', () => {
    const mockDate = new Date()
    const dateSpy = jest.spyOn(global, 'Date').mockImplementation(() => mockDate)

    test('正常', async () => {
      findAllSpy.mockReturnValue('invoiceFindAllReturn')

      // 試験実施
      const result = await pdfInvoiceHistoryController.findforTenant('dummyTenantId')

      // 期待結果
      expect(dateSpy).toHaveBeenCalled()
      expect(result).toEqual('invoiceFindAllReturn')
      expect(findAllSpy).nthCalledWith(1, {
        where: {
          tenantId: 'dummyTenantId',
          createdAt: {
            [Op.between]: [mockDate, mockDate]
          }
        },
        order: [['createdAt', 'DESC']]
      })
    })
    test('異常：DBエラーの場合', async () => {
      // 準備
      // DBエラーを想定する
      const dbError = new Error('DB error mock')
      findAllSpy.mockImplementation(() => {
        throw dbError
      })
      // 試験実施
      const result = await pdfInvoiceHistoryController.findforTenant('dummyTenantId')

      // 期待結果
      expect(result).toEqual(dbError)
    })
  })
})
