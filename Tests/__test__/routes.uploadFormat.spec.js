/* eslint-disable new-cap */
'use strict'

jest.mock('../../Application/node_modules/express', () => {
  return require('jest-express')
})

const uploadFormat = require('../../Application/routes/uploadFormat')
const Request = require('jest-express').Request
const Response = require('jest-express').Response
const next = require('jest-express').Next
const helper = require('../../Application/routes/helpers/middleware')
const noticeHelper = require('../../Application/routes/helpers/notice')
const userController = require('../../Application/controllers/userController.js')
const contractController = require('../../Application/controllers/contractController.js')
const tenantController = require('../../Application/controllers/tenantController')
const uploadFormatController = require('../../Application/controllers/uploadFormatController')
const uploadFormatDetailController = require('../../Application/controllers/uploadFormatDetailController')
const uploadFormatIdentifierController = require('../../Application/controllers/uploadFormatIdentifierController')
const constantsDefine = require('../../Application/constants')
const logger = require('../../Application/lib/logger.js')
const path = require('path')

// DBのuploadData、バイナリ表示のため、EsLintチェック除外
// eslint-disable-next-line no-loss-of-precision
const tmpUploadData = 0x756e646566696e6564e9a085e79bae312ce9a085e79bae322ce9a085e79bae332ce9a085e79bae342ce9a085e79bae352ce9a085e79bae362ce9a085e79bae372ce9a085e79bae382ce9a085e79bae392ce9a085e79bae31302ce9a085e79bae31312ce9a085e79bae31322ce9a085e79bae31332ce9a085e79bae31342ce9a085e79bae31352ce9a085e79bae31362ce9a085e79bae31372ce9a085e79bae31382ce9a085e79bae31390a323032312d30392d31332c5042313336363030313032312c37653532353566652d303565362d346663392d616366302d3037363537346263333566372c323032312d30382d32332c323032312d30382d32332c504249313234325fe6898be58b95e8a9a6e9a8932ce6898be58b95e98a80e8a18c2ce6898be58b95e694afe5ba972ce699aee9809a2c313233343536372ce6898be58b952ce8ab8be6b182e69bb8e4b880e68bace4bd9ce688905f312e6373762c312ce6988ee7b4b0efbc912c332ce4babae69c882c3130303030302ce6b688e8b2bbe7a88e2ce6898be58b95e8a9a6e9a893e38387e383bce382bf0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000

const UploadFormatDB = [
  {
    uploadFormatId: 'ad1f0fd3-9def-440b-a0db-bcbf60c92491',
    setName: '',
    itemRowNo: 1,
    dataStartRowNo: 2,
    updateType: '請求書データ',
    deleteFlag: 0,
    uploadData: tmpUploadData,
    createdAt: new Date(2021, 11, 18),
    updatedAt: new Date(2021, 11, 18)
  },
  {
    uploadFormatId: 'dad7ebc2-a99d-4d12-896b-a6f3550f3b73',
    setName: '',
    itemRowNo: 1,
    dataStartRowNo: 2,
    updateType: '請求書データ',
    deleteFlag: 0,
    uploadData: tmpUploadData,
    createdAt: new Date(2021, 11, 18),
    updatedAt: new Date(2021, 11, 18)
  },
  {
    uploadFormatId: 'e8c4e929-a119-4ee7-b4be-a06c53130c3d',
    setName: '',
    itemRowNo: 1,
    dataStartRowNo: 2,
    updateType: '請求書データ',
    deleteFlag: 0,
    uploadData: tmpUploadData,
    createdAt: new Date(2021, 11, 18),
    updatedAt: new Date(2021, 11, 18)
  }
]

const UploadFormatDetailDB = []
const UploadFormatIdentifierDB = []
if (process.env.LOCALLY_HOSTED === 'true') {
  // NODE_ENVはJestがデフォルトでtestに指定する。dotenvで上書きできなかったため、package.jsonの実行引数でdevelopmentを指定
  require('dotenv').config({ path: './config/.envUploadFormat' })
}
let request, response
let infoSpy, findOneSpy, findOneSypTenant, findOneSpyContracts, pathSpy, deleteDataForUploadUploadFormatController
let checkDataForUploadFormatUploadFormatControllerSpy, helpercheckContractStatusSpy
describe('uploadFormatのテスト', () => {
  beforeEach(() => {
    request = new Request()
    response = new Response()
    infoSpy = jest.spyOn(logger, 'info')
    findOneSpy = jest.spyOn(userController, 'findOne')
    findOneSypTenant = jest.spyOn(tenantController, 'findOne')
    findOneSpyContracts = jest.spyOn(contractController, 'findOne')
    pathSpy = jest.spyOn(path, 'join')
    uploadFormatController.insert = jest.fn(uploadFormatControllerInsert)
    uploadFormatController.findUploadFormat = jest.fn(uploadFormatControllerFindUploadFormat)
    uploadFormatDetailController.insert = jest.fn(uploadFormatDetailControllerInsert)
    uploadFormatIdentifierController.insert = jest.fn(uploadFormatIdentifierControllerInsert)
    deleteDataForUploadUploadFormatController = jest.spyOn(uploadFormatController, 'deleteDataForUploadFormat')
    checkDataForUploadFormatUploadFormatControllerSpy = jest.spyOn(uploadFormatController, 'checkDataForUploadFormat')
    helpercheckContractStatusSpy = jest.spyOn(helper, 'checkContractStatus')
  })
  afterEach(() => {
    request.resetMocked()
    response.resetMocked()
    next.mockReset()
    infoSpy.mockRestore()
    findOneSpy.mockRestore()
    findOneSypTenant.mockRestore()
    findOneSpyContracts.mockRestore()
    pathSpy.mockRestore()
    deleteDataForUploadUploadFormatController.mockRestore()
    checkDataForUploadFormatUploadFormatControllerSpy.mockRestore()
    helpercheckContractStatusSpy.mockRestore()
  })

  // 404エラー定義
  const error404 = new Error('お探しのページは見つかりませんでした。')
  error404.name = 'Not Found'
  error404.status = 404

  // 500エラー定義
  const error500 = new Error('サーバ内部でエラーが発生しました。')
  error500.name = 'Internal Server Error'
  error500.status = 500

  // 正常系データ定義
  // email,userId正常値
  const user = {
    email: 'dummy@testdummy.com',
    userId: '12345678-cb0b-48ad-857d-4b42a44ede13',
    tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089',
    accessToken: 'dummyAccessToken',
    refreshToken: 'dummyRefreshToken'
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

  // DBの正常なユーザデータ
  const dataValues = {
    dataValues: {
      tenantId: '3cfebb4f-2338-4dc7-9523-5423a027a880',
      userRole: 'a6a3edcd-00d9-427c-bf03-4ef0112ba16d',
      userId: '12345678-cb0b-48ad-857d-4b42a44ede13',
      appVersion: '0.0.1',
      refreshToken: 'dummyRefreshToken',
      subRefreshToken: null,
      userStatus: 0,
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
      contractId: '0bcedab8-de85-4b82-bf61-34fbb59ca883',
      tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089',
      numberN: '0000011111',
      contractStatus: '00',
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

  const contractInfoDatatoBeReceiptCancel = {
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

  const contractdataValuesDataControllFail = {
    dataValues: {
      contractId: '1111111111-2222-3333-4444-4b42a44ede13',
      tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089',
      numberN: '0000011111',
      contractStatus: '00',
      deleteFlag: false,
      createdAt: '2021-01-25T08:45:49.803Z',
      updatedAt: '2021-01-25T08:45:49.803Z'
    }
  }

  // ファイル名設定
  const filePath = process.env.INVOICE_UPLOAD_PATH
  const fileName = 'uploadFormatTest.csv'
  const fileNameErr = 'uploadFormatTest2.csv'

  const uploadFileNameErr = dataValues.dataValues.userId + '_' + fileNameErr

  // ファイルデータ
  // 請求書が1つの場合
  const fileData = Buffer.from(
    `発行日,請求書番号,テナントID,支払期日,納品日,備考,取引先メールアドレス,銀行名,支店名,科目,口座番号,口座名義,その他特記事項,明細-項目ID,明細-内容,明細-数量,明細-単位,明細-単価,明細-税（消費税／軽減税率／不課税／免税／非課税）,明細-備考
2021-06-14,UT_TEST_INVOICE_1_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-17,test111,aaa@bbb.ccc,testsiten,testbank,普通,1111111,kang_test,特記事項テストです。,001,PC,100,個,100000,消費税,アップロードテスト`
  ).toString('base64')

  const fileDataHeaderErr = Buffer.from(
    `aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa,請求書番号,テナントID,支払期日,納品日,備考,銀行名,支店名,科目,口座番号,口座名義,その他特記事項,明細-項目ID,明細-内容,明細-数量,明細-単位,明細-単価,明細-税（消費税／軽減税率／不課税／免税／非課税）,明細-備考
2021-06-14,UT_TEST_INVOICE_1_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-17,test111,aaa@bbb.ccc,testsiten,testbank,普通,1111111,kang_test,特記事項テストです。,001,PC,100,個,100000,消費税,アップロードテスト`
  ).toString('base64')

  const fileDataMesai = Buffer.from(
    `発行日,請求書番号,テナントID,支払期日,納品日,備考,取引先メールアドレス,銀行名,支店名,科目,口座番号,口座名義,その他特記事項,明細-項目ID,明細-内容,明細-数量,明細-単位,明細-単価,明細-税（消費税／軽減税率／不課税／免税／非課税）,明細-備考
2021-06-14,aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-17,test111,testsiten,testbank,普通,1111111,kang_test,特記事項テストです。,001,PC,100,個,100000,消費税,アップロードテスト`
  ).toString('base64')

  const fileDataDataStartRowNo5 = Buffer.from(
    `発行日,請求書番号,テナントID,支払期日,納品日,備考,取引先メールアドレス,銀行名,支店名,科目,口座番号,口座名義,その他特記事項,明細-項目ID,明細-内容,明細-数量,明細-単位,明細-単価,明細-税（消費税／軽減税率／不課税／免税／非課税）,明細-備考
2021-06-14,UT_TEST_INVOICE_1_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-17,test111,aaa@bbb.ccc,testsiten,testbank,普通,1111111,kang_test,特記事項テストです。,001,PC,100,個,100000,消費税,アップロードテスト
2021-06-14,UT_TEST_INVOICE_1_2,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-17,test112,aaa@bbb.ccc,testsiten,testbank,普通,2222222,kang_test,特記事項テストです。,001,PC,100,個,100000,消費税,アップロードテスト
2021-06-14,UT_TEST_INVOICE_1_3,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-17,test113,aaa@bbb.ccc,testsiten,testbank,普通,3333333,kang_test,特記事項テストです。,001,PC,100,個,100000,消費税,アップロードテスト
2021-06-14,UT_TEST_INVOICE_1_4,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-17,test114,aaa@bbb.ccc,testsiten,testbank,普通,4444444,kang_test,特記事項テストです。,001,PC,100,個,100000,消費税,アップロードテスト`
  ).toString('base64')

  const fileDataItemRowNo3DataStartRowNo4 = Buffer.from(
    `2021-06-14,UT_TEST_INVOICE_1_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-17,test111,aaa@bbb.ccc,testsiten,testbank,普通,1111111,kang_test,特記事項テストです。,001,PC,100,個,100000,消費税,アップロードテスト
2021-06-14,UT_TEST_INVOICE_1_2,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-17,test112,aaa@bbb.ccc,testsiten,testbank,普通,2222222,kang_test,特記事項テストです。,001,PC,100,個,100000,消費税,アップロードテスト
発行日,請求書番号,テナントID,支払期日,納品日,備考,取引先メールアドレス,銀行名,支店名,科目,口座番号,口座名義,その他特記事項,明細-項目ID,明細-内容,明細-数量,明細-単位,明細-単価,明細-税（消費税／軽減税率／不課税／免税／非課税）,明細-備考
2021-06-14,UT_TEST_INVOICE_1_3,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-17,test113,aaa@bbb.ccc,testsiten,testbank,普通,3333333,kang_test,特記事項テストです。,001,PC,100,個,100000,消費税,アップロードテスト`
  ).toString('base64')

  const fileDataItemRowNo4DataStartRowNo3 = Buffer.from(
    `2021-06-14,UT_TEST_INVOICE_1_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-17,test111,aaa@bbb.ccc,testsiten,testbank,普通,1111111,kang_test,特記事項テストです。,001,PC,100,個,100000,消費税,アップロードテスト
2021-06-14,UT_TEST_INVOICE_1_2,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-17,test112,aaa@bbb.ccc,testsiten,testbank,普通,2222222,kang_test,特記事項テストです。,001,PC,100,個,100000,消費税,アップロードテスト
2021-06-14,UT_TEST_INVOICE_1_3,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-17,test113,aaa@bbb.ccc,testsiten,testbank,普通,3333333,kang_test,特記事項テストです。,001,PC,100,個,100000,消費税,アップロードテスト
発行日,請求書番号,テナントID,支払期日,納品日,備考,取引先メールアドレス,銀行名,支店名,科目,口座番号,口座名義,その他特記事項,明細-項目ID,明細-内容,明細-数量,明細-単位,明細-単価,明細-税（消費税／軽減税率／不課税／免税／非課税）,明細-備考`
  ).toString('base64')

  const fileDataItemRowNo5DataStartRowNo1 = Buffer.from(
    `2021-06-14,UT_TEST_INVOICE_1_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-17,test111,aaa@bbb.ccc,testsiten,testbank,普通,1111111,kang_test,特記事項テストです。,001,PC,100,個,100000,消費税,アップロードテスト
2021-06-14,UT_TEST_INVOICE_1_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-17,test111,aaa@bbb.ccc,testsiten,testbank,普通,1111111,kang_test,特記事項テストです。,001,PC,100,個,100000,消費税,アップロードテスト
2021-06-14,UT_TEST_INVOICE_1_2,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-17,test112,aaa@bbb.ccc,testsiten,testbank,普通,2222222,kang_test,特記事項テストです。,001,PC,100,個,100000,消費税,アップロードテスト
2021-06-14,UT_TEST_INVOICE_1_3,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-17,test113,aaa@bbb.ccc,testsiten,testbank,普通,3333333,kang_test,特記事項テストです。,001,PC,100,個,100000,消費税,アップロードテスト
発行日,請求書番号,テナントID,支払期日,納品日,備考,取引先メールアドレス,銀行名,支店名,科目,口座番号,口座名義,その他特記事項,明細-項目ID,明細-内容,明細-数量,明細-単位,明細-単価,明細-税（消費税／軽減税率／不課税／免税／非課税）,明細-備考`
  ).toString('base64')

  const fileDataBlankItemRowNo2DataStartRowNo4 = Buffer.from(
    `
発行日,請求書番号,テナントID,支払期日,納品日,備考,取引先メールアドレス,銀行名,支店名,科目,口座番号,口座名義,その他特記事項,明細-項目ID,明細-内容,明細-数量,明細-単位,明細-単価,明細-税（消費税／軽減税率／不課税／免税／非課税）,明細-備考

2021-06-14,UT_TEST_INVOICE_1_3,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-17,test113,aaa@bbb.ccc,testsiten,testbank,普通,3333333,kang_test,特記事項テストです。,001,PC,100,個,100000,消費税,アップロードテスト`
  ).toString('base64')

  const taxIds = {
    keyConsumptionTax: {
      itemName: '消費税',
      key: 'keyConsumptionTax',
      value: '3'
    },
    keyDutyFree: {
      itemName: '免税',
      key: 'keyDutyFree',
      value: '6'
    },
    keyExemptTax: {
      itemName: '非課税',
      key: 'keyExemptTax',
      value: '7'
    },
    keyFreeTax: {
      itemName: '不課税',
      key: 'keyFreeTax',
      value: '5'
    },
    keyReducedTax: {
      itemName: '軽減税率',
      key: 'keyReducedTax',
      value: '4'
    }
  }

  const unitIds = {
    keyBottle: {
      itemName: 'ボトル',
      key: 'keyBottle',
      value: '9'
    },
    keyCarton: {
      itemName: 'カートン',
      key: 'keyCarton',
      value: '17'
    },
    keyCase: {
      itemName: 'ケース',
      key: 'keyCase',
      value: '16'
    },
    keyCentilitre: {
      itemName: 'センチリットル',
      key: 'keyCentilitre',
      value: '12'
    },
    keyCentimeter: {
      itemName: 'センチメートル',
      key: 'keyCentimeter',
      value: '15'
    },
    keyContainer: {
      itemName: 'コンテナ',
      key: 'keyContainer',
      value: '11'
    },
    keyCost: {
      itemName: 'コスト',
      key: 'keyCost',
      value: '10'
    },
    keyCubicCentimeter: {
      itemName: '立方センチメートル',
      key: 'keyCubicCentimeter',
      value: '14'
    },
    keyCubicMeter: {
      itemName: '立方メートル',
      key: 'keyCubicMeter',
      value: '38'
    },
    keyDay: {
      itemName: '日',
      key: 'keyDay',
      value: '18'
    },
    keyDeciliter: {
      itemName: 'デシリットル',
      key: 'keyDeciliter',
      value: '19'
    },
    keyDecimeter: {
      itemName: 'デシメートル',
      key: 'keyDecimeter',
      value: '20'
    },
    keyFeet: {
      itemName: 'フィート',
      key: 'keyFeet',
      value: '23'
    },
    keyFormula: {
      itemName: '式',
      key: 'keyFormula',
      value: '43'
    },
    keyGallon: {
      itemName: 'ガロン',
      key: 'keyGallon',
      value: '24'
    },
    keyGram: {
      itemName: 'グラム',
      key: 'keyGram',
      value: '25'
    },
    keyGrossKilogram: {
      itemName: 'グロス・キログラム',
      key: 'keyGrossKilogram',
      value: '21'
    },
    keyGrossTonnage: {
      itemName: '総トン',
      key: 'keyGrossTonnage',
      value: '26'
    },
    keyHour: {
      itemName: '時間',
      key: 'keyHour',
      value: '27'
    },
    keyKilogram: {
      itemName: 'キログラム',
      key: 'keyKilogram',
      value: '28'
    },
    keyKilometers: {
      itemName: 'キロメートル',
      key: 'keyKilometers',
      value: '29'
    },
    keyKilowattHour: {
      itemName: 'キロワット時',
      key: 'keyKilowattHour',
      value: '30'
    },
    keyLiter: {
      itemName: 'リットル',
      key: 'keyLiter',
      value: '32'
    },
    keyManMonth: {
      itemName: '人月',
      key: 'keyManMonth',
      value: '8'
    },
    keyMeter: {
      itemName: 'メーター',
      key: 'keyMeter',
      value: '39'
    },
    keyMilligram: {
      itemName: 'ミリグラム',
      key: 'keyMilligram',
      value: '33'
    },
    keyMilliliter: {
      itemName: 'ミリリットル',
      key: 'keyMilliliter',
      value: '34'
    },
    keyMillimeter: {
      itemName: 'ミリメートル',
      key: 'keyMillimeter',
      value: '35'
    },
    keyMonth: {
      itemName: '月',
      key: 'keyMonth',
      value: '36'
    },
    keyNetTonnage: {
      itemName: '純トン',
      key: 'keyNetTonnage',
      value: '40'
    },
    keyOthers: {
      itemName: 'その他',
      key: 'keyOthers',
      value: '45'
    },
    keyPackage: {
      itemName: '包',
      key: 'keyPackage',
      value: '41'
    },
    keyPieces: {
      itemName: '個',
      key: 'keyPieces',
      value: '22'
    },
    keyPound: {
      itemName: 'ポンド',
      key: 'keyPound',
      value: '31'
    },
    keyRoll: {
      itemName: '巻',
      key: 'keyRoll',
      value: '42'
    },
    keySquareCentimeter: {
      itemName: '平方センチメートル',
      key: 'keySquareCentimeter',
      value: '13'
    },
    keySquareMeter: {
      itemName: '平方メートル',
      key: 'keySquareMeter',
      value: '37'
    },
    keyTonnage: {
      itemName: 'トン',
      key: 'keyTonnage',
      value: '44'
    }
  }

  const reqBodyUnitIds = {
    keyManMonth: '8',
    keyBottle: '9',
    keyCost: '10',
    keyContainer: '11',
    keyCentilitre: '12',
    keySquareCentimeter: '13',
    keyCubicCentimeter: '14',
    keyCentimeter: '15',
    keyCase: '16',
    keyCarton: '17',
    keyDay: '18',
    keyDeciliter: '19',
    keyDecimeter: '20',
    keyGrossKilogram: '21',
    keyPieces: '22',
    keyFeet: '23',
    keyGallon: '24',
    keyGram: '25',
    keyGrossTonnage: '26',
    keyHour: '27',
    keyKilogram: '28',
    keyKilometers: '29',
    keyKilowattHour: '30',
    keyPound: '31',
    keyLiter: '32',
    keyMilligram: '33',
    keyMilliliter: '34',
    keyMillimeter: '35',
    keyMonth: '36',
    keySquareMeter: '37',
    keyCubicMeter: '38',
    keyMeter: '39',
    keyNetTonnage: '40',
    keyPackage: '41',
    keyRoll: '42',
    keyFormula: '43',
    keyTonnage: '44',
    keyOthers: '45'
  }

  const reqBodyForCbPostIndexOn = {
    uploadFormatItemName: 'testItemName',
    uploadType: '',
    dataFileName: fileName,
    dataFile: fileName,
    checkItemNameLine: 'on',
    uploadFormatNumber: '1',
    defaultNumber: '2',
    keyConsumptionTax: '3',
    keyReducedTax: '4',
    keyFreeTax: '5',
    keyDutyFree: '6',
    keyExemptTax: '7',
    keyManMonth: '8',
    keyBottle: '9',
    keyCost: '10',
    keyContainer: '11',
    keyCentilitre: '12',
    keySquareCentimeter: '13',
    keyCubicCentimeter: '14',
    keyCentimeter: '15',
    keyCase: '16',
    keyCarton: '17',
    keyDay: '18',
    keyDeciliter: '19',
    keyDecimeter: '20',
    keyGrossKilogram: '21',
    keyPieces: '22',
    keyFeet: '23',
    keyGallon: '24',
    keyGram: '25',
    keyGrossTonnage: '26',
    keyHour: '27',
    keyKilogram: '28',
    keyKilometers: '29',
    keyKilowattHour: '30',
    keyPound: '31',
    keyLiter: '32',
    keyMilligram: '33',
    keyMilliliter: '34',
    keyMillimeter: '35',
    keyMonth: '36',
    keySquareMeter: '37',
    keyCubicMeter: '38',
    keyMeter: '39',
    keyNetTonnage: '40',
    keyPackage: '41',
    keyRoll: '42',
    keyFormula: '43',
    keyTonnage: '44',
    keyOthers: '45',
    formatData: [
      '1',
      '2',
      '3',
      '4',
      '5',
      '6',
      '7',
      '8',
      '9',
      '10',
      '11',
      '12',
      '13',
      '14',
      '15',
      '16',
      '17',
      '18',
      '19',
      '20'
    ],
    headerItems: [
      'テスト',
      '発行日',
      '請求書番号',
      'テナントID',
      '支払期日',
      '納品日',
      '備考',
      '取引先メールアドレス',
      '銀行名',
      '支店名',
      '科目',
      '口座番号',
      '口座名義',
      'その他特記事項',
      '明細-項目ID',
      '明細-内容',
      '明細-数量',
      '明細-単位',
      '明細-単価',
      '明細-税（消費税／軽減税率／不課税／免税／非課税）',
      '明細-備考'
    ]
  }

  const reqBodyForCbPostIndexOff = {
    uploadFormatItemName: 'testItemName',
    uploadType: '',
    dataFileName: fileName,
    dataFile: fileName,
    checkItemNameLine: 'off',
    uploadFormatNumber: '',
    defaultNumber: '2',
    keyConsumptionTax: '3',
    keyReducedTax: '4',
    keyFreeTax: '5',
    keyDutyFree: '6',
    keyExemptTax: '7',
    keyManMonth: '8',
    keyBottle: '9',
    keyCost: '10',
    keyContainer: '11',
    keyCentilitre: '12',
    keySquareCentimeter: '13',
    keyCubicCentimeter: '14',
    keyCentimeter: '15',
    keyCase: '16',
    keyCarton: '17',
    keyDay: '18',
    keyDeciliter: '19',
    keyDecimeter: '20',
    keyGrossKilogram: '21',
    keyPieces: '22',
    keyFeet: '23',
    keyGallon: '24',
    keyGram: '25',
    keyGrossTonnage: '26',
    keyHour: '27',
    keyKilogram: '28',
    keyKilometers: '29',
    keyKilowattHour: '30',
    keyPound: '31',
    keyLiter: '32',
    keyMilligram: '33',
    keyMilliliter: '34',
    keyMillimeter: '35',
    keyMonth: '36',
    keySquareMeter: '37',
    keyCubicMeter: '38',
    keyMeter: '39',
    keyNetTonnage: '40',
    keyPackage: '41',
    keyRoll: '42',
    keyFormula: '43',
    keyTonnage: '44',
    keyOthers: '45',
    formatData: [
      '1',
      '2',
      '3',
      '4',
      '5',
      '6',
      '7',
      '8',
      '9',
      '10',
      '11',
      '12',
      '13',
      '14',
      '15',
      '16',
      '17',
      '18',
      '19',
      '20'
    ],
    headerItems: [
      'テスト',
      '発行日',
      '請求書番号',
      'テナントID',
      '支払期日',
      '納品日',
      '備考',
      '取引先メールアドレス',
      '銀行名',
      '支店名',
      '科目',
      '口座番号',
      '口座名義',
      'その他特記事項',
      '明細-項目ID',
      '明細-内容',
      '明細-数量',
      '明細-単位',
      '明細-単価',
      '明細-税（消費税／軽減税率／不課税／免税／非課税）',
      '明細-備考'
    ]
  }

  const reqBodyForCbPostIndexErr = {
    uploadFormatItemName: 'testItemName',
    uploadType: '',
    dataFileName: fileNameErr,
    dataFile: fileNameErr,
    checkItemNameLine: 'on',
    uploadFormatNumber: '1',
    defaultNumber: '2',
    keyConsumptionTax: '3',
    keyReducedTax: '4',
    keyFreeTax: '5',
    keyDutyFree: '6',
    keyExemptTax: '7',
    keyManMonth: '8',
    keyBottle: '9',
    keyCost: '10',
    keyContainer: '11',
    keyCentilitre: '12',
    keySquareCentimeter: '13',
    keyCubicCentimeter: '14',
    keyCentimeter: '15',
    keyCase: '16',
    keyCarton: '17',
    keyDay: '18',
    keyDeciliter: '19',
    keyDecimeter: '20',
    keyGrossKilogram: '21',
    keyPieces: '22',
    keyFeet: '23',
    keyGallon: '24',
    keyGram: '25',
    keyGrossTonnage: '26',
    keyHour: '27',
    keyKilogram: '28',
    keyKilometers: '29',
    keyKilowattHour: '30',
    keyPound: '31',
    keyLiter: '32',
    keyMilligram: '33',
    keyMilliliter: '34',
    keyMillimeter: '35',
    keyMonth: '36',
    keySquareMeter: '37',
    keyCubicMeter: '38',
    keyMeter: '39',
    keyNetTonnage: '40',
    keyPackage: '41',
    keyRoll: '42',
    keyFormula: '43',
    keyTonnage: '44',
    keyOthers: '45'
  }

  const reqBodyForCbPostIndexTaxErr = {
    uploadFormatItemName: 'testItemName',
    uploadType: '',
    dataFileName: fileName,
    dataFile: fileName,
    checkItemNameLine: 'on',
    uploadFormatNumber: '1',
    defaultNumber: '2',
    keyManMonth: '8',
    keyBottle: '9',
    keyCost: '10',
    keyContainer: '11',
    keyCentilitre: '12',
    keySquareCentimeter: '13',
    keyCubicCentimeter: '14',
    keyCentimeter: '15',
    keyCase: '16',
    keyCarton: '17',
    keyDay: '18',
    keyDeciliter: '19',
    keyDecimeter: '20',
    keyGrossKilogram: '21',
    keyPieces: '22',
    keyFeet: '23',
    keyGallon: '24',
    keyGram: '25',
    keyGrossTonnage: '26',
    keyHour: '27',
    keyKilogram: '28',
    keyKilometers: '29',
    keyKilowattHour: '30',
    keyPound: '31',
    keyLiter: '32',
    keyMilligram: '33',
    keyMilliliter: '34',
    keyMillimeter: '35',
    keyMonth: '36',
    keySquareMeter: '37',
    keyCubicMeter: '38',
    keyMeter: '39',
    keyNetTonnage: '40',
    keyPackage: '41',
    keyRoll: '42',
    keyFormula: '43',
    keyTonnage: '44',
    keyOthers: '45'
  }

  const reqBodyForCbPostIndexUnitErr = {
    uploadFormatItemName: 'testItemName',
    uploadType: '',
    dataFileName: fileName,
    dataFile: fileName,
    checkItemNameLine: 'on',
    uploadFormatNumber: '1',
    defaultNumber: '2',
    keyConsumptionTax: '3',
    keyReducedTax: '4',
    keyFreeTax: '5',
    keyDutyFree: '6',
    keyExemptTax: '7'
  }

  const uploadGeneral = {
    uploadFormatItemName: 'testItemName',
    uploadType: ''
  }

  const taxIds100 = {
    keyConsumptionTax: {
      itemName: '消費税',
      key: 'keyConsumptionTax',
      value: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
    },
    keyDutyFree: {
      itemName: '免税',
      key: 'keyDutyFree',
      value: '6'
    },
    keyExemptTax: {
      itemName: '非課税',
      key: 'keyExemptTax',
      value: '7'
    },
    keyFreeTax: {
      itemName: '不課税',
      key: 'keyFreeTax',
      value: '5'
    },
    keyReducedTax: {
      itemName: '軽減税率',
      key: 'keyReducedTax',
      value: '4'
    }
  }

  const unitIds100 = {
    keyBottle: {
      itemName: 'ボトル',
      key: 'keyBottle',
      value: '9'
    },
    keyCarton: {
      itemName: 'カートン',
      key: 'keyCarton',
      value: '17'
    },
    keyCase: {
      itemName: 'ケース',
      key: 'keyCase',
      value: '16'
    },
    keyCentilitre: {
      itemName: 'センチリットル',
      key: 'keyCentilitre',
      value: '12'
    },
    keyCentimeter: {
      itemName: 'センチメートル',
      key: 'keyCentimeter',
      value: '15'
    },
    keyContainer: {
      itemName: 'コンテナ',
      key: 'keyContainer',
      value: '11'
    },
    keyCost: {
      itemName: 'コスト',
      key: 'keyCost',
      value: '10'
    },
    keyCubicCentimeter: {
      itemName: '立方センチメートル',
      key: 'keyCubicCentimeter',
      value: '14'
    },
    keyCubicMeter: {
      itemName: '立方メートル',
      key: 'keyCubicMeter',
      value: '38'
    },
    keyDay: {
      itemName: '日',
      key: 'keyDay',
      value: '18'
    },
    keyDeciliter: {
      itemName: 'デシリットル',
      key: 'keyDeciliter',
      value: '19'
    },
    keyDecimeter: {
      itemName: 'デシメートル',
      key: 'keyDecimeter',
      value: '20'
    },
    keyFeet: {
      itemName: 'フィート',
      key: 'keyFeet',
      value: '23'
    },
    keyFormula: {
      itemName: '式',
      key: 'keyFormula',
      value: '43'
    },
    keyGallon: {
      itemName: 'ガロン',
      key: 'keyGallon',
      value: '24'
    },
    keyGram: {
      itemName: 'グラム',
      key: 'keyGram',
      value: '25'
    },
    keyGrossKilogram: {
      itemName: 'グロス・キログラム',
      key: 'keyGrossKilogram',
      value: '21'
    },
    keyGrossTonnage: {
      itemName: '総トン',
      key: 'keyGrossTonnage',
      value: '26'
    },
    keyHour: {
      itemName: '時間',
      key: 'keyHour',
      value: '27'
    },
    keyKilogram: {
      itemName: 'キログラム',
      key: 'keyKilogram',
      value: '28'
    },
    keyKilometers: {
      itemName: 'キロメートル',
      key: 'keyKilometers',
      value: '29'
    },
    keyKilowattHour: {
      itemName: 'キロワット時',
      key: 'keyKilowattHour',
      value: '30'
    },
    keyLiter: {
      itemName: 'リットル',
      key: 'keyLiter',
      value: '32'
    },
    keyManMonth: {
      itemName: '人月',
      key: 'keyManMonth',
      value: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
    },
    keyMeter: {
      itemName: 'メーター',
      key: 'keyMeter',
      value: '39'
    },
    keyMilligram: {
      itemName: 'ミリグラム',
      key: 'keyMilligram',
      value: '33'
    },
    keyMilliliter: {
      itemName: 'ミリリットル',
      key: 'keyMilliliter',
      value: '34'
    },
    keyMillimeter: {
      itemName: 'ミリメートル',
      key: 'keyMillimeter',
      value: '35'
    },
    keyMonth: {
      itemName: '月',
      key: 'keyMonth',
      value: '36'
    },
    keyNetTonnage: {
      itemName: '純トン',
      key: 'keyNetTonnage',
      value: '40'
    },
    keyOthers: {
      itemName: 'その他',
      key: 'keyOthers',
      value: '45'
    },
    keyPackage: {
      itemName: '包',
      key: 'keyPackage',
      value: '41'
    },
    keyPieces: {
      itemName: '個',
      key: 'keyPieces',
      value: '22'
    },
    keyPound: {
      itemName: 'ポンド',
      key: 'keyPound',
      value: '31'
    },
    keyRoll: {
      itemName: '巻',
      key: 'keyRoll',
      value: '42'
    },
    keySquareCentimeter: {
      itemName: '平方センチメートル',
      key: 'keySquareCentimeter',
      value: '13'
    },
    keySquareMeter: {
      itemName: '平方メートル',
      key: 'keySquareMeter',
      value: '37'
    },
    keyTonnage: {
      itemName: 'トン',
      key: 'keyTonnage',
      value: '44'
    }
  }

  const taxIdsUndefined = {
    keyConsumptionTax: {
      itemName: '消費税',
      key: 'keyConsumptionTax',
      value: undefined
    },
    keyDutyFree: {
      itemName: '免税',
      key: 'keyDutyFree',
      value: undefined
    },
    keyExemptTax: {
      itemName: '非課税',
      key: 'keyExemptTax',
      value: undefined
    },
    keyFreeTax: {
      itemName: '不課税',
      key: 'keyFreeTax',
      value: undefined
    },
    keyReducedTax: {
      itemName: '軽減税率',
      key: 'keyReducedTax',
      value: undefined
    }
  }

  const unitIdsUndefined = {
    keyBottle: {
      itemName: 'ボトル',
      key: 'keyBottle',
      value: undefined
    },
    keyCarton: {
      itemName: 'カートン',
      key: 'keyCarton',
      value: undefined
    },
    keyCase: {
      itemName: 'ケース',
      key: 'keyCase',
      value: undefined
    },
    keyCentilitre: {
      itemName: 'センチリットル',
      key: 'keyCentilitre',
      value: undefined
    },
    keyCentimeter: {
      itemName: 'センチメートル',
      key: 'keyCentimeter',
      value: undefined
    },
    keyContainer: {
      itemName: 'コンテナ',
      key: 'keyContainer',
      value: undefined
    },
    keyCost: {
      itemName: 'コスト',
      key: 'keyCost',
      value: undefined
    },
    keyCubicCentimeter: {
      itemName: '立方センチメートル',
      key: 'keyCubicCentimeter',
      value: undefined
    },
    keyCubicMeter: {
      itemName: '立方メートル',
      key: 'keyCubicMeter',
      value: undefined
    },
    keyDay: {
      itemName: '日',
      key: 'keyDay',
      value: undefined
    },
    keyDeciliter: {
      itemName: 'デシリットル',
      key: 'keyDeciliter',
      value: undefined
    },
    keyDecimeter: {
      itemName: 'デシメートル',
      key: 'keyDecimeter',
      value: undefined
    },
    keyFeet: {
      itemName: 'フィート',
      key: 'keyFeet',
      value: undefined
    },
    keyFormula: {
      itemName: '式',
      key: 'keyFormula',
      value: undefined
    },
    keyGallon: {
      itemName: 'ガロン',
      key: 'keyGallon',
      value: undefined
    },
    keyGram: {
      itemName: 'グラム',
      key: 'keyGram',
      value: undefined
    },
    keyGrossKilogram: {
      itemName: 'グロス・キログラム',
      key: 'keyGrossKilogram',
      value: undefined
    },
    keyGrossTonnage: {
      itemName: '総トン',
      key: 'keyGrossTonnage',
      value: undefined
    },
    keyHour: {
      itemName: '時間',
      key: 'keyHour',
      value: undefined
    },
    keyKilogram: {
      itemName: 'キログラム',
      key: 'keyKilogram',
      value: undefined
    },
    keyKilometers: {
      itemName: 'キロメートル',
      key: 'keyKilometers',
      value: undefined
    },
    keyKilowattHour: {
      itemName: 'キロワット時',
      key: 'keyKilowattHour',
      value: undefined
    },
    keyLiter: {
      itemName: 'リットル',
      key: 'keyLiter',
      value: undefined
    },
    keyManMonth: {
      itemName: '人月',
      key: 'keyManMonth',
      value: undefined
    },
    keyMeter: {
      itemName: 'メーター',
      key: 'keyMeter',
      value: undefined
    },
    keyMilligram: {
      itemName: 'ミリグラム',
      key: 'keyMilligram',
      value: undefined
    },
    keyMilliliter: {
      itemName: 'ミリリットル',
      key: 'keyMilliliter',
      value: undefined
    },
    keyMillimeter: {
      itemName: 'ミリメートル',
      key: 'keyMillimeter',
      value: undefined
    },
    keyMonth: {
      itemName: '月',
      key: 'keyMonth',
      value: undefined
    },
    keyNetTonnage: {
      itemName: '純トン',
      key: 'keyNetTonnage',
      value: undefined
    },
    keyOthers: {
      itemName: 'その他',
      key: 'keyOthers',
      value: undefined
    },
    keyPackage: {
      itemName: '包',
      key: 'keyPackage',
      value: undefined
    },
    keyPieces: {
      itemName: '個',
      key: 'keyPieces',
      value: undefined
    },
    keyPound: {
      itemName: 'ポンド',
      key: 'keyPound',
      value: undefined
    },
    keyRoll: {
      itemName: '巻',
      key: 'keyRoll',
      value: undefined
    },
    keySquareCentimeter: {
      itemName: '平方センチメートル',
      key: 'keySquareCentimeter',
      value: undefined
    },
    keySquareMeter: {
      itemName: '平方メートル',
      key: 'keySquareMeter',
      value: undefined
    },
    keyTonnage: {
      itemName: 'トン',
      key: 'keyTonnage',
      value: undefined
    }
  }

  const headerItems = [
    { item: '発行日', value: '2021-06-14' },
    { item: '請求書番号', value: 'UT_TEST_INVOICE_1_1' },
    { item: 'テナントID', value: '3cfebb4f-2338-4dc7-9523-5423a027a880' },
    { item: '支払期日', value: '2021-03-31' },
    { item: '納品日', value: '2021-03-17' },
    { item: '備考', value: 'test111' },
    { item: '取引先メールアドレス', value: 'aaa@bbb.ccc' },
    { item: '銀行名', value: 'testsiten' },
    { item: '支店名', value: 'testbank' },
    { item: '科目', value: '普通' },
    { item: '口座番号', value: '1111111' },
    { item: '口座名義', value: 'kang_test' },
    { item: 'その他特記事項', value: '特記事項テストです。' },
    { item: '明細-項目ID', value: '001' },
    { item: '明細-内容', value: 'PC' },
    { item: '明細-数量', value: '100' },
    { item: '明細-単位', value: '個' },
    { item: '明細-単価', value: '100000' },
    { item: '明細-税（消費税／軽減税率／不課税／免税／非課税）', value: '消費税' },
    { item: '明細-備考', value: 'アップロードテスト' }
  ]

  const columnArr = [
    { columnName: '発行日', item: '', value: '' },
    { columnName: '請求書番号', item: '', value: '' },
    { columnName: 'テナントID', item: '', value: '' },
    { columnName: '支払期日', item: '', value: '' },
    { columnName: '納品日', item: '', value: '' },
    { columnName: '備考', item: '', value: '' },
    { columnName: '取引先メールアドレス', item: '', value: '' },
    { columnName: '銀行名', item: '', value: '' },
    { columnName: '支店名', item: '', value: '' },
    { columnName: '科目', item: '', value: '' },
    { columnName: '口座番号', item: '', value: '' },
    { columnName: '口座名義', item: '', value: '' },
    { columnName: 'その他特記事項', item: '', value: '' },
    { columnName: '明細-項目ID', item: '', value: '' },
    { columnName: '明細-内容', item: '', value: '' },
    { columnName: '明細-数量', item: '', value: '' },
    { columnName: '明細-単位', item: '', value: '' },
    { columnName: '明細-単価', item: '', value: '' },
    { columnName: '明細-税（消費税／軽減税率／不課税／免税／非課税）', item: '', value: '' },
    { columnName: '明細-備考', item: '', value: '' }
  ]

  // ファイルデータ設定
  const fileDataSetting = {
    fieldname: 'dataFile',
    originalname: 'UTtest.csv',
    encoding: '7bit',
    mimetype: 'application/vnd.ms-excel',
    destination: filePath,
    filename: '8d73eae9e5bcd33f5863b9251a76c551',
    path: '/home/upload/8d73eae9e5bcd33f5863b9251a76c551',
    size: 567
  }

  describe('ルーティング', () => {
    test('uploadFormatのルーティングを確認', async () => {
      expect(uploadFormat.router.post).toHaveBeenCalledTimes(2)
      expect(uploadFormat.router.post).toHaveBeenLastCalledWith(
        '/cbPostConfirmIndex',
        expect.any(Function),
        uploadFormat.cbPostConfirmIndex
      )
      expect(uploadFormat.router.delete).toHaveBeenLastCalledWith(
        '/:uploadFormatId',
        expect.any(Function),
        uploadFormat.cbDeleteFormat
      )
      expect(uploadFormat.router.get).toHaveBeenLastCalledWith(
        '/:uploadFormatId',
        expect.any(Function),
        uploadFormat.cbGetCheckFormat
      )
    })
  })

  // -----------------------------------------------------------------------------------------
  // cbPostIndexの確認

  describe('cbPostIndex', () => {
    test('異常：500エラー（RequestBodyは正常、csvRemove処理中エラー）', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = {
        userContext: 'LoggedIn',
        userRole: 'dummy'
      }

      request.body = {
        ...reqBodyForCbPostIndexOn
      }
      request.user = user

      // ファイルデータを設定
      request.file = {
        fieldname: 'dataFile',
        originalname: 'UTtest.csv',
        encoding: '7bit',
        mimetype: 'application/vnd.ms-excel',
        destination: filePath,
        filename: '8d73eae9e5bcd33f5863b9251a76c551',
        path: '/test/8d73eae9e5bcd33f5863b9251a76c551',
        size: 567
      }

      const fs = require('fs')
      const uploadFilePath = path.resolve(`${filePath}${path.sep}8d73eae9e5bcd33f5863b9251a76c551`)
      fs.writeFileSync(uploadFilePath, Buffer.from(decodeURIComponent(fileData), 'base64').toString('utf8'))

      // DBからの正常なユーザデータの取得を想定する
      findOneSpy.mockReturnValue(dataValues)
      // DBからの正常な契約情報取得を想定する
      findOneSpyContracts.mockReturnValue(contractdataValues)
      // ユーザ権限チェック結果設定
      helpercheckContractStatusSpy.mockReturnValue(contractdataValues.dataValues.contractStatus)
      pathSpy.mockReturnValueOnce('/home/upload/').mockReturnValueOnce('/test/')

      // 試験実施
      await uploadFormat.cbPostIndex(request, response, next)

      // 期待結果
      // 404エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      // 500エラーがエラーハンドリング「される」
      expect(next).toHaveBeenCalledWith(error500)
    })

    test('異常：500エラー（RequestBodyは異常、csvRemove処理中エラー）', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = {
        userContext: 'LoggedIn',
        userRole: 'dummy'
      }
      request.user = user
      // ファイルデータを設定
      request.body = {
        ...reqBodyForCbPostIndexOn,
        uploadFormatNumber: 0
      }

      // ファイルデータを設定
      request.file = {
        ...fileDataSetting
      }

      const fs = require('fs')
      const uploadFilePath = path.resolve(`${filePath}${path.sep}8d73eae9e5bcd33f5863b9251a76c551`)
      fs.writeFileSync(uploadFilePath, Buffer.from(decodeURIComponent(fileData), 'base64').toString('utf8'))

      // DBからの正常なユーザデータの取得を想定する
      findOneSpy.mockReturnValue(dataValues)
      // DBからの正常な契約情報取得を想定する
      findOneSpyContracts.mockReturnValue(contractdataValues)
      // ユーザ権限チェック結果設定
      helpercheckContractStatusSpy.mockReturnValue(contractdataValues.dataValues.contractStatus)
      pathSpy.mockReturnValueOnce('/test/')

      // 試験実施
      await uploadFormat.cbPostIndex(request, response, next)

      // 期待結果
      // 404エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      // 500エラーがエラーハンドリング「される」
      expect(next).toHaveBeenCalledWith(error500)
    })

    test('正常：ヘッダあり（項目名開始行：1、データ開始行：2）', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = {
        userContext: 'LoggedIn',
        userRole: 'dummy'
      }
      request.user = user
      // ファイルデータを設定
      request.body = {
        ...reqBodyForCbPostIndexOn
      }

      // ファイルデータを設定
      request.file = {
        ...fileDataSetting
      }

      // DBからの正常なユーザデータの取得を想定する
      findOneSpy.mockReturnValue(dataValues)
      // DBからの正常な契約情報取得を想定する
      findOneSpyContracts.mockReturnValue(contractdataValues)
      // ユーザ権限チェック結果設定
      helpercheckContractStatusSpy.mockReturnValue(contractdataValues.dataValues.contractStatus)
      const fs = require('fs')
      const uploadFilePath = path.resolve(`${filePath}${path.sep}8d73eae9e5bcd33f5863b9251a76c551`)
      fs.writeFileSync(uploadFilePath, Buffer.from(decodeURIComponent(fileData), 'base64').toString('utf8'))
      // CSRF対策
      const dummyToken = 'testCsrfToken'
      request.csrfToken = jest.fn(() => {
        return dummyToken
      })

      // 試験実施
      await uploadFormat.cbPostIndex(request, response, next)

      // 期待結果
      // 404，500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      expect(next).not.toHaveBeenCalledWith(error500)
    })

    test('正常：ヘッダあり（項目名開始行：1、データ開始行：5）', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = {
        userContext: 'LoggedIn',
        userRole: 'dummy'
      }
      request.user = user
      // ファイルデータを設定
      request.body = {
        ...reqBodyForCbPostIndexOn,
        uploadFormatNumber: '1',
        defaultNumber: '5'
      }

      // ファイルデータを設定
      request.file = {
        ...fileDataSetting
      }

      // DBからの正常なユーザデータの取得を想定する
      findOneSpy.mockReturnValue(dataValues)
      // DBからの正常な契約情報取得を想定する
      findOneSpyContracts.mockReturnValue(contractdataValues)
      // ユーザ権限チェック結果設定
      helpercheckContractStatusSpy.mockReturnValue(contractdataValues.dataValues.contractStatus)

      const fs = require('fs')
      const uploadFilePath = path.resolve(`${filePath}${path.sep}8d73eae9e5bcd33f5863b9251a76c551`)
      fs.writeFileSync(
        uploadFilePath,
        Buffer.from(decodeURIComponent(fileDataDataStartRowNo5), 'base64').toString('utf8')
      )
      // CSRF対策
      const dummyToken = 'testCsrfToken'
      request.csrfToken = jest.fn(() => {
        return dummyToken
      })

      // 試験実施
      await uploadFormat.cbPostIndex(request, response, next)

      // 期待結果
      // 404，500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      expect(next).not.toHaveBeenCalledWith(error500)
    })

    test('正常：ヘッダあり（項目名開始行：3、データ開始行：4）', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = {
        userContext: 'LoggedIn',
        userRole: 'dummy'
      }
      request.user = user
      // ファイルデータを設定
      request.body = {
        ...reqBodyForCbPostIndexOn,
        uploadFormatNumber: '3',
        defaultNumber: '4'
      }

      // ファイルデータを設定
      request.file = {
        ...fileDataSetting
      }

      // DBからの正常なユーザデータの取得を想定する
      findOneSpy.mockReturnValue(dataValues)
      // DBからの正常な契約情報取得を想定する
      findOneSpyContracts.mockReturnValue(contractdataValues)
      // ユーザ権限チェック結果設定
      helpercheckContractStatusSpy.mockReturnValue(contractdataValues.dataValues.contractStatus)

      const fs = require('fs')
      const uploadFilePath = path.resolve(`${filePath}${path.sep}8d73eae9e5bcd33f5863b9251a76c551`)
      fs.writeFileSync(
        uploadFilePath,
        Buffer.from(decodeURIComponent(fileDataItemRowNo3DataStartRowNo4), 'base64').toString('utf8')
      )
      // CSRF対策
      const dummyToken = 'testCsrfToken'
      request.csrfToken = jest.fn(() => {
        return dummyToken
      })

      // 試験実施
      await uploadFormat.cbPostIndex(request, response, next)

      // 期待結果
      // 404，500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      expect(next).not.toHaveBeenCalledWith(error500)
    })

    test('正常：ヘッダあり（項目名開始行：4、データ開始行：3）', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = {
        userContext: 'LoggedIn',
        userRole: 'dummy'
      }
      request.user = user
      // ファイルデータを設定
      request.body = {
        ...reqBodyForCbPostIndexOn,
        uploadFormatNumber: '4',
        defaultNumber: '3'
      }

      // ファイルデータを設定
      request.file = {
        ...fileDataSetting
      }

      // DBからの正常なユーザデータの取得を想定する
      findOneSpy.mockReturnValue(dataValues)
      // DBからの正常な契約情報取得を想定する
      findOneSpyContracts.mockReturnValue(contractdataValues)
      // ユーザ権限チェック結果設定
      helpercheckContractStatusSpy.mockReturnValue(contractdataValues.dataValues.contractStatus)
      const fs = require('fs')
      const uploadFilePath = path.resolve(`${filePath}${path.sep}8d73eae9e5bcd33f5863b9251a76c551`)
      fs.writeFileSync(
        uploadFilePath,
        Buffer.from(decodeURIComponent(fileDataItemRowNo4DataStartRowNo3), 'base64').toString('utf8')
      )
      // CSRF対策
      const dummyToken = 'testCsrfToken'
      request.csrfToken = jest.fn(() => {
        return dummyToken
      })

      // 試験実施
      await uploadFormat.cbPostIndex(request, response, next)

      // 期待結果
      // 404，500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      expect(next).not.toHaveBeenCalledWith(error500)
    })

    test('正常：ヘッダあり（項目名開始行：5、データ開始行：1）', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = {
        userContext: 'LoggedIn',
        userRole: 'dummy'
      }
      request.user = user
      // ファイルデータを設定
      request.body = {
        ...reqBodyForCbPostIndexOn,
        uploadFormatNumber: '5',
        defaultNumber: '1'
      }

      // ファイルデータを設定
      request.file = {
        ...fileDataSetting
      }

      // DBからの正常なユーザデータの取得を想定する
      findOneSpy.mockReturnValue(dataValues)
      // DBからの正常な契約情報取得を想定する
      findOneSpyContracts.mockReturnValue(contractdataValues)
      // ユーザ権限チェック結果設定
      helpercheckContractStatusSpy.mockReturnValue(contractdataValues.dataValues.contractStatus)
      const fs = require('fs')
      const uploadFilePath = path.resolve(`${filePath}${path.sep}8d73eae9e5bcd33f5863b9251a76c551`)
      fs.writeFileSync(
        uploadFilePath,
        Buffer.from(decodeURIComponent(fileDataItemRowNo5DataStartRowNo1), 'base64').toString('utf8')
      )
      // CSRF対策
      const dummyToken = 'testCsrfToken'
      request.csrfToken = jest.fn(() => {
        return dummyToken
      })
      // 試験実施
      await uploadFormat.cbPostIndex(request, response, next)

      // 期待結果
      // 404，500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      expect(next).not.toHaveBeenCalledWith(error500)
    })

    test('正常：ヘッダあり（項目名開始行：2、データ開始行：4（空白行がある場合））', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = {
        userContext: 'LoggedIn',
        userRole: 'dummy'
      }
      request.user = user
      // ファイルデータを設定
      request.body = {
        ...reqBodyForCbPostIndexOn,
        uploadFormatNumber: '2',
        defaultNumber: '4'
      }

      // ファイルデータを設定
      request.file = {
        ...fileDataSetting
      }

      // DBからの正常なユーザデータの取得を想定する
      findOneSpy.mockReturnValue(dataValues)
      // DBからの正常な契約情報取得を想定する
      findOneSpyContracts.mockReturnValue(contractdataValues)
      // ユーザ権限チェック結果設定
      helpercheckContractStatusSpy.mockReturnValue(contractdataValues.dataValues.contractStatus)
      const fs = require('fs')
      const uploadFilePath = path.resolve(`${filePath}${path.sep}8d73eae9e5bcd33f5863b9251a76c551`)
      fs.writeFileSync(
        uploadFilePath,
        Buffer.from(decodeURIComponent(fileDataBlankItemRowNo2DataStartRowNo4), 'base64').toString('utf8')
      )
      // CSRF対策
      const dummyToken = 'testCsrfToken'
      request.csrfToken = jest.fn(() => {
        return dummyToken
      })

      // 試験実施
      await uploadFormat.cbPostIndex(request, response, next)

      // 期待結果
      // 404，500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      expect(next).not.toHaveBeenCalledWith(error500)
    })

    test('正常：ヘッダなし', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = {
        userContext: 'LoggedIn',
        userRole: 'dummy'
      }
      request.user = user
      // ファイルデータを設定
      request.body = {
        ...reqBodyForCbPostIndexOff
      }

      // ファイルデータを設定
      request.file = {
        ...fileDataSetting
      }

      // DBからの正常なユーザデータの取得を想定する
      findOneSpy.mockReturnValue(dataValues)
      // DBからの正常な契約情報取得を想定する
      findOneSpyContracts.mockReturnValue(contractdataValues)
      // ユーザ権限チェック結果設定
      helpercheckContractStatusSpy.mockReturnValue(contractdataValues.dataValues.contractStatus)
      const fs = require('fs')
      const uploadFilePath = path.resolve(`${filePath}${path.sep}8d73eae9e5bcd33f5863b9251a76c551`)
      fs.writeFileSync(uploadFilePath, Buffer.from(decodeURIComponent(fileData), 'base64').toString('utf8'))
      // CSRF対策
      const dummyToken = 'testCsrfToken'
      request.csrfToken = jest.fn(() => {
        return dummyToken
      })

      // 試験実施
      await uploadFormat.cbPostIndex(request, response, next)

      // 期待結果
      // 404，500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      expect(next).not.toHaveBeenCalledWith(error500)
    })

    test('正常：税の入力値がない場合', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = {
        userContext: 'LoggedIn',
        userRole: 'dummy'
      }
      request.user = user

      // ファイルデータを設定
      request.body = {
        ...reqBodyForCbPostIndexTaxErr
      }

      request.Referer = '/csvBasicFormat'

      // ファイルデータを設定
      request.file = {
        ...fileDataSetting
      }

      const fs = require('fs')
      const uploadFilePath = path.resolve(`${filePath}${path.sep}8d73eae9e5bcd33f5863b9251a76c551`)
      fs.writeFileSync(uploadFilePath, Buffer.from(decodeURIComponent(fileData), 'base64').toString('utf8'))

      // DBからの正常なユーザデータの取得を想定する
      findOneSpy.mockReturnValue(dataValues)
      // DBからの正常な契約情報取得を想定する
      findOneSpyContracts.mockReturnValue(contractdataValues)
      // ユーザ権限チェック結果設定
      helpercheckContractStatusSpy.mockReturnValue(contractdataValues.dataValues.contractStatus)
      // CSRF対策
      const dummyToken = 'testCsrfToken'
      request.csrfToken = jest.fn(() => {
        return dummyToken
      })

      // 試験実施
      await uploadFormat.cbPostIndex(request, response, next)

      // 期待結果
      // 404，500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      expect(next).not.toHaveBeenCalledWith(error500)
      // userContextがLoggedInになっている
      expect(request.session?.userContext).toBe('LoggedIn')
      // session.userRoleが'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'になっている
      expect(request.session?.userRole).toBe('a6a3edcd-00d9-427c-bf03-4ef0112ba16d')
      // response.renderでcsvBasicFormatが呼ばれ「る」
      expect(response.render).toHaveBeenCalledWith('uploadFormat', {
        uploadFileName: fileName,
        headerItems: headerItems,
        columnArr: columnArr,
        selectedFormatData: ['', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
        taxIds: taxIdsUndefined,
        unitIds: unitIds,
        uploadGeneral: uploadGeneral,
        checkItemNameLine: reqBodyForCbPostIndexTaxErr.checkItemNameLine,
        itemRowNo: reqBodyForCbPostIndexTaxErr.uploadFormatNumber,
        dataStartRowNo: reqBodyForCbPostIndexTaxErr.defaultNumber,
        csrfToken: dummyToken
      })
    })

    test('正常：単位の入力値がない場合', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = {
        userContext: 'LoggedIn',
        userRole: 'dummy'
      }
      request.user = user

      // ファイルデータを設定
      request.body = {
        ...reqBodyForCbPostIndexUnitErr
      }

      request.Referer = '/csvBasicFormat'

      // ファイルデータを設定
      request.file = {
        ...fileDataSetting
      }

      const fs = require('fs')
      const uploadFilePath = path.resolve(`${filePath}${path.sep}8d73eae9e5bcd33f5863b9251a76c551`)
      fs.writeFileSync(uploadFilePath, Buffer.from(decodeURIComponent(fileData), 'base64').toString('utf8'))

      // DBからの正常なユーザデータの取得を想定する
      findOneSpy.mockReturnValue(dataValues)
      // DBからの正常な契約情報取得を想定する
      findOneSpyContracts.mockReturnValue(contractdataValues)
      // ユーザ権限チェック結果設定
      helpercheckContractStatusSpy.mockReturnValue(contractdataValues.dataValues.contractStatus)
      // CSRF対策
      const dummyToken = 'testCsrfToken'
      request.csrfToken = jest.fn(() => {
        return dummyToken
      })

      // 試験実施
      await uploadFormat.cbPostIndex(request, response, next)

      // 期待結果
      // 404，500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      expect(next).not.toHaveBeenCalledWith(error500)
      // userContextがLoggedInになっている
      expect(request.session?.userContext).toBe('LoggedIn')
      // session.userRoleが'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'になっている
      expect(request.session?.userRole).toBe('a6a3edcd-00d9-427c-bf03-4ef0112ba16d')
      // response.renderでcsvBasicFormatが呼ばれ「る」
      expect(response.render).toHaveBeenCalledWith('uploadFormat', {
        uploadFileName: fileName,
        headerItems: headerItems,
        columnArr: columnArr,
        selectedFormatData: ['', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
        taxIds: taxIds,
        unitIds: unitIdsUndefined,
        uploadGeneral: uploadGeneral,
        checkItemNameLine: reqBodyForCbPostIndexUnitErr.checkItemNameLine,
        itemRowNo: reqBodyForCbPostIndexUnitErr.uploadFormatNumber,
        dataStartRowNo: reqBodyForCbPostIndexUnitErr.defaultNumber,
        csrfToken: dummyToken
      })
    })

    test('準正常：解約中', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = {
        userContext: 'LoggedIn',
        userRole: 'dummy'
      }
      request.user = user

      // ファイルデータを設定
      request.body = {
        ...reqBodyForCbPostIndexOn
      }

      // DBからの正常なユーザデータの取得を想定する
      findOneSpy.mockReturnValue(dataValues)
      // DBからの正常な契約情報取得を想定する
      findOneSpyContracts.mockReturnValue(contractInfoDatatoBeReceiptCancel)
      // ユーザ権限チェック結果設定
      helpercheckContractStatusSpy.mockReturnValue(contractdataValues.dataValues.contractStatus)
      // 試験実施
      await uploadFormat.cbPostIndex(request, response, next)

      // 期待結果
      // 404，500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      expect(next).not.toHaveBeenCalledWith(error500)

      // 解約手続き中画面が表示「される」
      expect(next).toHaveBeenCalledWith(noticeHelper.create('cancelprocedure'))
    })

    test('準正常：ヘッダありでヘッダ番号の未入力', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = {
        userContext: 'LoggedIn',
        userRole: 'dummy'
      }
      request.user = user

      // ファイルデータを設定
      request.body = {
        ...reqBodyForCbPostIndexOn,
        checkItemNameLine: 'on',
        uploadFormatNumber: ''
      }

      request.Referer = '/csvBasicFormat'

      // ファイルデータを設定
      request.file = {
        ...fileDataSetting
      }

      const fs = require('fs')
      const uploadFilePath = path.resolve(`${filePath}${path.sep}8d73eae9e5bcd33f5863b9251a76c551`)
      fs.writeFileSync(uploadFilePath, Buffer.from(decodeURIComponent(fileData), 'base64').toString('utf8'))

      // DBからの正常なユーザデータの取得を想定する
      findOneSpy.mockReturnValue(dataValues)
      // DBからの正常な契約情報取得を想定する
      findOneSpyContracts.mockReturnValue(contractdataValues)

      // ユーザ権限チェック結果設定
      helpercheckContractStatusSpy.mockReturnValue(contractdataValues.dataValues.contractStatus)

      // 試験実施
      await uploadFormat.cbPostIndex(request, response, next)

      // 期待結果
      // 404，500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      expect(next).not.toHaveBeenCalledWith(error500)
      // userContextがLoggedInになっている
      expect(request.session?.userContext).toBe('LoggedIn')
      // session.userRoleが'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'になっている
      expect(request.session?.userRole).toBe('a6a3edcd-00d9-427c-bf03-4ef0112ba16d')
      // uploadFormat.jsが遷移を拒否して、前URLに戻る
      expect(response.headers.Location).toBe('/')
      expect(response.statusCode).toBe(307)
    })

    test('準正常：ヘッダありでヘッダ番号が0の場合', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = {
        userContext: 'LoggedIn',
        userRole: 'dummy'
      }
      request.user = user

      // ファイルデータを設定
      request.body = {
        ...reqBodyForCbPostIndexOn,
        checkItemNameLine: 'on',
        uploadFormatNumber: '0'
      }

      request.Referer = '/csvBasicFormat'

      // ファイルデータを設定
      request.file = {
        ...fileDataSetting
      }

      const fs = require('fs')
      const uploadFilePath = path.resolve(`${filePath}${path.sep}8d73eae9e5bcd33f5863b9251a76c551`)
      fs.writeFileSync(uploadFilePath, Buffer.from(decodeURIComponent(fileData), 'base64').toString('utf8'))

      // DBからの正常なユーザデータの取得を想定する
      findOneSpy.mockReturnValue(dataValues)
      // DBからの正常な契約情報取得を想定する
      findOneSpyContracts.mockReturnValue(contractdataValues)
      // ユーザ権限チェック結果設定
      helpercheckContractStatusSpy.mockReturnValue(contractdataValues.dataValues.contractStatus)
      // 試験実施
      await uploadFormat.cbPostIndex(request, response, next)

      // 期待結果
      // 404，500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      expect(next).not.toHaveBeenCalledWith(error500)
      // userContextがLoggedInになっている
      expect(request.session?.userContext).toBe('LoggedIn')
      // session.userRoleが'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'になっている
      expect(request.session?.userRole).toBe('a6a3edcd-00d9-427c-bf03-4ef0112ba16d')
      // uploadFormat.jsが遷移を拒否して、前URLに戻る
      expect(response.headers.Location).toBe('/')
      expect(response.statusCode).toBe(307)
    })

    test('準正常：ヘッダありでヘッダの長さが100以上', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = {
        userContext: 'LoggedIn',
        userRole: 'dummy'
      }
      request.user = user

      // ファイルデータを設定
      request.body = {
        ...reqBodyForCbPostIndexErr
      }

      request.Referer = '/csvBasicFormat'

      // ファイルデータを設定
      request.file = {
        ...fileDataSetting
      }

      const fs = require('fs')
      const uploadFilePath = path.resolve(`${filePath}${path.sep}8d73eae9e5bcd33f5863b9251a76c551`)
      fs.writeFileSync(uploadFilePath, Buffer.from(decodeURIComponent(fileDataHeaderErr), 'base64').toString('utf8'))

      // DBからの正常なユーザデータの取得を想定する
      findOneSpy.mockReturnValue(dataValues)
      // DBからの正常な契約情報取得を想定する
      findOneSpyContracts.mockReturnValue(contractdataValues)
      // ユーザ権限チェック結果設定
      helpercheckContractStatusSpy.mockReturnValue(contractdataValues.dataValues.contractStatus)
      // 試験実施
      await uploadFormat.cbPostIndex(request, response, next)

      // 期待結果
      // 404，500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      expect(next).not.toHaveBeenCalledWith(error500)
      // userContextがLoggedInになっている
      expect(request.session?.userContext).toBe('LoggedIn')
      // session.userRoleが'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'になっている
      expect(request.session?.userRole).toBe('a6a3edcd-00d9-427c-bf03-4ef0112ba16d')
      // uploadFormat.jsが遷移を拒否して、前URLに戻る
      expect(response.headers.Location).toBe('/')
      expect(response.statusCode).toBe(307)
    })

    test('準正常：ヘッダなしデータ開始番号が0の場合', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = {
        userContext: 'LoggedIn',
        userRole: 'dummy'
      }
      request.user = user

      // ファイルデータを設定
      request.body = {
        ...reqBodyForCbPostIndexOff,
        checkItemNameLine: 'off',
        defaultNumber: '0',
        dataFileName: 'headerlessDtaNumZero.csv'
      }

      request.Referer = '/csvBasicFormat'

      // ファイルデータを設定
      request.file = {
        ...fileDataSetting
      }

      const fs = require('fs')
      const uploadFilePath = path.resolve(`${filePath}${path.sep}8d73eae9e5bcd33f5863b9251a76c551`)
      fs.writeFileSync(uploadFilePath, Buffer.from(decodeURIComponent(fileData), 'base64').toString('utf8'))

      // DBからの正常なユーザデータの取得を想定する
      findOneSpy.mockReturnValue(dataValues)
      // DBからの正常な契約情報取得を想定する
      findOneSpyContracts.mockReturnValue(contractdataValues)
      // ユーザ権限チェック結果設定
      helpercheckContractStatusSpy.mockReturnValue(contractdataValues.dataValues.contractStatus)
      // 試験実施
      await uploadFormat.cbPostIndex(request, response, next)

      // 期待結果
      // 404，500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      expect(next).not.toHaveBeenCalledWith(error500)
      // userContextがLoggedInになっている
      expect(request.session?.userContext).toBe('LoggedIn')
      // session.userRoleが'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'になっている
      expect(request.session?.userRole).toBe('a6a3edcd-00d9-427c-bf03-4ef0112ba16d')
      // uploadFormat.jsが遷移を拒否して、前URLに戻る
      expect(response.headers.Location).toBe('/')
      expect(response.statusCode).toBe(307)
    })

    test('準正常：ヘッダなしデータ開始番号がCSVの行より多いの場合', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = {
        userContext: 'LoggedIn',
        userRole: 'dummy'
      }
      request.user = user

      // ファイルデータを設定
      request.body = {
        ...reqBodyForCbPostIndexOn,
        checkItemNameLine: 'off',
        defaultNumber: '3'
      }

      request.Referer = '/csvBasicFormat'

      // ファイルデータを設定
      request.file = {
        ...fileDataSetting
      }

      const fs = require('fs')
      const uploadFilePath = path.resolve(`${filePath}${path.sep}8d73eae9e5bcd33f5863b9251a76c551`)
      fs.writeFileSync(uploadFilePath, Buffer.from(decodeURIComponent(fileData), 'base64').toString('utf8'))

      // DBからの正常なユーザデータの取得を想定する
      findOneSpy.mockReturnValue(dataValues)
      // DBからの正常な契約情報取得を想定する
      findOneSpyContracts.mockReturnValue(contractdataValues)
      // ユーザ権限チェック結果設定
      helpercheckContractStatusSpy.mockReturnValue(contractdataValues.dataValues.contractStatus)
      // 試験実施
      await uploadFormat.cbPostIndex(request, response, next)

      // 期待結果
      // 404，500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      expect(next).not.toHaveBeenCalledWith(error500)
      // userContextがLoggedInになっている
      expect(request.session?.userContext).toBe('LoggedIn')
      // session.userRoleが'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'になっている
      expect(request.session?.userRole).toBe('a6a3edcd-00d9-427c-bf03-4ef0112ba16d')
      // uploadFormat.jsが遷移を拒否して、前URLに戻る
      expect(response.headers.Location).toBe('/')
      expect(response.statusCode).toBe(307)
    })

    test('準正常：ヘッダありで明細の長さが100以上', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = {
        userContext: 'LoggedIn',
        userRole: 'dummy'
      }
      request.user = user

      // ファイルデータを設定
      request.body = {
        ...reqBodyForCbPostIndexErr,
        dataFileName: 'fileDataMesai100over.csv'
      }

      request.Referer = '/csvBasicFormat'

      // ファイルデータを設定
      request.file = {
        ...fileDataSetting
      }

      const fs = require('fs')
      const uploadFilePath = path.resolve(`${filePath}${path.sep}8d73eae9e5bcd33f5863b9251a76c551`)
      fs.writeFileSync(uploadFilePath, Buffer.from(decodeURIComponent(fileDataMesai), 'base64').toString('utf8'))

      // DBからの正常なユーザデータの取得を想定する
      findOneSpy.mockReturnValue(dataValues)
      // DBからの正常な契約情報取得を想定する
      findOneSpyContracts.mockReturnValue(contractdataValues)
      // ユーザ権限チェック結果設定
      helpercheckContractStatusSpy.mockReturnValue(contractdataValues.dataValues.contractStatus)
      // 試験実施
      await uploadFormat.cbPostIndex(request, response, next)

      // 期待結果
      // 404，500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      expect(next).not.toHaveBeenCalledWith(error500)
      // userContextがLoggedInになっている
      expect(request.session?.userContext).toBe('LoggedIn')
      // session.userRoleが'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'になっている
      expect(request.session?.userRole).toBe('a6a3edcd-00d9-427c-bf03-4ef0112ba16d')
      // uploadFormat.jsが遷移を拒否して、前URLに戻る
      expect(response.headers.Location).toBe('/')
      expect(response.statusCode).toBe(307)
      // テストファイル削除
      await uploadFormat.cbRemoveCsv(filePath, uploadFileNameErr)
    })

    test('準正常：消費税と軽減税率が重複', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = {
        userContext: 'LoggedIn',
        userRole: 'dummy'
      }
      request.user = user

      // ファイルデータを設定
      request.body = {
        ...reqBodyForCbPostIndexOn,
        keyConsumptionTax: '3',
        keyReducedTax: '3',
        keyFreeTax: '5',
        keyDutyFree: '6',
        keyExemptTax: '7'
      }

      request.Referer = '/csvBasicFormat'

      // ファイルデータを設定
      request.file = {
        ...fileDataSetting
      }

      const fs = require('fs')
      const uploadFilePath = path.resolve(`${filePath}${path.sep}8d73eae9e5bcd33f5863b9251a76c551`)
      fs.writeFileSync(uploadFilePath, Buffer.from(decodeURIComponent(fileData), 'base64').toString('utf8'))

      // DBからの正常なユーザデータの取得を想定する
      findOneSpy.mockReturnValue(dataValues)
      // DBからの正常な契約情報取得を想定する
      findOneSpyContracts.mockReturnValue(contractdataValues)
      // ユーザ権限チェック結果設定
      helpercheckContractStatusSpy.mockReturnValue(contractdataValues.dataValues.contractStatus)
      // 試験実施
      await uploadFormat.cbPostIndex(request, response, next)

      // 期待結果
      // 404，500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      expect(next).not.toHaveBeenCalledWith(error500)
      // userContextがLoggedInになっている
      expect(request.session?.userContext).toBe('LoggedIn')
      // session.userRoleが'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'になっている
      expect(request.session?.userRole).toBe('a6a3edcd-00d9-427c-bf03-4ef0112ba16d')
      // uploadFormat.jsが遷移を拒否して、前URLに戻る
      expect(response.headers.Location).toBe('/')
      expect(response.statusCode).toBe(307)
    })

    test('準正常：消費税と不課税が重複', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = {
        userContext: 'LoggedIn',
        userRole: 'dummy'
      }
      request.user = user

      // ファイルデータを設定
      request.body = {
        ...reqBodyForCbPostIndexOn,
        keyConsumptionTax: '3',
        keyReducedTax: '4',
        keyFreeTax: '3',
        keyDutyFree: '6',
        keyExemptTax: '7'
      }

      request.Referer = '/csvBasicFormat'

      // ファイルデータを設定
      request.file = {
        ...fileDataSetting
      }

      const fs = require('fs')
      const uploadFilePath = path.resolve(`${filePath}${path.sep}8d73eae9e5bcd33f5863b9251a76c551`)
      fs.writeFileSync(uploadFilePath, Buffer.from(decodeURIComponent(fileDataHeaderErr), 'base64').toString('utf8'))

      // DBからの正常なユーザデータの取得を想定する
      findOneSpy.mockReturnValue(dataValues)
      // DBからの正常な契約情報取得を想定する
      findOneSpyContracts.mockReturnValue(contractdataValues)
      // ユーザ権限チェック結果設定
      helpercheckContractStatusSpy.mockReturnValue(contractdataValues.dataValues.contractStatus)
      // 試験実施
      await uploadFormat.cbPostIndex(request, response, next)

      // 期待結果
      // 404，500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      expect(next).not.toHaveBeenCalledWith(error500)
      // userContextがLoggedInになっている
      expect(request.session?.userContext).toBe('LoggedIn')
      // session.userRoleが'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'になっている
      expect(request.session?.userRole).toBe('a6a3edcd-00d9-427c-bf03-4ef0112ba16d')
      // uploadFormat.jsが遷移を拒否して、前URLに戻る
      expect(response.headers.Location).toBe('/')
      expect(response.statusCode).toBe(307)
    })

    test('準正常：消費税と免税が重複', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = {
        userContext: 'LoggedIn',
        userRole: 'dummy'
      }
      request.user = user

      // ファイルデータを設定
      request.body = {
        ...reqBodyForCbPostIndexOn,
        keyConsumptionTax: '3',
        keyReducedTax: '4',
        keyFreeTax: '5',
        keyDutyFree: '3',
        keyExemptTax: '7'
      }

      request.Referer = '/csvBasicFormat'

      // ファイルデータを設定
      request.file = {
        ...fileDataSetting
      }

      const fs = require('fs')
      const uploadFilePath = path.resolve(`${filePath}${path.sep}8d73eae9e5bcd33f5863b9251a76c551`)
      fs.writeFileSync(uploadFilePath, Buffer.from(decodeURIComponent(fileDataHeaderErr), 'base64').toString('utf8'))

      // DBからの正常なユーザデータの取得を想定する
      findOneSpy.mockReturnValue(dataValues)
      // DBからの正常な契約情報取得を想定する
      findOneSpyContracts.mockReturnValue(contractdataValues)
      // ユーザ権限チェック結果設定
      helpercheckContractStatusSpy.mockReturnValue(contractdataValues.dataValues.contractStatus)
      // 試験実施
      await uploadFormat.cbPostIndex(request, response, next)

      // 期待結果
      // 404，500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      expect(next).not.toHaveBeenCalledWith(error500)
      // userContextがLoggedInになっている
      expect(request.session?.userContext).toBe('LoggedIn')
      // session.userRoleが'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'になっている
      expect(request.session?.userRole).toBe('a6a3edcd-00d9-427c-bf03-4ef0112ba16d')
      // uploadFormat.jsが遷移を拒否して、前URLに戻る
      expect(response.headers.Location).toBe('/')
      expect(response.statusCode).toBe(307)
    })

    test('準正常：消費税と非課税が重複', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = {
        userContext: 'LoggedIn',
        userRole: 'dummy'
      }
      request.user = user

      // ファイルデータを設定
      request.body = {
        ...reqBodyForCbPostIndexOn,
        keyConsumptionTax: '3',
        keyReducedTax: '4',
        keyFreeTax: '5',
        keyDutyFree: '6',
        keyExemptTax: '3'
      }

      request.Referer = '/csvBasicFormat'

      // ファイルデータを設定
      request.file = {
        ...fileDataSetting
      }

      const fs = require('fs')
      const uploadFilePath = path.resolve(`${filePath}${path.sep}8d73eae9e5bcd33f5863b9251a76c551`)
      fs.writeFileSync(uploadFilePath, Buffer.from(decodeURIComponent(fileDataHeaderErr), 'base64').toString('utf8'))

      // DBからの正常なユーザデータの取得を想定する
      findOneSpy.mockReturnValue(dataValues)
      // DBからの正常な契約情報取得を想定する
      findOneSpyContracts.mockReturnValue(contractdataValues)
      // ユーザ権限チェック結果設定
      helpercheckContractStatusSpy.mockReturnValue(contractdataValues.dataValues.contractStatus)
      // 試験実施
      await uploadFormat.cbPostIndex(request, response, next)

      // 期待結果
      // 404，500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      expect(next).not.toHaveBeenCalledWith(error500)
      // userContextがLoggedInになっている
      expect(request.session?.userContext).toBe('LoggedIn')
      // session.userRoleが'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'になっている
      expect(request.session?.userRole).toBe('a6a3edcd-00d9-427c-bf03-4ef0112ba16d')
      // uploadFormat.jsが遷移を拒否して、前URLに戻る
      expect(response.headers.Location).toBe('/')
      expect(response.statusCode).toBe(307)
    })

    test('準正常：軽減税率と不課税が重複', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = {
        userContext: 'LoggedIn',
        userRole: 'dummy'
      }
      request.user = user

      // ファイルデータを設定
      request.body = {
        ...reqBodyForCbPostIndexOn,
        keyConsumptionTax: '3',
        keyReducedTax: '4',
        keyFreeTax: '4',
        keyDutyFree: '6',
        keyExemptTax: '7'
      }

      request.Referer = '/csvBasicFormat'

      // ファイルデータを設定
      request.file = {
        ...fileDataSetting
      }

      const fs = require('fs')
      const uploadFilePath = path.resolve(`${filePath}${path.sep}8d73eae9e5bcd33f5863b9251a76c551`)
      fs.writeFileSync(uploadFilePath, Buffer.from(decodeURIComponent(fileDataHeaderErr), 'base64').toString('utf8'))

      // DBからの正常なユーザデータの取得を想定する
      findOneSpy.mockReturnValue(dataValues)
      // DBからの正常な契約情報取得を想定する
      findOneSpyContracts.mockReturnValue(contractdataValues)
      // ユーザ権限チェック結果設定
      helpercheckContractStatusSpy.mockReturnValue(contractdataValues.dataValues.contractStatus)
      // 試験実施
      await uploadFormat.cbPostIndex(request, response, next)

      // 期待結果
      // 404，500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      expect(next).not.toHaveBeenCalledWith(error500)
      // userContextがLoggedInになっている
      expect(request.session?.userContext).toBe('LoggedIn')
      // session.userRoleが'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'になっている
      expect(request.session?.userRole).toBe('a6a3edcd-00d9-427c-bf03-4ef0112ba16d')
      // uploadFormat.jsが遷移を拒否して、前URLに戻る
      expect(response.headers.Location).toBe('/')
      expect(response.statusCode).toBe(307)
    })

    test('準正常：軽減税率と免税が重複', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = {
        userContext: 'LoggedIn',
        userRole: 'dummy'
      }
      request.user = user

      // ファイルデータを設定
      request.body = {
        ...reqBodyForCbPostIndexOn,
        keyConsumptionTax: '3',
        keyReducedTax: '4',
        keyFreeTax: '5',
        keyDutyFree: '4',
        keyExemptTax: '7'
      }

      request.Referer = '/csvBasicFormat'

      // ファイルデータを設定
      request.file = {
        ...fileDataSetting
      }

      const fs = require('fs')
      const uploadFilePath = path.resolve(`${filePath}${path.sep}8d73eae9e5bcd33f5863b9251a76c551`)
      fs.writeFileSync(uploadFilePath, Buffer.from(decodeURIComponent(fileDataHeaderErr), 'base64').toString('utf8'))

      // DBからの正常なユーザデータの取得を想定する
      findOneSpy.mockReturnValue(dataValues)
      // DBからの正常な契約情報取得を想定する
      findOneSpyContracts.mockReturnValue(contractdataValues)
      // ユーザ権限チェック結果設定
      helpercheckContractStatusSpy.mockReturnValue(contractdataValues.dataValues.contractStatus)
      // 試験実施
      await uploadFormat.cbPostIndex(request, response, next)

      // 期待結果
      // 404，500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      expect(next).not.toHaveBeenCalledWith(error500)
      // userContextがLoggedInになっている
      expect(request.session?.userContext).toBe('LoggedIn')
      // session.userRoleが'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'になっている
      expect(request.session?.userRole).toBe('a6a3edcd-00d9-427c-bf03-4ef0112ba16d')
      // uploadFormat.jsが遷移を拒否して、前URLに戻る
      expect(response.headers.Location).toBe('/')
      expect(response.statusCode).toBe(307)
    })

    test('準正常：軽減税率と非課税が重複', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = {
        userContext: 'LoggedIn',
        userRole: 'dummy'
      }
      request.user = user

      // ファイルデータを設定
      request.body = {
        ...reqBodyForCbPostIndexOn,
        keyConsumptionTax: '3',
        keyReducedTax: '4',
        keyFreeTax: '5',
        keyDutyFree: '6',
        keyExemptTax: '4'
      }

      request.Referer = '/csvBasicFormat'

      // ファイルデータを設定
      request.file = {
        ...fileDataSetting
      }

      const fs = require('fs')
      const uploadFilePath = path.resolve(`${filePath}${path.sep}8d73eae9e5bcd33f5863b9251a76c551`)
      fs.writeFileSync(uploadFilePath, Buffer.from(decodeURIComponent(fileDataHeaderErr), 'base64').toString('utf8'))

      // DBからの正常なユーザデータの取得を想定する
      findOneSpy.mockReturnValue(dataValues)
      // DBからの正常な契約情報取得を想定する
      findOneSpyContracts.mockReturnValue(contractdataValues)
      // ユーザ権限チェック結果設定
      helpercheckContractStatusSpy.mockReturnValue(contractdataValues.dataValues.contractStatus)
      // 試験実施
      await uploadFormat.cbPostIndex(request, response, next)

      // 期待結果
      // 404，500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      expect(next).not.toHaveBeenCalledWith(error500)
      // userContextがLoggedInになっている
      expect(request.session?.userContext).toBe('LoggedIn')
      // session.userRoleが'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'になっている
      expect(request.session?.userRole).toBe('a6a3edcd-00d9-427c-bf03-4ef0112ba16d')
      // uploadFormat.jsが遷移を拒否して、前URLに戻る
      expect(response.headers.Location).toBe('/')
      expect(response.statusCode).toBe(307)
    })

    test('準正常：不課税と免税が重複', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = {
        userContext: 'LoggedIn',
        userRole: 'dummy'
      }
      request.user = user

      // ファイルデータを設定
      request.body = {
        ...reqBodyForCbPostIndexOn,
        keyConsumptionTax: '3',
        keyReducedTax: '4',
        keyFreeTax: '5',
        keyDutyFree: '5',
        keyExemptTax: '7'
      }

      request.Referer = '/csvBasicFormat'

      // ファイルデータを設定
      request.file = {
        ...fileDataSetting
      }

      const fs = require('fs')
      const uploadFilePath = path.resolve(`${filePath}${path.sep}8d73eae9e5bcd33f5863b9251a76c551`)
      fs.writeFileSync(uploadFilePath, Buffer.from(decodeURIComponent(fileDataHeaderErr), 'base64').toString('utf8'))

      // DBからの正常なユーザデータの取得を想定する
      findOneSpy.mockReturnValue(dataValues)
      // DBからの正常な契約情報取得を想定する
      findOneSpyContracts.mockReturnValue(contractdataValues)
      // ユーザ権限チェック結果設定
      helpercheckContractStatusSpy.mockReturnValue(contractdataValues.dataValues.contractStatus)
      // 試験実施
      await uploadFormat.cbPostIndex(request, response, next)

      // 期待結果
      // 404，500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      expect(next).not.toHaveBeenCalledWith(error500)
      // userContextがLoggedInになっている
      expect(request.session?.userContext).toBe('LoggedIn')
      // session.userRoleが'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'になっている
      expect(request.session?.userRole).toBe('a6a3edcd-00d9-427c-bf03-4ef0112ba16d')
      // uploadFormat.jsが遷移を拒否して、前URLに戻る
      expect(response.headers.Location).toBe('/')
      expect(response.statusCode).toBe(307)
    })

    test('準正常：不課税と非課税が重複', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = {
        userContext: 'LoggedIn',
        userRole: 'dummy'
      }
      request.user = user

      // ファイルデータを設定
      request.body = {
        ...reqBodyForCbPostIndexOn,
        keyConsumptionTax: '3',
        keyReducedTax: '4',
        keyFreeTax: '5',
        keyDutyFree: '6',
        keyExemptTax: '5'
      }

      request.Referer = '/csvBasicFormat'

      // ファイルデータを設定
      request.file = {
        ...fileDataSetting
      }

      const fs = require('fs')
      const uploadFilePath = path.resolve(`${filePath}${path.sep}8d73eae9e5bcd33f5863b9251a76c551`)
      fs.writeFileSync(uploadFilePath, Buffer.from(decodeURIComponent(fileDataHeaderErr), 'base64').toString('utf8'))

      // DBからの正常なユーザデータの取得を想定する
      findOneSpy.mockReturnValue(dataValues)
      // DBからの正常な契約情報取得を想定する
      findOneSpyContracts.mockReturnValue(contractdataValues)
      // ユーザ権限チェック結果設定
      helpercheckContractStatusSpy.mockReturnValue(contractdataValues.dataValues.contractStatus)
      // 試験実施
      await uploadFormat.cbPostIndex(request, response, next)

      // 期待結果
      // 404，500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      expect(next).not.toHaveBeenCalledWith(error500)
      // userContextがLoggedInになっている
      expect(request.session?.userContext).toBe('LoggedIn')
      // session.userRoleが'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'になっている
      expect(request.session?.userRole).toBe('a6a3edcd-00d9-427c-bf03-4ef0112ba16d')
      // uploadFormat.jsが遷移を拒否して、前URLに戻る
      expect(response.headers.Location).toBe('/')
      expect(response.statusCode).toBe(307)
    })

    test('準正常：免税と非課税が重複', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = {
        userContext: 'LoggedIn',
        userRole: 'dummy'
      }
      request.user = user

      // ファイルデータを設定
      request.body = {
        ...reqBodyForCbPostIndexOn,
        keyConsumptionTax: '3',
        keyReducedTax: '4',
        keyFreeTax: '5',
        keyDutyFree: '6',
        keyExemptTax: '6'
      }

      request.Referer = '/csvBasicFormat'

      // ファイルデータを設定
      request.file = {
        ...fileDataSetting
      }

      const fs = require('fs')
      const uploadFilePath = path.resolve(`${filePath}${path.sep}8d73eae9e5bcd33f5863b9251a76c551`)
      fs.writeFileSync(uploadFilePath, Buffer.from(decodeURIComponent(fileDataHeaderErr), 'base64').toString('utf8'))

      // DBからの正常なユーザデータの取得を想定する
      findOneSpy.mockReturnValue(dataValues)
      // DBからの正常な契約情報取得を想定する
      findOneSpyContracts.mockReturnValue(contractdataValues)
      // ユーザ権限チェック結果設定
      helpercheckContractStatusSpy.mockReturnValue(contractdataValues.dataValues.contractStatus)
      // 試験実施
      await uploadFormat.cbPostIndex(request, response, next)

      // 期待結果
      // 404，500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      expect(next).not.toHaveBeenCalledWith(error500)
      // userContextがLoggedInになっている
      expect(request.session?.userContext).toBe('LoggedIn')
      // session.userRoleが'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'になっている
      expect(request.session?.userRole).toBe('a6a3edcd-00d9-427c-bf03-4ef0112ba16d')
      // uploadFormat.jsが遷移を拒否して、前URLに戻る
      expect(response.headers.Location).toBe('/')
      expect(response.statusCode).toBe(307)
    })

    test('準正常：税の100文字', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = {
        userContext: 'LoggedIn',
        userRole: 'dummy'
      }
      request.user = user

      // ファイルデータを設定
      request.body = {
        ...reqBodyForCbPostIndexOn,
        keyConsumptionTax:
          'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
      }

      request.Referer = '/csvBasicFormat'

      // ファイルデータを設定
      request.file = {
        ...fileDataSetting
      }

      const fs = require('fs')
      const uploadFilePath = path.resolve(`${filePath}${path.sep}8d73eae9e5bcd33f5863b9251a76c551`)
      fs.writeFileSync(uploadFilePath, Buffer.from(decodeURIComponent(fileData), 'base64').toString('utf8'))

      // DBからの正常なユーザデータの取得を想定する
      findOneSpy.mockReturnValue(dataValues)
      // DBからの正常な契約情報取得を想定する
      findOneSpyContracts.mockReturnValue(contractdataValues)
      // ユーザ権限チェック結果設定
      helpercheckContractStatusSpy.mockReturnValue(contractdataValues.dataValues.contractStatus)
      // CSRF対策
      const dummyToken = 'testCsrfToken'
      request.csrfToken = jest.fn(() => {
        return dummyToken
      })

      // 試験実施
      await uploadFormat.cbPostIndex(request, response, next)

      // 期待結果
      // 404，500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      expect(next).not.toHaveBeenCalledWith(error500)
      // userContextがLoggedInになっている
      expect(request.session?.userContext).toBe('LoggedIn')
      // session.userRoleが'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'になっている
      expect(request.session?.userRole).toBe('a6a3edcd-00d9-427c-bf03-4ef0112ba16d')
      // response.renderでcsvBasicFormatが呼ばれ「る」
      expect(response.render).toHaveBeenCalledWith('uploadFormat', {
        uploadFileName: fileName,
        headerItems: headerItems,
        columnArr: columnArr,
        selectedFormatData: ['', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
        taxIds: taxIds100,
        unitIds: unitIds,
        uploadGeneral: uploadGeneral,
        checkItemNameLine: reqBodyForCbPostIndexOn.checkItemNameLine,
        itemRowNo: reqBodyForCbPostIndexOn.uploadFormatNumber,
        dataStartRowNo: reqBodyForCbPostIndexOn.defaultNumber,
        csrfToken: dummyToken
      })
    })

    test('準正常：税の100文字以上', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = {
        userContext: 'LoggedIn',
        userRole: 'dummy'
      }
      request.user = user

      // ファイルデータを設定
      request.body = {
        ...reqBodyForCbPostIndexOn,
        keyConsumptionTax:
          'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
      }

      request.Referer = '/csvBasicFormat'

      // ファイルデータを設定
      request.file = {
        ...fileDataSetting
      }

      const fs = require('fs')
      const uploadFilePath = path.resolve(`${filePath}${path.sep}8d73eae9e5bcd33f5863b9251a76c551`)
      fs.writeFileSync(uploadFilePath, Buffer.from(decodeURIComponent(fileData), 'base64').toString('utf8'))

      // DBからの正常なユーザデータの取得を想定する
      findOneSpy.mockReturnValue(dataValues)
      // DBからの正常な契約情報取得を想定する
      findOneSpyContracts.mockReturnValue(contractdataValues)
      // ユーザ権限チェック結果設定
      helpercheckContractStatusSpy.mockReturnValue(contractdataValues.dataValues.contractStatus)
      // 試験実施
      await uploadFormat.cbPostIndex(request, response, next)

      // 期待結果
      // 404，500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      expect(next).not.toHaveBeenCalledWith(error500)
      // userContextがLoggedInになっている
      expect(request.session?.userContext).toBe('LoggedIn')
      // session.userRoleが'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'になっている
      expect(request.session?.userRole).toBe('a6a3edcd-00d9-427c-bf03-4ef0112ba16d')
      // uploadFormat.jsが遷移を拒否して、前URLに戻る
      expect(response.headers.Location).toBe('/')
      expect(response.statusCode).toBe(307)
    })

    test('準正常：単位が重複', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = {
        userContext: 'LoggedIn',
        userRole: 'dummy'
      }
      request.user = user

      // ファイルデータを設定
      request.body = {
        ...reqBodyForCbPostIndexOn,
        keyManMonth: '8',
        keyBottle: '8'
      }

      request.Referer = '/csvBasicFormat'

      // ファイルデータを設定
      request.file = {
        ...fileDataSetting
      }

      const fs = require('fs')
      const uploadFilePath = path.resolve(`${filePath}${path.sep}8d73eae9e5bcd33f5863b9251a76c551`)
      fs.writeFileSync(uploadFilePath, Buffer.from(decodeURIComponent(fileData), 'base64').toString('utf8'))

      // DBからの正常なユーザデータの取得を想定する
      findOneSpy.mockReturnValue(dataValues)
      // DBからの正常な契約情報取得を想定する
      findOneSpyContracts.mockReturnValue(contractdataValues)
      // ユーザ権限チェック結果設定
      helpercheckContractStatusSpy.mockReturnValue(contractdataValues.dataValues.contractStatus)
      // 試験実施
      await uploadFormat.cbPostIndex(request, response, next)

      // 期待結果
      // 404，500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      expect(next).not.toHaveBeenCalledWith(error500)
      // userContextがLoggedInになっている
      expect(request.session?.userContext).toBe('LoggedIn')
      // session.userRoleが'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'になっている
      expect(request.session?.userRole).toBe('a6a3edcd-00d9-427c-bf03-4ef0112ba16d')
      // uploadFormat.jsが遷移を拒否して、前URLに戻る
      expect(response.headers.Location).toBe('/')
      expect(response.statusCode).toBe(307)
    })

    test('準正常：単位の100文字', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = {
        userContext: 'LoggedIn',
        userRole: 'dummy'
      }
      request.user = user

      // ファイルデータを設定
      request.body = {
        ...reqBodyForCbPostIndexOn,
        keyManMonth:
          'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
      }

      request.Referer = '/csvBasicFormat'

      // ファイルデータを設定
      request.file = {
        ...fileDataSetting
      }

      const fs = require('fs')
      const uploadFilePath = path.resolve(`${filePath}${path.sep}8d73eae9e5bcd33f5863b9251a76c551`)
      fs.writeFileSync(uploadFilePath, Buffer.from(decodeURIComponent(fileData), 'base64').toString('utf8'))

      // DBからの正常なユーザデータの取得を想定する
      findOneSpy.mockReturnValue(dataValues)
      // DBからの正常な契約情報取得を想定する
      findOneSpyContracts.mockReturnValue(contractdataValues)
      // ユーザ権限チェック結果設定
      helpercheckContractStatusSpy.mockReturnValue(contractdataValues.dataValues.contractStatus)
      // CSRF対策
      const dummyToken = 'testCsrfToken'
      request.csrfToken = jest.fn(() => {
        return dummyToken
      })

      // 試験実施
      await uploadFormat.cbPostIndex(request, response, next)

      // 期待結果
      // 404，500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      expect(next).not.toHaveBeenCalledWith(error500)
      // userContextがLoggedInになっている
      expect(request.session?.userContext).toBe('LoggedIn')
      // session.userRoleが'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'になっている
      expect(request.session?.userRole).toBe('a6a3edcd-00d9-427c-bf03-4ef0112ba16d')
      // response.renderでcsvBasicFormatが呼ばれ「る」
      expect(response.render).toHaveBeenCalledWith('uploadFormat', {
        uploadFileName: fileName,
        headerItems: headerItems,
        columnArr: columnArr,
        selectedFormatData: ['', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
        taxIds: taxIds,
        unitIds: unitIds100,
        uploadGeneral: uploadGeneral,
        checkItemNameLine: reqBodyForCbPostIndexOn.checkItemNameLine,
        itemRowNo: reqBodyForCbPostIndexOn.uploadFormatNumber,
        dataStartRowNo: reqBodyForCbPostIndexOn.defaultNumber,
        csrfToken: dummyToken
      })
    })

    test('準正常：単位の100文字2', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = {
        userContext: 'LoggedIn',
        userRole: 'dummy'
      }
      request.user = user

      // ファイルデータを設定
      request.body = {
        ...reqBodyForCbPostIndexOn,
        keyManMonth:
          'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
      }

      request.Referer = '/csvBasicFormat'

      // ファイルデータを設定
      request.file = {
        ...fileDataSetting
      }

      const fs = require('fs')
      const uploadFilePath = path.resolve(`${filePath}${path.sep}8d73eae9e5bcd33f5863b9251a76c551`)
      fs.writeFileSync(uploadFilePath, Buffer.from(decodeURIComponent(fileData), 'base64').toString('utf8'))

      // DBからの正常なユーザデータの取得を想定する
      findOneSpy.mockReturnValue(dataValues)
      // DBからの正常な契約情報取得を想定する
      findOneSpyContracts.mockReturnValue(contractdataValues)
      // ユーザ権限チェック結果設定
      helpercheckContractStatusSpy.mockReturnValue(contractdataValues.dataValues.contractStatus)
      // 試験実施
      await uploadFormat.cbPostIndex(request, response, next)

      // 期待結果
      // 404，500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      expect(next).not.toHaveBeenCalledWith(error500)
      // userContextがLoggedInになっている
      expect(request.session?.userContext).toBe('LoggedIn')
      // session.userRoleが'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'になっている
      expect(request.session?.userRole).toBe('a6a3edcd-00d9-427c-bf03-4ef0112ba16d')
      // uploadFormat.jsが遷移を拒否して、前URLに戻る
      expect(response.headers.Location).toBe('/')
      expect(response.statusCode).toBe(307)
    })

    test('異常：500エラー（session、userIdエラー）', async () => {
      // 準備
      // requestのsession,userIdに不正な値を入れる
      request.session = null

      request.user = null
      // DBからのユーザデータの取得ができなかった(null)場合を想定する
      findOneSpy.mockReturnValue(null)
      findOneSpyContracts.mockReturnValue(contractdataValues)
      // ユーザ権限チェック結果設定
      helpercheckContractStatusSpy.mockReturnValue(contractdataValues.dataValues.contractStatus)
      // 試験実施
      await uploadFormat.cbPostIndex(request, response, next)

      // 期待結果
      // 404エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      // 500エラーがエラーハンドリング「される」
      expect(next).toHaveBeenCalledWith(error500)
    })

    test('異常：500エラー（DBからユーザ取得エラー）', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = {
        userContext: 'LoggedIn',
        userRole: 'dummy'
      }
      request.user = user
      // DBからのユーザデータの取得ができなかった(null)場合を想定する
      findOneSpy.mockReturnValue(null)
      findOneSpyContracts.mockReturnValue(contractdataValues)
      // ユーザ権限チェック結果設定
      helpercheckContractStatusSpy.mockReturnValue(contractdataValues.dataValues.contractStatus)
      // 試験実施
      await uploadFormat.cbPostIndex(request, response, next)

      // 期待結果
      // 404エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      // 500エラーがエラーハンドリング「される」
      expect(next).toHaveBeenCalledWith(error500)
    })

    test('異常：404エラーDBから取得したユーザのuserStatusが0以外の場合', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = {
        userContext: 'NotLoggedIn',
        userRole: 'dummy'
      }
      request.user = user
      // DBから取得したユーザデータのuserStatusが0以外の場合を想定する
      findOneSpy.mockReturnValue(dataValuesStatuserr)
      findOneSpyContracts.mockReturnValue(contractdataValues)
      // ユーザ権限チェック結果設定
      helpercheckContractStatusSpy.mockReturnValue(contractdataValues.dataValues.contractStatus)
      // 試験実施
      await uploadFormat.cbPostIndex(request, response, next)

      // 期待結果
      // 404エラーがエラーハンドリング「される」
      expect(next).toHaveBeenCalledWith(error404)
    })

    test('異常：500エラー（ContractStatusが取得されない場合）', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = {
        userContext: 'LoggedIn',
        userRole: 'dummy'
      }
      request.user = user

      // DBからの正常なユーザデータの取得を想定する
      findOneSpy.mockReturnValue(dataValues)
      // DBからの契約情報を取得出来なかったことを想定する
      findOneSpyContracts.mockReturnValue(null)
      // 試験実施
      await uploadFormat.cbPostIndex(request, response, next)

      // 期待結果
      // 404，500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      // 500エラーがエラーハンドリング「される」
      expect(next).toHaveBeenCalledWith(error500)
    })

    test('異常：500エラー（不正なContractStatus）', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = {
        userContext: 'LoggedIn',
        userRole: 'dummy'
      }
      request.user = user

      // DBからの正常なユーザデータの取得を想定する
      findOneSpy.mockReturnValue(dataValues)
      // DBからの不正な契約情報取得を想定する
      findOneSpyContracts.mockReturnValue(contractdataValues4)
      // ユーザ権限チェック結果設定
      helpercheckContractStatusSpy.mockReturnValue(contractdataValues4.dataValues.contractStatus)

      // 試験実施
      await uploadFormat.cbPostIndex(request, response, next)

      // 期待結果
      // 404エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      // 500エラーがエラーハンドリング「される」
      expect(next).toHaveBeenCalledWith(error500)
    })

    test('異常：500エラー（読み込むファイルがない場合）', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = {
        userContext: 'LoggedIn',
        userRole: 'dummy'
      }
      request.user = user
      // ファイルデータを設定
      request.body = {
        ...reqBodyForCbPostIndexOn
      }

      // ファイルデータを設定
      request.file = {
        ...fileDataSetting
      }

      const fs = require('fs')
      const uploadFilePath = path.resolve(`${filePath}${path.sep}8d73eae9e5bcd33f5863b9251a76c551`)
      fs.writeFileSync(uploadFilePath, Buffer.from(decodeURIComponent(fileData), 'base64').toString('utf8'))

      // DBからの正常なユーザデータの取得を想定する
      findOneSpy.mockReturnValue(dataValues)
      // DBからの正常な契約情報取得を想定する
      findOneSpyContracts.mockReturnValue(contractdataValues)

      pathSpy.mockReturnValueOnce('/test')

      // ユーザ権限チェック結果設定
      helpercheckContractStatusSpy.mockReturnValue(contractdataValues.dataValues.contractStatus)

      // 試験実施
      await uploadFormat.cbPostIndex(request, response, next)

      // 期待結果
      // 404エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      // 500エラーがエラーハンドリング「される」
      expect(next).toHaveBeenCalledWith(error500)
    })
  })

  // -----------------------------------------------------------------------------------------
  // cbPostConfirmIndexの確認

  describe('cbPostConfirmIndex', () => {
    test('正常:ヘッダあり', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = {
        userContext: 'LoggedIn',
        userRole: 'dummy'
      }
      request.user = user
      // ファイルデータを設定
      request.body = {
        ...reqBodyForCbPostIndexOn
      }

      // DBからの正常なユーザデータの取得を想定する
      findOneSpy.mockReturnValue(dataValues)
      // DBからの正常な契約情報取得を想定する
      findOneSpyContracts.mockReturnValue(contractdataValues)
      // ユーザ権限チェック結果設定
      helpercheckContractStatusSpy.mockReturnValue(contractdataValues.dataValues.contractStatus)
      // request.flashは関数なのでモックする。
      request.flash = jest.fn()

      // 試験実施
      await uploadFormat.cbPostConfirmIndex(request, response, next)

      // 期待結果
      // 404，500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      expect(next).not.toHaveBeenCalledWith(error500)
      // userContextがLoggedInになっている
      expect(request.session?.userContext).toBe('LoggedIn')
      // session.userRoleが'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'になっている
      expect(request.session?.userRole).toBe('a6a3edcd-00d9-427c-bf03-4ef0112ba16d')
      // request.flashが呼ばれ「る」
      expect(request.flash).toHaveBeenCalledWith('info', 'フォーマットの登録が完了しました。')
      // response.renderでcsvConfirmFormatが呼ばれ「る」
      expect(response.redirect).toHaveBeenCalledWith(303, '/uploadFormatList')
    })

    test('正常:ヘッダなし', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = {
        userContext: 'LoggedIn',
        userRole: 'dummy'
      }
      request.user = user
      // ファイルデータを設定
      request.body = {
        ...reqBodyForCbPostIndexOff
      }

      // DBからの正常なユーザデータの取得を想定する
      findOneSpy.mockReturnValue(dataValues)
      // DBからの正常な契約情報取得を想定する
      findOneSpyContracts.mockReturnValue(contractdataValues)
      // ユーザ権限チェック結果設定
      helpercheckContractStatusSpy.mockReturnValue(contractdataValues.dataValues.contractStatus)
      // request.flashは関数なのでモックする。
      request.flash = jest.fn()

      // 試験実施
      await uploadFormat.cbPostConfirmIndex(request, response, next)

      // 期待結果
      // 404，500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      expect(next).not.toHaveBeenCalledWith(error500)
      // userContextがLoggedInになっている
      expect(request.session?.userContext).toBe('LoggedIn')
      // session.userRoleが'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'になっている
      expect(request.session?.userRole).toBe('a6a3edcd-00d9-427c-bf03-4ef0112ba16d')
      // request.flashが呼ばれ「る」
      expect(request.flash).toHaveBeenCalledWith('info', 'フォーマットの登録が完了しました。')
      // response.renderでcsvConfirmFormatが呼ばれ「る」
      expect(response.redirect).toHaveBeenCalledWith(303, '/uploadFormatList')
    })

    test('正常:DBにuploadData保存', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = {
        userContext: 'LoggedIn',
        userRole: 'dummy'
      }
      request.user = user
      // ファイルデータを設定
      request.body = {
        ...reqBodyForCbPostIndexOn,
        itemRowNo: 1,
        dataStartRowNo: 2
      }

      // DBからの正常なユーザデータの取得を想定する
      findOneSpy.mockReturnValue(dataValues)
      // DBからの正常な契約情報取得を想定する
      findOneSpyContracts.mockReturnValue(contractdataValues2)
      // ユーザ権限チェック結果設定
      helpercheckContractStatusSpy.mockReturnValue(contractdataValues2.dataValues.contractStatus)
      // request.flashは関数なのでモックする。
      request.flash = jest.fn()

      // 試験実施
      await uploadFormat.cbPostConfirmIndex(request, response, next)

      // 期待結果
      // 404，500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      expect(next).not.toHaveBeenCalledWith(error500)
      // userContextがLoggedInになっている
      expect(request.session?.userContext).toBe('LoggedIn')
      // session.userRoleが'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'になっている
      expect(request.session?.userRole).toBe('a6a3edcd-00d9-427c-bf03-4ef0112ba16d')
      // response.renderでcsvConfirmFormatが呼ばれ「る」
      // 0bcedab8-de85-4b82-bf61-34fbb59ca883
      let checkUploadFormatData
      UploadFormatDB.forEach((item) => {
        if (item.contractId === contractdataValues2.dataValues.contractId) {
          checkUploadFormatData = item
        }
      })
      expect(checkUploadFormatData.uploadData).toBe(
        '発行日,請求書番号,テナントID,支払期日,納品日,備考,取引先メールアドレス,銀行名,支店名,科目,口座番号,口座名義,その他特記事項,明細-項目ID,明細-内容,明細-数量,明細-単位,明細-単価,明細-税（消費税／軽減税率／不課税／免税／非課税）,明細-備考\n' +
          '2021-06-14,UT_TEST_INVOICE_1_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-17,test111,aaa@bbb.ccc,testsiten,testbank,普通,1111111,kang_test,特記事項テストです。,001,PC,100,個,100000,消費税,アップロードテスト'
      )
    })

    test('準正常：解約中', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = {
        userContext: 'LoggedIn',
        userRole: 'dummy'
      }
      request.user = user

      // ファイルデータを設定
      request.body = {
        ...reqBodyForCbPostIndexOn
      }

      // DBからの正常なユーザデータの取得を想定する
      findOneSpy.mockReturnValue(dataValues)
      // DBからの正常な契約情報取得を想定する
      findOneSpyContracts.mockReturnValue(contractInfoDatatoBeReceiptCancel)
      // ユーザ権限チェック結果設定
      helpercheckContractStatusSpy.mockReturnValue(contractInfoDatatoBeReceiptCancel.dataValues.contractStatus)
      // 試験実施
      await uploadFormat.cbPostConfirmIndex(request, response, next)

      // 期待結果
      // 404，500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      expect(next).not.toHaveBeenCalledWith(error500)

      // 解約手続き中画面が表示「される」
      expect(next).toHaveBeenCalledWith(noticeHelper.create('cancelprocedure'))
    })

    test('異常：500エラー（DBからユーザ取得エラー）', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = {
        userContext: 'LoggedIn',
        userRole: 'dummy'
      }
      request.user = user
      // DBからのユーザデータの取得ができなかった(null)場合を想定する
      findOneSpy.mockReturnValue(null)
      findOneSpyContracts.mockReturnValue(contractdataValues)
      // ユーザ権限チェック結果設定
      helpercheckContractStatusSpy.mockReturnValue(contractdataValues.dataValues.contractStatus)
      // 試験実施
      await uploadFormat.cbPostConfirmIndex(request, response, next)

      // 期待結果
      // 404エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      // 500エラーがエラーハンドリング「される」
      expect(next).toHaveBeenCalledWith(error500)
    })

    test('異常：404エラーDBから取得したユーザのuserStatusが0以外の場合', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = {
        userContext: 'NotLoggedIn',
        userRole: 'dummy'
      }
      request.user = user
      // DBから取得したユーザデータのuserStatusが0以外の場合を想定する
      findOneSpy.mockReturnValue(dataValuesStatuserr)
      findOneSpyContracts.mockReturnValue(contractdataValues)
      // ユーザ権限チェック結果設定
      helpercheckContractStatusSpy.mockReturnValue(contractdataValues.dataValues.contractStatus)
      // 試験実施
      await uploadFormat.cbPostConfirmIndex(request, response, next)

      // 期待結果
      // 404エラーがエラーハンドリング「される」
      expect(next).toHaveBeenCalledWith(error404)
    })

    test('異常：500エラー（不正なContractStatus）', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = {
        userContext: 'LoggedIn',
        userRole: 'dummy'
      }
      request.user = user

      // DBからの正常なユーザデータの取得を想定する
      findOneSpy.mockReturnValue(dataValues)
      // DBからの不正な契約情報取得を想定する
      findOneSpyContracts.mockReturnValue(null)

      // 試験実施
      await uploadFormat.cbPostConfirmIndex(request, response, next)

      // 期待結果
      // 404エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      // 500エラーがエラーハンドリング「される」
      expect(next).toHaveBeenCalledWith(error500)
    })

    test('異常：500エラー（不正なContractStatus）', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = {
        userContext: 'LoggedIn',
        userRole: 'dummy'
      }
      request.user = user

      // DBからの正常なユーザデータの取得を想定する
      findOneSpy.mockReturnValue(dataValues)
      // DBからの不正な契約情報取得を想定する
      findOneSpyContracts.mockReturnValue(contractdataValues4)
      // ユーザ権限チェック結果設定
      helpercheckContractStatusSpy.mockReturnValue(999)

      // 試験実施
      await uploadFormat.cbPostConfirmIndex(request, response, next)

      // 期待結果
      // 404エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      // 500エラーがエラーハンドリング「される」
      expect(next).toHaveBeenCalledWith(error500)
    })

    test('準正常：UploadFormatDBに入力エラー', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = {
        userContext: 'LoggedIn',
        userRole: 'dummy'
      }
      request.user = user
      request.body = {
        checkItemNameLine: 'off',
        uploadFormatItemName: 'csvFormatUpload.csv',
        uploadType: '請求書データ',
        itemRowNo: 0,
        dataStartRowNo: 2,
        formatData: [
          '1',
          '2',
          '3',
          '4',
          '5',
          '6',
          '7',
          '8',
          '9',
          '10',
          '11',
          '12',
          '13',
          '14',
          '15',
          '16',
          '17',
          '18',
          '19',
          '20'
        ],
        headerItems: headerItems,
        keyConsumptionTax: '',
        keyReducedTax: '',
        keyFreeTax: '',
        keyDutyFree: '',
        keyExemptTax: '',
        ...reqBodyUnitIds
      }

      // DBからの正常なユーザデータの取得を想定する
      findOneSpy.mockReturnValue(dataValues)
      // DBからの不正な契約情報取得を想定する
      findOneSpyContracts.mockReturnValue(contractdataValuesDataControllFail)

      // request.flashは関数なのでモックする。
      request.flash = jest.fn()

      // ユーザ権限チェック結果設定
      helpercheckContractStatusSpy.mockReturnValue('00')

      // 試験実施
      await uploadFormat.cbPostConfirmIndex(request, response, next)

      // 期待結果
      // 404，500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      expect(next).not.toHaveBeenCalledWith(error500)

      // 想定したログが表示される
      expect(infoSpy).toHaveBeenCalledWith(`${constantsDefine.logMessage.DBINF001} + 'cbPostConfirmIndex'`)
    })
  })

  // -----------------------------------------------------------------------------------------
  // cbRemoveCsvの確認

  describe('cbRemoveCsv', () => {
    test('正常', async () => {
      // 準備
      request.user = user

      const uploadFileName = user.userId + '_UTtest.csv'

      // ファイルデータを設定
      request.file = {
        ...fileDataSetting
      }

      const fs = require('fs')
      const uploadFilePath = path.resolve(`${filePath}${path.sep}8d73eae9e5bcd33f5863b9251a76c551`)
      fs.writeFileSync(uploadFilePath, Buffer.from(decodeURIComponent(fileData), 'base64').toString('utf8'))

      // DBからの正常なユーザデータの取得を想定する
      findOneSpy.mockReturnValue(dataValues)
      // DBからの正常な契約情報取得を想定する
      findOneSpyContracts.mockReturnValue(contractdataValues)
      // ユーザ権限チェック結果設定
      helpercheckContractStatusSpy.mockReturnValue(contractdataValues.dataValues.contractStatus)
      // 試験実施
      const resultRemove = await uploadFormat.cbRemoveCsv(filePath, uploadFileName)

      // 期待結果
      expect(resultRemove).toBeTruthy()
    })

    test('異常:ファイルパスが存在しない場合', async () => {
      // 準備
      request.user = user

      // 試験実施
      const resultRemove = await uploadFormat.cbRemoveCsv('/test', fileName)

      // 期待結果
      expect(resultRemove).toBeFalsy()
    })
  })

  describe('cbDeleteFormat', () => {
    test('正常:削除完了しました。', async () => {
      request.session = {
        usercontext: 'LoggedIn',
        userRole: 'dummy'
      }
      request.user = {
        userId: '12345678-cb0b-48ad-857d-4b42a44ede13'
      }
      request.params = {
        uploadFormatId: '55555555-cb0b-48ad-857d-4b42a44ede13'
      }

      const testUploadFormatId = '1'
      request.params.uploadForamtId = testUploadFormatId

      findOneSpy.mockReturnValue(dataValues)
      findOneSpyContracts.mockReturnValue(contractdataValues)
      // ユーザ権限チェック結果設定
      helpercheckContractStatusSpy.mockReturnValue(contractdataValues.dataValues.contractStatus)

      request.flash = jest.fn()

      // サービス実施結果を用意する。
      deleteDataForUploadUploadFormatController.mockReturnValue(1)

      // アップロードフォーマット削除サービス実施
      await uploadFormat.cbDeleteFormat(request, response, next)

      // request.flashが呼ばれ「る」
      expect(request.flash).toHaveBeenCalledWith('info', 'フォーマットを削除しました。')

      // 正常の場合、レスポンスボディのresultで1を返す
      expect(response.body.result).toBe(1)
    })

    test('準正常：解約中', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = {
        usercontext: 'LoggedIn',
        userRole: 'dummy'
      }
      request.user = {
        userId: '12345678-cb0b-48ad-857d-4b42a44ede13'
      }

      const testUploadFormatId = '1'
      request.params.uploadForamtId = testUploadFormatId
      // DBからの正常なユーザデータの取得を想定する
      findOneSpy.mockReturnValue(dataValues)
      // DBからの正常な契約情報取得を想定する
      findOneSpyContracts.mockReturnValue(contractInfoDatatoBeReceiptCancel)
      // ユーザ権限チェック結果設定
      helpercheckContractStatusSpy.mockReturnValue(contractInfoDatatoBeReceiptCancel.dataValues.contractStatus)

      // サービス実施結果を用意する。
      deleteDataForUploadUploadFormatController.mockReturnValue(1)

      // アップロードフォーマット削除サービス実施
      await uploadFormat.cbDeleteFormat(request, response, next)

      // 期待結果
      // 404，500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      expect(next).not.toHaveBeenCalledWith(error500)

      // 解約中の場合、レスポンスボディのresultで1を返す
      expect(response.body.result).toBe(0)
    })

    test('準正常:既に削除しました。', async () => {
      request.session = {
        usercontext: 'LoggedIn',
        userRole: 'dummy'
      }
      request.user = {
        userId: '12345678-cb0b-48ad-857d-4b42a44ede13'
      }
      request.params = {
        uploadFormatId: '55555555-cb0b-48ad-857d-4b42a44ede13'
      }

      const testUploadFormatId = '1'
      request.params.uploadForamtId = testUploadFormatId

      findOneSpy.mockReturnValue(dataValues)
      findOneSpyContracts.mockReturnValue(contractdataValues)
      helper.checkContractStatus = (req, res, nex) => {
        return '00'
      }

      // サービス実施結果を用意する。
      deleteDataForUploadUploadFormatController.mockReturnValue(-1)

      // アップロードフォーマット削除サービス実施
      await uploadFormat.cbDeleteFormat(request, response, next)

      // 準正常の場合（既に削除された場合）、レスポンスボディのresultで-1を返す
      expect(response.body.result).toBe(-1)
    })

    test('準正常:DBエラー発生', async () => {
      request.session = {
        usercontext: 'LoggedIn',
        userRole: 'dummy'
      }
      request.user = {
        userId: '12345678-cb0b-48ad-857d-4b42a44ede13'
      }

      const testUploadFormatId = '1'
      request.params.uploadForamtId = testUploadFormatId

      findOneSpy.mockReturnValue(dataValues)
      findOneSpyContracts.mockReturnValue(contractdataValues)
      helper.checkContractStatus = (req, res, nex) => {
        return '00'
      }

      // サービス実施結果を用意する。
      deleteDataForUploadUploadFormatController.mockReturnValue(0)

      // アップロードフォーマット削除サービス実施
      await uploadFormat.cbDeleteFormat(request, response, next)

      // 準正常の場合（DBエラー発生）、レスポンスボディのresultで0を返す
      expect(response.body.result).toBe(0)
    })

    test('異常：500エラー（DBからユーザ取得エラー）', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = {
        userContext: 'LoggedIn',
        userRole: 'dummy'
      }
      request.user = user
      // DBからのユーザデータの取得ができなかった(null)場合を想定する
      findOneSpy.mockReturnValue(null)
      findOneSpyContracts.mockReturnValue(contractdataValues)
      // ユーザ権限チェック結果設定
      helpercheckContractStatusSpy.mockReturnValue(contractdataValues.dataValues.contractStatus)
      // アップロードフォーマット削除サービス実施
      await uploadFormat.cbDeleteFormat(request, response, next)

      // 期待結果
      // 404エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      // 500エラーの場合レスポンスボディのresultで0を返す
      expect(response.body.result).toBe(0)
    })

    test('異常：404エラーDBから取得したユーザのuserStatusが0以外の場合', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = {
        userContext: 'NotLoggedIn',
        userRole: 'dummy'
      }
      request.user = user
      // DBから取得したユーザデータのuserStatusが0以外の場合を想定する
      findOneSpy.mockReturnValue(dataValuesStatuserr)
      findOneSpyContracts.mockReturnValue(contractdataValues)
      // ユーザ権限チェック結果設定
      helpercheckContractStatusSpy.mockReturnValue(contractdataValues.dataValues.contractStatus)

      // アップロードフォーマット削除サービス実施
      await uploadFormat.cbDeleteFormat(request, response, next)

      // 期待結果
      // 404エラーの場合レスポンスボディのresultで0を返す
      expect(response.body.result).toBe(0)
    })

    test('異常：500エラー（ContractStatusが取得されない場合）', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = {
        userContext: 'LoggedIn',
        userRole: 'dummy'
      }
      request.user = user

      // DBからの正常なユーザデータの取得を想定する
      findOneSpy.mockReturnValue(dataValues)
      // DBからの契約情報を取得出来なかったことを想定する
      findOneSpyContracts.mockReturnValue(null)

      // アップロードフォーマット削除サービス実施
      await uploadFormat.cbDeleteFormat(request, response, next)

      // 期待結果
      // 404エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      // 500エラーの場合レスポンスボディのresultで0を返す
      expect(response.body.result).toBe(0)
    })

    test('異常：500エラー（不正なContractStatus）', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = {
        userContext: 'LoggedIn',
        userRole: 'dummy'
      }
      request.user = user

      // DBからの正常なユーザデータの取得を想定する
      findOneSpy.mockReturnValue(dataValues)
      // DBからの不正な契約情報取得を想定する
      findOneSpyContracts.mockReturnValue(contractdataValues4)
      // ユーザ権限チェック結果設定
      helpercheckContractStatusSpy.mockReturnValue(999)

      // アップロードフォーマット削除サービス実施
      await uploadFormat.cbDeleteFormat(request, response, next)

      // 期待結果
      // 404エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      // 500エラーの場合レスポンスボディのresultで0を返す
      expect(response.body.result).toBe(0)
    })
  })

  describe('cbGetCheckFormat', () => {
    test('正常：該当アップロードフォーマットがある場合', async () => {
      request.session = {
        usercontext: 'LoggedIn',
        userRole: 'dummy'
      }
      request.user = {
        userId: '12345678-cb0b-48ad-857d-4b42a44ede13'
      }

      findOneSpy.mockReturnValue(dataValues)
      findOneSpyContracts.mockReturnValue(contractdataValues)
      helper.checkContractStatus = (req, res, next) => {
        return '00'
      }

      checkDataForUploadFormatUploadFormatControllerSpy.mockReturnValue(1)

      // 実施
      await uploadFormat.cbGetCheckFormat(request, response, next)

      // データがある場合「1」を返す
      expect(response.body.result).toBe(1)
    })

    test('準正常：解約中', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = {
        usercontext: 'LoggedIn',
        userRole: 'dummy'
      }
      request.user = {
        userId: '12345678-cb0b-48ad-857d-4b42a44ede13'
      }

      // DBからの正常なユーザデータの取得を想定する
      findOneSpy.mockReturnValue(dataValues)
      // DBからの正常な契約情報取得を想定する
      findOneSpyContracts.mockReturnValue(contractInfoDatatoBeReceiptCancel)
      helper.checkContractStatus = (req, res, nex) => {
        return '00'
      }

      // 実施
      await uploadFormat.cbGetCheckFormat(request, response, next)

      // 期待結果
      // 404，500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      expect(next).not.toHaveBeenCalledWith(error500)

      // 解約手続き中画面が表示「される」
      expect(next).toHaveBeenCalledWith(noticeHelper.create('cancelprocedure'))
    })

    test('準正常：該当アップロードフォーマットが既に削除された場合', async () => {
      request.session = {
        usercontext: 'LoggedIn',
        userRole: 'dummy'
      }
      request.user = {
        userId: '12345678-cb0b-48ad-857d-4b42a44ede13'
      }

      findOneSpy.mockReturnValue(dataValues)
      findOneSpyContracts.mockReturnValue(contractdataValues)
      helper.checkContractStatus = (req, res, next) => {
        return '00'
      }

      checkDataForUploadFormatUploadFormatControllerSpy.mockReturnValue(-1)

      // 実施
      await uploadFormat.cbGetCheckFormat(request, response, next)

      // 既に削除の場合「-1」を返す
      expect(response.body.result).toBe(-1)
    })

    test('準正常：DBエラーの場合', async () => {
      request.session = {
        usercontext: 'LoggedIn',
        userRole: 'dummy'
      }
      request.user = {
        userId: '12345678-cb0b-48ad-857d-4b42a44ede13'
      }

      findOneSpy.mockReturnValue(dataValues)
      findOneSpyContracts.mockReturnValue(contractdataValues)
      helper.checkContractStatus = (req, res, next) => {
        return '00'
      }

      checkDataForUploadFormatUploadFormatControllerSpy.mockReturnValue(0)

      // 実施
      await uploadFormat.cbGetCheckFormat(request, response, next)

      // DBエラーの場合「0」を返す
      expect(response.body.result).toBe(0)
    })

    test('異常：500エラー（DBからユーザ取得エラー）', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = {
        userContext: 'LoggedIn',
        userRole: 'dummy'
      }
      request.user = user
      // DBからのユーザデータの取得ができなかった(null)場合を想定する
      findOneSpy.mockReturnValue(null)
      findOneSpyContracts.mockReturnValue(contractdataValues)
      helper.checkContractStatus = (req, res, next) => {
        return '00'
      }

      // 実施
      await uploadFormat.cbGetCheckFormat(request, response, next)

      // 期待結果
      // 404エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      // 500エラーがエラーハンドリング「される」
      expect(next).toHaveBeenCalledWith(error500)
    })

    test('異常：404エラーDBから取得したユーザのuserStatusが0以外の場合', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = {
        userContext: 'NotLoggedIn',
        userRole: 'dummy'
      }
      request.user = user
      // DBから取得したユーザデータのuserStatusが0以外の場合を想定する
      findOneSpy.mockReturnValue(dataValuesStatuserr)
      findOneSpyContracts.mockReturnValue(contractdataValues)
      helper.checkContractStatus = (req, res, next) => {
        return '00'
      }

      // 実施
      await uploadFormat.cbGetCheckFormat(request, response, next)

      // 期待結果
      // 404エラーがエラーハンドリング「される」
      expect(next).toHaveBeenCalledWith(error404)
    })

    test('異常：500エラー（ContractStatusが取得されない場合）', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = {
        userContext: 'LoggedIn',
        userRole: 'dummy'
      }
      request.user = user

      // DBからの正常なユーザデータの取得を想定する
      findOneSpy.mockReturnValue(dataValues)
      // DBからの契約情報を取得出来なかったことを想定する
      findOneSpyContracts.mockReturnValue(null)
      helper.checkContractStatus = (req, res, next) => {
        return '00'
      }

      // 実施
      await uploadFormat.cbGetCheckFormat(request, response, next)

      // 期待結果
      // 404，500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      // 500エラーがエラーハンドリング「される」
      expect(next).toHaveBeenCalledWith(error500)
    })

    test('異常：500エラー（不正なContractStatus）', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = {
        userContext: 'LoggedIn',
        userRole: 'dummy'
      }
      request.user = user

      // DBからの正常なユーザデータの取得を想定する
      findOneSpy.mockReturnValue(dataValues)
      // DBからの不正な契約情報取得を想定する
      findOneSpyContracts.mockReturnValue(contractdataValues4)
      helper.checkContractStatus = (req, res, next) => {
        return 999
      }

      // 実施
      await uploadFormat.cbGetCheckFormat(request, response, next)

      // 期待結果
      // 404エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      // 500エラーがエラーハンドリング「される」
      expect(next).toHaveBeenCalledWith(error500)
    })
  })
})

// uploadFormatControllerのinsertSpy
const uploadFormatControllerInsert = async (_tenantId, values) => {
  const functionName = 'uploadFormatController.insert'
  let contractRow
  let contractId
  let resultToInsertUpload
  logger.info(`${constantsDefine.logMessage.INF000}${functionName}`)

  const uploadContractId = values?.contractId
  if (!uploadContractId) {
    logger.error(`${constantsDefine.logMessage.CMMERR000}${functionName}`)
    return
  }

  try {
    contractRow = {
      dataValues: {
        contractId: uploadContractId
      }
    }
    contractId = contractRow?.dataValues?.contractId
    if (contractId === '1111111111-2222-3333-4444-4b42a44ede13') {
      throw new Error('DB input Error')
    }
  } catch (error) {
    logger.error({ contractId: uploadContractId, stack: error.stack, status: 0 })
    return
  }

  if (!contractId || contractId !== uploadContractId) {
    logger.info(`${constantsDefine.logMessage.DBINF000}${functionName}`)
    return
  }

  try {
    const now = new Date()
    resultToInsertUpload = {
      dataValues: {
        ...values,
        contractId: contractId,
        createdAt: now,
        updatedAt: now
      }
    }
    UploadFormatDB.push(resultToInsertUpload.dataValues)
  } catch (error) {
    logger.error({ contractId: uploadContractId, stack: error.stack, status: 0 })
    return
  }

  logger.info(`${constantsDefine.logMessage.INF001}${functionName}`)
  return resultToInsertUpload
}

// uploadFormatControllerのfindUploadFormatSpy
const uploadFormatControllerFindUploadFormat = async (uploadFormatId) => {
  const functionName = 'uploadFormatController.findUploadFormat'
  logger.info(`${constantsDefine.logMessage.INF000}${functionName}`)
  let uploadFormat
  try {
    UploadFormatDB.forEach((item) => {
      if (item.uploadFormatId === uploadFormatId) {
        uploadFormat = {
          dataValues: item
        }
      }
    })
  } catch (error) {
    logger.error({ uploadFormatId: uploadFormatId, stack: error.stack, status: 0 })
  }
  logger.info(`${constantsDefine.logMessage.INF001}${functionName}`)
  return uploadFormat
}

// uploadFormatDetailControllerのinsertSpy
const uploadFormatDetailControllerInsert = async (values) => {
  const functionName = 'uploadFormatDetailController.insert'
  logger.info(`${constantsDefine.logMessage.INF000}${functionName}`)
  const uploadFormatId = values?.uploadFormatId
  if (!uploadFormatId) {
    logger.error(`${constantsDefine.logMessage.CMMERR000}${functionName}`)
    return
  }
  const uploadFormatRow = await uploadFormatController.findUploadFormat(uploadFormatId)

  if (!uploadFormatRow?.dataValues.uploadFormatId) {
    logger.info(`${constantsDefine.logMessage.DBINF000}${functionName}`)
    return
  }

  let resultToInsertUploadFormatDetail

  try {
    resultToInsertUploadFormatDetail = {
      ...values,
      uploadFormatId: uploadFormatRow?.dataValues.uploadFormatId
    }
    UploadFormatDetailDB.push(resultToInsertUploadFormatDetail)
  } catch (error) {
    logger.error(
      {
        values: {
          ...values,
          uploadFormatId: uploadFormatRow?.dataValues.uploadFormatId
        },
        stack: error.stack,
        status: 0
      },
      error.name
    )
  }

  logger.info(`${constantsDefine.logMessage.INF001}${functionName}`)
  return resultToInsertUploadFormatDetail
}

// uploadFormatIdentifierControllerのinsertSpy
const uploadFormatIdentifierControllerInsert = async (values) => {
  const functionName = 'uploadFormatDetailController.insert'
  logger.info(`${constantsDefine.logMessage.INF000}${functionName}`)
  const uploadFormatId = values?.uploadFormatId

  if (!uploadFormatId) {
    logger.error(`${constantsDefine.logMessage.CMMERR000}${functionName}`)
    return
  }
  const uploadFormatRow = await uploadFormatController.findUploadFormat(uploadFormatId)

  if (!uploadFormatRow?.dataValues.uploadFormatId) {
    logger.info(`${constantsDefine.logMessage.DBINF000}${functionName}`)
    return
  }

  let resultToInsertUploadFormatDetail

  try {
    resultToInsertUploadFormatDetail = {
      ...values,
      uploadFormatId: uploadFormatRow?.dataValues.uploadFormatId
    }
    UploadFormatIdentifierDB.push(resultToInsertUploadFormatDetail)
  } catch (error) {
    logger.error(
      {
        values: {
          ...values,
          uploadFormatId: uploadFormatRow?.dataValues.uploadFormatId
        },
        stack: error.stack,
        status: 0
      },
      error.name
    )
  }

  logger.info(`${constantsDefine.logMessage.INF001}${functionName}`)
  return resultToInsertUploadFormatDetail
}
