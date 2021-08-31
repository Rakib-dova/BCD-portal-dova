/* eslint-disable new-cap */
'use strict'

/*

 テスト実施するためにはテストソース「csvupload.js」の最後行の「module.exports」に
 cbPostUpload, cbUploadCsv, cbRemoveCsv, cbExtractInvoice, getTimeStampの登録が必要

  module.exports = {
    router: router,
    cbGetIndex: cbGetIndex,
    cbPostUpload: cbPostUpload,
    cbUploadCsv: cbUploadCsv,
    cbRemoveCsv: cbRemoveCsv,
    cbExtractInvoice: cbExtractInvoice,
    getTimeStamp: getTimeStamp
  }

*/

jest.mock('../../Application/node_modules/express', () => {
  return require('jest-express')
})

const csvupload = require('../../Application/routes/csvupload')
const bconCsv = require('../../Application/lib/bconCsv')
const Request = require('jest-express').Request
const Response = require('jest-express').Response
const next = require('jest-express').Next
const helper = require('../../Application/routes/helpers/middleware')
const errorHelper = require('../../Application/routes/helpers/error')
const noticeHelper = require('../../Application/routes/helpers/notice')
const apiManager = require('../../Application/controllers/apiManager.js')
const userController = require('../../Application/controllers/userController.js')
const contractController = require('../../Application/controllers/contractController.js')
const invoiceDetailController = require('../../Application/controllers/invoiceDetailController.js')
const tenantController = require('../../Application/controllers/tenantController')
const logger = require('../../Application/lib/logger.js')
const constantsDefine = require('../../Application/constants')
const invoiceController = require('../../Application/controllers/invoiceController.js')

if (process.env.LOCALLY_HOSTED === 'true') {
  // NODE_ENVはJestがデフォルトでtestに指定する。dotenvで上書きできなかったため、package.jsonの実行引数でdevelopmentを指定
  require('dotenv').config({ path: './config/.env' })
}
let request, response, infoSpy, findOneSpy, findOneSpyContracts, invoiceListSpy
let createSpyInvoices, createSpyinvoicesDetail, findOneSpyInvoice, findOneSypTenant
describe('csvuploadのテスト', () => {
  beforeEach(() => {
    request = new Request()
    response = new Response()
    infoSpy = jest.spyOn(logger, 'info')
    findOneSpy = jest.spyOn(userController, 'findOne')
    findOneSpyContracts = jest.spyOn(contractController, 'findOne')
    invoiceListSpy = jest.spyOn(csvupload, 'cbExtractInvoice')
    apiManager.accessTradeshift = jest.fn((accToken, refreshToken, method, query, body = {}, config = {}) => {
      switch (method) {
        case 'get':
          if (query.match(/^\/documents\?stag=draft&stag=outbox&limit=10000/i)) {
            if (query.match(/^\/documents\?stag=draft&stag=outbox&limit=10000/i)) {
              return documentListData
            }
            return documentListData
          }
          if (query.match(/^\/network\?limit=100/i)) {
            return resultGetNetwork
          }
          break
        case 'put':
          return 200
      }
    })
    createSpyInvoices = jest.spyOn(invoiceController, 'insert')
    createSpyinvoicesDetail = jest.spyOn(invoiceDetailController, 'insert')
    findOneSpyInvoice = jest.spyOn(invoiceController, 'findInvoice')
    findOneSypTenant = jest.spyOn(tenantController, 'findOne')
  })
  afterEach(() => {
    request.resetMocked()
    response.resetMocked()
    next.mockReset()
    infoSpy.mockRestore()
    findOneSpy.mockRestore()
    findOneSpyContracts.mockRestore()
    invoiceListSpy.mockRestore()
    createSpyInvoices.mockRestore()
    createSpyinvoicesDetail.mockRestore()
    findOneSpyInvoice.mockRestore()
  })

  // 404エラー定義
  const error404 = new Error('お探しのページは見つかりませんでした。')
  error404.name = 'Not Found'
  error404.status = 404

  // 正常系データ定義
  // email,userId正常値
  const user = {
    email: 'dummy@testdummy.com',
    userId: '12345678-cb0b-48ad-857d-4b42a44ede13',
    tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089',
    accessToken: 'dummyAccessToken',
    refreshToken: 'dummyRefreshToken'
  }
  // DBの正常なユーザデータ
  const dataValues = {
    dataValues: {
      tenantId: '3cfebb4f-2338-4dc7-9523-5423a027a880',
      userRole: 'a6a3edcd-00d9-427c-bf03-4ef0112ba16d',
      appVersion: '0.0.1',
      refreshToken: 'dummyRefreshToken',
      subRefreshToken: null,
      userStatus: 0,
      lastRefreshedAt: null,
      createdAt: '2021-06-07T08:45:49.803Z',
      updatedAt: '2021-06-07T08:45:49.803Z'
    }
  }
  // ファイルパス設定
  const filePath = process.env.INVOICE_UPLOAD_PATH
  // ファイルデータ
  // 請求書が1つの場合
  const fileData = Buffer.from(
    `発行日,請求書番号,テナントID,支払期日,納品日,備考,銀行名,支店名,科目,口座番号,口座名義,その他特異事項,明細-項目ID,明細-内容,明細-数量,明細-単位,明細-単価,明細-税,明細-備考
2021-06-14,UT_TEST_INVOICE_1_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-17,test111,testsiten,testbank,普通,1111111,kang_test,特記事項テストです。,001,PC,100,個,100000,消費税,アップロードテスト`
  ).toString('base64')

  // 請求書が２つ以上、請求書番号が一致していない
  const fileData2 = Buffer.from(
    `発行日,請求書番号,テナントID,支払期日,納品日,備考,銀行名,支店名,科目,口座番号,口座名義,その他特異事項,明細-項目ID,明細-内容,明細-数量,明細-単位,明細-単価,明細-税,明細-備考
2021-06-14,UT_TEST_INVOICE_2_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-17,test111,testsiten,testbank,普通,1111111,kang_test,特記事項テストです。,001,PC,100,個,100000,消費税,アップロードテスト
2021-06-14,UT_TEST_INVOICE_2_2,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-17,test111,testsiten,testbank,普通,1111111,kang_test,特記事項テストです。,002,ノートパソコン,100,個,100000,軽減税率,アップロードテスト
2021-06-15,UT_TEST_INVOICE_2_3,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test112,testsiten,testbank,普通,1111111,kim_test,特記事項テストです。,003,周辺機器,100,個,100000,不課税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_2_4,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-19,test113,testsiten,testbank,普通,1111111,kim_test,特記事項テストです。,004,プリント用紙,100,個,100000,免税,アップロードテスト`
  ).toString('base64')

  // 請求書が２つ以上、請求書番号が一致していて、順番になっている
  const fileData3 = Buffer.from(
    `発行日,請求書番号,テナントID,支払期日,納品日,備考,銀行名,支店名,科目,口座番号,口座名義,その他特異事項,明細-項目ID,明細-内容,明細-数量,明細-単位,明細-単価,明細-税,明細-備考
2021-06-15,UT_TEST_INVOICE_3_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test112,testsiten,testbank,普通,1111111,kim_test,特記事項テストです。,001,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_3_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-19,test113,testsiten,testbank,普通,1111111,kim_test,特記事項テストです。,002,ノートパソコン,100,個,100000,軽減税率,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_2,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-17,test111,testsiten,testbank,普通,1111111,kang_test,特記事項テストです。,001,ST001S,100,個,100000,不課税,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_2,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-17,test111,testsiten,testbank,普通,1111111,kang_test,特記事項テストです。,002,ST001M,100,個,100000,免税,アップロードテスト`
  ).toString('base64')

  // 請求書が２つ以上、請求書番号が順番になっていること、請求書番号が割り込んでいる
  const fileData4 = Buffer.from(
    `発行日,請求書番号,テナントID,支払期日,納品日,備考,銀行名,支店名,科目,口座番号,口座名義,その他特異事項,明細-項目ID,明細-内容,明細-数量,明細-単位,明細-単価,明細-税,明細-備考
2021-06-15,UT_TEST_INVOICE_3_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test112,testsiten,testbank,普通,1111111,kim_test,特記事項テストです。,001,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_3_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-19,test113,testsiten,testbank,普通,1111111,kim_test,特記事項テストです。,002,ノートパソコン,100,個,100000,消費税,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_2,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-17,test111,testsiten,testbank,普通,1111111,kang_test,特記事項テストです。,001,ST001S,100,個,100000,消費税,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_2,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-17,test111,testsiten,testbank,普通,1111111,kang_test,特記事項テストです。,002,ST002M,100,個,100000,不課税,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-17,test111,testsiten,testbank,普通,1111111,kang_test,特記事項テストです。,003,マウス,100,個,100000,免税,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-17,test111,testsiten,testbank,普通,1111111,kang_test,特記事項テストです。,004,キーボード,100,個,100000,非課税,アップロードテスト`
  ).toString('base64')

  // 既に登録済みの請求書番号
  const fileData5 = Buffer.from(
    `発行日,請求書番号,テナントID,支払期日,納品日,備考,銀行名,支店名,科目,口座番号,口座名義,その他特異事項,明細-項目ID,明細-内容,明細-数量,明細-単位,明細-単価,明細-税,明細-備考
2021-06-15,UT_TEST_INVOICE_5_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test112,testsiten,testbank,普通,1111111,kim_test,特記事項テストです。,001,PC,100,個,100000,消費税,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_2,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-17,test111,testsiten,testbank,普通,1111111,kang_test,特記事項テストです。,001,ST001S,100,個,100000,軽減税率,アップロードテスト`
  ).toString('base64')

  // 請求書が100件
  const fileData100 = Buffer.from(
    `発行日,請求書番号,テナントID,支払期日,納品日,備考,銀行名,支店名,科目,口座番号,口座名義,その他特異事項,明細-項目ID,明細-内容,明細-数量,明細-単位,明細-単価,明細-税,明細-備考
2021-06-15,UT_TEST_INVOICE_3_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/18,test112,testsiten,testbank,普通,1111111,kim_test,特記事項テストです。,001,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_3_2,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/19,test113,testsiten,testbank,普通,1111111,kim_test,特記事項テストです。,002,ノートパソコン,100,個,100000,軽減税率,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_3,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,普通,1111111,kang_test,特記事項テストです。,001,ST001S,100,個,100000,軽減税率,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_4,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,普通,1111111,kang_test,特記事項テストです。,002,ST002M,100,個,100000,不課税,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_5,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,普通,1111111,kang_test,特記事項テストです。,003,マウス,100,個,100000,免税,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_6,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,普通,1111111,kang_test,特記事項テストです。,004,キーボード,100,個,100000,非課税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_3_7,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/18,test112,testsiten,testbank,普通,1111111,kim_test,特記事項テストです。,001,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_3_8,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/19,test113,testsiten,testbank,普通,1111111,kim_test,特記事項テストです。,002,ノートパソコン,100,個,100000,軽減税率,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_9,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,普通,1111111,kang_test,特記事項テストです。,001,ST001S,100,個,100000,軽減税率,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_10,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,普通,1111111,kang_test,特記事項テストです。,002,ST002M,100,個,100000,不課税,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_11,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,普通,1111111,kang_test,特記事項テストです。,003,マウス,100,個,100000,免税,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_12,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,普通,1111111,kang_test,特記事項テストです。,004,キーボード,100,個,100000,非課税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_3_13,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/18,test112,testsiten,testbank,普通,1111111,kim_test,特記事項テストです。,001,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_3_14,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/19,test113,testsiten,testbank,普通,1111111,kim_test,特記事項テストです。,002,ノートパソコン,100,個,100000,軽減税率,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_15,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,普通,1111111,kang_test,特記事項テストです。,001,ST001S,100,個,100000,軽減税率,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_16,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,普通,1111111,kang_test,特記事項テストです。,002,ST002M,100,個,100000,不課税,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_17,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,普通,1111111,kang_test,特記事項テストです。,003,マウス,100,個,100000,免税,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_18,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,普通,1111111,kang_test,特記事項テストです。,004,キーボード,100,個,100000,非課税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_3_19,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/18,test112,testsiten,testbank,普通,1111111,kim_test,特記事項テストです。,001,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_3_20,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/19,test113,testsiten,testbank,普通,1111111,kim_test,特記事項テストです。,002,ノートパソコン,100,個,100000,軽減税率,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_21,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,普通,1111111,kang_test,特記事項テストです。,001,ST001S,100,個,100000,軽減税率,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_22,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,普通,1111111,kang_test,特記事項テストです。,002,ST002M,100,個,100000,不課税,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_23,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,普通,1111111,kang_test,特記事項テストです。,003,マウス,100,個,100000,免税,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_24,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,普通,1111111,kang_test,特記事項テストです。,004,キーボード,100,個,100000,非課税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_3_25,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/18,test112,testsiten,testbank,普通,1111111,kim_test,特記事項テストです。,001,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_3_26,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/19,test113,testsiten,testbank,普通,1111111,kim_test,特記事項テストです。,002,ノートパソコン,100,個,100000,軽減税率,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_27,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,普通,1111111,kang_test,特記事項テストです。,001,ST001S,100,個,100000,軽減税率,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_28,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,普通,1111111,kang_test,特記事項テストです。,002,ST002M,100,個,100000,不課税,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_29,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,普通,1111111,kang_test,特記事項テストです。,003,マウス,100,個,100000,免税,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_30,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,普通,1111111,kang_test,特記事項テストです。,004,キーボード,100,個,100000,非課税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_3_31,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/18,test112,testsiten,testbank,普通,1111111,kim_test,特記事項テストです。,001,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_3_32,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/19,test113,testsiten,testbank,普通,1111111,kim_test,特記事項テストです。,002,ノートパソコン,100,個,100000,軽減税率,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_33,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,普通,1111111,kang_test,特記事項テストです。,001,ST001S,100,個,100000,軽減税率,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_34,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,普通,1111111,kang_test,特記事項テストです。,002,ST002M,100,個,100000,不課税,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_35,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,普通,1111111,kang_test,特記事項テストです。,003,マウス,100,個,100000,免税,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_36,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,普通,1111111,kang_test,特記事項テストです。,004,キーボード,100,個,100000,非課税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_3_37,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/18,test112,testsiten,testbank,普通,1111111,kim_test,特記事項テストです。,001,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_3_38,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/19,test113,testsiten,testbank,普通,1111111,kim_test,特記事項テストです。,002,ノートパソコン,100,個,100000,軽減税率,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_39,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,普通,1111111,kang_test,特記事項テストです。,001,ST001S,100,個,100000,軽減税率,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_40,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,普通,1111111,kang_test,特記事項テストです。,002,ST002M,100,個,100000,不課税,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_41,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,普通,1111111,kang_test,特記事項テストです。,003,マウス,100,個,100000,免税,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_42,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,普通,1111111,kang_test,特記事項テストです。,004,キーボード,100,個,100000,非課税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_3_43,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/18,test112,testsiten,testbank,普通,1111111,kim_test,特記事項テストです。,001,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_3_44,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/19,test113,testsiten,testbank,普通,1111111,kim_test,特記事項テストです。,002,ノートパソコン,100,個,100000,軽減税率,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_45,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,普通,1111111,kang_test,特記事項テストです。,001,ST001S,100,個,100000,軽減税率,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_46,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,普通,1111111,kang_test,特記事項テストです。,002,ST002M,100,個,100000,不課税,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_47,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,普通,1111111,kang_test,特記事項テストです。,003,マウス,100,個,100000,免税,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_48,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,普通,1111111,kang_test,特記事項テストです。,004,キーボード,100,個,100000,非課税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_3_49,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/18,test112,testsiten,testbank,普通,1111111,kim_test,特記事項テストです。,001,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_3_50,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/19,test113,testsiten,testbank,普通,1111111,kim_test,特記事項テストです。,002,ノートパソコン,100,個,100000,軽減税率,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_51,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,普通,1111111,kang_test,特記事項テストです。,001,ST001S,100,個,100000,軽減税率,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_52,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,普通,1111111,kang_test,特記事項テストです。,002,ST002M,100,個,100000,不課税,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_53,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,普通,1111111,kang_test,特記事項テストです。,003,マウス,100,個,100000,免税,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_54,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,普通,1111111,kang_test,特記事項テストです。,004,キーボード,100,個,100000,非課税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_3_55,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/18,test112,testsiten,testbank,普通,1111111,kim_test,特記事項テストです。,001,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_3_56,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/19,test113,testsiten,testbank,普通,1111111,kim_test,特記事項テストです。,002,ノートパソコン,100,個,100000,軽減税率,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_57,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,普通,1111111,kang_test,特記事項テストです。,001,ST001S,100,個,100000,軽減税率,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_58,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,普通,1111111,kang_test,特記事項テストです。,002,ST002M,100,個,100000,不課税,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_59,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,普通,1111111,kang_test,特記事項テストです。,003,マウス,100,個,100000,免税,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_60,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,普通,1111111,kang_test,特記事項テストです。,004,キーボード,100,個,100000,非課税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_3_61,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/18,test112,testsiten,testbank,普通,1111111,kim_test,特記事項テストです。,001,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_3_62,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/19,test113,testsiten,testbank,普通,1111111,kim_test,特記事項テストです。,002,ノートパソコン,100,個,100000,軽減税率,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_63,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,普通,1111111,kang_test,特記事項テストです。,001,ST001S,100,個,100000,軽減税率,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_64,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,普通,1111111,kang_test,特記事項テストです。,002,ST002M,100,個,100000,不課税,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_65,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,普通,1111111,kang_test,特記事項テストです。,003,マウス,100,個,100000,免税,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_66,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,普通,1111111,kang_test,特記事項テストです。,004,キーボード,100,個,100000,非課税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_3_67,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/18,test112,testsiten,testbank,普通,1111111,kim_test,特記事項テストです。,001,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_3_68,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/19,test113,testsiten,testbank,普通,1111111,kim_test,特記事項テストです。,002,ノートパソコン,100,個,100000,軽減税率,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_69,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,普通,1111111,kang_test,特記事項テストです。,001,ST001S,100,個,100000,軽減税率,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_70,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,普通,1111111,kang_test,特記事項テストです。,002,ST002M,100,個,100000,不課税,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_71,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,普通,1111111,kang_test,特記事項テストです。,003,マウス,100,個,100000,免税,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_72,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,普通,1111111,kang_test,特記事項テストです。,004,キーボード,100,個,100000,非課税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_3_73,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/18,test112,testsiten,testbank,普通,1111111,kim_test,特記事項テストです。,001,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_3_74,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/19,test113,testsiten,testbank,普通,1111111,kim_test,特記事項テストです。,002,ノートパソコン,100,個,100000,軽減税率,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_75,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,普通,1111111,kang_test,特記事項テストです。,001,ST001S,100,個,100000,軽減税率,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_76,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,普通,1111111,kang_test,特記事項テストです。,002,ST002M,100,個,100000,不課税,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_77,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,普通,1111111,kang_test,特記事項テストです。,003,マウス,100,個,100000,免税,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_78,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,普通,1111111,kang_test,特記事項テストです。,004,キーボード,100,個,100000,非課税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_3_79,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/18,test112,testsiten,testbank,普通,1111111,kim_test,特記事項テストです。,001,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_3_80,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/19,test113,testsiten,testbank,普通,1111111,kim_test,特記事項テストです。,002,ノートパソコン,100,個,100000,軽減税率,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_81,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,普通,1111111,kang_test,特記事項テストです。,001,ST001S,100,個,100000,軽減税率,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_82,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,普通,1111111,kang_test,特記事項テストです。,002,ST002M,100,個,100000,不課税,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_83,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,普通,1111111,kang_test,特記事項テストです。,003,マウス,100,個,100000,免税,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_84,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,普通,1111111,kang_test,特記事項テストです。,004,キーボード,100,個,100000,非課税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_3_85,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/18,test112,testsiten,testbank,普通,1111111,kim_test,特記事項テストです。,001,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_3_86,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/19,test113,testsiten,testbank,普通,1111111,kim_test,特記事項テストです。,002,ノートパソコン,100,個,100000,軽減税率,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_87,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,普通,1111111,kang_test,特記事項テストです。,001,ST001S,100,個,100000,軽減税率,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_88,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,普通,1111111,kang_test,特記事項テストです。,002,ST002M,100,個,100000,不課税,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_89,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,普通,1111111,kang_test,特記事項テストです。,003,マウス,100,個,100000,免税,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_90,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,普通,1111111,kang_test,特記事項テストです。,004,キーボード,100,個,100000,非課税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_3_91,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/18,test112,testsiten,testbank,普通,1111111,kim_test,特記事項テストです。,001,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_3_92,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/19,test113,testsiten,testbank,普通,1111111,kim_test,特記事項テストです。,002,ノートパソコン,100,個,100000,軽減税率,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_93,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,普通,1111111,kang_test,特記事項テストです。,001,ST001S,100,個,100000,軽減税率,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_94,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,普通,1111111,kang_test,特記事項テストです。,002,ST002M,100,個,100000,不課税,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_95,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,普通,1111111,kang_test,特記事項テストです。,003,マウス,100,個,100000,免税,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_96,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,普通,1111111,kang_test,特記事項テストです。,004,キーボード,100,個,100000,非課税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_3_97,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/18,test112,testsiten,testbank,普通,1111111,kim_test,特記事項テストです。,001,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_3_98,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/19,test113,testsiten,testbank,普通,1111111,kim_test,特記事項テストです。,002,ノートパソコン,100,個,100000,軽減税率,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_99,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,普通,1111111,kang_test,特記事項テストです。,001,ST001S,100,個,100000,軽減税率,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_100,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,普通,1111111,kang_test,特記事項テストです。,002,ST002M,100,個,100000,不課税,アップロードテスト`
  ).toString('base64')

  // 請求書が100以上、エラー発生
  const fileData101 = Buffer.from(
    `発行日,請求書番号,テナントID,支払期日,納品日,備考,銀行名,支店名,科目,口座番号,口座名義,その他特異事項,明細-項目ID,明細-内容,明細-数量,明細-単位,明細-単価,明細-税,明細-備考
2021-06-15,UT_TEST_INVOICE_3_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/18,test112,testsiten,testbank,普通,1111111,kim_test,特記事項テストです。,001,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_3_2,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/19,test113,testsiten,testbank,普通,1111111,kim_test,特記事項テストです。,002,ノートパソコン,100,個,100000,軽減税率,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_3,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,普通,1111111,kang_test,特記事項テストです。,001,ST001S,100,個,100000,軽減税率,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_4,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,普通,1111111,kang_test,特記事項テストです。,002,ST002M,100,個,100000,不課税,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_5,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,普通,1111111,kang_test,特記事項テストです。,003,マウス,100,個,100000,免税,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_6,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,普通,1111111,kang_test,特記事項テストです。,004,キーボード,100,個,100000,非課税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_3_7,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/18,test112,testsiten,testbank,普通,1111111,kim_test,特記事項テストです。,001,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_3_8,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/19,test113,testsiten,testbank,普通,1111111,kim_test,特記事項テストです。,002,ノートパソコン,100,個,100000,軽減税率,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_9,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,普通,1111111,kang_test,特記事項テストです。,001,ST001S,100,個,100000,軽減税率,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_10,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,普通,1111111,kang_test,特記事項テストです。,002,ST002M,100,個,100000,不課税,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_11,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,普通,1111111,kang_test,特記事項テストです。,003,マウス,100,個,100000,免税,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_12,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,普通,1111111,kang_test,特記事項テストです。,004,キーボード,100,個,100000,非課税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_3_13,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/18,test112,testsiten,testbank,普通,1111111,kim_test,特記事項テストです。,001,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_3_14,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/19,test113,testsiten,testbank,普通,1111111,kim_test,特記事項テストです。,002,ノートパソコン,100,個,100000,軽減税率,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_15,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,普通,1111111,kang_test,特記事項テストです。,001,ST001S,100,個,100000,軽減税率,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_16,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,普通,1111111,kang_test,特記事項テストです。,002,ST002M,100,個,100000,不課税,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_17,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,普通,1111111,kang_test,特記事項テストです。,003,マウス,100,個,100000,免税,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_18,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,普通,1111111,kang_test,特記事項テストです。,004,キーボード,100,個,100000,非課税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_3_19,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/18,test112,testsiten,testbank,普通,1111111,kim_test,特記事項テストです。,001,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_3_20,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/19,test113,testsiten,testbank,普通,1111111,kim_test,特記事項テストです。,002,ノートパソコン,100,個,100000,軽減税率,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_21,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,普通,1111111,kang_test,特記事項テストです。,001,ST001S,100,個,100000,軽減税率,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_22,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,普通,1111111,kang_test,特記事項テストです。,002,ST002M,100,個,100000,不課税,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_23,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,普通,1111111,kang_test,特記事項テストです。,003,マウス,100,個,100000,免税,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_24,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,普通,1111111,kang_test,特記事項テストです。,004,キーボード,100,個,100000,非課税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_3_25,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/18,test112,testsiten,testbank,普通,1111111,kim_test,特記事項テストです。,001,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_3_26,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/19,test113,testsiten,testbank,普通,1111111,kim_test,特記事項テストです。,002,ノートパソコン,100,個,100000,軽減税率,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_27,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,普通,1111111,kang_test,特記事項テストです。,001,ST001S,100,個,100000,軽減税率,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_28,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,普通,1111111,kang_test,特記事項テストです。,002,ST002M,100,個,100000,不課税,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_29,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,普通,1111111,kang_test,特記事項テストです。,003,マウス,100,個,100000,免税,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_30,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,普通,1111111,kang_test,特記事項テストです。,004,キーボード,100,個,100000,非課税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_3_31,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/18,test112,testsiten,testbank,普通,1111111,kim_test,特記事項テストです。,001,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_3_32,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/19,test113,testsiten,testbank,普通,1111111,kim_test,特記事項テストです。,002,ノートパソコン,100,個,100000,軽減税率,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_33,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,普通,1111111,kang_test,特記事項テストです。,001,ST001S,100,個,100000,軽減税率,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_34,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,普通,1111111,kang_test,特記事項テストです。,002,ST002M,100,個,100000,不課税,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_35,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,普通,1111111,kang_test,特記事項テストです。,003,マウス,100,個,100000,免税,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_36,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,普通,1111111,kang_test,特記事項テストです。,004,キーボード,100,個,100000,非課税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_3_37,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/18,test112,testsiten,testbank,普通,1111111,kim_test,特記事項テストです。,001,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_3_38,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/19,test113,testsiten,testbank,普通,1111111,kim_test,特記事項テストです。,002,ノートパソコン,100,個,100000,軽減税率,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_39,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,普通,1111111,kang_test,特記事項テストです。,001,ST001S,100,個,100000,軽減税率,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_40,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,普通,1111111,kang_test,特記事項テストです。,002,ST002M,100,個,100000,不課税,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_41,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,普通,1111111,kang_test,特記事項テストです。,003,マウス,100,個,100000,免税,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_42,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,普通,1111111,kang_test,特記事項テストです。,004,キーボード,100,個,100000,非課税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_3_43,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/18,test112,testsiten,testbank,普通,1111111,kim_test,特記事項テストです。,001,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_3_44,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/19,test113,testsiten,testbank,普通,1111111,kim_test,特記事項テストです。,002,ノートパソコン,100,個,100000,軽減税率,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_45,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,普通,1111111,kang_test,特記事項テストです。,001,ST001S,100,個,100000,軽減税率,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_46,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,普通,1111111,kang_test,特記事項テストです。,002,ST002M,100,個,100000,不課税,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_47,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,普通,1111111,kang_test,特記事項テストです。,003,マウス,100,個,100000,免税,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_48,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,普通,1111111,kang_test,特記事項テストです。,004,キーボード,100,個,100000,非課税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_3_49,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/18,test112,testsiten,testbank,普通,1111111,kim_test,特記事項テストです。,001,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_3_50,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/19,test113,testsiten,testbank,普通,1111111,kim_test,特記事項テストです。,002,ノートパソコン,100,個,100000,軽減税率,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_51,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,普通,1111111,kang_test,特記事項テストです。,001,ST001S,100,個,100000,軽減税率,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_52,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,普通,1111111,kang_test,特記事項テストです。,002,ST002M,100,個,100000,不課税,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_53,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,普通,1111111,kang_test,特記事項テストです。,003,マウス,100,個,100000,免税,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_54,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,普通,1111111,kang_test,特記事項テストです。,004,キーボード,100,個,100000,非課税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_3_55,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/18,test112,testsiten,testbank,普通,1111111,kim_test,特記事項テストです。,001,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_3_56,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/19,test113,testsiten,testbank,普通,1111111,kim_test,特記事項テストです。,002,ノートパソコン,100,個,100000,軽減税率,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_57,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,普通,1111111,kang_test,特記事項テストです。,001,ST001S,100,個,100000,軽減税率,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_58,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,普通,1111111,kang_test,特記事項テストです。,002,ST002M,100,個,100000,不課税,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_59,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,普通,1111111,kang_test,特記事項テストです。,003,マウス,100,個,100000,免税,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_60,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,普通,1111111,kang_test,特記事項テストです。,004,キーボード,100,個,100000,非課税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_3_61,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/18,test112,testsiten,testbank,普通,1111111,kim_test,特記事項テストです。,001,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_3_62,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/19,test113,testsiten,testbank,普通,1111111,kim_test,特記事項テストです。,002,ノートパソコン,100,個,100000,軽減税率,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_63,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,普通,1111111,kang_test,特記事項テストです。,001,ST001S,100,個,100000,軽減税率,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_64,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,普通,1111111,kang_test,特記事項テストです。,002,ST002M,100,個,100000,不課税,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_65,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,普通,1111111,kang_test,特記事項テストです。,003,マウス,100,個,100000,免税,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_66,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,普通,1111111,kang_test,特記事項テストです。,004,キーボード,100,個,100000,非課税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_3_67,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/18,test112,testsiten,testbank,普通,1111111,kim_test,特記事項テストです。,001,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_3_68,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/19,test113,testsiten,testbank,普通,1111111,kim_test,特記事項テストです。,002,ノートパソコン,100,個,100000,軽減税率,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_69,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,普通,1111111,kang_test,特記事項テストです。,001,ST001S,100,個,100000,軽減税率,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_70,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,普通,1111111,kang_test,特記事項テストです。,002,ST002M,100,個,100000,不課税,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_71,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,普通,1111111,kang_test,特記事項テストです。,003,マウス,100,個,100000,免税,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_72,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,普通,1111111,kang_test,特記事項テストです。,004,キーボード,100,個,100000,非課税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_3_73,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/18,test112,testsiten,testbank,普通,1111111,kim_test,特記事項テストです。,001,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_3_74,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/19,test113,testsiten,testbank,普通,1111111,kim_test,特記事項テストです。,002,ノートパソコン,100,個,100000,軽減税率,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_75,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,普通,1111111,kang_test,特記事項テストです。,001,ST001S,100,個,100000,軽減税率,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_76,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,普通,1111111,kang_test,特記事項テストです。,002,ST002M,100,個,100000,不課税,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_77,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,普通,1111111,kang_test,特記事項テストです。,003,マウス,100,個,100000,免税,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_78,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,普通,1111111,kang_test,特記事項テストです。,004,キーボード,100,個,100000,非課税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_3_79,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/18,test112,testsiten,testbank,普通,1111111,kim_test,特記事項テストです。,001,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_3_80,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/19,test113,testsiten,testbank,普通,1111111,kim_test,特記事項テストです。,002,ノートパソコン,100,個,100000,軽減税率,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_81,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,普通,1111111,kang_test,特記事項テストです。,001,ST001S,100,個,100000,軽減税率,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_82,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,普通,1111111,kang_test,特記事項テストです。,002,ST002M,100,個,100000,不課税,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_83,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,普通,1111111,kang_test,特記事項テストです。,003,マウス,100,個,100000,免税,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_84,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,普通,1111111,kang_test,特記事項テストです。,004,キーボード,100,個,100000,非課税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_3_85,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/18,test112,testsiten,testbank,普通,1111111,kim_test,特記事項テストです。,001,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_3_86,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/19,test113,testsiten,testbank,普通,1111111,kim_test,特記事項テストです。,002,ノートパソコン,100,個,100000,軽減税率,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_87,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,普通,1111111,kang_test,特記事項テストです。,001,ST001S,100,個,100000,軽減税率,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_88,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,普通,1111111,kang_test,特記事項テストです。,002,ST002M,100,個,100000,不課税,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_89,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,普通,1111111,kang_test,特記事項テストです。,003,マウス,100,個,100000,免税,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_90,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,普通,1111111,kang_test,特記事項テストです。,004,キーボード,100,個,100000,非課税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_3_91,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/18,test112,testsiten,testbank,普通,1111111,kim_test,特記事項テストです。,001,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_3_92,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/19,test113,testsiten,testbank,普通,1111111,kim_test,特記事項テストです。,002,ノートパソコン,100,個,100000,軽減税率,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_93,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,普通,1111111,kang_test,特記事項テストです。,001,ST001S,100,個,100000,軽減税率,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_94,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,普通,1111111,kang_test,特記事項テストです。,002,ST002M,100,個,100000,不課税,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_95,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,普通,1111111,kang_test,特記事項テストです。,003,マウス,100,個,100000,免税,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_96,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,普通,1111111,kang_test,特記事項テストです。,004,キーボード,100,個,100000,非課税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_3_97,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/18,test112,testsiten,testbank,普通,1111111,kim_test,特記事項テストです。,001,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_3_98,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/19,test113,testsiten,testbank,普通,1111111,kim_test,特記事項テストです。,002,ノートパソコン,100,個,100000,軽減税率,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_99,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,普通,1111111,kang_test,特記事項テストです。,001,ST001S,100,個,100000,軽減税率,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_100,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,普通,1111111,kang_test,特記事項テストです。,002,ST002M,100,個,100000,不課税,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_101,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,普通,1111111,kang_test,特記事項テストです。,002,ST002M,100,個,100000,不課税,アップロードテスト`
  ).toString('base64')

  // 明細書：200件
  const fileData200 = Buffer.from(
    `発行日,請求書番号,テナントID,支払期日,納品日,備考,銀行名,支店名,科目,口座番号,口座名義,その他特異事項,明細-項目ID,明細-内容,明細-数量,明細-単位,明細-単価,明細-税,明細-備考
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,1111111,kim_test,200件テストです。,001,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,11112,kim_test,200件テストです。,002,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,11113,kim_test,200件テストです。,003,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,11114,kim_test,200件テストです。,004,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,11115,kim_test,200件テストです。,005,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,11116,kim_test,200件テストです。,006,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,11117,kim_test,200件テストです。,007,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,11118,kim_test,200件テストです。,008,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,11119,kim_test,200件テストです。,009,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,11120,kim_test,200件テストです。,010,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,11121,kim_test,200件テストです。,011,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,11122,kim_test,200件テストです。,012,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,11123,kim_test,200件テストです。,013,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,11124,kim_test,200件テストです。,014,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,11125,kim_test,200件テストです。,015,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,11126,kim_test,200件テストです。,016,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,11127,kim_test,200件テストです。,017,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,11128,kim_test,200件テストです。,018,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,11129,kim_test,200件テストです。,019,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,11130,kim_test,200件テストです。,020,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,11131,kim_test,200件テストです。,021,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,11132,kim_test,200件テストです。,022,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,11133,kim_test,200件テストです。,023,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,11134,kim_test,200件テストです。,024,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,11135,kim_test,200件テストです。,025,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,11136,kim_test,200件テストです。,026,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,11137,kim_test,200件テストです。,027,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,11138,kim_test,200件テストです。,028,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,11139,kim_test,200件テストです。,029,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,11140,kim_test,200件テストです。,030,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,11141,kim_test,200件テストです。,031,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,11142,kim_test,200件テストです。,032,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,11143,kim_test,200件テストです。,033,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,11144,kim_test,200件テストです。,034,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,11145,kim_test,200件テストです。,035,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,11146,kim_test,200件テストです。,036,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,11147,kim_test,200件テストです。,037,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,11148,kim_test,200件テストです。,038,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,11149,kim_test,200件テストです。,039,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,11150,kim_test,200件テストです。,040,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,11151,kim_test,200件テストです。,041,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,11152,kim_test,200件テストです。,042,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,11153,kim_test,200件テストです。,043,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,11154,kim_test,200件テストです。,044,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,11155,kim_test,200件テストです。,045,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,11156,kim_test,200件テストです。,046,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,11157,kim_test,200件テストです。,047,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,11158,kim_test,200件テストです。,048,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,11159,kim_test,200件テストです。,049,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,11160,kim_test,200件テストです。,050,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,11161,kim_test,200件テストです。,051,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,11162,kim_test,200件テストです。,052,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,11163,kim_test,200件テストです。,053,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,11164,kim_test,200件テストです。,054,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,11165,kim_test,200件テストです。,055,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,11166,kim_test,200件テストです。,056,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,11167,kim_test,200件テストです。,057,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,11168,kim_test,200件テストです。,058,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,11169,kim_test,200件テストです。,059,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,11170,kim_test,200件テストです。,060,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,11171,kim_test,200件テストです。,061,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,11172,kim_test,200件テストです。,062,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,11173,kim_test,200件テストです。,063,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,11174,kim_test,200件テストです。,064,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,11175,kim_test,200件テストです。,065,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,11176,kim_test,200件テストです。,066,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,11177,kim_test,200件テストです。,067,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,11178,kim_test,200件テストです。,068,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,11179,kim_test,200件テストです。,069,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,11180,kim_test,200件テストです。,070,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,11181,kim_test,200件テストです。,071,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,11182,kim_test,200件テストです。,072,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,11183,kim_test,200件テストです。,073,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,11184,kim_test,200件テストです。,074,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,11185,kim_test,200件テストです。,075,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,11186,kim_test,200件テストです。,076,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,11187,kim_test,200件テストです。,077,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,11188,kim_test,200件テストです。,078,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,11189,kim_test,200件テストです。,079,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,11190,kim_test,200件テストです。,080,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,11191,kim_test,200件テストです。,081,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,11192,kim_test,200件テストです。,082,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,11193,kim_test,200件テストです。,083,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,11194,kim_test,200件テストです。,084,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,11195,kim_test,200件テストです。,085,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,11196,kim_test,200件テストです。,086,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,11197,kim_test,200件テストです。,087,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,11198,kim_test,200件テストです。,088,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,11199,kim_test,200件テストです。,089,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,11200,kim_test,200件テストです。,090,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,11201,kim_test,200件テストです。,091,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,11202,kim_test,200件テストです。,092,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,11203,kim_test,200件テストです。,093,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,11204,kim_test,200件テストです。,094,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,11205,kim_test,200件テストです。,095,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,11206,kim_test,200件テストです。,096,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,11207,kim_test,200件テストです。,097,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,11208,kim_test,200件テストです。,098,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,11209,kim_test,200件テストです。,099,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,11210,kim_test,200件テストです。,100,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,11211,kim_test,200件テストです。,101,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,11212,kim_test,200件テストです。,102,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,11213,kim_test,200件テストです。,103,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,11214,kim_test,200件テストです。,104,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,11215,kim_test,200件テストです。,105,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,11216,kim_test,200件テストです。,106,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,11217,kim_test,200件テストです。,107,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,11218,kim_test,200件テストです。,108,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,11219,kim_test,200件テストです。,109,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,11220,kim_test,200件テストです。,110,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,11221,kim_test,200件テストです。,111,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,11222,kim_test,200件テストです。,112,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,11223,kim_test,200件テストです。,113,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,11224,kim_test,200件テストです。,114,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,11225,kim_test,200件テストです。,115,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,11226,kim_test,200件テストです。,116,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,11227,kim_test,200件テストです。,117,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,11228,kim_test,200件テストです。,118,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,11229,kim_test,200件テストです。,119,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,11230,kim_test,200件テストです。,120,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,11231,kim_test,200件テストです。,121,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,11232,kim_test,200件テストです。,122,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,11233,kim_test,200件テストです。,123,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,11234,kim_test,200件テストです。,124,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,11235,kim_test,200件テストです。,125,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,11236,kim_test,200件テストです。,126,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,11237,kim_test,200件テストです。,127,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,11238,kim_test,200件テストです。,128,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,11239,kim_test,200件テストです。,129,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,11240,kim_test,200件テストです。,130,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,11241,kim_test,200件テストです。,131,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,11242,kim_test,200件テストです。,132,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,11243,kim_test,200件テストです。,133,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,11244,kim_test,200件テストです。,134,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,11245,kim_test,200件テストです。,135,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,11246,kim_test,200件テストです。,136,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,11247,kim_test,200件テストです。,137,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,11248,kim_test,200件テストです。,138,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,11249,kim_test,200件テストです。,139,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,11250,kim_test,200件テストです。,140,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,11251,kim_test,200件テストです。,141,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,11252,kim_test,200件テストです。,142,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,11253,kim_test,200件テストです。,143,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,11254,kim_test,200件テストです。,144,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,11255,kim_test,200件テストです。,145,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,11256,kim_test,200件テストです。,146,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,11257,kim_test,200件テストです。,147,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,11258,kim_test,200件テストです。,148,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,11259,kim_test,200件テストです。,149,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,11260,kim_test,200件テストです。,150,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,11261,kim_test,200件テストです。,151,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,11262,kim_test,200件テストです。,152,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,11263,kim_test,200件テストです。,153,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,11264,kim_test,200件テストです。,154,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,11265,kim_test,200件テストです。,155,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,11266,kim_test,200件テストです。,156,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,11267,kim_test,200件テストです。,157,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,11268,kim_test,200件テストです。,158,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,11269,kim_test,200件テストです。,159,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,11270,kim_test,200件テストです。,160,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,11271,kim_test,200件テストです。,161,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,11272,kim_test,200件テストです。,162,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,11273,kim_test,200件テストです。,163,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,11274,kim_test,200件テストです。,164,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,11275,kim_test,200件テストです。,165,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,11276,kim_test,200件テストです。,166,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,11277,kim_test,200件テストです。,167,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,11278,kim_test,200件テストです。,168,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,11279,kim_test,200件テストです。,169,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,11280,kim_test,200件テストです。,170,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,11281,kim_test,200件テストです。,171,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,11282,kim_test,200件テストです。,172,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,11283,kim_test,200件テストです。,173,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,11284,kim_test,200件テストです。,174,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,11285,kim_test,200件テストです。,175,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,11286,kim_test,200件テストです。,176,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,11287,kim_test,200件テストです。,177,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,11288,kim_test,200件テストです。,178,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,11289,kim_test,200件テストです。,179,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,11290,kim_test,200件テストです。,180,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,11291,kim_test,200件テストです。,181,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,11292,kim_test,200件テストです。,182,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,11293,kim_test,200件テストです。,183,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,11294,kim_test,200件テストです。,184,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,11295,kim_test,200件テストです。,185,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,11296,kim_test,200件テストです。,186,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,11297,kim_test,200件テストです。,187,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,11298,kim_test,200件テストです。,188,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,11299,kim_test,200件テストです。,189,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,11300,kim_test,200件テストです。,190,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,11301,kim_test,200件テストです。,191,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,11302,kim_test,200件テストです。,192,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,11303,kim_test,200件テストです。,193,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,11304,kim_test,200件テストです。,194,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,11305,kim_test,200件テストです。,195,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,11306,kim_test,200件テストです。,196,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,11307,kim_test,200件テストです。,197,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,11308,kim_test,200件テストです。,198,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,11309,kim_test,200件テストです。,199,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,11310,kim_test,200件テストです。,200,PC,100,個,100000,消費税,アップロードテスト`
  ).toString('base64')

  // 明細書：201件
  const fileData201 = Buffer.from(
    `発行日,請求書番号,テナントID,支払期日,納品日,備考,銀行名,支店名,科目,口座番号,口座名義,その他特異事項,明細-項目ID,明細-内容,明細-数量,明細-単位,明細-単価,明細-税,明細-備考
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,1111112,kim_test,200件テストです。,001,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,1111212,kim_test,200件テストです。,002,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,1111312,kim_test,200件テストです。,003,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,1111412,kim_test,200件テストです。,004,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,1111512,kim_test,200件テストです。,005,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,1111612,kim_test,200件テストです。,006,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,1111712,kim_test,200件テストです。,007,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,1111812,kim_test,200件テストです。,008,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,1111912,kim_test,200件テストです。,009,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,1112012,kim_test,200件テストです。,010,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,1112112,kim_test,200件テストです。,011,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,1112212,kim_test,200件テストです。,012,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,1112312,kim_test,200件テストです。,013,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,1112412,kim_test,200件テストです。,014,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,1112512,kim_test,200件テストです。,015,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,1112612,kim_test,200件テストです。,016,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,1112712,kim_test,200件テストです。,017,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,1112812,kim_test,200件テストです。,018,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,1112912,kim_test,200件テストです。,019,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,1113012,kim_test,200件テストです。,020,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,1113112,kim_test,200件テストです。,021,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,1113212,kim_test,200件テストです。,022,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,1113312,kim_test,200件テストです。,023,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,1113412,kim_test,200件テストです。,024,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,1113512,kim_test,200件テストです。,025,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,1113612,kim_test,200件テストです。,026,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,1113712,kim_test,200件テストです。,027,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,1113812,kim_test,200件テストです。,028,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,1113912,kim_test,200件テストです。,029,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,1114012,kim_test,200件テストです。,030,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,1114112,kim_test,200件テストです。,031,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,1114212,kim_test,200件テストです。,032,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,1114312,kim_test,200件テストです。,033,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,1114412,kim_test,200件テストです。,034,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,1114512,kim_test,200件テストです。,035,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,1114612,kim_test,200件テストです。,036,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,1114712,kim_test,200件テストです。,037,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,1114812,kim_test,200件テストです。,038,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,1114912,kim_test,200件テストです。,039,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,1115012,kim_test,200件テストです。,040,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,1115112,kim_test,200件テストです。,041,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,1115212,kim_test,200件テストです。,042,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,1115312,kim_test,200件テストです。,043,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,1115412,kim_test,200件テストです。,044,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,1115512,kim_test,200件テストです。,045,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,1115612,kim_test,200件テストです。,046,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,1115712,kim_test,200件テストです。,047,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,1115812,kim_test,200件テストです。,048,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,1115912,kim_test,200件テストです。,049,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,1116012,kim_test,200件テストです。,050,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,1116112,kim_test,200件テストです。,051,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,1116212,kim_test,200件テストです。,052,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,1116312,kim_test,200件テストです。,053,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,1116412,kim_test,200件テストです。,054,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,1116512,kim_test,200件テストです。,055,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,1116612,kim_test,200件テストです。,056,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,1116712,kim_test,200件テストです。,057,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,1116812,kim_test,200件テストです。,058,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,1116912,kim_test,200件テストです。,059,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,1117012,kim_test,200件テストです。,060,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,1117112,kim_test,200件テストです。,061,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,1117212,kim_test,200件テストです。,062,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,1117312,kim_test,200件テストです。,063,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,1117412,kim_test,200件テストです。,064,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,1117512,kim_test,200件テストです。,065,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,1117612,kim_test,200件テストです。,066,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,1117712,kim_test,200件テストです。,067,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,1117812,kim_test,200件テストです。,068,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,1117912,kim_test,200件テストです。,069,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,1118012,kim_test,200件テストです。,070,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,1118112,kim_test,200件テストです。,071,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,1118212,kim_test,200件テストです。,072,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,1118312,kim_test,200件テストです。,073,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,1118412,kim_test,200件テストです。,074,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,1118512,kim_test,200件テストです。,075,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,1118612,kim_test,200件テストです。,076,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,1118712,kim_test,200件テストです。,077,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,1118812,kim_test,200件テストです。,078,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,1118912,kim_test,200件テストです。,079,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,1119012,kim_test,200件テストです。,080,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,1119112,kim_test,200件テストです。,081,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,1119212,kim_test,200件テストです。,082,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,1119312,kim_test,200件テストです。,083,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,1119412,kim_test,200件テストです。,084,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,1119512,kim_test,200件テストです。,085,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,1119612,kim_test,200件テストです。,086,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,1119712,kim_test,200件テストです。,087,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,1119812,kim_test,200件テストです。,088,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,1119912,kim_test,200件テストです。,089,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,1120012,kim_test,200件テストです。,090,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,1120112,kim_test,200件テストです。,091,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,1120212,kim_test,200件テストです。,092,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,1120312,kim_test,200件テストです。,093,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,1120412,kim_test,200件テストです。,094,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,1120512,kim_test,200件テストです。,095,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,1120612,kim_test,200件テストです。,096,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,1120712,kim_test,200件テストです。,097,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,1120812,kim_test,200件テストです。,098,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,1120912,kim_test,200件テストです。,099,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,1121012,kim_test,200件テストです。,100,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,1121112,kim_test,200件テストです。,101,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,1121212,kim_test,200件テストです。,102,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,1121312,kim_test,200件テストです。,103,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,1121412,kim_test,200件テストです。,104,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,1121512,kim_test,200件テストです。,105,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,1121612,kim_test,200件テストです。,106,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,1121712,kim_test,200件テストです。,107,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,1121812,kim_test,200件テストです。,108,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,1121912,kim_test,200件テストです。,109,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,1122012,kim_test,200件テストです。,110,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,1122112,kim_test,200件テストです。,111,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,1122212,kim_test,200件テストです。,112,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,1122312,kim_test,200件テストです。,113,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,1122412,kim_test,200件テストです。,114,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,1122512,kim_test,200件テストです。,115,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,1122612,kim_test,200件テストです。,116,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,1122712,kim_test,200件テストです。,117,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,1122812,kim_test,200件テストです。,118,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,1122912,kim_test,200件テストです。,119,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,1123012,kim_test,200件テストです。,120,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,1123112,kim_test,200件テストです。,121,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,1123212,kim_test,200件テストです。,122,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,1123312,kim_test,200件テストです。,123,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,1123412,kim_test,200件テストです。,124,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,1123512,kim_test,200件テストです。,125,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,1123612,kim_test,200件テストです。,126,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,1123712,kim_test,200件テストです。,127,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,1123812,kim_test,200件テストです。,128,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,1123912,kim_test,200件テストです。,129,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,1124012,kim_test,200件テストです。,130,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,1124112,kim_test,200件テストです。,131,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,1124212,kim_test,200件テストです。,132,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,1124312,kim_test,200件テストです。,133,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,1124412,kim_test,200件テストです。,134,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,1124512,kim_test,200件テストです。,135,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,1124612,kim_test,200件テストです。,136,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,1124712,kim_test,200件テストです。,137,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,1124812,kim_test,200件テストです。,138,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,1124912,kim_test,200件テストです。,139,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,1125012,kim_test,200件テストです。,140,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,1125112,kim_test,200件テストです。,141,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,1125212,kim_test,200件テストです。,142,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,1125312,kim_test,200件テストです。,143,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,1125412,kim_test,200件テストです。,144,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,1125512,kim_test,200件テストです。,145,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,1125612,kim_test,200件テストです。,146,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,1125712,kim_test,200件テストです。,147,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,1125812,kim_test,200件テストです。,148,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,1125912,kim_test,200件テストです。,149,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,1126012,kim_test,200件テストです。,150,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,1126112,kim_test,200件テストです。,151,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,1126212,kim_test,200件テストです。,152,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,1126312,kim_test,200件テストです。,153,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,1126412,kim_test,200件テストです。,154,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,1126512,kim_test,200件テストです。,155,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,1126612,kim_test,200件テストです。,156,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,1126712,kim_test,200件テストです。,157,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,1126812,kim_test,200件テストです。,158,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,1126912,kim_test,200件テストです。,159,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,1127012,kim_test,200件テストです。,160,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,1127112,kim_test,200件テストです。,161,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,1127212,kim_test,200件テストです。,162,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,1127312,kim_test,200件テストです。,163,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,1127412,kim_test,200件テストです。,164,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,1127512,kim_test,200件テストです。,165,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,1127612,kim_test,200件テストです。,166,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,1127712,kim_test,200件テストです。,167,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,1127812,kim_test,200件テストです。,168,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,1127912,kim_test,200件テストです。,169,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,1128012,kim_test,200件テストです。,170,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,1128112,kim_test,200件テストです。,171,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,1128212,kim_test,200件テストです。,172,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,1128312,kim_test,200件テストです。,173,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,1128412,kim_test,200件テストです。,174,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,1128512,kim_test,200件テストです。,175,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,1128612,kim_test,200件テストです。,176,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,1128712,kim_test,200件テストです。,177,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,1128812,kim_test,200件テストです。,178,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,1128912,kim_test,200件テストです。,179,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,1129012,kim_test,200件テストです。,180,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,1129112,kim_test,200件テストです。,181,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,1129212,kim_test,200件テストです。,182,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,1129312,kim_test,200件テストです。,183,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,1129412,kim_test,200件テストです。,184,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,1129512,kim_test,200件テストです。,185,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,1129612,kim_test,200件テストです。,186,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,1129712,kim_test,200件テストです。,187,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,1129812,kim_test,200件テストです。,188,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,1129912,kim_test,200件テストです。,189,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,1130012,kim_test,200件テストです。,190,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,1130112,kim_test,200件テストです。,191,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,1130212,kim_test,200件テストです。,192,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,1130312,kim_test,200件テストです。,193,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,1130412,kim_test,200件テストです。,194,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,1130512,kim_test,200件テストです。,195,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,1130612,kim_test,200件テストです。,196,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,1130712,kim_test,200件テストです。,197,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,1130812,kim_test,200件テストです。,198,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,1130912,kim_test,200件テストです。,199,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,1131012,kim_test,200件テストです。,200,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test201,testsiten,testbank,普通,1131012,kim_test,201件テストです。,201,PC,100,個,100000,消費税,アップロードテスト`
  ).toString('base64')

  const fileDataInvoiceIDlessthanequal101 = Buffer.from(
    `発行日,請求書番号,テナントID,支払期日,納品日,備考,銀行名,支店名,科目,口座番号,口座名義,その他特異事項,明細-項目ID,明細-内容,明細-数量,明細-単位,明細-単価,明細-税,明細-備考
2021-06-15,UT_TEST_INVOICE_5_10000000000000000000000000000000000000000000000000000000000000000000000000000000001,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,1111111,kim_test,200件テストです。,001,PC,100,個,100000,消費税,アップロードテスト`
  ).toString('base64')

  const fileDataBankNamelessthanequal201 = Buffer.from(
    `発行日,請求書番号,テナントID,支払期日,納品日,備考,銀行名,支店名,科目,口座番号,口座名義,その他特異事項,明細-項目ID,明細-内容,明細-数量,明細-単位,明細-単価,明細-税,明細-備考
2021-06-15,UT_TEST_INVOICE_6_2,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,日本銀行赤銀行緑銀行青い銀行白い銀行黒い銀行日本銀行赤銀行緑銀行青い銀行白い銀行黒い銀行日本銀行赤銀行緑銀行青い銀行白い銀行黒い銀行日本銀行赤銀行緑銀行青い銀行白い銀行黒い銀行日本銀行赤銀行緑銀行青い銀行白い銀行黒い銀行日本銀行赤銀行緑銀行青い銀行白い銀行黒い銀行日本銀行赤銀行緑銀行青い銀行白い銀行黒い銀行日本銀行赤銀行緑銀行青い銀行白い銀行黒い銀行日本銀行赤銀行緑銀行青い銀行白い銀行黒い銀行日本ぎ,testsiten,普通,1111111,kim_test,200件テストです。,001,PC,100,個,100000,消費税,アップロードテスト`
  ).toString('base64')

  const fileDataIssueDateleap = Buffer.from(
    `発行日,請求書番号,テナントID,支払期日,納品日,備考,銀行名,支店名,科目,口座番号,口座名義,その他特異事項,明細-項目ID,明細-内容,明細-数量,明細-単位,明細-単価,明細-税,明細-備考
2021-02-29,UT_TEST_INVOICE_7_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,1111111,kim_test,200件テストです。,001,PC,100,個,100000,消費税,アップロードテスト`
  ).toString('base64')

  const fileDataIssueDateTypeErr = Buffer.from(
    `発行日,請求書番号,テナントID,支払期日,納品日,備考,銀行名,支店名,科目,口座番号,口座名義,その他特異事項,明細-項目ID,明細-内容,明細-数量,明細-単位,明細-単価,明細-税,明細-備考
20210229,UT_TEST_INVOICE_8_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,1111111,kim_test,200件テストです。,001,PC,100,個,100000,消費税,アップロードテスト`
  ).toString('base64')

  const fileDataTenantTypeErr = Buffer.from(
    `発行日,請求書番号,テナントID,支払期日,納品日,備考,銀行名,支店名,科目,口座番号,口座名義,その他特異事項,明細-項目ID,明細-内容,明細-数量,明細-単位,明細-単価,明細-税,明細-備考
2021-08-20,UT_TEST_INVOICE_9_1,test,2021-08-16,2021-08-16,PBI318_手動試験,手動銀行,手動支店,普通,1234567,手動,請求書一括作成_1.csv,1,明細,1,個,100000,消費税,PBI318_手動試験`
  ).toString('base64')

  const fileDataSellersItemNumlessthanequal201 = Buffer.from(
    `発行日,請求書番号,テナントID,支払期日,納品日,備考,銀行名,支店名,科目,口座番号,口座名義,その他特異事項,明細-項目ID,明細-内容,明細-数量,明細-単位,明細-単価,明細-税,明細-備考
2021-06-15,UT_TEST_INVOICE_10_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,1111111,kim_test,200件テストです。,アイテムの番号が２０１桁より過ぎちゃった時バリデーションテストアイテムの番号が２０１桁より過ぎちゃった時バリデーションテストアイテムの番号が２０１桁より過ぎちゃった時バリデーションテストアイテムの番号が２０１桁より過ぎちゃった時バリデーションテストアイテムの番号が２０１桁より過ぎちゃった時バリデーションテストアイテムの番号が２０１桁より過ぎちゃった時バリデーションテストアイテムの番号が２０１桁より過,PC,100,個,100000,消費税,アップロードテスト`
  ).toString('base64')

  const fileDataItemNamelessthanequal501 = Buffer.from(
    `発行日,請求書番号,テナントID,支払期日,納品日,備考,銀行名,支店名,科目,口座番号,口座名義,その他特異事項,明細-項目ID,明細-内容,明細-数量,明細-単位,明細-単価,明細-税,明細-備考
2021-06-15,UT_TEST_INVOICE_11_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,1111111,kim_test,200件テストです。,001,明細書の内容は５００文字いないバリデーションチェックする。明細書の内容は５００文字いないバリデーションチェックする。明細書の内容は５００文字いないバリデーションチェックする。明細書の内容は５００文字いないバリデーションチェックする。明細書の内容は５００文字いないバリデーションチェックする。明細書の内容は５００文字いないバリデーションチェックする。明細書の内容は５００文字いないバリデーションチェックする。明細書の内容は５００文字いないバリデーションチェックする。明細書の内容は５００文字いないバリデーションチェックする。明細書の内容は５００文字いないバリデーションチェックする。明細書の内容は５００文字いないバリデーションチェックする。明細書の内容は５００文字いないバリデーションチェックする。明細書の内容は５００文字いないバリデーションチェックする。明細書の内容は５００文字いないバリデーションチェックする。明細書の内容は５００文字いないバリデーションチェックする。明細書の内容は５００文字いないバリデーションチェックする。明細書の内容は５００文字いないバリデーションチェックする。明細書の内容は５,100,個,100000,消費税,アップロードテスト`
  ).toString('base64')

  const fileDataQuantityValueBetween0and1000000000001 = Buffer.from(
    `発行日,請求書番号,テナントID,支払期日,納品日,備考,銀行名,支店名,科目,口座番号,口座名義,その他特異事項,明細-項目ID,明細-内容,明細-数量,明細-単位,明細-単価,明細-税,明細-備考
2021-06-15,UT_TEST_INVOICE_12_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,1111111,kim_test,200件テストです。,001,PC,-1,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_12_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,1111111,kim_test,200件テストです。,001,PC,1000000000001,個,100000,消費税,アップロードテスト`
  ).toString('base64')

  const fileDataQuantityValueTypeErr = Buffer.from(
    `発行日,請求書番号,テナントID,支払期日,納品日,備考,銀行名,支店名,科目,口座番号,口座名義,その他特異事項,明細-項目ID,明細-内容,明細-数量,明細-単位,明細-単価,明細-税,明細-備考
2021-06-15,UT_TEST_INVOICE_12_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,1111111,kim_test,200件テストです。,001,PC,abc,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_12_2,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten, testbank,普通,1111111,kim_test,200件テストです。,001,PC,0.5,個,100000,消費税,アップロードテスト`
  ).toString('base64')

  const fileDataPriceValueBetweenminus1000000000000andplus100000000000 = Buffer.from(
    `発行日,請求書番号,テナントID,支払期日,納品日,備考,銀行名,支店名,科目,口座番号,口座名義,その他特異事項,明細-項目ID,明細-内容,明細-数量,明細-単位,明細-単価,明細-税,明細-備考
2021-06-15,UT_TEST_INVOICE_13_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,1111111,kim_test,200件テストです。,001,PC,100,個,-1000000000001,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_13_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,1111111,kim_test,200件テストです。,001,PC,100,個,1000000000001,消費税,アップロードテスト`
  ).toString('base64')

  const fileDataPriceValueTypeErr = Buffer.from(
    `発行日,請求書番号,テナントID,支払期日,納品日,備考,銀行名,支店名,科目,口座番号,口座名義,その他特異事項,明細-項目ID,明細-内容,明細-数量,明細-単位,明細-単価,明細-税,明細-備考
2021-06-15,UT_TEST_INVOICE_13_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,1111111,kim_test,200件テストです。,001,PC,100,個,abc,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_13_2,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,1111111,kim_test,200件テストです。,001,PC,100,個,0.5,消費税,アップロードテスト`
  ).toString('base64')

  const unitcodeData = Buffer.from(
    `発行日,請求書番号,テナントID,支払期日,納品日,備考,銀行名,支店名,科目,口座番号,口座名義,その他特記事項,明細-項目ID,明細-内容,明細-数量,明細-単位,明細-単価,明細-税,明細-備考
2021-08-12,単位テスト1,927635b5-f469-493b-9ce0-b2bfc4062959,2021-06-30,2021-06-30,test222,testsiten,testbank,普通,2222222,test1,特記事項テスト1です。,001,PC,100,人月,100000,消費税,アップロードテスト1
2021-08-12,単位テスト2,927635b5-f469-493b-9ce0-b2bfc4062959,2021-06-30,2021-06-30,test222,testsiten,testbank,普通,2222222,test1,特記事項テスト1です。,001,PC,100,ボトル,100000,軽減税率,アップロードテスト1
2021-08-12,単位テスト3,927635b5-f469-493b-9ce0-b2bfc4062959,2021-06-30,2021-06-30,test222,testsiten,testbank,普通,2222222,test1,特記事項テスト1です。,001,PC,100,コスト,100000,不課税,アップロードテスト1
2021-08-12,単位テスト4,927635b5-f469-493b-9ce0-b2bfc4062959,2021-06-30,2021-06-30,test222,testsiten,testbank,普通,2222222,test1,特記事項テスト1です。,001,PC,100,コンテナ,100000,免税,アップロードテスト1
2021-08-12,単位テスト5,927635b5-f469-493b-9ce0-b2bfc4062959,2021-06-30,2021-06-30,test222,testsiten,testbank,普通,2222222,test1,特記事項テスト1です。,001,PC,100,センチリットル,100000,非課税,アップロードテスト1
2021-08-12,単位テスト6,927635b5-f469-493b-9ce0-b2bfc4062959,2021-06-30,2021-06-30,test222,testsiten,testbank,普通,2222222,test1,特記事項テスト1です。,001,PC,100,平方センチメートル,100000,消費税,アップロードテスト1
2021-08-12,単位テスト7,927635b5-f469-493b-9ce0-b2bfc4062959,2021-06-30,2021-06-30,test222,testsiten,testbank,普通,2222222,test1,特記事項テスト1です。,001,PC,100,立方センチメートル,100000,軽減税率,アップロードテスト1
2021-08-12,単位テスト8,927635b5-f469-493b-9ce0-b2bfc4062959,2021-06-30,2021-06-30,test222,testsiten,testbank,普通,2222222,test1,特記事項テスト1です。,001,PC,100,センチメートル,100000,不課税,アップロードテスト1
2021-08-12,単位テスト9,927635b5-f469-493b-9ce0-b2bfc4062959,2021-06-30,2021-06-30,test222,testsiten,testbank,普通,2222222,test1,特記事項テスト1です。,001,PC,100,ケース,100000,免税,アップロードテスト1
2021-08-12,単位テスト10,927635b5-f469-493b-9ce0-b2bfc4062959,2021-06-30,2021-06-30,test222,testsiten,testbank,普通,2222222,test1,特記事項テスト1です。,001,PC,100,カートン,100000,非課税,アップロードテスト1
2021-08-12,単位テスト11,927635b5-f469-493b-9ce0-b2bfc4062959,2021-06-30,2021-06-30,test222,testsiten,testbank,普通,2222222,test1,特記事項テスト1です。,001,PC,100,日,100000,消費税,アップロードテスト1
2021-08-12,単位テスト12,927635b5-f469-493b-9ce0-b2bfc4062959,2021-06-30,2021-06-30,test222,testsiten,testbank,普通,2222222,test1,特記事項テスト1です。,001,PC,100,デシリットル,100000,軽減税率,アップロードテスト1
2021-08-12,単位テスト13,927635b5-f469-493b-9ce0-b2bfc4062959,2021-06-30,2021-06-30,test222,testsiten,testbank,普通,2222222,test1,特記事項テスト1です。,001,PC,100,デシメートル,100000,不課税,アップロードテスト1
2021-08-12,単位テスト14,927635b5-f469-493b-9ce0-b2bfc4062959,2021-06-30,2021-06-30,test222,testsiten,testbank,普通,2222222,test1,特記事項テスト1です。,001,PC,100,グロス・キログラム,100000,免税,アップロードテスト1
2021-08-12,単位テスト15,927635b5-f469-493b-9ce0-b2bfc4062959,2021-06-30,2021-06-30,test222,testsiten,testbank,普通,2222222,test1,特記事項テスト1です。,001,PC,100,個,100000,非課税,アップロードテスト1
2021-08-12,単位テスト16,927635b5-f469-493b-9ce0-b2bfc4062959,2021-06-30,2021-06-30,test222,testsiten,testbank,普通,2222222,test1,特記事項テスト1です。,001,PC,100,フィート,100000,消費税,アップロードテスト1
2021-08-12,単位テスト17,927635b5-f469-493b-9ce0-b2bfc4062959,2021-06-30,2021-06-30,test222,testsiten,testbank,普通,2222222,test1,特記事項テスト1です。,001,PC,100,ガロン,100000,軽減税率,アップロードテスト1
2021-08-12,単位テスト18,927635b5-f469-493b-9ce0-b2bfc4062959,2021-06-30,2021-06-30,test222,testsiten,testbank,普通,2222222,test1,特記事項テスト1です。,001,PC,100,グラム,100000,不課税,アップロードテスト1
2021-08-12,単位テスト19,927635b5-f469-493b-9ce0-b2bfc4062959,2021-06-30,2021-06-30,test222,testsiten,testbank,普通,2222222,test1,特記事項テスト1です。,001,PC,100,総トン,100000,免税,アップロードテスト1
2021-08-12,単位テスト20,927635b5-f469-493b-9ce0-b2bfc4062959,2021-06-30,2021-06-30,test222,testsiten,testbank,普通,2222222,test1,特記事項テスト1です。,001,PC,100,時間,100000,非課税,アップロードテスト1
2021-08-12,単位テスト21,927635b5-f469-493b-9ce0-b2bfc4062959,2021-06-30,2021-06-30,test222,testsiten,testbank,普通,2222222,test1,特記事項テスト1です。,001,PC,100,キログラム,100000,消費税,アップロードテスト1
2021-08-12,単位テスト22,927635b5-f469-493b-9ce0-b2bfc4062959,2021-06-30,2021-06-30,test222,testsiten,testbank,普通,2222222,test1,特記事項テスト1です。,001,PC,100,キロメートル,100000,軽減税率,アップロードテスト1
2021-08-12,単位テスト23,927635b5-f469-493b-9ce0-b2bfc4062959,2021-06-30,2021-06-30,test222,testsiten,testbank,普通,2222222,test1,特記事項テスト1です。,001,PC,100,キロワット時,100000,不課税,アップロードテスト1
2021-08-12,単位テスト24,927635b5-f469-493b-9ce0-b2bfc4062959,2021-06-30,2021-06-30,test222,testsiten,testbank,普通,2222222,test1,特記事項テスト1です。,001,PC,100,ポンド,100000,免税,アップロードテスト1
2021-08-12,単位テスト25,927635b5-f469-493b-9ce0-b2bfc4062959,2021-06-30,2021-06-30,test222,testsiten,testbank,普通,2222222,test1,特記事項テスト1です。,001,PC,100,リットル,100000,非課税,アップロードテスト1
2021-08-12,単位テスト26,927635b5-f469-493b-9ce0-b2bfc4062959,2021-06-30,2021-06-30,test222,testsiten,testbank,普通,2222222,test1,特記事項テスト1です。,001,PC,100,ミリグラム,100000,消費税,アップロードテスト1
2021-08-12,単位テスト27,927635b5-f469-493b-9ce0-b2bfc4062959,2021-06-30,2021-06-30,test222,testsiten,testbank,普通,2222222,test1,特記事項テスト1です。,001,PC,100,ミリリットル,100000,軽減税率,アップロードテスト1
2021-08-12,単位テスト28,927635b5-f469-493b-9ce0-b2bfc4062959,2021-06-30,2021-06-30,test222,testsiten,testbank,普通,2222222,test1,特記事項テスト1です。,001,PC,100,ミリメートル,100000,不課税,アップロードテスト1
2021-08-12,単位テスト29,927635b5-f469-493b-9ce0-b2bfc4062959,2021-06-30,2021-06-30,test222,testsiten,testbank,普通,2222222,test1,特記事項テスト1です。,001,PC,100,月,100000,免税,アップロードテスト1
2021-08-12,単位テスト30,927635b5-f469-493b-9ce0-b2bfc4062959,2021-06-30,2021-06-30,test222,testsiten,testbank,普通,2222222,test1,特記事項テスト1です。,001,PC,100,平方メートル,100000,非課税,アップロードテスト1
2021-08-12,単位テスト31,927635b5-f469-493b-9ce0-b2bfc4062959,2021-06-30,2021-06-30,test222,testsiten,testbank,普通,2222222,test1,特記事項テスト1です。,001,PC,100,立方メートル,100000,消費税,アップロードテスト1
2021-08-12,単位テスト32,927635b5-f469-493b-9ce0-b2bfc4062959,2021-06-30,2021-06-30,test222,testsiten,testbank,普通,2222222,test1,特記事項テスト1です。,001,PC,100,メーター,100000,軽減税率,アップロードテスト1
2021-08-12,単位テスト33,927635b5-f469-493b-9ce0-b2bfc4062959,2021-06-30,2021-06-30,test222,testsiten,testbank,普通,2222222,test1,特記事項テスト1です。,001,PC,100,純トン,100000,不課税,アップロードテスト1
2021-08-12,単位テスト34,927635b5-f469-493b-9ce0-b2bfc4062959,2021-06-30,2021-06-30,test222,testsiten,testbank,普通,2222222,test1,特記事項テスト1です。,001,PC,100,包,100000,免税,アップロードテスト1
2021-08-12,単位テスト35,927635b5-f469-493b-9ce0-b2bfc4062959,2021-06-30,2021-06-30,test222,testsiten,testbank,普通,2222222,test1,特記事項テスト1です。,001,PC,100,巻,100000,非課税,アップロードテスト1
2021-08-12,単位テスト36,927635b5-f469-493b-9ce0-b2bfc4062959,2021-06-30,2021-06-30,test222,testsiten,testbank,普通,2222222,test1,特記事項テスト1です。,001,PC,100,式,100000,消費税,アップロードテスト1
2021-08-12,単位テスト37,927635b5-f469-493b-9ce0-b2bfc4062959,2021-06-30,2021-06-30,test222,testsiten,testbank,普通,2222222,test1,特記事項テスト1です。,001,PC,100,トン,100000,軽減税率,アップロードテスト1
2021-08-12,単位テスト38,927635b5-f469-493b-9ce0-b2bfc4062959,2021-06-30,2021-06-30,test222,testsiten,testbank,普通,2222222,test1,特記事項テスト1です。,001,PC,100,その他,100000,不課税,アップロードテスト1
2021-08-12,単位テスト101,927635b5-f469-493b-9ce0-b2bfc4062959,2021-06-30,2021-06-30,test222,testsiten,testbank,普通,2222222,test1,特記事項テスト1です。,001,PC,100,人月1,100000,消費税,アップロードテスト1
2021-08-12,単位テスト102,927635b5-f469-493b-9ce0-b2bfc4062959,2021-06-30,2021-06-30,test222,testsiten,testbank,普通,2222222,test1,特記事項テスト1です。,001,PC,100,ボトル1,100000,軽減税率,アップロードテスト1
2021-08-12,単位テスト103,927635b5-f469-493b-9ce0-b2bfc4062959,2021-06-30,2021-06-30,test222,testsiten,testbank,普通,2222222,test1,特記事項テスト1です。,001,PC,100,コスト1,100000,不課税,アップロードテスト1
2021-08-12,単位テスト104,927635b5-f469-493b-9ce0-b2bfc4062959,2021-06-30,2021-06-30,test222,testsiten,testbank,普通,2222222,test1,特記事項テスト1です。,001,PC,100,コンテナ1,100000,免税,アップロードテスト1
2021-08-12,単位テスト105,927635b5-f469-493b-9ce0-b2bfc4062959,2021-06-30,2021-06-30,test222,testsiten,testbank,普通,2222222,test1,特記事項テスト1です。,001,PC,100,センチリットル1,100000,非課税,アップロードテスト1
2021-08-12,単位テスト106,927635b5-f469-493b-9ce0-b2bfc4062959,2021-06-30,2021-06-30,test222,testsiten,testbank,普通,2222222,test1,特記事項テスト1です。,001,PC,100,平方センチメートル1,100000,消費税,アップロードテスト1
2021-08-12,単位テスト107,927635b5-f469-493b-9ce0-b2bfc4062959,2021-06-30,2021-06-30,test222,testsiten,testbank,普通,2222222,test1,特記事項テスト1です。,001,PC,100,立方センチメートル1,100000,軽減税率,アップロードテスト1
2021-08-12,単位テスト108,927635b5-f469-493b-9ce0-b2bfc4062959,2021-06-30,2021-06-30,test222,testsiten,testbank,普通,2222222,test1,特記事項テスト1です。,001,PC,100,センチメートル1,100000,不課税,アップロードテスト1
2021-08-12,単位テスト109,927635b5-f469-493b-9ce0-b2bfc4062959,2021-06-30,2021-06-30,test222,testsiten,testbank,普通,2222222,test1,特記事項テスト1です。,001,PC,100,ケース1,100000,免税,アップロードテスト1
2021-08-12,単位テスト110,927635b5-f469-493b-9ce0-b2bfc4062959,2021-06-30,2021-06-30,test222,testsiten,testbank,普通,2222222,test1,特記事項テスト1です。,001,PC,100,カートン1,100000,非課税,アップロードテスト1
2021-08-12,単位テスト111,927635b5-f469-493b-9ce0-b2bfc4062959,2021-06-30,2021-06-30,test222,testsiten,testbank,普通,2222222,test1,特記事項テスト1です。,001,PC,100,日1,100000,消費税,アップロードテスト1
2021-08-12,単位テスト112,927635b5-f469-493b-9ce0-b2bfc4062959,2021-06-30,2021-06-30,test222,testsiten,testbank,普通,2222222,test1,特記事項テスト1です。,001,PC,100,デシリットル1,100000,軽減税率,アップロードテスト1
2021-08-12,単位テスト113,927635b5-f469-493b-9ce0-b2bfc4062959,2021-06-30,2021-06-30,test222,testsiten,testbank,普通,2222222,test1,特記事項テスト1です。,001,PC,100,デシメートル1,100000,不課税,アップロードテスト1
2021-08-12,単位テスト114,927635b5-f469-493b-9ce0-b2bfc4062959,2021-06-30,2021-06-30,test222,testsiten,testbank,普通,2222222,test1,特記事項テスト1です。,001,PC,100,グロス・キログラム1,100000,免税,アップロードテスト1
2021-08-12,単位テスト115,927635b5-f469-493b-9ce0-b2bfc4062959,2021-06-30,2021-06-30,test222,testsiten,testbank,普通,2222222,test1,特記事項テスト1です。,001,PC,100,個1,100000,非課税,アップロードテスト1
2021-08-12,単位テスト116,927635b5-f469-493b-9ce0-b2bfc4062959,2021-06-30,2021-06-30,test222,testsiten,testbank,普通,2222222,test1,特記事項テスト1です。,001,PC,100,フィート1,100000,消費税,アップロードテスト1
2021-08-12,単位テスト117,927635b5-f469-493b-9ce0-b2bfc4062959,2021-06-30,2021-06-30,test222,testsiten,testbank,普通,2222222,test1,特記事項テスト1です。,001,PC,100,ガロン1,100000,軽減税率,アップロードテスト1
2021-08-12,単位テスト118,927635b5-f469-493b-9ce0-b2bfc4062959,2021-06-30,2021-06-30,test222,testsiten,testbank,普通,2222222,test1,特記事項テスト1です。,001,PC,100,グラム1,100000,不課税,アップロードテスト1
2021-08-12,単位テスト119,927635b5-f469-493b-9ce0-b2bfc4062959,2021-06-30,2021-06-30,test222,testsiten,testbank,普通,2222222,test1,特記事項テスト1です。,001,PC,100,総トン1,100000,免税,アップロードテスト1
2021-08-12,単位テスト120,927635b5-f469-493b-9ce0-b2bfc4062959,2021-06-30,2021-06-30,test222,testsiten,testbank,普通,2222222,test1,特記事項テスト1です。,001,PC,100,時間1,100000,非課税,アップロードテスト1
2021-08-12,単位テスト121,927635b5-f469-493b-9ce0-b2bfc4062959,2021-06-30,2021-06-30,test222,testsiten,testbank,普通,2222222,test1,特記事項テスト1です。,001,PC,100,キログラム1,100000,消費税,アップロードテスト1
2021-08-12,単位テスト122,927635b5-f469-493b-9ce0-b2bfc4062959,2021-06-30,2021-06-30,test222,testsiten,testbank,普通,2222222,test1,特記事項テスト1です。,001,PC,100,キロメートル1,100000,軽減税率,アップロードテスト1
2021-08-12,単位テスト123,927635b5-f469-493b-9ce0-b2bfc4062959,2021-06-30,2021-06-30,test222,testsiten,testbank,普通,2222222,test1,特記事項テスト1です。,001,PC,100,キロワット時1,100000,不課税,アップロードテスト1
2021-08-12,単位テスト124,927635b5-f469-493b-9ce0-b2bfc4062959,2021-06-30,2021-06-30,test222,testsiten,testbank,普通,2222222,test1,特記事項テスト1です。,001,PC,100,ポンド1,100000,免税,アップロードテスト1
2021-08-12,単位テスト125,927635b5-f469-493b-9ce0-b2bfc4062959,2021-06-30,2021-06-30,test222,testsiten,testbank,普通,2222222,test1,特記事項テスト1です。,001,PC,100,リットル1,100000,非課税,アップロードテスト1
2021-08-12,単位テスト126,927635b5-f469-493b-9ce0-b2bfc4062959,2021-06-30,2021-06-30,test222,testsiten,testbank,普通,2222222,test1,特記事項テスト1です。,001,PC,100,ミリグラム1,100000,消費税,アップロードテスト1
2021-08-12,単位テスト127,927635b5-f469-493b-9ce0-b2bfc4062959,2021-06-30,2021-06-30,test222,testsiten,testbank,普通,2222222,test1,特記事項テスト1です。,001,PC,100,ミリリットル1,100000,軽減税率,アップロードテスト1
2021-08-12,単位テスト128,927635b5-f469-493b-9ce0-b2bfc4062959,2021-06-30,2021-06-30,test222,testsiten,testbank,普通,2222222,test1,特記事項テスト1です。,001,PC,100,ミリメートル1,100000,不課税,アップロードテスト1
2021-08-12,単位テスト129,927635b5-f469-493b-9ce0-b2bfc4062959,2021-06-30,2021-06-30,test222,testsiten,testbank,普通,2222222,test1,特記事項テスト1です。,001,PC,100,月1,100000,免税,アップロードテスト1
2021-08-12,単位テスト130,927635b5-f469-493b-9ce0-b2bfc4062959,2021-06-30,2021-06-30,test222,testsiten,testbank,普通,2222222,test1,特記事項テスト1です。,001,PC,100,平方メートル1,100000,非課税,アップロードテスト1
2021-08-12,単位テスト131,927635b5-f469-493b-9ce0-b2bfc4062959,2021-06-30,2021-06-30,test222,testsiten,testbank,普通,2222222,test1,特記事項テスト1です。,001,PC,100,立方メートル1,100000,消費税,アップロードテスト1
2021-08-12,単位テスト132,927635b5-f469-493b-9ce0-b2bfc4062959,2021-06-30,2021-06-30,test222,testsiten,testbank,普通,2222222,test1,特記事項テスト1です。,001,PC,100,メーター1,100000,軽減税率,アップロードテスト1
2021-08-12,単位テスト133,927635b5-f469-493b-9ce0-b2bfc4062959,2021-06-30,2021-06-30,test222,testsiten,testbank,普通,2222222,test1,特記事項テスト1です。,001,PC,100,純トン1,100000,不課税,アップロードテスト1
2021-08-12,単位テスト134,927635b5-f469-493b-9ce0-b2bfc4062959,2021-06-30,2021-06-30,test222,testsiten,testbank,普通,2222222,test1,特記事項テスト1です。,001,PC,100,包1,100000,免税,アップロードテスト1
2021-08-12,単位テスト135,927635b5-f469-493b-9ce0-b2bfc4062959,2021-06-30,2021-06-30,test222,testsiten,testbank,普通,2222222,test1,特記事項テスト1です。,001,PC,100,巻1,100000,非課税,アップロードテスト1
2021-08-12,単位テスト136,927635b5-f469-493b-9ce0-b2bfc4062959,2021-06-30,2021-06-30,test222,testsiten,testbank,普通,2222222,test1,特記事項テスト1です。,001,PC,100,式1,100000,消費税,アップロードテスト1
2021-08-12,単位テスト137,927635b5-f469-493b-9ce0-b2bfc4062959,2021-06-30,2021-06-30,test222,testsiten,testbank,普通,2222222,test1,特記事項テスト1です。,001,PC,100,トン1,100000,軽減税率,アップロードテスト1
2021-08-12,単位テスト138,927635b5-f469-493b-9ce0-b2bfc4062959,2021-06-30,2021-06-30,test222,testsiten,testbank,普通,2222222,test1,特記事項テスト1です。,001,PC,100,その他1,100000,不課税,アップロードテスト1`
  ).toString('base64')

  const taxData = Buffer.from(
    `発行日,請求書番号,テナントID,支払期日,納品日,備考,銀行名,支店名,科目,口座番号,口座名義,その他特記事項,明細-項目ID,明細-内容,明細-数量,明細-単位,明細-単価,明細-税,明細-備考
2021-08-12,税テスト1,927635b5-f469-493b-9ce0-b2bfc4062959,2021-06-30,2021-06-30,test222,testsiten,testbank,普通,2222222,test1,特記事項テスト1です。,001,PC,100,人月,100000,消費税,アップロードテスト1
2021-08-12,税テスト2,927635b5-f469-493b-9ce0-b2bfc4062959,2021-06-30,2021-06-30,test222,testsiten,testbank,普通,2222222,test1,特記事項テスト1です。,001,PC,100,ボトル,100000,軽減税率,アップロードテスト1
2021-08-12,税テスト3,927635b5-f469-493b-9ce0-b2bfc4062959,2021-06-30,2021-06-30,test222,testsiten,testbank,普通,2222222,test1,特記事項テスト1です。,001,PC,100,コスト,100000,不課税,アップロードテスト1
2021-08-12,税テスト4,927635b5-f469-493b-9ce0-b2bfc4062959,2021-06-30,2021-06-30,test222,testsiten,testbank,普通,2222222,test1,特記事項テスト1です。,001,PC,100,コンテナ,100000,免税,アップロードテスト1
2021-08-12,税テスト5,927635b5-f469-493b-9ce0-b2bfc4062959,2021-06-30,2021-06-30,test222,testsiten,testbank,普通,2222222,test1,特記事項テスト1です。,001,PC,100,センチリットル,100000,非課税,アップロードテスト1
2021-08-12,税テスト11,927635b5-f469-493b-9ce0-b2bfc4062959,2021-06-30,2021-06-30,test222,testsiten,testbank,普通,2222222,test1,特記事項テスト1です。,001,PC,100,人月,100000,消費税1,アップロードテスト1
2021-08-12,税テスト12,927635b5-f469-493b-9ce0-b2bfc4062959,2021-06-30,2021-06-30,test222,testsiten,testbank,普通,2222222,test1,特記事項テスト1です。,001,PC,100,ボトル,100000,軽減税率1,アップロードテスト1
2021-08-12,税テスト13,927635b5-f469-493b-9ce0-b2bfc4062959,2021-06-30,2021-06-30,test222,testsiten,testbank,普通,2222222,test1,特記事項テスト1です。,001,PC,100,コスト,100000,不課税1,アップロードテスト1
2021-08-12,税テスト14,927635b5-f469-493b-9ce0-b2bfc4062959,2021-06-30,2021-06-30,test222,testsiten,testbank,普通,2222222,test1,特記事項テスト1です。,001,PC,100,コンテナ,100000,免税1,アップロードテスト1
2021-08-12,税テスト15,927635b5-f469-493b-9ce0-b2bfc4062959,2021-06-30,2021-06-30,test222,testsiten,testbank,普通,2222222,test1,特記事項テスト1です。,001,PC,100,センチリットル,100000,非課税1,アップロードテスト1`
  ).toString('base64')

  const networkCheckData = Buffer.from(
    `発行日,請求書番号,テナントID,支払期日,納品日,備考,銀行名,支店名,科目,口座番号,口座名義,その他特記事項,明細-項目ID,明細-内容,明細-数量,明細-単位,明細-単価,明細-税,明細-備考
2021-08-12,ネットワーク確認テスト1,927635b5-f469-493b-9ce0-b2bfc4062959,2021-06-30,2021-06-30,test222,testsiten,testbank,普通,2222222,test1,特記事項テスト1です。,001,PC,100,人月,100000,消費税,アップロードテスト1
2021-08-12,ネットワーク確認テスト2,927635b5-f469-493b-9ce0-b2bfc4062959,2021-06-30,2021-06-30,test222,testsiten,testbank,普通,2222222,test1,特記事項テスト1です。,001,PC,100,ボトル,100000,消費税,アップロードテスト1
2021-08-12,ネットワーク確認テスト11,927635b5-f469-493b-9ce0-000000000000,2021-06-30,2021-06-30,test222,testsiten,testbank,普通,2222222,test1,特記事項テスト1です。,001,PC,100,人月,100000,消費税,アップロードテスト1
2021-08-12,ネットワーク確認テスト12,927635b5-f469-493b-9ce0-000000000000,2021-06-30,2021-06-30,test222,testsiten,testbank,普通,2222222,test1,特記事項テスト1です。,001,PC,100,ボトル,100000,消費税,アップロードテスト1`
  ).toString('base64')

  const headerCloumnErr = Buffer.from(
    `発行日,請求書番号,テナントID,支払期日,納品日,備考,銀行名,支店名,科目,口座番号,口座名義,その他特異事項,明細-項目ID,明細-内容,明細-数量,明細-単位,明細-単価,明細-税,明細-備考,明細-テスト
2021-06-15,UT_TEST_INVOICE_13_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,1111111,kim_test,200件テストです。,001,PC,100,個,11,消費税,アップロードテスト`
  ).toString('base64')

  const invoiceListCloumnErr20 = Buffer.from(
    `発行日,請求書番号,テナントID,支払期日,納品日,備考,銀行名,支店名,科目,口座番号,口座名義,その他特異事項,明細-項目ID,明細-内容,明細-数量,明細-単位,明細-単価,明細-税,明細-備考
2021-06-15,UT_TEST_INVOICE_13_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,1111111,kim_test,200件テストです。,001,PC,100,個,11,消費税,アップロードテスト,テスト`
  ).toString('base64')

  const invoiceListCloumnErr18 = Buffer.from(
    `発行日,請求書番号,テナントID,支払期日,納品日,備考,銀行名,支店名,科目,口座番号,口座名義,その他特異事項,明細-項目ID,明細-内容,明細-数量,明細-単位,明細-単価,明細-税,明細-備考
2021-06-15,UT_TEST_INVOICE_13_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,普通,1111111,kim_test,200件テストです。,001,PC,100,個,11,消費税`
  ).toString('base64')

  const paymentDateleap = Buffer.from(
    `発行日,請求書番号,テナントID,支払期日,納品日,備考,銀行名,支店名,科目,口座番号,口座名義,その他特異事項,明細-項目ID,明細-内容,明細-数量,明細-単位,明細-単価,明細-税,明細-備考
2021-06-15,UT_TEST_INVOICE_13_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-02-29,2021-03-18,test200,testsiten,testbank,普通,1111111,kim_test,200件テストです。,001,PC,100,個,11,消費税,アップロードテスト`
  ).toString('base64')

  const paymentDateTypeErr = Buffer.from(
    `発行日,請求書番号,テナントID,支払期日,納品日,備考,銀行名,支店名,科目,口座番号,口座名義,その他特異事項,明細-項目ID,明細-内容,明細-数量,明細-単位,明細-単価,明細-税,明細-備考
2021-06-15,UT_TEST_INVOICE_13_1,3cfebb4f-2338-4dc7-9523-5423a027a880,20210331,2021-03-18,test200,testsiten,testbank,普通,1111111,kim_test,200件テストです。,001,PC,100,個,11,消費税,アップロードテスト`
  ).toString('base64')

  const deliveryDateleap = Buffer.from(
    `発行日,請求書番号,テナントID,支払期日,納品日,備考,銀行名,支店名,科目,口座番号,口座名義,その他特異事項,明細-項目ID,明細-内容,明細-数量,明細-単位,明細-単価,明細-税,明細-備考
2021-06-15,UT_TEST_INVOICE_13_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-29,2021-02-29,test200,testsiten,testbank,普通,1111111,kim_test,200件テストです。,001,PC,100,個,11,消費税,アップロードテスト`
  ).toString('base64')

  const deliveryDateTypeErr = Buffer.from(
    `発行日,請求書番号,テナントID,支払期日,納品日,備考,銀行名,支店名,科目,口座番号,口座名義,その他特異事項,明細-項目ID,明細-内容,明細-数量,明細-単位,明細-単価,明細-税,明細-備考
2021-06-15,UT_TEST_INVOICE_13_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-29,20210331,test200,testsiten,testbank,普通,1111111,kim_test,200件テストです。,001,PC,100,個,11,消費税,アップロードテスト`
  ).toString('base64')

  const financialInstitutionlessthanequal201 = Buffer.from(
    `発行日,請求書番号,テナントID,支払期日,納品日,備考,銀行名,支店名,科目,口座番号,口座名義,その他特異事項,明細-項目ID,明細-内容,明細-数量,明細-単位,明細-単価,明細-税,明細-備考
2021-06-15,UT_TEST_INVOICE_13_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-29,2021-03-29,備考欄桁数は２００以内にバリデーションチェックする。以上の場合、エラーが発生します。備考欄桁数は２００以内にバリデーションチェックする。以上の場合、エラーが発生します。備考欄桁数は２００以内にバリデーションチェックする。以上の場合、エラーが発生します。備考欄桁数は２００以内にバリデーションチェックする。以上の場合、エラーが発生します。備考欄桁数は２００以内にバリデーションチェックする。以上の場合、エ,testsiten,testbank,普通,1111111,kim_test,200件テストです。,001,PC,100,個,11,消費税,アップロードテスト`
  ).toString('base64')

  const financialNamelessthanequal201 = Buffer.from(
    `発行日,請求書番号,テナントID,支払期日,納品日,備考,銀行名,支店名,科目,口座番号,口座名義,その他特異事項,明細-項目ID,明細-内容,明細-数量,明細-単位,明細-単価,明細-税,明細-備考
2021-06-15,UT_TEST_INVOICE_13_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-29,2021-03-29,test,testbank,東京都板橋区志村坂上町の渋谷店の金王ビル１００号東京都板橋区志村坂上町の渋谷店の金王ビル１００号東京都板橋区志村坂上町の渋谷店の金王ビル１００号東京都板橋区志村坂上町の渋谷店の金王ビル１００号東京都板橋区志村坂上町の渋谷店の金王ビル１００号東京都板橋区志村坂上町の渋谷店の金王ビル１００号東京都板橋区志村坂上町の渋谷店の金王ビル１００号東京都板橋区志村坂上町の渋谷店の金王ビル１００号１００号１００号号,普通,1111111,kim_test,200件テストです。,001,PC,100,個,11,消費税,アップロードテスト`
  ).toString('base64')

  const accountTypeErr = Buffer.from(
    `発行日,請求書番号,テナントID,支払期日,納品日,備考,銀行名,支店名,科目,口座番号,口座名義,その他特異事項,明細-項目ID,明細-内容,明細-数量,明細-単位,明細-単価,明細-税,明細-備考
2021-06-15,UT_TEST_INVOICE_13_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-29,2021-03-29,test,testsiten,testbank,test,1111111,kim_test,200件テストです。,001,PC,100,個,11,消費税,アップロードテスト`
  ).toString('base64')

  const accountIdlessthanequal8 = Buffer.from(
    `発行日,請求書番号,テナントID,支払期日,納品日,備考,銀行名,支店名,科目,口座番号,口座名義,その他特異事項,明細-項目ID,明細-内容,明細-数量,明細-単位,明細-単価,明細-税,明細-備考
2021-06-15,UT_TEST_INVOICE_13_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-29,2021-03-29,test,testsiten,testbank,普通,12345678,kim_test,200件テストです。,001,PC,100,個,11,消費税,アップロードテスト`
  ).toString('base64')

  const accountIdTypeErr = Buffer.from(
    `発行日,請求書番号,テナントID,支払期日,納品日,備考,銀行名,支店名,科目,口座番号,口座名義,その他特異事項,明細-項目ID,明細-内容,明細-数量,明細-単位,明細-単価,明細-税,明細-備考
2021-06-15,UT_TEST_INVOICE_13_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-29,2021-03-29,test,testsiten,testbank,普通,abcdefg,kim_test,200件テストです。,001,PC,100,個,11,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_13_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-29,2021-03-29,test,testsiten,testbank,普通,0.5,kim_test,200件テストです。,001,PC,100,個,11,消費税,アップロードテスト`
  ).toString('base64')

  const accountNamelessthanequal201 = Buffer.from(
    `発行日,請求書番号,テナントID,支払期日,納品日,備考,銀行名,支店名,科目,口座番号,口座名義,その他特異事項,明細-項目ID,明細-内容,明細-数量,明細-単位,明細-単価,明細-税,明細-備考
2021-06-15,UT_TEST_INVOICE_13_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-29,2021-03-29,test,testsiten,testbank,普通,1234567,口座の名義は２００以内です。口座の名義は２００以内です。口座の名義は２００以内です。口座の名義は２００以内です。口座の名義は２００以内です。口座の名義は２００以内です。口座の名口座の名義は２００以内です。口座の名義は２００以内です。口座の名義は２００以内です。口座の名義は２００以内です。口座の名義は２００以内です。口座の名義は２００以内です。口座の名義は２００以内です。口座の名義は２００以内です。口,200件テストです。,001,PC,100,個,11,消費税,アップロードテスト`
  ).toString('base64')

  const notelessthanequal1001 = Buffer.from(
    `発行日,請求書番号,テナントID,支払期日,納品日,備考,銀行名,支店名,科目,口座番号,口座名義,その他特異事項,明細-項目ID,明細-内容,明細-数量,明細-単位,明細-単価,明細-税,明細-備考
2021-06-15,UT_TEST_INVOICE_13_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-29,2021-03-29,test,testsiten,testbank,普通,1234567,test,その他特事項事項は１０００件いないに作成する。その他特事項事項は１０００件いないに作成する。その他特事項事項は１０００件いないに作成する。その他特事項事項は１０００件いないに作成する。その他特事項事項は１０００件いないに作成する。その他特事項事項は１０００件いないに作成する。その他特事項事項は１０００件いないに作成する。その他特事項事項は１０００件いないに作成する。その他特事項事項は１０００件いないに作成する。その他特事項事項は１０００件いないに作成する。その他特事項事項は１０００件いないに作成する。その他特事項事項は１０００件いないに作成する。その他特事項事項は１０００件いないに作成する。その他特事項事項は１０００件いないに作成する。その他特事項事項は１０００件いないに作成する。その他特事項事項は１０００件いないに作成する。その他特事項事項は１０００件いないに作成する。その他特事項事項は１０００件いないに作成する。その他特事項事項は１０００件いないに作成する。その他特事項事項は１０００件いないに作成する。その他特事項事項は１０００件いないに作成する。その他特事項事項は１０００件いないに作成する。その他特事項事項は１０００件いないに作成する。その他特事項事項は１０００件いないに作成する。その他特事項事項は１０００件いないに作成する。その他特事項事項は１０００件いないに作成する。その他特事項事項は１０００件いないに作成する。その他特事項事項は１０００件いないに作成する。その他特事項事項は１０００件いないに作成する。その他特事項事項は１０００件いないに作成する。その他特事項事項は１０００件いないに作成する。その他特事項事項は１０００件いないに作成する。その他特事項事項は１０００件いないに作成する。その他特事項事項は１０００件いないに作成する。その他特事項事項は１０００件いないに作成する。その他特事項事項は１０００件いないに作成する。その他特事項事項は１０００件いないに作成する。その他特事項事項は１０００件いないに作成する。その他特事項事項は１０００件いないに作成する。その他特事項事項は１０００件いないに作成する。その他特事項事項は１０００件いないに作成する。その他特事項事項は１０００件いないに作成する。その他特事項事項は１０００件いないに作成する。その他特事項事項は１００,001,PC,100,個,11,消費税,アップロードテスト`
  ).toString('base64')

  const descriptionlessthanequal101 = Buffer.from(
    `発行日,請求書番号,テナントID,支払期日,納品日,備考,銀行名,支店名,科目,口座番号,口座名義,その他特異事項,明細-項目ID,明細-内容,明細-数量,明細-単位,明細-単価,明細-税,明細-備考
2021-06-15,UT_TEST_INVOICE_13_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-29,2021-03-29,test,testsiten,testbank,普通,1234567,test,テストです。,001,PC,100,個,11,消費税,明細書の備考の場合、１０００いないいに作成する。明細書の備考の場合、１０００いないいに作成する。明細書の備考の場合、１０００いないいに作成する。明細書の備考の場合、１０００いないいに作成する。明細書の備考の場合、１０００いないいに作成する。明細書の備考の場合、１０００いないいに作成する。明細書の備考の場合、１０００いないいに作成する。明細書の備考の場合、１０００いないいに作成する。明細書の備考の場合、１０００いないいに作成する。明細書の備考の場合、１０００いないいに作成する。明細書の備考の場合、１０００いないいに作成する。明細書の備考の場合、１０００いないいに作成する。明細書の備考の場合、１０００いないいに作成する。明細書の備考の場合、１０００いないいに作成する。明細書の備考の場合、１０００いないいに作成する。明細書の備考の場合、１０００いないいに作成する。明細書の備考の場合、１０００いないいに作成する。明細書の備考の場合、１０００いないいに作成する。明細書の備考の場合、１０００いないいに作成する。明細書の備考の場合、１０００いないいに作成する。明細書の備考の場合、１０００いないいに作成する。明細書の備考の場合、１０００いないいに作成する。明細書の備考の場合、１０００いないいに作成する。明細書の備考の場合、１０００いないいに作成する。明細書の備考の場合、１０００いないいに作成する。明細書の備考の場合、１０００いないいに作成する。明細書の備考の場合、１０００いないいに作成する。明細書の備考の場合、１０００いないいに作成する。明細書の備考の場合、１０００いないいに作成する。明細書の備考の場合、１０００いないいに作成する。明細書の備考の場合、１０００いないいに作成する。明細書の備考の場合、１０００いないいに作成する。明細書の備考の場合、１０００いないいに作成する。明細書の備考の場合、１０００いないいに作成する。明細書の備考の場合、１０００いないいに作成する。明細書の備考の場合、１０００いないいに作成する。明細書の備考の場合、１０００いないいに作成する。明細書の備考の場合、１０００いないいに作成する。明細書の備考の場合、１０００いないいに作成する。明細書の備考の場合、１０００いないいに作成する。明細書の備考の場合、１０００いないいに作成する。明細書の備考の場合、１０００いない`
  ).toString('base64')

  const countCheckData = Buffer.from(
    `発行日,請求書番号,テナントID,支払期日,納品日,備考,銀行名,支店名,科目,口座番号,口座名義,その他特異事項,明細-項目ID,明細-内容,明細-数量,明細-単位,明細-単価,明細-税,明細-備考
2021/06/14,UT_TEST_INVOICE_1_1,927635b5-f469-493b-9ce0-b2bfc4062959,2021/03/31,2021/03/17,test111,testsiten,testbank,普通,1111111,kang_test,特記事項テストです。,001,PC,100,個,100000,消費税,アップロードテスト
2021/06/34,UT_TEST_INVOICE_1_2,927635b5-f469-493b-9ce0-b2bfc4062959,2021/03/31,2021/03/17,test111,testsiten,testbank,普通,1111111,kang_test,特記事項テストです。,001,PC,100,個,100000,消費税,アップロードテスト
2021/06/14,UT_TEST_INVOICE_1_1,927635b5-f469-493b-9ce0-b2bfc4062959,2021/03/31,2021/03/17,test111,testsiten,testbank,普通,1111111,kang_test,特記事項テストです。,001,PC,100,個,100000,消費税,アップロードテスト`
  ).toString('base64')

  // const resultNetworkConnection = [
  //   '927635b5-f469-493b-9ce0-b2bfc4062959',
  //   '927635b5-f469-493b-9ce0-b2bfc4062951',
  //   '3cfebb4f-2338-4dc7-9523-5423a027a880'
  // ]

  const resultGetNetwork = {
    numPages: 1,
    pageId: 1,
    Connections: {
      Connection: [
        { State: 'ACCEPTED', CompanyAccountId: '927635b5-f469-493b-9ce0-b2bfc4062959' },
        { State: 'ACCEPTED', CompanyAccountId: '927635b5-f469-493b-9ce0-b2bfc4062951' },
        { State: 'ACCEPTED', CompanyAccountId: '3cfebb4f-2338-4dc7-9523-5423a027a880' }
      ]
    }
  }

  // 登録済みのドキュメントデータ
  const documentListData = {
    itemsPerPage: 10000,
    itemCount: 1,
    indexing: false,
    numPages: 1,
    pageId: 1,
    Document: [
      {
        DocumentId: '06051d44-fc05-4b89-9ba6-89594e4d7b9b',
        ID: 'UT_TEST_INVOICE_5_1',
        URI: 'https://api-sandbox.tradeshift.com/tradeshift/rest/external/documents/06051d44-fc05-4b89-9ba6-89594e4d7b9b',
        DocumentType: [Object],
        State: 'LOCKED',
        CreatedDateTime: '2021-06-22T09:05:50.759Z',
        LastEdit: '2021-08-13T10:07:03.485Z',
        Actor: [Object],
        ConversationId: 'dd255507-3e97-4342-8df1-5d128d1c14bc',
        ReceiverCompanyName: 'test',
        Tags: [Object],
        ItemInfos: [Array],
        LatestDispatch: [Object],
        SentReceivedTimestamp: '2021-08-13T10:07:05.233Z',
        ProcessState: 'OVERDUE',
        ConversationStates: [Array],
        UnifiedState: 'OVERDUE',
        CopyIndicator: false,
        Deleted: false,
        DueDate: '2021-05-31',
        TenantId: 'f783be0e-e716-4eab-a7ec-5ce36b3c7b31',
        Properties: []
      }
    ]
  }

  // 異常系データ定義
  // userIdがnullの場合
  const usernull = {
    email: 'dummy@testdummy.com',
    userId: null
  }
  // userStatusが0以外の場合
  const dataValuesStatuserr = {
    dataValues: {
      tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089',
      userRole: 'a6a3edcd-00d9-427c-bf03-4ef0112ba16d',
      appVersion: '0.0.1',
      refreshToken: 'dummyRefreshToken',
      subRefreshToken: null,
      userStatus: 1,
      lastRefreshedAt: null,
      createdAt: '2021-06-07T08:45:49.803Z',
      updatedAt: '2021-06-07T08:45:49.803Z'
    }
  }

  const contractdataValues = {
    dataValues: {
      contractId: '87654321-cb0b-48ad-857d-4b42a44ede13',
      tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089',
      numberN: '0000011111',
      contractStatus: '00',
      deleteFlag: false,
      createdAt: '2021-01-25T08:45:49.803Z',
      updatedAt: '2021-01-25T08:45:49.803Z'
    }
  }

  const contractdataValues2 = {
    dataValues: {
      contractId: '87654321-cb0b-48ad-857d-4b42a44ede13',
      tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089',
      numberN: '0000011111',
      contractStatus: '30',
      deleteFlag: false,
      createdAt: '2021-01-25T08:45:49.803Z',
      updatedAt: '2021-01-25T08:45:49.803Z'
    }
  }

  const contractdataValues3 = {
    dataValues: {
      contractId: '87654321-cb0b-48ad-857d-4b42a44ede13',
      tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089',
      numberN: '0000011111',
      contractStatus: '31',
      deleteFlag: false,
      createdAt: '2021-01-25T08:45:49.803Z',
      updatedAt: '2021-01-25T08:45:49.803Z'
    }
  }

  const contractdataValues4 = {
    dataValues: {
      contractId: '87654321-cb0b-48ad-857d-4b42a44ede13',
      tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089',
      numberN: '0000011111',
      contractStatus: null,
      deleteFlag: false,
      createdAt: '2021-01-25T08:45:49.803Z',
      updatedAt: '2021-01-25T08:45:49.803Z'
    }
  }

  // cbUploadCsvエラー場合（ファイル名（email））
  const useremailerr = {
    email: '/',
    userId: '12345678-cb0b-48ad-857d-4b42a44ede13'
  }

  const now = new Date()
  const invoiceData = {
    dataValues: {
      invoicesId: '40e8909d-2bc6-4296-aba4-994df26ec353',
      tenantId: user.tenantId,
      csvFileName: test.csv,
      successCount: -1,
      failCount: -1,
      skipCount: -1,
      createdAt: now,
      updatedAt: now
    }
  }

  const invoiceDetailData = {
    dataValues: {
      invoiceDetailId: '994df26e-aba4-2bc6-aba4-40e8909dc353',
      invoicesId: '40e8909d-2bc6-4296-aba4-994df26ec353',
      invoiceId: 'UT_TEST_INVOICE_6_2',
      lines: 2,
      status: '-1',
      errorData: '001、銀行名は、100文字以内で入力してください。',
      updatedAt: now,
      createdAt: now
    }
  }

  const invoiceParameta = {
    invoicesId: '40e8909d-2bc6-4296-aba4-994df26ec353',
    tenantId: user.tenantId,
    csvFileName: test.csv,
    successCount: -1,
    failCount: -1,
    skipCount: -1,
    createdAt: now,
    updatedAt: now
  }

  // 結果値
  // bconCsvの結果値
  const returnBconCsv =
    '{"DocumentType":"InvoiceType","UBLVersionID":{"value":"2.0"},"CustomizationID":{"value":"urn:tradeshift.com:ubl-2.0-customizations:2010-06"},"ProfileID":{"value":"urn:www.cenbii.eu:profile:bii04:ver1.0","schemeID":"CWA 16073:2010","schemeAgencyID":"CEN/ISSS WS/BII","schemeVersionID":"1"},"ID":{"value":"UT_TEST_INVOICE_1_1"},"IssueDate":{"value":"2021-06-14"},"InvoiceTypeCode":{"value":"380","listID":"UN/ECE 1001 Subset","listAgencyID":"6","listVersionID":"D08B"},"DocumentCurrencyCode":{"value":"JPY"},"Note":[{"value":"特記事項テストです。"}],"AdditionalDocumentReference":[{"ID":{"value":"test111"},"DocumentTypeCode":{"value":"File ID","listID":"urn:tradeshift.com:api:1.0:documenttypecode"}}],"AccountingCustomerParty":{"Party":{"PartyIdentification":[{"ID":{"value":"3cfebb4f-2338-4dc7-9523-5423a027a880","schemeID":"TS:ID","schemeName":"Tradeshift identifier"}}],"PartyName":[{"Name":{"value":null}}],"PostalAddress":{"StreetName":{"value":null},"BuildingNumber":{"value":null},"CityName":{"value":null},"PostalZone":{"value":null},"Country":{"IdentificationCode":{"value":"JP"}}},"Contact":{"ElectronicMail":{"value":null}}}},"Delivery":[{"ActualDeliveryDate":{"value":"2021-03-17"}}],"PaymentMeans":[{"PaymentMeansCode":{"value":42,"listID":"urn:tradeshift.com:api:1.0:paymentmeanscode"},"PaymentDueDate":{"value":"2021-03-31"},"PayeeFinancialAccount":{"FinancialInstitutionBranch":{"FinancialInstitution":{"Name":{"value":"testsiten"}},"Name":{"value":"testbank"}},"AccountTypeCode":{"value":"General"},"ID":{"value":"1111111"},"Name":{"value":"kang_test"}}}],"InvoiceLine":[{"ID":{"value":"1"},"InvoicedQuantity":{"value":100,"unitCode":"EA"},"LineExtensionAmount":{"value":null,"currencyID":"JPY"},"TaxTotal":[{"TaxSubtotal":[{"TaxCategory":{"ID":{"value":"S","schemeID":"UN/ECE 5305","schemeAgencyID":"6","schemeVersionID":"D08B"},"Percent":{"value":10},"TaxScheme":{"ID":{"value":"VAT","schemeID":"UN/ECE 5153 Subset","schemeAgencyID":"6","schemeVersionID":"D08B"},"Name":{"value":"JP 消費税 10%"}}}}]}],"Item":{"Name":{"value":"PC"},"SellersItemIdentification":{"ID":{"value":"001"}},"Description":[{"value":null}]},"Price":{"PriceAmount":{"value":"100000","currencyID":"JPY"}},"DocumentReference":[{"ID":{"value":"アップロードテスト"},"DocumentTypeCode":{"value":"File ID","listID":"urn:tradeshift.com:api:1.0:documenttypecode"}}]}]}'

  describe('ルーティング', () => {
    test('csvuploadのルーティングを確認', async () => {
      expect(csvupload.router.get).toBeCalledWith('/', helper.isAuthenticated, csvupload.cbGetIndex)
    })
  })

  describe('コールバック:cbGetIndex', () => {
    test('正常', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = {
        userContext: 'NotLoggedIn',
        userRole: 'dummy'
      }
      request.user = user

      // DBからの正常なユーザデータの取得を想定する
      findOneSpy.mockReturnValue(dataValues)
      // DBからの正常な契約情報取得を想定する
      findOneSpyContracts.mockReturnValue(contractdataValues)

      // 試験実施
      await csvupload.cbGetIndex(request, response, next)

      // 期待結果
      // 404，500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(500))
      // userContextがLoggedInになっている
      expect(request.session?.userContext).toBe('LoggedIn')
      // session.userRoleが'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'になっている
      expect(request.session?.userRole).toBe('a6a3edcd-00d9-427c-bf03-4ef0112ba16d')
      // response.renderでcsvuploadが呼ばれ「る」
      expect(response.render).toHaveBeenCalledWith('csvupload')
    })

    test('正常：解約申込中の場合', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = {
        userContext: 'NotLoggedIn',
        userRole: 'dummy'
      }
      request.user = user

      // DBからの正常なユーザデータの取得を想定する
      findOneSpy.mockReturnValue(dataValues)
      // DBからの正常な申込中の契約情報取得を想定する
      findOneSpyContracts.mockReturnValue(contractdataValues2)

      // 試験実施
      await csvupload.cbGetIndex(request, response, next)

      // 期待結果
      // 404，500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(500))
      // userContextがLoggedInになっている
      expect(request.session?.userContext).toBe('LoggedIn')
      // session.userRoleが'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'になっている
      expect(request.session?.userRole).toBe('a6a3edcd-00d9-427c-bf03-4ef0112ba16d')
      // 解約手続き中画面が表示「される」
      expect(next).toHaveBeenCalledWith(noticeHelper.create('cancelprocedure'))
    })

    test('正常：解約受取中の場合', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = {
        userContext: 'NotLoggedIn',
        userRole: 'dummy'
      }
      request.user = user

      // DBからの正常なユーザデータの取得を想定する
      findOneSpy.mockReturnValue(dataValues)
      // DBからの正常な解約受取中の契約情報取得を想定する
      findOneSpyContracts.mockReturnValue(contractdataValues3)

      // 試験実施
      await csvupload.cbGetIndex(request, response, next)

      // 期待結果
      // 404，500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(500))
      // userContextがLoggedInになっている
      expect(request.session?.userContext).toBe('LoggedIn')
      // session.userRoleが'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'になっている
      expect(request.session?.userRole).toBe('a6a3edcd-00d9-427c-bf03-4ef0112ba16d')
      // 解約手続き中画面が表示「される」
      expect(next).toHaveBeenCalledWith(noticeHelper.create('cancelprocedure'))
    })

    test('500エラー:不正なContractデータの場合', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = {
        userContext: 'NotLoggedIn',
        userRole: 'dummy'
      }
      request.user = user

      // DBからの正常なユーザデータの取得を想定する
      findOneSpy.mockReturnValue(dataValues)
      // DBからの不正な契約情報取得を想定する
      findOneSpyContracts.mockReturnValue(contractdataValues4)

      helper.checkContractStatus = 999

      // 試験実施
      await csvupload.cbGetIndex(request, response, next)

      // 期待結果
      // 404，500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      // 500エラーがエラーハンドリング「される」
      expect(next).toHaveBeenCalledWith(errorHelper.create(500))
    })

    test('500エラー：requestのsession,userIdがnullの場合', async () => {
      // 準備
      // requestのsession,userIdにnullを入れる
      request.session = null
      request.user = usernull

      helper.checkContractStatus = 10

      // 試験実施
      await csvupload.cbGetIndex(request, response, next)

      // 期待結果
      // 500エラーがエラーハンドリング「される」
      expect(next).toHaveBeenCalledWith(errorHelper.create(500))
      // userContextがLoggedInになって「いない」
      expect(request.session?.userContext).not.toBe('LoggedIn')
      // response.renderが呼ばれ「ない」
      expect(response.render).not.toHaveBeenCalled()
    })

    test('500エラー：DBからユーザが取得できなかった(null)場合', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = {
        userContext: 'NotLoggedIn',
        userRole: 'dummy'
      }
      request.user = user
      // DBからのユーザデータの取得ができなかった(null)場合を想定する
      findOneSpy.mockReturnValue(null)
      findOneSpyContracts.mockReturnValue(contractdataValues)

      // 試験実施
      await csvupload.cbGetIndex(request, response, next)

      // 期待結果
      // 404エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      // 500エラーがエラーハンドリング「される」
      expect(next).toHaveBeenCalledWith(errorHelper.create(500))
      // userContextがLoggedInになって「いない」
      expect(request.session?.userContext).not.toBe('LoggedIn')
      // session.userRoleが初期値のままになっている
      expect(request.session?.userRole).toBe('dummy')
      // response.renderが呼ばれ「ない」
      expect(response.render).not.toHaveBeenCalled()
    })

    test('500エラー：DBから契約情報が取得できなかった(null)場合', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = {
        userContext: 'NotLoggedIn',
        userRole: 'dummy'
      }
      request.user = user
      // DBからの契約情報の取得ができなかった(null)場合を想定する
      findOneSpy.mockReturnValue(dataValues)
      findOneSpyContracts.mockReturnValue(null)

      // 試験実施
      await csvupload.cbGetIndex(request, response, next)

      // 期待結果
      // 404エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      // 500エラーがエラーハンドリング「される」
      expect(next).toHaveBeenCalledWith(errorHelper.create(500))
      // userContextがLoggedInになって「いない」
      expect(request.session?.userContext).not.toBe('LoggedIn')
      // session.userRoleが初期値のままになっている
      expect(request.session?.userRole).toBe('dummy')
      // response.renderが呼ばれ「ない」
      expect(response.render).not.toHaveBeenCalled()
    })

    test('500エラー：ユーザDBエラーの場合', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = {
        userContext: 'NotLoggedIn',
        userRole: 'dummy'
      }
      request.user = user
      // DBからのユーザデータの取得でエラーが発生した場合を想定する
      findOneSpy.mockReturnValue(new Error('DB error mock'))
      findOneSpyContracts.mockReturnValue(contractdataValues)

      // 試験実施
      await csvupload.cbGetIndex(request, response, next)

      // 期待結果
      // 500エラーがエラーハンドリング「される」
      expect(next).toHaveBeenCalledWith(errorHelper.create(500))
    })

    test('500エラー：契約DBエラーの場合', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = {
        userContext: 'NotLoggedIn',
        userRole: 'dummy'
      }
      request.user = user
      // DBからのユーザデータの取得でエラーが発生した場合を想定する
      const spy = jest.spyOn(csvupload, 'cbPostUpload').mockReturnValue(404)

      // 試験実施
      await csvupload.cbGetIndex(request, response, next)

      spy.mockRestore()

      // 期待結果
      expect(next).toHaveBeenCalledWith(errorHelper.create(500))
    })

    test('404エラー：DBから取得したユーザのuserStatusが0以外の場合', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = {
        userContext: 'NotLoggedIn',
        userRole: 'dummy'
      }
      request.user = user
      // DBから取得したユーザデータのuserStatusが0以外の場合を想定する
      findOneSpy.mockReturnValue(dataValuesStatuserr)

      // 試験実施
      await csvupload.cbGetIndex(request, response, next)

      // 期待結果
      // 404エラーがエラーハンドリング「される」
      expect(next).toHaveBeenCalledWith(error404)
    })
  })

  // cbPostUploadの確認
  describe('cbPostUpload', () => {
    test('正常:請求書が１つの場合', async () => {
      // 準備
      // requestのuserIdに正常値を入れる
      request.session = {
        userContext: 'NotLoggedIn',
        userRole: 'dummy'
      }
      request.user = user
      // DBからの正常なユーザデータの取得を想定する
      findOneSpy.mockReturnValue(dataValues)
      createSpyInvoices.mockReturnValue(invoiceData)
      // DBからの正常な契約情報取得を想定する
      findOneSpyContracts.mockReturnValue(contractdataValues)

      // ファイルデータを設定
      request.body = {
        fileData: fileData
      }

      // 試験実施
      await csvupload.cbPostUpload(request, response, next)

      // 期待結果
      // 404，500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(500))
    })

    test('正常：請求書が番号２つ以上、請求書番号が一致している', async () => {
      // 準備
      // requestのuserIdに正常値を入れる
      request.session = {
        userContext: 'NotLoggedIn',
        userRole: 'dummy'
      }
      request.user = user
      // DBからの正常なユーザデータの取得を想定する
      findOneSpy.mockReturnValue(dataValues)
      createSpyInvoices.mockReturnValue(invoiceData)
      // DBからの正常な契約情報取得を想定する
      findOneSpyContracts.mockReturnValue(contractdataValues)

      // ファイルデータを設定
      request.body = {
        fileData: fileData2
      }

      // 試験実施
      await csvupload.cbPostUpload(request, response, next)

      // 期待結果
      // 404，500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(500))
    })

    test('正常：請求書番号２つ以上、請求書番号が順番になっている', async () => {
      // 準備
      // requestのuserIdに正常値を入れる
      request.session = {
        userContext: 'NotLoggedIn',
        userRole: 'dummy'
      }
      request.user = user
      // DBからの正常なユーザデータの取得を想定する
      findOneSpy.mockReturnValue(dataValues)
      createSpyInvoices.mockReturnValue(invoiceData)
      // DBからの正常な契約情報取得を想定する
      findOneSpyContracts.mockReturnValue(contractdataValues)

      // ファイルデータを設定
      request.body = {
        fileData: fileData3
      }

      // 試験実施
      await csvupload.cbPostUpload(request, response, next)

      // 期待結果
      // 404，500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(500))
    })

    test('正常：請求書番号２つ以上、請求書番号が割り込んでいる', async () => {
      // 準備
      // requestのuserIdに正常値を入れる
      request.session = {
        userContext: 'NotLoggedIn',
        userRole: 'dummy'
      }
      request.user = user
      // DBからの正常なユーザデータの取得を想定する
      findOneSpy.mockReturnValue(dataValues)
      createSpyInvoices.mockReturnValue(invoiceData)
      // DBからの正常な契約情報取得を想定する
      findOneSpyContracts.mockReturnValue(contractdataValues)

      // ファイルデータを設定
      request.body = {
        fileData: fileData4
      }

      // 試験実施
      await csvupload.cbPostUpload(request, response, next)

      // 期待結果
      // 404，500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(500))
    })

    test('正常：解約申込中の場合', async () => {
      // 準備
      // requestのuserIdに正常値を入れる
      request.session = {
        userContext: 'NotLoggedIn',
        userRole: 'dummy'
      }
      request.user = user
      // DBからの正常なユーザデータの取得を想定する
      findOneSpy.mockReturnValue(dataValues)
      // DBからの正常な契約情報取得を想定する
      findOneSpyContracts.mockReturnValue(contractdataValues2)

      // ファイルデータを設定
      request.body = {
        fileData: fileData
      }

      // 試験実施
      await csvupload.cbPostUpload(request, response, next)

      // 期待結果
      // 期待結果
      // 404，500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(500))
      // 解約手続き中画面が表示「される」
      expect(next).toHaveBeenCalledWith(noticeHelper.create('cancelprocedure'))
    })

    test('正常：解約受取中の場合', async () => {
      // 準備
      // requestのuserIdに正常値を入れる
      request.session = {
        userContext: 'NotLoggedIn',
        userRole: 'dummy'
      }
      request.user = user
      // DBからの正常なユーザデータの取得を想定する
      findOneSpy.mockReturnValue(dataValues)
      // DBからの正常な契約情報取得を想定する
      findOneSpyContracts.mockReturnValue(contractdataValues3)

      // ファイルデータを設定
      request.body = {
        fileData: fileData
      }

      // 試験実施
      await csvupload.cbPostUpload(request, response, next)

      // 期待結果
      // 404，500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(500))
      // 解約手続き中画面が表示「される」
      expect(next).toHaveBeenCalledWith(noticeHelper.create('cancelprocedure'))
    })

    test('500エラー:不正なContractデータの場合', async () => {
      // 準備
      // requestのuserIdに正常値を入れる
      request.session = {
        userContext: 'NotLoggedIn',
        userRole: 'dummy'
      }
      request.user = user
      // DBからの正常なユーザデータの取得を想定する
      findOneSpy.mockReturnValue(dataValues)
      // DBからの不正な契約情報取得を想定する
      findOneSpyContracts.mockReturnValue(contractdataValues4)

      // ファイルデータを設定
      request.body = {
        fileData
      }

      helper.checkContractStatus = 999

      // 試験実施
      await csvupload.cbPostUpload(request, response, next)

      // 期待結果
      // 404，500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      // 500エラーがエラーハンドリング「される」
      expect(next).toHaveBeenCalledWith(errorHelper.create(500))
    })

    test('500エラー：cbUploadCsv return false', async () => {
      // 準備
      // requestのuserIdに正常値を入れる
      request.session = {
        userContext: 'NotLoggedIn',
        userRole: 'dummy'
      }
      request.user = useremailerr
      // DBからの正常なユーザデータの取得を想定する
      findOneSpy.mockReturnValue(dataValues)

      // ファイルデータを設定
      request.body = {
        fileData: fileData
      }

      helper.checkContractStatus = 0

      // 試験実施
      await csvupload.cbPostUpload(request, response, next)

      // 期待結果
      // 500エラーがエラーハンドリング「される」
      expect(next).toHaveBeenCalledWith(errorHelper.create(500))
    })

    test('500エラー：requestのsession,userIdがnullの場合', async () => {
      // 準備
      // requestのsession,userIdにnullを入れる
      request.session = null
      request.user = usernull

      // 試験実施
      await csvupload.cbPostUpload(request, response, next)

      // 期待結果
      // 500エラーがエラーハンドリング「される」
      expect(next).toHaveBeenCalledWith(errorHelper.create(500))
    })

    test('500エラー：DBからユーザが取得できなかった(null)場合', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = {
        userContext: 'NotLoggedIn',
        userRole: 'dummy'
      }
      request.user = user
      // DBからのユーザデータの取得ができなかった(null)場合を想定する
      findOneSpy.mockReturnValue(null)

      // 試験実施
      await csvupload.cbPostUpload(request, response, next)

      // 期待結果
      // 500エラーがエラーハンドリング「される」
      expect(next).toHaveBeenCalledWith(errorHelper.create(500))
    })

    test('404エラー：DBから取得したユーザのuserStatusが0以外の場合', async () => {
      // userStatus : 0（正常）、1（解約（停止））

      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = {
        userContext: 'NotLoggedIn',
        userRole: 'dummy'
      }
      request.user = user
      // DBから取得したユーザデータのuserStatusが0以外の場合を想定する
      findOneSpy.mockReturnValue(dataValuesStatuserr)

      // 試験実施
      await csvupload.cbPostUpload(request, response, next)

      // 期待結果
      // 404エラーがエラーハンドリング「される」
      expect(next).toHaveBeenCalledWith(error404)
    })

    test('正常：請求書数100件', async () => {
      // 準備
      // requestのuserIdに正常値を入れる
      request.session = {
        userContext: 'NotLoggedIn',
        userRole: 'dummy'
      }
      request.user = user
      // DBからの正常なユーザデータの取得を想定する
      findOneSpy.mockReturnValue(dataValues)
      createSpyInvoices.mockReturnValue(invoiceData)
      // DBからの正常な契約情報取得を想定する
      findOneSpyContracts.mockReturnValue(contractdataValues)

      // ファイルデータを設定
      request.body = {
        fileData: fileData100
      }

      // 試験実施
      await csvupload.cbPostUpload(request, response, next)

      // 期待結果
      // 404，500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(500))
    })

    test('正常：明細数200件', async () => {
      // 準備
      // requestのuserIdに正常値を入れる
      request.session = {
        userContext: 'NotLoggedIn',
        userRole: 'dummy'
      }
      request.user = user
      // DBからの正常なユーザデータの取得を想定する
      findOneSpy.mockReturnValue(dataValues)
      createSpyInvoices.mockReturnValue(invoiceData)
      // DBからの正常な契約情報取得を想定する
      findOneSpyContracts.mockReturnValue(contractdataValues)

      // ファイルデータを設定
      request.body = {
        fileData: fileData200
      }

      // 試験実施
      await csvupload.cbPostUpload(request, response, next)

      // 期待結果
      // 404，500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(500))
    })

    test('準正常：請求書数101件以上の場合', async () => {
      // 準備
      // requestのuserIdに正常値を入れる
      request.session = {
        userContext: 'NotLoggedIn',
        userRole: 'dummy'
      }
      request.user = user
      // DBからの正常なユーザデータの取得を想定する
      findOneSpy.mockReturnValue(dataValues)
      createSpyInvoices.mockReturnValue(invoiceData)
      // DBからの正常な契約情報取得を想定する
      findOneSpyContracts.mockReturnValue(contractdataValues)

      // ファイルデータを設定
      request.body = {
        fileData: fileData101
      }

      // 試験実施
      await csvupload.cbPostUpload(request, response, next)

      // 期待結果
      // statusCode 200，bodyが合ってること
      expect(response.statusCode).toBe(200)
      expect(response.body).toBe(constantsDefine.statusConstants.INVOICE_FAILED)
    })

    test('準正常：明細数201件以上の場合', async () => {
      // 準備
      // requestのuserIdに正常値を入れる
      request.session = {
        userContext: 'NotLoggedIn',
        userRole: 'dummy'
      }
      request.user = user
      // DBからの正常なユーザデータの取得を想定する
      findOneSpy.mockReturnValue(dataValues)
      createSpyInvoices.mockReturnValue(invoiceData)
      // DBからの正常な契約情報取得を想定する
      findOneSpyContracts.mockReturnValue(contractdataValues)

      // ファイルデータを設定
      request.body = {
        fileData: fileData201
      }

      // 試験実施
      await csvupload.cbPostUpload(request, response, next)

      // 期待結果
      expect(response.statusCode).toBe(200)
      expect(response.body).toBe(constantsDefine.statusConstants.OVER_SPECIFICATION)
    })

    test('準正常：既に登録済みの請求書番号', async () => {
      // 準備
      // requestのuserIdに正常値を入れる
      request.session = {
        userContext: 'NotLoggedIn',
        userRole: 'dummy'
      }
      request.user = user
      // DBからの正常なユーザデータの取得を想定する
      findOneSpy.mockReturnValue(dataValues)
      createSpyInvoices.mockReturnValue(invoiceData)
      // DBからの正常な契約情報取得を想定する
      findOneSpyContracts.mockReturnValue(contractdataValues)

      // ファイルデータを設定
      request.body = {
        fileData: fileData5
      }

      // 試験実施
      await csvupload.cbPostUpload(request, response, next)

      // 期待結果
      expect(response.statusCode).toBe(200)
      expect(response.body).toBe(constantsDefine.statusConstants.OVERLAPPED_INVOICE)
    })
  })

  // cbUploadCsvの確認
  describe('cbUploadCsv', () => {
    test('正常', async () => {
      // 準備
      request.user = user

      const filename = request.user.tenantId + '_' + request.user.email + '_' + '20210611102239848' + '.csv'
      const uploadCsvData = Buffer.from(decodeURIComponent(fileData), 'base64').toString('utf8')

      // 試験実施
      const result = csvupload.cbUploadCsv(filePath, filename, uploadCsvData)

      // returnがtrueであること
      expect(result).toBeTruthy()

      // 期待結果
      // 404，500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(500))
    })

    test('CSV File Upload failed.(error)', async () => {
      // 準備
      request.user = user

      // 試験実施
      const result = csvupload.cbUploadCsv('/home/upload', null, null)

      // 期待結果
      // returnがfalseであること
      expect(result).toBeFalsy()
    })

    test('Failed to Save CSVFile. (error)', async () => {
      // 準備
      request.user = user

      const filename = request.user.tenantId + '_' + request.user.email + '_' + '20210611102239848' + '.csv'
      const uploadCsvData = Buffer.from(decodeURIComponent(fileData), 'base64').toString('utf8')
      const filePath = '///'

      // 試験実施
      const result = csvupload.cbUploadCsv(filePath, filename, uploadCsvData)

      // 期待結果
      // returnがfalseであること
      expect(result).toBeFalsy()
    })

    test('User Directory is Nothing.(error)', async () => {
      // 準備
      request.user = user

      const filename = request.user.tenantId + '_' + request.user.email + '_' + '20210611102239848' + '.csv'
      const uploadCsvData = Buffer.from(decodeURIComponent(fileData), 'base64').toString('utf8')
      const filePath = '/test'

      // 試験実施
      const result = csvupload.cbUploadCsv(filePath, filename, uploadCsvData)

      // 期待結果
      // returnがfalseであること
      expect(result).toBeFalsy()
    })
  })

  // cbExtractInvoiceの確認
  describe('cbExtractInvoice', () => {
    test('正常', async () => {
      // 準備
      request.user = user
      const userToken = {
        accessToken: 'dummyAccessToken',
        refreshToken: 'dummyRefreshToken'
      }
      const filename = request.user.tenantId + '_' + request.user.email + '_' + '20210611102239848' + '.csv'

      const uploadCsvData = Buffer.from(decodeURIComponent(fileData), 'base64').toString('utf8')

      // accessTradeshiftSpy.mockReturnValue('')

      // 試験実施
      const resultUpl = csvupload.cbUploadCsv(filePath, filename, uploadCsvData)
      expect(resultUpl).toBeTruthy()

      const resultExt = csvupload.cbExtractInvoice(filePath, filename, userToken, invoiceParameta)
      expect(resultExt).toBeTruthy()

      const resultRem = csvupload.cbRemoveCsv(filePath, filename)
      expect(resultRem).toBeTruthy()

      // 期待結果
      // 404，500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(500))
    })

    test('正常：請求書数100件', async () => {
      // 準備
      request.user = user
      const userToken = {
        accessToken: 'dummyAccessToken',
        refreshToken: 'dummyRefreshToken'
      }
      const filename = request.user.tenantId + '_' + request.user.email + '_' + '20210611102239848' + '.csv'

      const uploadCsvData = Buffer.from(decodeURIComponent(fileData100), 'base64').toString('utf8')

      // accessTradeshiftSpy.mockReturnValue('')

      // 試験実施
      const resultUpl = csvupload.cbUploadCsv(filePath, filename, uploadCsvData)
      expect(resultUpl).toBeTruthy()

      const resultExt = csvupload.cbExtractInvoice(filePath, filename, userToken, invoiceParameta)
      expect(resultExt).toBeTruthy()

      const resultRem = csvupload.cbRemoveCsv(filePath, filename)
      expect(resultRem).toBeTruthy()

      // 期待結果
      // 404，500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(500))
    })

    test('正常：明細数200件', async () => {
      // 準備
      request.user = user
      const userToken = {
        accessToken: 'dummyAccessToken',
        refreshToken: 'dummyRefreshToken'
      }
      const filename = request.user.tenantId + '_' + request.user.email + '_' + '20210611102239848' + '.csv'

      const uploadCsvData = Buffer.from(decodeURIComponent(fileData200), 'base64').toString('utf8')

      // 試験実施
      const resultUpl = csvupload.cbUploadCsv(filePath, filename, uploadCsvData)
      expect(resultUpl).toBeTruthy()

      const resultExt = csvupload.cbExtractInvoice(filePath, filename, userToken, invoiceParameta)
      expect(resultExt).toBeTruthy()

      const resultRem = csvupload.cbRemoveCsv(filePath, filename)
      expect(resultRem).toBeTruthy()

      // 期待結果
      // 404，500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(500))
    })

    test('準正常：請求書数101件', async () => {
      // 準備
      request.user = user
      const userToken = {
        accessToken: 'dummyAccessToken',
        refreshToken: 'dummyRefreshToken'
      }
      const filename = request.user.tenantId + '_' + request.user.email + '_' + '20210611102239848' + '.csv'

      const uploadCsvData = Buffer.from(decodeURIComponent(fileData101), 'base64').toString('utf8')

      // 試験実施
      const resultUpl = csvupload.cbUploadCsv(filePath, filename, uploadCsvData)
      expect(resultUpl).toBeTruthy()

      const resultExt = await csvupload.cbExtractInvoice(filePath, filename, userToken, invoiceParameta)
      expect(resultExt).toBeTruthy()

      const resultRem = csvupload.cbRemoveCsv(filePath, filename)
      expect(resultRem).toBeTruthy()

      // 期待結果
      // 404，500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(500))
      expect(resultExt).toBe(101)
    })

    test('準正常：明細数201件', async () => {
      // 準備
      request.user = user
      const userToken = {
        accessToken: 'dummyAccessToken',
        refreshToken: 'dummyRefreshToken'
      }
      const filename = request.user.tenantId + '_' + request.user.email + '_' + '20210611102239848' + '.csv'

      const uploadCsvData = Buffer.from(decodeURIComponent(fileData201), 'base64').toString('utf8')

      createSpyInvoices.mockReturnValue({ ...invoiceData, filename: filename })
      findOneSpyInvoice.mockReturnValue(invoiceData)
      createSpyinvoicesDetail.mockReturnValue(invoiceDetailData)
      findOneSypTenant.mockReturnValue({
        dataValues: {
          tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089'
        }
      })

      // 試験実施
      const resultUpl = csvupload.cbUploadCsv(filePath, filename, uploadCsvData)
      expect(resultUpl).toBeTruthy()

      const resultExt = await csvupload.cbExtractInvoice(filePath, filename, userToken, invoiceParameta)
      expect(resultExt).toBeTruthy()

      const resultRem = csvupload.cbRemoveCsv(filePath, filename)
      expect(resultRem).toBeTruthy()

      // 期待結果
      // 404，500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(500))
      expect(resultExt).toBe(102)
    })

    test('準正常：請求書番号バリデーションチェック：101文字以上', async () => {
      // 準備
      const tmpInsert = invoiceController.insert
      const tmpdetailInsert = invoiceDetailController.insert
      const tmpApiManager = apiManager.accessTradeshift
      const resultInvoiceDetailController = []

      invoiceController.insert = jest.fn((values) => {
        return values
      })
      invoiceController.findInvoice = jest.fn((invoice) => {
        return invoice
      })
      invoiceDetailController.insert = jest.fn((values) => {
        if (values.errorData) {
          resultInvoiceDetailController.push(values)
          return values
        }
      })

      request.user = user
      const userToken = {
        accessToken: 'dummyAccessToken',
        refreshToken: 'dummyRefreshToken'
      }
      const filename = request.user.tenantId + '_' + request.user.email + '_' + '20210611102239848' + '.csv'

      const uploadCsvData = Buffer.from(decodeURIComponent(fileDataInvoiceIDlessthanequal101), 'base64').toString(
        'utf8'
      )

      createSpyInvoices.mockReturnValue({ ...invoiceData, filename: filename })
      findOneSpyInvoice.mockReturnValue(invoiceData)
      createSpyinvoicesDetail.mockReturnValue(invoiceDetailData)
      findOneSypTenant.mockReturnValue({
        dataValues: {
          tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089'
        }
      })

      // 試験実施
      const resultUpl = csvupload.cbUploadCsv(filePath, filename, uploadCsvData)
      expect(resultUpl).toBeTruthy()

      const resultExt = csvupload.cbExtractInvoice(filePath, filename, userToken, invoiceParameta)
      expect(resultExt).toBeTruthy()

      const resultRem = await csvupload.cbRemoveCsv(filePath, filename)
      expect(resultRem).toBeTruthy()

      // 期待結果
      // 404，500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(500))

      // エラーメッセージが予定通りにある
      expect(resultInvoiceDetailController[0].errorData).toEqual('請求書番号は100文字以内で入力してください。')
      invoiceController.insert = tmpInsert
      invoiceDetailController.insert = tmpdetailInsert
      apiManager.accessTradeshift = tmpApiManager
    })

    test('準正常：銀行名バリデーションチェック：201文字以上', async () => {
      // 準備
      const tmpInsert = invoiceController.insert
      const tmpdetailInsert = invoiceDetailController.insert
      const tmpApiManager = apiManager.accessTradeshift
      const resultInvoiceDetailController = []

      invoiceController.insert = jest.fn((values) => {
        return values
      })
      invoiceController.findInvoice = jest.fn((invoice) => {
        return invoice
      })
      invoiceDetailController.insert = jest.fn((values) => {
        if (values.errorData) {
          resultInvoiceDetailController.push(values)
          return values
        }
      })

      request.user = user
      const userToken = {
        accessToken: 'dummyAccessToken',
        refreshToken: 'dummyRefreshToken'
      }
      const filename = request.user.tenantId + '_' + request.user.email + '_' + '20210611102239848' + '.csv'

      const uploadCsvData = Buffer.from(decodeURIComponent(fileDataBankNamelessthanequal201), 'base64').toString('utf8')

      createSpyInvoices.mockReturnValue({ ...invoiceData, filename: filename })
      findOneSpyInvoice.mockReturnValue(invoiceData)
      createSpyinvoicesDetail.mockReturnValue(invoiceDetailData)
      findOneSypTenant.mockReturnValue({
        dataValues: {
          tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089'
        }
      })

      // 試験実施
      const resultUpl = csvupload.cbUploadCsv(filePath, filename, uploadCsvData)
      expect(resultUpl).toBeTruthy()

      const resultExt = csvupload.cbExtractInvoice(filePath, filename, userToken, invoiceParameta)
      expect(resultExt).toBeTruthy()

      const resultRem = await csvupload.cbRemoveCsv(filePath, filename)
      expect(resultRem).toBeTruthy()

      // 期待結果
      // 404，500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(500))

      // エラーメッセージが予定通りにある
      expect(resultInvoiceDetailController[0].errorData).toEqual(constantsDefine.invoiceErrMsg.BANKNAMEERR000)
      invoiceController.insert = tmpInsert
      invoiceDetailController.insert = tmpdetailInsert
      apiManager.accessTradeshift = tmpApiManager
    })

    test('準正常：発行日バリデーションチェック：日付', async () => {
      // 準備
      const tmpInsert = invoiceController.insert
      const tmpdetailInsert = invoiceDetailController.insert
      const tmpApiManager = apiManager.accessTradeshift
      const resultInvoiceDetailController = []

      invoiceController.insert = jest.fn((values) => {
        return values
      })
      invoiceController.findInvoice = jest.fn((invoice) => {
        return invoice
      })
      invoiceDetailController.insert = jest.fn((values) => {
        if (values.errorData) {
          resultInvoiceDetailController.push(values)
          return values
        }
      })

      request.user = user
      const userToken = {
        accessToken: 'dummyAccessToken',
        refreshToken: 'dummyRefreshToken'
      }
      const filename = request.user.tenantId + '_' + request.user.email + '_' + '20210611102239848' + '.csv'

      const uploadCsvData = Buffer.from(decodeURIComponent(fileDataIssueDateleap), 'base64').toString('utf8')

      createSpyInvoices.mockReturnValue({ ...invoiceData, filename: filename })
      findOneSpyInvoice.mockReturnValue(invoiceData)
      createSpyinvoicesDetail.mockReturnValue(invoiceDetailData)
      findOneSypTenant.mockReturnValue({
        dataValues: {
          tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089'
        }
      })

      // 試験実施
      const resultUpl = csvupload.cbUploadCsv(filePath, filename, uploadCsvData)
      expect(resultUpl).toBeTruthy()

      const resultExt = csvupload.cbExtractInvoice(filePath, filename, userToken, invoiceParameta)
      expect(resultExt).toBeTruthy()

      const resultRem = await csvupload.cbRemoveCsv(filePath, filename)
      expect(resultRem).toBeTruthy()

      // 期待結果
      // 404，500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(500))

      // エラーメッセージが予定通りにある
      expect(resultInvoiceDetailController[0].errorData).toEqual('発行日は有効な日付を入力してください。')
      invoiceController.insert = tmpInsert
      invoiceDetailController.insert = tmpdetailInsert
      apiManager.accessTradeshift = tmpApiManager
    })

    test('準正常：発行日バリデーションチェック：形式', async () => {
      // 準備
      const tmpInsert = invoiceController.insert
      const tmpdetailInsert = invoiceDetailController.insert
      const tmpApiManager = apiManager.accessTradeshift
      const resultInvoiceDetailController = []

      invoiceController.insert = jest.fn((values) => {
        return values
      })
      invoiceController.findInvoice = jest.fn((invoice) => {
        return invoice
      })
      invoiceDetailController.insert = jest.fn((values) => {
        if (values.errorData) {
          resultInvoiceDetailController.push(values)
          return values
        }
      })

      request.user = user
      const userToken = {
        accessToken: 'dummyAccessToken',
        refreshToken: 'dummyRefreshToken'
      }
      const filename = request.user.tenantId + '_' + request.user.email + '_' + '20210611102239848' + '.csv'

      const uploadCsvData = Buffer.from(decodeURIComponent(fileDataIssueDateTypeErr), 'base64').toString('utf8')

      createSpyInvoices.mockReturnValue({ ...invoiceData, filename: filename })
      findOneSpyInvoice.mockReturnValue(invoiceData)
      createSpyinvoicesDetail.mockReturnValue(invoiceDetailData)
      findOneSypTenant.mockReturnValue({
        dataValues: {
          tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089'
        }
      })

      // 試験実施
      const resultUpl = csvupload.cbUploadCsv(filePath, filename, uploadCsvData)
      expect(resultUpl).toBeTruthy()

      const resultExt = csvupload.cbExtractInvoice(filePath, filename, userToken, invoiceParameta)
      expect(resultExt).toBeTruthy()

      const resultRem = await csvupload.cbRemoveCsv(filePath, filename)
      expect(resultRem).toBeTruthy()

      // 期待結果
      // 404，500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(500))

      // エラーメッセージが予定通りにある
      expect(resultInvoiceDetailController[0].errorData).toEqual('発行日はyyyy/mm/dd/形式で入力してください。')
      invoiceController.insert = tmpInsert
      invoiceDetailController.insert = tmpdetailInsert
      apiManager.accessTradeshift = tmpApiManager
    })

    test('準正常：テナントバリデーションチェック：形式', async () => {
      // 準備
      const tmpInsert = invoiceController.insert
      const tmpdetailInsert = invoiceDetailController.insert
      const tmpApiManager = apiManager.accessTradeshift
      const resultInvoiceDetailController = []

      invoiceController.insert = jest.fn((values) => {
        return values
      })
      invoiceController.findInvoice = jest.fn((invoice) => {
        return invoice
      })
      invoiceDetailController.insert = jest.fn((values) => {
        if (values.errorData) {
          resultInvoiceDetailController.push(values)
          return values
        }
      })

      request.user = user
      const userToken = {
        accessToken: 'dummyAccessToken',
        refreshToken: 'dummyRefreshToken'
      }
      const filename = request.user.tenantId + '_' + request.user.email + '_' + '20210611102239848' + '.csv'

      const uploadCsvData = Buffer.from(decodeURIComponent(fileDataTenantTypeErr), 'base64').toString('utf8')

      createSpyInvoices.mockReturnValue({ ...invoiceData, filename: filename })
      findOneSpyInvoice.mockReturnValue(invoiceData)
      createSpyinvoicesDetail.mockReturnValue(invoiceDetailData)
      findOneSypTenant.mockReturnValue({
        dataValues: {
          tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089'
        }
      })

      // 試験実施
      const resultUpl = csvupload.cbUploadCsv(filePath, filename, uploadCsvData)
      expect(resultUpl).toBeTruthy()

      const resultExt = csvupload.cbExtractInvoice(filePath, filename, userToken, invoiceParameta)
      expect(resultExt).toBeTruthy()

      const resultRem = await csvupload.cbRemoveCsv(filePath, filename)
      expect(resultRem).toBeTruthy()

      // 期待結果
      // 404，500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(500))

      // エラーメッセージが予定通りにある
      expect(resultInvoiceDetailController[0].errorData).toEqual(
        'テナントIDは正しいテナントIDを入力してください。,テナントIDはネットワーク接続済みのものを入力してください。'
      )
      invoiceController.insert = tmpInsert
      invoiceDetailController.insert = tmpdetailInsert
      apiManager.accessTradeshift = tmpApiManager
    })

    test('準正常：明細-項目IDバリデーションチェック：201文字以上', async () => {
      // 準備
      const tmpInsert = invoiceController.insert
      const tmpdetailInsert = invoiceDetailController.insert
      const tmpApiManager = apiManager.accessTradeshift
      const resultInvoiceDetailController = []

      invoiceController.insert = jest.fn((values) => {
        return values
      })
      invoiceController.findInvoice = jest.fn((invoice) => {
        return invoice
      })
      invoiceDetailController.insert = jest.fn((values) => {
        if (values.errorData) {
          resultInvoiceDetailController.push(values)
          return values
        }
      })

      request.user = user
      const userToken = {
        accessToken: 'dummyAccessToken',
        refreshToken: 'dummyRefreshToken'
      }
      const filename = request.user.tenantId + '_' + request.user.email + '_' + '20210611102239848' + '.csv'

      const uploadCsvData = Buffer.from(decodeURIComponent(fileDataSellersItemNumlessthanequal201), 'base64').toString(
        'utf8'
      )

      createSpyInvoices.mockReturnValue({ ...invoiceData, filename: filename })
      findOneSpyInvoice.mockReturnValue(invoiceData)
      createSpyinvoicesDetail.mockReturnValue(invoiceDetailData)
      findOneSypTenant.mockReturnValue({
        dataValues: {
          tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089'
        }
      })

      // 試験実施
      const resultUpl = csvupload.cbUploadCsv(filePath, filename, uploadCsvData)
      expect(resultUpl).toBeTruthy()

      const resultExt = csvupload.cbExtractInvoice(filePath, filename, userToken, invoiceParameta)
      expect(resultExt).toBeTruthy()

      const resultRem = await csvupload.cbRemoveCsv(filePath, filename)
      expect(resultRem).toBeTruthy()

      // 期待結果
      // 404，500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(500))

      // エラーメッセージが予定通りにある
      expect(resultInvoiceDetailController[0].errorData).toEqual(constantsDefine.invoiceErrMsg.SELLERSITEMNUMERR000)
      invoiceController.insert = tmpInsert
      invoiceDetailController.insert = tmpdetailInsert
      apiManager.accessTradeshift = tmpApiManager
    })

    test('準正常：明細-内容バリデーションチェック：501文字以上', async () => {
      // 準備
      const tmpInsert = invoiceController.insert
      const tmpdetailInsert = invoiceDetailController.insert
      const tmpApiManager = apiManager.accessTradeshift
      const resultInvoiceDetailController = []

      invoiceController.insert = jest.fn((values) => {
        return values
      })
      invoiceController.findInvoice = jest.fn((invoice) => {
        return invoice
      })
      invoiceDetailController.insert = jest.fn((values) => {
        if (values.errorData) {
          resultInvoiceDetailController.push(values)
          return values
        }
      })

      request.user = user
      const userToken = {
        accessToken: 'dummyAccessToken',
        refreshToken: 'dummyRefreshToken'
      }
      const filename = request.user.tenantId + '_' + request.user.email + '_' + '20210611102239848' + '.csv'

      const uploadCsvData = Buffer.from(decodeURIComponent(fileDataItemNamelessthanequal501), 'base64').toString('utf8')

      createSpyInvoices.mockReturnValue({ ...invoiceData, filename: filename })
      findOneSpyInvoice.mockReturnValue(invoiceData)
      createSpyinvoicesDetail.mockReturnValue(invoiceDetailData)
      findOneSypTenant.mockReturnValue({
        dataValues: {
          tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089'
        }
      })

      // 試験実施
      const resultUpl = csvupload.cbUploadCsv(filePath, filename, uploadCsvData)
      expect(resultUpl).toBeTruthy()

      const resultExt = csvupload.cbExtractInvoice(filePath, filename, userToken, invoiceParameta)
      expect(resultExt).toBeTruthy()

      const resultRem = await csvupload.cbRemoveCsv(filePath, filename)
      expect(resultRem).toBeTruthy()

      // 期待結果
      // 404，500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(500))

      // エラーメッセージが予定通りにある
      expect(resultInvoiceDetailController[0].errorData).toEqual(constantsDefine.invoiceErrMsg.ITEMNAMEERR000)
      invoiceController.insert = tmpInsert
      invoiceDetailController.insert = tmpdetailInsert
      apiManager.accessTradeshift = tmpApiManager
    })

    test('準正常：明細-数量バリデーションチェック：範囲以外', async () => {
      // 準備
      const tmpInsert = invoiceController.insert
      const tmpdetailInsert = invoiceDetailController.insert
      const tmpApiManager = apiManager.accessTradeshift
      const resultInvoiceDetailController = []

      invoiceController.insert = jest.fn((values) => {
        return values
      })
      invoiceController.findInvoice = jest.fn((invoice) => {
        return invoice
      })
      invoiceDetailController.insert = jest.fn((values) => {
        if (values.errorData) {
          resultInvoiceDetailController.push(values)
          return values
        }
      })

      request.user = user
      const userToken = {
        accessToken: 'dummyAccessToken',
        refreshToken: 'dummyRefreshToken'
      }
      const filename = request.user.tenantId + '_' + request.user.email + '_' + '20210611102239848' + '.csv'

      const uploadCsvData = Buffer.from(
        decodeURIComponent(fileDataQuantityValueBetween0and1000000000001),
        'base64'
      ).toString('utf8')

      createSpyInvoices.mockReturnValue({ ...invoiceData, filename: filename })
      findOneSpyInvoice.mockReturnValue(invoiceData)
      createSpyinvoicesDetail.mockReturnValue([invoiceDetailData, invoiceDetailData])
      findOneSypTenant.mockReturnValue({
        dataValues: {
          tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089'
        }
      })

      // 試験実施
      const resultUpl = csvupload.cbUploadCsv(filePath, filename, uploadCsvData)
      expect(resultUpl).toBeTruthy()

      const resultExt = csvupload.cbExtractInvoice(filePath, filename, userToken, invoiceParameta)
      expect(resultExt).toBeTruthy()

      const resultRem = await csvupload.cbRemoveCsv(filePath, filename)
      expect(resultRem).toBeTruthy()

      // 期待結果
      // 404，500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(500))

      // エラーメッセージが予定通りにある
      resultInvoiceDetailController.forEach((invoiceDetail) => {
        expect(invoiceDetail.errorData).toEqual(
          `${constantsDefine.invoiceErrMsg.QUANTITYVALUEERR001},${constantsDefine.invoiceErrMsg.QUANTITYVALUEERR000}`
        )
      })

      invoiceController.insert = tmpInsert
      invoiceDetailController.insert = tmpdetailInsert
      apiManager.accessTradeshift = tmpApiManager
    })

    test('準正常：明細-数量バリデーションチェック：形式', async () => {
      // 準備
      const tmpInsert = invoiceController.insert
      const tmpdetailInsert = invoiceDetailController.insert
      const tmpApiManager = apiManager.accessTradeshift
      const resultInvoiceDetailController = []

      invoiceController.insert = jest.fn((values) => {
        return values
      })
      invoiceController.findInvoice = jest.fn((invoice) => {
        return invoice
      })
      invoiceDetailController.insert = jest.fn((values) => {
        if (values.errorData) {
          resultInvoiceDetailController.push(values)
          return values
        }
      })

      request.user = user
      const userToken = {
        accessToken: 'dummyAccessToken',
        refreshToken: 'dummyRefreshToken'
      }
      const filename = request.user.tenantId + '_' + request.user.email + '_' + '20210611102239848' + '.csv'

      const uploadCsvData = Buffer.from(decodeURIComponent(fileDataQuantityValueTypeErr), 'base64').toString('utf8')

      createSpyInvoices.mockReturnValue({ ...invoiceData, filename: filename })
      findOneSpyInvoice.mockReturnValue(invoiceData)
      createSpyinvoicesDetail.mockReturnValue(invoiceDetailData)
      findOneSypTenant.mockReturnValue({
        dataValues: {
          tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089'
        }
      })

      // 試験実施
      const resultUpl = csvupload.cbUploadCsv(filePath, filename, uploadCsvData)
      expect(resultUpl).toBeTruthy()

      const resultExt = csvupload.cbExtractInvoice(filePath, filename, userToken, invoiceParameta)
      expect(resultExt).toBeTruthy()

      const resultRem = await csvupload.cbRemoveCsv(filePath, filename)
      expect(resultRem).toBeTruthy()

      // 期待結果
      // 404，500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(500))

      // エラーメッセージが予定通りにある
      expect(resultInvoiceDetailController[0].errorData).toEqual('明細-数量は数字で入力してください。')
      invoiceController.insert = tmpInsert
      invoiceDetailController.insert = tmpdetailInsert
      apiManager.accessTradeshift = tmpApiManager
    })

    test('準正常：明細-単価バリデーションチェック：範囲以外', async () => {
      // 準備
      const tmpInsert = invoiceController.insert
      const tmpdetailInsert = invoiceDetailController.insert
      const tmpApiManager = apiManager.accessTradeshift
      const resultInvoiceDetailController = []

      invoiceController.insert = jest.fn((values) => {
        return values
      })
      invoiceController.findInvoice = jest.fn((invoice) => {
        return invoice
      })
      invoiceDetailController.insert = jest.fn((values) => {
        if (values.errorData) {
          resultInvoiceDetailController.push(values)
          return values
        }
      })

      request.user = user
      const userToken = {
        accessToken: 'dummyAccessToken',
        refreshToken: 'dummyRefreshToken'
      }
      const filename = request.user.tenantId + '_' + request.user.email + '_' + '20210611102239848' + '.csv'

      const uploadCsvData = Buffer.from(
        decodeURIComponent(fileDataPriceValueBetweenminus1000000000000andplus100000000000),
        'base64'
      ).toString('utf8')

      createSpyInvoices.mockReturnValue({ ...invoiceData, filename: filename })
      findOneSpyInvoice.mockReturnValue(invoiceData)
      createSpyinvoicesDetail.mockReturnValue(invoiceDetailData)
      findOneSypTenant.mockReturnValue({
        dataValues: {
          tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089'
        }
      })

      // 試験実施
      const resultUpl = csvupload.cbUploadCsv(filePath, filename, uploadCsvData)
      expect(resultUpl).toBeTruthy()

      const resultExt = csvupload.cbExtractInvoice(filePath, filename, userToken, invoiceParameta)
      expect(resultExt).toBeTruthy()

      const resultRem = await csvupload.cbRemoveCsv(filePath, filename)
      expect(resultRem).toBeTruthy()

      // 期待結果
      // 404，500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(500))

      // エラーメッセージが予定通りにある
      expect(resultInvoiceDetailController[0].errorData).toEqual(
        `${constantsDefine.invoiceErrMsg.PRICEVALUEERR000},${constantsDefine.invoiceErrMsg.PRICEVALUEERR000}`
      )
      invoiceController.insert = tmpInsert
      invoiceDetailController.insert = tmpdetailInsert
      apiManager.accessTradeshift = tmpApiManager
    })

    test('準正常：明細-単価バリデーションチェック：形式', async () => {
      // 準備
      const tmpInsert = invoiceController.insert
      const tmpdetailInsert = invoiceDetailController.insert
      const tmpApiManager = apiManager.accessTradeshift
      const resultInvoiceDetailController = []

      invoiceController.insert = jest.fn((values) => {
        return values
      })
      invoiceController.findInvoice = jest.fn((invoice) => {
        return invoice
      })
      invoiceDetailController.insert = jest.fn((values) => {
        if (values.errorData) {
          resultInvoiceDetailController.push(values)
          return values
        }
      })

      request.user = user
      const userToken = {
        accessToken: 'dummyAccessToken',
        refreshToken: 'dummyRefreshToken'
      }
      const filename = request.user.tenantId + '_' + request.user.email + '_' + '20210611102239848' + '.csv'

      const uploadCsvData = Buffer.from(decodeURIComponent(fileDataPriceValueTypeErr), 'base64').toString('utf8')

      createSpyInvoices.mockReturnValue({ ...invoiceData, filename: filename })
      findOneSpyInvoice.mockReturnValue(invoiceData)
      createSpyinvoicesDetail.mockReturnValue(invoiceDetailData)
      findOneSypTenant.mockReturnValue({
        dataValues: {
          tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089'
        }
      })

      // 試験実施
      const resultUpl = csvupload.cbUploadCsv(filePath, filename, uploadCsvData)
      expect(resultUpl).toBeTruthy()

      const resultExt = csvupload.cbExtractInvoice(filePath, filename, userToken, invoiceParameta)
      expect(resultExt).toBeTruthy()

      const resultRem = await csvupload.cbRemoveCsv(filePath, filename)
      expect(resultRem).toBeTruthy()

      // 期待結果
      // 404，500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(500))

      // エラーメッセージが予定通りにある
      expect(resultInvoiceDetailController[0].errorData).toEqual('明細-単価は数字で入力してください。')
      invoiceController.insert = tmpInsert
      invoiceDetailController.insert = tmpdetailInsert
      apiManager.accessTradeshift = tmpApiManager
    })

    test('準正常：支払期日バリデーションチェック：日付', async () => {
      // 準備
      const tmpInsert = invoiceController.insert
      const tmpdetailInsert = invoiceDetailController.insert
      const tmpApiManager = apiManager.accessTradeshift
      const resultInvoiceDetailController = []

      invoiceController.insert = jest.fn((values) => {
        return values
      })
      invoiceController.findInvoice = jest.fn((invoice) => {
        return invoice
      })
      invoiceDetailController.insert = jest.fn((values) => {
        if (values.errorData) {
          resultInvoiceDetailController.push(values)
          return values
        }
      })

      request.user = user
      const userToken = {
        accessToken: 'dummyAccessToken',
        refreshToken: 'dummyRefreshToken'
      }
      const filename = request.user.tenantId + '_' + request.user.email + '_' + '20210611102239848' + '.csv'

      const uploadCsvData = Buffer.from(decodeURIComponent(paymentDateleap), 'base64').toString('utf8')

      createSpyInvoices.mockReturnValue({ ...invoiceData, filename: filename })
      findOneSpyInvoice.mockReturnValue(invoiceData)
      createSpyinvoicesDetail.mockReturnValue(invoiceDetailData)
      findOneSypTenant.mockReturnValue({
        dataValues: {
          tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089'
        }
      })

      // 試験実施
      const resultUpl = csvupload.cbUploadCsv(filePath, filename, uploadCsvData)
      expect(resultUpl).toBeTruthy()

      const resultExt = csvupload.cbExtractInvoice(filePath, filename, userToken, invoiceParameta)
      expect(resultExt).toBeTruthy()

      const resultRem = await csvupload.cbRemoveCsv(filePath, filename)
      expect(resultRem).toBeTruthy()

      // 期待結果
      // 404，500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(500))

      // エラーメッセージが予定通りにある
      expect(resultInvoiceDetailController[0].errorData).toEqual('支払期日は有効な日付を入力してください。')
      invoiceController.insert = tmpInsert
      invoiceDetailController.insert = tmpdetailInsert
      apiManager.accessTradeshift = tmpApiManager
    })

    test('準正常：支払期日バリデーションチェック：形式', async () => {
      // 準備
      const tmpInsert = invoiceController.insert
      const tmpdetailInsert = invoiceDetailController.insert
      const tmpApiManager = apiManager.accessTradeshift
      const resultInvoiceDetailController = []

      invoiceController.insert = jest.fn((values) => {
        return values
      })
      invoiceController.findInvoice = jest.fn((invoice) => {
        return invoice
      })
      invoiceDetailController.insert = jest.fn((values) => {
        if (values.errorData) {
          resultInvoiceDetailController.push(values)
          return values
        }
      })

      request.user = user
      const userToken = {
        accessToken: 'dummyAccessToken',
        refreshToken: 'dummyRefreshToken'
      }
      const filename = request.user.tenantId + '_' + request.user.email + '_' + '20210611102239848' + '.csv'

      const uploadCsvData = Buffer.from(decodeURIComponent(paymentDateTypeErr), 'base64').toString('utf8')

      createSpyInvoices.mockReturnValue({ ...invoiceData, filename: filename })
      findOneSpyInvoice.mockReturnValue(invoiceData)
      createSpyinvoicesDetail.mockReturnValue(invoiceDetailData)
      findOneSypTenant.mockReturnValue({
        dataValues: {
          tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089'
        }
      })

      // 試験実施
      const resultUpl = csvupload.cbUploadCsv(filePath, filename, uploadCsvData)
      expect(resultUpl).toBeTruthy()

      const resultExt = csvupload.cbExtractInvoice(filePath, filename, userToken, invoiceParameta)
      expect(resultExt).toBeTruthy()

      const resultRem = await csvupload.cbRemoveCsv(filePath, filename)
      expect(resultRem).toBeTruthy()

      // 期待結果
      // 404，500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(500))

      // エラーメッセージが予定通りにある
      expect(resultInvoiceDetailController[0].errorData).toEqual('支払期日はyyyy/mm/dd/形式で入力してください。')
      invoiceController.insert = tmpInsert
      invoiceDetailController.insert = tmpdetailInsert
      apiManager.accessTradeshift = tmpApiManager
    })

    test('準正常：納品日バリデーションチェック：日付', async () => {
      // 準備
      const tmpInsert = invoiceController.insert
      const tmpdetailInsert = invoiceDetailController.insert
      const tmpApiManager = apiManager.accessTradeshift
      const resultInvoiceDetailController = []

      invoiceController.insert = jest.fn((values) => {
        return values
      })
      invoiceController.findInvoice = jest.fn((invoice) => {
        return invoice
      })
      invoiceDetailController.insert = jest.fn((values) => {
        if (values.errorData) {
          resultInvoiceDetailController.push(values)
          return values
        }
      })

      request.user = user
      const userToken = {
        accessToken: 'dummyAccessToken',
        refreshToken: 'dummyRefreshToken'
      }
      const filename = request.user.tenantId + '_' + request.user.email + '_' + '20210611102239848' + '.csv'

      const uploadCsvData = Buffer.from(decodeURIComponent(deliveryDateleap), 'base64').toString('utf8')

      createSpyInvoices.mockReturnValue({ ...invoiceData, filename: filename })
      findOneSpyInvoice.mockReturnValue(invoiceData)
      createSpyinvoicesDetail.mockReturnValue(invoiceDetailData)
      findOneSypTenant.mockReturnValue({
        dataValues: {
          tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089'
        }
      })

      // 試験実施
      const resultUpl = csvupload.cbUploadCsv(filePath, filename, uploadCsvData)
      expect(resultUpl).toBeTruthy()

      const resultExt = csvupload.cbExtractInvoice(filePath, filename, userToken, invoiceParameta)
      expect(resultExt).toBeTruthy()

      const resultRem = await csvupload.cbRemoveCsv(filePath, filename)
      expect(resultRem).toBeTruthy()

      // 期待結果
      // 404，500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(500))

      // エラーメッセージが予定通りにある
      expect(resultInvoiceDetailController[0].errorData).toEqual('納品日は有効な日付を入力してください。')
      invoiceController.insert = tmpInsert
      invoiceDetailController.insert = tmpdetailInsert
      apiManager.accessTradeshift = tmpApiManager
    })

    test('準正常：納品日バリデーションチェック：形式', async () => {
      // 準備
      const tmpInsert = invoiceController.insert
      const tmpdetailInsert = invoiceDetailController.insert
      const tmpApiManager = apiManager.accessTradeshift
      const resultInvoiceDetailController = []

      invoiceController.insert = jest.fn((values) => {
        return values
      })
      invoiceController.findInvoice = jest.fn((invoice) => {
        return invoice
      })
      invoiceDetailController.insert = jest.fn((values) => {
        if (values.errorData) {
          resultInvoiceDetailController.push(values)
          return values
        }
      })

      request.user = user
      const userToken = {
        accessToken: 'dummyAccessToken',
        refreshToken: 'dummyRefreshToken'
      }
      const filename = request.user.tenantId + '_' + request.user.email + '_' + '20210611102239848' + '.csv'

      const uploadCsvData = Buffer.from(decodeURIComponent(deliveryDateTypeErr), 'base64').toString('utf8')

      createSpyInvoices.mockReturnValue({ ...invoiceData, filename: filename })
      findOneSpyInvoice.mockReturnValue(invoiceData)
      createSpyinvoicesDetail.mockReturnValue(invoiceDetailData)
      findOneSypTenant.mockReturnValue({
        dataValues: {
          tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089'
        }
      })

      // 試験実施
      const resultUpl = csvupload.cbUploadCsv(filePath, filename, uploadCsvData)
      expect(resultUpl).toBeTruthy()

      const resultExt = csvupload.cbExtractInvoice(filePath, filename, userToken, invoiceParameta)
      expect(resultExt).toBeTruthy()

      const resultRem = await csvupload.cbRemoveCsv(filePath, filename)
      expect(resultRem).toBeTruthy()

      // 期待結果
      // 404，500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(500))

      // エラーメッセージが予定通りにある
      expect(resultInvoiceDetailController[0].errorData).toEqual('納品日はyyyy/mm/dd/形式で入力してください。')
      invoiceController.insert = tmpInsert
      invoiceDetailController.insert = tmpdetailInsert
      apiManager.accessTradeshift = tmpApiManager
    })

    test('準正常：備考バリデーションチェック：201文字以上', async () => {
      // 準備
      const tmpInsert = invoiceController.insert
      const tmpdetailInsert = invoiceDetailController.insert
      const tmpApiManager = apiManager.accessTradeshift
      const resultInvoiceDetailController = []

      invoiceController.insert = jest.fn((values) => {
        return values
      })
      invoiceController.findInvoice = jest.fn((invoice) => {
        return invoice
      })
      invoiceDetailController.insert = jest.fn((values) => {
        if (values.errorData) {
          resultInvoiceDetailController.push(values)
          return values
        }
      })

      request.user = user
      const userToken = {
        accessToken: 'dummyAccessToken',
        refreshToken: 'dummyRefreshToken'
      }
      const filename = request.user.tenantId + '_' + request.user.email + '_' + '20210611102239848' + '.csv'

      const uploadCsvData = Buffer.from(decodeURIComponent(financialInstitutionlessthanequal201), 'base64').toString(
        'utf8'
      )

      createSpyInvoices.mockReturnValue({ ...invoiceData, filename: filename })
      findOneSpyInvoice.mockReturnValue(invoiceData)
      createSpyinvoicesDetail.mockReturnValue(invoiceDetailData)
      findOneSypTenant.mockReturnValue({
        dataValues: {
          tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089'
        }
      })

      // 試験実施
      const resultUpl = csvupload.cbUploadCsv(filePath, filename, uploadCsvData)
      expect(resultUpl).toBeTruthy()

      const resultExt = csvupload.cbExtractInvoice(filePath, filename, userToken, invoiceParameta)
      expect(resultExt).toBeTruthy()

      const resultRem = await csvupload.cbRemoveCsv(filePath, filename)
      expect(resultRem).toBeTruthy()

      // 期待結果
      // 404，500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(500))

      // エラーメッセージが予定通りにある
      expect(resultInvoiceDetailController[0].errorData).toEqual(
        constantsDefine.invoiceErrMsg.FINANCIALINSTITUTIONERR000
      )
      invoiceController.insert = tmpInsert
      invoiceDetailController.insert = tmpdetailInsert
      apiManager.accessTradeshift = tmpApiManager
    })

    test('準正常：支店名バリデーションチェック：201文字以上', async () => {
      // 準備
      const tmpInsert = invoiceController.insert
      const tmpdetailInsert = invoiceDetailController.insert
      const tmpApiManager = apiManager.accessTradeshift
      const resultInvoiceDetailController = []

      invoiceController.insert = jest.fn((values) => {
        return values
      })
      invoiceController.findInvoice = jest.fn((invoice) => {
        return invoice
      })
      invoiceDetailController.insert = jest.fn((values) => {
        if (values.errorData) {
          resultInvoiceDetailController.push(values)
          return values
        }
      })

      request.user = user
      const userToken = {
        accessToken: 'dummyAccessToken',
        refreshToken: 'dummyRefreshToken'
      }
      const filename = request.user.tenantId + '_' + request.user.email + '_' + '20210611102239848' + '.csv'

      const uploadCsvData = Buffer.from(decodeURIComponent(financialNamelessthanequal201), 'base64').toString('utf8')

      createSpyInvoices.mockReturnValue({ ...invoiceData, filename: filename })
      findOneSpyInvoice.mockReturnValue(invoiceData)
      createSpyinvoicesDetail.mockReturnValue(invoiceDetailData)
      findOneSypTenant.mockReturnValue({
        dataValues: {
          tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089'
        }
      })

      // 試験実施
      const resultUpl = csvupload.cbUploadCsv(filePath, filename, uploadCsvData)
      expect(resultUpl).toBeTruthy()

      const resultExt = csvupload.cbExtractInvoice(filePath, filename, userToken, invoiceParameta)
      expect(resultExt).toBeTruthy()

      const resultRem = await csvupload.cbRemoveCsv(filePath, filename)
      expect(resultRem).toBeTruthy()

      // 期待結果
      // 404，500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(500))

      // エラーメッセージが予定通りにある
      expect(resultInvoiceDetailController[0].errorData).toEqual(constantsDefine.invoiceErrMsg.FINANCIALNAMEERR000)
      invoiceController.insert = tmpInsert
      invoiceDetailController.insert = tmpdetailInsert
      apiManager.accessTradeshift = tmpApiManager
    })

    test('準正常：科目バリデーションチェック', async () => {
      // 準備
      const tmpInsert = invoiceController.insert
      const tmpdetailInsert = invoiceDetailController.insert
      const tmpApiManager = apiManager.accessTradeshift
      const resultInvoiceDetailController = []

      invoiceController.insert = jest.fn((values) => {
        return values
      })
      invoiceController.findInvoice = jest.fn((invoice) => {
        return invoice
      })
      invoiceDetailController.insert = jest.fn((values) => {
        if (values.errorData) {
          resultInvoiceDetailController.push(values)
          return values
        }
      })

      request.user = user
      const userToken = {
        accessToken: 'dummyAccessToken',
        refreshToken: 'dummyRefreshToken'
      }
      const filename = request.user.tenantId + '_' + request.user.email + '_' + '20210611102239848' + '.csv'

      const uploadCsvData = Buffer.from(decodeURIComponent(accountTypeErr), 'base64').toString('utf8')

      createSpyInvoices.mockReturnValue({ ...invoiceData, filename: filename })
      findOneSpyInvoice.mockReturnValue(invoiceData)
      createSpyinvoicesDetail.mockReturnValue(invoiceDetailData)
      findOneSypTenant.mockReturnValue({
        dataValues: {
          tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089'
        }
      })

      // 試験実施
      const resultUpl = csvupload.cbUploadCsv(filePath, filename, uploadCsvData)
      expect(resultUpl).toBeTruthy()

      const resultExt = csvupload.cbExtractInvoice(filePath, filename, userToken, invoiceParameta)
      expect(resultExt).toBeTruthy()

      const resultRem = await csvupload.cbRemoveCsv(filePath, filename)
      expect(resultRem).toBeTruthy()

      // 期待結果
      // 404，500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(500))

      // エラーメッセージが予定通りにある
      expect(resultInvoiceDetailController[0].errorData).toEqual(
        '科目はマニュアルに定義されたものの中から選択してください。'
      )
      invoiceController.insert = tmpInsert
      invoiceDetailController.insert = tmpdetailInsert
      apiManager.accessTradeshift = tmpApiManager
    })

    test('準正常：口座番号バリデーションチェック：8文字以上', async () => {
      // 準備
      const tmpInsert = invoiceController.insert
      const tmpdetailInsert = invoiceDetailController.insert
      const tmpApiManager = apiManager.accessTradeshift
      const resultInvoiceDetailController = []

      invoiceController.insert = jest.fn((values) => {
        return values
      })
      invoiceController.findInvoice = jest.fn((invoice) => {
        return invoice
      })
      invoiceDetailController.insert = jest.fn((values) => {
        if (values.errorData) {
          resultInvoiceDetailController.push(values)
          return values
        }
      })

      request.user = user
      const userToken = {
        accessToken: 'dummyAccessToken',
        refreshToken: 'dummyRefreshToken'
      }
      const filename = request.user.tenantId + '_' + request.user.email + '_' + '20210611102239848' + '.csv'

      const uploadCsvData = Buffer.from(decodeURIComponent(accountIdlessthanequal8), 'base64').toString('utf8')

      createSpyInvoices.mockReturnValue({ ...invoiceData, filename: filename })
      findOneSpyInvoice.mockReturnValue(invoiceData)
      createSpyinvoicesDetail.mockReturnValue(invoiceDetailData)
      findOneSypTenant.mockReturnValue({
        dataValues: {
          tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089'
        }
      })

      // 試験実施
      const resultUpl = csvupload.cbUploadCsv(filePath, filename, uploadCsvData)
      expect(resultUpl).toBeTruthy()

      const resultExt = csvupload.cbExtractInvoice(filePath, filename, userToken, invoiceParameta)
      expect(resultExt).toBeTruthy()

      const resultRem = await csvupload.cbRemoveCsv(filePath, filename)
      expect(resultRem).toBeTruthy()

      // 期待結果
      // 404，500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(500))

      // エラーメッセージが予定通りにある
      expect(resultInvoiceDetailController[0].errorData).toEqual('口座番号は数字で入力してください。')
      invoiceController.insert = tmpInsert
      invoiceDetailController.insert = tmpdetailInsert
      apiManager.accessTradeshift = tmpApiManager
    })

    test('準正常：口座番号バリデーションチェック：形式', async () => {
      // 準備
      const tmpInsert = invoiceController.insert
      const tmpdetailInsert = invoiceDetailController.insert
      const tmpApiManager = apiManager.accessTradeshift
      const resultInvoiceDetailController = []

      invoiceController.insert = jest.fn((values) => {
        return values
      })
      invoiceController.findInvoice = jest.fn((invoice) => {
        return invoice
      })
      invoiceDetailController.insert = jest.fn((values) => {
        if (values.errorData) {
          resultInvoiceDetailController.push(values)
          return values
        }
      })

      request.user = user
      const userToken = {
        accessToken: 'dummyAccessToken',
        refreshToken: 'dummyRefreshToken'
      }
      const filename = request.user.tenantId + '_' + request.user.email + '_' + '20210611102239848' + '.csv'

      const uploadCsvData = Buffer.from(decodeURIComponent(accountIdTypeErr), 'base64').toString('utf8')

      createSpyInvoices.mockReturnValue({ ...invoiceData, filename: filename })
      findOneSpyInvoice.mockReturnValue(invoiceData)
      createSpyinvoicesDetail.mockReturnValue(invoiceDetailData)
      findOneSypTenant.mockReturnValue({
        dataValues: {
          tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089'
        }
      })

      // 試験実施
      const resultUpl = csvupload.cbUploadCsv(filePath, filename, uploadCsvData)
      expect(resultUpl).toBeTruthy()

      const resultExt = csvupload.cbExtractInvoice(filePath, filename, userToken, invoiceParameta)
      expect(resultExt).toBeTruthy()

      const resultRem = await csvupload.cbRemoveCsv(filePath, filename)
      expect(resultRem).toBeTruthy()

      // 期待結果
      // 404，500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(500))

      // エラーメッセージが予定通りにある
      expect(resultInvoiceDetailController[0].errorData).toEqual('口座番号は数字で入力してください。')
      invoiceController.insert = tmpInsert
      invoiceDetailController.insert = tmpdetailInsert
      apiManager.accessTradeshift = tmpApiManager
    })

    test('準正常：口座名義バリデーションチェック：201文字以上', async () => {
      // 準備
      const tmpInsert = invoiceController.insert
      const tmpdetailInsert = invoiceDetailController.insert
      const tmpApiManager = apiManager.accessTradeshift
      const resultInvoiceDetailController = []

      invoiceController.insert = jest.fn((values) => {
        return values
      })
      invoiceController.findInvoice = jest.fn((invoice) => {
        return invoice
      })
      invoiceDetailController.insert = jest.fn((values) => {
        if (values.errorData) {
          resultInvoiceDetailController.push(values)
          return values
        }
      })

      request.user = user
      const userToken = {
        accessToken: 'dummyAccessToken',
        refreshToken: 'dummyRefreshToken'
      }
      const filename = request.user.tenantId + '_' + request.user.email + '_' + '20210611102239848' + '.csv'

      const uploadCsvData = Buffer.from(decodeURIComponent(accountNamelessthanequal201), 'base64').toString('utf8')

      createSpyInvoices.mockReturnValue({ ...invoiceData, filename: filename })
      findOneSpyInvoice.mockReturnValue(invoiceData)
      createSpyinvoicesDetail.mockReturnValue(invoiceDetailData)
      findOneSypTenant.mockReturnValue({
        dataValues: {
          tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089'
        }
      })

      // 試験実施
      const resultUpl = csvupload.cbUploadCsv(filePath, filename, uploadCsvData)
      expect(resultUpl).toBeTruthy()

      const resultExt = csvupload.cbExtractInvoice(filePath, filename, userToken, invoiceParameta)
      expect(resultExt).toBeTruthy()

      const resultRem = await csvupload.cbRemoveCsv(filePath, filename)
      expect(resultRem).toBeTruthy()

      // 期待結果
      // 404，500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(500))

      // エラーメッセージが予定通りにある
      expect(resultInvoiceDetailController[0].errorData).toEqual(constantsDefine.invoiceErrMsg.ACCOUNTNAMEERR000)
      invoiceController.insert = tmpInsert
      invoiceDetailController.insert = tmpdetailInsert
      apiManager.accessTradeshift = tmpApiManager
    })

    test('準正常：その他特事項バリデーションチェック：1001文字以上', async () => {
      // 準備
      const tmpInsert = invoiceController.insert
      const tmpdetailInsert = invoiceDetailController.insert
      const tmpApiManager = apiManager.accessTradeshift
      const resultInvoiceDetailController = []

      invoiceController.insert = jest.fn((values) => {
        return values
      })
      invoiceController.findInvoice = jest.fn((invoice) => {
        return invoice
      })
      invoiceDetailController.insert = jest.fn((values) => {
        if (values.errorData) {
          resultInvoiceDetailController.push(values)
          return values
        }
      })

      request.user = user
      const userToken = {
        accessToken: 'dummyAccessToken',
        refreshToken: 'dummyRefreshToken'
      }
      const filename = request.user.tenantId + '_' + request.user.email + '_' + '20210611102239848' + '.csv'

      const uploadCsvData = Buffer.from(decodeURIComponent(notelessthanequal1001), 'base64').toString('utf8')

      createSpyInvoices.mockReturnValue({ ...invoiceData, filename: filename })
      findOneSpyInvoice.mockReturnValue(invoiceData)
      createSpyinvoicesDetail.mockReturnValue(invoiceDetailData)
      findOneSypTenant.mockReturnValue({
        dataValues: {
          tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089'
        }
      })

      // 試験実施
      const resultUpl = csvupload.cbUploadCsv(filePath, filename, uploadCsvData)
      expect(resultUpl).toBeTruthy()

      const resultExt = csvupload.cbExtractInvoice(filePath, filename, userToken, invoiceParameta)
      expect(resultExt).toBeTruthy()

      const resultRem = await csvupload.cbRemoveCsv(filePath, filename)
      expect(resultRem).toBeTruthy()

      // 期待結果
      // 404，500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(500))

      // エラーメッセージが予定通りにある
      expect(resultInvoiceDetailController[0].errorData).toEqual(constantsDefine.invoiceErrMsg.NOTEERR000)
      invoiceController.insert = tmpInsert
      invoiceDetailController.insert = tmpdetailInsert
      apiManager.accessTradeshift = tmpApiManager
    })

    test('準正常：明細-備考バリデーションチェック：1001文字以上', async () => {
      // 準備
      const tmpInsert = invoiceController.insert
      const tmpdetailInsert = invoiceDetailController.insert
      const tmpApiManager = apiManager.accessTradeshift
      const resultInvoiceDetailController = []

      invoiceController.insert = jest.fn((values) => {
        return values
      })
      invoiceController.findInvoice = jest.fn((invoice) => {
        return invoice
      })
      invoiceDetailController.insert = jest.fn((values) => {
        if (values.errorData) {
          resultInvoiceDetailController.push(values)
          return values
        }
      })

      request.user = user
      const userToken = {
        accessToken: 'dummyAccessToken',
        refreshToken: 'dummyRefreshToken'
      }
      const filename = request.user.tenantId + '_' + request.user.email + '_' + '20210611102239848' + '.csv'

      const uploadCsvData = Buffer.from(decodeURIComponent(descriptionlessthanequal101), 'base64').toString('utf8')

      createSpyInvoices.mockReturnValue({ ...invoiceData, filename: filename })
      findOneSpyInvoice.mockReturnValue(invoiceData)
      createSpyinvoicesDetail.mockReturnValue(invoiceDetailData)
      findOneSypTenant.mockReturnValue({
        dataValues: {
          tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089'
        }
      })

      // 試験実施
      const resultUpl = csvupload.cbUploadCsv(filePath, filename, uploadCsvData)
      expect(resultUpl).toBeTruthy()

      const resultExt = csvupload.cbExtractInvoice(filePath, filename, userToken, invoiceParameta)
      expect(resultExt).toBeTruthy()

      const resultRem = await csvupload.cbRemoveCsv(filePath, filename)
      expect(resultRem).toBeTruthy()

      // 期待結果
      // 404，500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(500))

      // エラーメッセージが予定通りにある
      expect(resultInvoiceDetailController[0].errorData).toEqual(constantsDefine.invoiceErrMsg.DESCRIPTIONERR000)
      invoiceController.insert = tmpInsert
      invoiceDetailController.insert = tmpdetailInsert
      apiManager.accessTradeshift = tmpApiManager
    })

    test('準正常：ヘッダーバリデーションチェック', async () => {
      // 準備
      const tmpInsert = invoiceController.insert
      const tmpdetailInsert = invoiceDetailController.insert
      const tmpApiManager = apiManager.accessTradeshift
      const resultInvoiceDetailController = []

      invoiceController.insert = jest.fn((values) => {
        return values
      })
      invoiceController.findInvoice = jest.fn((invoice) => {
        return invoice
      })
      invoiceDetailController.insert = jest.fn((values) => {
        if (values.errorData) {
          resultInvoiceDetailController.push(values)
          return values
        }
      })

      request.user = user
      const userToken = {
        accessToken: 'dummyAccessToken',
        refreshToken: 'dummyRefreshToken'
      }
      const filename = request.user.tenantId + '_' + request.user.email + '_' + '20210611102239848' + '.csv'

      const uploadCsvData = Buffer.from(decodeURIComponent(headerCloumnErr), 'base64').toString('utf8')

      createSpyInvoices.mockReturnValue({ ...invoiceData, filename: filename })
      findOneSpyInvoice.mockReturnValue(invoiceData)
      createSpyinvoicesDetail.mockReturnValue(invoiceDetailData)
      findOneSypTenant.mockReturnValue({
        dataValues: {
          tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089'
        }
      })

      // 試験実施
      const resultUpl = csvupload.cbUploadCsv(filePath, filename, uploadCsvData)
      expect(resultUpl).toBeTruthy()

      const resultExt = csvupload.cbExtractInvoice(filePath, filename, userToken, invoiceParameta)
      expect(resultExt).toBeTruthy()

      const resultRem = await csvupload.cbRemoveCsv(filePath, filename)
      expect(resultRem).toBeTruthy()

      // 期待結果
      // 404，500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(500))

      // エラーメッセージが予定通りにある
      expect(resultInvoiceDetailController[0].errorData).toEqual('ヘッダーが指定のものと異なります。')
      invoiceController.insert = tmpInsert
      invoiceDetailController.insert = tmpdetailInsert
      apiManager.accessTradeshift = tmpApiManager
    })

    test('準正常：20項目数バリデーションチェック', async () => {
      // 準備
      const tmpInsert = invoiceController.insert
      const tmpdetailInsert = invoiceDetailController.insert
      const tmpApiManager = apiManager.accessTradeshift
      const resultInvoiceDetailController = []

      invoiceController.insert = jest.fn((values) => {
        return values
      })
      invoiceController.findInvoice = jest.fn((invoice) => {
        return invoice
      })
      invoiceDetailController.insert = jest.fn((values) => {
        if (values.errorData) {
          resultInvoiceDetailController.push(values)
          return values
        }
      })

      request.user = user
      const userToken = {
        accessToken: 'dummyAccessToken',
        refreshToken: 'dummyRefreshToken'
      }
      const filename = request.user.tenantId + '_' + request.user.email + '_' + '20210611102239848' + '.csv'

      const uploadCsvData = Buffer.from(decodeURIComponent(invoiceListCloumnErr20), 'base64').toString('utf8')

      createSpyInvoices.mockReturnValue({ ...invoiceData, filename: filename })
      findOneSpyInvoice.mockReturnValue(invoiceData)
      createSpyinvoicesDetail.mockReturnValue(invoiceDetailData)
      findOneSypTenant.mockReturnValue({
        dataValues: {
          tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089'
        }
      })

      // 試験実施
      const resultUpl = csvupload.cbUploadCsv(filePath, filename, uploadCsvData)
      expect(resultUpl).toBeTruthy()

      const resultExt = csvupload.cbExtractInvoice(filePath, filename, userToken, invoiceParameta)
      expect(resultExt).toBeTruthy()

      const resultRem = await csvupload.cbRemoveCsv(filePath, filename)
      expect(resultRem).toBeTruthy()

      // 期待結果
      // 404，500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(500))

      // エラーメッセージが予定通りにある
      expect(resultInvoiceDetailController[0].errorData).toEqual('項目数が異なります。')
      invoiceController.insert = tmpInsert
      invoiceDetailController.insert = tmpdetailInsert
      apiManager.accessTradeshift = tmpApiManager
    })

    test('準正常：18項目数バリデーションチェック', async () => {
      // 準備
      const tmpInsert = invoiceController.insert
      const tmpdetailInsert = invoiceDetailController.insert
      const tmpApiManager = apiManager.accessTradeshift
      const resultInvoiceDetailController = []

      invoiceController.insert = jest.fn((values) => {
        return values
      })
      invoiceController.findInvoice = jest.fn((invoice) => {
        return invoice
      })
      invoiceDetailController.insert = jest.fn((values) => {
        if (values.errorData) {
          resultInvoiceDetailController.push(values)
          return values
        }
      })

      request.user = user
      const userToken = {
        accessToken: 'dummyAccessToken',
        refreshToken: 'dummyRefreshToken'
      }
      const filename = request.user.tenantId + '_' + request.user.email + '_' + '20210611102239848' + '.csv'

      const uploadCsvData = Buffer.from(decodeURIComponent(invoiceListCloumnErr18), 'base64').toString('utf8')

      createSpyInvoices.mockReturnValue({ ...invoiceData, filename: filename })
      findOneSpyInvoice.mockReturnValue(invoiceData)
      createSpyinvoicesDetail.mockReturnValue(invoiceDetailData)
      findOneSypTenant.mockReturnValue({
        dataValues: {
          tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089'
        }
      })

      // 試験実施
      const resultUpl = csvupload.cbUploadCsv(filePath, filename, uploadCsvData)
      expect(resultUpl).toBeTruthy()

      const resultExt = csvupload.cbExtractInvoice(filePath, filename, userToken, invoiceParameta)
      expect(resultExt).toBeTruthy()

      const resultRem = await csvupload.cbRemoveCsv(filePath, filename)
      expect(resultRem).toBeTruthy()

      // 期待結果
      // 404，500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(500))

      // エラーメッセージが予定通りにある
      expect(resultInvoiceDetailController[0].errorData).toEqual('項目数が異なります。')
      invoiceController.insert = tmpInsert
      invoiceDetailController.insert = tmpdetailInsert
      apiManager.accessTradeshift = tmpApiManager
    })

    test('準正常：単位バリデーションチェック', async () => {
      // 準備
      const tmpInsert = invoiceController.insert
      const tmpdetailInsert = invoiceDetailController.insert
      const tmpApiManager = apiManager.accessTradeshift
      const resultInvoiceDetailController = []

      invoiceController.insert = jest.fn((values) => {
        return values
      })
      invoiceController.findInvoice = jest.fn((invoice) => {
        return invoice
      })
      invoiceDetailController.insert = jest.fn((values) => {
        if (
          values.errorData !== '正常に取込ました。' &&
          values.errorData !== '取込済みのため、処理をスキップしました。'
        ) {
          resultInvoiceDetailController.push(values)
          return values
        }
      })
      request.user = user
      const userToken = {
        accessToken: 'dummyAccessToken',
        refreshToken: 'dummyRefreshToken'
      }
      const filename = request.user.tenantId + '_' + request.user.email + '_' + '20210611102239848' + '.csv'

      const uploadCsvData = Buffer.from(decodeURIComponent(unitcodeData), 'base64').toString('utf8')

      // 試験実施
      const resultUpl = await csvupload.cbUploadCsv(filePath, filename, uploadCsvData)
      expect(resultUpl).toBeTruthy()

      const resultExt = await csvupload.cbExtractInvoice(filePath, filename, userToken, invoiceParameta)
      expect(resultExt).toBe(0)

      const resultRem = await csvupload.cbRemoveCsv(filePath, filename)
      expect(resultRem).toBeTruthy()

      // 期待結果
      // 404，500エラーがエラーハンドリング「されない」
      expect(resultInvoiceDetailController.length).toBe(38)
      expect(next).not.toHaveBeenCalledWith(error404)
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(500))

      // エラーメッセージが予定通りにある
      for (let idx = 0; idx < 38; idx++) {
        expect(resultInvoiceDetailController[idx].invoiceId).toEqual(`単位テスト${idx + 101}`)
        expect(resultInvoiceDetailController[idx].errorData).toEqual(
          '単位はマニュアルに定義されたものの中から選択してください。'
        )
      }
      invoiceController.insert = tmpInsert
      invoiceDetailController.insert = tmpdetailInsert
      apiManager.accessTradeshift = tmpApiManager
    })

    test('準正常：税バリデーションチェック', async () => {
      // 準備
      const tmpInsert = invoiceController.insert
      const tmpdetailInsert = invoiceDetailController.insert
      const tmpApiManager = apiManager.accessTradeshift
      const resultInvoiceDetailController = []

      invoiceController.insert = jest.fn((values) => {
        return values
      })
      invoiceController.findInvoice = jest.fn((invoice) => {
        return invoice
      })
      invoiceDetailController.insert = jest.fn((values) => {
        if (
          values.errorData !== '正常に取込ました。' &&
          values.errorData !== '取込済みのため、処理をスキップしました。'
        ) {
          resultInvoiceDetailController.push(values)
          return values
        }
      })
      request.user = user
      const userToken = {
        accessToken: 'dummyAccessToken',
        refreshToken: 'dummyRefreshToken'
      }
      const filename = request.user.tenantId + '_' + request.user.email + '_' + '20210611102239848' + '.csv'

      const uploadCsvData = Buffer.from(decodeURIComponent(taxData), 'base64').toString('utf8')

      // 試験実施
      const resultUpl = await csvupload.cbUploadCsv(filePath, filename, uploadCsvData)
      expect(resultUpl).toBeTruthy()

      const resultExt = await csvupload.cbExtractInvoice(filePath, filename, userToken, invoiceParameta)
      expect(resultExt).toBe(0)

      const resultRem = await csvupload.cbRemoveCsv(filePath, filename)
      expect(resultRem).toBeTruthy()

      // 期待結果
      // 404，500エラーがエラーハンドリング「されない」
      expect(resultInvoiceDetailController.length).toBe(5)
      expect(next).not.toHaveBeenCalledWith(error404)
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(500))

      // エラーメッセージが予定通りにある
      for (let idx = 0; idx < 5; idx++) {
        expect(resultInvoiceDetailController[idx].invoiceId).toEqual(`税テスト${idx + 11}`)
        expect(resultInvoiceDetailController[idx].errorData).toEqual(
          '税はマニュアルに定義されたものの中から選択してください。'
        )
      }
      invoiceController.insert = tmpInsert
      invoiceDetailController.insert = tmpdetailInsert
      apiManager.accessTradeshift = tmpApiManager
    })

    test('準正常：ネットワーク確認バリデーションチェック', async () => {
      // 準備
      const tmpInsert = invoiceController.insert
      const tmpdetailInsert = invoiceDetailController.insert
      const tmpApiManager = apiManager.accessTradeshift
      const resultInvoiceDetailController = []

      invoiceController.insert = jest.fn((values) => {
        const { v4: uuidv4 } = require('uuid')
        return {
          dataValues: {
            ...values,
            invoicesId: uuidv4()
          }
        }
      })
      invoiceController.findInvoice = jest.fn((invoice) => {
        return { dataValues: invoice }
      })
      invoiceDetailController.insert = jest.fn((values) => {
        if (
          values.errorData !== '正常に取込ました。' &&
          values.errorData !== '取込済みのため、処理をスキップしました。'
        ) {
          resultInvoiceDetailController.push(values)
          return values
        }
      })
      request.user = user
      const userToken = {
        accessToken: 'dummyAccessToken',
        refreshToken: 'dummyRefreshToken'
      }
      const filename = request.user.tenantId + '_' + request.user.email + '_' + '20210611102239848' + '.csv'

      const uploadCsvData = Buffer.from(decodeURIComponent(networkCheckData), 'base64').toString('utf8')

      // 試験実施
      const resultUpl = await csvupload.cbUploadCsv(filePath, filename, uploadCsvData)
      expect(resultUpl).toBeTruthy()

      const resultExt = await csvupload.cbExtractInvoice(filePath, filename, userToken, invoiceParameta)
      expect(resultExt).toBe(0)

      const resultRem = await csvupload.cbRemoveCsv(filePath, filename)
      expect(resultRem).toBeTruthy()

      // 期待結果
      // 404，500エラーがエラーハンドリング「されない」
      expect(resultInvoiceDetailController.length).toBe(2)
      expect(next).not.toHaveBeenCalledWith(error404)
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(500))

      // エラーメッセージが予定通りにある
      for (let idx = 0; idx < 2; idx++) {
        expect(resultInvoiceDetailController[idx]?.invoiceId).toEqual(`ネットワーク確認テスト1${idx + 1}`)
        expect(resultInvoiceDetailController[idx].errorData).toEqual(
          'テナントIDはネットワーク接続済みのものを入力してください。'
        )
      }
      invoiceController.insert = tmpInsert
      invoiceDetailController.insert = tmpdetailInsert
      apiManager.accessTradeshift = tmpApiManager
    })

    test('正常 : bconCsv内容確認', async () => {
      // 準備
      request.user = user
      const filename = request.user.tenantId + '_' + request.user.email + '_' + '20210611102239848' + '.csv'
      const uploadCsvData = Buffer.from(decodeURIComponent(fileData), 'base64').toString('utf8')
      const extractFullpathFile = filePath + '/' + filename

      // 試験実施
      const resultUpl = csvupload.cbUploadCsv(filePath, filename, uploadCsvData)
      expect(resultUpl).toBeTruthy()

      const csvObj = new bconCsv(extractFullpathFile)
      const invoiceList = csvObj.getInvoiceList()

      const resultRem = csvupload.cbRemoveCsv(filePath, filename)
      expect(resultRem).toBeTruthy()

      // 期待結果
      // JSONの内容が正しいこと
      expect(JSON.stringify(invoiceList[0].INVOICE.getDocument())).toBe(returnBconCsv)
    })

    test('正常 : bconCsv取り込み結果カウント確認', async () => {
      // 準備
      request.user = user

      const filename = request.user.tenantId + '_' + request.user.email + '_' + '20210611102239848' + '.csv'
      const uploadCsvData = Buffer.from(decodeURIComponent(countCheckData), 'base64').toString('utf8')
      const extractFullpathFile = filePath + '/' + filename

      // 試験実施
      const resultUpl = csvupload.cbUploadCsv(filePath, filename, uploadCsvData)
      expect(resultUpl).toBeTruthy()

      const csvObj = new bconCsv(extractFullpathFile)
      const invoiceList = csvObj.getInvoiceList()

      const resultRem = csvupload.cbRemoveCsv(filePath, filename)
      expect(resultRem).toBeTruthy()

      // 期待結果
      // JSONの内容が正しいこと
      expect(invoiceList[0].successCount).toBe(1)
      expect(invoiceList[0].skipCount).toBe(0)
      expect(invoiceList[0].failCount).toBe(0)

      expect(invoiceList[1].successCount).toBe(0)
      expect(invoiceList[1].skipCount).toBe(0)
      expect(invoiceList[1].failCount).toBe(1)

      expect(invoiceList[2].successCount).toBe(0)
      expect(invoiceList[2].skipCount).toBe(1)
      expect(invoiceList[2].failCount).toBe(0)
    })
  })

  // cbRemoveCsvの確認
  describe('cbRemoveCsv', () => {
    test('正常', async () => {
      // 準備
      request.user = user
      const filename = request.user.tenantId + '_' + request.user.email + '_' + '20210611102239848' + '.csv'

      const uploadCsvData = Buffer.from(decodeURIComponent(fileData), 'base64').toString('utf8')

      // 試験実施
      csvupload.cbUploadCsv(filePath, filename, uploadCsvData)

      // 試験実施
      const result = csvupload.cbRemoveCsv(filePath, filename)

      // returnがtrueであること
      expect(result).toBeTruthy()

      // 期待結果
      // 404，500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(500))
    })

    test('ファイルが存在しない場合', async () => {
      // 準備
      request.user = user

      // 試験実施(returnがtrueであること)
      const result = csvupload.cbRemoveCsv(filePath, '')

      // 期待結果
      // returnがfalseであること
      expect(result).toBeFalsy()
    })

    test('Failed to Delete CSVFile.(error)', async () => {
      // 準備
      request.user = user
      const filename = request.user.tenantId + '_' + request.user.email + '_' + '20210611102239848' + '.csv'
      const filePath = '///'

      // 試験実施(returnがtrueであること)
      const result = csvupload.cbRemoveCsv(filePath, filename)

      // 期待結果
      // returnがfalseであること
      expect(result).toBeFalsy()
    })
  })

  // getTimeStampの確認
  describe('getTimeStamp', () => {
    jest.useFakeTimers('modern')

    test('正常', async () => {
      // 試験実施
      const timeStamp = csvupload.getTimeStamp()

      // 期待結果
      // returnがnullでないこと
      expect(timeStamp).not.toBe(null)
    })

    test('正常：TimeStamp all 10 Below', async () => {
      // 準備
      // 時間設定
      jest.setSystemTime(new Date(2021, 3, 3, 3, 3, 3, 3))

      // 試験実施
      const timeStamp = csvupload.getTimeStamp()

      // 期待結果
      // returnがnullでないこと
      expect(timeStamp).not.toBe(null)
    })
    test('正常：TimeStamp all 10 Over', async () => {
      // 準備
      // 時間設定
      jest.setSystemTime(new Date(2021, 10, 10, 10, 10, 10, 10))

      // 試験実施
      const timeStamp = csvupload.getTimeStamp()

      // 期待結果
      // returnがnullでないこと
      expect(timeStamp).not.toBe(null)
    })
  })
})
