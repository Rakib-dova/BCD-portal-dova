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
const invocesController = require('../../Application/controllers/invoiceController.js')
const invoceDetailController = require('../../Application/controllers/invoiceDetailController.js')
const tenantController = require('../../Application/controllers/tenantController')
const logger = require('../../Application/lib/logger.js')
const constantsDefine = require('../../Application/constants')
const invoiceController = require('../../Application/controllers/invoiceController.js')

if (process.env.LOCALLY_HOSTED === 'true') {
  // NODE_ENVはJestがデフォルトでtestに指定する。dotenvで上書きできなかったため、package.jsonの実行引数でdevelopmentを指定
  require('dotenv').config({ path: './config/.env' })
}
let request, response, infoSpy, findOneSpy, findOneSpyContracts, accessTradeshiftSpy, invoiceListSpy
let createSpyInvoices, createSpyinvoicesDetail, findOneSpyInvoice, findOneSypTenant
describe('csvuploadのテスト', () => {
  beforeEach(() => {
    request = new Request()
    response = new Response()
    infoSpy = jest.spyOn(logger, 'info')
    findOneSpy = jest.spyOn(userController, 'findOne')
    findOneSpyContracts = jest.spyOn(contractController, 'findOne')
    invoiceListSpy = jest.spyOn(csvupload, 'cbExtractInvoice')
    accessTradeshiftSpy = jest.spyOn(apiManager, 'accessTradeshift')
    createSpyInvoices = jest.spyOn(invoiceController, 'insert')
    createSpyinvoicesDetail = jest.spyOn(invoceDetailController, 'insert')
    findOneSpyInvoice = jest.spyOn(invocesController, 'findInvoice')
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
    accessTradeshiftSpy.mockRestore()
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
    tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089'
  }
  // DBの正常なユーザデータ
  const dataValues = {
    dataValues: {
      tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089',
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
2021-06-14,UT_TEST_INVOICE_1_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-17,test111,testsiten,testbank,General,11111,kang_test,特記事項テストです。,001,PC,100,個,100000,消費税,アップロードテスト`
  ).toString('base64')

  // 請求書が２つ以上、請求書番号が一致していない
  const fileData2 = Buffer.from(
    `発行日,請求書番号,テナントID,支払期日,納品日,備考,銀行名,支店名,科目,口座番号,口座名義,その他特異事項,明細-項目ID,明細-内容,明細-数量,明細-単位,明細-単価,明細-税,明細-備考
2021-06-14,UT_TEST_INVOICE_2_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-17,test111,testsiten,testbank,General,11111,kang_test,特記事項テストです。,001,PC,100,個,100000,消費税,アップロードテスト
2021-06-14,UT_TEST_INVOICE_2_2,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-17,test111,testsiten,testbank,General,11111,kang_test,特記事項テストです。,002,ノートパソコン,100,個,100000,JP 消費税(軽減税率) 8%,アップロードテスト
2021-06-15,UT_TEST_INVOICE_2_3,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test112,testsiten,testbank,General,11111,kim_test,特記事項テストです。,003,周辺機器,100,個,100000,JP 不課税 0%,アップロードテスト
2021-06-15,UT_TEST_INVOICE_2_4,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-19,test113,testsiten,testbank,General,11111,kim_test,特記事項テストです。,004,プリント用紙,100,個,100000,JP 免税 0%,アップロードテスト`
  ).toString('base64')

  // 請求書が２つ以上、請求書番号が一致していて、順番になっている
  const fileData3 = Buffer.from(
    `発行日,請求書番号,テナントID,支払期日,納品日,備考,銀行名,支店名,科目,口座番号,口座名義,その他特異事項,明細-項目ID,明細-内容,明細-数量,明細-単位,明細-単価,明細-税,明細-備考
2021-06-15,UT_TEST_INVOICE_3_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test112,testsiten,testbank,General,11111,kim_test,特記事項テストです。,001,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_3_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-19,test113,testsiten,testbank,General,11111,kim_test,特記事項テストです。,002,ノートパソコン,100,個,JP 消費税(軽減税率) 8%,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_2,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-17,test111,testsiten,testbank,General,11111,kang_test,特記事項テストです。,001,ST001S,100,個,100000,JP 不課税 0%,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_2,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-17,test111,testsiten,testbank,General,11111,kang_test,特記事項テストです。,002,ST001M,100,個,100000,JP 免税 0%,アップロードテスト`
  ).toString('base64')

  // 請求書が２つ以上、請求書番号が順番になっていること、請求書番号が割り込んでいる
  const fileData4 = Buffer.from(
    `発行日,請求書番号,テナントID,支払期日,納品日,備考,銀行名,支店名,科目,口座番号,口座名義,その他特異事項,明細-項目ID,明細-内容,明細-数量,明細-単位,明細-単価,明細-税,明細-備考
2021-06-15,UT_TEST_INVOICE_3_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test112,testsiten,testbank,General,11111,kim_test,特記事項テストです。,001,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_3_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-19,test113,testsiten,testbank,General,11111,kim_test,特記事項テストです。,002,ノートパソコン,100,個,100000,JP 消費税(軽減税率) 8%,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_2,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-17,test111,testsiten,testbank,General,11111,kang_test,特記事項テストです。,001,ST001S,100,個,100000,JP 消費税(軽減税率) 8%,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_2,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-17,test111,testsiten,testbank,General,11111,kang_test,特記事項テストです。,002,ST002M,100,個,100000,JP 不課税 0%,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-17,test111,testsiten,testbank,General,11111,kang_test,特記事項テストです。,003,マウス,100,個,100000,JP 免税 0%,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-17,test111,testsiten,testbank,General,11111,kang_test,特記事項テストです。,004,キーボード,100,個,100000,JP 非課税 0%,アップロードテスト`
  ).toString('base64')

  // 既に登録済みの請求書番号
  const fileData5 = Buffer.from(
    `発行日,請求書番号,テナントID,支払期日,納品日,備考,銀行名,支店名,科目,口座番号,口座名義,その他特異事項,明細-項目ID,明細-内容,明細-数量,明細-単位,明細-単価,明細-税,明細-備考
2021-06-15,UT_TEST_INVOICE_5_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test112,testsiten,testbank,General,11111,kim_test,特記事項テストです。,001,PC,100,個,100000,消費税,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_2,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-17,test111,testsiten,testbank,General,11111,kang_test,特記事項テストです。,001,ST001S,100,個,100000,JP 消費税(軽減税率) 8%,アップロードテスト`
  ).toString('base64')

  // 請求書が100件
  const fileData100 = Buffer.from(
    `発行日,請求書番号,テナントID,支払期日,納品日,備考,銀行名,支店名,科目,口座番号,口座名義,その他特異事項,明細-項目ID,明細-内容,明細-数量,明細-単位,明細-単価,明細-税,明細-備考
2021-06-15,UT_TEST_INVOICE_3_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/18,test112,testsiten,testbank,General,11111,kim_test,特記事項テストです。,001,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_3_2,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/19,test113,testsiten,testbank,General,11111,kim_test,特記事項テストです。,002,ノートパソコン,100,個,100000,JP 消費税(軽減税率) 8%,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_3,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,General,11111,kang_test,特記事項テストです。,001,ST001S,100,個,100000,JP 消費税(軽減税率) 8%,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_4,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,General,11111,kang_test,特記事項テストです。,002,ST002M,100,個,100000,JP 不課税 0%,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_5,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,General,11111,kang_test,特記事項テストです。,003,マウス,100,個,100000,JP 免税 0%,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_6,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,General,11111,kang_test,特記事項テストです。,004,キーボード,100,個,100000,JP 非課税 0%,アップロードテスト
2021-06-15,UT_TEST_INVOICE_3_7,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/18,test112,testsiten,testbank,General,11111,kim_test,特記事項テストです。,001,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_3_8,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/19,test113,testsiten,testbank,General,11111,kim_test,特記事項テストです。,002,ノートパソコン,100,個,100000,JP 消費税(軽減税率) 8%,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_9,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,General,11111,kang_test,特記事項テストです。,001,ST001S,100,個,100000,JP 消費税(軽減税率) 8%,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_10,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,General,11111,kang_test,特記事項テストです。,002,ST002M,100,個,100000,JP 不課税 0%,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_11,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,General,11111,kang_test,特記事項テストです。,003,マウス,100,個,100000,JP 免税 0%,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_12,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,General,11111,kang_test,特記事項テストです。,004,キーボード,100,個,100000,JP 非課税 0%,アップロードテスト
2021-06-15,UT_TEST_INVOICE_3_13,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/18,test112,testsiten,testbank,General,11111,kim_test,特記事項テストです。,001,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_3_14,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/19,test113,testsiten,testbank,General,11111,kim_test,特記事項テストです。,002,ノートパソコン,100,個,100000,JP 消費税(軽減税率) 8%,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_15,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,General,11111,kang_test,特記事項テストです。,001,ST001S,100,個,100000,JP 消費税(軽減税率) 8%,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_16,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,General,11111,kang_test,特記事項テストです。,002,ST002M,100,個,100000,JP 不課税 0%,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_17,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,General,11111,kang_test,特記事項テストです。,003,マウス,100,個,100000,JP 免税 0%,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_18,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,General,11111,kang_test,特記事項テストです。,004,キーボード,100,個,100000,JP 非課税 0%,アップロードテスト
2021-06-15,UT_TEST_INVOICE_3_19,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/18,test112,testsiten,testbank,General,11111,kim_test,特記事項テストです。,001,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_3_20,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/19,test113,testsiten,testbank,General,11111,kim_test,特記事項テストです。,002,ノートパソコン,100,個,100000,JP 消費税(軽減税率) 8%,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_21,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,General,11111,kang_test,特記事項テストです。,001,ST001S,100,個,100000,JP 消費税(軽減税率) 8%,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_22,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,General,11111,kang_test,特記事項テストです。,002,ST002M,100,個,100000,JP 不課税 0%,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_23,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,General,11111,kang_test,特記事項テストです。,003,マウス,100,個,100000,JP 免税 0%,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_24,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,General,11111,kang_test,特記事項テストです。,004,キーボード,100,個,100000,JP 非課税 0%,アップロードテスト
2021-06-15,UT_TEST_INVOICE_3_25,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/18,test112,testsiten,testbank,General,11111,kim_test,特記事項テストです。,001,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_3_26,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/19,test113,testsiten,testbank,General,11111,kim_test,特記事項テストです。,002,ノートパソコン,100,個,100000,JP 消費税(軽減税率) 8%,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_27,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,General,11111,kang_test,特記事項テストです。,001,ST001S,100,個,100000,JP 消費税(軽減税率) 8%,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_28,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,General,11111,kang_test,特記事項テストです。,002,ST002M,100,個,100000,JP 不課税 0%,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_29,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,General,11111,kang_test,特記事項テストです。,003,マウス,100,個,100000,JP 免税 0%,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_30,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,General,11111,kang_test,特記事項テストです。,004,キーボード,100,個,100000,JP 非課税 0%,アップロードテスト
2021-06-15,UT_TEST_INVOICE_3_31,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/18,test112,testsiten,testbank,General,11111,kim_test,特記事項テストです。,001,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_3_32,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/19,test113,testsiten,testbank,General,11111,kim_test,特記事項テストです。,002,ノートパソコン,100,個,100000,JP 消費税(軽減税率) 8%,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_33,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,General,11111,kang_test,特記事項テストです。,001,ST001S,100,個,100000,JP 消費税(軽減税率) 8%,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_34,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,General,11111,kang_test,特記事項テストです。,002,ST002M,100,個,100000,JP 不課税 0%,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_35,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,General,11111,kang_test,特記事項テストです。,003,マウス,100,個,100000,JP 免税 0%,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_36,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,General,11111,kang_test,特記事項テストです。,004,キーボード,100,個,100000,JP 非課税 0%,アップロードテスト
2021-06-15,UT_TEST_INVOICE_3_37,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/18,test112,testsiten,testbank,General,11111,kim_test,特記事項テストです。,001,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_3_38,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/19,test113,testsiten,testbank,General,11111,kim_test,特記事項テストです。,002,ノートパソコン,100,個,100000,JP 消費税(軽減税率) 8%,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_39,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,General,11111,kang_test,特記事項テストです。,001,ST001S,100,個,100000,JP 消費税(軽減税率) 8%,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_40,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,General,11111,kang_test,特記事項テストです。,002,ST002M,100,個,100000,JP 不課税 0%,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_41,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,General,11111,kang_test,特記事項テストです。,003,マウス,100,個,100000,JP 免税 0%,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_42,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,General,11111,kang_test,特記事項テストです。,004,キーボード,100,個,100000,JP 非課税 0%,アップロードテスト
2021-06-15,UT_TEST_INVOICE_3_43,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/18,test112,testsiten,testbank,General,11111,kim_test,特記事項テストです。,001,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_3_44,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/19,test113,testsiten,testbank,General,11111,kim_test,特記事項テストです。,002,ノートパソコン,100,個,100000,JP 消費税(軽減税率) 8%,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_45,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,General,11111,kang_test,特記事項テストです。,001,ST001S,100,個,100000,JP 消費税(軽減税率) 8%,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_46,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,General,11111,kang_test,特記事項テストです。,002,ST002M,100,個,100000,JP 不課税 0%,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_47,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,General,11111,kang_test,特記事項テストです。,003,マウス,100,個,100000,JP 免税 0%,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_48,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,General,11111,kang_test,特記事項テストです。,004,キーボード,100,個,100000,JP 非課税 0%,アップロードテスト
2021-06-15,UT_TEST_INVOICE_3_49,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/18,test112,testsiten,testbank,General,11111,kim_test,特記事項テストです。,001,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_3_50,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/19,test113,testsiten,testbank,General,11111,kim_test,特記事項テストです。,002,ノートパソコン,100,個,100000,JP 消費税(軽減税率) 8%,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_51,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,General,11111,kang_test,特記事項テストです。,001,ST001S,100,個,100000,JP 消費税(軽減税率) 8%,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_52,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,General,11111,kang_test,特記事項テストです。,002,ST002M,100,個,100000,JP 不課税 0%,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_53,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,General,11111,kang_test,特記事項テストです。,003,マウス,100,個,100000,JP 免税 0%,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_54,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,General,11111,kang_test,特記事項テストです。,004,キーボード,100,個,100000,JP 非課税 0%,アップロードテスト
2021-06-15,UT_TEST_INVOICE_3_55,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/18,test112,testsiten,testbank,General,11111,kim_test,特記事項テストです。,001,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_3_56,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/19,test113,testsiten,testbank,General,11111,kim_test,特記事項テストです。,002,ノートパソコン,100,個,100000,JP 消費税(軽減税率) 8%,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_57,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,General,11111,kang_test,特記事項テストです。,001,ST001S,100,個,100000,JP 消費税(軽減税率) 8%,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_58,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,General,11111,kang_test,特記事項テストです。,002,ST002M,100,個,100000,JP 不課税 0%,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_59,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,General,11111,kang_test,特記事項テストです。,003,マウス,100,個,100000,JP 免税 0%,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_60,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,General,11111,kang_test,特記事項テストです。,004,キーボード,100,個,100000,JP 非課税 0%,アップロードテスト
2021-06-15,UT_TEST_INVOICE_3_61,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/18,test112,testsiten,testbank,General,11111,kim_test,特記事項テストです。,001,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_3_62,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/19,test113,testsiten,testbank,General,11111,kim_test,特記事項テストです。,002,ノートパソコン,100,個,100000,JP 消費税(軽減税率) 8%,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_63,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,General,11111,kang_test,特記事項テストです。,001,ST001S,100,個,100000,JP 消費税(軽減税率) 8%,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_64,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,General,11111,kang_test,特記事項テストです。,002,ST002M,100,個,100000,JP 不課税 0%,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_65,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,General,11111,kang_test,特記事項テストです。,003,マウス,100,個,100000,JP 免税 0%,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_66,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,General,11111,kang_test,特記事項テストです。,004,キーボード,100,個,100000,JP 非課税 0%,アップロードテスト
2021-06-15,UT_TEST_INVOICE_3_67,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/18,test112,testsiten,testbank,General,11111,kim_test,特記事項テストです。,001,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_3_68,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/19,test113,testsiten,testbank,General,11111,kim_test,特記事項テストです。,002,ノートパソコン,100,個,100000,JP 消費税(軽減税率) 8%,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_69,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,General,11111,kang_test,特記事項テストです。,001,ST001S,100,個,100000,JP 消費税(軽減税率) 8%,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_70,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,General,11111,kang_test,特記事項テストです。,002,ST002M,100,個,100000,JP 不課税 0%,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_71,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,General,11111,kang_test,特記事項テストです。,003,マウス,100,個,100000,JP 免税 0%,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_72,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,General,11111,kang_test,特記事項テストです。,004,キーボード,100,個,100000,JP 非課税 0%,アップロードテスト
2021-06-15,UT_TEST_INVOICE_3_73,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/18,test112,testsiten,testbank,General,11111,kim_test,特記事項テストです。,001,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_3_74,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/19,test113,testsiten,testbank,General,11111,kim_test,特記事項テストです。,002,ノートパソコン,100,個,100000,JP 消費税(軽減税率) 8%,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_75,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,General,11111,kang_test,特記事項テストです。,001,ST001S,100,個,100000,JP 消費税(軽減税率) 8%,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_76,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,General,11111,kang_test,特記事項テストです。,002,ST002M,100,個,100000,JP 不課税 0%,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_77,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,General,11111,kang_test,特記事項テストです。,003,マウス,100,個,100000,JP 免税 0%,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_78,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,General,11111,kang_test,特記事項テストです。,004,キーボード,100,個,100000,JP 非課税 0%,アップロードテスト
2021-06-15,UT_TEST_INVOICE_3_79,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/18,test112,testsiten,testbank,General,11111,kim_test,特記事項テストです。,001,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_3_80,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/19,test113,testsiten,testbank,General,11111,kim_test,特記事項テストです。,002,ノートパソコン,100,個,100000,JP 消費税(軽減税率) 8%,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_81,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,General,11111,kang_test,特記事項テストです。,001,ST001S,100,個,100000,JP 消費税(軽減税率) 8%,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_82,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,General,11111,kang_test,特記事項テストです。,002,ST002M,100,個,100000,JP 不課税 0%,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_83,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,General,11111,kang_test,特記事項テストです。,003,マウス,100,個,100000,JP 免税 0%,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_84,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,General,11111,kang_test,特記事項テストです。,004,キーボード,100,個,100000,JP 非課税 0%,アップロードテスト
2021-06-15,UT_TEST_INVOICE_3_85,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/18,test112,testsiten,testbank,General,11111,kim_test,特記事項テストです。,001,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_3_86,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/19,test113,testsiten,testbank,General,11111,kim_test,特記事項テストです。,002,ノートパソコン,100,個,100000,JP 消費税(軽減税率) 8%,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_87,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,General,11111,kang_test,特記事項テストです。,001,ST001S,100,個,100000,JP 消費税(軽減税率) 8%,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_88,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,General,11111,kang_test,特記事項テストです。,002,ST002M,100,個,100000,JP 不課税 0%,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_89,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,General,11111,kang_test,特記事項テストです。,003,マウス,100,個,100000,JP 免税 0%,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_90,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,General,11111,kang_test,特記事項テストです。,004,キーボード,100,個,100000,JP 非課税 0%,アップロードテスト
2021-06-15,UT_TEST_INVOICE_3_91,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/18,test112,testsiten,testbank,General,11111,kim_test,特記事項テストです。,001,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_3_92,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/19,test113,testsiten,testbank,General,11111,kim_test,特記事項テストです。,002,ノートパソコン,100,個,100000,JP 消費税(軽減税率) 8%,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_93,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,General,11111,kang_test,特記事項テストです。,001,ST001S,100,個,100000,JP 消費税(軽減税率) 8%,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_94,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,General,11111,kang_test,特記事項テストです。,002,ST002M,100,個,100000,JP 不課税 0%,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_95,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,General,11111,kang_test,特記事項テストです。,003,マウス,100,個,100000,JP 免税 0%,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_96,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,General,11111,kang_test,特記事項テストです。,004,キーボード,100,個,100000,JP 非課税 0%,アップロードテスト
2021-06-15,UT_TEST_INVOICE_3_97,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/18,test112,testsiten,testbank,General,11111,kim_test,特記事項テストです。,001,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_3_98,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/19,test113,testsiten,testbank,General,11111,kim_test,特記事項テストです。,002,ノートパソコン,100,個,100000,JP 消費税(軽減税率) 8%,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_99,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,General,11111,kang_test,特記事項テストです。,001,ST001S,100,個,100000,JP 消費税(軽減税率) 8%,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_100,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,General,11111,kang_test,特記事項テストです。,002,ST002M,100,個,100000,JP 不課税 0%,アップロードテスト`
  ).toString('base64')

  // 請求書が100以上、エラー発生
  const fileData101 = Buffer.from(
    `発行日,請求書番号,テナントID,支払期日,納品日,備考,銀行名,支店名,科目,口座番号,口座名義,その他特異事項,明細-項目ID,明細-内容,明細-数量,明細-単位,明細-単価,明細-税,明細-備考
2021-06-15,UT_TEST_INVOICE_3_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/18,test112,testsiten,testbank,General,11111,kim_test,特記事項テストです。,001,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_3_2,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/19,test113,testsiten,testbank,General,11111,kim_test,特記事項テストです。,002,ノートパソコン,100,個,100000,JP 消費税(軽減税率) 8%,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_3,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,General,11111,kang_test,特記事項テストです。,001,ST001S,100,個,100000,JP 消費税(軽減税率) 8%,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_4,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,General,11111,kang_test,特記事項テストです。,002,ST002M,100,個,100000,JP 不課税 0%,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_5,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,General,11111,kang_test,特記事項テストです。,003,マウス,100,個,100000,JP 免税 0%,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_6,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,General,11111,kang_test,特記事項テストです。,004,キーボード,100,個,100000,JP 非課税 0%,アップロードテスト
2021-06-15,UT_TEST_INVOICE_3_7,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/18,test112,testsiten,testbank,General,11111,kim_test,特記事項テストです。,001,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_3_8,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/19,test113,testsiten,testbank,General,11111,kim_test,特記事項テストです。,002,ノートパソコン,100,個,100000,JP 消費税(軽減税率) 8%,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_9,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,General,11111,kang_test,特記事項テストです。,001,ST001S,100,個,100000,JP 消費税(軽減税率) 8%,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_10,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,General,11111,kang_test,特記事項テストです。,002,ST002M,100,個,100000,JP 不課税 0%,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_11,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,General,11111,kang_test,特記事項テストです。,003,マウス,100,個,100000,JP 免税 0%,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_12,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,General,11111,kang_test,特記事項テストです。,004,キーボード,100,個,100000,JP 非課税 0%,アップロードテスト
2021-06-15,UT_TEST_INVOICE_3_13,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/18,test112,testsiten,testbank,General,11111,kim_test,特記事項テストです。,001,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_3_14,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/19,test113,testsiten,testbank,General,11111,kim_test,特記事項テストです。,002,ノートパソコン,100,個,100000,JP 消費税(軽減税率) 8%,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_15,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,General,11111,kang_test,特記事項テストです。,001,ST001S,100,個,100000,JP 消費税(軽減税率) 8%,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_16,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,General,11111,kang_test,特記事項テストです。,002,ST002M,100,個,100000,JP 不課税 0%,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_17,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,General,11111,kang_test,特記事項テストです。,003,マウス,100,個,100000,JP 免税 0%,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_18,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,General,11111,kang_test,特記事項テストです。,004,キーボード,100,個,100000,JP 非課税 0%,アップロードテスト
2021-06-15,UT_TEST_INVOICE_3_19,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/18,test112,testsiten,testbank,General,11111,kim_test,特記事項テストです。,001,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_3_20,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/19,test113,testsiten,testbank,General,11111,kim_test,特記事項テストです。,002,ノートパソコン,100,個,100000,JP 消費税(軽減税率) 8%,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_21,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,General,11111,kang_test,特記事項テストです。,001,ST001S,100,個,100000,JP 消費税(軽減税率) 8%,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_22,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,General,11111,kang_test,特記事項テストです。,002,ST002M,100,個,100000,JP 不課税 0%,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_23,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,General,11111,kang_test,特記事項テストです。,003,マウス,100,個,100000,JP 免税 0%,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_24,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,General,11111,kang_test,特記事項テストです。,004,キーボード,100,個,100000,JP 非課税 0%,アップロードテスト
2021-06-15,UT_TEST_INVOICE_3_25,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/18,test112,testsiten,testbank,General,11111,kim_test,特記事項テストです。,001,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_3_26,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/19,test113,testsiten,testbank,General,11111,kim_test,特記事項テストです。,002,ノートパソコン,100,個,100000,JP 消費税(軽減税率) 8%,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_27,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,General,11111,kang_test,特記事項テストです。,001,ST001S,100,個,100000,JP 消費税(軽減税率) 8%,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_28,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,General,11111,kang_test,特記事項テストです。,002,ST002M,100,個,100000,JP 不課税 0%,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_29,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,General,11111,kang_test,特記事項テストです。,003,マウス,100,個,100000,JP 免税 0%,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_30,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,General,11111,kang_test,特記事項テストです。,004,キーボード,100,個,100000,JP 非課税 0%,アップロードテスト
2021-06-15,UT_TEST_INVOICE_3_31,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/18,test112,testsiten,testbank,General,11111,kim_test,特記事項テストです。,001,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_3_32,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/19,test113,testsiten,testbank,General,11111,kim_test,特記事項テストです。,002,ノートパソコン,100,個,100000,JP 消費税(軽減税率) 8%,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_33,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,General,11111,kang_test,特記事項テストです。,001,ST001S,100,個,100000,JP 消費税(軽減税率) 8%,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_34,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,General,11111,kang_test,特記事項テストです。,002,ST002M,100,個,100000,JP 不課税 0%,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_35,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,General,11111,kang_test,特記事項テストです。,003,マウス,100,個,100000,JP 免税 0%,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_36,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,General,11111,kang_test,特記事項テストです。,004,キーボード,100,個,100000,JP 非課税 0%,アップロードテスト
2021-06-15,UT_TEST_INVOICE_3_37,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/18,test112,testsiten,testbank,General,11111,kim_test,特記事項テストです。,001,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_3_38,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/19,test113,testsiten,testbank,General,11111,kim_test,特記事項テストです。,002,ノートパソコン,100,個,100000,JP 消費税(軽減税率) 8%,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_39,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,General,11111,kang_test,特記事項テストです。,001,ST001S,100,個,100000,JP 消費税(軽減税率) 8%,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_40,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,General,11111,kang_test,特記事項テストです。,002,ST002M,100,個,100000,JP 不課税 0%,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_41,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,General,11111,kang_test,特記事項テストです。,003,マウス,100,個,100000,JP 免税 0%,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_42,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,General,11111,kang_test,特記事項テストです。,004,キーボード,100,個,100000,JP 非課税 0%,アップロードテスト
2021-06-15,UT_TEST_INVOICE_3_43,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/18,test112,testsiten,testbank,General,11111,kim_test,特記事項テストです。,001,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_3_44,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/19,test113,testsiten,testbank,General,11111,kim_test,特記事項テストです。,002,ノートパソコン,100,個,100000,JP 消費税(軽減税率) 8%,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_45,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,General,11111,kang_test,特記事項テストです。,001,ST001S,100,個,100000,JP 消費税(軽減税率) 8%,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_46,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,General,11111,kang_test,特記事項テストです。,002,ST002M,100,個,100000,JP 不課税 0%,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_47,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,General,11111,kang_test,特記事項テストです。,003,マウス,100,個,100000,JP 免税 0%,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_48,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,General,11111,kang_test,特記事項テストです。,004,キーボード,100,個,100000,JP 非課税 0%,アップロードテスト
2021-06-15,UT_TEST_INVOICE_3_49,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/18,test112,testsiten,testbank,General,11111,kim_test,特記事項テストです。,001,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_3_50,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/19,test113,testsiten,testbank,General,11111,kim_test,特記事項テストです。,002,ノートパソコン,100,個,100000,JP 消費税(軽減税率) 8%,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_51,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,General,11111,kang_test,特記事項テストです。,001,ST001S,100,個,100000,JP 消費税(軽減税率) 8%,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_52,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,General,11111,kang_test,特記事項テストです。,002,ST002M,100,個,100000,JP 不課税 0%,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_53,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,General,11111,kang_test,特記事項テストです。,003,マウス,100,個,100000,JP 免税 0%,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_54,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,General,11111,kang_test,特記事項テストです。,004,キーボード,100,個,100000,JP 非課税 0%,アップロードテスト
2021-06-15,UT_TEST_INVOICE_3_55,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/18,test112,testsiten,testbank,General,11111,kim_test,特記事項テストです。,001,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_3_56,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/19,test113,testsiten,testbank,General,11111,kim_test,特記事項テストです。,002,ノートパソコン,100,個,100000,JP 消費税(軽減税率) 8%,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_57,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,General,11111,kang_test,特記事項テストです。,001,ST001S,100,個,100000,JP 消費税(軽減税率) 8%,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_58,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,General,11111,kang_test,特記事項テストです。,002,ST002M,100,個,100000,JP 不課税 0%,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_59,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,General,11111,kang_test,特記事項テストです。,003,マウス,100,個,100000,JP 免税 0%,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_60,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,General,11111,kang_test,特記事項テストです。,004,キーボード,100,個,100000,JP 非課税 0%,アップロードテスト
2021-06-15,UT_TEST_INVOICE_3_61,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/18,test112,testsiten,testbank,General,11111,kim_test,特記事項テストです。,001,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_3_62,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/19,test113,testsiten,testbank,General,11111,kim_test,特記事項テストです。,002,ノートパソコン,100,個,100000,JP 消費税(軽減税率) 8%,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_63,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,General,11111,kang_test,特記事項テストです。,001,ST001S,100,個,100000,JP 消費税(軽減税率) 8%,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_64,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,General,11111,kang_test,特記事項テストです。,002,ST002M,100,個,100000,JP 不課税 0%,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_65,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,General,11111,kang_test,特記事項テストです。,003,マウス,100,個,100000,JP 免税 0%,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_66,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,General,11111,kang_test,特記事項テストです。,004,キーボード,100,個,100000,JP 非課税 0%,アップロードテスト
2021-06-15,UT_TEST_INVOICE_3_67,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/18,test112,testsiten,testbank,General,11111,kim_test,特記事項テストです。,001,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_3_68,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/19,test113,testsiten,testbank,General,11111,kim_test,特記事項テストです。,002,ノートパソコン,100,個,100000,JP 消費税(軽減税率) 8%,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_69,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,General,11111,kang_test,特記事項テストです。,001,ST001S,100,個,100000,JP 消費税(軽減税率) 8%,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_70,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,General,11111,kang_test,特記事項テストです。,002,ST002M,100,個,100000,JP 不課税 0%,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_71,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,General,11111,kang_test,特記事項テストです。,003,マウス,100,個,100000,JP 免税 0%,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_72,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,General,11111,kang_test,特記事項テストです。,004,キーボード,100,個,100000,JP 非課税 0%,アップロードテスト
2021-06-15,UT_TEST_INVOICE_3_73,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/18,test112,testsiten,testbank,General,11111,kim_test,特記事項テストです。,001,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_3_74,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/19,test113,testsiten,testbank,General,11111,kim_test,特記事項テストです。,002,ノートパソコン,100,個,100000,JP 消費税(軽減税率) 8%,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_75,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,General,11111,kang_test,特記事項テストです。,001,ST001S,100,個,100000,JP 消費税(軽減税率) 8%,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_76,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,General,11111,kang_test,特記事項テストです。,002,ST002M,100,個,100000,JP 不課税 0%,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_77,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,General,11111,kang_test,特記事項テストです。,003,マウス,100,個,100000,JP 免税 0%,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_78,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,General,11111,kang_test,特記事項テストです。,004,キーボード,100,個,100000,JP 非課税 0%,アップロードテスト
2021-06-15,UT_TEST_INVOICE_3_79,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/18,test112,testsiten,testbank,General,11111,kim_test,特記事項テストです。,001,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_3_80,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/19,test113,testsiten,testbank,General,11111,kim_test,特記事項テストです。,002,ノートパソコン,100,個,100000,JP 消費税(軽減税率) 8%,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_81,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,General,11111,kang_test,特記事項テストです。,001,ST001S,100,個,100000,JP 消費税(軽減税率) 8%,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_82,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,General,11111,kang_test,特記事項テストです。,002,ST002M,100,個,100000,JP 不課税 0%,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_83,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,General,11111,kang_test,特記事項テストです。,003,マウス,100,個,100000,JP 免税 0%,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_84,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,General,11111,kang_test,特記事項テストです。,004,キーボード,100,個,100000,JP 非課税 0%,アップロードテスト
2021-06-15,UT_TEST_INVOICE_3_85,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/18,test112,testsiten,testbank,General,11111,kim_test,特記事項テストです。,001,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_3_86,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/19,test113,testsiten,testbank,General,11111,kim_test,特記事項テストです。,002,ノートパソコン,100,個,100000,JP 消費税(軽減税率) 8%,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_87,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,General,11111,kang_test,特記事項テストです。,001,ST001S,100,個,100000,JP 消費税(軽減税率) 8%,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_88,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,General,11111,kang_test,特記事項テストです。,002,ST002M,100,個,100000,JP 不課税 0%,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_89,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,General,11111,kang_test,特記事項テストです。,003,マウス,100,個,100000,JP 免税 0%,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_90,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,General,11111,kang_test,特記事項テストです。,004,キーボード,100,個,100000,JP 非課税 0%,アップロードテスト
2021-06-15,UT_TEST_INVOICE_3_91,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/18,test112,testsiten,testbank,General,11111,kim_test,特記事項テストです。,001,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_3_92,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/19,test113,testsiten,testbank,General,11111,kim_test,特記事項テストです。,002,ノートパソコン,100,個,100000,JP 消費税(軽減税率) 8%,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_93,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,General,11111,kang_test,特記事項テストです。,001,ST001S,100,個,100000,JP 消費税(軽減税率) 8%,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_94,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,General,11111,kang_test,特記事項テストです。,002,ST002M,100,個,100000,JP 不課税 0%,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_95,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,General,11111,kang_test,特記事項テストです。,003,マウス,100,個,100000,JP 免税 0%,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_96,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,General,11111,kang_test,特記事項テストです。,004,キーボード,100,個,100000,JP 非課税 0%,アップロードテスト
2021-06-15,UT_TEST_INVOICE_3_97,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/18,test112,testsiten,testbank,General,11111,kim_test,特記事項テストです。,001,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_3_98,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/19,test113,testsiten,testbank,General,11111,kim_test,特記事項テストです。,002,ノートパソコン,100,個,100000,JP 消費税(軽減税率) 8%,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_99,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,General,11111,kang_test,特記事項テストです。,001,ST001S,100,個,100000,JP 消費税(軽減税率) 8%,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_100,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,General,11111,kang_test,特記事項テストです。,002,ST002M,100,個,100000,JP 不課税 0%,アップロードテスト
2021-06-14,UT_TEST_INVOICE_3_101,3cfebb4f-2338-4dc7-9523-5423a027a880,2021/3/31,2021/3/17,test111,testsiten,testbank,General,11111,kang_test,特記事項テストです。,002,ST002M,100,個,100000,JP 不課税 0%,アップロードテスト`
  ).toString('base64')

  // 明細書：200件
  const fileData200 = Buffer.from(
    `発行日,請求書番号,テナントID,支払期日,納品日,備考,銀行名,支店名,科目,口座番号,口座名義,その他特異事項,明細-項目ID,明細-内容,明細-数量,明細-単位,明細-単価,明細-税,明細-備考
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11111,kim_test,200件テストです。,001,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11112,kim_test,200件テストです。,002,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11113,kim_test,200件テストです。,003,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11114,kim_test,200件テストです。,004,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11115,kim_test,200件テストです。,005,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11116,kim_test,200件テストです。,006,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11117,kim_test,200件テストです。,007,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11118,kim_test,200件テストです。,008,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11119,kim_test,200件テストです。,009,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11120,kim_test,200件テストです。,010,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11121,kim_test,200件テストです。,011,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11122,kim_test,200件テストです。,012,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11123,kim_test,200件テストです。,013,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11124,kim_test,200件テストです。,014,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11125,kim_test,200件テストです。,015,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11126,kim_test,200件テストです。,016,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11127,kim_test,200件テストです。,017,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11128,kim_test,200件テストです。,018,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11129,kim_test,200件テストです。,019,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11130,kim_test,200件テストです。,020,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11131,kim_test,200件テストです。,021,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11132,kim_test,200件テストです。,022,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11133,kim_test,200件テストです。,023,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11134,kim_test,200件テストです。,024,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11135,kim_test,200件テストです。,025,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11136,kim_test,200件テストです。,026,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11137,kim_test,200件テストです。,027,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11138,kim_test,200件テストです。,028,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11139,kim_test,200件テストです。,029,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11140,kim_test,200件テストです。,030,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11141,kim_test,200件テストです。,031,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11142,kim_test,200件テストです。,032,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11143,kim_test,200件テストです。,033,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11144,kim_test,200件テストです。,034,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11145,kim_test,200件テストです。,035,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11146,kim_test,200件テストです。,036,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11147,kim_test,200件テストです。,037,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11148,kim_test,200件テストです。,038,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11149,kim_test,200件テストです。,039,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11150,kim_test,200件テストです。,040,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11151,kim_test,200件テストです。,041,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11152,kim_test,200件テストです。,042,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11153,kim_test,200件テストです。,043,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11154,kim_test,200件テストです。,044,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11155,kim_test,200件テストです。,045,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11156,kim_test,200件テストです。,046,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11157,kim_test,200件テストです。,047,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11158,kim_test,200件テストです。,048,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11159,kim_test,200件テストです。,049,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11160,kim_test,200件テストです。,050,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11161,kim_test,200件テストです。,051,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11162,kim_test,200件テストです。,052,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11163,kim_test,200件テストです。,053,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11164,kim_test,200件テストです。,054,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11165,kim_test,200件テストです。,055,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11166,kim_test,200件テストです。,056,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11167,kim_test,200件テストです。,057,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11168,kim_test,200件テストです。,058,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11169,kim_test,200件テストです。,059,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11170,kim_test,200件テストです。,060,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11171,kim_test,200件テストです。,061,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11172,kim_test,200件テストです。,062,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11173,kim_test,200件テストです。,063,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11174,kim_test,200件テストです。,064,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11175,kim_test,200件テストです。,065,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11176,kim_test,200件テストです。,066,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11177,kim_test,200件テストです。,067,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11178,kim_test,200件テストです。,068,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11179,kim_test,200件テストです。,069,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11180,kim_test,200件テストです。,070,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11181,kim_test,200件テストです。,071,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11182,kim_test,200件テストです。,072,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11183,kim_test,200件テストです。,073,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11184,kim_test,200件テストです。,074,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11185,kim_test,200件テストです。,075,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11186,kim_test,200件テストです。,076,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11187,kim_test,200件テストです。,077,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11188,kim_test,200件テストです。,078,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11189,kim_test,200件テストです。,079,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11190,kim_test,200件テストです。,080,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11191,kim_test,200件テストです。,081,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11192,kim_test,200件テストです。,082,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11193,kim_test,200件テストです。,083,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11194,kim_test,200件テストです。,084,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11195,kim_test,200件テストです。,085,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11196,kim_test,200件テストです。,086,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11197,kim_test,200件テストです。,087,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11198,kim_test,200件テストです。,088,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11199,kim_test,200件テストです。,089,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11200,kim_test,200件テストです。,090,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11201,kim_test,200件テストです。,091,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11202,kim_test,200件テストです。,092,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11203,kim_test,200件テストです。,093,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11204,kim_test,200件テストです。,094,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11205,kim_test,200件テストです。,095,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11206,kim_test,200件テストです。,096,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11207,kim_test,200件テストです。,097,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11208,kim_test,200件テストです。,098,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11209,kim_test,200件テストです。,099,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11210,kim_test,200件テストです。,100,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11211,kim_test,200件テストです。,101,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11212,kim_test,200件テストです。,102,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11213,kim_test,200件テストです。,103,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11214,kim_test,200件テストです。,104,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11215,kim_test,200件テストです。,105,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11216,kim_test,200件テストです。,106,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11217,kim_test,200件テストです。,107,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11218,kim_test,200件テストです。,108,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11219,kim_test,200件テストです。,109,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11220,kim_test,200件テストです。,110,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11221,kim_test,200件テストです。,111,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11222,kim_test,200件テストです。,112,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11223,kim_test,200件テストです。,113,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11224,kim_test,200件テストです。,114,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11225,kim_test,200件テストです。,115,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11226,kim_test,200件テストです。,116,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11227,kim_test,200件テストです。,117,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11228,kim_test,200件テストです。,118,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11229,kim_test,200件テストです。,119,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11230,kim_test,200件テストです。,120,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11231,kim_test,200件テストです。,121,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11232,kim_test,200件テストです。,122,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11233,kim_test,200件テストです。,123,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11234,kim_test,200件テストです。,124,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11235,kim_test,200件テストです。,125,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11236,kim_test,200件テストです。,126,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11237,kim_test,200件テストです。,127,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11238,kim_test,200件テストです。,128,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11239,kim_test,200件テストです。,129,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11240,kim_test,200件テストです。,130,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11241,kim_test,200件テストです。,131,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11242,kim_test,200件テストです。,132,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11243,kim_test,200件テストです。,133,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11244,kim_test,200件テストです。,134,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11245,kim_test,200件テストです。,135,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11246,kim_test,200件テストです。,136,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11247,kim_test,200件テストです。,137,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11248,kim_test,200件テストです。,138,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11249,kim_test,200件テストです。,139,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11250,kim_test,200件テストです。,140,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11251,kim_test,200件テストです。,141,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11252,kim_test,200件テストです。,142,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11253,kim_test,200件テストです。,143,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11254,kim_test,200件テストです。,144,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11255,kim_test,200件テストです。,145,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11256,kim_test,200件テストです。,146,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11257,kim_test,200件テストです。,147,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11258,kim_test,200件テストです。,148,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11259,kim_test,200件テストです。,149,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11260,kim_test,200件テストです。,150,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11261,kim_test,200件テストです。,151,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11262,kim_test,200件テストです。,152,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11263,kim_test,200件テストです。,153,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11264,kim_test,200件テストです。,154,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11265,kim_test,200件テストです。,155,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11266,kim_test,200件テストです。,156,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11267,kim_test,200件テストです。,157,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11268,kim_test,200件テストです。,158,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11269,kim_test,200件テストです。,159,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11270,kim_test,200件テストです。,160,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11271,kim_test,200件テストです。,161,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11272,kim_test,200件テストです。,162,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11273,kim_test,200件テストです。,163,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11274,kim_test,200件テストです。,164,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11275,kim_test,200件テストです。,165,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11276,kim_test,200件テストです。,166,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11277,kim_test,200件テストです。,167,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11278,kim_test,200件テストです。,168,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11279,kim_test,200件テストです。,169,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11280,kim_test,200件テストです。,170,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11281,kim_test,200件テストです。,171,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11282,kim_test,200件テストです。,172,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11283,kim_test,200件テストです。,173,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11284,kim_test,200件テストです。,174,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11285,kim_test,200件テストです。,175,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11286,kim_test,200件テストです。,176,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11287,kim_test,200件テストです。,177,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11288,kim_test,200件テストです。,178,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11289,kim_test,200件テストです。,179,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11290,kim_test,200件テストです。,180,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11291,kim_test,200件テストです。,181,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11292,kim_test,200件テストです。,182,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11293,kim_test,200件テストです。,183,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11294,kim_test,200件テストです。,184,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11295,kim_test,200件テストです。,185,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11296,kim_test,200件テストです。,186,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11297,kim_test,200件テストです。,187,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11298,kim_test,200件テストです。,188,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11299,kim_test,200件テストです。,189,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11300,kim_test,200件テストです。,190,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11301,kim_test,200件テストです。,191,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11302,kim_test,200件テストです。,192,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11303,kim_test,200件テストです。,193,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11304,kim_test,200件テストです。,194,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11305,kim_test,200件テストです。,195,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11306,kim_test,200件テストです。,196,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11307,kim_test,200件テストです。,197,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11308,kim_test,200件テストです。,198,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11309,kim_test,200件テストです。,199,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11310,kim_test,200件テストです。,200,PC,100,個,100000,消費税,アップロードテスト`
  ).toString('base64')

  // 明細書：201件
  const fileData201 = Buffer.from(
    `発行日,請求書番号,テナントID,支払期日,納品日,備考,銀行名,支店名,科目,口座番号,口座名義,その他特異事項,明細-項目ID,明細-内容,明細-数量,明細-単位,明細-単価,明細-税,明細-備考
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11111,kim_test,200件テストです。,001,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11112,kim_test,200件テストです。,002,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11113,kim_test,200件テストです。,003,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11114,kim_test,200件テストです。,004,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11115,kim_test,200件テストです。,005,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11116,kim_test,200件テストです。,006,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11117,kim_test,200件テストです。,007,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11118,kim_test,200件テストです。,008,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11119,kim_test,200件テストです。,009,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11120,kim_test,200件テストです。,010,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11121,kim_test,200件テストです。,011,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11122,kim_test,200件テストです。,012,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11123,kim_test,200件テストです。,013,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11124,kim_test,200件テストです。,014,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11125,kim_test,200件テストです。,015,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11126,kim_test,200件テストです。,016,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11127,kim_test,200件テストです。,017,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11128,kim_test,200件テストです。,018,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11129,kim_test,200件テストです。,019,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11130,kim_test,200件テストです。,020,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11131,kim_test,200件テストです。,021,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11132,kim_test,200件テストです。,022,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11133,kim_test,200件テストです。,023,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11134,kim_test,200件テストです。,024,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11135,kim_test,200件テストです。,025,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11136,kim_test,200件テストです。,026,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11137,kim_test,200件テストです。,027,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11138,kim_test,200件テストです。,028,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11139,kim_test,200件テストです。,029,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11140,kim_test,200件テストです。,030,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11141,kim_test,200件テストです。,031,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11142,kim_test,200件テストです。,032,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11143,kim_test,200件テストです。,033,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11144,kim_test,200件テストです。,034,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11145,kim_test,200件テストです。,035,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11146,kim_test,200件テストです。,036,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11147,kim_test,200件テストです。,037,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11148,kim_test,200件テストです。,038,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11149,kim_test,200件テストです。,039,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11150,kim_test,200件テストです。,040,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11151,kim_test,200件テストです。,041,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11152,kim_test,200件テストです。,042,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11153,kim_test,200件テストです。,043,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11154,kim_test,200件テストです。,044,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11155,kim_test,200件テストです。,045,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11156,kim_test,200件テストです。,046,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11157,kim_test,200件テストです。,047,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11158,kim_test,200件テストです。,048,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11159,kim_test,200件テストです。,049,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11160,kim_test,200件テストです。,050,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11161,kim_test,200件テストです。,051,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11162,kim_test,200件テストです。,052,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11163,kim_test,200件テストです。,053,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11164,kim_test,200件テストです。,054,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11165,kim_test,200件テストです。,055,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11166,kim_test,200件テストです。,056,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11167,kim_test,200件テストです。,057,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11168,kim_test,200件テストです。,058,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11169,kim_test,200件テストです。,059,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11170,kim_test,200件テストです。,060,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11171,kim_test,200件テストです。,061,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11172,kim_test,200件テストです。,062,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11173,kim_test,200件テストです。,063,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11174,kim_test,200件テストです。,064,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11175,kim_test,200件テストです。,065,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11176,kim_test,200件テストです。,066,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11177,kim_test,200件テストです。,067,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11178,kim_test,200件テストです。,068,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11179,kim_test,200件テストです。,069,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11180,kim_test,200件テストです。,070,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11181,kim_test,200件テストです。,071,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11182,kim_test,200件テストです。,072,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11183,kim_test,200件テストです。,073,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11184,kim_test,200件テストです。,074,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11185,kim_test,200件テストです。,075,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11186,kim_test,200件テストです。,076,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11187,kim_test,200件テストです。,077,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11188,kim_test,200件テストです。,078,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11189,kim_test,200件テストです。,079,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11190,kim_test,200件テストです。,080,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11191,kim_test,200件テストです。,081,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11192,kim_test,200件テストです。,082,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11193,kim_test,200件テストです。,083,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11194,kim_test,200件テストです。,084,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11195,kim_test,200件テストです。,085,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11196,kim_test,200件テストです。,086,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11197,kim_test,200件テストです。,087,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11198,kim_test,200件テストです。,088,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11199,kim_test,200件テストです。,089,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11200,kim_test,200件テストです。,090,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11201,kim_test,200件テストです。,091,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11202,kim_test,200件テストです。,092,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11203,kim_test,200件テストです。,093,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11204,kim_test,200件テストです。,094,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11205,kim_test,200件テストです。,095,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11206,kim_test,200件テストです。,096,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11207,kim_test,200件テストです。,097,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11208,kim_test,200件テストです。,098,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11209,kim_test,200件テストです。,099,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11210,kim_test,200件テストです。,100,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11211,kim_test,200件テストです。,101,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11212,kim_test,200件テストです。,102,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11213,kim_test,200件テストです。,103,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11214,kim_test,200件テストです。,104,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11215,kim_test,200件テストです。,105,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11216,kim_test,200件テストです。,106,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11217,kim_test,200件テストです。,107,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11218,kim_test,200件テストです。,108,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11219,kim_test,200件テストです。,109,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11220,kim_test,200件テストです。,110,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11221,kim_test,200件テストです。,111,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11222,kim_test,200件テストです。,112,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11223,kim_test,200件テストです。,113,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11224,kim_test,200件テストです。,114,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11225,kim_test,200件テストです。,115,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11226,kim_test,200件テストです。,116,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11227,kim_test,200件テストです。,117,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11228,kim_test,200件テストです。,118,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11229,kim_test,200件テストです。,119,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11230,kim_test,200件テストです。,120,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11231,kim_test,200件テストです。,121,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11232,kim_test,200件テストです。,122,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11233,kim_test,200件テストです。,123,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11234,kim_test,200件テストです。,124,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11235,kim_test,200件テストです。,125,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11236,kim_test,200件テストです。,126,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11237,kim_test,200件テストです。,127,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11238,kim_test,200件テストです。,128,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11239,kim_test,200件テストです。,129,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11240,kim_test,200件テストです。,130,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11241,kim_test,200件テストです。,131,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11242,kim_test,200件テストです。,132,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11243,kim_test,200件テストです。,133,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11244,kim_test,200件テストです。,134,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11245,kim_test,200件テストです。,135,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11246,kim_test,200件テストです。,136,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11247,kim_test,200件テストです。,137,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11248,kim_test,200件テストです。,138,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11249,kim_test,200件テストです。,139,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11250,kim_test,200件テストです。,140,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11251,kim_test,200件テストです。,141,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11252,kim_test,200件テストです。,142,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11253,kim_test,200件テストです。,143,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11254,kim_test,200件テストです。,144,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11255,kim_test,200件テストです。,145,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11256,kim_test,200件テストです。,146,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11257,kim_test,200件テストです。,147,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11258,kim_test,200件テストです。,148,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11259,kim_test,200件テストです。,149,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11260,kim_test,200件テストです。,150,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11261,kim_test,200件テストです。,151,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11262,kim_test,200件テストです。,152,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11263,kim_test,200件テストです。,153,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11264,kim_test,200件テストです。,154,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11265,kim_test,200件テストです。,155,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11266,kim_test,200件テストです。,156,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11267,kim_test,200件テストです。,157,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11268,kim_test,200件テストです。,158,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11269,kim_test,200件テストです。,159,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11270,kim_test,200件テストです。,160,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11271,kim_test,200件テストです。,161,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11272,kim_test,200件テストです。,162,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11273,kim_test,200件テストです。,163,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11274,kim_test,200件テストです。,164,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11275,kim_test,200件テストです。,165,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11276,kim_test,200件テストです。,166,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11277,kim_test,200件テストです。,167,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11278,kim_test,200件テストです。,168,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11279,kim_test,200件テストです。,169,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11280,kim_test,200件テストです。,170,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11281,kim_test,200件テストです。,171,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11282,kim_test,200件テストです。,172,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11283,kim_test,200件テストです。,173,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11284,kim_test,200件テストです。,174,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11285,kim_test,200件テストです。,175,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11286,kim_test,200件テストです。,176,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11287,kim_test,200件テストです。,177,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11288,kim_test,200件テストです。,178,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11289,kim_test,200件テストです。,179,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11290,kim_test,200件テストです。,180,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11291,kim_test,200件テストです。,181,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11292,kim_test,200件テストです。,182,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11293,kim_test,200件テストです。,183,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11294,kim_test,200件テストです。,184,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11295,kim_test,200件テストです。,185,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11296,kim_test,200件テストです。,186,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11297,kim_test,200件テストです。,187,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11298,kim_test,200件テストです。,188,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11299,kim_test,200件テストです。,189,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11300,kim_test,200件テストです。,190,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11301,kim_test,200件テストです。,191,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11302,kim_test,200件テストです。,192,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11303,kim_test,200件テストです。,193,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11304,kim_test,200件テストです。,194,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11305,kim_test,200件テストです。,195,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11306,kim_test,200件テストです。,196,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11307,kim_test,200件テストです。,197,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11308,kim_test,200件テストです。,198,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11309,kim_test,200件テストです。,199,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11310,kim_test,200件テストです。,200,PC,100,個,100000,消費税,アップロードテスト
2021-06-15,UT_TEST_INVOICE_4_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test201,testsiten,testbank,General,11310,kim_test,201件テストです。,201,PC,100,個,100000,消費税,アップロードテスト`
  ).toString('base64')

  const fileDataInvoiceIDlessthanequal101 = Buffer.from(
    `発行日,請求書番号,テナントID,支払期日,納品日,備考,銀行名,支店名,科目,口座番号,口座名義,その他特異事項,明細-項目ID,明細-内容,明細-数量,明細-単位,明細-単価,明細-税,明細-備考
2021-06-15,UT_TEST_INVOICE_5_10000000000000000000000000000000000000000000000000000000000000000000000000000000001,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11111,kim_test,200件テストです。,001,PC,100,個,100000,消費税,アップロードテスト`
  ).toString('base64')

  const fileDataBankNamelessthanequal101 = Buffer.from(
    `発行日,請求書番号,テナントID,支払期日,納品日,備考,銀行名,支店名,科目,口座番号,口座名義,その他特異事項,明細-項目ID,明細-内容,明細-数量,明細-単位,明細-単価,明細-税,明細-備考
2021-06-15,UT_TEST_INVOICE_6_2,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,BANK1000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001,General,11111,kim_test,200件テストです。,001,PC,100,個,100000,消費税,アップロードテスト`
  ).toString('base64')

  const fileDataIssueDateleap = Buffer.from(
    `発行日,請求書番号,テナントID,支払期日,納品日,備考,銀行名,支店名,科目,口座番号,口座名義,その他特異事項,明細-項目ID,明細-内容,明細-数量,明細-単位,明細-単価,明細-税,明細-備考
2021-02-29,UT_TEST_INVOICE_7_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11111,kim_test,200件テストです。,001,PC,100,個,100000,消費税,アップロードテスト`
  ).toString('base64')

  const fileDataIssueDateTypeErr = Buffer.from(
    `発行日,請求書番号,テナントID,支払期日,納品日,備考,銀行名,支店名,科目,口座番号,口座名義,その他特異事項,明細-項目ID,明細-内容,明細-数量,明細-単位,明細-単価,明細-税,明細-備考
20210229,UT_TEST_INVOICE_8_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11111,kim_test,200件テストです。,001,PC,100,個,100000,消費税,アップロードテスト`
  ).toString('base64')

  const fileDataTenantTypeErr = Buffer.from(
    `発行日,請求書番号,テナントID,支払期日,納品日,備考,銀行名,支店名,科目,口座番号,口座名義,その他特異事項,明細-項目ID,明細-内容,明細-数量,明細-単位,明細-単価,明細-税,明細-備考
2021-08-20,UT_TEST_INVOICE_9_1,test,2021-08-16,2021-08-16,PBI318_手動試験,手動銀行,手動支店,General,1234567,手動,請求書一括作成_1.csv,1,明細,1,個,100000,消費税,PBI318_手動試験`
  ).toString('base64')

  const fileDataSellersItemNumlessthanequa101 = Buffer.from(
    `発行日,請求書番号,テナントID,支払期日,納品日,備考,銀行名,支店名,科目,口座番号,口座名義,その他特異事項,明細-項目ID,明細-内容,明細-数量,明細-単位,明細-単価,明細-税,明細-備考
2021-06-15,UT_TEST_INVOICE_10_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11111,kim_test,200件テストです。,SELLERSITEMNUM_00000000000000000000000000000000000000000000000000000000000000000000000000000000000001,PC,100,個,100000,消費税,アップロードテスト`
  ).toString('base64')

  const fileDataItemNamelessthanequa101 = Buffer.from(
    `発行日,請求書番号,テナントID,支払期日,納品日,備考,銀行名,支店名,科目,口座番号,口座名義,その他特異事項,明細-項目ID,明細-内容,明細-数量,明細-単位,明細-単価,明細-税,明細-備考
2021-06-15,UT_TEST_INVOICE_11_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11111,kim_test,200件テストです。,001,ITEMNAME_00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001,100,個,100000,消費税,アップロードテスト`
  ).toString('base64')

  const fileDataQuantityValuelessthanequa1000000000001 = Buffer.from(
    `発行日,請求書番号,テナントID,支払期日,納品日,備考,銀行名,支店名,科目,口座番号,口座名義,その他特異事項,明細-項目ID,明細-内容,明細-数量,明細-単位,明細-単価,明細-税,明細-備考
2021-06-15,UT_TEST_INVOICE_12_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11111,kim_test,200件テストです。,001,PC,1000000000001,個,100000,消費税,アップロードテスト`
  ).toString('base64')

  const fileDataPriceValuelessthanequa1000000000001 = Buffer.from(
    `発行日,請求書番号,テナントID,支払期日,納品日,備考,銀行名,支店名,科目,口座番号,口座名義,その他特異事項,明細-項目ID,明細-内容,明細-数量,明細-単位,明細-単価,明細-税,明細-備考
2021-06-15,UT_TEST_INVOICE_13_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test200,testsiten,testbank,General,11111,kim_test,200件テストです。,001,PC,100,個,1000000000001,消費税,アップロードテスト`
  ).toString('base64')

  const unitcodeData = Buffer.from(
    `発行日,請求書番号,テナントID,支払期日,納品日,備考,銀行名,支店名,科目,口座番号,口座名義,その他特記事項,明細-項目ID,明細-内容,明細-数量,明細-単位,明細-単価,明細-税,明細-備考
2021-08-12,単位テスト1,927635b5-f469-493b-9ce0-b2bfc4062959,2021-06-30,2021-06-30,test222,testsiten,testbank,General,22222,test1,特記事項テスト1です。,001,PC,100,人月,100000,消費税,アップロードテスト1
2021-08-12,単位テスト2,927635b5-f469-493b-9ce0-b2bfc4062959,2021-06-30,2021-06-30,test222,testsiten,testbank,General,22222,test1,特記事項テスト1です。,001,PC,100,ボトル,100000,軽減税率,アップロードテスト1
2021-08-12,単位テスト3,927635b5-f469-493b-9ce0-b2bfc4062959,2021-06-30,2021-06-30,test222,testsiten,testbank,General,22222,test1,特記事項テスト1です。,001,PC,100,コスト,100000,不課税,アップロードテスト1
2021-08-12,単位テスト4,927635b5-f469-493b-9ce0-b2bfc4062959,2021-06-30,2021-06-30,test222,testsiten,testbank,General,22222,test1,特記事項テスト1です。,001,PC,100,コンテナ,100000,免税,アップロードテスト1
2021-08-12,単位テスト5,927635b5-f469-493b-9ce0-b2bfc4062959,2021-06-30,2021-06-30,test222,testsiten,testbank,General,22222,test1,特記事項テスト1です。,001,PC,100,センチリットル,100000,非課税,アップロードテスト1
2021-08-12,単位テスト6,927635b5-f469-493b-9ce0-b2bfc4062959,2021-06-30,2021-06-30,test222,testsiten,testbank,General,22222,test1,特記事項テスト1です。,001,PC,100,平方センチメートル,100000,消費税,アップロードテスト1
2021-08-12,単位テスト7,927635b5-f469-493b-9ce0-b2bfc4062959,2021-06-30,2021-06-30,test222,testsiten,testbank,General,22222,test1,特記事項テスト1です。,001,PC,100,立方センチメートル,100000,軽減税率,アップロードテスト1
2021-08-12,単位テスト8,927635b5-f469-493b-9ce0-b2bfc4062959,2021-06-30,2021-06-30,test222,testsiten,testbank,General,22222,test1,特記事項テスト1です。,001,PC,100,センチメートル,100000,不課税,アップロードテスト1
2021-08-12,単位テスト9,927635b5-f469-493b-9ce0-b2bfc4062959,2021-06-30,2021-06-30,test222,testsiten,testbank,General,22222,test1,特記事項テスト1です。,001,PC,100,ケース,100000,免税,アップロードテスト1
2021-08-12,単位テスト10,927635b5-f469-493b-9ce0-b2bfc4062959,2021-06-30,2021-06-30,test222,testsiten,testbank,General,22222,test1,特記事項テスト1です。,001,PC,100,カートン,100000,非課税,アップロードテスト1
2021-08-12,単位テスト11,927635b5-f469-493b-9ce0-b2bfc4062959,2021-06-30,2021-06-30,test222,testsiten,testbank,General,22222,test1,特記事項テスト1です。,001,PC,100,日,100000,消費税,アップロードテスト1
2021-08-12,単位テスト12,927635b5-f469-493b-9ce0-b2bfc4062959,2021-06-30,2021-06-30,test222,testsiten,testbank,General,22222,test1,特記事項テスト1です。,001,PC,100,デシリットル,100000,軽減税率,アップロードテスト1
2021-08-12,単位テスト13,927635b5-f469-493b-9ce0-b2bfc4062959,2021-06-30,2021-06-30,test222,testsiten,testbank,General,22222,test1,特記事項テスト1です。,001,PC,100,デシメートル,100000,不課税,アップロードテスト1
2021-08-12,単位テスト14,927635b5-f469-493b-9ce0-b2bfc4062959,2021-06-30,2021-06-30,test222,testsiten,testbank,General,22222,test1,特記事項テスト1です。,001,PC,100,グロス・キログラム,100000,免税,アップロードテスト1
2021-08-12,単位テスト15,927635b5-f469-493b-9ce0-b2bfc4062959,2021-06-30,2021-06-30,test222,testsiten,testbank,General,22222,test1,特記事項テスト1です。,001,PC,100,個,100000,非課税,アップロードテスト1
2021-08-12,単位テスト16,927635b5-f469-493b-9ce0-b2bfc4062959,2021-06-30,2021-06-30,test222,testsiten,testbank,General,22222,test1,特記事項テスト1です。,001,PC,100,フィート,100000,消費税,アップロードテスト1
2021-08-12,単位テスト17,927635b5-f469-493b-9ce0-b2bfc4062959,2021-06-30,2021-06-30,test222,testsiten,testbank,General,22222,test1,特記事項テスト1です。,001,PC,100,ガロン,100000,軽減税率,アップロードテスト1
2021-08-12,単位テスト18,927635b5-f469-493b-9ce0-b2bfc4062959,2021-06-30,2021-06-30,test222,testsiten,testbank,General,22222,test1,特記事項テスト1です。,001,PC,100,グラム,100000,不課税,アップロードテスト1
2021-08-12,単位テスト19,927635b5-f469-493b-9ce0-b2bfc4062959,2021-06-30,2021-06-30,test222,testsiten,testbank,General,22222,test1,特記事項テスト1です。,001,PC,100,総トン,100000,免税,アップロードテスト1
2021-08-12,単位テスト20,927635b5-f469-493b-9ce0-b2bfc4062959,2021-06-30,2021-06-30,test222,testsiten,testbank,General,22222,test1,特記事項テスト1です。,001,PC,100,時間,100000,非課税,アップロードテスト1
2021-08-12,単位テスト21,927635b5-f469-493b-9ce0-b2bfc4062959,2021-06-30,2021-06-30,test222,testsiten,testbank,General,22222,test1,特記事項テスト1です。,001,PC,100,キログラム,100000,消費税,アップロードテスト1
2021-08-12,単位テスト22,927635b5-f469-493b-9ce0-b2bfc4062959,2021-06-30,2021-06-30,test222,testsiten,testbank,General,22222,test1,特記事項テスト1です。,001,PC,100,キロメートル,100000,軽減税率,アップロードテスト1
2021-08-12,単位テスト23,927635b5-f469-493b-9ce0-b2bfc4062959,2021-06-30,2021-06-30,test222,testsiten,testbank,General,22222,test1,特記事項テスト1です。,001,PC,100,キロワット時,100000,不課税,アップロードテスト1
2021-08-12,単位テスト24,927635b5-f469-493b-9ce0-b2bfc4062959,2021-06-30,2021-06-30,test222,testsiten,testbank,General,22222,test1,特記事項テスト1です。,001,PC,100,ポンド,100000,免税,アップロードテスト1
2021-08-12,単位テスト25,927635b5-f469-493b-9ce0-b2bfc4062959,2021-06-30,2021-06-30,test222,testsiten,testbank,General,22222,test1,特記事項テスト1です。,001,PC,100,リットル,100000,非課税,アップロードテスト1
2021-08-12,単位テスト26,927635b5-f469-493b-9ce0-b2bfc4062959,2021-06-30,2021-06-30,test222,testsiten,testbank,General,22222,test1,特記事項テスト1です。,001,PC,100,ミリグラム,100000,消費税,アップロードテスト1
2021-08-12,単位テスト27,927635b5-f469-493b-9ce0-b2bfc4062959,2021-06-30,2021-06-30,test222,testsiten,testbank,General,22222,test1,特記事項テスト1です。,001,PC,100,ミリリットル,100000,軽減税率,アップロードテスト1
2021-08-12,単位テスト28,927635b5-f469-493b-9ce0-b2bfc4062959,2021-06-30,2021-06-30,test222,testsiten,testbank,General,22222,test1,特記事項テスト1です。,001,PC,100,ミリメートル,100000,不課税,アップロードテスト1
2021-08-12,単位テスト29,927635b5-f469-493b-9ce0-b2bfc4062959,2021-06-30,2021-06-30,test222,testsiten,testbank,General,22222,test1,特記事項テスト1です。,001,PC,100,月,100000,免税,アップロードテスト1
2021-08-12,単位テスト30,927635b5-f469-493b-9ce0-b2bfc4062959,2021-06-30,2021-06-30,test222,testsiten,testbank,General,22222,test1,特記事項テスト1です。,001,PC,100,平方メートル,100000,非課税,アップロードテスト1
2021-08-12,単位テスト31,927635b5-f469-493b-9ce0-b2bfc4062959,2021-06-30,2021-06-30,test222,testsiten,testbank,General,22222,test1,特記事項テスト1です。,001,PC,100,立方メートル,100000,消費税,アップロードテスト1
2021-08-12,単位テスト32,927635b5-f469-493b-9ce0-b2bfc4062959,2021-06-30,2021-06-30,test222,testsiten,testbank,General,22222,test1,特記事項テスト1です。,001,PC,100,メーター,100000,軽減税率,アップロードテスト1
2021-08-12,単位テスト33,927635b5-f469-493b-9ce0-b2bfc4062959,2021-06-30,2021-06-30,test222,testsiten,testbank,General,22222,test1,特記事項テスト1です。,001,PC,100,純トン,100000,不課税,アップロードテスト1
2021-08-12,単位テスト34,927635b5-f469-493b-9ce0-b2bfc4062959,2021-06-30,2021-06-30,test222,testsiten,testbank,General,22222,test1,特記事項テスト1です。,001,PC,100,包,100000,免税,アップロードテスト1
2021-08-12,単位テスト35,927635b5-f469-493b-9ce0-b2bfc4062959,2021-06-30,2021-06-30,test222,testsiten,testbank,General,22222,test1,特記事項テスト1です。,001,PC,100,巻,100000,非課税,アップロードテスト1
2021-08-12,単位テスト36,927635b5-f469-493b-9ce0-b2bfc4062959,2021-06-30,2021-06-30,test222,testsiten,testbank,General,22222,test1,特記事項テスト1です。,001,PC,100,式,100000,消費税,アップロードテスト1
2021-08-12,単位テスト37,927635b5-f469-493b-9ce0-b2bfc4062959,2021-06-30,2021-06-30,test222,testsiten,testbank,General,22222,test1,特記事項テスト1です。,001,PC,100,トン,100000,軽減税率,アップロードテスト1
2021-08-12,単位テスト38,927635b5-f469-493b-9ce0-b2bfc4062959,2021-06-30,2021-06-30,test222,testsiten,testbank,General,22222,test1,特記事項テスト1です。,001,PC,100,その他,100000,不課税,アップロードテスト1
2021-08-12,単位テスト101,927635b5-f469-493b-9ce0-b2bfc4062959,2021-06-30,2021-06-30,test222,testsiten,testbank,General,22222,test1,特記事項テスト1です。,001,PC,100,人月1,100000,消費税,アップロードテスト1
2021-08-12,単位テスト102,927635b5-f469-493b-9ce0-b2bfc4062959,2021-06-30,2021-06-30,test222,testsiten,testbank,General,22222,test1,特記事項テスト1です。,001,PC,100,ボトル1,100000,軽減税率,アップロードテスト1
2021-08-12,単位テスト103,927635b5-f469-493b-9ce0-b2bfc4062959,2021-06-30,2021-06-30,test222,testsiten,testbank,General,22222,test1,特記事項テスト1です。,001,PC,100,コスト1,100000,不課税,アップロードテスト1
2021-08-12,単位テスト104,927635b5-f469-493b-9ce0-b2bfc4062959,2021-06-30,2021-06-30,test222,testsiten,testbank,General,22222,test1,特記事項テスト1です。,001,PC,100,コンテナ1,100000,免税,アップロードテスト1
2021-08-12,単位テスト105,927635b5-f469-493b-9ce0-b2bfc4062959,2021-06-30,2021-06-30,test222,testsiten,testbank,General,22222,test1,特記事項テスト1です。,001,PC,100,センチリットル1,100000,非課税,アップロードテスト1
2021-08-12,単位テスト106,927635b5-f469-493b-9ce0-b2bfc4062959,2021-06-30,2021-06-30,test222,testsiten,testbank,General,22222,test1,特記事項テスト1です。,001,PC,100,平方センチメートル1,100000,消費税,アップロードテスト1
2021-08-12,単位テスト107,927635b5-f469-493b-9ce0-b2bfc4062959,2021-06-30,2021-06-30,test222,testsiten,testbank,General,22222,test1,特記事項テスト1です。,001,PC,100,立方センチメートル1,100000,軽減税率,アップロードテスト1
2021-08-12,単位テスト108,927635b5-f469-493b-9ce0-b2bfc4062959,2021-06-30,2021-06-30,test222,testsiten,testbank,General,22222,test1,特記事項テスト1です。,001,PC,100,センチメートル1,100000,不課税,アップロードテスト1
2021-08-12,単位テスト109,927635b5-f469-493b-9ce0-b2bfc4062959,2021-06-30,2021-06-30,test222,testsiten,testbank,General,22222,test1,特記事項テスト1です。,001,PC,100,ケース1,100000,免税,アップロードテスト1
2021-08-12,単位テスト110,927635b5-f469-493b-9ce0-b2bfc4062959,2021-06-30,2021-06-30,test222,testsiten,testbank,General,22222,test1,特記事項テスト1です。,001,PC,100,カートン1,100000,非課税,アップロードテスト1
2021-08-12,単位テスト111,927635b5-f469-493b-9ce0-b2bfc4062959,2021-06-30,2021-06-30,test222,testsiten,testbank,General,22222,test1,特記事項テスト1です。,001,PC,100,日1,100000,消費税,アップロードテスト1
2021-08-12,単位テスト112,927635b5-f469-493b-9ce0-b2bfc4062959,2021-06-30,2021-06-30,test222,testsiten,testbank,General,22222,test1,特記事項テスト1です。,001,PC,100,デシリットル1,100000,軽減税率,アップロードテスト1
2021-08-12,単位テスト113,927635b5-f469-493b-9ce0-b2bfc4062959,2021-06-30,2021-06-30,test222,testsiten,testbank,General,22222,test1,特記事項テスト1です。,001,PC,100,デシメートル1,100000,不課税,アップロードテスト1
2021-08-12,単位テスト114,927635b5-f469-493b-9ce0-b2bfc4062959,2021-06-30,2021-06-30,test222,testsiten,testbank,General,22222,test1,特記事項テスト1です。,001,PC,100,グロス・キログラム1,100000,免税,アップロードテスト1
2021-08-12,単位テスト115,927635b5-f469-493b-9ce0-b2bfc4062959,2021-06-30,2021-06-30,test222,testsiten,testbank,General,22222,test1,特記事項テスト1です。,001,PC,100,個1,100000,非課税,アップロードテスト1
2021-08-12,単位テスト116,927635b5-f469-493b-9ce0-b2bfc4062959,2021-06-30,2021-06-30,test222,testsiten,testbank,General,22222,test1,特記事項テスト1です。,001,PC,100,フィート1,100000,消費税,アップロードテスト1
2021-08-12,単位テスト117,927635b5-f469-493b-9ce0-b2bfc4062959,2021-06-30,2021-06-30,test222,testsiten,testbank,General,22222,test1,特記事項テスト1です。,001,PC,100,ガロン1,100000,軽減税率,アップロードテスト1
2021-08-12,単位テスト118,927635b5-f469-493b-9ce0-b2bfc4062959,2021-06-30,2021-06-30,test222,testsiten,testbank,General,22222,test1,特記事項テスト1です。,001,PC,100,グラム1,100000,不課税,アップロードテスト1
2021-08-12,単位テスト119,927635b5-f469-493b-9ce0-b2bfc4062959,2021-06-30,2021-06-30,test222,testsiten,testbank,General,22222,test1,特記事項テスト1です。,001,PC,100,総トン1,100000,免税,アップロードテスト1
2021-08-12,単位テスト120,927635b5-f469-493b-9ce0-b2bfc4062959,2021-06-30,2021-06-30,test222,testsiten,testbank,General,22222,test1,特記事項テスト1です。,001,PC,100,時間1,100000,非課税,アップロードテスト1
2021-08-12,単位テスト121,927635b5-f469-493b-9ce0-b2bfc4062959,2021-06-30,2021-06-30,test222,testsiten,testbank,General,22222,test1,特記事項テスト1です。,001,PC,100,キログラム1,100000,消費税,アップロードテスト1
2021-08-12,単位テスト122,927635b5-f469-493b-9ce0-b2bfc4062959,2021-06-30,2021-06-30,test222,testsiten,testbank,General,22222,test1,特記事項テスト1です。,001,PC,100,キロメートル1,100000,軽減税率,アップロードテスト1
2021-08-12,単位テスト123,927635b5-f469-493b-9ce0-b2bfc4062959,2021-06-30,2021-06-30,test222,testsiten,testbank,General,22222,test1,特記事項テスト1です。,001,PC,100,キロワット時1,100000,不課税,アップロードテスト1
2021-08-12,単位テスト124,927635b5-f469-493b-9ce0-b2bfc4062959,2021-06-30,2021-06-30,test222,testsiten,testbank,General,22222,test1,特記事項テスト1です。,001,PC,100,ポンド1,100000,免税,アップロードテスト1
2021-08-12,単位テスト125,927635b5-f469-493b-9ce0-b2bfc4062959,2021-06-30,2021-06-30,test222,testsiten,testbank,General,22222,test1,特記事項テスト1です。,001,PC,100,リットル1,100000,非課税,アップロードテスト1
2021-08-12,単位テスト126,927635b5-f469-493b-9ce0-b2bfc4062959,2021-06-30,2021-06-30,test222,testsiten,testbank,General,22222,test1,特記事項テスト1です。,001,PC,100,ミリグラム1,100000,消費税,アップロードテスト1
2021-08-12,単位テスト127,927635b5-f469-493b-9ce0-b2bfc4062959,2021-06-30,2021-06-30,test222,testsiten,testbank,General,22222,test1,特記事項テスト1です。,001,PC,100,ミリリットル1,100000,軽減税率,アップロードテスト1
2021-08-12,単位テスト128,927635b5-f469-493b-9ce0-b2bfc4062959,2021-06-30,2021-06-30,test222,testsiten,testbank,General,22222,test1,特記事項テスト1です。,001,PC,100,ミリメートル1,100000,不課税,アップロードテスト1
2021-08-12,単位テスト129,927635b5-f469-493b-9ce0-b2bfc4062959,2021-06-30,2021-06-30,test222,testsiten,testbank,General,22222,test1,特記事項テスト1です。,001,PC,100,月1,100000,免税,アップロードテスト1
2021-08-12,単位テスト130,927635b5-f469-493b-9ce0-b2bfc4062959,2021-06-30,2021-06-30,test222,testsiten,testbank,General,22222,test1,特記事項テスト1です。,001,PC,100,平方メートル1,100000,非課税,アップロードテスト1
2021-08-12,単位テスト131,927635b5-f469-493b-9ce0-b2bfc4062959,2021-06-30,2021-06-30,test222,testsiten,testbank,General,22222,test1,特記事項テスト1です。,001,PC,100,立方メートル1,100000,消費税,アップロードテスト1
2021-08-12,単位テスト132,927635b5-f469-493b-9ce0-b2bfc4062959,2021-06-30,2021-06-30,test222,testsiten,testbank,General,22222,test1,特記事項テスト1です。,001,PC,100,メーター1,100000,軽減税率,アップロードテスト1
2021-08-12,単位テスト133,927635b5-f469-493b-9ce0-b2bfc4062959,2021-06-30,2021-06-30,test222,testsiten,testbank,General,22222,test1,特記事項テスト1です。,001,PC,100,純トン1,100000,不課税,アップロードテスト1
2021-08-12,単位テスト134,927635b5-f469-493b-9ce0-b2bfc4062959,2021-06-30,2021-06-30,test222,testsiten,testbank,General,22222,test1,特記事項テスト1です。,001,PC,100,包1,100000,免税,アップロードテスト1
2021-08-12,単位テスト135,927635b5-f469-493b-9ce0-b2bfc4062959,2021-06-30,2021-06-30,test222,testsiten,testbank,General,22222,test1,特記事項テスト1です。,001,PC,100,巻1,100000,非課税,アップロードテスト1
2021-08-12,単位テスト136,927635b5-f469-493b-9ce0-b2bfc4062959,2021-06-30,2021-06-30,test222,testsiten,testbank,General,22222,test1,特記事項テスト1です。,001,PC,100,式1,100000,消費税,アップロードテスト1
2021-08-12,単位テスト137,927635b5-f469-493b-9ce0-b2bfc4062959,2021-06-30,2021-06-30,test222,testsiten,testbank,General,22222,test1,特記事項テスト1です。,001,PC,100,トン1,100000,軽減税率,アップロードテスト1
2021-08-12,単位テスト138,927635b5-f469-493b-9ce0-b2bfc4062959,2021-06-30,2021-06-30,test222,testsiten,testbank,General,22222,test1,特記事項テスト1です。,001,PC,100,その他1,100000,不課税,アップロードテスト1`
  ).toString('base64')

  const taxData = Buffer.from(
    `発行日,請求書番号,テナントID,支払期日,納品日,備考,銀行名,支店名,科目,口座番号,口座名義,その他特記事項,明細-項目ID,明細-内容,明細-数量,明細-単位,明細-単価,明細-税,明細-備考
2021-08-12,税テスト1,927635b5-f469-493b-9ce0-b2bfc4062959,2021-06-30,2021-06-30,test222,testsiten,testbank,General,22222,test1,特記事項テスト1です。,001,PC,100,人月,100000,消費税,アップロードテスト1
2021-08-12,税テスト2,927635b5-f469-493b-9ce0-b2bfc4062959,2021-06-30,2021-06-30,test222,testsiten,testbank,General,22222,test1,特記事項テスト1です。,001,PC,100,ボトル,100000,軽減税率,アップロードテスト1
2021-08-12,税テスト3,927635b5-f469-493b-9ce0-b2bfc4062959,2021-06-30,2021-06-30,test222,testsiten,testbank,General,22222,test1,特記事項テスト1です。,001,PC,100,コスト,100000,不課税,アップロードテスト1
2021-08-12,税テスト4,927635b5-f469-493b-9ce0-b2bfc4062959,2021-06-30,2021-06-30,test222,testsiten,testbank,General,22222,test1,特記事項テスト1です。,001,PC,100,コンテナ,100000,免税,アップロードテスト1
2021-08-12,税テスト5,927635b5-f469-493b-9ce0-b2bfc4062959,2021-06-30,2021-06-30,test222,testsiten,testbank,General,22222,test1,特記事項テスト1です。,001,PC,100,センチリットル,100000,非課税,アップロードテスト1
2021-08-12,税テスト11,927635b5-f469-493b-9ce0-b2bfc4062959,2021-06-30,2021-06-30,test222,testsiten,testbank,General,22222,test1,特記事項テスト1です。,001,PC,100,人月,100000,消費税1,アップロードテスト1
2021-08-12,税テスト12,927635b5-f469-493b-9ce0-b2bfc4062959,2021-06-30,2021-06-30,test222,testsiten,testbank,General,22222,test1,特記事項テスト1です。,001,PC,100,ボトル,100000,軽減税率1,アップロードテスト1
2021-08-12,税テスト13,927635b5-f469-493b-9ce0-b2bfc4062959,2021-06-30,2021-06-30,test222,testsiten,testbank,General,22222,test1,特記事項テスト1です。,001,PC,100,コスト,100000,不課税1,アップロードテスト1
2021-08-12,税テスト14,927635b5-f469-493b-9ce0-b2bfc4062959,2021-06-30,2021-06-30,test222,testsiten,testbank,General,22222,test1,特記事項テスト1です。,001,PC,100,コンテナ,100000,免税1,アップロードテスト1
2021-08-12,税テスト15,927635b5-f469-493b-9ce0-b2bfc4062959,2021-06-30,2021-06-30,test222,testsiten,testbank,General,22222,test1,特記事項テスト1です。,001,PC,100,センチリットル,100000,非課税1,アップロードテスト1`
  ).toString('base64')

  const networkCheckData = Buffer.from(
    `発行日,請求書番号,テナントID,支払期日,納品日,備考,銀行名,支店名,科目,口座番号,口座名義,その他特記事項,明細-項目ID,明細-内容,明細-数量,明細-単位,明細-単価,明細-税,明細-備考
    2021-08-12,ネットワーク確認テスト1,927635b5-f469-493b-9ce0-b2bfc4062959,2021-06-30,2021-06-30,test222,testsiten,testbank,General,22222,test1,特記事項テスト1です。,001,PC,100,人月,100000,消費税,アップロードテスト1
    2021-08-12,ネットワーク確認テスト2,927635b5-f469-493b-9ce0-b2bfc4062959,2021-06-30,2021-06-30,test222,testsiten,testbank,General,22222,test1,特記事項テスト1です。,001,PC,100,ボトル,100000,消費税,アップロードテスト1
    2021-08-12,ネットワーク確認テスト11,927635b5-f469-493b-9ce0-000000000000,2021-06-30,2021-06-30,test222,testsiten,testbank,General,22222,test1,特記事項テスト1です。,001,PC,100,人月,100000,消費税,アップロードテスト1
    2021-08-12,ネットワーク確認テスト12,927635b5-f469-493b-9ce0-000000000000,2021-06-30,2021-06-30,test222,testsiten,testbank,General,22222,test1,特記事項テスト1です。,001,PC,100,ボトル,100000,消費税,アップロードテスト1`
  ).toString('base64')

  const resultNetworkConnection = ['927635b5-f469-493b-9ce0-b2bfc4062959', '927635b5-f469-493b-9ce0-b2bfc4062951']

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
  // response.renderでcancellationが呼ばれ「る」
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
      csvFileName: null,
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

  // 結果値
  // bconCsvの結果値
  const returnBconCsv =
    '{"DocumentType":"InvoiceType","UBLVersionID":{"value":"2.0"},"CustomizationID":{"value":"urn:tradeshift.com:ubl-2.0-customizations:2010-06"},"ProfileID":{"value":"urn:www.cenbii.eu:profile:bii04:ver1.0","schemeID":"CWA 16073:2010","schemeAgencyID":"CEN/ISSS WS/BII","schemeVersionID":"1"},"ID":{"value":"UT_TEST_INVOICE_1_1"},"IssueDate":{"value":"2021-06-14"},"InvoiceTypeCode":{"value":"380","listID":"UN/ECE 1001 Subset","listAgencyID":"6","listVersionID":"D08B"},"DocumentCurrencyCode":{"value":"JPY"},"Note":[{"value":"特記事項テストです。"}],"AdditionalDocumentReference":[{"ID":{"value":"test111"},"DocumentTypeCode":{"value":"File ID","listID":"urn:tradeshift.com:api:1.0:documenttypecode"}}],"AccountingCustomerParty":{"Party":{"PartyIdentification":[{"ID":{"value":"3cfebb4f-2338-4dc7-9523-5423a027a880","schemeID":"TS:ID","schemeName":"Tradeshift identifier"}}],"PartyName":[{"Name":{"value":null}}],"PostalAddress":{"StreetName":{"value":null},"BuildingNumber":{"value":null},"CityName":{"value":null},"PostalZone":{"value":null},"Country":{"IdentificationCode":{"value":"JP"}}},"Contact":{"ElectronicMail":{"value":null}}}},"Delivery":[{"ActualDeliveryDate":{"value":"2021-03-17"}}],"PaymentMeans":[{"PaymentMeansCode":{"value":42,"listID":"urn:tradeshift.com:api:1.0:paymentmeanscode"},"PaymentDueDate":{"value":"2021-03-31"},"PayeeFinancialAccount":{"FinancialInstitutionBranch":{"FinancialInstitution":{"Name":{"value":"testsiten"}},"Name":{"value":"testbank"}},"AccountTypeCode":{"value":"General"},"ID":{"value":"11111"},"Name":{"value":"kang_test"}}}],"InvoiceLine":[{"ID":{"value":"1"},"InvoicedQuantity":{"value":100,"unitCode":"個"},"LineExtensionAmount":{"value":null,"currencyID":"JPY"},"TaxTotal":[{"TaxSubtotal":[{"TaxCategory":{"ID":{"value":"S","schemeID":"UN/ECE 5305","schemeAgencyID":"6","schemeVersionID":"D08B"},"Percent":{"value":0},"TaxScheme":{"ID":{"value":"VAT","schemeID":"UN/ECE 5153 Subset","schemeAgencyID":"6","schemeVersionID":"D08B"},"Name":{"value":"消費税"}}}}]}],"Item":{"Name":{"value":"PC"},"SellersItemIdentification":{"ID":{"value":"001"}},"Description":[{"value":null}]},"Price":{"PriceAmount":{"value":"100000","currencyID":"JPY"}},"DocumentReference":[{"ID":{"value":"アップロードテスト"},"DocumentTypeCode":{"value":"File ID","listID":"urn:tradeshift.com:api:1.0:documenttypecode"}}]}]}'

  describe('ルーティング', () => {
    test('csvuploadのルーティングを確認', async () => {
      expect(csvupload.router.get).toBeCalledWith(
        '/',
        helper.isAuthenticated,
        helper.isTenantRegistered,
        helper.isUserRegistered,
        csvupload.cbGetIndex
      )
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

    test('500エラー：requestのsession,userIdがnullの場合', async () => {
      // 準備
      // requestのsession,userIdにnullを入れる
      request.session = null
      request.user = usernull

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
      // ファイルデータを設定
      request.body = {
        fileData: fileData
      }

      accessTradeshiftSpy.mockReturnValue(200)
      accessTradeshiftSpy.mockReturnValue(documentListData)

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

      // ファイルデータを設定
      request.body = {
        fileData: fileData2
      }

      accessTradeshiftSpy.mockReturnValue(200)
      accessTradeshiftSpy.mockReturnValue(documentListData)

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

      // ファイルデータを設定
      request.body = {
        fileData: fileData3
      }

      accessTradeshiftSpy.mockReturnValue(200)
      accessTradeshiftSpy.mockReturnValue(documentListData)

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

      // ファイルデータを設定
      request.body = {
        fileData: fileData4
      }

      accessTradeshiftSpy.mockReturnValue(200)
      accessTradeshiftSpy.mockReturnValue(documentListData)

      // 試験実施
      await csvupload.cbPostUpload(request, response, next)

      // 期待結果
      // 404，500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(500))
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

      // ファイルデータを設定
      request.body = {
        fileData: fileData100
      }

      accessTradeshiftSpy.mockReturnValue(200)
      accessTradeshiftSpy.mockReturnValue(documentListData)

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

      // ファイルデータを設定
      request.body = {
        fileData: fileData200
      }

      accessTradeshiftSpy.mockReturnValue(200)
      accessTradeshiftSpy.mockReturnValue(documentListData)

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

      // ファイルデータを設定
      request.body = {
        fileData: fileData101
      }

      accessTradeshiftSpy.mockReturnValue(200)
      accessTradeshiftSpy.mockReturnValue(documentListData)

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

      // ファイルデータを設定
      request.body = {
        fileData: fileData201
      }

      accessTradeshiftSpy.mockReturnValue(200)
      accessTradeshiftSpy.mockReturnValue(documentListData)

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

      // ファイルデータを設定
      request.body = {
        fileData: fileData5
      }

      accessTradeshiftSpy.mockReturnValue(200)
      accessTradeshiftSpy.mockReturnValue(documentListData)

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

      accessTradeshiftSpy.mockReturnValue(documentListData)
      accessTradeshiftSpy.mockReturnValue('')

      // 試験実施
      const resultUpl = csvupload.cbUploadCsv(filePath, filename, uploadCsvData)
      expect(resultUpl).toBeTruthy()

      const resultExt = csvupload.cbExtractInvoice(filePath, filename, userToken)
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

      accessTradeshiftSpy.mockReturnValue(documentListData)
      accessTradeshiftSpy.mockReturnValue('')

      // 試験実施
      const resultUpl = csvupload.cbUploadCsv(filePath, filename, uploadCsvData)
      expect(resultUpl).toBeTruthy()

      const resultExt = csvupload.cbExtractInvoice(filePath, filename, userToken)
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

      const resultExt = csvupload.cbExtractInvoice(filePath, filename, userToken)
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

      accessTradeshiftSpy.mockReturnValue(200)
      accessTradeshiftSpy.mockReturnValue(documentListData)

      // 試験実施
      const resultUpl = csvupload.cbUploadCsv(filePath, filename, uploadCsvData)
      expect(resultUpl).toBeTruthy()

      const resultExt = await csvupload.cbExtractInvoice(filePath, filename, userToken)
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

      accessTradeshiftSpy.mockReturnValue(200)
      accessTradeshiftSpy.mockReturnValue(documentListData)

      // 試験実施
      const resultUpl = csvupload.cbUploadCsv(filePath, filename, uploadCsvData)
      expect(resultUpl).toBeTruthy()

      const resultExt = await csvupload.cbExtractInvoice(filePath, filename, userToken)
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
      request.user = user
      const userToken = {
        accessToken: 'dummyAccessToken',
        refreshToken: 'dummyRefreshToken'
      }
      const filename = request.user.tenantId + '_' + request.user.email + '_' + '20210611102239848' + '.csv'

      const uploadCsvData = Buffer.from(decodeURIComponent(fileDataInvoiceIDlessthanequal101), 'base64').toString(
        'utf8'
      )

      accessTradeshiftSpy.mockReturnValue(200)
      accessTradeshiftSpy.mockReturnValue(documentListData)

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

      const resultExt = csvupload.cbExtractInvoice(filePath, filename, userToken)
      expect(resultExt).toBeTruthy()

      const resultRem = await csvupload.cbRemoveCsv(filePath, filename)
      expect(resultRem).toBeTruthy()

      // 期待結果
      // 404，500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(500))
    })

    test('準正常：銀行名バリデーションチェック：101文字以上', async () => {
      // 準備
      request.user = user
      const userToken = {
        accessToken: 'dummyAccessToken',
        refreshToken: 'dummyRefreshToken'
      }
      const filename = request.user.tenantId + '_' + request.user.email + '_' + '20210611102239848' + '.csv'

      const uploadCsvData = Buffer.from(decodeURIComponent(fileDataBankNamelessthanequal101), 'base64').toString('utf8')

      accessTradeshiftSpy.mockReturnValue(200)
      accessTradeshiftSpy.mockReturnValue(documentListData)

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

      const resultExt = csvupload.cbExtractInvoice(filePath, filename, userToken)
      expect(resultExt).toBeTruthy()

      const resultRem = await csvupload.cbRemoveCsv(filePath, filename)
      expect(resultRem).toBeTruthy()

      // 期待結果
      // 404，500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(500))
    })

    test('準正常：発行日バリデーションチェック：日付', async () => {
      // 準備
      request.user = user
      const userToken = {
        accessToken: 'dummyAccessToken',
        refreshToken: 'dummyRefreshToken'
      }
      const filename = request.user.tenantId + '_' + request.user.email + '_' + '20210611102239848' + '.csv'

      const uploadCsvData = Buffer.from(decodeURIComponent(fileDataIssueDateleap), 'base64').toString('utf8')

      accessTradeshiftSpy.mockReturnValue(200)
      accessTradeshiftSpy.mockReturnValue(documentListData)

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

      const resultExt = csvupload.cbExtractInvoice(filePath, filename, userToken)
      expect(resultExt).toBeTruthy()

      const resultRem = await csvupload.cbRemoveCsv(filePath, filename)
      expect(resultRem).toBeTruthy()

      // 期待結果
      // 404，500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(500))
    })

    test('準正常：発行日バリデーションチェック：形式', async () => {
      // 準備
      request.user = user
      const userToken = {
        accessToken: 'dummyAccessToken',
        refreshToken: 'dummyRefreshToken'
      }
      const filename = request.user.tenantId + '_' + request.user.email + '_' + '20210611102239848' + '.csv'

      const uploadCsvData = Buffer.from(decodeURIComponent(fileDataIssueDateTypeErr), 'base64').toString('utf8')

      accessTradeshiftSpy.mockReturnValue(200)
      accessTradeshiftSpy.mockReturnValue(documentListData)

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

      const resultExt = csvupload.cbExtractInvoice(filePath, filename, userToken)
      expect(resultExt).toBeTruthy()

      const resultRem = await csvupload.cbRemoveCsv(filePath, filename)
      expect(resultRem).toBeTruthy()

      // 期待結果
      // 404，500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(500))
    })

    test('準正常：テナントバリデーションチェック：形式', async () => {
      // 準備
      request.user = user
      const userToken = {
        accessToken: 'dummyAccessToken',
        refreshToken: 'dummyRefreshToken'
      }
      const filename = request.user.tenantId + '_' + request.user.email + '_' + '20210611102239848' + '.csv'

      const uploadCsvData = Buffer.from(decodeURIComponent(fileDataTenantTypeErr), 'base64').toString('utf8')

      accessTradeshiftSpy.mockReturnValue(200)
      accessTradeshiftSpy.mockReturnValue(documentListData)

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

      const resultExt = csvupload.cbExtractInvoice(filePath, filename, userToken)
      expect(resultExt).toBeTruthy()

      const resultRem = await csvupload.cbRemoveCsv(filePath, filename)
      expect(resultRem).toBeTruthy()

      // 期待結果
      // 404，500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(500))
    })

    test('準正常：明細-項目IDバリデーションチェック：101文字以上', async () => {
      // 準備
      request.user = user
      const userToken = {
        accessToken: 'dummyAccessToken',
        refreshToken: 'dummyRefreshToken'
      }
      const filename = request.user.tenantId + '_' + request.user.email + '_' + '20210611102239848' + '.csv'

      const uploadCsvData = Buffer.from(decodeURIComponent(fileDataSellersItemNumlessthanequa101), 'base64').toString(
        'utf8'
      )

      accessTradeshiftSpy.mockReturnValue(200)
      accessTradeshiftSpy.mockReturnValue(documentListData)

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

      const resultExt = csvupload.cbExtractInvoice(filePath, filename, userToken)
      expect(resultExt).toBeTruthy()

      const resultRem = await csvupload.cbRemoveCsv(filePath, filename)
      expect(resultRem).toBeTruthy()

      // 期待結果
      // 404，500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(500))
    })

    test('準正常：明細-内容バリデーションチェック：101文字以上', async () => {
      // 準備
      request.user = user
      const userToken = {
        accessToken: 'dummyAccessToken',
        refreshToken: 'dummyRefreshToken'
      }
      const filename = request.user.tenantId + '_' + request.user.email + '_' + '20210611102239848' + '.csv'

      const uploadCsvData = Buffer.from(decodeURIComponent(fileDataItemNamelessthanequa101), 'base64').toString('utf8')

      accessTradeshiftSpy.mockReturnValue(200)
      accessTradeshiftSpy.mockReturnValue(documentListData)

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

      const resultExt = csvupload.cbExtractInvoice(filePath, filename, userToken)
      expect(resultExt).toBeTruthy()

      const resultRem = await csvupload.cbRemoveCsv(filePath, filename)
      expect(resultRem).toBeTruthy()

      // 期待結果
      // 404，500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(500))
    })

    test('準正常：明細-数量バリデーションチェック：1000000000001以上', async () => {
      // 準備
      request.user = user
      const userToken = {
        accessToken: 'dummyAccessToken',
        refreshToken: 'dummyRefreshToken'
      }
      const filename = request.user.tenantId + '_' + request.user.email + '_' + '20210611102239848' + '.csv'

      const uploadCsvData = Buffer.from(
        decodeURIComponent(fileDataQuantityValuelessthanequa1000000000001),
        'base64'
      ).toString('utf8')

      accessTradeshiftSpy.mockReturnValue(200)
      accessTradeshiftSpy.mockReturnValue(documentListData)

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

      const resultExt = csvupload.cbExtractInvoice(filePath, filename, userToken)
      expect(resultExt).toBeTruthy()

      const resultRem = await csvupload.cbRemoveCsv(filePath, filename)
      expect(resultRem).toBeTruthy()

      // 期待結果
      // 404，500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(500))
    })

    test('準正常：明細-単価バリデーションチェック：1000000000001以上', async () => {
      // 準備
      request.user = user
      const userToken = {
        accessToken: 'dummyAccessToken',
        refreshToken: 'dummyRefreshToken'
      }
      const filename = request.user.tenantId + '_' + request.user.email + '_' + '20210611102239848' + '.csv'

      const uploadCsvData = Buffer.from(
        decodeURIComponent(fileDataPriceValuelessthanequa1000000000001),
        'base64'
      ).toString('utf8')

      accessTradeshiftSpy.mockReturnValue(200)
      accessTradeshiftSpy.mockReturnValue(documentListData)

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

      const resultExt = csvupload.cbExtractInvoice(filePath, filename, userToken)
      expect(resultExt).toBeTruthy()

      const resultRem = await csvupload.cbRemoveCsv(filePath, filename)
      expect(resultRem).toBeTruthy()

      // 期待結果
      // 404，500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(500))
    })

    test('準正常：単位バリデーションチェック', async () => {
      // 準備
      const invoiceController = require('../../Application/controllers/invoiceController.js')
      const invoceDetailController = require('../../Application/controllers/invoiceDetailController.js')
      const apiManager = require('../../Application/controllers/apiManager.js')
      const tmpInsert = invoiceController.insert
      const tmpdetailInsert = invoceDetailController.insert
      const tmpApiManager = apiManager.accessTradeshift
      const resultInvoiceDetailController = []

      apiManager.accessTradeshift = jest.fn((accToken, refreshToken, method, query, body = {}, config = {}) => {
        switch (method) {
          case 'get':
            if (query.match(/^\/documents\?stag=draft&stag=outbox&limit=10000/i)) {
              return documentListData
            }
            break
          case 'put':
            return 200
        }
      })
      invoiceController.insert = jest.fn((values) => {
        return values
      })
      invoiceController.findInvoice = jest.fn((invoice) => {
        return invoice
      })
      invoceDetailController.insert = jest.fn((values) => {
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

      const uploadCsvData = Buffer.from(decodeURIComponent(unitcodeData), 'base64').toString('utf8')

      // 試験実施
      const resultUpl = await csvupload.cbUploadCsv(filePath, filename, uploadCsvData)
      expect(resultUpl).toBeTruthy()

      const resultExt = await csvupload.cbExtractInvoice(filePath, filename, userToken, 1)
      expect(resultExt).toBe(0)

      const resultRem = await csvupload.cbRemoveCsv(filePath, filename)
      expect(resultRem).toBeTruthy()

      // 期待結果
      // 404，500エラーがエラーハンドリング「されない」
      for (let idx = 0; idx < 38; idx++) {
        expect(resultInvoiceDetailController[idx].invoiceId).toEqual(`単位テスト${idx + 101}`)
        expect(resultInvoiceDetailController[idx].errorData).toEqual(
          '009、単位は、マニュアルに定義されたものの中から選択してください。'
        )
      }
      expect(resultInvoiceDetailController.length).toBe(38)
      expect(next).not.toHaveBeenCalledWith(error404)
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(500))
      invoiceController.insert = tmpInsert
      invoceDetailController.insert = tmpdetailInsert
      apiManager.accessTradeshift = tmpApiManager
    })

    test('準正常：税バリデーションチェック', async () => {
      // 準備
      const invoiceController = require('../../Application/controllers/invoiceController.js')
      const invoceDetailController = require('../../Application/controllers/invoiceDetailController.js')
      const apiManager = require('../../Application/controllers/apiManager.js')
      const tmpInsert = invoiceController.insert
      const tmpdetailInsert = invoceDetailController.insert
      const tmpApiManager = apiManager.accessTradeshift
      const resultInvoiceDetailController = []

      apiManager.accessTradeshift = jest.fn((accToken, refreshToken, method, query, body = {}, config = {}) => {
        switch (method) {
          case 'get':
            if (query.match(/^\/documents\?stag=draft&stag=outbox&limit=10000/i)) {
              return documentListData
            }
            break
          case 'put':
            return 200
        }
      })
      invoiceController.insert = jest.fn((values) => {
        return values
      })
      invoiceController.findInvoice = jest.fn((invoice) => {
        return invoice
      })
      invoceDetailController.insert = jest.fn((values) => {
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

      const uploadCsvData = Buffer.from(decodeURIComponent(taxData), 'base64').toString('utf8')

      // 試験実施
      const resultUpl = await csvupload.cbUploadCsv(filePath, filename, uploadCsvData)
      expect(resultUpl).toBeTruthy()

      const resultExt = await csvupload.cbExtractInvoice(filePath, filename, userToken, 1)
      expect(resultExt).toBe(0)

      const resultRem = await csvupload.cbRemoveCsv(filePath, filename)
      expect(resultRem).toBeTruthy()

      // 期待結果
      // 404，500エラーがエラーハンドリング「されない」
      for (let idx = 0; idx < 5; idx++) {
        expect(resultInvoiceDetailController[idx].invoiceId).toEqual(`税テスト${idx + 11}`)
        expect(resultInvoiceDetailController[idx].errorData).toEqual(
          '009、税は、マニュアルに定義されたものの中から選択してください。'
        )
      }
      expect(resultInvoiceDetailController.length).toBe(5)
      expect(next).not.toHaveBeenCalledWith(error404)
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(500))
      invoiceController.insert = tmpInsert
      invoceDetailController.insert = tmpdetailInsert
      apiManager.accessTradeshift = tmpApiManager
    })

    test('準正常：ネットワーク確認バリデーションチェック', async () => {
      // 準備
      const invoiceController = require('../../Application/controllers/invoiceController.js')
      const invoceDetailController = require('../../Application/controllers/invoiceDetailController.js')
      const apiManager = require('../../Application/controllers/apiManager.js')
      const tmpInsert = invoiceController.insert
      const tmpdetailInsert = invoceDetailController.insert
      const tmpApiManager = apiManager.accessTradeshift
      const resultInvoiceDetailController = []
      const bconCsv = require('../../Application/lib/bconCsv')

      bconCsv.prototype.companyNetworkConnectionList = resultNetworkConnection

      apiManager.accessTradeshift = jest.fn((accToken, refreshToken, method, query, body = {}, config = {}) => {
        switch (method) {
          case 'get':
            if (query.match(/^\/documents\?stag=draft&stag=outbox&limit=10000/i)) {
              return documentListData
            }
            break
          case 'put':
            return 200
        }
      })
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
      invoceDetailController.insert = jest.fn((values) => {
        if (values.errorData) {
          resultInvoiceDetailController.push(values)
          return { dataValues: values }
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

      const resultExt = await csvupload.cbExtractInvoice(filePath, filename, userToken, 1)
      expect(resultExt).toBe(0)

      const resultRem = await csvupload.cbRemoveCsv(filePath, filename)
      expect(resultRem).toBeTruthy()

      // 期待結果
      // 404，500エラーがエラーハンドリング「されない」
      for (let idx = 0; idx < 2; idx++) {
        expect(resultInvoiceDetailController[idx]?.invoiceId).toEqual(`ネットワーク確認テスト1${idx + 1}`)
        expect(resultInvoiceDetailController[idx].errorData).toEqual(
          '006, テナントIDは、ネットワーク接続済みのものを入力してください。'
        )
      }
      expect(resultInvoiceDetailController.length).toBe(2)
      expect(next).not.toHaveBeenCalledWith(error404)
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(500))
      invoiceController.insert = tmpInsert
      invoceDetailController.insert = tmpdetailInsert
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
