'use strict'

const csvDownloadController = require('../../Application/controllers/csvDownloadController')
const apiManager = require('../../Application/controllers/apiManager.js')

describe('csvDownloadControllerのテスト', () => {
  beforeEach(() => {
    apiManager.accessTradeshift = require('../lib/apiManager')
  })
  afterEach(() => {})

  // Tokenとユーザ情報設定
  const accessToken = 'dummyAccessToken'
  const refreshToken = 'dummyRefreshToken'

  // パラメータ設定
  const document = [{ DocumentId: '1f3ce3dc-4dbb-548a-a090-d39dc604a6e1' }]

  describe('createInvoiceDataForDownload', () => {
    test('正常', async () => {
      // 試験実施
      const result = await csvDownloadController.createInvoiceDataForDownload(accessToken, refreshToken, document[0])

      // 期待結果
      const invoice = require('../mockInvoice/invoice1')
      const checkData = [invoice]
      expect(result).toEqual(checkData)
    })

    test('異常：APIエラー', async () => {
      // 準備
      const errorDocuments = [{ DocumentId: 'c1aa94c2-f6c9-465a-911f-a2cd4b654321' }]

      // 試験実施
      const result = await csvDownloadController.createInvoiceDataForDownload(
        accessToken,
        refreshToken,
        errorDocuments[0]
      )

      // 期待結果
      expect(result).toEqual(new Error('Request failed with status code 404'))
    })
  })
})
