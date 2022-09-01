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
const uploadFormatController = require('../../Application/controllers/uploadFormatController.js')
const uploadFormatDetailController = require('../../Application/controllers/uploadFormatDetailController.js')
const uploadFormatIdentifierController = require('../../Application/controllers/uploadFormatIdentifierController.js')
const SUCCESSMESSAGE = constantsDefine.invoiceErrMsg.SUCCESS
const SKIPMESSAGE = constantsDefine.invoiceErrMsg.SKIP
const path = require('path')
const fs = require('fs')

if (process.env.LOCALLY_HOSTED === 'true') {
  // NODE_ENVはJestがデフォルトでtestに指定する。dotenvで上書きできなかったため、package.jsonの実行引数でdevelopmentを指定
  require('dotenv').config({ path: './config/.env' })
}
let request,
  response,
  infoSpy,
  findOneSpy,
  pathSpy,
  pathResolveSpy,
  findOneSpyContracts,
  invoiceListSpy,
  findAllByContractIdSpy,
  findByUploadFormatIdSpy,
  findUploadFormatIdSpy

let createSpyInvoices,
  createSpyinvoicesDetail,
  findOneSpyInvoice,
  findOneSypTenant,
  findByUploadFormatIdIdentifierSpy,
  checkContractStatusSpy

describe('csvuploadのテスト', () => {
  beforeEach(() => {
    request = new Request()
    response = new Response()
    infoSpy = jest.spyOn(logger, 'info')
    findOneSpy = jest.spyOn(userController, 'findOne')
    findOneSpyContracts = jest.spyOn(contractController, 'findOne')
    findAllByContractIdSpy = jest.spyOn(uploadFormatController, 'findByContractId')
    findUploadFormatIdSpy = jest.spyOn(uploadFormatController, 'findUploadFormat')
    findByUploadFormatIdSpy = jest.spyOn(uploadFormatDetailController, 'findByUploadFormatId')
    findByUploadFormatIdIdentifierSpy = jest.spyOn(uploadFormatIdentifierController, 'findByUploadFormatId')
    invoiceListSpy = jest.spyOn(csvupload, 'cbExtractInvoice')
    apiManager.accessTradeshift = jest.fn((accToken, refreshToken, method, query, body = {}, config = {}) => {
      let result
      switch (method) {
        case 'get':
          if (
            query.match(
              /^\/documents\?stag=draft&stag=outbox&_onlyIndex=true&includesourcedocuments=false&populatePersonInfo=false&limit=10000/i
            )
          ) {
            if (
              query.match(
                /^\/documents\?stag=draft&stag=outbox&_onlyIndex=true&includesourcedocuments=false&populatePersonInfo=false&limit=10000&page=/i
              )
            ) {
              return documentListData2
            }
            return documentListData
          }
          if (query.match(/^\/network\?limit=100/i)) {
            if (accToken.match('getNetworkErr')) {
              return new Error('trade shift api error')
            }
            if (query.match(/^\/network\?limit=100&page=/i)) {
              return resultGetNetwork2
            }
            return resultGetNetwork
          }
          break
        case 'put':
          {
            const invoice = JSON.parse(body)
            if (invoice.ID.value === 'api500error') {
              const error500 = new Error('Server Internel Error')
              error500.response = { status: 500 }
              error500.data = 'Server Internel Error'
              result = error500
            } else {
              result = 200
            }
          }
          return result
      }
    })
    createSpyInvoices = jest.spyOn(invoiceController, 'insert')
    createSpyinvoicesDetail = jest.spyOn(invoiceDetailController, 'insert')
    findOneSpyInvoice = jest.spyOn(invoiceController, 'findInvoice')
    findOneSypTenant = jest.spyOn(tenantController, 'findOne')
    pathSpy = jest.spyOn(path, 'join')
    pathResolveSpy = jest.spyOn(path, 'resolve')
    checkContractStatusSpy = jest.spyOn(helper, 'checkContractStatus')
    logger.info = jest.fn()
    logger.error = jest.fn()
    request.csrfToken = jest.fn()
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
    findAllByContractIdSpy.mockRestore()
    findByUploadFormatIdSpy.mockRestore()
    pathSpy.mockRestore()
    pathResolveSpy.mockRestore()
    findByUploadFormatIdIdentifierSpy.mockRestore()
    findUploadFormatIdSpy.mockRestore()
    checkContractStatusSpy.mockRestore()
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
      userId: '12345678-cb0b-48ad-857d-4b42a44ede13',
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
    fs.readFileSync(path.resolve('./testData/fileData.csv'), {
      encoding: 'utf-8',
      flag: 'r'
    })
  ).toString('base64')

  // 請求書が２つ以上、請求書番号が一致していない
  const fileData2 = Buffer.from(
    fs.readFileSync(path.resolve('./testData/fileData2.csv'), {
      encoding: 'utf-8',
      flag: 'r'
    })
  ).toString('base64')

  // 請求書が２つ以上、請求書番号が一致していて、順番になっている
  const fileData3 = Buffer.from(
    fs.readFileSync(path.resolve('./testData/fileData3.csv'), {
      encoding: 'utf-8',
      flag: 'r'
    })
  ).toString('base64')

  // 請求書が２つ以上、請求書番号が順番になっていること、請求書番号が割り込んでいる
  const fileData4 = Buffer.from(
    fs.readFileSync(path.resolve('./testData/fileData4.csv'), {
      encoding: 'utf-8',
      flag: 'r'
    })
  ).toString('base64')

  // 請求書が100件
  const fileData100 = Buffer.from(
    fs.readFileSync(path.resolve('./testData/fileData100.csv'), {
      encoding: 'utf-8',
      flag: 'r'
    })
  ).toString('base64')

  // 明細書：200件
  const fileData200 = Buffer.from(
    fs.readFileSync(path.resolve('./testData/fileData200.csv'), {
      encoding: 'utf-8',
      flag: 'r'
    })
  ).toString('base64')

  const resultGetNetwork = {
    numPages: 2,
    pageId: 1,
    Connections: {
      Connection: [
        { State: 'ACCEPTED', CompanyAccountId: '927635b5-f469-493b-9ce0-b2bfc4062959' },
        { State: 'ACCEPTED', CompanyAccountId: '927635b5-f469-493b-9ce0-b2bfc4062951' },
        { State: 'ACCEPTED', CompanyAccountId: '3cfebb4f-2338-4dc7-9523-5423a027a880' }
      ]
    }
  }

  const resultGetNetwork2 = {
    numPages: 2,
    pageId: 2,
    Connections: {
      Connection: [
        { State: 'ACCEPTED', CompanyAccountId: '927635b5-f469-493b-9ce0-b2bfc4062960' },
        { State: 'ACCEPTED', CompanyAccountId: '927635b5-f469-493b-9ce0-b2bfc4062961' },
        { State: 'ACCEPTED', CompanyAccountId: '3cfebb4f-2338-4dc7-9523-5423a027a862' }
      ]
    }
  }

  // 登録済みのドキュメントデータ
  const documentListData = {
    itemsPerPage: 1,
    itemCount: 1,
    indexing: false,
    numPages: 2,
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
  const documentListData2 = {
    itemsPerPage: 1,
    itemCount: 1,
    indexing: false,
    numPages: 2,
    pageId: 2,
    Document: [
      {
        DocumentId: '06051d44-fc05-4b89-9ba6-89594e4d7b99',
        ID: 'UT_TEST_INVOICE_5_2',
        URI: 'https://api-sandbox.tradeshift.com/tradeshift/rest/external/documents/06051d44-fc05-4b89-9ba6-89594e4d7b99',
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

  const contractId = '87654321-fbe6-4864-a866-7a3ce9aa517e'
  const uploadFormatId = '55555555-fbe6-4864-a866-7a3ce9aa517e'
  const uploadFormatId2 = 'daca9d11-07b4-4a3d-8650-b5b0a6ed059a'
  const findAllResult = [
    {
      uploadFormatId: uploadFormatId,
      contractId: contractId,
      setName: '請求書フォーマット1',
      uploadType: '請求書データ',
      itemRowNo: '1',
      dataStartRowNo: '2',
      createdAt: '2021-07-09T04:30:00.000Z',
      updatedAt: '2021-07-09T04:30:00.000Z'
    },
    {
      uploadFormatId: uploadFormatId2,
      contractId: contractId,
      setName: '請求書フォーマット2',
      uploadType: '請求書データ',
      itemRowNo: '1',
      dataStartRowNo: '2',
      createdAt: '2021-07-09T04:30:00.000Z',
      updatedAt: '2021-07-09T04:30:00.000Z'
    }
  ]

  const extractFullpathFile = path.resolve('./testData/csvUpload_Format_default.csv')
  const uploadFormatResultOnce = {
    dataValues: {
      uploadFormatId: uploadFormatId,
      contractId: contractId,
      setName: '請求書フォーマット1',
      uploadType: '請求書データ',
      itemRowNo: 1,
      dataStartRowNo: 2,
      createdAt: '2021-07-09T04:30:00.000Z',
      updatedAt: '2021-07-09T04:30:00.000Z'
    },
    uploadData: fs.readFileSync(extractFullpathFile, 'utf8')
  }

  const uploadFormatResultItemRoNo2 = {
    dataValues: {
      uploadFormatId: uploadFormatId,
      contractId: contractId,
      setName: '請求書フォーマット1',
      uploadType: '請求書データ',
      itemRowNo: 2,
      dataStartRowNo: 3,
      createdAt: '2021-07-09T04:30:00.000Z',
      updatedAt: '2021-07-09T04:30:00.000Z'
    },
    uploadData: fs.readFileSync(extractFullpathFile, 'utf8')
  }

  const extractFullpathNoHeaderFile = path.resolve('./testData/csvUpload_Format_noHeader_default.csv')
  const uploadFormatNoHeaderResult = {
    dataValues: {
      uploadFormatId: uploadFormatId,
      contractId: contractId,
      setName: '請求書フォーマット1',
      uploadType: '請求書データ',
      itemRowNo: 0,
      dataStartRowNo: 1,
      createdAt: '2021-07-09T04:30:00.000Z',
      updatedAt: '2021-07-09T04:30:00.000Z',
      uploadData: fs.readFileSync(extractFullpathNoHeaderFile, 'utf8')
    }
  }

  const uploadFormatDetailResult = [
    {
      uploadFormatId: uploadFormatId,
      serialNumber: '1',
      uploadFormatItemName: '発行日',
      uploadFormatNumber: '1',
      defaultItemName: '発行日',
      defaultNumber: '0',
      createdAt: '2021-07-09T04:30:00.000Z',
      updatedAt: '2021-07-09T04:30:00.000Z'
    },
    {
      uploadFormatId: uploadFormatId,
      serialNumber: '2',
      uploadFormatItemName: '請求書番号',
      uploadFormatNumber: '0',
      defaultItemName: '請求書番号',
      defaultNumber: '1',
      createdAt: '2021-07-09T04:30:00.000Z',
      updatedAt: '2021-07-09T04:30:00.000Z'
    },
    {
      uploadFormatId: uploadFormatId,
      serialNumber: '3',
      uploadFormatItemName: 'テナントID',
      uploadFormatNumber: '2',
      defaultItemName: 'テナントID',
      defaultNumber: '2',
      createdAt: '2021-07-09T04:30:00.000Z',
      updatedAt: '2021-07-09T04:30:00.000Z'
    },
    {
      uploadFormatId: uploadFormatId,
      serialNumber: '4',
      uploadFormatItemName: '明細-項目ID',
      uploadFormatNumber: '12',
      defaultItemName: '明細-項目ID',
      defaultNumber: '12',
      createdAt: '2021-07-09T04:30:00.000Z',
      updatedAt: '2021-07-09T04:30:00.000Z'
    },
    {
      uploadFormatId: uploadFormatId,
      serialNumber: '5',
      uploadFormatItemName: '明細-内容',
      uploadFormatNumber: '13',
      defaultItemName: '明細-内容',
      defaultNumber: '13',
      createdAt: '2021-07-09T04:30:00.000Z',
      updatedAt: '2021-07-09T04:30:00.000Z'
    },
    {
      uploadFormatId: uploadFormatId,
      serialNumber: '6',
      uploadFormatItemName: '明細-数量',
      uploadFormatNumber: '14',
      defaultItemName: '明細-数量',
      defaultNumber: '14',
      createdAt: '2021-07-09T04:30:00.000Z',
      updatedAt: '2021-07-09T04:30:00.000Z'
    },
    {
      uploadFormatId: uploadFormatId,
      serialNumber: '7',
      uploadFormatItemName: '明細-単位',
      uploadFormatNumber: '15',
      defaultItemName: '明細-単位',
      defaultNumber: '15',
      createdAt: '2021-07-09T04:30:00.000Z',
      updatedAt: '2021-07-09T04:30:00.000Z'
    },
    {
      uploadFormatId: uploadFormatId,
      serialNumber: '8',
      uploadFormatItemName: '明細-単価',
      uploadFormatNumber: '16',
      defaultItemName: '明細-単価',
      defaultNumber: '16',
      createdAt: '2021-07-09T04:30:00.000Z',
      updatedAt: '2021-07-09T04:30:00.000Z'
    },
    {
      uploadFormatId: uploadFormatId,
      serialNumber: '9',
      uploadFormatItemName: '明細-税（消費税／軽減税率／不課税／免税／非課税）',
      uploadFormatNumber: '17',
      defaultItemName: '明細-税（消費税／軽減税率／不課税／免税／非課税）',
      defaultNumber: '17',
      createdAt: '2021-07-09T04:30:00.000Z',
      updatedAt: '2021-07-09T04:30:00.000Z'
    }
  ]

  // uploadFormatIdentifier 税データ
  const uploadFormatIdentifierTaxResult = [
    {
      uploadFormatId: uploadFormatId,
      serialNumber: '1',
      extensionType: '0',
      uploadFormatExtension: 'tax1',
      defaultExtension: '消費税',
      createdAt: '2021-07-09T04:30:00.000Z',
      updatedAt: '2021-07-09T04:30:00.000Z'
    },
    {
      uploadFormatId: uploadFormatId,
      serialNumber: '2',
      extensionType: '0',
      uploadFormatExtension: 'tax2',
      defaultExtension: '軽減税率',
      createdAt: '2021-07-09T04:30:00.000Z',
      updatedAt: '2021-07-09T04:30:00.000Z'
    },
    {
      uploadFormatId: uploadFormatId,
      serialNumber: '3',
      extensionType: '0',
      uploadFormatExtension: 'tax3',
      defaultExtension: '不課税',
      createdAt: '2021-07-09T04:30:00.000Z',
      updatedAt: '2021-07-09T04:30:00.000Z'
    },
    {
      uploadFormatId: uploadFormatId,
      serialNumber: '4',
      extensionType: '0',
      uploadFormatExtension: 'tax4',
      defaultExtension: '免税',
      createdAt: '2021-07-09T04:30:00.000Z',
      updatedAt: '2021-07-09T04:30:00.000Z'
    },
    {
      uploadFormatId: uploadFormatId,
      serialNumber: '5',
      extensionType: '0',
      uploadFormatExtension: 'tax5',
      defaultExtension: '非課税',
      createdAt: '2021-07-09T04:30:00.000Z',
      updatedAt: '2021-07-09T04:30:00.000Z'
    }
  ]

  // uploadFormatIdentifier 単位データ
  const uploadFormatIdentifierUnit10Result = [
    {
      uploadFormatId: uploadFormatId,
      serialNumber: '1',
      extensionType: '1',
      uploadFormatExtension: 'unit1',
      defaultExtension: '人月',
      createdAt: '2021-07-09T04:30:00.000Z',
      updatedAt: '2021-07-09T04:30:00.000Z'
    },
    {
      uploadFormatId: uploadFormatId,
      serialNumber: '2',
      extensionType: '1',
      uploadFormatExtension: 'unit2',
      defaultExtension: 'ボトル',
      createdAt: '2021-07-09T04:30:00.000Z',
      updatedAt: '2021-07-09T04:30:00.000Z'
    },
    {
      uploadFormatId: uploadFormatId,
      serialNumber: '3',
      extensionType: '1',
      uploadFormatExtension: 'unit3',
      defaultExtension: 'コスト',
      createdAt: '2021-07-09T04:30:00.000Z',
      updatedAt: '2021-07-09T04:30:00.000Z'
    },
    {
      uploadFormatId: uploadFormatId,
      serialNumber: '4',
      extensionType: '1',
      uploadFormatExtension: 'unit4',
      defaultExtension: 'コンテナ',
      createdAt: '2021-07-09T04:30:00.000Z',
      updatedAt: '2021-07-09T04:30:00.000Z'
    },
    {
      uploadFormatId: uploadFormatId,
      serialNumber: '5',
      extensionType: '1',
      uploadFormatExtension: 'unit5',
      defaultExtension: 'センチリットル',
      createdAt: '2021-07-09T04:30:00.000Z',
      updatedAt: '2021-07-09T04:30:00.000Z'
    },
    {
      uploadFormatId: uploadFormatId,
      serialNumber: '6',
      extensionType: '1',
      uploadFormatExtension: 'unit6',
      defaultExtension: '平方センチメートル',
      createdAt: '2021-07-09T04:30:00.000Z',
      updatedAt: '2021-07-09T04:30:00.000Z'
    },
    {
      uploadFormatId: uploadFormatId,
      serialNumber: '7',
      extensionType: '1',
      uploadFormatExtension: 'unit7',
      defaultExtension: '立方センチメートル',
      createdAt: '2021-07-09T04:30:00.000Z',
      updatedAt: '2021-07-09T04:30:00.000Z'
    },
    {
      uploadFormatId: uploadFormatId,
      serialNumber: '8',
      extensionType: '1',
      uploadFormatExtension: 'unit8',
      defaultExtension: 'センチメートル',
      createdAt: '2021-07-09T04:30:00.000Z',
      updatedAt: '2021-07-09T04:30:00.000Z'
    },
    {
      uploadFormatId: uploadFormatId,
      serialNumber: '9',
      extensionType: '1',
      uploadFormatExtension: 'unit9',
      defaultExtension: 'ケース',
      createdAt: '2021-07-09T04:30:00.000Z',
      updatedAt: '2021-07-09T04:30:00.000Z'
    },
    {
      uploadFormatId: uploadFormatId,
      serialNumber: '10',
      extensionType: '1',
      uploadFormatExtension: 'unit10',
      defaultExtension: 'カートン',
      createdAt: '2021-07-09T04:30:00.000Z',
      updatedAt: '2021-07-09T04:30:00.000Z'
    }
  ]

  const uploadFormatIdentifierUnit28Result = [
    {
      uploadFormatId: uploadFormatId,
      serialNumber: '1',
      extensionType: '1',
      uploadFormatExtension: 'unit1',
      defaultExtension: '日',
      createdAt: '2021-07-09T04:30:00.000Z',
      updatedAt: '2021-07-09T04:30:00.000Z'
    },
    {
      uploadFormatId: uploadFormatId,
      serialNumber: '2',
      extensionType: '1',
      uploadFormatExtension: 'unit2',
      defaultExtension: 'デシリットル',
      createdAt: '2021-07-09T04:30:00.000Z',
      updatedAt: '2021-07-09T04:30:00.000Z'
    },
    {
      uploadFormatId: uploadFormatId,
      serialNumber: '3',
      extensionType: '1',
      uploadFormatExtension: 'unit3',
      defaultExtension: 'デシメートル',
      createdAt: '2021-07-09T04:30:00.000Z',
      updatedAt: '2021-07-09T04:30:00.000Z'
    },
    {
      uploadFormatId: uploadFormatId,
      serialNumber: '4',
      extensionType: '1',
      uploadFormatExtension: 'unit4',
      defaultExtension: 'グロス・キログラム',
      createdAt: '2021-07-09T04:30:00.000Z',
      updatedAt: '2021-07-09T04:30:00.000Z'
    },
    {
      uploadFormatId: uploadFormatId,
      serialNumber: '5',
      extensionType: '1',
      uploadFormatExtension: 'unit5',
      defaultExtension: '個',
      createdAt: '2021-07-09T04:30:00.000Z',
      updatedAt: '2021-07-09T04:30:00.000Z'
    },
    {
      uploadFormatId: uploadFormatId,
      serialNumber: '6',
      extensionType: '1',
      uploadFormatExtension: 'unit6',
      defaultExtension: 'フィート',
      createdAt: '2021-07-09T04:30:00.000Z',
      updatedAt: '2021-07-09T04:30:00.000Z'
    },
    {
      uploadFormatId: uploadFormatId,
      serialNumber: '7',
      extensionType: '1',
      uploadFormatExtension: 'unit7',
      defaultExtension: 'ガロン',
      createdAt: '2021-07-09T04:30:00.000Z',
      updatedAt: '2021-07-09T04:30:00.000Z'
    },
    {
      uploadFormatId: uploadFormatId,
      serialNumber: '8',
      extensionType: '1',
      uploadFormatExtension: 'unit8',
      defaultExtension: 'グラム',
      createdAt: '2021-07-09T04:30:00.000Z',
      updatedAt: '2021-07-09T04:30:00.000Z'
    },
    {
      uploadFormatId: uploadFormatId,
      serialNumber: '9',
      extensionType: '1',
      uploadFormatExtension: 'unit9',
      defaultExtension: '総トン',
      createdAt: '2021-07-09T04:30:00.000Z',
      updatedAt: '2021-07-09T04:30:00.000Z'
    },
    {
      uploadFormatId: uploadFormatId,
      serialNumber: '10',
      extensionType: '1',
      uploadFormatExtension: 'unit10',
      defaultExtension: '時間',
      createdAt: '2021-07-09T04:30:00.000Z',
      updatedAt: '2021-07-09T04:30:00.000Z'
    },
    {
      uploadFormatId: uploadFormatId,
      serialNumber: '11',
      extensionType: '1',
      uploadFormatExtension: 'unit11',
      defaultExtension: 'キログラム',
      createdAt: '2021-07-09T04:30:00.000Z',
      updatedAt: '2021-07-09T04:30:00.000Z'
    },
    {
      uploadFormatId: uploadFormatId,
      serialNumber: '12',
      extensionType: '1',
      uploadFormatExtension: 'unit12',
      defaultExtension: 'キロメートル',
      createdAt: '2021-07-09T04:30:00.000Z',
      updatedAt: '2021-07-09T04:30:00.000Z'
    },
    {
      uploadFormatId: uploadFormatId,
      serialNumber: '13',
      extensionType: '1',
      uploadFormatExtension: 'unit13',
      defaultExtension: 'キロワット時',
      createdAt: '2021-07-09T04:30:00.000Z',
      updatedAt: '2021-07-09T04:30:00.000Z'
    },
    {
      uploadFormatId: uploadFormatId,
      serialNumber: '14',
      extensionType: '1',
      uploadFormatExtension: 'unit14',
      defaultExtension: 'ポンド',
      createdAt: '2021-07-09T04:30:00.000Z',
      updatedAt: '2021-07-09T04:30:00.000Z'
    },
    {
      uploadFormatId: uploadFormatId,
      serialNumber: '15',
      extensionType: '1',
      uploadFormatExtension: 'unit15',
      defaultExtension: 'リットル',
      createdAt: '2021-07-09T04:30:00.000Z',
      updatedAt: '2021-07-09T04:30:00.000Z'
    },
    {
      uploadFormatId: uploadFormatId,
      serialNumber: '16',
      extensionType: '1',
      uploadFormatExtension: 'unit16',
      defaultExtension: 'ミリグラム',
      createdAt: '2021-07-09T04:30:00.000Z',
      updatedAt: '2021-07-09T04:30:00.000Z'
    },
    {
      uploadFormatId: uploadFormatId,
      serialNumber: '17',
      extensionType: '1',
      uploadFormatExtension: 'unit17',
      defaultExtension: 'ミリリットル',
      createdAt: '2021-07-09T04:30:00.000Z',
      updatedAt: '2021-07-09T04:30:00.000Z'
    },
    {
      uploadFormatId: uploadFormatId,
      serialNumber: '18',
      extensionType: '1',
      uploadFormatExtension: 'unit18',
      defaultExtension: 'ミリメートル',
      createdAt: '2021-07-09T04:30:00.000Z',
      updatedAt: '2021-07-09T04:30:00.000Z'
    },
    {
      uploadFormatId: uploadFormatId,
      serialNumber: '19',
      extensionType: '1',
      uploadFormatExtension: 'unit19',
      defaultExtension: '月',
      createdAt: '2021-07-09T04:30:00.000Z',
      updatedAt: '2021-07-09T04:30:00.000Z'
    },
    {
      uploadFormatId: uploadFormatId,
      serialNumber: '20',
      extensionType: '1',
      uploadFormatExtension: 'unit20',
      defaultExtension: '平方メートル',
      createdAt: '2021-07-09T04:30:00.000Z',
      updatedAt: '2021-07-09T04:30:00.000Z'
    },
    {
      uploadFormatId: uploadFormatId,
      serialNumber: '21',
      extensionType: '1',
      uploadFormatExtension: 'unit21',
      defaultExtension: '立方メートル',
      createdAt: '2021-07-09T04:30:00.000Z',
      updatedAt: '2021-07-09T04:30:00.000Z'
    },
    {
      uploadFormatId: uploadFormatId,
      serialNumber: '22',
      extensionType: '1',
      uploadFormatExtension: 'unit22',
      defaultExtension: 'メーター',
      createdAt: '2021-07-09T04:30:00.000Z',
      updatedAt: '2021-07-09T04:30:00.000Z'
    },
    {
      uploadFormatId: uploadFormatId,
      serialNumber: '23',
      extensionType: '1',
      uploadFormatExtension: 'unit23',
      defaultExtension: '純トン',
      createdAt: '2021-07-09T04:30:00.000Z',
      updatedAt: '2021-07-09T04:30:00.000Z'
    },
    {
      uploadFormatId: uploadFormatId,
      serialNumber: '24',
      extensionType: '1',
      uploadFormatExtension: 'unit24',
      defaultExtension: '包',
      createdAt: '2021-07-09T04:30:00.000Z',
      updatedAt: '2021-07-09T04:30:00.000Z'
    },
    {
      uploadFormatId: uploadFormatId,
      serialNumber: '25',
      extensionType: '1',
      uploadFormatExtension: 'unit25',
      defaultExtension: '巻',
      createdAt: '2021-07-09T04:30:00.000Z',
      updatedAt: '2021-07-09T04:30:00.000Z'
    },
    {
      uploadFormatId: uploadFormatId,
      serialNumber: '26',
      extensionType: '1',
      uploadFormatExtension: 'unit26',
      defaultExtension: '式',
      createdAt: '2021-07-09T04:30:00.000Z',
      updatedAt: '2021-07-09T04:30:00.000Z'
    },
    {
      uploadFormatId: uploadFormatId,
      serialNumber: '27',
      extensionType: '1',
      uploadFormatExtension: 'unit27',
      defaultExtension: 'トン',
      createdAt: '2021-07-09T04:30:00.000Z',
      updatedAt: '2021-07-09T04:30:00.000Z'
    },
    {
      uploadFormatId: uploadFormatId,
      serialNumber: '28',
      extensionType: '1',
      uploadFormatExtension: 'unit28',
      defaultExtension: 'その他',
      createdAt: '2021-07-09T04:30:00.000Z',
      updatedAt: '2021-07-09T04:30:00.000Z'
    }
  ]

  // 結果値
  // bconCsvの結果値
  const returnBconCsv =
    '{"DocumentType":"InvoiceType","UBLVersionID":{"value":"2.0"},"CustomizationID":{"value":"urn:tradeshift.com:ubl-2.0-customizations:2010-06"},"ProfileID":{"value":"urn:www.cenbii.eu:profile:bii04:ver1.0","schemeID":"CWA 16073:2010","schemeAgencyID":"CEN/ISSS WS/BII","schemeVersionID":"1"},"ID":{"value":"UT_TEST_INVOICE_1_1"},"IssueDate":{"value":"2021-06-14"},"InvoiceTypeCode":{"value":"380","listID":"UN/ECE 1001 Subset","listAgencyID":"6","listVersionID":"D08B"},"DocumentCurrencyCode":{"value":"JPY"},"Note":[{"value":"特記事項テストです。"}],"AdditionalDocumentReference":[{"ID":{"value":"test111"},"DocumentTypeCode":{"value":"File ID","listID":"urn:tradeshift.com:api:1.0:documenttypecode"}}],"AccountingCustomerParty":{"Party":{"PartyIdentification":[{"ID":{"value":"3cfebb4f-2338-4dc7-9523-5423a027a880","schemeID":"TS:ID","schemeName":"Tradeshift identifier"}}],"PartyName":[{"Name":{"value":null}}],"PostalAddress":{"StreetName":{"value":null},"BuildingNumber":{"value":null},"CityName":{"value":null},"PostalZone":{"value":null},"Country":{"IdentificationCode":{"value":"JP"}}},"Contact":{"ElectronicMail":{"value":null}}}},"Delivery":[{"ActualDeliveryDate":{"value":"2021-03-17"}}],"PaymentMeans":[{"PaymentMeansCode":{"value":42,"listID":"urn:tradeshift.com:api:1.0:paymentmeanscode"},"PaymentDueDate":{"value":"2021-03-31"},"PayeeFinancialAccount":{"FinancialInstitutionBranch":{"FinancialInstitution":{"Name":{"value":"testsiten"}},"Name":{"value":"testbank"}},"AccountTypeCode":{"value":"General"},"ID":{"value":"1111111"},"Name":{"value":"kang_test"}}}],"InvoiceLine":[{"ID":{"value":"1"},"InvoicedQuantity":{"value":100,"unitCode":"EA"},"LineExtensionAmount":{"value":null,"currencyID":"JPY"},"TaxTotal":[{"TaxSubtotal":[{"TaxCategory":{"ID":{"value":"S","schemeID":"UN/ECE 5305","schemeAgencyID":"6","schemeVersionID":"D08B"},"Percent":{"value":10},"TaxScheme":{"ID":{"value":"VAT","schemeID":"UN/ECE 5153 Subset","schemeAgencyID":"6","schemeVersionID":"D08B"},"Name":{"value":"JP 消費税 10%"}}}}]}],"Item":{"Name":{"value":"PC"},"SellersItemIdentification":{"ID":{"value":"001"}},"Description":[{"value":null}]},"Price":{"PriceAmount":{"value":"100000","currencyID":"JPY"}},"DocumentReference":[{"ID":{"value":"アップロードテスト"},"DocumentTypeCode":{"value":"File ID","listID":"urn:tradeshift.com:api:1.0:documenttypecode"}}]}]}'

  const returnBconCsvUser =
    '{"DocumentType":"InvoiceType","UBLVersionID":{"value":"2.0"},"CustomizationID":{"value":"urn:tradeshift.com:ubl-2.0-customizations:2010-06"},"ProfileID":{"value":"urn:www.cenbii.eu:profile:bii04:ver1.0","schemeID":"CWA 16073:2010","schemeAgencyID":"CEN/ISSS WS/BII","schemeVersionID":"1"},"ID":{"value":"2021-06-14"},"IssueDate":{"value":"UT_TEST_INVOICE_1_1-ed-ed"},"InvoiceTypeCode":{"value":"380","listID":"UN/ECE 1001 Subset","listAgencyID":"6","listVersionID":"D08B"},"DocumentCurrencyCode":{"value":"JPY"},"Note":[{"value":""}],"AdditionalDocumentReference":[{"ID":{"value":""},"DocumentTypeCode":{"value":"File ID","listID":"urn:tradeshift.com:api:1.0:documenttypecode"}}],"AccountingCustomerParty":{"Party":{"PartyIdentification":[{"ID":{"value":"3cfebb4f-2338-4dc7-9523-5423a027a880","schemeID":"TS:ID","schemeName":"Tradeshift identifier"}}],"PartyName":[{"Name":{"value":null}}],"PostalAddress":{"StreetName":{"value":null},"BuildingNumber":{"value":null},"CityName":{"value":null},"PostalZone":{"value":null},"Country":{"IdentificationCode":{"value":"JP"}}},"Contact":{"ElectronicMail":{"value":null}}}},"Delivery":[{}],"PaymentMeans":[{"PaymentMeansCode":{"value":1,"listID":"urn:tradeshift.com:api:1.0:paymentmeanscode"}}],"InvoiceLine":[{"ID":{"value":"1"},"InvoicedQuantity":{"value":100,"unitCode":"EA"},"LineExtensionAmount":{"value":null,"currencyID":"JPY"},"TaxTotal":[{"TaxSubtotal":[{"TaxCategory":{"ID":{"value":"S","schemeID":"UN/ECE 5305","schemeAgencyID":"6","schemeVersionID":"D08B"},"Percent":{"value":10},"TaxScheme":{"ID":{"value":"VAT","schemeID":"UN/ECE 5153 Subset","schemeAgencyID":"6","schemeVersionID":"D08B"},"Name":{"value":"JP 消費税 10%"}}}}]}],"Item":{"Name":{"value":"PC"},"SellersItemIdentification":{"ID":{"value":"001"}},"Description":[{"value":null}]},"Price":{"PriceAmount":{"value":"100000","currencyID":"JPY"}},"DocumentReference":[{"ID":{"value":""},"DocumentTypeCode":{"value":"File ID","listID":"urn:tradeshift.com:api:1.0:documenttypecode"}}]}]}'

  const returnBconCsvUserTax =
    '{"DocumentType":"InvoiceType","UBLVersionID":{"value":"2.0"},"CustomizationID":{"value":"urn:tradeshift.com:ubl-2.0-customizations:2010-06"},"ProfileID":{"value":"urn:www.cenbii.eu:profile:bii04:ver1.0","schemeID":"CWA 16073:2010","schemeAgencyID":"CEN/ISSS WS/BII","schemeVersionID":"1"},"ID":{"value":"TEST20211005"},"IssueDate":{"value":"2021-10-05"},"InvoiceTypeCode":{"value":"380","listID":"UN/ECE 1001 Subset","listAgencyID":"6","listVersionID":"D08B"},"DocumentCurrencyCode":{"value":"JPY"},"Note":[{"value":""}],"AdditionalDocumentReference":[{"ID":{"value":""},"DocumentTypeCode":{"value":"File ID","listID":"urn:tradeshift.com:api:1.0:documenttypecode"}}],"AccountingCustomerParty":{"Party":{"PartyIdentification":[{"ID":{"value":"927635b5-f469-493b-9ce0-b2bfc4062959","schemeID":"TS:ID","schemeName":"Tradeshift identifier"}}],"PartyName":[{"Name":{"value":null}}],"PostalAddress":{"StreetName":{"value":null},"BuildingNumber":{"value":null},"CityName":{"value":null},"PostalZone":{"value":null},"Country":{"IdentificationCode":{"value":"JP"}}},"Contact":{"ElectronicMail":{"value":null}}}},"Delivery":[{}],"PaymentMeans":[{"PaymentMeansCode":{"value":1,"listID":"urn:tradeshift.com:api:1.0:paymentmeanscode"}}],"InvoiceLine":[{"ID":{"value":"1"},"InvoicedQuantity":{"value":1,"unitCode":"EA"},"LineExtensionAmount":{"value":null,"currencyID":"JPY"},"TaxTotal":[{"TaxSubtotal":[{"TaxCategory":{"ID":{"value":"S","schemeID":"UN/ECE 5305","schemeAgencyID":"6","schemeVersionID":"D08B"},"Percent":{"value":10},"TaxScheme":{"ID":{"value":"VAT","schemeID":"UN/ECE 5153 Subset","schemeAgencyID":"6","schemeVersionID":"D08B"},"Name":{"value":"JP 消費税 10%"}}}}]}],"Item":{"Name":{"value":"明細"},"SellersItemIdentification":{"ID":{"value":"1"}},"Description":[{"value":null}]},"Price":{"PriceAmount":{"value":"1001","currencyID":"JPY"}},"DocumentReference":[{"ID":{"value":""},"DocumentTypeCode":{"value":"File ID","listID":"urn:tradeshift.com:api:1.0:documenttypecode"}}]},{"ID":{"value":"1"},"InvoicedQuantity":{"value":2,"unitCode":"BO"},"LineExtensionAmount":{"value":null,"currencyID":"JPY"},"TaxTotal":[{"TaxSubtotal":[{"TaxCategory":{"ID":{"value":"S","schemeID":"UN/ECE 5305","schemeAgencyID":"6","schemeVersionID":"D08B"},"Percent":{"value":8},"TaxScheme":{"ID":{"value":"VAT","schemeID":"UN/ECE 5153 Subset","schemeAgencyID":"6","schemeVersionID":"D08B"},"Name":{"value":"JP 消費税(軽減税率) 8%"}}}}]}],"Item":{"Name":{"value":"明細"},"SellersItemIdentification":{"ID":{"value":"2"}},"Description":[{"value":null}]},"Price":{"PriceAmount":{"value":"1002","currencyID":"JPY"}},"DocumentReference":[{"ID":{"value":""},"DocumentTypeCode":{"value":"File ID","listID":"urn:tradeshift.com:api:1.0:documenttypecode"}}]},{"ID":{"value":"1"},"InvoicedQuantity":{"value":1,"unitCode":"EA"},"LineExtensionAmount":{"value":null,"currencyID":"JPY"},"TaxTotal":[{"TaxSubtotal":[{"TaxCategory":{"ID":{"value":"S","schemeID":"UN/ECE 5305","schemeAgencyID":"6","schemeVersionID":"D08B"},"Percent":{"value":0},"TaxScheme":{"ID":{"value":"VAT","schemeID":"UN/ECE 5153 Subset","schemeAgencyID":"6","schemeVersionID":"D08B"},"Name":{"value":"JP 不課税 0%"}}}}]}],"Item":{"Name":{"value":"明細"},"SellersItemIdentification":{"ID":{"value":"1"}},"Description":[{"value":null}]},"Price":{"PriceAmount":{"value":"1001","currencyID":"JPY"}},"DocumentReference":[{"ID":{"value":""},"DocumentTypeCode":{"value":"File ID","listID":"urn:tradeshift.com:api:1.0:documenttypecode"}}]},{"ID":{"value":"1"},"InvoicedQuantity":{"value":2,"unitCode":"BO"},"LineExtensionAmount":{"value":null,"currencyID":"JPY"},"TaxTotal":[{"TaxSubtotal":[{"TaxCategory":{"ID":{"value":"S","schemeID":"UN/ECE 5305","schemeAgencyID":"6","schemeVersionID":"D08B"},"Percent":{"value":0},"TaxScheme":{"ID":{"value":"VAT","schemeID":"UN/ECE 5153 Subset","schemeAgencyID":"6","schemeVersionID":"D08B"},"Name":{"value":"JP 免税 0%"}}}}]}],"Item":{"Name":{"value":"明細"},"SellersItemIdentification":{"ID":{"value":"2"}},"Description":[{"value":null}]},"Price":{"PriceAmount":{"value":"1002","currencyID":"JPY"}},"DocumentReference":[{"ID":{"value":""},"DocumentTypeCode":{"value":"File ID","listID":"urn:tradeshift.com:api:1.0:documenttypecode"}}]},{"ID":{"value":"1"},"InvoicedQuantity":{"value":1,"unitCode":"EA"},"LineExtensionAmount":{"value":null,"currencyID":"JPY"},"TaxTotal":[{"TaxSubtotal":[{"TaxCategory":{"ID":{"value":"S","schemeID":"UN/ECE 5305","schemeAgencyID":"6","schemeVersionID":"D08B"},"Percent":{"value":0},"TaxScheme":{"ID":{"value":"VAT","schemeID":"UN/ECE 5153 Subset","schemeAgencyID":"6","schemeVersionID":"D08B"},"Name":{"value":"JP 非課税 0%"}}}}]}],"Item":{"Name":{"value":"明細"},"SellersItemIdentification":{"ID":{"value":"1"}},"Description":[{"value":null}]},"Price":{"PriceAmount":{"value":"1001","currencyID":"JPY"}},"DocumentReference":[{"ID":{"value":""},"DocumentTypeCode":{"value":"File ID","listID":"urn:tradeshift.com:api:1.0:documenttypecode"}}]}]}'

  const returnBconCsvUserUnit1 =
    '{"DocumentType":"InvoiceType","UBLVersionID":{"value":"2.0"},"CustomizationID":{"value":"urn:tradeshift.com:ubl-2.0-customizations:2010-06"},"ProfileID":{"value":"urn:www.cenbii.eu:profile:bii04:ver1.0","schemeID":"CWA 16073:2010","schemeAgencyID":"CEN/ISSS WS/BII","schemeVersionID":"1"},"ID":{"value":"TEST20211005"},"IssueDate":{"value":"2021-10-05"},"InvoiceTypeCode":{"value":"380","listID":"UN/ECE 1001 Subset","listAgencyID":"6","listVersionID":"D08B"},"DocumentCurrencyCode":{"value":"JPY"},"Note":[{"value":""}],"AdditionalDocumentReference":[{"ID":{"value":""},"DocumentTypeCode":{"value":"File ID","listID":"urn:tradeshift.com:api:1.0:documenttypecode"}}],"AccountingCustomerParty":{"Party":{"PartyIdentification":[{"ID":{"value":"927635b5-f469-493b-9ce0-b2bfc4062959","schemeID":"TS:ID","schemeName":"Tradeshift identifier"}}],"PartyName":[{"Name":{"value":null}}],"PostalAddress":{"StreetName":{"value":null},"BuildingNumber":{"value":null},"CityName":{"value":null},"PostalZone":{"value":null},"Country":{"IdentificationCode":{"value":"JP"}}},"Contact":{"ElectronicMail":{"value":null}}}},"Delivery":[{}],"PaymentMeans":[{"PaymentMeansCode":{"value":1,"listID":"urn:tradeshift.com:api:1.0:paymentmeanscode"}}],"InvoiceLine":[{"ID":{"value":"1"},"InvoicedQuantity":{"value":1,"unitCode":"3C"},"LineExtensionAmount":{"value":null,"currencyID":"JPY"},"TaxTotal":[{"TaxSubtotal":[{"TaxCategory":{"ID":{"value":"S","schemeID":"UN/ECE 5305","schemeAgencyID":"6","schemeVersionID":"D08B"},"Percent":{"value":10},"TaxScheme":{"ID":{"value":"VAT","schemeID":"UN/ECE 5153 Subset","schemeAgencyID":"6","schemeVersionID":"D08B"},"Name":{"value":"JP 消費税 10%"}}}}]}],"Item":{"Name":{"value":"明細"},"SellersItemIdentification":{"ID":{"value":"1"}},"Description":[{"value":null}]},"Price":{"PriceAmount":{"value":"1001","currencyID":"JPY"}},"DocumentReference":[{"ID":{"value":""},"DocumentTypeCode":{"value":"File ID","listID":"urn:tradeshift.com:api:1.0:documenttypecode"}}]},{"ID":{"value":"1"},"InvoicedQuantity":{"value":2,"unitCode":"BO"},"LineExtensionAmount":{"value":null,"currencyID":"JPY"},"TaxTotal":[{"TaxSubtotal":[{"TaxCategory":{"ID":{"value":"S","schemeID":"UN/ECE 5305","schemeAgencyID":"6","schemeVersionID":"D08B"},"Percent":{"value":10},"TaxScheme":{"ID":{"value":"VAT","schemeID":"UN/ECE 5153 Subset","schemeAgencyID":"6","schemeVersionID":"D08B"},"Name":{"value":"JP 消費税 10%"}}}}]}],"Item":{"Name":{"value":"明細"},"SellersItemIdentification":{"ID":{"value":"2"}},"Description":[{"value":null}]},"Price":{"PriceAmount":{"value":"1002","currencyID":"JPY"}},"DocumentReference":[{"ID":{"value":""},"DocumentTypeCode":{"value":"File ID","listID":"urn:tradeshift.com:api:1.0:documenttypecode"}}]},{"ID":{"value":"1"},"InvoicedQuantity":{"value":3,"unitCode":"C5"},"LineExtensionAmount":{"value":null,"currencyID":"JPY"},"TaxTotal":[{"TaxSubtotal":[{"TaxCategory":{"ID":{"value":"S","schemeID":"UN/ECE 5305","schemeAgencyID":"6","schemeVersionID":"D08B"},"Percent":{"value":10},"TaxScheme":{"ID":{"value":"VAT","schemeID":"UN/ECE 5153 Subset","schemeAgencyID":"6","schemeVersionID":"D08B"},"Name":{"value":"JP 消費税 10%"}}}}]}],"Item":{"Name":{"value":"明細"},"SellersItemIdentification":{"ID":{"value":"3"}},"Description":[{"value":null}]},"Price":{"PriceAmount":{"value":"1003","currencyID":"JPY"}},"DocumentReference":[{"ID":{"value":""},"DocumentTypeCode":{"value":"File ID","listID":"urn:tradeshift.com:api:1.0:documenttypecode"}}]},{"ID":{"value":"1"},"InvoicedQuantity":{"value":4,"unitCode":"CH"},"LineExtensionAmount":{"value":null,"currencyID":"JPY"},"TaxTotal":[{"TaxSubtotal":[{"TaxCategory":{"ID":{"value":"S","schemeID":"UN/ECE 5305","schemeAgencyID":"6","schemeVersionID":"D08B"},"Percent":{"value":10},"TaxScheme":{"ID":{"value":"VAT","schemeID":"UN/ECE 5153 Subset","schemeAgencyID":"6","schemeVersionID":"D08B"},"Name":{"value":"JP 消費税 10%"}}}}]}],"Item":{"Name":{"value":"明細"},"SellersItemIdentification":{"ID":{"value":"4"}},"Description":[{"value":null}]},"Price":{"PriceAmount":{"value":"1004","currencyID":"JPY"}},"DocumentReference":[{"ID":{"value":""},"DocumentTypeCode":{"value":"File ID","listID":"urn:tradeshift.com:api:1.0:documenttypecode"}}]},{"ID":{"value":"1"},"InvoicedQuantity":{"value":5,"unitCode":"CLT"},"LineExtensionAmount":{"value":null,"currencyID":"JPY"},"TaxTotal":[{"TaxSubtotal":[{"TaxCategory":{"ID":{"value":"S","schemeID":"UN/ECE 5305","schemeAgencyID":"6","schemeVersionID":"D08B"},"Percent":{"value":10},"TaxScheme":{"ID":{"value":"VAT","schemeID":"UN/ECE 5153 Subset","schemeAgencyID":"6","schemeVersionID":"D08B"},"Name":{"value":"JP 消費税 10%"}}}}]}],"Item":{"Name":{"value":"明細"},"SellersItemIdentification":{"ID":{"value":"5"}},"Description":[{"value":null}]},"Price":{"PriceAmount":{"value":"1005","currencyID":"JPY"}},"DocumentReference":[{"ID":{"value":""},"DocumentTypeCode":{"value":"File ID","listID":"urn:tradeshift.com:api:1.0:documenttypecode"}}]},{"ID":{"value":"1"},"InvoicedQuantity":{"value":6,"unitCode":"CMK"},"LineExtensionAmount":{"value":null,"currencyID":"JPY"},"TaxTotal":[{"TaxSubtotal":[{"TaxCategory":{"ID":{"value":"S","schemeID":"UN/ECE 5305","schemeAgencyID":"6","schemeVersionID":"D08B"},"Percent":{"value":10},"TaxScheme":{"ID":{"value":"VAT","schemeID":"UN/ECE 5153 Subset","schemeAgencyID":"6","schemeVersionID":"D08B"},"Name":{"value":"JP 消費税 10%"}}}}]}],"Item":{"Name":{"value":"明細"},"SellersItemIdentification":{"ID":{"value":"6"}},"Description":[{"value":null}]},"Price":{"PriceAmount":{"value":"1006","currencyID":"JPY"}},"DocumentReference":[{"ID":{"value":""},"DocumentTypeCode":{"value":"File ID","listID":"urn:tradeshift.com:api:1.0:documenttypecode"}}]},{"ID":{"value":"1"},"InvoicedQuantity":{"value":7,"unitCode":"CMQ"},"LineExtensionAmount":{"value":null,"currencyID":"JPY"},"TaxTotal":[{"TaxSubtotal":[{"TaxCategory":{"ID":{"value":"S","schemeID":"UN/ECE 5305","schemeAgencyID":"6","schemeVersionID":"D08B"},"Percent":{"value":10},"TaxScheme":{"ID":{"value":"VAT","schemeID":"UN/ECE 5153 Subset","schemeAgencyID":"6","schemeVersionID":"D08B"},"Name":{"value":"JP 消費税 10%"}}}}]}],"Item":{"Name":{"value":"明細"},"SellersItemIdentification":{"ID":{"value":"7"}},"Description":[{"value":null}]},"Price":{"PriceAmount":{"value":"1007","currencyID":"JPY"}},"DocumentReference":[{"ID":{"value":""},"DocumentTypeCode":{"value":"File ID","listID":"urn:tradeshift.com:api:1.0:documenttypecode"}}]},{"ID":{"value":"1"},"InvoicedQuantity":{"value":8,"unitCode":"CMT"},"LineExtensionAmount":{"value":null,"currencyID":"JPY"},"TaxTotal":[{"TaxSubtotal":[{"TaxCategory":{"ID":{"value":"S","schemeID":"UN/ECE 5305","schemeAgencyID":"6","schemeVersionID":"D08B"},"Percent":{"value":10},"TaxScheme":{"ID":{"value":"VAT","schemeID":"UN/ECE 5153 Subset","schemeAgencyID":"6","schemeVersionID":"D08B"},"Name":{"value":"JP 消費税 10%"}}}}]}],"Item":{"Name":{"value":"明細"},"SellersItemIdentification":{"ID":{"value":"8"}},"Description":[{"value":null}]},"Price":{"PriceAmount":{"value":"1008","currencyID":"JPY"}},"DocumentReference":[{"ID":{"value":""},"DocumentTypeCode":{"value":"File ID","listID":"urn:tradeshift.com:api:1.0:documenttypecode"}}]},{"ID":{"value":"1"},"InvoicedQuantity":{"value":8,"unitCode":"CS"},"LineExtensionAmount":{"value":null,"currencyID":"JPY"},"TaxTotal":[{"TaxSubtotal":[{"TaxCategory":{"ID":{"value":"S","schemeID":"UN/ECE 5305","schemeAgencyID":"6","schemeVersionID":"D08B"},"Percent":{"value":10},"TaxScheme":{"ID":{"value":"VAT","schemeID":"UN/ECE 5153 Subset","schemeAgencyID":"6","schemeVersionID":"D08B"},"Name":{"value":"JP 消費税 10%"}}}}]}],"Item":{"Name":{"value":"明細"},"SellersItemIdentification":{"ID":{"value":"8"}},"Description":[{"value":null}]},"Price":{"PriceAmount":{"value":"1008","currencyID":"JPY"}},"DocumentReference":[{"ID":{"value":""},"DocumentTypeCode":{"value":"File ID","listID":"urn:tradeshift.com:api:1.0:documenttypecode"}}]},{"ID":{"value":"1"},"InvoicedQuantity":{"value":8,"unitCode":"CT"},"LineExtensionAmount":{"value":null,"currencyID":"JPY"},"TaxTotal":[{"TaxSubtotal":[{"TaxCategory":{"ID":{"value":"S","schemeID":"UN/ECE 5305","schemeAgencyID":"6","schemeVersionID":"D08B"},"Percent":{"value":10},"TaxScheme":{"ID":{"value":"VAT","schemeID":"UN/ECE 5153 Subset","schemeAgencyID":"6","schemeVersionID":"D08B"},"Name":{"value":"JP 消費税 10%"}}}}]}],"Item":{"Name":{"value":"明細"},"SellersItemIdentification":{"ID":{"value":"8"}},"Description":[{"value":null}]},"Price":{"PriceAmount":{"value":"1008","currencyID":"JPY"}},"DocumentReference":[{"ID":{"value":""},"DocumentTypeCode":{"value":"File ID","listID":"urn:tradeshift.com:api:1.0:documenttypecode"}}]}]}'

  const returnBconCsvUserUnit2 =
    '{"DocumentType":"InvoiceType","UBLVersionID":{"value":"2.0"},"CustomizationID":{"value":"urn:tradeshift.com:ubl-2.0-customizations:2010-06"},"ProfileID":{"value":"urn:www.cenbii.eu:profile:bii04:ver1.0","schemeID":"CWA 16073:2010","schemeAgencyID":"CEN/ISSS WS/BII","schemeVersionID":"1"},"ID":{"value":"TEST20211005"},"IssueDate":{"value":"2021-10-05"},"InvoiceTypeCode":{"value":"380","listID":"UN/ECE 1001 Subset","listAgencyID":"6","listVersionID":"D08B"},"DocumentCurrencyCode":{"value":"JPY"},"Note":[{"value":""}],"AdditionalDocumentReference":[{"ID":{"value":""},"DocumentTypeCode":{"value":"File ID","listID":"urn:tradeshift.com:api:1.0:documenttypecode"}}],"AccountingCustomerParty":{"Party":{"PartyIdentification":[{"ID":{"value":"927635b5-f469-493b-9ce0-b2bfc4062959","schemeID":"TS:ID","schemeName":"Tradeshift identifier"}}],"PartyName":[{"Name":{"value":null}}],"PostalAddress":{"StreetName":{"value":null},"BuildingNumber":{"value":null},"CityName":{"value":null},"PostalZone":{"value":null},"Country":{"IdentificationCode":{"value":"JP"}}},"Contact":{"ElectronicMail":{"value":null}}}},"Delivery":[{}],"PaymentMeans":[{"PaymentMeansCode":{"value":1,"listID":"urn:tradeshift.com:api:1.0:paymentmeanscode"}}],"InvoiceLine":[{"ID":{"value":"1"},"InvoicedQuantity":{"value":1,"unitCode":"DAY"},"LineExtensionAmount":{"value":null,"currencyID":"JPY"},"TaxTotal":[{"TaxSubtotal":[{"TaxCategory":{"ID":{"value":"S","schemeID":"UN/ECE 5305","schemeAgencyID":"6","schemeVersionID":"D08B"},"Percent":{"value":10},"TaxScheme":{"ID":{"value":"VAT","schemeID":"UN/ECE 5153 Subset","schemeAgencyID":"6","schemeVersionID":"D08B"},"Name":{"value":"JP 消費税 10%"}}}}]}],"Item":{"Name":{"value":"明細"},"SellersItemIdentification":{"ID":{"value":"1"}},"Description":[{"value":null}]},"Price":{"PriceAmount":{"value":"1001","currencyID":"JPY"}},"DocumentReference":[{"ID":{"value":""},"DocumentTypeCode":{"value":"File ID","listID":"urn:tradeshift.com:api:1.0:documenttypecode"}}]},{"ID":{"value":"1"},"InvoicedQuantity":{"value":2,"unitCode":"DLT"},"LineExtensionAmount":{"value":null,"currencyID":"JPY"},"TaxTotal":[{"TaxSubtotal":[{"TaxCategory":{"ID":{"value":"S","schemeID":"UN/ECE 5305","schemeAgencyID":"6","schemeVersionID":"D08B"},"Percent":{"value":10},"TaxScheme":{"ID":{"value":"VAT","schemeID":"UN/ECE 5153 Subset","schemeAgencyID":"6","schemeVersionID":"D08B"},"Name":{"value":"JP 消費税 10%"}}}}]}],"Item":{"Name":{"value":"明細"},"SellersItemIdentification":{"ID":{"value":"2"}},"Description":[{"value":null}]},"Price":{"PriceAmount":{"value":"1002","currencyID":"JPY"}},"DocumentReference":[{"ID":{"value":""},"DocumentTypeCode":{"value":"File ID","listID":"urn:tradeshift.com:api:1.0:documenttypecode"}}]},{"ID":{"value":"1"},"InvoicedQuantity":{"value":3,"unitCode":"DMT"},"LineExtensionAmount":{"value":null,"currencyID":"JPY"},"TaxTotal":[{"TaxSubtotal":[{"TaxCategory":{"ID":{"value":"S","schemeID":"UN/ECE 5305","schemeAgencyID":"6","schemeVersionID":"D08B"},"Percent":{"value":10},"TaxScheme":{"ID":{"value":"VAT","schemeID":"UN/ECE 5153 Subset","schemeAgencyID":"6","schemeVersionID":"D08B"},"Name":{"value":"JP 消費税 10%"}}}}]}],"Item":{"Name":{"value":"明細"},"SellersItemIdentification":{"ID":{"value":"3"}},"Description":[{"value":null}]},"Price":{"PriceAmount":{"value":"1003","currencyID":"JPY"}},"DocumentReference":[{"ID":{"value":""},"DocumentTypeCode":{"value":"File ID","listID":"urn:tradeshift.com:api:1.0:documenttypecode"}}]},{"ID":{"value":"1"},"InvoicedQuantity":{"value":4,"unitCode":"E4"},"LineExtensionAmount":{"value":null,"currencyID":"JPY"},"TaxTotal":[{"TaxSubtotal":[{"TaxCategory":{"ID":{"value":"S","schemeID":"UN/ECE 5305","schemeAgencyID":"6","schemeVersionID":"D08B"},"Percent":{"value":10},"TaxScheme":{"ID":{"value":"VAT","schemeID":"UN/ECE 5153 Subset","schemeAgencyID":"6","schemeVersionID":"D08B"},"Name":{"value":"JP 消費税 10%"}}}}]}],"Item":{"Name":{"value":"明細"},"SellersItemIdentification":{"ID":{"value":"4"}},"Description":[{"value":null}]},"Price":{"PriceAmount":{"value":"1004","currencyID":"JPY"}},"DocumentReference":[{"ID":{"value":""},"DocumentTypeCode":{"value":"File ID","listID":"urn:tradeshift.com:api:1.0:documenttypecode"}}]},{"ID":{"value":"1"},"InvoicedQuantity":{"value":5,"unitCode":"EA"},"LineExtensionAmount":{"value":null,"currencyID":"JPY"},"TaxTotal":[{"TaxSubtotal":[{"TaxCategory":{"ID":{"value":"S","schemeID":"UN/ECE 5305","schemeAgencyID":"6","schemeVersionID":"D08B"},"Percent":{"value":10},"TaxScheme":{"ID":{"value":"VAT","schemeID":"UN/ECE 5153 Subset","schemeAgencyID":"6","schemeVersionID":"D08B"},"Name":{"value":"JP 消費税 10%"}}}}]}],"Item":{"Name":{"value":"明細"},"SellersItemIdentification":{"ID":{"value":"5"}},"Description":[{"value":null}]},"Price":{"PriceAmount":{"value":"1005","currencyID":"JPY"}},"DocumentReference":[{"ID":{"value":""},"DocumentTypeCode":{"value":"File ID","listID":"urn:tradeshift.com:api:1.0:documenttypecode"}}]},{"ID":{"value":"1"},"InvoicedQuantity":{"value":6,"unitCode":"FOT"},"LineExtensionAmount":{"value":null,"currencyID":"JPY"},"TaxTotal":[{"TaxSubtotal":[{"TaxCategory":{"ID":{"value":"S","schemeID":"UN/ECE 5305","schemeAgencyID":"6","schemeVersionID":"D08B"},"Percent":{"value":10},"TaxScheme":{"ID":{"value":"VAT","schemeID":"UN/ECE 5153 Subset","schemeAgencyID":"6","schemeVersionID":"D08B"},"Name":{"value":"JP 消費税 10%"}}}}]}],"Item":{"Name":{"value":"明細"},"SellersItemIdentification":{"ID":{"value":"6"}},"Description":[{"value":null}]},"Price":{"PriceAmount":{"value":"1006","currencyID":"JPY"}},"DocumentReference":[{"ID":{"value":""},"DocumentTypeCode":{"value":"File ID","listID":"urn:tradeshift.com:api:1.0:documenttypecode"}}]},{"ID":{"value":"1"},"InvoicedQuantity":{"value":7,"unitCode":"GLL"},"LineExtensionAmount":{"value":null,"currencyID":"JPY"},"TaxTotal":[{"TaxSubtotal":[{"TaxCategory":{"ID":{"value":"S","schemeID":"UN/ECE 5305","schemeAgencyID":"6","schemeVersionID":"D08B"},"Percent":{"value":10},"TaxScheme":{"ID":{"value":"VAT","schemeID":"UN/ECE 5153 Subset","schemeAgencyID":"6","schemeVersionID":"D08B"},"Name":{"value":"JP 消費税 10%"}}}}]}],"Item":{"Name":{"value":"明細"},"SellersItemIdentification":{"ID":{"value":"7"}},"Description":[{"value":null}]},"Price":{"PriceAmount":{"value":"1007","currencyID":"JPY"}},"DocumentReference":[{"ID":{"value":""},"DocumentTypeCode":{"value":"File ID","listID":"urn:tradeshift.com:api:1.0:documenttypecode"}}]},{"ID":{"value":"1"},"InvoicedQuantity":{"value":8,"unitCode":"GRM"},"LineExtensionAmount":{"value":null,"currencyID":"JPY"},"TaxTotal":[{"TaxSubtotal":[{"TaxCategory":{"ID":{"value":"S","schemeID":"UN/ECE 5305","schemeAgencyID":"6","schemeVersionID":"D08B"},"Percent":{"value":10},"TaxScheme":{"ID":{"value":"VAT","schemeID":"UN/ECE 5153 Subset","schemeAgencyID":"6","schemeVersionID":"D08B"},"Name":{"value":"JP 消費税 10%"}}}}]}],"Item":{"Name":{"value":"明細"},"SellersItemIdentification":{"ID":{"value":"8"}},"Description":[{"value":null}]},"Price":{"PriceAmount":{"value":"1008","currencyID":"JPY"}},"DocumentReference":[{"ID":{"value":""},"DocumentTypeCode":{"value":"File ID","listID":"urn:tradeshift.com:api:1.0:documenttypecode"}}]},{"ID":{"value":"1"},"InvoicedQuantity":{"value":8,"unitCode":"GT"},"LineExtensionAmount":{"value":null,"currencyID":"JPY"},"TaxTotal":[{"TaxSubtotal":[{"TaxCategory":{"ID":{"value":"S","schemeID":"UN/ECE 5305","schemeAgencyID":"6","schemeVersionID":"D08B"},"Percent":{"value":10},"TaxScheme":{"ID":{"value":"VAT","schemeID":"UN/ECE 5153 Subset","schemeAgencyID":"6","schemeVersionID":"D08B"},"Name":{"value":"JP 消費税 10%"}}}}]}],"Item":{"Name":{"value":"明細"},"SellersItemIdentification":{"ID":{"value":"8"}},"Description":[{"value":null}]},"Price":{"PriceAmount":{"value":"1008","currencyID":"JPY"}},"DocumentReference":[{"ID":{"value":""},"DocumentTypeCode":{"value":"File ID","listID":"urn:tradeshift.com:api:1.0:documenttypecode"}}]},{"ID":{"value":"1"},"InvoicedQuantity":{"value":8,"unitCode":"HUR"},"LineExtensionAmount":{"value":null,"currencyID":"JPY"},"TaxTotal":[{"TaxSubtotal":[{"TaxCategory":{"ID":{"value":"S","schemeID":"UN/ECE 5305","schemeAgencyID":"6","schemeVersionID":"D08B"},"Percent":{"value":10},"TaxScheme":{"ID":{"value":"VAT","schemeID":"UN/ECE 5153 Subset","schemeAgencyID":"6","schemeVersionID":"D08B"},"Name":{"value":"JP 消費税 10%"}}}}]}],"Item":{"Name":{"value":"明細"},"SellersItemIdentification":{"ID":{"value":"8"}},"Description":[{"value":null}]},"Price":{"PriceAmount":{"value":"1008","currencyID":"JPY"}},"DocumentReference":[{"ID":{"value":""},"DocumentTypeCode":{"value":"File ID","listID":"urn:tradeshift.com:api:1.0:documenttypecode"}}]}]}'

  const returnBconCsvUserUnit3 =
    '{"DocumentType":"InvoiceType","UBLVersionID":{"value":"2.0"},"CustomizationID":{"value":"urn:tradeshift.com:ubl-2.0-customizations:2010-06"},"ProfileID":{"value":"urn:www.cenbii.eu:profile:bii04:ver1.0","schemeID":"CWA 16073:2010","schemeAgencyID":"CEN/ISSS WS/BII","schemeVersionID":"1"},"ID":{"value":"TEST20211005"},"IssueDate":{"value":"2021-10-05"},"InvoiceTypeCode":{"value":"380","listID":"UN/ECE 1001 Subset","listAgencyID":"6","listVersionID":"D08B"},"DocumentCurrencyCode":{"value":"JPY"},"Note":[{"value":""}],"AdditionalDocumentReference":[{"ID":{"value":""},"DocumentTypeCode":{"value":"File ID","listID":"urn:tradeshift.com:api:1.0:documenttypecode"}}],"AccountingCustomerParty":{"Party":{"PartyIdentification":[{"ID":{"value":"927635b5-f469-493b-9ce0-b2bfc4062959","schemeID":"TS:ID","schemeName":"Tradeshift identifier"}}],"PartyName":[{"Name":{"value":null}}],"PostalAddress":{"StreetName":{"value":null},"BuildingNumber":{"value":null},"CityName":{"value":null},"PostalZone":{"value":null},"Country":{"IdentificationCode":{"value":"JP"}}},"Contact":{"ElectronicMail":{"value":null}}}},"Delivery":[{}],"PaymentMeans":[{"PaymentMeansCode":{"value":1,"listID":"urn:tradeshift.com:api:1.0:paymentmeanscode"}}],"InvoiceLine":[{"ID":{"value":"1"},"InvoicedQuantity":{"value":1,"unitCode":"KGM"},"LineExtensionAmount":{"value":null,"currencyID":"JPY"},"TaxTotal":[{"TaxSubtotal":[{"TaxCategory":{"ID":{"value":"S","schemeID":"UN/ECE 5305","schemeAgencyID":"6","schemeVersionID":"D08B"},"Percent":{"value":10},"TaxScheme":{"ID":{"value":"VAT","schemeID":"UN/ECE 5153 Subset","schemeAgencyID":"6","schemeVersionID":"D08B"},"Name":{"value":"JP 消費税 10%"}}}}]}],"Item":{"Name":{"value":"明細"},"SellersItemIdentification":{"ID":{"value":"1"}},"Description":[{"value":null}]},"Price":{"PriceAmount":{"value":"1001","currencyID":"JPY"}},"DocumentReference":[{"ID":{"value":""},"DocumentTypeCode":{"value":"File ID","listID":"urn:tradeshift.com:api:1.0:documenttypecode"}}]},{"ID":{"value":"1"},"InvoicedQuantity":{"value":2,"unitCode":"KTM"},"LineExtensionAmount":{"value":null,"currencyID":"JPY"},"TaxTotal":[{"TaxSubtotal":[{"TaxCategory":{"ID":{"value":"S","schemeID":"UN/ECE 5305","schemeAgencyID":"6","schemeVersionID":"D08B"},"Percent":{"value":10},"TaxScheme":{"ID":{"value":"VAT","schemeID":"UN/ECE 5153 Subset","schemeAgencyID":"6","schemeVersionID":"D08B"},"Name":{"value":"JP 消費税 10%"}}}}]}],"Item":{"Name":{"value":"明細"},"SellersItemIdentification":{"ID":{"value":"2"}},"Description":[{"value":null}]},"Price":{"PriceAmount":{"value":"1002","currencyID":"JPY"}},"DocumentReference":[{"ID":{"value":""},"DocumentTypeCode":{"value":"File ID","listID":"urn:tradeshift.com:api:1.0:documenttypecode"}}]},{"ID":{"value":"1"},"InvoicedQuantity":{"value":3,"unitCode":"KWH"},"LineExtensionAmount":{"value":null,"currencyID":"JPY"},"TaxTotal":[{"TaxSubtotal":[{"TaxCategory":{"ID":{"value":"S","schemeID":"UN/ECE 5305","schemeAgencyID":"6","schemeVersionID":"D08B"},"Percent":{"value":10},"TaxScheme":{"ID":{"value":"VAT","schemeID":"UN/ECE 5153 Subset","schemeAgencyID":"6","schemeVersionID":"D08B"},"Name":{"value":"JP 消費税 10%"}}}}]}],"Item":{"Name":{"value":"明細"},"SellersItemIdentification":{"ID":{"value":"3"}},"Description":[{"value":null}]},"Price":{"PriceAmount":{"value":"1003","currencyID":"JPY"}},"DocumentReference":[{"ID":{"value":""},"DocumentTypeCode":{"value":"File ID","listID":"urn:tradeshift.com:api:1.0:documenttypecode"}}]},{"ID":{"value":"1"},"InvoicedQuantity":{"value":4,"unitCode":"LBR"},"LineExtensionAmount":{"value":null,"currencyID":"JPY"},"TaxTotal":[{"TaxSubtotal":[{"TaxCategory":{"ID":{"value":"S","schemeID":"UN/ECE 5305","schemeAgencyID":"6","schemeVersionID":"D08B"},"Percent":{"value":10},"TaxScheme":{"ID":{"value":"VAT","schemeID":"UN/ECE 5153 Subset","schemeAgencyID":"6","schemeVersionID":"D08B"},"Name":{"value":"JP 消費税 10%"}}}}]}],"Item":{"Name":{"value":"明細"},"SellersItemIdentification":{"ID":{"value":"4"}},"Description":[{"value":null}]},"Price":{"PriceAmount":{"value":"1004","currencyID":"JPY"}},"DocumentReference":[{"ID":{"value":""},"DocumentTypeCode":{"value":"File ID","listID":"urn:tradeshift.com:api:1.0:documenttypecode"}}]},{"ID":{"value":"1"},"InvoicedQuantity":{"value":5,"unitCode":"LTR"},"LineExtensionAmount":{"value":null,"currencyID":"JPY"},"TaxTotal":[{"TaxSubtotal":[{"TaxCategory":{"ID":{"value":"S","schemeID":"UN/ECE 5305","schemeAgencyID":"6","schemeVersionID":"D08B"},"Percent":{"value":10},"TaxScheme":{"ID":{"value":"VAT","schemeID":"UN/ECE 5153 Subset","schemeAgencyID":"6","schemeVersionID":"D08B"},"Name":{"value":"JP 消費税 10%"}}}}]}],"Item":{"Name":{"value":"明細"},"SellersItemIdentification":{"ID":{"value":"5"}},"Description":[{"value":null}]},"Price":{"PriceAmount":{"value":"1005","currencyID":"JPY"}},"DocumentReference":[{"ID":{"value":""},"DocumentTypeCode":{"value":"File ID","listID":"urn:tradeshift.com:api:1.0:documenttypecode"}}]},{"ID":{"value":"1"},"InvoicedQuantity":{"value":6,"unitCode":"MGM"},"LineExtensionAmount":{"value":null,"currencyID":"JPY"},"TaxTotal":[{"TaxSubtotal":[{"TaxCategory":{"ID":{"value":"S","schemeID":"UN/ECE 5305","schemeAgencyID":"6","schemeVersionID":"D08B"},"Percent":{"value":10},"TaxScheme":{"ID":{"value":"VAT","schemeID":"UN/ECE 5153 Subset","schemeAgencyID":"6","schemeVersionID":"D08B"},"Name":{"value":"JP 消費税 10%"}}}}]}],"Item":{"Name":{"value":"明細"},"SellersItemIdentification":{"ID":{"value":"6"}},"Description":[{"value":null}]},"Price":{"PriceAmount":{"value":"1006","currencyID":"JPY"}},"DocumentReference":[{"ID":{"value":""},"DocumentTypeCode":{"value":"File ID","listID":"urn:tradeshift.com:api:1.0:documenttypecode"}}]},{"ID":{"value":"1"},"InvoicedQuantity":{"value":7,"unitCode":"MLT"},"LineExtensionAmount":{"value":null,"currencyID":"JPY"},"TaxTotal":[{"TaxSubtotal":[{"TaxCategory":{"ID":{"value":"S","schemeID":"UN/ECE 5305","schemeAgencyID":"6","schemeVersionID":"D08B"},"Percent":{"value":10},"TaxScheme":{"ID":{"value":"VAT","schemeID":"UN/ECE 5153 Subset","schemeAgencyID":"6","schemeVersionID":"D08B"},"Name":{"value":"JP 消費税 10%"}}}}]}],"Item":{"Name":{"value":"明細"},"SellersItemIdentification":{"ID":{"value":"7"}},"Description":[{"value":null}]},"Price":{"PriceAmount":{"value":"1007","currencyID":"JPY"}},"DocumentReference":[{"ID":{"value":""},"DocumentTypeCode":{"value":"File ID","listID":"urn:tradeshift.com:api:1.0:documenttypecode"}}]},{"ID":{"value":"1"},"InvoicedQuantity":{"value":8,"unitCode":"MMT"},"LineExtensionAmount":{"value":null,"currencyID":"JPY"},"TaxTotal":[{"TaxSubtotal":[{"TaxCategory":{"ID":{"value":"S","schemeID":"UN/ECE 5305","schemeAgencyID":"6","schemeVersionID":"D08B"},"Percent":{"value":10},"TaxScheme":{"ID":{"value":"VAT","schemeID":"UN/ECE 5153 Subset","schemeAgencyID":"6","schemeVersionID":"D08B"},"Name":{"value":"JP 消費税 10%"}}}}]}],"Item":{"Name":{"value":"明細"},"SellersItemIdentification":{"ID":{"value":"8"}},"Description":[{"value":null}]},"Price":{"PriceAmount":{"value":"1008","currencyID":"JPY"}},"DocumentReference":[{"ID":{"value":""},"DocumentTypeCode":{"value":"File ID","listID":"urn:tradeshift.com:api:1.0:documenttypecode"}}]},{"ID":{"value":"1"},"InvoicedQuantity":{"value":8,"unitCode":"MON"},"LineExtensionAmount":{"value":null,"currencyID":"JPY"},"TaxTotal":[{"TaxSubtotal":[{"TaxCategory":{"ID":{"value":"S","schemeID":"UN/ECE 5305","schemeAgencyID":"6","schemeVersionID":"D08B"},"Percent":{"value":10},"TaxScheme":{"ID":{"value":"VAT","schemeID":"UN/ECE 5153 Subset","schemeAgencyID":"6","schemeVersionID":"D08B"},"Name":{"value":"JP 消費税 10%"}}}}]}],"Item":{"Name":{"value":"明細"},"SellersItemIdentification":{"ID":{"value":"8"}},"Description":[{"value":null}]},"Price":{"PriceAmount":{"value":"1008","currencyID":"JPY"}},"DocumentReference":[{"ID":{"value":""},"DocumentTypeCode":{"value":"File ID","listID":"urn:tradeshift.com:api:1.0:documenttypecode"}}]},{"ID":{"value":"1"},"InvoicedQuantity":{"value":8,"unitCode":"MTK"},"LineExtensionAmount":{"value":null,"currencyID":"JPY"},"TaxTotal":[{"TaxSubtotal":[{"TaxCategory":{"ID":{"value":"S","schemeID":"UN/ECE 5305","schemeAgencyID":"6","schemeVersionID":"D08B"},"Percent":{"value":10},"TaxScheme":{"ID":{"value":"VAT","schemeID":"UN/ECE 5153 Subset","schemeAgencyID":"6","schemeVersionID":"D08B"},"Name":{"value":"JP 消費税 10%"}}}}]}],"Item":{"Name":{"value":"明細"},"SellersItemIdentification":{"ID":{"value":"8"}},"Description":[{"value":null}]},"Price":{"PriceAmount":{"value":"1008","currencyID":"JPY"}},"DocumentReference":[{"ID":{"value":""},"DocumentTypeCode":{"value":"File ID","listID":"urn:tradeshift.com:api:1.0:documenttypecode"}}]},{"ID":{"value":"1"},"InvoicedQuantity":{"value":1,"unitCode":"MTQ"},"LineExtensionAmount":{"value":null,"currencyID":"JPY"},"TaxTotal":[{"TaxSubtotal":[{"TaxCategory":{"ID":{"value":"S","schemeID":"UN/ECE 5305","schemeAgencyID":"6","schemeVersionID":"D08B"},"Percent":{"value":10},"TaxScheme":{"ID":{"value":"VAT","schemeID":"UN/ECE 5153 Subset","schemeAgencyID":"6","schemeVersionID":"D08B"},"Name":{"value":"JP 消費税 10%"}}}}]}],"Item":{"Name":{"value":"明細"},"SellersItemIdentification":{"ID":{"value":"1"}},"Description":[{"value":null}]},"Price":{"PriceAmount":{"value":"1001","currencyID":"JPY"}},"DocumentReference":[{"ID":{"value":""},"DocumentTypeCode":{"value":"File ID","listID":"urn:tradeshift.com:api:1.0:documenttypecode"}}]},{"ID":{"value":"1"},"InvoicedQuantity":{"value":2,"unitCode":"MTR"},"LineExtensionAmount":{"value":null,"currencyID":"JPY"},"TaxTotal":[{"TaxSubtotal":[{"TaxCategory":{"ID":{"value":"S","schemeID":"UN/ECE 5305","schemeAgencyID":"6","schemeVersionID":"D08B"},"Percent":{"value":10},"TaxScheme":{"ID":{"value":"VAT","schemeID":"UN/ECE 5153 Subset","schemeAgencyID":"6","schemeVersionID":"D08B"},"Name":{"value":"JP 消費税 10%"}}}}]}],"Item":{"Name":{"value":"明細"},"SellersItemIdentification":{"ID":{"value":"2"}},"Description":[{"value":null}]},"Price":{"PriceAmount":{"value":"1002","currencyID":"JPY"}},"DocumentReference":[{"ID":{"value":""},"DocumentTypeCode":{"value":"File ID","listID":"urn:tradeshift.com:api:1.0:documenttypecode"}}]},{"ID":{"value":"1"},"InvoicedQuantity":{"value":3,"unitCode":"NT"},"LineExtensionAmount":{"value":null,"currencyID":"JPY"},"TaxTotal":[{"TaxSubtotal":[{"TaxCategory":{"ID":{"value":"S","schemeID":"UN/ECE 5305","schemeAgencyID":"6","schemeVersionID":"D08B"},"Percent":{"value":10},"TaxScheme":{"ID":{"value":"VAT","schemeID":"UN/ECE 5153 Subset","schemeAgencyID":"6","schemeVersionID":"D08B"},"Name":{"value":"JP 消費税 10%"}}}}]}],"Item":{"Name":{"value":"明細"},"SellersItemIdentification":{"ID":{"value":"3"}},"Description":[{"value":null}]},"Price":{"PriceAmount":{"value":"1003","currencyID":"JPY"}},"DocumentReference":[{"ID":{"value":""},"DocumentTypeCode":{"value":"File ID","listID":"urn:tradeshift.com:api:1.0:documenttypecode"}}]},{"ID":{"value":"1"},"InvoicedQuantity":{"value":4,"unitCode":"PK"},"LineExtensionAmount":{"value":null,"currencyID":"JPY"},"TaxTotal":[{"TaxSubtotal":[{"TaxCategory":{"ID":{"value":"S","schemeID":"UN/ECE 5305","schemeAgencyID":"6","schemeVersionID":"D08B"},"Percent":{"value":10},"TaxScheme":{"ID":{"value":"VAT","schemeID":"UN/ECE 5153 Subset","schemeAgencyID":"6","schemeVersionID":"D08B"},"Name":{"value":"JP 消費税 10%"}}}}]}],"Item":{"Name":{"value":"明細"},"SellersItemIdentification":{"ID":{"value":"4"}},"Description":[{"value":null}]},"Price":{"PriceAmount":{"value":"1004","currencyID":"JPY"}},"DocumentReference":[{"ID":{"value":""},"DocumentTypeCode":{"value":"File ID","listID":"urn:tradeshift.com:api:1.0:documenttypecode"}}]},{"ID":{"value":"1"},"InvoicedQuantity":{"value":5,"unitCode":"RO"},"LineExtensionAmount":{"value":null,"currencyID":"JPY"},"TaxTotal":[{"TaxSubtotal":[{"TaxCategory":{"ID":{"value":"S","schemeID":"UN/ECE 5305","schemeAgencyID":"6","schemeVersionID":"D08B"},"Percent":{"value":10},"TaxScheme":{"ID":{"value":"VAT","schemeID":"UN/ECE 5153 Subset","schemeAgencyID":"6","schemeVersionID":"D08B"},"Name":{"value":"JP 消費税 10%"}}}}]}],"Item":{"Name":{"value":"明細"},"SellersItemIdentification":{"ID":{"value":"5"}},"Description":[{"value":null}]},"Price":{"PriceAmount":{"value":"1005","currencyID":"JPY"}},"DocumentReference":[{"ID":{"value":""},"DocumentTypeCode":{"value":"File ID","listID":"urn:tradeshift.com:api:1.0:documenttypecode"}}]},{"ID":{"value":"1"},"InvoicedQuantity":{"value":6,"unitCode":"SET"},"LineExtensionAmount":{"value":null,"currencyID":"JPY"},"TaxTotal":[{"TaxSubtotal":[{"TaxCategory":{"ID":{"value":"S","schemeID":"UN/ECE 5305","schemeAgencyID":"6","schemeVersionID":"D08B"},"Percent":{"value":10},"TaxScheme":{"ID":{"value":"VAT","schemeID":"UN/ECE 5153 Subset","schemeAgencyID":"6","schemeVersionID":"D08B"},"Name":{"value":"JP 消費税 10%"}}}}]}],"Item":{"Name":{"value":"明細"},"SellersItemIdentification":{"ID":{"value":"6"}},"Description":[{"value":null}]},"Price":{"PriceAmount":{"value":"1006","currencyID":"JPY"}},"DocumentReference":[{"ID":{"value":""},"DocumentTypeCode":{"value":"File ID","listID":"urn:tradeshift.com:api:1.0:documenttypecode"}}]},{"ID":{"value":"1"},"InvoicedQuantity":{"value":7,"unitCode":"TNE"},"LineExtensionAmount":{"value":null,"currencyID":"JPY"},"TaxTotal":[{"TaxSubtotal":[{"TaxCategory":{"ID":{"value":"S","schemeID":"UN/ECE 5305","schemeAgencyID":"6","schemeVersionID":"D08B"},"Percent":{"value":10},"TaxScheme":{"ID":{"value":"VAT","schemeID":"UN/ECE 5153 Subset","schemeAgencyID":"6","schemeVersionID":"D08B"},"Name":{"value":"JP 消費税 10%"}}}}]}],"Item":{"Name":{"value":"明細"},"SellersItemIdentification":{"ID":{"value":"7"}},"Description":[{"value":null}]},"Price":{"PriceAmount":{"value":"1007","currencyID":"JPY"}},"DocumentReference":[{"ID":{"value":""},"DocumentTypeCode":{"value":"File ID","listID":"urn:tradeshift.com:api:1.0:documenttypecode"}}]},{"ID":{"value":"1"},"InvoicedQuantity":{"value":8,"unitCode":"ZZ"},"LineExtensionAmount":{"value":null,"currencyID":"JPY"},"TaxTotal":[{"TaxSubtotal":[{"TaxCategory":{"ID":{"value":"S","schemeID":"UN/ECE 5305","schemeAgencyID":"6","schemeVersionID":"D08B"},"Percent":{"value":10},"TaxScheme":{"ID":{"value":"VAT","schemeID":"UN/ECE 5153 Subset","schemeAgencyID":"6","schemeVersionID":"D08B"},"Name":{"value":"JP 消費税 10%"}}}}]}],"Item":{"Name":{"value":"明細"},"SellersItemIdentification":{"ID":{"value":"8"}},"Description":[{"value":null}]},"Price":{"PriceAmount":{"value":"1008","currencyID":"JPY"}},"DocumentReference":[{"ID":{"value":""},"DocumentTypeCode":{"value":"File ID","listID":"urn:tradeshift.com:api:1.0:documenttypecode"}}]}]}'

  describe('ルーティング', () => {
    test('csvuploadのルーティングを確認', async () => {
      expect(csvupload.router.get).toBeCalledWith('/', helper.isAuthenticated, expect.anything(), csvupload.cbGetIndex)
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
      findAllByContractIdSpy.mockReturnValue(findAllResult)
      checkContractStatusSpy.mockReturnValue('00')

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
      expect(response.render).toHaveBeenCalledWith('csvupload', {
        formatkindsArr: findAllResult
      })
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
      checkContractStatusSpy.mockReturnValue('30')

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
      checkContractStatusSpy.mockReturnValue('31')

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
      checkContractStatusSpy.mockReturnValue(999)

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
      checkContractStatusSpy.mockReturnValue('00')

      // ファイルデータを設定
      request.body = {
        fileData: fileData,
        uploadFormatId: ''
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
      checkContractStatusSpy.mockReturnValue('00')

      // ファイルデータを設定
      request.body = {
        fileData: fileData2,
        uploadFormatId: ''
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
      checkContractStatusSpy.mockReturnValue('00')

      // ファイルデータを設定
      request.body = {
        fileData: fileData3,
        uploadFormatId: ''
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
      checkContractStatusSpy.mockReturnValue('00')

      // ファイルデータを設定
      request.body = {
        fileData: fileData4,
        uploadFormatId: ''
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
      checkContractStatusSpy.mockReturnValue('30')

      // ファイルデータを設定
      request.body = {
        fileData: fileData,
        uploadFormatId: ''
      }

      // 試験実施
      await csvupload.cbPostUpload(request, response, next)

      // 期待結果
      // 404，500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(500))
      // response.statusが「400」
      expect(response.status).toHaveBeenCalledWith(400)
      expect(response.send).toHaveBeenCalledWith()
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
      checkContractStatusSpy.mockReturnValue('31')

      // ファイルデータを設定
      request.body = {
        fileData: fileData,
        uploadFormatId: ''
      }

      // 試験実施
      await csvupload.cbPostUpload(request, response, next)

      // 期待結果
      // 404，500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(500))
      // response.statusが「400」
      expect(response.status).toHaveBeenCalledWith(400)
      expect(response.send).toHaveBeenCalledWith()
    })

    test('500エラー:DBから契約情報が取得できなかった(null)場合', async () => {
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
      findOneSpyContracts.mockReturnValue(null)

      // ファイルデータを設定
      request.body = {
        fileData,
        uploadFormatId: ''
      }

      // 試験実施
      await csvupload.cbPostUpload(request, response, next)

      // 期待結果
      // 404，500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      // response.statusが「500」で予想したsendデータである
      expect(response.status).toHaveBeenCalledWith(500)
      expect(response.send).toHaveBeenCalledWith(constantsDefine.statusConstants.SYSTEMERRORMESSAGE)
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
      checkContractStatusSpy.mockReturnValue(999)

      // ファイルデータを設定
      request.body = {
        fileData,
        uploadFormatId: ''
      }

      // 試験実施
      await csvupload.cbPostUpload(request, response, next)

      // 期待結果
      // 404，500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      // response.statusが「500」で予想したsendデータである
      expect(response.status).toHaveBeenCalledWith(500)
      expect(response.send).toHaveBeenCalledWith(constantsDefine.statusConstants.SYSTEMERRORMESSAGE)
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
      // DBからの正常な契約情報取得を想定する
      findOneSpyContracts.mockReturnValue(contractdataValues)
      checkContractStatusSpy.mockReturnValue('00')

      // ファイルデータを設定
      request.body = {
        fileData: fileData,
        uploadFormatId: ''
      }

      // 試験実施
      await csvupload.cbPostUpload(request, response, next)

      // 期待結果
      // response.statusが「500」で予想したsendデータである
      expect(response.status).toHaveBeenCalledWith(500)
      expect(response.send).toHaveBeenCalledWith(constantsDefine.statusConstants.SYSTEMERRORMESSAGE)
    })

    test('500エラー：cbRemoveCsv return false', async () => {
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
        fileData: fileData,
        uploadFormatId: ''
      }

      // CSVファイルアップロードパス設定
      pathSpy.mockReturnValue('/test')
      pathSpy.mockReturnValue('/home/upload/')

      // 試験実施
      await csvupload.cbPostUpload(request, response, next)

      // 期待結果
      // response.statusが「500」で予想したsendデータである
      expect(response.status).toHaveBeenCalledWith(500)
      expect(response.send).toHaveBeenCalledWith(constantsDefine.statusConstants.SYSTEMERRORMESSAGE)
    })

    test('500エラー：requestのsession,userIdがnullの場合', async () => {
      // 準備
      // requestのsession,userIdにnullを入れる
      request.session = null
      request.user = usernull

      // 試験実施
      await csvupload.cbPostUpload(request, response, next)

      // 期待結果
      // response.statusが「500」で予想したsendデータである
      expect(response.status).toHaveBeenCalledWith(500)
      expect(response.send).toHaveBeenCalledWith(constantsDefine.statusConstants.SYSTEMERRORMESSAGE)
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
      // response.statusが「500」で予想したsendデータである
      expect(response.status).toHaveBeenCalledWith(500)
      expect(response.send).toHaveBeenCalledWith(constantsDefine.statusConstants.SYSTEMERRORMESSAGE)
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
      // response.statusが「500」で予想したsendデータである
      expect(response.status).toHaveBeenCalledWith(500)
      expect(response.send).toHaveBeenCalledWith(constantsDefine.statusConstants.SYSTEMERRORMESSAGE)
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
        fileData: fileData100,
        uploadFormatId: ''
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
        fileData: fileData200,
        uploadFormatId: ''
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

      const user1 = {
        ...user,
        accessToken: 'dummyAccess'
      }
      request.user = user1
      // DBからの正常なユーザデータの取得を想定する
      findOneSpy.mockReturnValue(dataValues)
      createSpyInvoices.mockReturnValue(invoiceData)
      // DBからの正常な契約情報取得を想定する
      findOneSpyContracts.mockReturnValue(contractdataValues)
      checkContractStatusSpy.mockReturnValue('00')

      const csvFileName = 'fileData101.csv'
      const csvFilePath = path.resolve(`./testData/${csvFileName}`)
      const fileData = Buffer.from(
        fs.readFileSync(csvFilePath, {
          encoding: 'utf-8',
          flag: 'r'
        })
      ).toString('base64')

      // ファイルデータを設定
      request.body = {
        fileData: fileData,
        uploadFormatId: ''
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
      checkContractStatusSpy.mockReturnValue('00')

      const csvFileName = 'fileData201.csv'
      const csvFilePath = path.resolve(`./testData/${csvFileName}`)
      const fileData = Buffer.from(
        fs.readFileSync(csvFilePath, {
          encoding: 'utf-8',
          flag: 'r'
        })
      ).toString('base64')

      // ファイルデータを設定
      request.body = {
        fileData: fileData,
        uploadFormatId: ''
      }

      // 試験実施
      await csvupload.cbPostUpload(request, response, next)

      // 期待結果
      expect(response.statusCode).toBe(200)
      expect(response.body).toBe(constantsDefine.statusConstants.OVER_SPECIFICATION)
    })

    test('準正常：csvバリデーションチェックにエラーが発生した場合', async () => {
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
      checkContractStatusSpy.mockReturnValue('00')

      const csvFileName = 'accountIdTypeErr.csv'
      const csvFilePath = path.resolve(`./testData/${csvFileName}`)
      const fileData = Buffer.from(
        fs.readFileSync(csvFilePath, {
          encoding: 'utf-8',
          flag: 'r'
        })
      ).toString('base64')

      // ファイルデータを設定
      request.body = {
        fileData: fileData,
        uploadFormatId: ''
      }

      // 試験実施
      await csvupload.cbPostUpload(request, response, next)

      // 期待結果
      expect(response.statusCode).toBe(200)
      expect(response.body).toBe(constantsDefine.statusConstants.INVOICE_VALIDATE_FAILED)
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
      checkContractStatusSpy.mockReturnValue('00')

      const csvFileName = 'fileDataSkipInvoice.csv'
      const csvFilePath = path.resolve(`./testData/${csvFileName}`)
      const fileData = Buffer.from(
        fs.readFileSync(csvFilePath, {
          encoding: 'utf-8',
          flag: 'r'
        })
      ).toString('base64')

      // ファイルデータを設定
      request.body = {
        fileData: fileData,
        uploadFormatId: ''
      }

      // 試験実施
      await csvupload.cbPostUpload(request, response, next)

      // 期待結果
      expect(response.statusCode).toBe(200)
      expect(response.body).toBe(constantsDefine.statusConstants.OVERLAPPED_INVOICE)
    })

    test('準正常：APIエラー（ネットワークテナントID取得）', async () => {
      // 準備
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
      checkContractStatusSpy.mockReturnValue('00')

      const csvFileName = 'networkCheckData.csv'
      const csvFilePath = path.resolve(`./testData/${csvFileName}`)
      const fileData = Buffer.from(
        fs.readFileSync(csvFilePath, {
          encoding: 'utf-8',
          flag: 'r'
        })
      ).toString()

      const expectError = new Error()
      expectError.name = 'Bad Request'
      expectError.response = { status: 400 }
      expectError.message = 'Bad Request 400'

      apiManager.accessTradeshift = jest.fn((req, refreshToken, method, query, body = {}, config = {}) => {
        switch (method) {
          case 'get':
            if (
              query.match(
                /^\/documents\?stag=draft&stag=outbox&_onlyIndex=true&includesourcedocuments=false&populatePersonInfo=false&limit=10000/i
              )
            ) {
              if (
                query.match(
                  /^\/documents\?stag=draft&stag=outbox&_onlyIndex=true&includesourcedocuments=false&populatePersonInfo=false&limit=10000&page=/i
                )
              ) {
                return documentListData2
              }
              return documentListData
            }
            if (query.match(/^\/network\?limit=100/i)) {
              if (query.match(/^\/network\?limit=100&page=/i)) {
                return expectError
              }
              return expectError
            }
            break
          case 'put':
            return 200
        }
      })

      const tmpApiManager = apiManager.accessTradeshift
      // request uplodadFormatId 空
      // ファイルデータを設定
      request.body = {
        fileData: fileData,
        uploadFormatId: ''
      }

      // 試験実施
      await csvupload.cbPostUpload(request, response, next)

      apiManager.accessTradeshift = tmpApiManager

      // response.statusが200
      expect(response.status).toHaveBeenCalledWith(200)
      // response.bodyに予想したデータが入っている
      expect(response.body).toBe(constantsDefine.statusConstants.INVOICE_VALIDATE_FAILED)
    })

    test('hotfix1483：請求書【スキップ、成功、スキップ】', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      const fs = require('fs')
      const path = require('path')
      const fileName = 'hotfix1483_1.csv'
      const filePath = path.resolve(`./testData/${fileName}`)
      const fileData = Buffer.from(
        fs.readFileSync(filePath, {
          encoding: 'utf-8',
          flag: 'r'
        })
      ).toString('base64')

      const invoicesDB = []
      const invoiceDetailDB = []

      request.session = {
        userContext: 'NotLoggedIn',
        userRole: 'dummy'
      }

      userController.findOne = jest.fn((userId) => {
        return dataValues
      })
      tenantController.findOne = jest.fn((tenantid) => {
        return contractdataValues
      })
      contractController.findOne = jest.fn((tenantid) => {
        return contractdataValues
      })
      invoiceController.insert = jest.fn((values) => {
        const userTenantId = values?.tenantId
        let tenantRow
        let tenantId
        let resultToInsertInvoice
        if (!userTenantId) {
          return
        }
        try {
          tenantRow = tenantController.findOne(userTenantId)
          tenantId = tenantRow?.dataValues?.tenantId
        } catch (error) {
          return
        }

        if (!tenantId) {
          return
        }

        try {
          resultToInsertInvoice = {
            ...values,
            tenantId: tenantId
          }
          invoicesDB.push(resultToInsertInvoice)
        } catch (error) {
          return
        }
        return { dataValues: resultToInsertInvoice }
      })
      invoiceController.findInvoice = jest.fn((invoice) => {
        const result = { dataValues: null }
        invoicesDB.forEach((invoiceElement) => {
          if (invoiceElement.invoicesId === invoice) {
            result.dataValues = invoiceElement
          }
        })
        return result
      })
      invoiceDetailController.insert = jest.fn((values) => {
        const invoicesId = values?.invoicesId

        if (!invoicesId) {
          return
        }

        const invoiceRow = invoiceController.findInvoice(invoicesId)

        if (!invoiceRow?.dataValues.invoicesId) {
          return
        }

        let resultToInsertInvoiceDetail

        try {
          resultToInsertInvoiceDetail = {
            ...values,
            invoicesId: invoiceRow?.dataValues.invoicesId
          }
          invoiceDetailDB.push(resultToInsertInvoiceDetail)
        } catch (error) {}
        return { dataValues: resultToInsertInvoiceDetail }
      })
      invoiceController.updateCount = jest.fn(({ invoicesId, successCount, failCount, skipCount, invoiceCount }) => {
        try {
          const invoice = [1]
          invoicesDB.forEach((invoiceElement) => {
            if (invoiceElement.invoicesId === invoicesId) {
              invoiceElement.successCount = successCount
              invoiceElement.failCount = failCount
              invoiceElement.skipCount = skipCount
              invoiceElement.invoiceCount = invoiceCount
            }
          })
          return invoice
        } catch (error) {
          return error
        }
      })

      const hotfix1483User = {
        ...user,
        accessToken: 'dummyAccess'
      }
      request.user = hotfix1483User
      request.body = {
        filename: 'hotfix1483_1.csv',
        fileData: fileData,
        uploadFormatId: ''
      }
      checkContractStatusSpy.mockReturnValue('00')

      // 試験実施
      await csvupload.cbPostUpload(request, response, next)
      // 期待結果
      // DB内容
      // 請求書テーブルの内容確認
      expect(invoicesDB[0].csvFileName).toBe('hotfix1483_1.csv')
      expect(invoicesDB[0].successCount).toBe(2)
      expect(invoicesDB[0].failCount).toBe(0)
      expect(invoicesDB[0].skipCount).toBe(4)
      expect(invoicesDB[0].invoiceCount).toBe(1)

      // 請求書テーブルの内容確認
      expect(invoiceDetailDB[0].invoiceId).toBe('UT_TEST_INVOICE_5_1')
      expect(invoiceDetailDB[0].lines).toBe(1)
      expect(invoiceDetailDB[0].status).toBe(1)
      expect(invoiceDetailDB[0].errorData).toBe(constantsDefine.invoiceErrMsg.SKIP)

      expect(invoiceDetailDB[1].invoiceId).toBe('UT_TEST_INVOICE_5_1')
      expect(invoiceDetailDB[1].lines).toBe(2)
      expect(invoiceDetailDB[1].status).toBe(1)
      expect(invoiceDetailDB[1].errorData).toBe(constantsDefine.invoiceErrMsg.SKIP)

      expect(invoiceDetailDB[2].invoiceId).toBe('UT_TEST_hotfix_1483_1_success')
      expect(invoiceDetailDB[2].lines).toBe(3)
      expect(invoiceDetailDB[2].status).toBe(0)
      expect(invoiceDetailDB[2].errorData).toBe(constantsDefine.invoiceErrMsg.SUCCESS)

      expect(invoiceDetailDB[3].invoiceId).toBe('UT_TEST_hotfix_1483_1_success')
      expect(invoiceDetailDB[3].lines).toBe(4)
      expect(invoiceDetailDB[3].status).toBe(0)
      expect(invoiceDetailDB[3].errorData).toBe(constantsDefine.invoiceErrMsg.SUCCESS)

      expect(invoiceDetailDB[4].invoiceId).toBe('UT_TEST_INVOICE_5_2')
      expect(invoiceDetailDB[4].lines).toBe(5)
      expect(invoiceDetailDB[4].status).toBe(1)
      expect(invoiceDetailDB[4].errorData).toBe(constantsDefine.invoiceErrMsg.SKIP)

      expect(invoiceDetailDB[5].invoiceId).toBe('UT_TEST_INVOICE_5_2')
      expect(invoiceDetailDB[5].lines).toBe(6)
      expect(invoiceDetailDB[5].status).toBe(1)
      expect(invoiceDetailDB[5].errorData).toBe(constantsDefine.invoiceErrMsg.SKIP)
    })

    test('hotfix1483：請求書【スキップ、失敗、スキップ】', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      const fs = require('fs')
      const path = require('path')
      const fileName = 'hotfix1483_2.csv'
      const filePath = path.resolve(`./testData/${fileName}`)
      const fileData = Buffer.from(
        fs.readFileSync(filePath, {
          encoding: 'utf-8',
          flag: 'r'
        })
      ).toString('base64')

      const invoicesDB = []
      const invoiceDetailDB = []

      request.session = {
        userContext: 'NotLoggedIn',
        userRole: 'dummy'
      }

      userController.findOne = jest.fn((userId) => {
        return dataValues
      })
      tenantController.findOne = jest.fn((tenantid) => {
        return contractdataValues
      })
      contractController.findOne = jest.fn((tenantid) => {
        return contractdataValues
      })
      invoiceController.insert = jest.fn((values) => {
        const userTenantId = values?.tenantId
        let tenantRow
        let tenantId
        let resultToInsertInvoice
        if (!userTenantId) {
          return
        }
        try {
          tenantRow = tenantController.findOne(userTenantId)
          tenantId = tenantRow?.dataValues?.tenantId
        } catch (error) {
          return
        }

        if (!tenantId) {
          return
        }

        try {
          resultToInsertInvoice = {
            ...values,
            tenantId: tenantId
          }
          invoicesDB.push(resultToInsertInvoice)
        } catch (error) {
          return
        }
        return { dataValues: resultToInsertInvoice }
      })
      invoiceController.findInvoice = jest.fn((invoice) => {
        const result = { dataValues: null }
        invoicesDB.forEach((invoiceElement) => {
          if (invoiceElement.invoicesId === invoice) {
            result.dataValues = invoiceElement
          }
        })
        return result
      })
      invoiceDetailController.insert = jest.fn((values) => {
        const invoicesId = values?.invoicesId

        if (!invoicesId) {
          return
        }

        const invoiceRow = invoiceController.findInvoice(invoicesId)

        if (!invoiceRow?.dataValues.invoicesId) {
          return
        }

        let resultToInsertInvoiceDetail

        try {
          resultToInsertInvoiceDetail = {
            ...values,
            invoicesId: invoiceRow?.dataValues.invoicesId
          }
          invoiceDetailDB.push(resultToInsertInvoiceDetail)
        } catch (error) {}
        return { dataValues: resultToInsertInvoiceDetail }
      })
      invoiceController.updateCount = jest.fn(({ invoicesId, successCount, failCount, skipCount, invoiceCount }) => {
        try {
          const invoice = [1]
          invoicesDB.forEach((invoiceElement) => {
            if (invoiceElement.invoicesId === invoicesId) {
              invoiceElement.successCount = successCount
              invoiceElement.failCount = failCount
              invoiceElement.skipCount = skipCount
              invoiceElement.invoiceCount = invoiceCount
            }
          })
          return invoice
        } catch (error) {
          return error
        }
      })

      const hotfix1483User = {
        ...user,
        accessToken: 'dummyAccess'
      }
      request.user = hotfix1483User
      request.body = {
        filename: 'hotfix1483_2.csv',
        fileData: fileData,
        uploadFormatId: ''
      }
      checkContractStatusSpy.mockReturnValue('00')

      // 試験実施
      await csvupload.cbPostUpload(request, response, next)
      // 期待結果
      // DB内容
      // 請求書テーブルの内容確認
      expect(invoicesDB[0].csvFileName).toBe('hotfix1483_2.csv')
      expect(invoicesDB[0].successCount).toBe(0)
      expect(invoicesDB[0].failCount).toBe(2)
      expect(invoicesDB[0].skipCount).toBe(4)
      expect(invoicesDB[0].invoiceCount).toBe(0)

      // 請求書テーブルの内容確認
      expect(invoiceDetailDB[0].invoiceId).toBe('UT_TEST_INVOICE_5_1')
      expect(invoiceDetailDB[0].lines).toBe(1)
      expect(invoiceDetailDB[0].status).toBe(1)
      expect(invoiceDetailDB[0].errorData).toBe(constantsDefine.invoiceErrMsg.SKIP)

      expect(invoiceDetailDB[1].invoiceId).toBe('UT_TEST_INVOICE_5_1')
      expect(invoiceDetailDB[1].lines).toBe(2)
      expect(invoiceDetailDB[1].status).toBe(1)
      expect(invoiceDetailDB[1].errorData).toBe(constantsDefine.invoiceErrMsg.SKIP)

      expect(invoiceDetailDB[2].invoiceId).toBe('UT_TEST_hotfix_1483_2_fail')
      expect(invoiceDetailDB[2].lines).toBe(3)
      expect(invoiceDetailDB[2].status).toBe(-1)
      expect(invoiceDetailDB[2].errorData).toBe(`${constantsDefine.invoiceErrMsg.TAXERR001}`)

      expect(invoiceDetailDB[3].invoiceId).toBe('UT_TEST_hotfix_1483_2_fail')
      expect(invoiceDetailDB[3].lines).toBe(4)
      expect(invoiceDetailDB[3].status).toBe(-1)
      expect(invoiceDetailDB[3].errorData).toBe(`${constantsDefine.invoiceErrMsg.UNITERR001}`)

      expect(invoiceDetailDB[4].invoiceId).toBe('UT_TEST_INVOICE_5_2')
      expect(invoiceDetailDB[4].lines).toBe(5)
      expect(invoiceDetailDB[4].status).toBe(1)
      expect(invoiceDetailDB[4].errorData).toBe(constantsDefine.invoiceErrMsg.SKIP)

      expect(invoiceDetailDB[5].invoiceId).toBe('UT_TEST_INVOICE_5_2')
      expect(invoiceDetailDB[5].lines).toBe(6)
      expect(invoiceDetailDB[5].status).toBe(1)
      expect(invoiceDetailDB[5].errorData).toBe(constantsDefine.invoiceErrMsg.SKIP)
    })

    test('hotfix1483：請求書【スキップ、スキップ、スキップ】', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      const fs = require('fs')
      const path = require('path')
      const fileName = 'hotfix1483_3.csv'
      const filePath = path.resolve(`./testData/${fileName}`)
      const fileData = Buffer.from(
        fs.readFileSync(filePath, {
          encoding: 'utf-8',
          flag: 'r'
        })
      ).toString('base64')

      const invoicesDB = []
      const invoiceDetailDB = []

      request.session = {
        userContext: 'NotLoggedIn',
        userRole: 'dummy'
      }

      userController.findOne = jest.fn((userId) => {
        return dataValues
      })
      tenantController.findOne = jest.fn((tenantid) => {
        return contractdataValues
      })
      contractController.findOne = jest.fn((tenantid) => {
        return contractdataValues
      })
      invoiceController.insert = jest.fn((values) => {
        const userTenantId = values?.tenantId
        let tenantRow
        let tenantId
        let resultToInsertInvoice
        if (!userTenantId) {
          return
        }
        try {
          tenantRow = tenantController.findOne(userTenantId)
          tenantId = tenantRow?.dataValues?.tenantId
        } catch (error) {
          return
        }

        if (!tenantId) {
          return
        }

        try {
          resultToInsertInvoice = {
            ...values,
            tenantId: tenantId
          }
          invoicesDB.push(resultToInsertInvoice)
        } catch (error) {
          return
        }
        return { dataValues: resultToInsertInvoice }
      })
      invoiceController.findInvoice = jest.fn((invoice) => {
        const result = { dataValues: null }
        invoicesDB.forEach((invoiceElement) => {
          if (invoiceElement.invoicesId === invoice) {
            result.dataValues = invoiceElement
          }
        })
        return result
      })
      invoiceDetailController.insert = jest.fn((values) => {
        const invoicesId = values?.invoicesId

        if (!invoicesId) {
          return
        }

        const invoiceRow = invoiceController.findInvoice(invoicesId)

        if (!invoiceRow?.dataValues.invoicesId) {
          return
        }

        let resultToInsertInvoiceDetail

        try {
          resultToInsertInvoiceDetail = {
            ...values,
            invoicesId: invoiceRow?.dataValues.invoicesId
          }
          invoiceDetailDB.push(resultToInsertInvoiceDetail)
        } catch (error) {}
        return { dataValues: resultToInsertInvoiceDetail }
      })
      invoiceController.updateCount = jest.fn(({ invoicesId, successCount, failCount, skipCount, invoiceCount }) => {
        try {
          const invoice = [1]
          invoicesDB.forEach((invoiceElement) => {
            if (invoiceElement.invoicesId === invoicesId) {
              invoiceElement.successCount = successCount
              invoiceElement.failCount = failCount
              invoiceElement.skipCount = skipCount
              invoiceElement.invoiceCount = invoiceCount
            }
          })
          return invoice
        } catch (error) {
          return error
        }
      })

      const hotfix1483User = {
        ...user,
        accessToken: 'dummyAccess'
      }
      request.user = hotfix1483User
      request.body = {
        filename: 'hotfix1483_3.csv',
        fileData: fileData,
        uploadFormatId: ''
      }
      checkContractStatusSpy.mockReturnValue('00')

      // 試験実施
      await csvupload.cbPostUpload(request, response, next)
      // 期待結果
      // DB内容
      // 請求書テーブルの内容確認
      expect(invoicesDB[0].csvFileName).toBe('hotfix1483_3.csv')
      expect(invoicesDB[0].successCount).toBe(0)
      expect(invoicesDB[0].failCount).toBe(0)
      expect(invoicesDB[0].skipCount).toBe(6)
      expect(invoicesDB[0].invoiceCount).toBe(0)

      // 請求書テーブルの内容確認
      expect(invoiceDetailDB[0].invoiceId).toBe('UT_TEST_INVOICE_5_1')
      expect(invoiceDetailDB[0].lines).toBe(1)
      expect(invoiceDetailDB[0].status).toBe(1)
      expect(invoiceDetailDB[0].errorData).toBe(constantsDefine.invoiceErrMsg.SKIP)

      expect(invoiceDetailDB[1].invoiceId).toBe('UT_TEST_INVOICE_5_1')
      expect(invoiceDetailDB[1].lines).toBe(2)
      expect(invoiceDetailDB[1].status).toBe(1)
      expect(invoiceDetailDB[1].errorData).toBe(constantsDefine.invoiceErrMsg.SKIP)

      expect(invoiceDetailDB[2].invoiceId).toBe('UT_TEST_INVOICE_5_2')
      expect(invoiceDetailDB[2].lines).toBe(3)
      expect(invoiceDetailDB[2].status).toBe(1)
      expect(invoiceDetailDB[2].errorData).toBe(constantsDefine.invoiceErrMsg.SKIP)

      expect(invoiceDetailDB[3].invoiceId).toBe('UT_TEST_INVOICE_5_2')
      expect(invoiceDetailDB[3].lines).toBe(4)
      expect(invoiceDetailDB[3].status).toBe(1)
      expect(invoiceDetailDB[3].errorData).toBe(constantsDefine.invoiceErrMsg.SKIP)

      expect(invoiceDetailDB[4].invoiceId).toBe('UT_TEST_INVOICE_5_1')
      expect(invoiceDetailDB[4].lines).toBe(5)
      expect(invoiceDetailDB[4].status).toBe(1)
      expect(invoiceDetailDB[4].errorData).toBe(constantsDefine.invoiceErrMsg.SKIP)

      expect(invoiceDetailDB[5].invoiceId).toBe('UT_TEST_INVOICE_5_1')
      expect(invoiceDetailDB[5].lines).toBe(6)
      expect(invoiceDetailDB[5].status).toBe(1)
      expect(invoiceDetailDB[5].errorData).toBe(constantsDefine.invoiceErrMsg.SKIP)
    })

    test('hotfix1483：請求書【スキップ、成功、成功】', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      const fs = require('fs')
      const path = require('path')
      const fileName = 'hotfix1483_4.csv'
      const filePath = path.resolve(`./testData/${fileName}`)
      const fileData = Buffer.from(
        fs.readFileSync(filePath, {
          encoding: 'utf-8',
          flag: 'r'
        })
      ).toString('base64')

      const invoicesDB = []
      const invoiceDetailDB = []

      request.session = {
        userContext: 'NotLoggedIn',
        userRole: 'dummy'
      }

      userController.findOne = jest.fn((userId) => {
        return dataValues
      })
      tenantController.findOne = jest.fn((tenantid) => {
        return contractdataValues
      })
      contractController.findOne = jest.fn((tenantid) => {
        return contractdataValues
      })
      invoiceController.insert = jest.fn((values) => {
        const userTenantId = values?.tenantId
        let tenantRow
        let tenantId
        let resultToInsertInvoice
        if (!userTenantId) {
          return
        }
        try {
          tenantRow = tenantController.findOne(userTenantId)
          tenantId = tenantRow?.dataValues?.tenantId
        } catch (error) {
          return
        }

        if (!tenantId) {
          return
        }

        try {
          resultToInsertInvoice = {
            ...values,
            tenantId: tenantId
          }
          invoicesDB.push(resultToInsertInvoice)
        } catch (error) {
          return
        }
        return { dataValues: resultToInsertInvoice }
      })
      invoiceController.findInvoice = jest.fn((invoice) => {
        const result = { dataValues: null }
        invoicesDB.forEach((invoiceElement) => {
          if (invoiceElement.invoicesId === invoice) {
            result.dataValues = invoiceElement
          }
        })
        return result
      })
      invoiceDetailController.insert = jest.fn((values) => {
        const invoicesId = values?.invoicesId

        if (!invoicesId) {
          return
        }

        const invoiceRow = invoiceController.findInvoice(invoicesId)

        if (!invoiceRow?.dataValues.invoicesId) {
          return
        }

        let resultToInsertInvoiceDetail

        try {
          resultToInsertInvoiceDetail = {
            ...values,
            invoicesId: invoiceRow?.dataValues.invoicesId
          }
          invoiceDetailDB.push(resultToInsertInvoiceDetail)
        } catch (error) {}
        return { dataValues: resultToInsertInvoiceDetail }
      })
      invoiceController.updateCount = jest.fn(({ invoicesId, successCount, failCount, skipCount, invoiceCount }) => {
        try {
          const invoice = [1]
          invoicesDB.forEach((invoiceElement) => {
            if (invoiceElement.invoicesId === invoicesId) {
              invoiceElement.successCount = successCount
              invoiceElement.failCount = failCount
              invoiceElement.skipCount = skipCount
              invoiceElement.invoiceCount = invoiceCount
            }
          })
          return invoice
        } catch (error) {
          return error
        }
      })

      const hotfix1483User = {
        ...user,
        accessToken: 'dummyAccess'
      }
      request.user = hotfix1483User
      request.body = {
        filename: 'hotfix1483_4.csv',
        fileData: fileData,
        uploadFormatId: ''
      }
      checkContractStatusSpy.mockReturnValue('00')

      // 試験実施
      await csvupload.cbPostUpload(request, response, next)
      // 期待結果
      // DB内容
      // 請求書テーブルの内容確認
      expect(invoicesDB[0].csvFileName).toBe('hotfix1483_4.csv')
      expect(invoicesDB[0].successCount).toBe(4)
      expect(invoicesDB[0].failCount).toBe(0)
      expect(invoicesDB[0].skipCount).toBe(2)
      expect(invoicesDB[0].invoiceCount).toBe(2)

      // 請求書テーブルの内容確認
      expect(invoiceDetailDB[0].invoiceId).toBe('UT_TEST_INVOICE_5_1')
      expect(invoiceDetailDB[0].lines).toBe(1)
      expect(invoiceDetailDB[0].status).toBe(1)
      expect(invoiceDetailDB[0].errorData).toBe(constantsDefine.invoiceErrMsg.SKIP)

      expect(invoiceDetailDB[1].invoiceId).toBe('UT_TEST_INVOICE_5_1')
      expect(invoiceDetailDB[1].lines).toBe(2)
      expect(invoiceDetailDB[1].status).toBe(1)
      expect(invoiceDetailDB[1].errorData).toBe(constantsDefine.invoiceErrMsg.SKIP)

      expect(invoiceDetailDB[2].invoiceId).toBe('UT_TEST_hotfix_1483_4_success_1')
      expect(invoiceDetailDB[2].lines).toBe(3)
      expect(invoiceDetailDB[2].status).toBe(0)
      expect(invoiceDetailDB[2].errorData).toBe(constantsDefine.invoiceErrMsg.SUCCESS)

      expect(invoiceDetailDB[3].invoiceId).toBe('UT_TEST_hotfix_1483_4_success_1')
      expect(invoiceDetailDB[3].lines).toBe(4)
      expect(invoiceDetailDB[3].status).toBe(0)
      expect(invoiceDetailDB[3].errorData).toBe(constantsDefine.invoiceErrMsg.SUCCESS)

      expect(invoiceDetailDB[4].invoiceId).toBe('UT_TEST_hotfix_1483_4_success_2')
      expect(invoiceDetailDB[4].lines).toBe(5)
      expect(invoiceDetailDB[4].status).toBe(0)
      expect(invoiceDetailDB[4].errorData).toBe(constantsDefine.invoiceErrMsg.SUCCESS)

      expect(invoiceDetailDB[5].invoiceId).toBe('UT_TEST_hotfix_1483_4_success_2')
      expect(invoiceDetailDB[5].lines).toBe(6)
      expect(invoiceDetailDB[5].status).toBe(0)
      expect(invoiceDetailDB[5].errorData).toBe(constantsDefine.invoiceErrMsg.SUCCESS)
    })

    test('hotfix1483：請求書【スキップ、失敗、成功】', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      const fs = require('fs')
      const path = require('path')
      const fileName = 'hotfix1483_5.csv'
      const filePath = path.resolve(`./testData/${fileName}`)
      const fileData = Buffer.from(
        fs.readFileSync(filePath, {
          encoding: 'utf-8',
          flag: 'r'
        })
      ).toString('base64')

      const invoicesDB = []
      const invoiceDetailDB = []

      request.session = {
        userContext: 'NotLoggedIn',
        userRole: 'dummy'
      }

      userController.findOne = jest.fn((userId) => {
        return dataValues
      })
      tenantController.findOne = jest.fn((tenantid) => {
        return contractdataValues
      })
      contractController.findOne = jest.fn((tenantid) => {
        return contractdataValues
      })
      invoiceController.insert = jest.fn((values) => {
        const userTenantId = values?.tenantId
        let tenantRow
        let tenantId
        let resultToInsertInvoice
        if (!userTenantId) {
          return
        }
        try {
          tenantRow = tenantController.findOne(userTenantId)
          tenantId = tenantRow?.dataValues?.tenantId
        } catch (error) {
          return
        }

        if (!tenantId) {
          return
        }

        try {
          resultToInsertInvoice = {
            ...values,
            tenantId: tenantId
          }
          invoicesDB.push(resultToInsertInvoice)
        } catch (error) {
          return
        }
        return { dataValues: resultToInsertInvoice }
      })
      invoiceController.findInvoice = jest.fn((invoice) => {
        const result = { dataValues: null }
        invoicesDB.forEach((invoiceElement) => {
          if (invoiceElement.invoicesId === invoice) {
            result.dataValues = invoiceElement
          }
        })
        return result
      })
      invoiceDetailController.insert = jest.fn((values) => {
        const invoicesId = values?.invoicesId

        if (!invoicesId) {
          return
        }

        const invoiceRow = invoiceController.findInvoice(invoicesId)

        if (!invoiceRow?.dataValues.invoicesId) {
          return
        }

        let resultToInsertInvoiceDetail

        try {
          resultToInsertInvoiceDetail = {
            ...values,
            invoicesId: invoiceRow?.dataValues.invoicesId
          }
          invoiceDetailDB.push(resultToInsertInvoiceDetail)
        } catch (error) {}
        return { dataValues: resultToInsertInvoiceDetail }
      })
      invoiceController.updateCount = jest.fn(({ invoicesId, successCount, failCount, skipCount, invoiceCount }) => {
        try {
          const invoice = [1]
          invoicesDB.forEach((invoiceElement) => {
            if (invoiceElement.invoicesId === invoicesId) {
              invoiceElement.successCount = successCount
              invoiceElement.failCount = failCount
              invoiceElement.skipCount = skipCount
              invoiceElement.invoiceCount = invoiceCount
            }
          })
          return invoice
        } catch (error) {
          return error
        }
      })

      const hotfix1483User = {
        ...user,
        accessToken: 'dummyAccess'
      }
      request.user = hotfix1483User
      request.body = {
        filename: 'hotfix1483_5.csv',
        fileData: fileData,
        uploadFormatId: ''
      }
      checkContractStatusSpy.mockReturnValue('00')

      // 試験実施
      await csvupload.cbPostUpload(request, response, next)
      // 期待結果
      // DB内容
      // 請求書テーブルの内容確認
      expect(invoicesDB[0].csvFileName).toBe('hotfix1483_5.csv')
      expect(invoicesDB[0].successCount).toBe(2)
      expect(invoicesDB[0].failCount).toBe(2)
      expect(invoicesDB[0].skipCount).toBe(2)
      expect(invoicesDB[0].invoiceCount).toBe(1)

      // 請求書テーブルの内容確認
      expect(invoiceDetailDB[0].invoiceId).toBe('UT_TEST_INVOICE_5_1')
      expect(invoiceDetailDB[0].lines).toBe(1)
      expect(invoiceDetailDB[0].status).toBe(1)
      expect(invoiceDetailDB[0].errorData).toBe(constantsDefine.invoiceErrMsg.SKIP)

      expect(invoiceDetailDB[1].invoiceId).toBe('UT_TEST_INVOICE_5_1')
      expect(invoiceDetailDB[1].lines).toBe(2)
      expect(invoiceDetailDB[1].status).toBe(1)
      expect(invoiceDetailDB[1].errorData).toBe(constantsDefine.invoiceErrMsg.SKIP)

      expect(invoiceDetailDB[2].invoiceId).toBe('UT_TEST_hotfix_1483_5_fail_1')
      expect(invoiceDetailDB[2].lines).toBe(3)
      expect(invoiceDetailDB[2].status).toBe(-1)
      expect(invoiceDetailDB[2].errorData).toBe(constantsDefine.invoiceErrMsg.BANKNAMEERR002)

      expect(invoiceDetailDB[3].invoiceId).toBe('UT_TEST_hotfix_1483_5_fail_1')
      expect(invoiceDetailDB[3].lines).toBe(4)
      expect(invoiceDetailDB[3].status).toBe(-1)
      expect(invoiceDetailDB[3].errorData).toBe(
        `${constantsDefine.invoiceErrMsg.UNITERR001},${invoiceDetailDB[3].invoiceId}${constantsDefine.invoiceErrMsg.HEADERBEFORERR}`
      )

      expect(invoiceDetailDB[4].invoiceId).toBe('UT_TEST_hotfix_1483_5_success_1')
      expect(invoiceDetailDB[4].lines).toBe(5)
      expect(invoiceDetailDB[4].status).toBe(0)
      expect(invoiceDetailDB[4].errorData).toBe(constantsDefine.invoiceErrMsg.SUCCESS)

      expect(invoiceDetailDB[5].invoiceId).toBe('UT_TEST_hotfix_1483_5_success_1')
      expect(invoiceDetailDB[5].lines).toBe(6)
      expect(invoiceDetailDB[5].status).toBe(0)
      expect(invoiceDetailDB[5].errorData).toBe(constantsDefine.invoiceErrMsg.SUCCESS)
    })

    test('hotfix1483：請求書【スキップ、スキップ、成功】', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      const fs = require('fs')
      const path = require('path')
      const fileName = 'hotfix1483_6.csv'
      const filePath = path.resolve(`./testData/${fileName}`)
      const fileData = Buffer.from(
        fs.readFileSync(filePath, {
          encoding: 'utf-8',
          flag: 'r'
        })
      ).toString('base64')

      const invoicesDB = []
      const invoiceDetailDB = []

      request.session = {
        userContext: 'NotLoggedIn',
        userRole: 'dummy'
      }

      userController.findOne = jest.fn((userId) => {
        return dataValues
      })
      tenantController.findOne = jest.fn((tenantid) => {
        return contractdataValues
      })
      contractController.findOne = jest.fn((tenantid) => {
        return contractdataValues
      })
      invoiceController.insert = jest.fn((values) => {
        const userTenantId = values?.tenantId
        let tenantRow
        let tenantId
        let resultToInsertInvoice
        if (!userTenantId) {
          return
        }
        try {
          tenantRow = tenantController.findOne(userTenantId)
          tenantId = tenantRow?.dataValues?.tenantId
        } catch (error) {
          return
        }

        if (!tenantId) {
          return
        }

        try {
          resultToInsertInvoice = {
            ...values,
            tenantId: tenantId
          }
          invoicesDB.push(resultToInsertInvoice)
        } catch (error) {
          return
        }
        return { dataValues: resultToInsertInvoice }
      })
      invoiceController.findInvoice = jest.fn((invoice) => {
        const result = { dataValues: null }
        invoicesDB.forEach((invoiceElement) => {
          if (invoiceElement.invoicesId === invoice) {
            result.dataValues = invoiceElement
          }
        })
        return result
      })
      invoiceDetailController.insert = jest.fn((values) => {
        const invoicesId = values?.invoicesId

        if (!invoicesId) {
          return
        }

        const invoiceRow = invoiceController.findInvoice(invoicesId)

        if (!invoiceRow?.dataValues.invoicesId) {
          return
        }

        let resultToInsertInvoiceDetail

        try {
          resultToInsertInvoiceDetail = {
            ...values,
            invoicesId: invoiceRow?.dataValues.invoicesId
          }
          invoiceDetailDB.push(resultToInsertInvoiceDetail)
        } catch (error) {}
        return { dataValues: resultToInsertInvoiceDetail }
      })
      invoiceController.updateCount = jest.fn(({ invoicesId, successCount, failCount, skipCount, invoiceCount }) => {
        try {
          const invoice = [1]
          invoicesDB.forEach((invoiceElement) => {
            if (invoiceElement.invoicesId === invoicesId) {
              invoiceElement.successCount = successCount
              invoiceElement.failCount = failCount
              invoiceElement.skipCount = skipCount
              invoiceElement.invoiceCount = invoiceCount
            }
          })
          return invoice
        } catch (error) {
          return error
        }
      })

      const hotfix1483User = {
        ...user,
        accessToken: 'dummyAccess'
      }
      request.user = hotfix1483User
      request.body = {
        filename: 'hotfix1483_6.csv',
        fileData: fileData,
        uploadFormatId: ''
      }
      checkContractStatusSpy.mockReturnValue('00')

      // 試験実施
      await csvupload.cbPostUpload(request, response, next)
      // 期待結果
      // DB内容
      // 請求書テーブルの内容確認
      expect(invoicesDB[0].csvFileName).toBe('hotfix1483_6.csv')
      expect(invoicesDB[0].successCount).toBe(2)
      expect(invoicesDB[0].failCount).toBe(0)
      expect(invoicesDB[0].skipCount).toBe(4)
      expect(invoicesDB[0].invoiceCount).toBe(1)

      // 請求書テーブルの内容確認
      expect(invoiceDetailDB[0].invoiceId).toBe('UT_TEST_INVOICE_5_1')
      expect(invoiceDetailDB[0].lines).toBe(1)
      expect(invoiceDetailDB[0].status).toBe(1)
      expect(invoiceDetailDB[0].errorData).toBe(constantsDefine.invoiceErrMsg.SKIP)

      expect(invoiceDetailDB[1].invoiceId).toBe('UT_TEST_INVOICE_5_1')
      expect(invoiceDetailDB[1].lines).toBe(2)
      expect(invoiceDetailDB[1].status).toBe(1)
      expect(invoiceDetailDB[1].errorData).toBe(constantsDefine.invoiceErrMsg.SKIP)

      expect(invoiceDetailDB[2].invoiceId).toBe('UT_TEST_INVOICE_5_2')
      expect(invoiceDetailDB[2].lines).toBe(3)
      expect(invoiceDetailDB[2].status).toBe(1)
      expect(invoiceDetailDB[2].errorData).toBe(constantsDefine.invoiceErrMsg.SKIP)

      expect(invoiceDetailDB[3].invoiceId).toBe('UT_TEST_INVOICE_5_2')
      expect(invoiceDetailDB[3].lines).toBe(4)
      expect(invoiceDetailDB[3].status).toBe(1)
      expect(invoiceDetailDB[3].errorData).toBe(constantsDefine.invoiceErrMsg.SKIP)

      expect(invoiceDetailDB[4].invoiceId).toBe('UT_TEST_hotfix_1483_6_success_1')
      expect(invoiceDetailDB[4].lines).toBe(5)
      expect(invoiceDetailDB[4].status).toBe(0)
      expect(invoiceDetailDB[4].errorData).toBe(constantsDefine.invoiceErrMsg.SUCCESS)

      expect(invoiceDetailDB[5].invoiceId).toBe('UT_TEST_hotfix_1483_6_success_1')
      expect(invoiceDetailDB[5].lines).toBe(6)
      expect(invoiceDetailDB[5].status).toBe(0)
      expect(invoiceDetailDB[5].errorData).toBe(constantsDefine.invoiceErrMsg.SUCCESS)
    })

    test('hotfix1483：請求書【スキップ、成功、失敗】', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      const fs = require('fs')
      const path = require('path')
      const fileName = 'hotfix1483_7.csv'
      const filePath = path.resolve(`./testData/${fileName}`)
      const fileData = Buffer.from(
        fs.readFileSync(filePath, {
          encoding: 'utf-8',
          flag: 'r'
        })
      ).toString('base64')

      const invoicesDB = []
      const invoiceDetailDB = []

      request.session = {
        userContext: 'NotLoggedIn',
        userRole: 'dummy'
      }

      userController.findOne = jest.fn((userId) => {
        return dataValues
      })
      tenantController.findOne = jest.fn((tenantid) => {
        return contractdataValues
      })
      contractController.findOne = jest.fn((tenantid) => {
        return contractdataValues
      })
      invoiceController.insert = jest.fn((values) => {
        const userTenantId = values?.tenantId
        let tenantRow
        let tenantId
        let resultToInsertInvoice
        if (!userTenantId) {
          return
        }
        try {
          tenantRow = tenantController.findOne(userTenantId)
          tenantId = tenantRow?.dataValues?.tenantId
        } catch (error) {
          return
        }

        if (!tenantId) {
          return
        }

        try {
          resultToInsertInvoice = {
            ...values,
            tenantId: tenantId
          }
          invoicesDB.push(resultToInsertInvoice)
        } catch (error) {
          return
        }
        return { dataValues: resultToInsertInvoice }
      })
      invoiceController.findInvoice = jest.fn((invoice) => {
        const result = { dataValues: null }
        invoicesDB.forEach((invoiceElement) => {
          if (invoiceElement.invoicesId === invoice) {
            result.dataValues = invoiceElement
          }
        })
        return result
      })
      invoiceDetailController.insert = jest.fn((values) => {
        const invoicesId = values?.invoicesId

        if (!invoicesId) {
          return
        }

        const invoiceRow = invoiceController.findInvoice(invoicesId)

        if (!invoiceRow?.dataValues.invoicesId) {
          return
        }

        let resultToInsertInvoiceDetail

        try {
          resultToInsertInvoiceDetail = {
            ...values,
            invoicesId: invoiceRow?.dataValues.invoicesId
          }
          invoiceDetailDB.push(resultToInsertInvoiceDetail)
        } catch (error) {}
        return { dataValues: resultToInsertInvoiceDetail }
      })
      invoiceController.updateCount = jest.fn(({ invoicesId, successCount, failCount, skipCount, invoiceCount }) => {
        try {
          const invoice = [1]
          invoicesDB.forEach((invoiceElement) => {
            if (invoiceElement.invoicesId === invoicesId) {
              invoiceElement.successCount = successCount
              invoiceElement.failCount = failCount
              invoiceElement.skipCount = skipCount
              invoiceElement.invoiceCount = invoiceCount
            }
          })
          return invoice
        } catch (error) {
          return error
        }
      })

      const hotfix1483User = {
        ...user,
        accessToken: 'dummyAccess'
      }
      request.user = hotfix1483User
      request.body = {
        filename: 'hotfix1483_7.csv',
        fileData: fileData,
        uploadFormatId: ''
      }
      checkContractStatusSpy.mockReturnValue('00')

      // 試験実施
      await csvupload.cbPostUpload(request, response, next)
      // 期待結果
      // DB内容
      // 請求書テーブルの内容確認
      expect(invoicesDB[0].csvFileName).toBe('hotfix1483_7.csv')
      expect(invoicesDB[0].successCount).toBe(2)
      expect(invoicesDB[0].failCount).toBe(2)
      expect(invoicesDB[0].skipCount).toBe(2)
      expect(invoicesDB[0].invoiceCount).toBe(1)

      // 請求書テーブルの内容確認
      expect(invoiceDetailDB[0].invoiceId).toBe('UT_TEST_INVOICE_5_1')
      expect(invoiceDetailDB[0].lines).toBe(1)
      expect(invoiceDetailDB[0].status).toBe(1)
      expect(invoiceDetailDB[0].errorData).toBe(constantsDefine.invoiceErrMsg.SKIP)

      expect(invoiceDetailDB[1].invoiceId).toBe('UT_TEST_INVOICE_5_1')
      expect(invoiceDetailDB[1].lines).toBe(2)
      expect(invoiceDetailDB[1].status).toBe(1)
      expect(invoiceDetailDB[1].errorData).toBe(constantsDefine.invoiceErrMsg.SKIP)

      expect(invoiceDetailDB[2].invoiceId).toBe('UT_TEST_hotfix_1483_7_success_1')
      expect(invoiceDetailDB[2].lines).toBe(3)
      expect(invoiceDetailDB[2].status).toBe(0)
      expect(invoiceDetailDB[2].errorData).toBe(constantsDefine.invoiceErrMsg.SUCCESS)

      expect(invoiceDetailDB[3].invoiceId).toBe('UT_TEST_hotfix_1483_7_success_1')
      expect(invoiceDetailDB[3].lines).toBe(4)
      expect(invoiceDetailDB[3].status).toBe(0)
      expect(invoiceDetailDB[3].errorData).toBe(constantsDefine.invoiceErrMsg.SUCCESS)

      expect(invoiceDetailDB[4].invoiceId).toBe('UT_TEST_hotfix_1483_7_fail_1')
      expect(invoiceDetailDB[4].lines).toBe(5)
      expect(invoiceDetailDB[4].status).toBe(-1)
      expect(invoiceDetailDB[4].errorData).toBe(`${constantsDefine.invoiceErrMsg.BANKNAMEERR002}`)

      expect(invoiceDetailDB[5].invoiceId).toBe('UT_TEST_hotfix_1483_7_fail_1')
      expect(invoiceDetailDB[5].lines).toBe(6)
      expect(invoiceDetailDB[5].status).toBe(-1)
      expect(invoiceDetailDB[5].errorData).toBe(
        `${constantsDefine.invoiceErrMsg.UNITERR001},${invoiceDetailDB[5].invoiceId}${constantsDefine.invoiceErrMsg.HEADERBEFORERR}`
      )
    })

    test('hotfix1483：請求書【スキップ、失敗、失敗】', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      const fs = require('fs')
      const path = require('path')
      const fileName = 'hotfix1483_8.csv'
      const filePath = path.resolve(`./testData/${fileName}`)
      const fileData = Buffer.from(
        fs.readFileSync(filePath, {
          encoding: 'utf-8',
          flag: 'r'
        })
      ).toString('base64')

      const invoicesDB = []
      const invoiceDetailDB = []

      request.session = {
        userContext: 'NotLoggedIn',
        userRole: 'dummy'
      }

      userController.findOne = jest.fn((userId) => {
        return dataValues
      })
      tenantController.findOne = jest.fn((tenantid) => {
        return contractdataValues
      })
      contractController.findOne = jest.fn((tenantid) => {
        return contractdataValues
      })
      invoiceController.insert = jest.fn((values) => {
        const userTenantId = values?.tenantId
        let tenantRow
        let tenantId
        let resultToInsertInvoice
        if (!userTenantId) {
          return
        }
        try {
          tenantRow = tenantController.findOne(userTenantId)
          tenantId = tenantRow?.dataValues?.tenantId
        } catch (error) {
          return
        }

        if (!tenantId) {
          return
        }

        try {
          resultToInsertInvoice = {
            ...values,
            tenantId: tenantId
          }
          invoicesDB.push(resultToInsertInvoice)
        } catch (error) {
          return
        }
        return { dataValues: resultToInsertInvoice }
      })
      invoiceController.findInvoice = jest.fn((invoice) => {
        const result = { dataValues: null }
        invoicesDB.forEach((invoiceElement) => {
          if (invoiceElement.invoicesId === invoice) {
            result.dataValues = invoiceElement
          }
        })
        return result
      })
      invoiceDetailController.insert = jest.fn((values) => {
        const invoicesId = values?.invoicesId

        if (!invoicesId) {
          return
        }

        const invoiceRow = invoiceController.findInvoice(invoicesId)

        if (!invoiceRow?.dataValues.invoicesId) {
          return
        }

        let resultToInsertInvoiceDetail

        try {
          resultToInsertInvoiceDetail = {
            ...values,
            invoicesId: invoiceRow?.dataValues.invoicesId
          }
          invoiceDetailDB.push(resultToInsertInvoiceDetail)
        } catch (error) {}
        return { dataValues: resultToInsertInvoiceDetail }
      })
      invoiceController.updateCount = jest.fn(({ invoicesId, successCount, failCount, skipCount, invoiceCount }) => {
        try {
          const invoice = [1]
          invoicesDB.forEach((invoiceElement) => {
            if (invoiceElement.invoicesId === invoicesId) {
              invoiceElement.successCount = successCount
              invoiceElement.failCount = failCount
              invoiceElement.skipCount = skipCount
              invoiceElement.invoiceCount = invoiceCount
            }
          })
          return invoice
        } catch (error) {
          return error
        }
      })

      const hotfix1483User = {
        ...user,
        accessToken: 'dummyAccess'
      }
      request.user = hotfix1483User
      request.body = {
        filename: 'hotfix1483_8.csv',
        fileData: fileData,
        uploadFormatId: ''
      }
      checkContractStatusSpy.mockReturnValue('00')

      // 試験実施
      await csvupload.cbPostUpload(request, response, next)
      // 期待結果
      // DB内容
      // 請求書テーブルの内容確認
      expect(invoicesDB[0].csvFileName).toBe('hotfix1483_8.csv')
      expect(invoicesDB[0].successCount).toBe(0)
      expect(invoicesDB[0].failCount).toBe(4)
      expect(invoicesDB[0].skipCount).toBe(2)
      expect(invoicesDB[0].invoiceCount).toBe(0)

      // 請求書テーブルの内容確認
      expect(invoiceDetailDB[0].invoiceId).toBe('UT_TEST_INVOICE_5_1')
      expect(invoiceDetailDB[0].lines).toBe(1)
      expect(invoiceDetailDB[0].status).toBe(1)
      expect(invoiceDetailDB[0].errorData).toBe(constantsDefine.invoiceErrMsg.SKIP)

      expect(invoiceDetailDB[1].invoiceId).toBe('UT_TEST_INVOICE_5_1')
      expect(invoiceDetailDB[1].lines).toBe(2)
      expect(invoiceDetailDB[1].status).toBe(1)
      expect(invoiceDetailDB[1].errorData).toBe(constantsDefine.invoiceErrMsg.SKIP)

      expect(invoiceDetailDB[2].invoiceId).toBe('UT_TEST_hotfix_1483_8_fail_1')
      expect(invoiceDetailDB[2].lines).toBe(3)
      expect(invoiceDetailDB[2].status).toBe(-1)
      expect(invoiceDetailDB[2].errorData).toBe(constantsDefine.invoiceErrMsg.BANKNAMEERR002)

      expect(invoiceDetailDB[3].invoiceId).toBe('UT_TEST_hotfix_1483_8_fail_1')
      expect(invoiceDetailDB[3].lines).toBe(4)
      expect(invoiceDetailDB[3].status).toBe(-1)
      expect(invoiceDetailDB[3].errorData).toBe(
        `${constantsDefine.invoiceErrMsg.UNITERR001},${invoiceDetailDB[3].invoiceId}${constantsDefine.invoiceErrMsg.HEADERBEFORERR}`
      )

      expect(invoiceDetailDB[4].invoiceId).toBe('UT_TEST_hotfix_1483_8_fail_2')
      expect(invoiceDetailDB[4].lines).toBe(5)
      expect(invoiceDetailDB[4].status).toBe(-1)
      expect(invoiceDetailDB[4].errorData).toBe(constantsDefine.invoiceErrMsg.BANKNAMEERR002)

      expect(invoiceDetailDB[5].invoiceId).toBe('UT_TEST_hotfix_1483_8_fail_2')
      expect(invoiceDetailDB[5].lines).toBe(6)
      expect(invoiceDetailDB[5].status).toBe(-1)
      expect(invoiceDetailDB[5].errorData).toBe(
        `${constantsDefine.invoiceErrMsg.UNITERR001},${invoiceDetailDB[5].invoiceId}${constantsDefine.invoiceErrMsg.HEADERBEFORERR}`
      )
    })

    test('hotfix1483：請求書【スキップ、スキップ、失敗】', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      const fs = require('fs')
      const path = require('path')
      const fileName = 'hotfix1483_9.csv'
      const filePath = path.resolve(`./testData/${fileName}`)
      const fileData = Buffer.from(
        fs.readFileSync(filePath, {
          encoding: 'utf-8',
          flag: 'r'
        })
      ).toString('base64')

      const invoicesDB = []
      const invoiceDetailDB = []

      request.session = {
        userContext: 'NotLoggedIn',
        userRole: 'dummy'
      }

      userController.findOne = jest.fn((userId) => {
        return dataValues
      })
      tenantController.findOne = jest.fn((tenantid) => {
        return contractdataValues
      })
      contractController.findOne = jest.fn((tenantid) => {
        return contractdataValues
      })
      invoiceController.insert = jest.fn((values) => {
        const userTenantId = values?.tenantId
        let tenantRow
        let tenantId
        let resultToInsertInvoice
        if (!userTenantId) {
          return
        }
        try {
          tenantRow = tenantController.findOne(userTenantId)
          tenantId = tenantRow?.dataValues?.tenantId
        } catch (error) {
          return
        }

        if (!tenantId) {
          return
        }

        try {
          resultToInsertInvoice = {
            ...values,
            tenantId: tenantId
          }
          invoicesDB.push(resultToInsertInvoice)
        } catch (error) {
          return
        }
        return { dataValues: resultToInsertInvoice }
      })
      invoiceController.findInvoice = jest.fn((invoice) => {
        const result = { dataValues: null }
        invoicesDB.forEach((invoiceElement) => {
          if (invoiceElement.invoicesId === invoice) {
            result.dataValues = invoiceElement
          }
        })
        return result
      })
      invoiceDetailController.insert = jest.fn((values) => {
        const invoicesId = values?.invoicesId

        if (!invoicesId) {
          return
        }

        const invoiceRow = invoiceController.findInvoice(invoicesId)

        if (!invoiceRow?.dataValues.invoicesId) {
          return
        }

        let resultToInsertInvoiceDetail

        try {
          resultToInsertInvoiceDetail = {
            ...values,
            invoicesId: invoiceRow?.dataValues.invoicesId
          }
          invoiceDetailDB.push(resultToInsertInvoiceDetail)
        } catch (error) {}
        return { dataValues: resultToInsertInvoiceDetail }
      })
      invoiceController.updateCount = jest.fn(({ invoicesId, successCount, failCount, skipCount, invoiceCount }) => {
        try {
          const invoice = [1]
          invoicesDB.forEach((invoiceElement) => {
            if (invoiceElement.invoicesId === invoicesId) {
              invoiceElement.successCount = successCount
              invoiceElement.failCount = failCount
              invoiceElement.skipCount = skipCount
              invoiceElement.invoiceCount = invoiceCount
            }
          })
          return invoice
        } catch (error) {
          return error
        }
      })

      const hotfix1483User = {
        ...user,
        accessToken: 'dummyAccess'
      }
      request.user = hotfix1483User
      request.body = {
        filename: 'hotfix1483_9.csv',
        fileData: fileData,
        uploadFormatId: ''
      }
      checkContractStatusSpy.mockReturnValue('00')

      // 試験実施
      await csvupload.cbPostUpload(request, response, next)
      // 期待結果
      // DB内容
      // 請求書テーブルの内容確認
      expect(invoicesDB[0].csvFileName).toBe('hotfix1483_9.csv')
      expect(invoicesDB[0].successCount).toBe(0)
      expect(invoicesDB[0].failCount).toBe(4)
      expect(invoicesDB[0].skipCount).toBe(2)
      expect(invoicesDB[0].invoiceCount).toBe(0)

      // 請求書テーブルの内容確認
      expect(invoiceDetailDB[0].invoiceId).toBe('UT_TEST_INVOICE_5_1')
      expect(invoiceDetailDB[0].lines).toBe(1)
      expect(invoiceDetailDB[0].status).toBe(1)
      expect(invoiceDetailDB[0].errorData).toBe(constantsDefine.invoiceErrMsg.SKIP)

      expect(invoiceDetailDB[1].invoiceId).toBe('UT_TEST_INVOICE_5_1')
      expect(invoiceDetailDB[1].lines).toBe(2)
      expect(invoiceDetailDB[1].status).toBe(1)
      expect(invoiceDetailDB[1].errorData).toBe(constantsDefine.invoiceErrMsg.SKIP)

      expect(invoiceDetailDB[2].invoiceId).toBe('UT_TEST_hotfix_1483_9_fail_1')
      expect(invoiceDetailDB[2].lines).toBe(3)
      expect(invoiceDetailDB[2].status).toBe(-1)
      expect(invoiceDetailDB[2].errorData).toBe(constantsDefine.invoiceErrMsg.BANKNAMEERR002)

      expect(invoiceDetailDB[3].invoiceId).toBe('UT_TEST_hotfix_1483_9_fail_1')
      expect(invoiceDetailDB[3].lines).toBe(4)
      expect(invoiceDetailDB[3].status).toBe(-1)
      expect(invoiceDetailDB[3].errorData).toBe(
        `${constantsDefine.invoiceErrMsg.UNITERR001},${invoiceDetailDB[3].invoiceId}${constantsDefine.invoiceErrMsg.HEADERBEFORERR}`
      )

      expect(invoiceDetailDB[4].invoiceId).toBe('UT_TEST_hotfix_1483_9_fail_2')
      expect(invoiceDetailDB[4].lines).toBe(5)
      expect(invoiceDetailDB[4].status).toBe(-1)
      expect(invoiceDetailDB[4].errorData).toBe(constantsDefine.invoiceErrMsg.BANKNAMEERR002)

      expect(invoiceDetailDB[5].invoiceId).toBe('UT_TEST_hotfix_1483_9_fail_2')
      expect(invoiceDetailDB[5].lines).toBe(6)
      expect(invoiceDetailDB[5].status).toBe(-1)
      expect(invoiceDetailDB[5].errorData).toBe(
        `${constantsDefine.invoiceErrMsg.UNITERR001},${invoiceDetailDB[5].invoiceId}${constantsDefine.invoiceErrMsg.HEADERBEFORERR}`
      )
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
    test('正常：デフォルト', async () => {
      // 準備
      request.user = user
      const userToken = {
        accessToken: 'dummyAccessToken',
        refreshToken: 'dummyRefreshToken'
      }
      const filename = request.user.tenantId + '_' + request.user.email + '_' + '20210611102239848' + '.csv'

      const uploadCsvData = Buffer.from(decodeURIComponent(fileData), 'base64').toString('utf8')

      // 試験実施
      const resultUpl = csvupload.cbUploadCsv(filePath, filename, uploadCsvData)
      expect(resultUpl).toBeTruthy()

      // request uplodadFormatId 空
      request.body = {
        uploadFormatId: ''
      }
      const resultExt = csvupload.cbExtractInvoice(filePath, filename, userToken, invoiceParameta, request, response)
      expect(resultExt).toBeTruthy()

      const resultRem = csvupload.cbRemoveCsv(filePath, filename)
      expect(resultRem).toBeTruthy()

      // 期待結果
      // 404，500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(500))
    })

    test('正常：ユーザーフォーマット', async () => {
      // 準備
      request.user = user
      const userToken = {
        accessToken: 'dummyAccessToken',
        refreshToken: 'dummyRefreshToken'
      }
      const filename = request.user.tenantId + '_' + request.user.email + '_' + '20210611102239848' + '.csv'

      const uploadCsvData = Buffer.from(decodeURIComponent(fileData), 'base64').toString('utf8')

      // 試験実施
      const resultUpl = csvupload.cbUploadCsv(filePath, filename, uploadCsvData)
      expect(resultUpl).toBeTruthy()

      // request uplodadFormatId
      request.body = {
        uploadFormatId: uploadFormatId
      }

      // DB設定
      findByUploadFormatIdSpy.mockReturnValue([])
      findByUploadFormatIdIdentifierSpy.mockReturnValue([])

      const resultExt = csvupload.cbExtractInvoice(filePath, filename, userToken, invoiceParameta, request, response)
      expect(resultExt).toBeTruthy()

      const resultRem = csvupload.cbRemoveCsv(filePath, filename)
      expect(resultRem).toBeTruthy()

      // 期待結果
      // 404，500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(500))
    })

    test('正常：ユーザーフォーマット（ヘッダなし）', async () => {
      // 準備
      request.user = user
      const userToken = {
        accessToken: 'dummyAccessToken',
        refreshToken: 'dummyRefreshToken'
      }
      const filename = request.user.tenantId + '_' + request.user.email + '_' + '20210611102239848' + '.csv'

      const csvFileName = 'csvUpload_Format_noHeader_default.csv'
      const csvfilePath = path.resolve(`./testData/${csvFileName}`)
      const fileData = Buffer.from(
        fs.readFileSync(csvfilePath, {
          encoding: 'utf-8',
          flag: 'r'
        })
      ).toString()

      // 試験実施
      const resultUpl = csvupload.cbUploadCsv(filePath, filename, fileData)
      expect(resultUpl).toBeTruthy()

      // request uplodadFormatId
      request.body = {
        uploadFormatId: uploadFormatId
      }

      // DB設定
      findByUploadFormatIdSpy.mockReturnValue(uploadFormatDetailResult)
      findByUploadFormatIdIdentifierSpy.mockReturnValue([])
      findUploadFormatIdSpy.mockReturnValue(uploadFormatNoHeaderResult)

      const resultExt = await csvupload.cbExtractInvoice(
        filePath,
        filename,
        userToken,
        invoiceParameta,
        request,
        response
      )
      expect(resultExt).toBe(0)

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

      // 試験実施
      const resultUpl = csvupload.cbUploadCsv(filePath, filename, uploadCsvData)
      expect(resultUpl).toBeTruthy()

      // request uplodadFormatId 空
      request.body = {
        uploadFormatId: ''
      }
      const resultExt = csvupload.cbExtractInvoice(filePath, filename, userToken, invoiceParameta, request, response)
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

      // request uplodadFormatId 空
      request.body = {
        uploadFormatId: ''
      }
      const resultExt = csvupload.cbExtractInvoice(filePath, filename, userToken, invoiceParameta, request, response)
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

      const csvFileName = 'fileData101.csv'
      const csvfilePath = path.resolve(`./testData/${csvFileName}`)
      const fileData = Buffer.from(
        fs.readFileSync(csvfilePath, {
          encoding: 'utf-8',
          flag: 'r'
        })
      ).toString()

      const filename = request.user.tenantId + '_' + request.user.email + '_' + '20210611102239848' + '.csv'

      // 試験実施
      const resultUpl = csvupload.cbUploadCsv(filePath, filename, fileData)
      expect(resultUpl).toBeTruthy()

      // request uplodadFormatId 空
      request.body = {
        uploadFormatId: ''
      }
      const resultExt = await csvupload.cbExtractInvoice(
        filePath,
        filename,
        userToken,
        invoiceParameta,
        request,
        response
      )
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

      const csvFileName = 'fileData201.csv'
      const csvFilePath = path.resolve(`./testData/${csvFileName}`)
      const fileData = Buffer.from(
        fs.readFileSync(csvFilePath, {
          encoding: 'utf-8',
          flag: 'r'
        })
      ).toString()

      createSpyInvoices.mockReturnValue({ ...invoiceData, filename: filename })
      findOneSpyInvoice.mockReturnValue(invoiceData)
      createSpyinvoicesDetail.mockReturnValue(invoiceDetailData)
      findOneSypTenant.mockReturnValue({
        dataValues: {
          tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089'
        }
      })

      // 試験実施
      const resultUpl = csvupload.cbUploadCsv(filePath, filename, fileData)
      expect(resultUpl).toBeTruthy()

      // request uplodadFormatId 空
      request.body = {
        uploadFormatId: ''
      }
      const resultExt = await csvupload.cbExtractInvoice(
        filePath,
        filename,
        userToken,
        invoiceParameta,
        request,
        response
      )
      expect(resultExt).toBeTruthy()

      const resultRem = csvupload.cbRemoveCsv(filePath, filename)
      expect(resultRem).toBeTruthy()

      // 期待結果
      // 404，500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(500))
      expect(resultExt).toBe(102)
    })

    test('準正常：ファイルから請求書一括作成の時エラー例外', async () => {
      // 準備
      request.user = user
      const userToken = {
        accessToken: 'dummyAccessToken',
        refreshToken: 'dummyRefreshToken'
      }
      const filename = request.user.tenantId + '_' + request.user.email + '_' + '20210611102239848' + '.csv'

      const uploadCsvData = Buffer.from(decodeURIComponent(fileData), 'base64').toString('utf8')

      // 試験実施
      const resultUpl = csvupload.cbUploadCsv(filePath, filename, uploadCsvData)
      expect(resultUpl).toBeTruthy()

      // request uplodadFormatId 空
      request.body = {
        uploadFormatId: ''
      }

      path.resolve.mockReturnValue(new Error('エラー'))

      const resultExt = await csvupload.cbExtractInvoice(
        filePath,
        filename,
        userToken,
        invoiceParameta,
        request,
        response
      )
      expect(resultExt).toBe(104)

      const resultRem = csvupload.cbRemoveCsv(filePath, filename)
      expect(resultRem).toBeTruthy()

      // 期待結果
      // 404，500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(500))
    })

    test('準正常：請求書番号バリデーションチェック：未入力', async () => {
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
        if (!values.errorData.match(SUCCESSMESSAGE) && !values.errorData.match(SKIPMESSAGE)) {
          resultInvoiceDetailController.push(values)
        }
        return values
      })

      request.user = user
      const userToken = {
        accessToken: 'dummyAccessToken',
        refreshToken: 'dummyRefreshToken'
      }
      const filename = request.user.tenantId + '_' + request.user.email + '_' + '20210611102239848' + '.csv'

      const csvFileName = 'fileDataNoInvoiceID.csv'
      const csvFilePath = path.resolve(`./testData/${csvFileName}`)
      const fileData = Buffer.from(
        fs.readFileSync(csvFilePath, {
          encoding: 'utf-8',
          flag: 'r'
        })
      ).toString()

      createSpyInvoices.mockReturnValue({ ...invoiceData, filename: filename })
      findOneSpyInvoice.mockReturnValue(invoiceData)
      createSpyinvoicesDetail.mockReturnValue(invoiceDetailData)
      findOneSypTenant.mockReturnValue({
        dataValues: {
          tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089'
        }
      })

      // 試験実施
      const resultUpl = await csvupload.cbUploadCsv(filePath, filename, fileData)
      expect(resultUpl).toBeTruthy()

      // request uplodadFormatId 空
      request.body = {
        uploadFormatId: ''
      }
      const resultExt = await csvupload.cbExtractInvoice(
        filePath,
        filename,
        userToken,
        invoiceParameta,
        request,
        response
      )
      expect(resultExt).toBe(104)

      const resultRem = await csvupload.cbRemoveCsv(filePath, filename)
      expect(resultRem).toBeTruthy()

      // 期待結果
      // 404，500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(500))

      // エラーメッセージが予定通りにある
      expect(resultInvoiceDetailController[0].errorData).toEqual('請求書番号が未入力です。')
      invoiceController.insert = tmpInsert
      invoiceDetailController.insert = tmpdetailInsert
      apiManager.accessTradeshift = tmpApiManager
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
        if (!values.errorData.match(SUCCESSMESSAGE) && !values.errorData.match(SKIPMESSAGE)) {
          resultInvoiceDetailController.push(values)
        }
        return values
      })

      request.user = user
      const userToken = {
        accessToken: 'dummyAccessToken',
        refreshToken: 'dummyRefreshToken'
      }
      const filename = request.user.tenantId + '_' + request.user.email + '_' + '20210611102239848' + '.csv'

      const csvFileName = 'fileDataInvoiceIDlessthanequal101.csv'
      const csvFilePath = path.resolve(`./testData/${csvFileName}`)
      const fileData = Buffer.from(
        fs.readFileSync(csvFilePath, {
          encoding: 'utf-8',
          flag: 'r'
        })
      ).toString()

      createSpyInvoices.mockReturnValue({ ...invoiceData, filename: filename })
      findOneSpyInvoice.mockReturnValue(invoiceData)
      createSpyinvoicesDetail.mockReturnValue(invoiceDetailData)
      findOneSypTenant.mockReturnValue({
        dataValues: {
          tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089'
        }
      })

      // 試験実施
      const resultUpl = await csvupload.cbUploadCsv(filePath, filename, fileData)
      expect(resultUpl).toBeTruthy()

      // request uplodadFormatId 空
      request.body = {
        uploadFormatId: ''
      }
      const resultExt = await csvupload.cbExtractInvoice(
        filePath,
        filename,
        userToken,
        invoiceParameta,
        request,
        response
      )
      expect(resultExt).toBe(104)

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
        if (!values.errorData.match(SUCCESSMESSAGE) && !values.errorData.match(SKIPMESSAGE)) {
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

      const csvFileName = 'fileDataBankNamelessthanequal201.csv'
      const csvFilePath = path.resolve(`./testData/${csvFileName}`)
      const fileData = Buffer.from(
        fs.readFileSync(csvFilePath, {
          encoding: 'utf-8',
          flag: 'r'
        })
      ).toString()

      createSpyInvoices.mockReturnValue({ ...invoiceData, filename: filename })
      findOneSpyInvoice.mockReturnValue(invoiceData)
      createSpyinvoicesDetail.mockReturnValue(invoiceDetailData)
      findOneSypTenant.mockReturnValue({
        dataValues: {
          tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089'
        }
      })

      // 試験実施
      const resultUpl = csvupload.cbUploadCsv(filePath, filename, fileData)
      expect(resultUpl).toBeTruthy()

      // request uplodadFormatId 空
      request.body = {
        uploadFormatId: ''
      }
      const resultExt = await csvupload.cbExtractInvoice(
        filePath,
        filename,
        userToken,
        invoiceParameta,
        request,
        response
      )
      expect(resultExt).toBe(104)

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

    test('準正常：発行日バリデーションチェック：未入力', async () => {
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
        if (!values.errorData.match(SUCCESSMESSAGE) && !values.errorData.match(SKIPMESSAGE)) {
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

      const csvFileName = 'fileDataNoIssueDate.csv'
      const csvFilePath = path.resolve(`./testData/${csvFileName}`)
      const fileData = Buffer.from(
        fs.readFileSync(csvFilePath, {
          encoding: 'utf-8',
          flag: 'r'
        })
      ).toString()

      createSpyInvoices.mockReturnValue({ ...invoiceData, filename: filename })
      findOneSpyInvoice.mockReturnValue(invoiceData)
      createSpyinvoicesDetail.mockReturnValue(invoiceDetailData)
      findOneSypTenant.mockReturnValue({
        dataValues: {
          tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089'
        }
      })

      // 試験実施
      const resultUpl = csvupload.cbUploadCsv(filePath, filename, fileData)
      expect(resultUpl).toBeTruthy()

      // request uplodadFormatId 空
      request.body = {
        uploadFormatId: ''
      }
      const resultExt = await csvupload.cbExtractInvoice(
        filePath,
        filename,
        userToken,
        invoiceParameta,
        request,
        response
      )
      expect(resultExt).toBe(104)

      const resultRem = await csvupload.cbRemoveCsv(filePath, filename)
      expect(resultRem).toBeTruthy()

      // 期待結果
      // 404，500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(500))

      // エラーメッセージが予定通りにある
      expect(resultInvoiceDetailController[0].errorData).toEqual('発行日が未入力です。')
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
        if (!values.errorData.match(SUCCESSMESSAGE) && !values.errorData.match(SKIPMESSAGE)) {
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

      const csvFileName = 'fileDataIssueDateleap.csv'
      const csvFilePath = path.resolve(`./testData/${csvFileName}`)
      const fileData = Buffer.from(
        fs.readFileSync(csvFilePath, {
          encoding: 'utf-8',
          flag: 'r'
        })
      ).toString()

      createSpyInvoices.mockReturnValue({ ...invoiceData, filename: filename })
      findOneSpyInvoice.mockReturnValue(invoiceData)
      createSpyinvoicesDetail.mockReturnValue(invoiceDetailData)
      findOneSypTenant.mockReturnValue({
        dataValues: {
          tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089'
        }
      })

      // 試験実施
      const resultUpl = csvupload.cbUploadCsv(filePath, filename, fileData)
      expect(resultUpl).toBeTruthy()

      // request uplodadFormatId 空
      request.body = {
        uploadFormatId: ''
      }
      const resultExt = await csvupload.cbExtractInvoice(
        filePath,
        filename,
        userToken,
        invoiceParameta,
        request,
        response
      )
      expect(resultExt).toBe(104)

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

      const csvFileName = 'fileDataIssueDateTypeErr.csv'
      const csvFilePath = path.resolve(`./testData/${csvFileName}`)
      const fileData = Buffer.from(
        fs.readFileSync(csvFilePath, {
          encoding: 'utf-8',
          flag: 'r'
        })
      ).toString()

      createSpyInvoices.mockReturnValue({ ...invoiceData, filename: filename })
      findOneSpyInvoice.mockReturnValue(invoiceData)
      createSpyinvoicesDetail.mockReturnValue(invoiceDetailData)
      findOneSypTenant.mockReturnValue({
        dataValues: {
          tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089'
        }
      })

      // 試験実施
      const resultUpl = csvupload.cbUploadCsv(filePath, filename, fileData)
      expect(resultUpl).toBeTruthy()

      // request uplodadFormatId 空
      request.body = {
        uploadFormatId: ''
      }
      const resultExt = await csvupload.cbExtractInvoice(
        filePath,
        filename,
        userToken,
        invoiceParameta,
        request,
        response
      )
      expect(resultExt).toBe(104)

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

    test('準正常：テナントバリデーションチェック：未入力', async () => {
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

      const csvFileName = 'fileDataNoTenant.csv'
      const csvFilePath = path.resolve(`./testData/${csvFileName}`)
      const fileData = Buffer.from(
        fs.readFileSync(csvFilePath, {
          encoding: 'utf-8',
          flag: 'r'
        })
      ).toString()

      createSpyInvoices.mockReturnValue({ ...invoiceData, filename: filename })
      findOneSpyInvoice.mockReturnValue(invoiceData)
      createSpyinvoicesDetail.mockReturnValue(invoiceDetailData)
      findOneSypTenant.mockReturnValue({
        dataValues: {
          tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089'
        }
      })

      // 試験実施
      const resultUpl = csvupload.cbUploadCsv(filePath, filename, fileData)
      expect(resultUpl).toBeTruthy()

      // request uplodadFormatId 空
      request.body = {
        uploadFormatId: ''
      }
      const resultExt = await csvupload.cbExtractInvoice(
        filePath,
        filename,
        userToken,
        invoiceParameta,
        request,
        response
      )
      expect(resultExt).toBe(104)

      const resultRem = await csvupload.cbRemoveCsv(filePath, filename)
      expect(resultRem).toBeTruthy()

      // 期待結果
      // 404，500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(500))

      // エラーメッセージが予定通りにある
      expect(resultInvoiceDetailController[0].errorData).toEqual('テナントIDが未入力です。')
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

      const csvFileName = 'fileDataTenantTypeErr.csv'
      const csvFilePath = path.resolve(`./testData/${csvFileName}`)
      const fileData = Buffer.from(
        fs.readFileSync(csvFilePath, {
          encoding: 'utf-8',
          flag: 'r'
        })
      ).toString()

      createSpyInvoices.mockReturnValue({ ...invoiceData, filename: filename })
      findOneSpyInvoice.mockReturnValue(invoiceData)
      createSpyinvoicesDetail.mockReturnValue(invoiceDetailData)
      findOneSypTenant.mockReturnValue({
        dataValues: {
          tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089'
        }
      })

      // 試験実施
      const resultUpl = csvupload.cbUploadCsv(filePath, filename, fileData)
      expect(resultUpl).toBeTruthy()

      // request uplodadFormatId 空
      request.body = {
        uploadFormatId: ''
      }
      const resultExt = await csvupload.cbExtractInvoice(
        filePath,
        filename,
        userToken,
        invoiceParameta,
        request,
        response
      )
      expect(resultExt).toBe(104)

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

    test('準正常：明細-項目IDバリデーションチェック：未入力', async () => {
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

      const csvFileName = 'fileDataNoSellersItemNum.csv'
      const csvFilePath = path.resolve(`./testData/${csvFileName}`)
      const fileData = Buffer.from(
        fs.readFileSync(csvFilePath, {
          encoding: 'utf-8',
          flag: 'r'
        })
      ).toString()

      createSpyInvoices.mockReturnValue({ ...invoiceData, filename: filename })
      findOneSpyInvoice.mockReturnValue(invoiceData)
      createSpyinvoicesDetail.mockReturnValue(invoiceDetailData)
      findOneSypTenant.mockReturnValue({
        dataValues: {
          tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089'
        }
      })

      // 試験実施
      const resultUpl = csvupload.cbUploadCsv(filePath, filename, fileData)
      expect(resultUpl).toBeTruthy()

      // request uplodadFormatId 空
      request.body = {
        uploadFormatId: ''
      }
      const resultExt = await csvupload.cbExtractInvoice(
        filePath,
        filename,
        userToken,
        invoiceParameta,
        request,
        response
      )
      expect(resultExt).toBe(104)

      const resultRem = await csvupload.cbRemoveCsv(filePath, filename)
      expect(resultRem).toBeTruthy()

      // 期待結果
      // 404，500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(500))

      // エラーメッセージが予定通りにある
      expect(resultInvoiceDetailController[0].errorData).toEqual('明細-項目IDが未入力です。')
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

      const csvFileName = 'fileDataSellersItemNumlessthanequal201.csv'
      const csvFilePath = path.resolve(`./testData/${csvFileName}`)
      const fileData = Buffer.from(
        fs.readFileSync(csvFilePath, {
          encoding: 'utf-8',
          flag: 'r'
        })
      ).toString()

      createSpyInvoices.mockReturnValue({ ...invoiceData, filename: filename })
      findOneSpyInvoice.mockReturnValue(invoiceData)
      createSpyinvoicesDetail.mockReturnValue(invoiceDetailData)
      findOneSypTenant.mockReturnValue({
        dataValues: {
          tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089'
        }
      })

      // 試験実施
      const resultUpl = csvupload.cbUploadCsv(filePath, filename, fileData)
      expect(resultUpl).toBeTruthy()

      // request uplodadFormatId 空
      request.body = {
        uploadFormatId: ''
      }
      const resultExt = await csvupload.cbExtractInvoice(
        filePath,
        filename,
        userToken,
        invoiceParameta,
        request,
        response
      )
      expect(resultExt).toBe(104)

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

    test('準正常：明細-内容バリデーションチェック：未入力', async () => {
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

      const csvFileName = 'fileDataNoItemName.csv'
      const csvFilePath = path.resolve(`./testData/${csvFileName}`)
      const fileData = Buffer.from(
        fs.readFileSync(csvFilePath, {
          encoding: 'utf-8',
          flag: 'r'
        })
      ).toString()

      createSpyInvoices.mockReturnValue({ ...invoiceData, filename: filename })
      findOneSpyInvoice.mockReturnValue(invoiceData)
      createSpyinvoicesDetail.mockReturnValue(invoiceDetailData)
      findOneSypTenant.mockReturnValue({
        dataValues: {
          tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089'
        }
      })

      // 試験実施
      const resultUpl = csvupload.cbUploadCsv(filePath, filename, fileData)
      expect(resultUpl).toBeTruthy()

      // request uplodadFormatId 空
      request.body = {
        uploadFormatId: ''
      }
      const resultExt = await csvupload.cbExtractInvoice(
        filePath,
        filename,
        userToken,
        invoiceParameta,
        request,
        response
      )
      expect(resultExt).toBe(104)

      const resultRem = await csvupload.cbRemoveCsv(filePath, filename)
      expect(resultRem).toBeTruthy()

      // 期待結果
      // 404，500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(500))

      // エラーメッセージが予定通りにある
      expect(resultInvoiceDetailController[0].errorData).toEqual('明細-内容が未入力です。')
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

      const csvFileName = 'fileDataItemNamelessthanequal501.csv'
      const csvFilePath = path.resolve(`./testData/${csvFileName}`)
      const fileData = Buffer.from(
        fs.readFileSync(csvFilePath, {
          encoding: 'utf-8',
          flag: 'r'
        })
      ).toString()

      createSpyInvoices.mockReturnValue({ ...invoiceData, filename: filename })
      findOneSpyInvoice.mockReturnValue(invoiceData)
      createSpyinvoicesDetail.mockReturnValue(invoiceDetailData)
      findOneSypTenant.mockReturnValue({
        dataValues: {
          tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089'
        }
      })

      // 試験実施
      const resultUpl = csvupload.cbUploadCsv(filePath, filename, fileData)
      expect(resultUpl).toBeTruthy()

      // request uplodadFormatId 空
      request.body = {
        uploadFormatId: ''
      }
      const resultExt = await csvupload.cbExtractInvoice(
        filePath,
        filename,
        userToken,
        invoiceParameta,
        request,
        response
      )
      expect(resultExt).toBe(104)

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

    test('準正常：明細-数量バリデーションチェック：未入力', async () => {
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

      const csvFileName = 'fileDataNoQuantityValue.csv'
      const csvFilePath = path.resolve(`./testData/${csvFileName}`)
      const fileData = Buffer.from(
        fs.readFileSync(csvFilePath, {
          encoding: 'utf-8',
          flag: 'r'
        })
      ).toString()

      createSpyInvoices.mockReturnValue({ ...invoiceData, filename: filename })
      findOneSpyInvoice.mockReturnValue(invoiceData)
      createSpyinvoicesDetail.mockReturnValue([invoiceDetailData, invoiceDetailData])
      findOneSypTenant.mockReturnValue({
        dataValues: {
          tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089'
        }
      })

      // 試験実施
      const resultUpl = csvupload.cbUploadCsv(filePath, filename, fileData)
      expect(resultUpl).toBeTruthy()

      // request uplodadFormatId 空
      request.body = {
        uploadFormatId: ''
      }
      const resultExt = await csvupload.cbExtractInvoice(
        filePath,
        filename,
        userToken,
        invoiceParameta,
        request,
        response
      )
      expect(resultExt).toBe(104)

      const resultRem = await csvupload.cbRemoveCsv(filePath, filename)
      expect(resultRem).toBeTruthy()

      // 期待結果
      // 404，500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(500))

      // エラーメッセージが予定通りにある
      resultInvoiceDetailController.forEach((invoiceDetail) => {
        expect(invoiceDetail.errorData).toEqual('明細-数量が未入力です。')
      })

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

      const csvFileName = 'fileDataQuantityValueBetween0and1000000000001.csv'
      const csvFilePath = path.resolve(`./testData/${csvFileName}`)
      const fileData = Buffer.from(
        fs.readFileSync(csvFilePath, {
          encoding: 'utf-8',
          flag: 'r'
        })
      ).toString()

      createSpyInvoices.mockReturnValue({ ...invoiceData, filename: filename })
      findOneSpyInvoice.mockReturnValue(invoiceData)
      createSpyinvoicesDetail.mockReturnValue([invoiceDetailData, invoiceDetailData])
      findOneSypTenant.mockReturnValue({
        dataValues: {
          tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089'
        }
      })

      // 試験実施
      const resultUpl = csvupload.cbUploadCsv(filePath, filename, fileData)
      expect(resultUpl).toBeTruthy()

      // request uplodadFormatId 空
      request.body = {
        uploadFormatId: ''
      }
      const resultExt = await csvupload.cbExtractInvoice(
        filePath,
        filename,
        userToken,
        invoiceParameta,
        request,
        response
      )
      expect(resultExt).toBe(104)

      const resultRem = await csvupload.cbRemoveCsv(filePath, filename)
      expect(resultRem).toBeTruthy()

      // 期待結果
      // 404，500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(500))

      // エラーメッセージが予定通りにある
      resultInvoiceDetailController.forEach((invoiceDetail) => {
        expect(invoiceDetail.errorData).toEqual(
          `${constantsDefine.invoiceErrMsg.TOTALPRICEVALUEERR000},${constantsDefine.invoiceErrMsg.QUANTITYVALUEERR000}`
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

      const csvFileName = 'fileDataQuantityValueTypeErr.csv'
      const csvFilePath = path.resolve(`./testData/${csvFileName}`)
      const fileData = Buffer.from(
        fs.readFileSync(csvFilePath, {
          encoding: 'utf-8',
          flag: 'r'
        })
      ).toString()

      createSpyInvoices.mockReturnValue({ ...invoiceData, filename: filename })
      findOneSpyInvoice.mockReturnValue(invoiceData)
      createSpyinvoicesDetail.mockReturnValue(invoiceDetailData)
      findOneSypTenant.mockReturnValue({
        dataValues: {
          tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089'
        }
      })

      // 試験実施
      const resultUpl = await csvupload.cbUploadCsv(filePath, filename, fileData)
      expect(resultUpl).toBeTruthy()

      // request uplodadFormatId 空
      request.body = {
        uploadFormatId: ''
      }
      const resultExt = await csvupload.cbExtractInvoice(
        filePath,
        filename,
        userToken,
        invoiceParameta,
        request,
        response
      )
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

    test('準正常：明細-単価バリデーションチェック：未入力', async () => {
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

      const csvFileName = 'fileDataNoPriceValue.csv'
      const csvFilePath = path.resolve(`./testData/${csvFileName}`)
      const fileData = Buffer.from(
        fs.readFileSync(csvFilePath, {
          encoding: 'utf-8',
          flag: 'r'
        })
      ).toString()

      createSpyInvoices.mockReturnValue({ ...invoiceData, filename: filename })
      findOneSpyInvoice.mockReturnValue(invoiceData)
      createSpyinvoicesDetail.mockReturnValue(invoiceDetailData)
      findOneSypTenant.mockReturnValue({
        dataValues: {
          tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089'
        }
      })

      // 試験実施
      const resultUpl = csvupload.cbUploadCsv(filePath, filename, fileData)
      expect(resultUpl).toBeTruthy()

      // request uplodadFormatId 空
      request.body = {
        uploadFormatId: ''
      }
      const resultExt = await csvupload.cbExtractInvoice(
        filePath,
        filename,
        userToken,
        invoiceParameta,
        request,
        response
      )
      expect(resultExt).toBe(104)

      const resultRem = await csvupload.cbRemoveCsv(filePath, filename)
      expect(resultRem).toBeTruthy()

      // 期待結果
      // 404，500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(500))

      // エラーメッセージが予定通りにある
      expect(resultInvoiceDetailController[0].errorData).toEqual('明細-単価が未入力です。')
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

      const csvFileName = 'fileDataPriceValueBetweenminus1000000000000andplus100000000000.csv'
      const csvFilePath = path.resolve(`./testData/${csvFileName}`)
      const fileData = Buffer.from(
        fs.readFileSync(csvFilePath, {
          encoding: 'utf-8',
          flag: 'r'
        })
      ).toString()

      createSpyInvoices.mockReturnValue({ ...invoiceData, filename: filename })
      findOneSpyInvoice.mockReturnValue(invoiceData)
      createSpyinvoicesDetail.mockReturnValue(invoiceDetailData)
      findOneSypTenant.mockReturnValue({
        dataValues: {
          tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089'
        }
      })

      // 試験実施
      const resultUpl = csvupload.cbUploadCsv(filePath, filename, fileData)
      expect(resultUpl).toBeTruthy()

      // request uplodadFormatId 空
      request.body = {
        uploadFormatId: ''
      }
      const resultExt = await csvupload.cbExtractInvoice(
        filePath,
        filename,
        userToken,
        invoiceParameta,
        request,
        response
      )
      expect(resultExt).toBe(104)

      const resultRem = await csvupload.cbRemoveCsv(filePath, filename)
      expect(resultRem).toBeTruthy()

      // 期待結果
      // 404，500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(500))

      // エラーメッセージが予定通りにある
      expect(resultInvoiceDetailController[0].errorData).toEqual(`${constantsDefine.invoiceErrMsg.PRICEVALUEERR000}`)
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

      const csvFileName = 'fileDataPriceValueTypeErr.csv'
      const csvFilePath = path.resolve(`./testData/${csvFileName}`)
      const fileData = Buffer.from(
        fs.readFileSync(csvFilePath, {
          encoding: 'utf-8',
          flag: 'r'
        })
      ).toString()

      createSpyInvoices.mockReturnValue({ ...invoiceData, filename: filename })
      findOneSpyInvoice.mockReturnValue(invoiceData)
      createSpyinvoicesDetail.mockReturnValue(invoiceDetailData)
      findOneSypTenant.mockReturnValue({
        dataValues: {
          tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089'
        }
      })

      // 試験実施
      const resultUpl = csvupload.cbUploadCsv(filePath, filename, fileData)
      expect(resultUpl).toBeTruthy()

      // request uplodadFormatId 空
      request.body = {
        uploadFormatId: ''
      }
      const resultExt = await csvupload.cbExtractInvoice(
        filePath,
        filename,
        userToken,
        invoiceParameta,
        request,
        response
      )
      expect(resultExt).toBe(104)

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

      const csvFileName = 'paymentDateleap.csv'
      const csvFilePath = path.resolve(`./testData/${csvFileName}`)
      const fileData = Buffer.from(
        fs.readFileSync(csvFilePath, {
          encoding: 'utf-8',
          flag: 'r'
        })
      ).toString()

      createSpyInvoices.mockReturnValue({ ...invoiceData, filename: filename })
      findOneSpyInvoice.mockReturnValue(invoiceData)
      createSpyinvoicesDetail.mockReturnValue(invoiceDetailData)
      findOneSypTenant.mockReturnValue({
        dataValues: {
          tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089'
        }
      })

      // 試験実施
      const resultUpl = csvupload.cbUploadCsv(filePath, filename, fileData)
      expect(resultUpl).toBeTruthy()

      // request uplodadFormatId 空
      request.body = {
        uploadFormatId: ''
      }
      const resultExt = await csvupload.cbExtractInvoice(
        filePath,
        filename,
        userToken,
        invoiceParameta,
        request,
        response
      )
      expect(resultExt).toBe(104)

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

      const csvFileName = 'paymentDateTypeErr.csv'
      const csvFilePath = path.resolve(`./testData/${csvFileName}`)
      const fileData = Buffer.from(
        fs.readFileSync(csvFilePath, {
          encoding: 'utf-8',
          flag: 'r'
        })
      ).toString()

      createSpyInvoices.mockReturnValue({ ...invoiceData, filename: filename })
      findOneSpyInvoice.mockReturnValue(invoiceData)
      createSpyinvoicesDetail.mockReturnValue(invoiceDetailData)
      findOneSypTenant.mockReturnValue({
        dataValues: {
          tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089'
        }
      })

      // 試験実施
      const resultUpl = csvupload.cbUploadCsv(filePath, filename, fileData)
      expect(resultUpl).toBeTruthy()

      // request uplodadFormatId 空
      request.body = {
        uploadFormatId: ''
      }
      const resultExt = await csvupload.cbExtractInvoice(
        filePath,
        filename,
        userToken,
        invoiceParameta,
        request,
        response
      )
      expect(resultExt).toBe(104)

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

      const csvFileName = 'deliveryDateleap.csv'
      const csvFilePath = path.resolve(`./testData/${csvFileName}`)
      const fileData = Buffer.from(
        fs.readFileSync(csvFilePath, {
          encoding: 'utf-8',
          flag: 'r'
        })
      ).toString()

      createSpyInvoices.mockReturnValue({ ...invoiceData, filename: filename })
      findOneSpyInvoice.mockReturnValue(invoiceData)
      createSpyinvoicesDetail.mockReturnValue(invoiceDetailData)
      findOneSypTenant.mockReturnValue({
        dataValues: {
          tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089'
        }
      })

      // 試験実施
      const resultUpl = csvupload.cbUploadCsv(filePath, filename, fileData)
      expect(resultUpl).toBeTruthy()

      // request uplodadFormatId 空
      request.body = {
        uploadFormatId: ''
      }
      const resultExt = await csvupload.cbExtractInvoice(
        filePath,
        filename,
        userToken,
        invoiceParameta,
        request,
        response
      )
      expect(resultExt).toBe(104)

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

      const csvFileName = 'deliveryDateTypeErr.csv'
      const csvFilePath = path.resolve(`./testData/${csvFileName}`)
      const fileData = Buffer.from(
        fs.readFileSync(csvFilePath, {
          encoding: 'utf-8',
          flag: 'r'
        })
      ).toString()

      createSpyInvoices.mockReturnValue({ ...invoiceData, filename: filename })
      findOneSpyInvoice.mockReturnValue(invoiceData)
      createSpyinvoicesDetail.mockReturnValue(invoiceDetailData)
      findOneSypTenant.mockReturnValue({
        dataValues: {
          tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089'
        }
      })

      // 試験実施
      const resultUpl = csvupload.cbUploadCsv(filePath, filename, fileData)
      expect(resultUpl).toBeTruthy()

      // request uplodadFormatId 空
      request.body = {
        uploadFormatId: ''
      }
      const resultExt = await csvupload.cbExtractInvoice(
        filePath,
        filename,
        userToken,
        invoiceParameta,
        request,
        response
      )
      expect(resultExt).toBe(104)

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

      const csvFileName = 'financialInstitutionlessthanequal201.csv'
      const csvFilePath = path.resolve(`./testData/${csvFileName}`)
      const fileData = Buffer.from(
        fs.readFileSync(csvFilePath, {
          encoding: 'utf-8',
          flag: 'r'
        })
      ).toString()

      createSpyInvoices.mockReturnValue({ ...invoiceData, filename: filename })
      findOneSpyInvoice.mockReturnValue(invoiceData)
      createSpyinvoicesDetail.mockReturnValue(invoiceDetailData)
      findOneSypTenant.mockReturnValue({
        dataValues: {
          tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089'
        }
      })

      // 試験実施
      const resultUpl = csvupload.cbUploadCsv(filePath, filename, fileData)
      expect(resultUpl).toBeTruthy()

      // request uplodadFormatId 空
      request.body = {
        uploadFormatId: ''
      }
      const resultExt = await csvupload.cbExtractInvoice(
        filePath,
        filename,
        userToken,
        invoiceParameta,
        request,
        response
      )
      expect(resultExt).toBe(104)

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

      const csvFileName = 'financialNamelessthanequal201.csv'
      const csvFilePath = path.resolve(`./testData/${csvFileName}`)
      const fileData = Buffer.from(
        fs.readFileSync(csvFilePath, {
          encoding: 'utf-8',
          flag: 'r'
        })
      ).toString()

      createSpyInvoices.mockReturnValue({ ...invoiceData, filename: filename })
      findOneSpyInvoice.mockReturnValue(invoiceData)
      createSpyinvoicesDetail.mockReturnValue(invoiceDetailData)
      findOneSypTenant.mockReturnValue({
        dataValues: {
          tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089'
        }
      })

      // 試験実施
      const resultUpl = csvupload.cbUploadCsv(filePath, filename, fileData)
      expect(resultUpl).toBeTruthy()

      // request uplodadFormatId 空
      request.body = {
        uploadFormatId: ''
      }
      const resultExt = await csvupload.cbExtractInvoice(
        filePath,
        filename,
        userToken,
        invoiceParameta,
        request,
        response
      )
      expect(resultExt).toBe(104)

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

      const csvFileName = 'accountTypeErr.csv'
      const csvFilePath = path.resolve(`./testData/${csvFileName}`)
      const fileData = Buffer.from(
        fs.readFileSync(csvFilePath, {
          encoding: 'utf-8',
          flag: 'r'
        })
      ).toString()

      createSpyInvoices.mockReturnValue({ ...invoiceData, filename: filename })
      findOneSpyInvoice.mockReturnValue(invoiceData)
      createSpyinvoicesDetail.mockReturnValue(invoiceDetailData)
      findOneSypTenant.mockReturnValue({
        dataValues: {
          tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089'
        }
      })

      // 試験実施
      const resultUpl = csvupload.cbUploadCsv(filePath, filename, fileData)
      expect(resultUpl).toBeTruthy()

      // request uplodadFormatId 空
      request.body = {
        uploadFormatId: ''
      }
      const resultExt = await csvupload.cbExtractInvoice(
        filePath,
        filename,
        userToken,
        invoiceParameta,
        request,
        response
      )
      expect(resultExt).toBe(104)

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

      const csvFileName = 'accountIdlessthanequal8.csv'
      const csvFilePath = path.resolve(`./testData/${csvFileName}`)
      const fileData = Buffer.from(
        fs.readFileSync(csvFilePath, {
          encoding: 'utf-8',
          flag: 'r'
        })
      ).toString()

      createSpyInvoices.mockReturnValue({ ...invoiceData, filename: filename })
      findOneSpyInvoice.mockReturnValue(invoiceData)
      createSpyinvoicesDetail.mockReturnValue(invoiceDetailData)
      findOneSypTenant.mockReturnValue({
        dataValues: {
          tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089'
        }
      })

      // 試験実施
      const resultUpl = csvupload.cbUploadCsv(filePath, filename, fileData)
      expect(resultUpl).toBeTruthy()

      // request uplodadFormatId 空
      request.body = {
        uploadFormatId: ''
      }
      const resultExt = await csvupload.cbExtractInvoice(
        filePath,
        filename,
        userToken,
        invoiceParameta,
        request,
        response
      )
      expect(resultExt).toBe(104)

      const resultRem = await csvupload.cbRemoveCsv(filePath, filename)
      expect(resultRem).toBeTruthy()

      // 期待結果
      // 404，500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(500))

      // エラーメッセージが予定通りにある
      expect(resultInvoiceDetailController[0].errorData).toEqual('口座番号は7文字で入力してください。')
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

      const csvFileName = 'accountIdTypeErr.csv'
      const csvFilePath = path.resolve(`./testData/${csvFileName}`)
      const fileData = Buffer.from(
        fs.readFileSync(csvFilePath, {
          encoding: 'utf-8',
          flag: 'r'
        })
      ).toString()

      createSpyInvoices.mockReturnValue({ ...invoiceData, filename: filename })
      findOneSpyInvoice.mockReturnValue(invoiceData)
      createSpyinvoicesDetail.mockReturnValue(invoiceDetailData)
      findOneSypTenant.mockReturnValue({
        dataValues: {
          tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089'
        }
      })

      // 試験実施
      const resultUpl = csvupload.cbUploadCsv(filePath, filename, fileData)
      expect(resultUpl).toBeTruthy()

      // request uplodadFormatId 空
      request.body = {
        uploadFormatId: ''
      }
      const resultExt = await csvupload.cbExtractInvoice(
        filePath,
        filename,
        userToken,
        invoiceParameta,
        request,
        response
      )
      expect(resultExt).toBe(104)

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

      const csvFileName = 'accountNamelessthanequal201.csv'
      const csvFilePath = path.resolve(`./testData/${csvFileName}`)
      const fileData = Buffer.from(
        fs.readFileSync(csvFilePath, {
          encoding: 'utf-8',
          flag: 'r'
        })
      ).toString()

      createSpyInvoices.mockReturnValue({ ...invoiceData, filename: filename })
      findOneSpyInvoice.mockReturnValue(invoiceData)
      createSpyinvoicesDetail.mockReturnValue(invoiceDetailData)
      findOneSypTenant.mockReturnValue({
        dataValues: {
          tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089'
        }
      })

      // 試験実施
      const resultUpl = await csvupload.cbUploadCsv(filePath, filename, fileData)
      expect(resultUpl).toBeTruthy()

      // request uplodadFormatId 空
      request.body = {
        uploadFormatId: ''
      }
      const resultExt = await csvupload.cbExtractInvoice(
        filePath,
        filename,
        userToken,
        invoiceParameta,
        request,
        response
      )
      expect(resultExt).toBe(104)

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

      const csvFileName = 'notelessthanequal1001.csv'
      const csvFilePath = path.resolve(`./testData/${csvFileName}`)
      const fileData = Buffer.from(
        fs.readFileSync(csvFilePath, {
          encoding: 'utf-8',
          flag: 'r'
        })
      ).toString()

      createSpyInvoices.mockReturnValue({ ...invoiceData, filename: filename })
      findOneSpyInvoice.mockReturnValue(invoiceData)
      createSpyinvoicesDetail.mockReturnValue(invoiceDetailData)
      findOneSypTenant.mockReturnValue({
        dataValues: {
          tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089'
        }
      })

      // 試験実施
      const resultUpl = csvupload.cbUploadCsv(filePath, filename, fileData)
      expect(resultUpl).toBeTruthy()

      // request uplodadFormatId 空
      request.body = {
        uploadFormatId: ''
      }
      const resultExt = await csvupload.cbExtractInvoice(
        filePath,
        filename,
        userToken,
        invoiceParameta,
        request,
        response
      )
      expect(resultExt).toBe(104)

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

      const csvFileName = 'descriptionlessthanequal101.csv'
      const csvFilePath = path.resolve(`./testData/${csvFileName}`)
      const fileData = Buffer.from(
        fs.readFileSync(csvFilePath, {
          encoding: 'utf-8',
          flag: 'r'
        })
      ).toString()

      createSpyInvoices.mockReturnValue({ ...invoiceData, filename: filename })
      findOneSpyInvoice.mockReturnValue(invoiceData)
      createSpyinvoicesDetail.mockReturnValue(invoiceDetailData)
      findOneSypTenant.mockReturnValue({
        dataValues: {
          tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089'
        }
      })

      // 試験実施
      const resultUpl = csvupload.cbUploadCsv(filePath, filename, fileData)
      expect(resultUpl).toBeTruthy()

      // request uplodadFormatId 空
      request.body = {
        uploadFormatId: ''
      }
      const resultExt = await csvupload.cbExtractInvoice(
        filePath,
        filename,
        userToken,
        invoiceParameta,
        request,
        response
      )
      expect(resultExt).toBe(104)

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

      const csvFileName = 'headerCloumnErr.csv'
      const csvFilePath = path.resolve(`./testData/${csvFileName}`)
      const fileData = Buffer.from(
        fs.readFileSync(csvFilePath, {
          encoding: 'utf-8',
          flag: 'r'
        })
      ).toString()

      createSpyInvoices.mockReturnValue({ ...invoiceData, filename: filename })
      findOneSpyInvoice.mockReturnValue(invoiceData)
      createSpyinvoicesDetail.mockReturnValue(invoiceDetailData)
      findOneSypTenant.mockReturnValue({
        dataValues: {
          tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089'
        }
      })

      // 試験実施
      const resultUpl = csvupload.cbUploadCsv(filePath, filename, fileData)
      expect(resultUpl).toBeTruthy()

      // request uplodadFormatId 空
      request.body = {
        uploadFormatId: ''
      }
      const resultExt = await csvupload.cbExtractInvoice(
        filePath,
        filename,
        userToken,
        invoiceParameta,
        request,
        response
      )
      expect(resultExt).toBe(104)

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

    test('準正常：ヘッダーバリデーションチェック（ユーザーフォーマット）', async () => {
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

      const csvFileName = 'headerCloumnErr_userFomat.csv'
      const csvFilePath = path.resolve(`./testData/${csvFileName}`)
      const fileData = Buffer.from(
        fs.readFileSync(csvFilePath, {
          encoding: 'utf-8',
          flag: 'r'
        })
      ).toString()

      createSpyInvoices.mockReturnValue({ ...invoiceData, filename: filename })
      findOneSpyInvoice.mockReturnValue(invoiceData)
      createSpyinvoicesDetail.mockReturnValue(invoiceDetailData)
      findByUploadFormatIdSpy.mockReturnValue(uploadFormatDetailResult)
      findByUploadFormatIdIdentifierSpy.mockReturnValue([])
      findUploadFormatIdSpy.mockReturnValue(uploadFormatResultItemRoNo2)

      findOneSypTenant.mockReturnValue({
        dataValues: {
          tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089'
        }
      })

      // 試験実施
      const resultUpl = csvupload.cbUploadCsv(filePath, filename, fileData)
      expect(resultUpl).toBeTruthy()

      // request uplodadFormatId 空
      request.body = {
        uploadFormatId: uploadFormatId
      }
      const resultExt = await csvupload.cbExtractInvoice(
        filePath,
        filename,
        userToken,
        invoiceParameta,
        request,
        response
      )
      expect(resultExt).toBe(104)

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

    test('準正常：ヘッダーバリデーションチェック（カラム名比較）', async () => {
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

      const csvFileName = 'headerCloumnErr_unmatched.csv'
      const csvFilePath = path.resolve(`./testData/${csvFileName}`)
      const fileData = Buffer.from(
        fs.readFileSync(csvFilePath, {
          encoding: 'utf-8',
          flag: 'r'
        })
      ).toString()

      createSpyInvoices.mockReturnValue({ ...invoiceData, filename: filename })
      findOneSpyInvoice.mockReturnValue(invoiceData)
      createSpyinvoicesDetail.mockReturnValue(invoiceDetailData)
      findOneSypTenant.mockReturnValue({
        dataValues: {
          tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089'
        }
      })

      // 試験実施
      const resultUpl = csvupload.cbUploadCsv(filePath, filename, fileData)
      expect(resultUpl).toBeTruthy()

      // request uplodadFormatId 空
      request.body = {
        uploadFormatId: ''
      }
      const resultExt = await csvupload.cbExtractInvoice(
        filePath,
        filename,
        userToken,
        invoiceParameta,
        request,
        response
      )
      expect(resultExt).toBe(104)

      const resultRem = await csvupload.cbRemoveCsv(filePath, filename)
      expect(resultRem).toBeTruthy()

      // 期待結果
      // 404，500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(500))

      // エラーメッセージが予定通りにある
      expect(resultInvoiceDetailController[0].errorData).toEqual(resultInvoiceDetailController[0].errorData)
      invoiceController.insert = tmpInsert
      invoiceDetailController.insert = tmpdetailInsert
      apiManager.accessTradeshift = tmpApiManager
    })

    test('準正常：ヘッダーバリデーションチェック（カラム名比較（ユーザーフォーマット））', async () => {
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

      const csvFileName = 'csvUpload_Format_noHeader_default.csv'
      const csvFilePath = path.resolve(`./testData/${csvFileName}`)
      const fileData = Buffer.from(
        fs.readFileSync(csvFilePath, {
          encoding: 'utf-8',
          flag: 'r'
        })
      ).toString()

      createSpyInvoices.mockReturnValue({ ...invoiceData, filename: filename })
      findOneSpyInvoice.mockReturnValue(invoiceData)
      createSpyinvoicesDetail.mockReturnValue(invoiceDetailData)
      findByUploadFormatIdSpy.mockReturnValue(uploadFormatDetailResult)
      findByUploadFormatIdIdentifierSpy.mockReturnValue([])
      findUploadFormatIdSpy.mockReturnValue(uploadFormatResultItemRoNo2)

      findOneSypTenant.mockReturnValue({
        dataValues: {
          tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089'
        }
      })

      // 試験実施
      const resultUpl = csvupload.cbUploadCsv(filePath, filename, fileData)
      expect(resultUpl).toBeTruthy()

      // request uplodadFormatId 空
      request.body = {
        uploadFormatId: uploadFormatId
      }
      const resultExt = await csvupload.cbExtractInvoice(
        filePath,
        filename,
        userToken,
        invoiceParameta,
        request,
        response
      )
      expect(resultExt).toBe(104)

      const resultRem = await csvupload.cbRemoveCsv(filePath, filename)
      expect(resultRem).toBeTruthy()

      // 期待結果
      // 404，500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(500))

      // エラーメッセージが予定通りにある
      expect(resultInvoiceDetailController[0].errorData).toEqual(resultInvoiceDetailController[0].errorData)
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

      const csvFileName = 'invoiceListCloumnErr20.csv'
      const csvFilePath = path.resolve(`./testData/${csvFileName}`)
      const fileData = Buffer.from(
        fs.readFileSync(csvFilePath, {
          encoding: 'utf-8',
          flag: 'r'
        })
      ).toString()

      createSpyInvoices.mockReturnValue({ ...invoiceData, filename: filename })
      findOneSpyInvoice.mockReturnValue(invoiceData)
      createSpyinvoicesDetail.mockReturnValue(invoiceDetailData)
      findOneSypTenant.mockReturnValue({
        dataValues: {
          tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089'
        }
      })

      // 試験実施
      const resultUpl = csvupload.cbUploadCsv(filePath, filename, fileData)
      expect(resultUpl).toBeTruthy()

      // request uplodadFormatId 空
      request.body = {
        uploadFormatId: ''
      }
      const resultExt = await csvupload.cbExtractInvoice(
        filePath,
        filename,
        userToken,
        invoiceParameta,
        request,
        response
      )
      expect(resultExt).toBe(104)

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

      const csvFileName = 'invoiceListCloumnErr18.csv'
      const csvFilePath = path.resolve(`./testData/${csvFileName}`)
      const fileData = Buffer.from(
        fs.readFileSync(csvFilePath, {
          encoding: 'utf-8',
          flag: 'r'
        })
      ).toString()

      createSpyInvoices.mockReturnValue({ ...invoiceData, filename: filename })
      findOneSpyInvoice.mockReturnValue(invoiceData)
      createSpyinvoicesDetail.mockReturnValue(invoiceDetailData)
      findOneSypTenant.mockReturnValue({
        dataValues: {
          tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089'
        }
      })

      // 試験実施
      const resultUpl = csvupload.cbUploadCsv(filePath, filename, fileData)
      expect(resultUpl).toBeTruthy()

      // request uplodadFormatId 空
      request.body = {
        uploadFormatId: ''
      }
      const resultExt = await csvupload.cbExtractInvoice(
        filePath,
        filename,
        userToken,
        invoiceParameta,
        request,
        response
      )
      expect(resultExt).toBe(104)

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

    test('準正常：単位バリデーションチェック：未入力', async () => {
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

      const csvFileName = 'noUnitcodeData.csv'
      const csvFilePath = path.resolve(`./testData/${csvFileName}`)
      const fileData = Buffer.from(
        fs.readFileSync(csvFilePath, {
          encoding: 'utf-8',
          flag: 'r'
        })
      ).toString()

      // 試験実施
      const resultUpl = await csvupload.cbUploadCsv(filePath, filename, fileData)
      expect(resultUpl).toBeTruthy()

      // request uplodadFormatId 空
      request.body = {
        uploadFormatId: ''
      }
      const resultExt = await csvupload.cbExtractInvoice(
        filePath,
        filename,
        userToken,
        invoiceParameta,
        request,
        response
      )
      expect(resultExt).toBe(104)

      const resultRem = await csvupload.cbRemoveCsv(filePath, filename)
      expect(resultRem).toBeTruthy()

      // 期待結果
      // 404，500エラーがエラーハンドリング「されない」
      expect(resultInvoiceDetailController.length).toBe(1)
      expect(next).not.toHaveBeenCalledWith(error404)
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(500))

      // エラーメッセージが予定通りにある
      expect(resultInvoiceDetailController[0].errorData).toEqual('明細-単位が未入力です。')
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

      const csvFileName = 'unitcodeData.csv'
      const csvFilePath = path.resolve(`./testData/${csvFileName}`)
      const fileData = Buffer.from(
        fs.readFileSync(csvFilePath, {
          encoding: 'utf-8',
          flag: 'r'
        })
      ).toString()

      // 試験実施
      const resultUpl = await csvupload.cbUploadCsv(filePath, filename, fileData)
      expect(resultUpl).toBeTruthy()

      // request uplodadFormatId 空
      request.body = {
        uploadFormatId: ''
      }
      const resultExt = await csvupload.cbExtractInvoice(
        filePath,
        filename,
        userToken,
        invoiceParameta,
        request,
        response
      )
      expect(resultExt).toBe(104)

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
          '明細-単位はマニュアルに定義されたものの中から選択してください。'
        )
      }
      invoiceController.insert = tmpInsert
      invoiceDetailController.insert = tmpdetailInsert
      apiManager.accessTradeshift = tmpApiManager
    })

    test('準正常：明細-税（消費税／軽減税率／不課税／免税／非課税）バリデーションチェック：未入力', async () => {
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

      const csvFileName = 'noTaxData.csv'
      const csvFilePath = path.resolve(`./testData/${csvFileName}`)
      const fileData = Buffer.from(
        fs.readFileSync(csvFilePath, {
          encoding: 'utf-8',
          flag: 'r'
        })
      ).toString()

      // 試験実施
      const resultUpl = await csvupload.cbUploadCsv(filePath, filename, fileData)
      expect(resultUpl).toBeTruthy()

      // request uplodadFormatId 空
      request.body = {
        uploadFormatId: ''
      }
      const resultExt = await csvupload.cbExtractInvoice(
        filePath,
        filename,
        userToken,
        invoiceParameta,
        request,
        response
      )
      expect(resultExt).toBe(104)

      const resultRem = await csvupload.cbRemoveCsv(filePath, filename)
      expect(resultRem).toBeTruthy()

      // 期待結果
      // 404，500エラーがエラーハンドリング「されない」
      expect(resultInvoiceDetailController.length).toBe(1)
      expect(next).not.toHaveBeenCalledWith(error404)
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(500))

      // エラーメッセージが予定通りにある
      expect(resultInvoiceDetailController[0].errorData).toEqual(
        '明細-税（消費税／軽減税率／不課税／免税／非課税）が未入力です。'
      )
      invoiceController.insert = tmpInsert
      invoiceDetailController.insert = tmpdetailInsert
      apiManager.accessTradeshift = tmpApiManager
    })

    test('準正常：明細-税（消費税／軽減税率／不課税／免税／非課税）バリデーションチェック', async () => {
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

      const csvFileName = 'taxData.csv'
      const csvFilePath = path.resolve(`./testData/${csvFileName}`)
      const fileData = Buffer.from(
        fs.readFileSync(csvFilePath, {
          encoding: 'utf-8',
          flag: 'r'
        })
      ).toString()

      // 試験実施
      const resultUpl = await csvupload.cbUploadCsv(filePath, filename, fileData)
      expect(resultUpl).toBeTruthy()

      // request uplodadFormatId 空
      request.body = {
        uploadFormatId: ''
      }
      const resultExt = await csvupload.cbExtractInvoice(
        filePath,
        filename,
        userToken,
        invoiceParameta,
        request,
        response
      )
      expect(resultExt).toBe(104)

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
          '明細-税（消費税／軽減税率／不課税／免税／非課税）はマニュアルに定義されたものの中から選択してください。'
        )
      }
      invoiceController.insert = tmpInsert
      invoiceDetailController.insert = tmpdetailInsert
      apiManager.accessTradeshift = tmpApiManager
    })

    test('準正常：銀行支払い方法制御処理チェック', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      const csvFileName = 'paymentMeansTest.csv'
      const csvFilePath = path.resolve(`./testData/${csvFileName}`)
      const fileData = Buffer.from(
        fs.readFileSync(csvFilePath, {
          encoding: 'utf-8',
          flag: 'r'
        })
      ).toString('base64')

      const invoicesDB = []
      const invoiceDetailDB = []

      request.session = {
        userContext: 'NotLoggedIn',
        userRole: 'dummy'
      }

      userController.findOne = jest.fn((userId) => {
        return dataValues
      })
      tenantController.findOne = jest.fn((tenantid) => {
        return contractdataValues
      })
      contractController.findOne = jest.fn((tenantid) => {
        return contractdataValues
      })
      invoiceController.insert = jest.fn((values) => {
        const userTenantId = values?.tenantId
        let tenantRow
        let tenantId
        let resultToInsertInvoice
        if (!userTenantId) {
          return
        }
        try {
          tenantRow = tenantController.findOne(userTenantId)
          tenantId = tenantRow?.dataValues?.tenantId
        } catch (error) {
          return
        }

        if (!tenantId) {
          return
        }

        try {
          resultToInsertInvoice = {
            ...values,
            tenantId: tenantId
          }
          invoicesDB.push(resultToInsertInvoice)
        } catch (error) {
          return
        }
        return { dataValues: resultToInsertInvoice }
      })
      invoiceController.findInvoice = jest.fn((invoice) => {
        const result = { dataValues: null }
        invoicesDB.forEach((invoiceElement) => {
          if (invoiceElement.invoicesId === invoice) {
            result.dataValues = invoiceElement
          }
        })
        return result
      })
      invoiceDetailController.insert = jest.fn((values) => {
        const invoicesId = values?.invoicesId

        if (!invoicesId) {
          return
        }

        const invoiceRow = invoiceController.findInvoice(invoicesId)

        if (!invoiceRow?.dataValues.invoicesId) {
          return
        }

        let resultToInsertInvoiceDetail

        try {
          resultToInsertInvoiceDetail = {
            ...values,
            invoicesId: invoiceRow?.dataValues.invoicesId
          }
          invoiceDetailDB.push(resultToInsertInvoiceDetail)
        } catch (error) {}
        return { dataValues: resultToInsertInvoiceDetail }
      })
      invoiceController.updateCount = jest.fn(({ invoicesId, successCount, failCount, skipCount, invoiceCount }) => {
        try {
          const invoice = [1]
          invoicesDB.forEach((invoiceElement) => {
            if (invoiceElement.invoicesId === invoicesId) {
              invoiceElement.successCount = successCount
              invoiceElement.failCount = failCount
              invoiceElement.skipCount = skipCount
              invoiceElement.invoiceCount = invoiceCount
            }
          })
          return invoice
        } catch (error) {
          return error
        }
      })

      const paymentMeansTestUser = {
        ...user,
        accessToken: 'dummyAccess'
      }
      request.user = paymentMeansTestUser
      request.body = {
        filename: 'paymentMeansTest.csv',
        fileData: fileData,
        uploadFormatId: ''
      }
      checkContractStatusSpy.mockReturnValue('00')

      // 試験実施
      await csvupload.cbPostUpload(request, response, next)
      // 期待結果
      // DB内容
      expect(invoicesDB[0].csvFileName).toBe('paymentMeansTest.csv')

      expect(invoiceDetailDB[0].invoicesId).toBe(invoicesDB[0].invoicesId)
      expect(invoiceDetailDB[0].invoiceId).toBe('paymentMeansTest1')
      expect(invoiceDetailDB[0].status).toBe(0)
      expect(invoiceDetailDB[0].errorData).toBe('正常に取込ました。')

      expect(invoiceDetailDB[1].invoicesId).toBe(invoicesDB[0].invoicesId)
      expect(invoiceDetailDB[1].invoiceId).toBe('paymentMeansTest2')
      expect(invoiceDetailDB[1].status).toBe(0)
      expect(invoiceDetailDB[1].errorData).toBe('正常に取込ました。')

      expect(invoiceDetailDB[2].invoicesId).toBe(invoicesDB[0].invoicesId)
      expect(invoiceDetailDB[2].invoiceId).toBe('paymentMeansTest3')
      expect(invoiceDetailDB[2].status).toBe(-1)
      expect(invoiceDetailDB[2].errorData).toBe('銀行名が未入力です。')

      expect(invoiceDetailDB[3].invoicesId).toBe(invoicesDB[0].invoicesId)
      expect(invoiceDetailDB[3].invoiceId).toBe('paymentMeansTest4')
      expect(invoiceDetailDB[3].status).toBe(-1)
      expect(invoiceDetailDB[3].errorData).toBe('支店名が未入力です。')

      expect(invoiceDetailDB[4].invoicesId).toBe(invoicesDB[0].invoicesId)
      expect(invoiceDetailDB[4].invoiceId).toBe('paymentMeansTest5')
      expect(invoiceDetailDB[4].status).toBe(-1)
      expect(invoiceDetailDB[4].errorData).toBe('科目が未入力です。')

      expect(invoiceDetailDB[5].invoicesId).toBe(invoicesDB[0].invoicesId)
      expect(invoiceDetailDB[5].invoiceId).toBe('paymentMeansTest6')
      expect(invoiceDetailDB[5].status).toBe(-1)
      expect(invoiceDetailDB[5].errorData).toBe('口座番号が未入力です。')

      expect(invoiceDetailDB[6].invoicesId).toBe(invoicesDB[0].invoicesId)
      expect(invoiceDetailDB[6].invoiceId).toBe('paymentMeansTest7')
      expect(invoiceDetailDB[6].status).toBe(-1)
      expect(invoiceDetailDB[6].errorData).toBe('口座名義が未入力です。')
    })

    test('準正常：明細-税（消費税／軽減税率／不課税／免税／非課税）バリデーションチェック（ユーザーフォーマット）', async () => {
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

      const csvFileName = 'csvUpload_Format_TaxErr.csv'
      const csvFilePath = path.resolve(`./testData/${csvFileName}`)
      const fileData = fs.readFileSync(csvFilePath, {
        encoding: 'utf-8',
        flag: 'r'
      })

      findByUploadFormatIdSpy.mockReturnValue(uploadFormatDetailResult)
      findByUploadFormatIdIdentifierSpy.mockReturnValue(uploadFormatIdentifierTaxResult)
      findUploadFormatIdSpy.mockReturnValue(uploadFormatResultOnce)

      const userToken = {
        accessToken: 'dummyAccessToken',
        refreshToken: 'dummyRefreshToken'
      }
      const filename = request.user.tenantId + '_' + request.user.email + '_' + '20210611102239848' + '.csv'

      // 試験実施
      const resultUpl = await csvupload.cbUploadCsv(filePath, filename, fileData)
      expect(resultUpl).toBeTruthy()

      // request uplodadFormatId 空
      request.body = {
        uploadFormatId: uploadFormatId
      }

      const resultExt = await csvupload.cbExtractInvoice(
        filePath,
        filename,
        userToken,
        invoiceParameta,
        request,
        response
      )
      expect(resultExt).toBe(104)

      const resultRem = await csvupload.cbRemoveCsv(filePath, filename)
      expect(resultRem).toBeTruthy()

      // 期待結果
      // 404，500エラーがエラーハンドリング「されない」
      expect(resultInvoiceDetailController.length).toBe(5)
      expect(next).not.toHaveBeenCalledWith(error404)
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(500))

      // エラーメッセージが予定通りにある
      for (let idx = 0; idx < 5; idx++) {
        expect(resultInvoiceDetailController[idx].invoiceId).toEqual('TEST20211005')
        expect(resultInvoiceDetailController[idx].errorData).toEqual(constantsDefine.invoiceErrMsg.TAXERR002)
      }
      invoiceController.insert = tmpInsert
      invoiceDetailController.insert = tmpdetailInsert
      apiManager.accessTradeshift = tmpApiManager
    })

    test('準正常：単位バリデーションチェック（ユーザーフォーマット）', async () => {
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

      // テストファイル読み込み
      request.user = user
      const csvFileName = 'csvUpload_Format_UnitErr.csv'
      const csvFilePath = path.resolve(`./testData/${csvFileName}`)
      const fileData = fs.readFileSync(csvFilePath, {
        encoding: 'utf-8',
        flag: 'r'
      })

      // DB設定
      findByUploadFormatIdSpy.mockReturnValue(uploadFormatDetailResult)
      findByUploadFormatIdIdentifierSpy.mockReturnValue([uploadFormatIdentifierUnit10Result])
      findUploadFormatIdSpy.mockReturnValue(uploadFormatResultOnce)

      // 試験実施
      const resultUpl = await csvupload.cbUploadCsv(filePath, filename, fileData)
      expect(resultUpl).toBeTruthy()

      // request uplodadFormatId 空
      request.body = {
        uploadFormatId: uploadFormatId
      }
      const resultExt = await csvupload.cbExtractInvoice(
        filePath,
        filename,
        userToken,
        invoiceParameta,
        request,
        response
      )
      expect(resultExt).toBe(104)

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
        expect(resultInvoiceDetailController[idx].errorData).toEqual(constantsDefine.invoiceErrMsg.UNITERR002)
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

      const csvFileName = 'networkCheckData.csv'
      const csvFilePath = path.resolve(`./testData/${csvFileName}`)
      const fileData = Buffer.from(
        fs.readFileSync(csvFilePath, {
          encoding: 'utf-8',
          flag: 'r'
        })
      ).toString()

      // 試験実施
      const resultUpl = await csvupload.cbUploadCsv(filePath, filename, fileData)
      expect(resultUpl).toBeTruthy()

      // request uplodadFormatId 空
      request.body = {
        uploadFormatId: ''
      }
      const resultExt = await csvupload.cbExtractInvoice(
        filePath,
        filename,
        userToken,
        invoiceParameta,
        request,
        response
      )
      expect(resultExt).toBe(104)

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

    test('準正常：請求書テーブルDB登録失敗', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      const resultInvoiceDetailController = []
      request.session = {
        userContext: 'NotLoggedIn',
        userRole: 'dummy'
      }
      const getNetworkTestUser = {
        ...user,
        accessToken: 'getNetworkErr'
      }
      request.user = getNetworkTestUser
      userController.findOne = jest.fn((userId) => {
        return dataValues
      })
      tenantController.findOne = jest.fn((tenantid) => {
        return contractdataValues
      })
      contractController.findOne = jest.fn((tenantid) => {
        return contractdataValues
      })
      invoiceController.insert = jest.fn((values) => {
        return undefined
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
      checkContractStatusSpy.mockReturnValue('00')

      // 試験実施
      await csvupload.cbGetIndex(request, response, next)
      // expect(response.render).toHaveBeenCalledWith('csvupload')

      getNetworkTestUser.accessToken = 'dummyAccess'
      request.user = getNetworkTestUser
      request.body = {
        csvFileName: 'getNetwork',
        fileData: fileData,
        uploadFormatId: ''
      }

      // 試験実施
      await csvupload.cbPostUpload(request, response, next)
      // 期待結果
      // 404，500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(500))
      expect(response.statusCode).toBe(200)
      expect(response.body).toBe(constantsDefine.statusConstants.INVOICE_FAILED)
    })

    test('準正常：APIエラー（ドキュメント取得）', async () => {
      // 準備
      const tmpInsert = invoiceController.insert
      const tmpdetailInsert = invoiceDetailController.insert

      request.user = user

      const userToken = {
        accessToken: 'dummyAccessToken',
        refreshToken: 'dummyRefreshToken'
      }

      userController.findOne = jest.fn((userId) => {
        return dataValues
      })
      tenantController.findOne = jest.fn((tenantid) => {
        return contractdataValues
      })
      contractController.findOne = jest.fn((tenantid) => {
        return contractdataValues
      })

      const filename = request.user.tenantId + '_' + request.user.email + '_' + '20210611102239848' + '.csv'

      const csvFileName = 'getDocumentData1.csv'
      const csvFilePath = path.resolve(`./testData/${csvFileName}`)
      const fileData = Buffer.from(
        fs.readFileSync(csvFilePath, {
          encoding: 'utf-8',
          flag: 'r'
        })
      ).toString()

      // 試験実施
      const resultUpl = await csvupload.cbUploadCsv(filePath, filename, fileData)
      expect(resultUpl).toBeTruthy()

      const expectError = new Error()
      expectError.name = 'Bad Request'
      expectError.response = { status: 400 }
      expectError.message = 'Bad Request 400'

      apiManager.accessTradeshift = jest.fn((accToken, refreshToken, method, query, body = {}, config = {}) => {
        switch (method) {
          case 'get':
            if (
              query.match(
                /^\/documents\?stag=draft&stag=outbox&_onlyIndex=true&includesourcedocuments=false&populatePersonInfo=false&limit=10000/i
              )
            ) {
              if (
                query.match(
                  /^\/documents\?stag=draft&stag=outbox&_onlyIndex=true&includesourcedocuments=false&populatePersonInfo=false&limit=10000&page=/i
                )
              ) {
                return expectError
              }
              return expectError
            }
            if (query.match(/^\/network\?limit=100/i)) {
              if (accToken.match('getNetworkErr')) {
                return new Error('trade shift api error')
              }
              if (query.match(/^\/network\?limit=100&page=/i)) {
                return resultGetNetwork2
              }
              return resultGetNetwork
            }
            break
          case 'put':
            return 200
        }
      })
      invoiceController.insert = tmpInsert
      invoiceDetailController.insert = tmpdetailInsert

      const tmpApiManager = apiManager.accessTradeshift
      // request uplodadFormatId 空
      request.body = {
        uploadFormatId: ''
      }
      const resultExt = await csvupload.cbExtractInvoice(
        filePath,
        filename,
        userToken,
        invoiceParameta,
        request,
        response
      )
      // 期待結果
      expect(resultExt).toBe(104)

      const resultRem = await csvupload.cbRemoveCsv(filePath, filename)
      expect(resultRem).toBeTruthy()

      apiManager.accessTradeshift = tmpApiManager
    })

    test('準正常：エラー（ドキュメント取得APIの結果が正しくない場合）', async () => {
      // 準備
      const tmpInsert = invoiceController.insert
      const tmpdetailInsert = invoiceDetailController.insert

      request.user = user

      const userToken = {
        accessToken: 'dummyAccessToken',
        refreshToken: 'dummyRefreshToken'
      }

      userController.findOne = jest.fn((userId) => {
        return dataValues
      })
      tenantController.findOne = jest.fn((tenantid) => {
        return contractdataValues
      })
      contractController.findOne = jest.fn((tenantid) => {
        return contractdataValues
      })

      const filename = request.user.tenantId + '_' + request.user.email + '_' + '20210611102239848' + '.csv'

      const csvFileName = 'getDocumentData2.csv'
      const csvFilePath = path.resolve(`./testData/${csvFileName}`)
      const fileData = Buffer.from(
        fs.readFileSync(csvFilePath, {
          encoding: 'utf-8',
          flag: 'r'
        })
      ).toString()

      // 試験実施
      const resultUpl = await csvupload.cbUploadCsv(filePath, filename, fileData)
      expect(resultUpl).toBeTruthy()

      const expectError = new Error()
      expectError.name = 'Bad Request'
      expectError.response = { status: 400 }
      expectError.message = 'Bad Request 400'

      apiManager.accessTradeshift = jest.fn((accToken, refreshToken, method, query, body = {}, config = {}) => {
        switch (method) {
          case 'get':
            if (
              query.match(
                /^\/documents\?stag=draft&stag=outbox&_onlyIndex=true&includesourcedocuments=false&populatePersonInfo=false&limit=10000/i
              )
            ) {
              if (
                query.match(
                  /^\/documents\?stag=draft&stag=outbox&_onlyIndex=true&includesourcedocuments=false&populatePersonInfo=false&limit=10000&page=/i
                )
              ) {
                return 'test'
              }
              return 'test'
            }
            if (query.match(/^\/network\?limit=100/i)) {
              if (accToken.match('getNetworkErr')) {
                return new Error('trade shift api error')
              }
              if (query.match(/^\/network\?limit=100&page=/i)) {
                return resultGetNetwork2
              }
              return resultGetNetwork
            }
            break
          case 'put':
            return 200
        }
      })
      invoiceController.insert = tmpInsert
      invoiceDetailController.insert = tmpdetailInsert

      const tmpApiManager = apiManager.accessTradeshift
      // request uplodadFormatId 空
      request.body = {
        uploadFormatId: ''
      }
      const resultExt = await csvupload.cbExtractInvoice(
        filePath,
        filename,
        userToken,
        invoiceParameta,
        request,
        response
      )
      // 期待結果
      expect(resultExt).toBe(104)

      const resultRem = await csvupload.cbRemoveCsv(filePath, filename)
      expect(resultRem).toBeTruthy()

      apiManager.accessTradeshift = tmpApiManager
    })

    test('準正常：APIエラー（請求書登録）', async () => {
      // 準備
      const tmpInsert = invoiceController.insert
      const tmpdetailInsert = invoiceDetailController.insert

      request.user = user

      const userToken = {
        accessToken: 'dummyAccessToken',
        refreshToken: 'dummyRefreshToken'
      }

      userController.findOne = jest.fn((userId) => {
        return dataValues
      })
      tenantController.findOne = jest.fn((tenantid) => {
        return contractdataValues
      })
      contractController.findOne = jest.fn((tenantid) => {
        return contractdataValues
      })

      const filename = request.user.tenantId + '_' + request.user.email + '_' + '20210611102239848' + '.csv'

      const csvFileName = 'getDocumentData2.csv'
      const csvFilePath = path.resolve(`./testData/${csvFileName}`)
      const fileData = Buffer.from(
        fs.readFileSync(csvFilePath, {
          encoding: 'utf-8',
          flag: 'r'
        })
      ).toString()

      // 試験実施
      const resultUpl = await csvupload.cbUploadCsv(filePath, filename, fileData)
      expect(resultUpl).toBeTruthy()

      const expectError = new Error()
      expectError.name = 'Bad Request'
      expectError.response = { status: 400 }
      expectError.message = 'Bad Request 400'

      apiManager.accessTradeshift = jest.fn((accToken, refreshToken, method, query, body = {}, config = {}) => {
        switch (method) {
          case 'get':
            if (
              query.match(
                /^\/documents\?stag=draft&stag=outbox&_onlyIndex=true&includesourcedocuments=false&populatePersonInfo=false&limit=10000/i
              )
            ) {
              if (
                query.match(
                  /^\/documents\?stag=draft&stag=outbox&_onlyIndex=true&includesourcedocuments=false&populatePersonInfo=false&limit=10000&page=/i
                )
              ) {
                return documentListData2
              }
              return documentListData
            }
            if (query.match(/^\/network\?limit=100/i)) {
              if (accToken.match('getNetworkErr')) {
                return new Error('trade shift api error')
              }
              if (query.match(/^\/network\?limit=100&page=/i)) {
                return resultGetNetwork2
              }
              return resultGetNetwork
            }
            break
          case 'put':
            return expectError
        }
      })
      invoiceController.insert = tmpInsert
      invoiceDetailController.insert = tmpdetailInsert

      const tmpApiManager = apiManager.accessTradeshift
      // request uplodadFormatId 空
      request.body = {
        uploadFormatId: ''
      }
      const resultExt = await csvupload.cbExtractInvoice(
        filePath,
        filename,
        userToken,
        invoiceParameta,
        request,
        response
      )
      // 期待結果
      expect(resultExt).toBe(104)

      const resultRem = await csvupload.cbRemoveCsv(filePath, filename)
      expect(resultRem).toBeTruthy()

      apiManager.accessTradeshift = tmpApiManager
    })

    test('500エラー：システムエラー', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      const fs = require('fs')
      const path = require('path')
      const fileName = 'api500error.csv'
      const filePath = path.resolve(`./testData/${fileName}`)
      const fileData = Buffer.from(
        fs.readFileSync(filePath, {
          encoding: 'utf-8',
          flag: 'r'
        })
      ).toString('base64')

      const invoicesDB = []
      const invoiceDetailDB = []

      userController.findOne = jest.fn((userId) => {
        return dataValues
      })
      tenantController.findOne = jest.fn((tenantid) => {
        return contractdataValues
      })
      contractController.findOne = jest.fn((tenantid) => {
        return contractdataValues
      })
      invoiceController.insert = jest.fn((values) => {
        const userTenantId = values?.tenantId
        let tenantRow
        let tenantId
        let resultToInsertInvoice
        if (!userTenantId) {
          return
        }
        try {
          tenantRow = tenantController.findOne(userTenantId)
          tenantId = tenantRow?.dataValues?.tenantId
        } catch (error) {
          return
        }

        if (!tenantId) {
          return
        }

        try {
          resultToInsertInvoice = {
            ...values,
            tenantId: tenantId
          }
          invoicesDB.push(resultToInsertInvoice)
        } catch (error) {
          return
        }
        return { dataValues: resultToInsertInvoice }
      })
      invoiceController.findInvoice = jest.fn((invoice) => {
        const result = { dataValues: null }
        invoicesDB.forEach((invoiceElement) => {
          if (invoiceElement.invoicesId === invoice) {
            result.dataValues = invoiceElement
          }
        })
        return result
      })
      invoiceController.updateCount = jest.fn(({ invoicesId, successCount, failCount, skipCount, invoiceCount }) => {
        try {
          const invoice = [1]
          invoicesDB.forEach((invoiceElement) => {
            if (invoiceElement.invoicesId === invoicesId) {
              invoiceElement.successCount = successCount
              invoiceElement.failCount = failCount
              invoiceElement.skipCount = skipCount
              invoiceElement.invoiceCount = invoiceCount
            }
          })
          return invoice
        } catch (error) {
          return error
        }
      })
      invoiceDetailController.insert = jest.fn((values) => {
        const invoicesId = values?.invoicesId

        if (!invoicesId) {
          return
        }

        const invoiceRow = invoiceController.findInvoice(invoicesId)

        if (!invoiceRow?.dataValues.invoicesId) {
          return
        }

        let resultToInsertInvoiceDetail

        try {
          resultToInsertInvoiceDetail = {
            ...values,
            invoicesId: invoiceRow?.dataValues.invoicesId
          }
          invoiceDetailDB.push(resultToInsertInvoiceDetail)
        } catch (error) {}
        return { dataValues: resultToInsertInvoiceDetail }
      })

      request.session = {
        userContext: 'NotLoggedIn',
        userRole: 'dummy'
      }

      const api500ErrUser = {
        ...user,
        accessToken: 'dummyAccess'
      }
      request.user = api500ErrUser
      request.body = {
        filename: 'api500error.csv',
        fileData: fileData,
        uploadFormatId: ''
      }
      checkContractStatusSpy.mockReturnValue('00')

      // 試験実施
      await csvupload.cbPostUpload(request, response, next)
      // 期待結果
      // DB内容
      expect(invoicesDB[0].csvFileName).toBe('api500error.csv')
      expect(invoicesDB[0].failCount).toBe(1)
      expect(invoicesDB[0].successCount).toBe(0)
      expect(invoicesDB[0].skipCount).toBe(0)
      expect(invoicesDB[0].invoiceCount).toBe(0)
      expect(invoiceDetailDB[0].invoicesId).toBe(invoicesDB[0].invoicesId)
      expect(invoiceDetailDB[0].invoiceId).toBe('api500error')
      expect(invoiceDetailDB[0].status).toBe(-1)
      expect(invoiceDetailDB[0].errorData).toBe(constantsDefine.invoiceErrMsg.SYSERROR)
    })

    test('500エラー：uploadFormatDetail取得エラー', async () => {
      // 準備
      request.user = user
      const userToken = {
        accessToken: 'dummyAccessToken',
        refreshToken: 'dummyRefreshToken'
      }
      const filename = request.user.tenantId + '_' + request.user.email + '_' + '20210611102239848' + '.csv'

      const uploadCsvData = Buffer.from(decodeURIComponent(fileData), 'base64').toString('utf8')

      // 試験実施
      const resultUpl = csvupload.cbUploadCsv(filePath, filename, uploadCsvData)
      expect(resultUpl).toBeTruthy()

      // request uplodadFormatId 空
      request.body = {
        uploadFormatId: uploadFormatId
      }

      // DB取得（updateFormatDetail）
      // DB設定
      findByUploadFormatIdSpy.mockReturnValue(null)

      const resultExt = await csvupload.cbExtractInvoice(
        filePath,
        filename,
        userToken,
        invoiceParameta,
        request,
        response
      )
      expect(resultExt).toBeTruthy()

      const resultRem = csvupload.cbRemoveCsv(filePath, filename)
      expect(resultRem).toBeTruthy()

      // 期待結果
      // 404，500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      expect(response.status).toHaveBeenCalledWith(500)
      expect(response.send).toHaveBeenCalledWith(constantsDefine.statusConstants.SYSTEMERRORMESSAGE)
    })

    test('500エラー：uploadFormat取得エラー', async () => {
      // 準備
      request.user = user
      const userToken = {
        accessToken: 'dummyAccessToken',
        refreshToken: 'dummyRefreshToken'
      }
      const filename = request.user.tenantId + '_' + request.user.email + '_' + '20210611102239848' + '.csv'

      const uploadCsvData = Buffer.from(decodeURIComponent(fileData), 'base64').toString('utf8')

      // 試験実施
      const resultUpl = csvupload.cbUploadCsv(filePath, filename, uploadCsvData)
      expect(resultUpl).toBeTruthy()

      // request uplodadFormatId 空
      request.body = {
        uploadFormatId: uploadFormatId
      }

      // DB取得（updateFormatDetail）
      // DB設定
      findByUploadFormatIdSpy.mockReturnValue(uploadFormatDetailResult)
      findByUploadFormatIdIdentifierSpy.mockReturnValue(uploadFormatIdentifierUnit10Result)
      findUploadFormatIdSpy.mockReturnValue(null)

      const resultExt = await csvupload.cbExtractInvoice(
        filePath,
        filename,
        userToken,
        invoiceParameta,
        request,
        response
      )
      expect(resultExt).toBeTruthy()

      const resultRem = csvupload.cbRemoveCsv(filePath, filename)
      expect(resultRem).toBeTruthy()

      // 期待結果
      // 404，500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      expect(response.status).toHaveBeenCalledWith(500)
      expect(response.send).toHaveBeenCalledWith(constantsDefine.statusConstants.SYSTEMERRORMESSAGE)
    })

    test('500エラー：uploadFormatIdentyfier取得エラー', async () => {
      // 準備
      request.user = user
      const userToken = {
        accessToken: 'dummyAccessToken',
        refreshToken: 'dummyRefreshToken'
      }
      const filename = request.user.tenantId + '_' + request.user.email + '_' + '20210611102239848' + '.csv'

      const uploadCsvData = Buffer.from(decodeURIComponent(fileData), 'base64').toString('utf8')

      // 試験実施
      const resultUpl = csvupload.cbUploadCsv(filePath, filename, uploadCsvData)
      expect(resultUpl).toBeTruthy()

      // request uplodadFormatId 空
      request.body = {
        uploadFormatId: uploadFormatId
      }

      // DB取得（updateFormatDetail）
      // DB設定
      findByUploadFormatIdSpy.mockReturnValue(uploadFormatDetailResult)
      findByUploadFormatIdIdentifierSpy.mockReturnValue(null)

      const resultExt = await csvupload.cbExtractInvoice(
        filePath,
        filename,
        userToken,
        invoiceParameta,
        request,
        response
      )
      expect(resultExt).toBeTruthy()

      const resultRem = csvupload.cbRemoveCsv(filePath, filename)
      expect(resultRem).toBeTruthy()

      // 期待結果
      // 404，500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      expect(response.status).toHaveBeenCalledWith(500)
      expect(response.send).toHaveBeenCalledWith(constantsDefine.statusConstants.SYSTEMERRORMESSAGE)
    })

    test('正常 : bconCsv内容確認', async () => {
      // 準備
      request.user = user
      const filename = request.user.tenantId + '_' + request.user.email + '_' + '20210611102239848' + '.csv'

      const csvFileName = 'fileData.csv'
      const csvFilePath = path.resolve(`./testData/${csvFileName}`)
      const fileData = Buffer.from(
        fs.readFileSync(csvFilePath, {
          encoding: 'utf-8',
          flag: 'r'
        })
      ).toString()

      const extractFullpathFile = filePath + '/' + filename

      // 試験実施
      const resultUpl = csvupload.cbUploadCsv(filePath, filename, fileData)
      expect(resultUpl).toBeTruthy()

      // formatFlag, uploadFormatDetail 設定
      const formatFlag = false
      const uploadFormatDetail = []
      const uploadFormatIdentifier = []
      const defaultCsvPath = path.resolve('./public/html/請求書一括作成フォーマット.csv')
      const uploadData = fs.readFileSync(defaultCsvPath)

      const csvObj = new bconCsv(
        extractFullpathFile,
        formatFlag,
        uploadFormatDetail,
        uploadFormatIdentifier,
        uploadData
      )
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

      const csvFileName = 'countCheckData.csv'
      const csvFilePath = path.resolve(`./testData/${csvFileName}`)
      const fileData = Buffer.from(
        fs.readFileSync(csvFilePath, {
          encoding: 'utf-8',
          flag: 'r'
        })
      ).toString()

      const extractFullpathFile = filePath + '/' + filename

      // 試験実施
      const resultUpl = csvupload.cbUploadCsv(filePath, filename, fileData)
      expect(resultUpl).toBeTruthy()

      // formatFlag, uploadFormatDetail 設定
      const formatFlag = false
      const uploadFormatDetail = []
      const uploadFormatIdentifier = []
      const defaultCsvPath = path.resolve('./public/html/請求書一括作成フォーマット.csv')
      const uploadData = fs.readFileSync(defaultCsvPath)

      const csvObj = new bconCsv(
        extractFullpathFile,
        formatFlag,
        uploadFormatDetail,
        uploadFormatIdentifier,
        uploadData
      )

      const invoiceList = csvObj.getInvoiceList()

      const resultRem = csvupload.cbRemoveCsv(filePath, filename)

      expect(resultRem).toBeTruthy()

      // 期待結果
      // count数が正しいこと
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

    test('正常 : bconCsv内容確認(ユーザーフォーマット-アップロードフォーマット)', async () => {
      // 準備
      request.user = user
      const filename = request.user.tenantId + '_' + request.user.email + '_' + '20210611102239848' + '.csv'

      const csvFileName = 'fileData.csv'
      const csvFilePath = path.resolve(`./testData/${csvFileName}`)
      const fileData = Buffer.from(
        fs.readFileSync(csvFilePath, {
          encoding: 'utf-8',
          flag: 'r'
        })
      ).toString()

      const extractFullpathFile = filePath + '/' + filename

      uploadFormatDetailController.findByUploadFormatId = jest.fn((uploadFormatId) => {
        return uploadFormatDetailResult
      })

      // 試験実施
      const resultUpl = csvupload.cbUploadCsv(filePath, filename, fileData)
      expect(resultUpl).toBeTruthy()

      // formatFlag, uploadFormatDetail 設定
      const formatFlag = true
      const uploadFormatDetail = uploadFormatDetailResult
      const uploadFormatIdentifier = []
      const defaultCsvPath = path.resolve('./public/html/請求書一括作成フォーマット.csv')
      const uploadData = fs.readFileSync(defaultCsvPath)

      const csvObj = new bconCsv(
        extractFullpathFile,
        formatFlag,
        uploadFormatDetail,
        uploadFormatIdentifier,
        uploadData
      )

      const invoiceList = csvObj.getInvoiceList()

      const resultRem = csvupload.cbRemoveCsv(filePath, filename)
      expect(resultRem).toBeTruthy()

      // 期待結果
      // JSONの内容が正しいこと
      expect(JSON.stringify(invoiceList[0].INVOICE.getDocument())).toBe(returnBconCsvUser)
    })

    test('正常 : bconCsv内容確認(ユーザーフォーマット-税)', async () => {
      // 準備
      request.user = user
      const fs = require('fs')
      const path = require('path')
      const csvFileName = 'csvUpload_Format_Tax.csv'
      const csvFilePath = path.resolve(`./testData/${csvFileName}`)
      const fileData = fs.readFileSync(csvFilePath, {
        encoding: 'utf-8',
        flag: 'r'
      })

      const filename = request.user.tenantId + '_' + request.user.email + '_' + '20210611102239848' + '.csv'
      const extractFullpathFile = filePath + '/' + filename

      // 試験実施
      const resultUpl = csvupload.cbUploadCsv(filePath, filename, fileData)
      expect(resultUpl).toBeTruthy()

      // formatFlag, uploadFormatDetail 設定
      const formatFlag = true
      const uploadFormatDetail = uploadFormatDetailResult
      const uploadFormatIdentifier = uploadFormatIdentifierTaxResult
      const defaultCsvPath = path.resolve('./testData/csvUpload_Format_default.csv')
      const uploadData = fs.readFileSync(defaultCsvPath)

      const csvObj = new bconCsv(
        extractFullpathFile,
        formatFlag,
        uploadFormatDetail,
        uploadFormatIdentifier,
        uploadData
      )

      const invoiceList = csvObj.getInvoiceList()

      const resultRem = csvupload.cbRemoveCsv(filePath, filename)
      expect(resultRem).toBeTruthy()

      // 期待結果
      // JSONの内容が正しいこと
      expect(JSON.stringify(invoiceList[0].INVOICE.getDocument())).toBe(returnBconCsvUserTax)
    })

    test('正常 : bconCsv内容確認(ユーザーフォーマット-単位（人月～カートン）)', async () => {
      // 準備
      request.user = user
      const fs = require('fs')
      const path = require('path')
      const testFileName = 'csvUpload_Format_Unit1.csv'
      const TestfilePath = path.resolve(`./testData/${testFileName}`)
      const fileData = fs.readFileSync(TestfilePath, {
        encoding: 'utf-8',
        flag: 'r'
      })
      const filename = request.user.tenantId + '_' + request.user.email + '_' + '20210611102239848' + '.csv'
      const extractFullpathFile = filePath + '/' + filename

      // 試験実施
      const resultUpl = csvupload.cbUploadCsv(filePath, filename, fileData)
      expect(resultUpl).toBeTruthy()

      // formatFlag, uploadFormatDetail 設定
      const formatFlag = true
      const uploadFormatDetail = uploadFormatDetailResult
      const uploadFormatIdentifier = uploadFormatIdentifierUnit10Result
      const defaultCsvPath = path.resolve('./testData/csvUpload_Format_default.csv')
      const uploadData = fs.readFileSync(defaultCsvPath)

      const csvObj = new bconCsv(
        extractFullpathFile,
        formatFlag,
        uploadFormatDetail,
        uploadFormatIdentifier,
        uploadData
      )
      const invoiceList = csvObj.getInvoiceList()

      const resultRem = csvupload.cbRemoveCsv(filePath, filename)
      expect(resultRem).toBeTruthy()

      // 期待結果
      // JSONの内容が正しいこと
      expect(JSON.stringify(invoiceList[0].INVOICE.getDocument())).toBe(returnBconCsvUserUnit1)
    })

    test('正常 : bconCsv内容確認(ユーザーフォーマット-単位（日～時間）)', async () => {
      // 準備
      request.user = user
      const fs = require('fs')
      const path = require('path')
      const testFileName = 'csvUpload_Format_Unit1.csv'
      const TestfilePath = path.resolve(`./testData/${testFileName}`)
      const fileData = fs.readFileSync(TestfilePath, {
        encoding: 'utf-8',
        flag: 'r'
      })
      const filename = request.user.tenantId + '_' + request.user.email + '_' + '20210611102239848' + '.csv'
      const extractFullpathFile = filePath + '/' + filename

      // 試験実施
      const resultUpl = csvupload.cbUploadCsv(filePath, filename, fileData)
      expect(resultUpl).toBeTruthy()

      // formatFlag, uploadFormatDetail 設定
      const formatFlag = true
      const uploadFormatDetail = uploadFormatDetailResult
      const uploadFormatIdentifier = uploadFormatIdentifierUnit28Result
      const defaultCsvPath = path.resolve('./testData/csvUpload_Format_default.csv')
      const uploadData = fs.readFileSync(defaultCsvPath)

      const csvObj = new bconCsv(
        extractFullpathFile,
        formatFlag,
        uploadFormatDetail,
        uploadFormatIdentifier,
        uploadData
      )
      const invoiceList = csvObj.getInvoiceList()

      const resultRem = csvupload.cbRemoveCsv(filePath, filename)
      expect(resultRem).toBeTruthy()

      // 期待結果
      // JSONの内容が正しいこと
      expect(JSON.stringify(invoiceList[0].INVOICE.getDocument())).toBe(returnBconCsvUserUnit2)
    })

    test('正常 : bconCsv内容確認(ユーザーフォーマット-単位（キログラム～その他）)', async () => {
      // 準備
      request.user = user
      const fs = require('fs')
      const path = require('path')
      const testFileName = 'csvUpload_Format_Unit2.csv'
      const TestfilePath = path.resolve(`./testData/${testFileName}`)
      const fileData = fs.readFileSync(TestfilePath, {
        encoding: 'utf-8',
        flag: 'r'
      })
      const filename = request.user.tenantId + '_' + request.user.email + '_' + '20210611102239848' + '.csv'
      const extractFullpathFile = filePath + '/' + filename

      // 試験実施
      const resultUpl = csvupload.cbUploadCsv(filePath, filename, fileData)
      expect(resultUpl).toBeTruthy()

      // formatFlag, uploadFormatDetail 設定
      const formatFlag = true
      const uploadFormatDetail = uploadFormatDetailResult
      const uploadFormatIdentifier = uploadFormatIdentifierUnit28Result
      const defaultCsvPath = path.resolve('./testData/csvUpload_Format_default.csv')
      const uploadData = fs.readFileSync(defaultCsvPath)

      const csvObj = new bconCsv(
        extractFullpathFile,
        formatFlag,
        uploadFormatDetail,
        uploadFormatIdentifier,
        uploadData
      )
      const invoiceList = csvObj.getInvoiceList()

      const resultRem = csvupload.cbRemoveCsv(filePath, filename)
      expect(resultRem).toBeTruthy()

      // 期待結果
      // JSONの内容が正しいこと
      expect(JSON.stringify(invoiceList[0].INVOICE.getDocument())).toBe(returnBconCsvUserUnit3)
    })

    test('準正常：アップロード中ファイルエラー発生される', async () => {
      // 準備
      // requestのuserIdに正常値を入れる
      request.session = {
        userContext: 'LoggedIn',
        userRole: 'dummy'
      }

      const user1 = {
        ...user,
        accessToken: 'dummyAccess'
      }
      request.user = {
        ...user1,
        email: '/\\'
      }
      // DBからの正常なユーザデータの取得を想定する
      findOneSpy.mockReturnValue(dataValues)
      createSpyInvoices.mockReturnValue(invoiceData)
      // DBからの正常な契約情報取得を想定する
      findOneSpyContracts.mockReturnValue(contractdataValues)
      checkContractStatusSpy.mockReturnValue('00')

      const exceptionData = 'file Exception'
      const fileData = Buffer.from(exceptionData).toString('base64')

      // ファイルデータを設定
      request.body = {
        fileData: fileData,
        uploadFormatId: ''
      }

      // 試験実施
      await csvupload.cbPostUpload(request, response, next)

      // 期待結果
      // statusCode 200，bodyが合ってること
      expect(response.statusCode).toBe(500)
      expect(response.body).toBe(constantsDefine.statusConstants.SYSTEMERRORMESSAGE)
    })

    test('準正常：アップロード済、ファイル削除して、関数を終了する時ファイルエラー発生される', async () => {
      // 準備
      // requestのuserIdに正常値を入れる
      request.session = {
        userContext: 'LoggedIn',
        userRole: 'dummy'
      }

      const user1 = {
        ...user,
        accessToken: 'dummyAccess'
      }
      request.user = {
        ...user1
      }
      // DBからの正常なユーザデータの取得を想定する
      findOneSpy.mockReturnValue(dataValues)
      createSpyInvoices.mockReturnValue(invoiceData)
      // DBからの正常な契約情報取得を想定する
      findOneSpyContracts.mockReturnValue(contractdataValues)
      checkContractStatusSpy.mockReturnValue('00')

      const exceptionData = 'file Exception'
      const fileData = Buffer.from(exceptionData).toString('base64')

      pathSpy.mockReturnValue('//\\')
      pathSpy.mockReturnValue('/home/upload/')

      // ファイルデータを設定
      request.body = {
        fileData: fileData,
        uploadFormatId: ''
      }

      // 試験実施
      await csvupload.cbPostUpload(request, response, next)

      // 期待結果
      // statusCode 200，bodyが合ってること
      expect(response.statusCode).toBe(500)
      expect(response.body).toBe(constantsDefine.statusConstants.SYSTEMERRORMESSAGE)
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

  describe('getNetwork', () => {
    test('準正常：エラー（取得したネットワークテナントIDが正しくない場合）', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      const req = user

      const getNetwork = csvupload.getNetwork(req)

      // return結果がundefineである
      expect(getNetwork).toBeDefined()
    })
  })
})
