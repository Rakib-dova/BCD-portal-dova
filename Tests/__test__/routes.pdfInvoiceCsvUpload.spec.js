'use strict'

jest.mock('../../Application/node_modules/express', () => {
  return require('jest-express')
})

const pdfInvoice = require('../../Application/routes/pdfInvoice.js')
const pdfInvoiceCsvUpload = require('../../Application/routes/pdfInvoiceCsvUpload.js')
const Request = require('jest-express').Request
const Response = require('jest-express').Response
const next = require('jest-express').Next
// const helper = require('../../Application/routes/helpers/middleware')
const errorHelper = require('../../Application/routes/helpers/error')
const apiManager = require('../../Application/controllers/apiManager.js')
const pdfInvoiceController = require('../../Application/controllers/pdfInvoiceController.js')
const pdfInvoiceUploadController = require('../../Application/controllers/pdfInvoiceUploadController.js')
const pdfInvoiceUploadDetailController = require('../../Application/controllers/pdfInvoiceUploadDetailController.js')
const logger = require('../../Application/lib/logger.js')

let request, response, infoSpy, errorSpy, accessTradeshift
let pdfInvoiceControllerFindAllInvoicesSpy, pdfInvoiceControllerfindInvoiceSpy, createInvoiceSpy, updateInvoiceSpy
let pdfInvoiceUploadControllerFindforTenantSpy
let pdfInvoiceUploadDetailControllerFindInvoiceDetailSpy
// 404エラー定義
const error404 = new Error('お探しのページは見つかりませんでした。')
error404.name = 'Not Found'
error404.status = 404

const user = [
  {
    // 契約ステータス：契約中
    userId: '388014b9-d667-4144-9cc4-5da420981438',
    email: 'dummy@testdummy.com',
    tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089',
    accessToken: 'dummyAccessToken',
    refreshToken: 'dummyRefreshToken'
  }
]

// 戻り値定義

const exprectedResultData = {
  ok: {
    title: '取込結果一覧',
    engTitle: 'Result LIST',
    resultArr: [
      {
        index: 1,
        date: '2022/05/01 09:00:00',
        filename: 'PDF請求書ドラフト一括作成フォーマット1.csv',
        invoicesAll: 6,
        invoicesCount: 6,
        invoicesSuccess: 1,
        invoicesSkip: 3,
        invoicesFail: 2,
        status: false,
        invoiceUploadId: '3287e409-d064-4896-ae54-e8b8e2aee037'
      },
      {
        index: 2,
        date: '2022/05/01 09:00:00',
        filename: 'PDF請求書ドラフト一括作成フォーマット2.csv',
        invoicesAll: 9,
        invoicesCount: 0,
        invoicesSuccess: 0,
        invoicesSkip: 9,
        invoicesFail: 0,
        status: true,
        invoiceUploadId: '0b906415-308c-449f-964c-18662c33c592'
      }
    ]
  },
  err: {
    title: '取込結果一覧',
    engTitle: 'Result LIST',
    resultArr: []
  }
}

const historyData = [
  {
    dataValues: {
      invoiceUploadId: '3287e409-d064-4896-ae54-e8b8e2aee037',
      tenantId: '795e60d0-1cf4-4bb3-a3e5-06d94ad438af',
      csvFileName: 'PDF請求書ドラフト一括作成フォーマット1.csv',
      successCount: 1,
      failCount: 2,
      skipCount: 3,
      invoiceCount: 6,
      createdAt: '2022-05-01T00:00:00.000Z',
      updatedAt: '2022-05-01T00:00:00.000Z'
    }
  },
  {
    dataValues: {
      invoiceUploadId: '0b906415-308c-449f-964c-18662c33c592',
      tenantId: '795e60d0-1cf4-4bb3-a3e5-06d94ad438af',
      csvFileName: 'PDF請求書ドラフト一括作成フォーマット2.csv',
      successCount: 0,
      failCount: 0,
      skipCount: 9,
      invoiceCount: 0,
      createdAt: '2022-05-01T00:00:00.000Z',
      updatedAt: '2022-05-01T00:00:00.000Z'
    }
  }
]

const historyDetailData = [
  {
    dataValues: {
      invoiceUploadDetailId: 'bbcbbe53-101c-4dca-89a0-c5709c4c790f',
      invoiceUploadId: '3287e409-d064-4896-ae54-e8b8e2aee037',
      lines: 1,
      invoiceNo: 'test2013',
      status: 1,
      errorData: '取込済みのため、処理をスキップしました。',
      createdAt: '2022-05-01T00:00:00.000Z',
      updatedAt: '2022-05-01T00:00:00.000Z'
    }
  },
  {
    dataValues: {
      invoiceUploadDetailId: '77c6b3d2-33fb-4698-8241-48359704d5c6',
      invoiceUploadId: '3287e409-d064-4896-ae54-e8b8e2aee037',
      lines: 2,
      invoiceNo: 'test2013',
      status: 1,
      errorData: '取込済みのため、処理をスキップしました。',
      createdAt: '2022-05-01T00:00:00.000Z',
      updatedAt: '2022-05-01T00:00:00.000Z'
    }
  }
]

const exprectedResultDetailData = [
  { lines: 1, invoiceNo: 'test2013', status: 'スキップ', errorData: '取込済みのため、処理をスキップしました。' },
  { lines: 2, invoiceNo: 'test2013', status: 'スキップ', errorData: '取込済みのため、処理をスキップしました。' }
]

describe('pdfInvoiceCsvUploadのテスト', () => {
  beforeEach(() => {
    request = new Request()
    request.user = user[0]
    response = new Response()
    infoSpy = jest.spyOn(logger, 'info')
    errorSpy = jest.spyOn(logger, 'error')
    accessTradeshift = jest.spyOn(apiManager, 'accessTradeshift')
    request.flash = jest.fn()
    pdfInvoiceUploadControllerFindforTenantSpy = jest.spyOn(pdfInvoiceUploadController, 'findforTenant')
    pdfInvoiceUploadDetailControllerFindInvoiceDetailSpy = jest.spyOn(
      pdfInvoiceUploadDetailController,
      'findInvoiceDetail'
    )
    pdfInvoiceControllerFindAllInvoicesSpy = jest.spyOn(pdfInvoiceController, 'findAllInvoices')
    pdfInvoiceControllerfindInvoiceSpy = jest.spyOn(pdfInvoiceController, 'findInvoice')
    createInvoiceSpy = jest.spyOn(pdfInvoiceController, 'createInvoice')
    updateInvoiceSpy = jest.spyOn(pdfInvoiceController, 'updateInvoice')
  })
  afterEach(() => {
    request.resetMocked()
    response.resetMocked()
    next.mockReset()
    infoSpy.mockRestore()
    errorSpy.mockRestore()
    accessTradeshift.mockRestore()
    pdfInvoiceControllerFindAllInvoicesSpy.mockRestore()
    pdfInvoiceControllerfindInvoiceSpy.mockRestore()
    createInvoiceSpy.mockRestore()
    updateInvoiceSpy.mockRestore()
  })

  describe('コールバック:pdfInvoiceCsvUploadIndex', () => {
    test('正常', async () => {
      await pdfInvoiceCsvUpload.pdfInvoiceCsvUploadIndex(request, response, next)

      expect(response.render).toHaveBeenCalledWith('pdfInvoiceCsvUpload', {
        title: 'PDF請求書ドラフト一括作成',
        engTitle: 'CSV UPLOAD for PDF'
      })
    })
  })

  describe('コールバック:pdfInvoiceCsvUploadResult', () => {
    test('正常:', async () => {
      request.params.tenantId = 'dummyId'
      pdfInvoiceUploadControllerFindforTenantSpy.mockReturnValue(historyData) // DBからの正常なPDF請求書情報の取得を想定する

      await pdfInvoiceCsvUpload.pdfInvoiceCsvUploadResult(request, response, next)

      expect(response.render).toHaveBeenCalledWith('pdfInvoiceCsvUploadResult', exprectedResultData.ok)
    })
    test('準正常: テナントIDなしの不正リクエスト', async () => {
      request.params.tenantId = undefined
      pdfInvoiceUploadControllerFindforTenantSpy.mockReturnValue(null)

      await pdfInvoiceCsvUpload.pdfInvoiceCsvUploadResult(request, response, next)

      expect(response.render).toHaveBeenCalledWith('pdfInvoiceCsvUploadResult', exprectedResultData.err)
    })
    test('準正常: PDF請求書情報取得時、DBエラー', async () => {
      request.params.tenantId = 'dummyId'

      pdfInvoiceUploadControllerFindforTenantSpy.mockReturnValue(() => {
        throw new Error('DB Error')
      })

      await pdfInvoiceCsvUpload.pdfInvoiceCsvUploadResult(request, response, next)

      expect(response.render).toHaveBeenCalledWith('pdfInvoiceCsvUploadResult', exprectedResultData.err)
    })
  })

  describe('コールバック:pdfInvoiceCsvUploadResultDetail', () => {
    test('正常:', async () => {
      request.params.invoiceUploadId = 'dummyId'

      pdfInvoiceUploadDetailControllerFindInvoiceDetailSpy.mockReturnValue(historyDetailData) // DBからの正常なPDF請求書情報の取得を想定する

      await pdfInvoiceCsvUpload.pdfInvoiceCsvUploadResultDetail(request, response, next)

      expect(response.status).toHaveBeenCalledWith(200)
      expect(response.status(200).send).toHaveBeenCalledWith(JSON.stringify(exprectedResultDetailData))
    })
    test('準正常: invoiceUploadIdなしの不正リクエスト', async () => {
      request.params.invoiceUploadId = undefined
      await pdfInvoiceCsvUpload.pdfInvoiceCsvUploadResultDetail(request, response, next)

      expect(next).toHaveBeenCalledWith(errorHelper.create(400))
    })
    // test('準正常: invoiceUploadIdなしの不正リクエスト', async () => {
    //   request.params.invoiceUploadId = undefined

    //   await pdfInvoiceCsvUpload.pdfInvoiceCsvUploadResult(request, response, next)

    //   expect(response.render).toHaveBeenCalledWith('pdfInvoiceCsvUploadResult', exprectedResultData.err)
    // })
    // test('準正常: PDF請求書情報取得時、DBエラー', async () => {
    //   request.params.tenantId = 'dummyId'

    //   pdfInvoiceUploadControllerFindforTenantSpy.mockReturnValue(() => {
    //     throw new Error('DB Error')
    //   })

    //   await pdfInvoiceCsvUpload.pdfInvoiceCsvUploadResult(request, response, next)

    //   expect(response.render).toHaveBeenCalledWith('pdfInvoiceCsvUploadResult', exprectedResultData.err)
    // })
  })
})
