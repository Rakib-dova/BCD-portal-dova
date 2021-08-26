'use strict'
jest.mock('../../Application/models')
jest.mock('../../Application/lib/logger')

const invoiceDetailController = require('../../Application/controllers/invoiceDetailController')
const invoiceController = require('../../Application/controllers/invoiceController')
const InvoiceDetail = require('../../Application/models').InvoiceDetail
const logger = require('../../Application/lib/logger')
const constantsDefine = require('../../Application/constants')

let createSpy, errorSpy, findInvoiceSpy, infoSpy
describe('invoiceControllerのテスト', () => {
  beforeEach(() => {
    createSpy = jest.spyOn(InvoiceDetail, 'create')
    findInvoiceSpy = jest.spyOn(invoiceController, 'findInvoice')
    errorSpy = jest.spyOn(logger, 'error')
    infoSpy = jest.spyOn(logger, 'info')
  })
  afterEach(() => {
    createSpy.mockRestore()
    findInvoiceSpy.mockRestore()
    errorSpy.mockRestore()
    infoSpy.mockRestore()
  })

  const functionName = 'invoiceDetailController.insert'

  // パラメータ値
  const value = {
    invoiceDetailId: '2f9afa5f-38dd-4647-b52e-481cfa7da832',
    invoicesId: '344fb8b1-0416-48db-8a1a-17c080192094',
    invoiceId: 'TEST0001',
    lines: 2,
    status: -1,
    errorData: '008、項目数が異なります。'
  }

  const invoicesIdNullValue = {
    invoiceDetailId: '2f9afa5f-38dd-4647-b52e-481cfa7da832',
    invoicesId: null,
    invoiceId: 'TEST0001',
    lines: 2,
    status: -1,
    errorData: '008、項目数が異なります。'
  }

  // createした場合のreturn値
  const resultInvoiceDetail = {
    dataValues: {
      invoiceDetailId: '2f9afa5f-38dd-4647-b52e-481cfa7da832',
      invoicesId: '344fb8b1-0416-48db-8a1a-17c080192094',
      invoiceId: 'TEST0001',
      lines: 2,
      status: '-1',
      errorData: '008、項目数が異なります。',
      updatedAt: '2021-08-26T07:52:57.764Z',
      createdAt: '2021-08-26T07:52:57.764Z'
    }
  }

  // findInvoice結果値
  const resultInvoice = {
    dataValues: {
      invoicesId: '344fb8b1-0416-48db-8a1a-17c080192094',
      tenantId: 'f783be0e-e716-4eab-a7ec-5ce36b3c7b31',
      csvFileName: 'テスト請求書一括作成.csv',
      successCount: -1,
      failCount: -1,
      skipCount: -1,
      createdAt: '2021-08-26T08:01:50.973Z',
      updatedAt: '2021-08-26T08:01:50.973Z'
    }
  }

  const resultInvoiceInvoicesIdNull = {
    dataValues: {
      invoicesId: null,
      tenantId: 'f783be0e-e716-4eab-a7ec-5ce36b3c7b31',
      csvFileName: 'テスト請求書一括作成.csv',
      successCount: -1,
      failCount: -1,
      skipCount: -1,
      createdAt: '2021-08-26T08:01:50.973Z',
      updatedAt: '2021-08-26T08:01:50.973Z'
    }
  }

  describe('findOne', () => {
    test('正常', async () => {
      // 準備
      // DBからの正常データ取得を想定する
      createSpy.mockReturnValue(resultInvoiceDetail)
      findInvoiceSpy.mockReturnValue(resultInvoice)

      // 試験実施
      const result = await invoiceDetailController.insert(value)

      // 期待結果
      // 想定した情報がreturnされる
      expect(result).toEqual(resultInvoiceDetail)
    })

    test('エラー：パラメータInvoiceIdがNullの場合', async () => {
      // 準備
      // DBからの正常データ取得を想定する
      createSpy.mockReturnValue(resultInvoiceDetail)
      findInvoiceSpy.mockReturnValue(resultInvoice)

      // 試験実施
      await invoiceDetailController.insert(invoicesIdNullValue)

      // 期待結果
      // エラーログが出力される
      expect(errorSpy).toHaveBeenCalledWith(`${constantsDefine.logMessage.CMMERR000}${functionName}`)
    })

    test('エラー：DBから取得したInvoiceIdがNullの場合', async () => {
      // 準備
      // DBからのInvoiceInvoicesIdがないデータ取得を想定する
      createSpy.mockReturnValue(resultInvoiceDetail)
      findInvoiceSpy.mockReturnValue(resultInvoiceInvoicesIdNull)

      // 試験実施
      await invoiceDetailController.insert(value)

      // 期待結果
      // エラーログが出力される
      expect(infoSpy).toHaveBeenCalledWith(`${constantsDefine.logMessage.DBINF000}${functionName}`)
    })

    test('エラー：DBエラーの場合', async () => {
      // 準備
      // DBエラーの想定する
      const dbError = new Error('DB error mock')
      createSpy.mockImplementation(() => {
        throw dbError
      })
      findInvoiceSpy.mockReturnValue(resultInvoice)

      // 試験実施
      await invoiceDetailController.insert(value)

      // 期待結果
      // エラーログが出力される
      expect(errorSpy).toHaveBeenCalledWith(
        {
          values: {
            ...value,
            invoicesId: resultInvoice?.dataValues.invoicesId
          },
          stack: dbError.stack,
          status: 0
        },
        dbError.name
      )
    })
  })
})
