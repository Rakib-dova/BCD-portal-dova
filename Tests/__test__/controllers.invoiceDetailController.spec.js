'use strict'
jest.mock('../../Application/models')
jest.mock('../../Application/lib/logger')

const invoiceDetailController = require('../../Application/controllers/invoiceDetailController')
const InvoiceDetail = require('../../Application/models').InvoiceDetail
const logger = require('../../Application/lib/logger')

let bulkCreateSpy, errorSpy, infoSpy, findAllSpy
describe('invoiceControllerのテスト', () => {
  beforeEach(() => {
    bulkCreateSpy = jest.spyOn(InvoiceDetail, 'bulkCreate')
    findAllSpy = jest.spyOn(InvoiceDetail, 'findAll')
    errorSpy = jest.spyOn(logger, 'error')
    infoSpy = jest.spyOn(logger, 'info')
  })
  afterEach(() => {
    bulkCreateSpy.mockRestore()
    findAllSpy.mockRestore()
    errorSpy.mockRestore()
    infoSpy.mockRestore()
  })

  // パラメータ値
  const inputInvoiceDetails = [
    {
      invoiceDetailId: '2f9afa5f-38dd-4647-b52e-481cfa7da832',
      invoicesId: '344fb8b1-0416-48db-8a1a-17c080192094',
      invoiceId: 'TEST0001',
      lines: 2,
      status: -1,
      errorData: '008、項目数が異なります。'
    }
  ]

  // createした場合のreturn値
  const resultInvoiceDetail = [
    {
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
  ]

  // findAllのreturn値
  const resultAllInvoiceDetail = [
    {
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
    },
    {
      dataValues: {
        invoiceDetailId: '2f9afa5f-38dd-4647-b52e-481cfa7da005',
        invoicesId: '344fb8b1-0416-48db-8a1a-17c080192094',
        invoiceId: 'TEST0002',
        lines: 2,
        status: '-1',
        errorData: '008、項目数が異なります。',
        updatedAt: '2021-08-26T07:52:57.764Z',
        createdAt: '2021-08-26T07:52:57.764Z'
      }
    }
  ]

  describe('findInvoiceDetail', () => {
    test('正常', async () => {
      // 準備
      const invoicesId = '344fb8b1-0416-48db-8a1a-17c080192094'
      // DBからの正常データ取得を想定する
      findAllSpy.mockReturnValue(resultAllInvoiceDetail)

      // 試験実施
      const result = await invoiceDetailController.findInvoiceDetail(invoicesId)

      // 期待結果
      // 想定した情報がreturnされる
      expect(result).toEqual(resultAllInvoiceDetail)
    })

    test('エラー：DBエラーの場合', async () => {
      // 準備
      const invoicesId = '344fb8b1-0416-48db-8a1a-17c080192094'
      // DBエラーの想定する
      const dbError = new Error('DB error mock')
      findAllSpy.mockImplementation(() => {
        throw dbError
      })

      // 試験実施
      await invoiceDetailController.findInvoiceDetail(invoicesId)

      // 期待結果
      // エラーログが出力される
      expect(errorSpy).toHaveBeenCalledWith({ invoicesId: invoicesId, stack: dbError.stack, status: 0 })
    })
  })

  describe('insertAll', () => {
    test('正常', async () => {
      // 準備
      // DBからの正常データ取得を想定する
      bulkCreateSpy.mockImplementation(async (invoiceDetails) => {
        expect(invoiceDetails).toEqual(inputInvoiceDetails)
        return resultInvoiceDetail
      })

      // 試験実施
      const result = await invoiceDetailController.insertAll(inputInvoiceDetails)

      // 期待結果
      // 想定した情報がreturnされる
      expect(result).toEqual(resultInvoiceDetail)
    })

    test('エラー：DBエラーの場合', async () => {
      // 準備
      // DBエラーの想定する
      const dbError = new Error('DB error mock')
      bulkCreateSpy.mockImplementation(() => {
        throw dbError
      })

      // 試験実施
      await invoiceDetailController.insertAll(inputInvoiceDetails)

      // 期待結果
      // エラーログが出力される
      expect(errorSpy).toHaveBeenCalledWith(
        {
          values: {
            invoiceDetails: inputInvoiceDetails
          },
          stack: dbError.stack,
          status: 0
        },
        dbError.name
      )
    })
  })
})
