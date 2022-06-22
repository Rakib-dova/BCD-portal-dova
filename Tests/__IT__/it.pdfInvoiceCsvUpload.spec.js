/**
 * @jest-environment jsdom
 */

'use strict'
jest.setTimeout(10000)

const app = require('../../Application/app')
const request = require('supertest')
const fs = require('fs')

const pdfInvoice = require('../../Application/routes/pdfInvoice.js')
const uploadController = require('../../Application/controllers/pdfInvoiceHistoryController.js')
const uploadDetailController = require('../../Application/controllers/pdfInvoiceHistoryDetailController.js')
const pdfInvoiceController = require('../../Application/controllers/pdfInvoiceController.js')
const apiManager = require('../../Application/controllers/apiManager.js')
const db = require('../../Application/models')

jest.mock('../../Application/lib/pdfGenerator')

const defaultUser = { tenantId: 'dummyTenantId' }
const defaultParams = { historyId: 'historyId' }
const defaultBody = {}

const accountInfo = {
  CompanyName: '送信先ダミー企業',
  Country: 'JP',
  CompanyAccountId: '795e60d0-1cf4-4bb3-a3e5-06d94ad438af',
  State: 'ACTIVE',
  Description: '送信先ダミー企業',
  Identifiers: [{ scheme: 'TS:ID', value: '795e60d0-1cf4-4bb3-a3e5-06d94ad438af' }],
  AddressLines: [
    { scheme: 'city', value: '東京都' },
    { scheme: 'locality', value: '大手町プレイスウエスト' },
    { scheme: 'street', value: '大手町' },
    { scheme: 'zip', value: '100-8019' }
  ],
  LogoURL: 'https://res.cloudinary.com/tradeshift-test/image/upload/fa0cc2df-fa4f-5052-b22a-b6984d326ab6.png',
  PublicProfile: false,
  NonuserInvoicing: false,
  AutoAcceptConnections: false,
  Restricted: true,
  Created: '2021-07-27T09:10:59.241Z',
  Modified: '2021-07-27T09:13:17.436Z',
  AccountType: 'FREE'
}

const senderInfo = {
  sendCompany: '送信先ダミー企業',
  sendPost: '100-8019',
  sendAddr1: '東京都',
  sendAddr2: '大手町',
  sendAddr3: '大手町プレイスウエスト'
}

const uploadFileData =
  '請求書番号,支払期日,請求日,納品日,宛先企業名,宛先郵便番号,宛先都道府県,宛先住所,宛先ビル名/フロア等,銀行名,支店名,科目,口座番号,口座名義,備考,明細-項目ID,明細-内容,明細-数量,明細-単位,明細-単価,明細-税（消費税／軽減税率／不課税／免税／非課税）' +
  '\r\n' +
  'upload001,2021-5-1,2021-5-2,2021-5-3,宛先企業１,000-0000,宛先東京,宛先中央区,宛先びる１Ｆ,ＡＢＣ銀行,１２３支店,普通,1234567,MEIGI KOZA,備考備考,a001,明細１,1,個,単価,消費税' +
  '\r\n' +
  'upload002,2021-5-1,2021-5-2,2021-5-3,宛先企業１,000-0000,宛先東京,宛先中央区,宛先びる１Ｆ,ＡＢＣ銀行,１２３支店,普通,1234567,MEIGI KOZA,備考備考,a001,明細１,1,1000,100000,消費税' +
  '\r\n' +
  'upload003,2021-5-1,2021-5-2,2021-5-3,宛先企業１,000-0000,宛先東京,宛先中央区,宛先びる１Ｆ,ＡＢＣ銀行,１２３支店,普通,1234567,MEIGI KOZA,備考備考,a001,明細１,1,1000,100000,消費税'

jest.mock('../../Application/routes/helpers/middleware', () => {
  return {
    isAuthenticated: (req, res, next) => {
      console.log('====    ======')
      return next()
    },
    isTenantRegistered: (req, res, next) => next(),
    isUserRegistered: (req, res, next) => next(),
    bcdAuthenticate: (req, res, next) => {
      req.user = defaultUser
      req.params = defaultParams
      req.body = defaultBody
      req.file = { buffer: Buffer.from(uploadFileData) }
      req.csrfToken = () => 'dummyCsrfToken'
      return next()
    }
  }
})
jest.mock('../../Application/node_modules/multer', () => {
  const multer = function () {
    return {
      single: () => (req, res, next) => next(),
      array: () => () => (req, res, next) => next()
    }
  }
  multer.memoryStorage = () => {}
  return multer
})
jest.mock('../../Application/node_modules/csurf', () => {
  return () => () => (req, res, next) => next()
})

let apiManagerSpy
let findforTenantSpy
let findInvoiceDetailSpy
let createUploadHistoryAndRowsSpy
let createInvoicesAndLinesSpy
let fsSpy
let pdfInvoiceGetAccountAndSenderInfoSpy

const historyData = [
  {
    dataValues: {
      historyId: '3287e409-d064-4896-ae54-e8b8e2aee037',
      tenantId: '795e60d0-1cf4-4bb3-a3e5-06d94ad438af',
      csvFileName: 'PDF請求書ドラフト一括作成フォーマット1.csv',
      successCount: 1,
      failCount: 2,
      skipCount: 3,
      invoiceCount: 6,
      createdAt: '2022-05-01T00:00:00.000Z',
      updatedAt: '2022-05-01T01:00:00.000Z'
    }
  },
  {
    dataValues: {
      historyId: '0b906415-308c-449f-964c-18662c33c592',
      tenantId: '795e60d0-1cf4-4bb3-a3e5-06d94ad438af',
      csvFileName: 'PDF請求書ドラフト一括作成フォーマット2.csv',
      successCount: 7,
      failCount: 8,
      skipCount: 9,
      invoiceCount: 24,
      createdAt: '2022-12-11T12:59:59.000Z',
      updatedAt: '2022-12-11T13:59:59.000Z'
    }
  }
]

const historyDataSuccess = [
  {
    dataValues: {
      historyId: '3287e409-d064-4896-ae54-e8b8e2aee037',
      tenantId: '795e60d0-1cf4-4bb3-a3e5-06d94ad438af',
      csvFileName: 'PDF請求書ドラフト一括作成フォーマット1.csv',
      successCount: 1,
      failCount: 0,
      skipCount: 0,
      invoiceCount: 1,
      createdAt: '2022-05-01T00:00:00.000Z',
      updatedAt: '2022-05-01T01:00:00.000Z'
    }
  }
]

const details = {
  success: [
    {
      dataValues: {
        historyDetailId: 'bbcbbe53-101c-4dca-89a0-c5709c4c790f',
        historyId: '3287e409-d064-4896-ae54-e8b8e2aee037',
        lines: 1,
        invoiceNo: 'detail001',
        status: 0,
        errorData: ''
      }
    }
  ],
  skip: [
    {
      dataValues: {
        historyDetailId: '77c6b3d2-33fb-4698-8241-48359704d5c6',
        historyId: '3287e409-d064-4896-ae54-e8b8e2aee037',
        lines: 1,
        invoiceNo: 'detail002',
        status: 1,
        errorData: '取込済みのため、処理をスキップしました。'
      }
    }
  ],
  fail: [
    {
      dataValues: {
        historyDetailId: '5fef89d8-3639-4d12-ae1e-b4ef4b7ff2d8',
        historyId: '3c8204ac-1a7f-4d88-833f-270aa919f937',
        lines: 1,
        invoiceNo: 'detail003',
        status: 2,
        errorData: '明細-単価は整数 0 ～ 999999999999 の範囲で入力してください。\r\n'
      }
    }
  ],
  successSkip: [
    {
      dataValues: {
        historyDetailId: 'bbcbbe53-101c-4dca-89a0-c5709c4c790f',
        historyId: '3287e409-d064-4896-ae54-e8b8e2aee037',
        lines: 1,
        invoiceNo: 'detail001',
        status: 0,
        errorData: ''
      }
    },
    {
      dataValues: {
        historyDetailId: '77c6b3d2-33fb-4698-8241-48359704d5c6',
        historyId: '3287e409-d064-4896-ae54-e8b8e2aee037',
        lines: 1,
        invoiceNo: 'detail002',
        status: 1,
        errorData: '取込済みのため、処理をスキップしました。'
      }
    }
  ],
  successFail: [
    {
      dataValues: {
        historyDetailId: 'bbcbbe53-101c-4dca-89a0-c5709c4c790f',
        historyId: '3287e409-d064-4896-ae54-e8b8e2aee037',
        lines: 1,
        invoiceNo: 'detail001',
        status: 0,
        errorData: ''
      }
    },
    {
      dataValues: {
        historyDetailId: '5fef89d8-3639-4d12-ae1e-b4ef4b7ff2d8',
        historyId: '3c8204ac-1a7f-4d88-833f-270aa919f937',
        lines: 1,
        invoiceNo: 'detail003',
        status: 2,
        errorData: '明細-単価は整数 0 ～ 999999999999 の範囲で入力してください。\r\n'
      }
    }
  ],
  skipFail: [
    {
      dataValues: {
        historyDetailId: '77c6b3d2-33fb-4698-8241-48359704d5c6',
        historyId: '3287e409-d064-4896-ae54-e8b8e2aee037',
        lines: 1,
        invoiceNo: 'detail002',
        status: 1,
        errorData: '取込済みのため、処理をスキップしました。'
      }
    },
    {
      dataValues: {
        historyDetailId: '5fef89d8-3639-4d12-ae1e-b4ef4b7ff2d8',
        historyId: '3c8204ac-1a7f-4d88-833f-270aa919f937',
        lines: 1,
        invoiceNo: 'detail003',
        status: 2,
        errorData: '明細-単価は整数 0 ～ 999999999999 の範囲で入力してください。\r\n'
      }
    }
  ],
  all: [
    {
      dataValues: {
        historyDetailId: 'bbcbbe53-101c-4dca-89a0-c5709c4c790f',
        historyId: '3287e409-d064-4896-ae54-e8b8e2aee037',
        lines: 1,
        invoiceNo: 'detail001',
        status: 0,
        errorData: ''
      }
    },
    {
      dataValues: {
        historyDetailId: '77c6b3d2-33fb-4698-8241-48359704d5c6',
        historyId: '3287e409-d064-4896-ae54-e8b8e2aee037',
        lines: 1,
        invoiceNo: 'detail002',
        status: 1,
        errorData: '取込済みのため、処理をスキップしました。'
      }
    },
    {
      dataValues: {
        historyDetailId: '5fef89d8-3639-4d12-ae1e-b4ef4b7ff2d8',
        historyId: '3c8204ac-1a7f-4d88-833f-270aa919f937',
        lines: 1,
        invoiceNo: 'detail003',
        status: 2,
        errorData: '明細-単価は整数 0 ～ 999999999999 の範囲で入力してください。\r\n'
      }
    }
  ]
}

const defaultCsvData =
  '請求書番号,支払期日,請求日,納品日,宛先企業名,宛先郵便番号,宛先都道府県,宛先住所,宛先ビル名/フロア等,銀行名,支店名,科目,口座番号,口座名義,備考,明細-項目ID,明細-内容,明細-数量,明細-単位,明細-単価,明細-税（消費税／軽減税率／不課税／免税／非課税）'

describe('pdfInvocie.js ITテスト', () => {
  beforeEach(() => {
    apiManagerSpy = jest.spyOn(apiManager, 'accessTradeshift')
    findforTenantSpy = jest.spyOn(uploadController, 'findforTenant')
    findInvoiceDetailSpy = jest.spyOn(uploadDetailController, 'findInvoiceDetail')

    createInvoicesAndLinesSpy = jest.spyOn(pdfInvoiceController, 'createInvoicesAndLines')
    createUploadHistoryAndRowsSpy = jest.spyOn(uploadController, 'createUploadHistoryAndRows')

    fsSpy = jest.spyOn(fs, 'readFileSync')
    pdfInvoiceGetAccountAndSenderInfoSpy = jest.spyOn(pdfInvoice, 'getAccountAndSenderInfo')
  })
  afterEach(() => {
    apiManagerSpy.mockRestore()
    findforTenantSpy.mockRestore()
    findInvoiceDetailSpy.mockRestore()

    createInvoicesAndLinesSpy.mockRestore()
    createUploadHistoryAndRowsSpy.mockRestore()

    fsSpy.mockRestore()
    pdfInvoiceGetAccountAndSenderInfoSpy.mockRestore()
  })

  describe('PDF請求書ドラフト一括作成', () => {
    test('正常: ', async () => {
      const res = await request(app).get('/pdfInvoiceCsvUpload/').set('Accept', 'application/json')

      expect(res.text).toMatch(/PDF請求書ドラフト一括作成/i)
      expect(res.text).toMatch(/CSV UPLOAD for PDF/i)
    })
  })

  describe('取込結果一覧', () => {
    test('正常', async () => {
      defaultParams.invoiceId = 'dummyId'
      findforTenantSpy.mockReturnValue(historyData)

      const res = await request(app).get('/pdfInvoiceCsvUpload/resultList').set('Accept', 'application/json')
      expect(res.text).toMatch(/取込結果一覧/i)
      expect(res.text).toMatch(/Result LIST/i)

      expect(res.text).toMatch(/3287e409-d064-4896-ae54-e8b8e2aee037/i)
      expect(res.text).toMatch(/PDF請求書ドラフト一括作成フォーマット1.csv/i)
      expect(res.text).toMatch(/1/i)
      expect(res.text).toMatch(/2/i)
      expect(res.text).toMatch(/3/i)
      expect(res.text).toMatch(/6/i)
      expect(res.text).toMatch(/2022\/05\/01 10:00:00/i)

      expect(res.text).toMatch(/0b906415-308c-449f-964c-18662c33c592/i)
      expect(res.text).toMatch(/PDF請求書ドラフト一括作成フォーマット2.csv/i)
      expect(res.text).toMatch(/7/i)
      expect(res.text).toMatch(/8/i)
      expect(res.text).toMatch(/9/i)
      expect(res.text).toMatch(/24/i)
      expect(res.text).toMatch(/2022\/12\/11 22:59:59/i)
    })

    test('準正常: ユーザ情報なしの不正リクエスト', async () => {
      delete defaultUser.tenantId

      const res = await request(app).get('/pdfInvoiceCsvUpload/resultList').set('Accept', 'application/json')

      // expect(res.text).toMatch(/不正なページからアクセスされたか、セッションタイムアウトが発生しました。/i)
      // expect(res.text).toMatch(/上部メニューのHOMEボタンを押下し、再度操作をやり直してください。/i)

      expect(res.text).toMatch(/取込結果一覧/i)
      expect(res.text).toMatch(/Result LIST/i)
    })

    test('準正常: 請求書IDなしの不正リクエスト', async () => {
      findforTenantSpy.mockReturnValue(() => {
        throw new Error('DB Error')
      })
      const res = await request(app).get('/pdfInvoiceCsvUpload/resultList').set('Accept', 'application/json')

      expect(res.text).toMatch(/取込結果一覧/i)
      expect(res.text).toMatch(/Result LIST/i)

      // 一覧レコードの表示なし
    })
  })

  describe('取込結果詳細表示', () => {
    test('成功のみ', async () => {
      defaultParams.invoiceId = 'dummyId'
      findforTenantSpy.mockReturnValue(historyDataSuccess)

      // resultListのリクエスト
      const res = await request(app).get('/pdfInvoiceCsvUpload/resultList').set('Accept', 'application/json')
      // resultListのレンダー
      let renderedHTML = res.text
      renderedHTML = renderedHTML.replace('<!DOCTYPE html><html>', '')
      renderedHTML = renderedHTML.replace(
        '<script src="/js/common-page.js"></script><script src="/js/portal-page.js"></script><!-- End of DigitalTrade Portal Page--><script src="/js/pdfInvoiceHistoryResultDetail-page.js"></script><!-- ResultDetail-->',
        ''
      )
      renderedHTML = renderedHTML.replace('</html>', '')
      const rootEle = document.getElementsByTagName('html')
      rootEle[0].innerHTML = renderedHTML

      // resultList/detailのリクエスト
      findInvoiceDetailSpy.mockReturnValue(details.success)
      const res2 = await request(app)
        .get('/pdfInvoiceCsvUpload/resultList/detail/historyId:dummyId')
        .set('Accept', 'application/json')

      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(JSON.parse(res2.text))
        })
      )

      const commonPage = require('../../Application/public/js/common-page')
      const portalPage = require('../../Application/public/js/portal-page.js')
      const csvuploadResultDetail = require('../../Application/public/js/pdfInvoiceHistoryResultDetail-page.js')

      // ステータスボタンクリック
      const detailBtn = document.getElementsByClassName('btnDetail')
      Array.from(detailBtn)[0].click()
      await new Promise(function (resolve, reject) {
        setTimeout(resolve, 1000)
      })

      // 結果検証
      const result = document.getElementById('resultDetail')
      expect(result.innerHTML).toMatch(/detail001/i)
      expect(result.innerHTML).toMatch(/成功/i)
      expect(result.innerHTML).toMatch(/正常に取込ました。/i)
    })

    test('スキップのみ', async () => {
      defaultParams.invoiceId = 'dummyId'
      // resultListのレンダリングは初回のみ

      // resultList/detailのリクエスト
      findInvoiceDetailSpy.mockReturnValue(details.skip)
      const res2 = await request(app)
        .get('/pdfInvoiceCsvUpload/resultList/detail/historyId:dummyId')
        .set('Accept', 'application/json')

      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(JSON.parse(res2.text))
        })
      )

      // ステータスボタンクリック
      const detailBtn = document.getElementsByClassName('btnDetail')
      Array.from(detailBtn)[0].click()
      await new Promise(function (resolve, reject) {
        setTimeout(resolve, 1000)
      })

      // 結果検証
      const result = document.getElementById('resultDetail')
      expect(result.innerHTML).toMatch(/detail002/i)
      expect(result.innerHTML).toMatch(/スキップ/i)
      expect(result.innerHTML).toMatch(/取込済みのため、処理をスキップしました。/i)
    })

    test('失敗のみ', async () => {
      defaultParams.invoiceId = 'dummyId'

      // resultListのレンダリングは初回のみ

      // resultList/detailのリクエスト
      findInvoiceDetailSpy.mockReturnValue(details.fail)
      const res2 = await request(app)
        .get('/pdfInvoiceCsvUpload/resultList/detail/historyId:dummyId')
        .set('Accept', 'application/json')

      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(JSON.parse(res2.text))
        })
      )

      // ステータスボタンクリック
      const detailBtn = document.getElementsByClassName('btnDetail')
      Array.from(detailBtn)[0].click()
      await new Promise(function (resolve, reject) {
        setTimeout(resolve, 1000)
      })

      // 結果検証
      const result = document.getElementById('resultDetail')
      expect(result.innerHTML).toMatch(/detail003/i)
      expect(result.innerHTML).toMatch(/失敗/i)
      expect(result.innerHTML).toMatch(/明細-単価は整数 0 ～ 999999999999 の範囲で入力してください。/i)
    })

    test('成功＆スキップのみ', async () => {
      defaultParams.invoiceId = 'dummyId'

      // resultListのレンダリングは初回のみ

      // resultList/detailのリクエスト
      findInvoiceDetailSpy.mockReturnValue(details.successSkip)
      const res2 = await request(app)
        .get('/pdfInvoiceCsvUpload/resultList/detail/historyId:dummyId')
        .set('Accept', 'application/json')

      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(JSON.parse(res2.text))
        })
      )

      // ステータスボタンクリック
      const detailBtn = document.getElementsByClassName('btnDetail')
      Array.from(detailBtn)[0].click()
      await new Promise(function (resolve, reject) {
        setTimeout(resolve, 1000)
      })

      // 結果検証
      const result = document.getElementById('resultDetail')
      expect(result.innerHTML).toMatch(/detail001/i)
      expect(result.innerHTML).toMatch(/成功/i)
      expect(result.innerHTML).toMatch(/正常に取込ました。/i)
      expect(result.innerHTML).toMatch(/detail002/i)
      expect(result.innerHTML).toMatch(/スキップ/i)
      expect(result.innerHTML).toMatch(/取込済みのため、処理をスキップしました。/i)
    })
    test('成功＆失敗のみ', async () => {
      defaultParams.invoiceId = 'dummyId'

      // resultListのレンダリングは初回のみ

      // resultList/detailのリクエスト
      findInvoiceDetailSpy.mockReturnValue(details.successFail)
      const res2 = await request(app)
        .get('/pdfInvoiceCsvUpload/resultList/detail/historyId:dummyId')
        .set('Accept', 'application/json')

      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(JSON.parse(res2.text))
        })
      )

      // ステータスボタンクリック
      const detailBtn = document.getElementsByClassName('btnDetail')
      Array.from(detailBtn)[0].click()
      await new Promise(function (resolve, reject) {
        setTimeout(resolve, 1000)
      })

      // 結果検証
      const result = document.getElementById('resultDetail')
      expect(result.innerHTML).toMatch(/detail001/i)
      expect(result.innerHTML).toMatch(/成功/i)
      expect(result.innerHTML).toMatch(/正常に取込ました。/i)

      expect(result.innerHTML).toMatch(/detail003/i)
      expect(result.innerHTML).toMatch(/失敗/i)
      expect(result.innerHTML).toMatch(/明細-単価は整数 0 ～ 999999999999 の範囲で入力してください。/i)
    })

    test('スキップ＆失敗のみ', async () => {
      defaultParams.invoiceId = 'dummyId'

      // resultListのレンダリングは初回のみ

      // resultList/detailのリクエスト
      findInvoiceDetailSpy.mockReturnValue(details.skipFail)
      const res2 = await request(app)
        .get('/pdfInvoiceCsvUpload/resultList/detail/historyId:dummyId')
        .set('Accept', 'application/json')

      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(JSON.parse(res2.text))
        })
      )

      // ステータスボタンクリック
      const detailBtn = document.getElementsByClassName('btnDetail')
      Array.from(detailBtn)[0].click()
      await new Promise(function (resolve, reject) {
        setTimeout(resolve, 1000)
      })

      // 結果検証
      const result = document.getElementById('resultDetail')
      expect(result.innerHTML).toMatch(/detail002/i)
      expect(result.innerHTML).toMatch(/スキップ/i)
      expect(result.innerHTML).toMatch(/取込済みのため、処理をスキップしました。/i)

      expect(result.innerHTML).toMatch(/detail003/i)
      expect(result.innerHTML).toMatch(/失敗/i)
      expect(result.innerHTML).toMatch(/明細-単価は整数 0 ～ 999999999999 の範囲で入力してください。/i)
    })

    test('全部', async () => {
      defaultParams.invoiceId = 'dummyId'

      // resultListのレンダリングは初回のみ

      // resultList/detailのリクエスト
      findInvoiceDetailSpy.mockReturnValue(details.all)
      const res2 = await request(app)
        .get('/pdfInvoiceCsvUpload/resultList/detail/historyId:dummyId')
        .set('Accept', 'application/json')

      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(JSON.parse(res2.text))
        })
      )

      // ステータスボタンクリック
      const detailBtn = document.getElementsByClassName('btnDetail')
      Array.from(detailBtn)[0].click()
      await new Promise(function (resolve, reject) {
        setTimeout(resolve, 1000)
      })

      // 結果検証
      const result = document.getElementById('resultDetail')
      expect(result.innerHTML).toMatch(/detail001/i)
      expect(result.innerHTML).toMatch(/成功/i)
      expect(result.innerHTML).toMatch(/正常に取込ました。/i)

      expect(result.innerHTML).toMatch(/detail002/i)
      expect(result.innerHTML).toMatch(/スキップ/i)
      expect(result.innerHTML).toMatch(/取込済みのため、処理をスキップしました。/i)

      expect(result.innerHTML).toMatch(/detail003/i)
      expect(result.innerHTML).toMatch(/失敗/i)
      expect(result.innerHTML).toMatch(/明細-単価は整数 0 ～ 999999999999 の範囲で入力してください。/i)
    })

    test('詳細情報取得失敗', async () => {
      defaultParams.invoiceId = 'dummyId'

      // resultListのレンダリングは初回のみ

      // resultList/detailのリクエスト
      findInvoiceDetailSpy.mockReturnValue(() => {
        throw new Error('DB Error')
      })
      const res2 = await request(app)
        .get('/pdfInvoiceCsvUpload/resultList/detail/historyId:dummyId')
        .set('Accept', 'application/json')

      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(JSON.parse(res2.text))
        })
      )

      // ステータスボタンクリック
      const detailBtn = document.getElementsByClassName('btnDetail')
      Array.from(detailBtn)[0].click()
      await new Promise(function (resolve, reject) {
        setTimeout(resolve, 1000)
      })

      // 詳細なし
    })
  })

  describe('post / リクエスト', () => {
    test('正常', async () => {
      fsSpy.mockReturnValue(defaultCsvData)
      pdfInvoiceGetAccountAndSenderInfoSpy.mockReturnValue({ accountInfo, senderInfo })

      db.sequelize.transaction = jest.fn(async (callback) => {
        createInvoicesAndLinesSpy.mockReturnThis()
        createUploadHistoryAndRowsSpy.mockReturnThis()
        return await callback()
      })

      const res = await request(app).post('/pdfInvoiceCsvUpload/upload')

      console.log(res.text)
    })
  })
})
