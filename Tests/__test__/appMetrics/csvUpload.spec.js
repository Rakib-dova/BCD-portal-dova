'use strict'
const path = require('path')
const fs = require('fs')
jest.mock('../../../Application/node_modules/express', () => {
  return require('jest-express')
})

const Request = require('jest-express').Request
const Response = require('jest-express').Response
const next = require('jest-express').Next

const csvuploadRouter = require('../../../Application/routes/csvupload')
const helper = require('../../../Application/routes/helpers/middleware')
const apiManager = require('../../../Application/controllers/apiManager')
const userController = require('../../../Application/controllers/userController')
const contractController = require('../../../Application/controllers/contractController')
const invoiceController = require('../../../Application/controllers/invoiceController')
const logger = require('../../../Application/lib/logger.js')
const BconCsv = require('../../../Application/lib/bconCsv')

jest.mock('../../../Application/lib/bconCsv')
jest.mock('../../../Application/routes/helpers/error', () => { return { create: () => {} } }) // setErrorLog() でエラーを出力させない為に必要

let request, response, infoSpy
let userControllerFindOneSpy, contractControllerFindOneSpy
let invoiceInsertSpy, invoiceUpdateCountSpy
let accessTradeshiftSpy, checkContractStatusSpy

const user = [
  {
    userId: '388014b9-d667-4144-9cc4-5da420981438',
    email: 'dummy@testdummy.com',
    tenantId: 'dummyTenantId',
    accessToken: 'dummyAccessToken',
    refreshToken: 'dummyRefreshToken'
  }
]

const session = {
  userContext: 'NotLoggedIn',
  userRole: 'dummy'
}

describe('アプリ効果測定UT_デジトレ', () => {
  beforeEach(() => {
    request = new Request()
    request.user = user[0]
    request.session = session
    response = new Response()
    infoSpy = jest.spyOn(logger, 'info')
    accessTradeshiftSpy = jest.spyOn(apiManager, 'accessTradeshift')
    userControllerFindOneSpy = jest.spyOn(userController, 'findOne')
    contractControllerFindOneSpy = jest.spyOn(contractController, 'findOne')
    checkContractStatusSpy = jest.spyOn(helper, 'checkContractStatus')
    invoiceInsertSpy = jest.spyOn(invoiceController, 'insert')
    invoiceUpdateCountSpy = jest.spyOn(invoiceController, 'updateCount') // invoiceController.updateCount() でエラーを出力させない為に必要
  })
  afterEach(() => {
    request.resetMocked()
    response.resetMocked()
    next.mockReset()
    infoSpy.mockRestore()
    accessTradeshiftSpy.mockRestore()
    userControllerFindOneSpy.mockRestore()
    contractControllerFindOneSpy.mockRestore()
    checkContractStatusSpy.mockRestore()
    invoiceInsertSpy.mockRestore()
    invoiceUpdateCountSpy.mockRestore()
  })

  describe('請求書一括アップロード', () => {
    test('アップロードに失敗する場合', async () => {
      const fileData = Buffer.from(
        fs.readFileSync(path.resolve('./testData/fileData.csv'), {
          encoding: 'utf-8',
          flag: 'r'
        })
      ).toString('base64')
      request.body = { fileData, uploadFormatId: '' }
      userControllerFindOneSpy.mockResolvedValue({ dataValues: { userRole: 'a6a3edcd-00d9-427c-bf03-4ef0112ba16d', userStatus: 0 } })
      contractControllerFindOneSpy.mockResolvedValue({ dataValues: { contractId: '232457c2-07af-4235-8fff-6dfa32e37f5e', deleteFlag: false } })
      checkContractStatusSpy.mockResolvedValue(10)
      invoiceInsertSpy.mockResolvedValue({ dataValues: 'dummy' })
      invoiceUpdateCountSpy.mockResolvedValue({}) // invoiceController.updateCount() でエラーを出力させない為に必要
      accessTradeshiftSpy.mockResolvedValueOnce(new Error('API error'))

      await csvuploadRouter.cbPostUpload(request, response, next)

      expect(response.status(200).send).toHaveBeenCalledWith('請求書取込が完了しました。\n（反映には時間がかかる場合がございます。）\n取込に失敗した請求書が存在します。\n取込結果は一覧画面でご確認下さい。')
      expect(infoSpy).nthCalledWith(2, { action: 'invoiceUploadRequest', tenantId: 'dummyTenantId' })
      expect(infoSpy).not.nthCalledWith(8, {
        action: 'uploadedInvoiceInfo',
        uploadedInvoiceCount: 1,
        tenantId: 'dummyTenantId',
        invoices: [{ detailCount: 0, invoiceId: 'dummyInvoiceId', status: 'success' }]
      })
    })

    test('アップロードに成功する場合', async () => {
      const fileData = Buffer.from(
        fs.readFileSync(path.resolve('./testData/fileData.csv'), {
          encoding: 'utf-8',
          flag: 'r'
        })
      ).toString('base64')
      request.body = { fileData, uploadFormatId: '' }
      userControllerFindOneSpy.mockResolvedValue({ dataValues: { userRole: 'a6a3edcd-00d9-427c-bf03-4ef0112ba16d', userStatus: 0 } })
      contractControllerFindOneSpy.mockResolvedValue({ dataValues: { contractId: '232457c2-07af-4235-8fff-6dfa32e37f5e', deleteFlag: false } })
      checkContractStatusSpy.mockResolvedValue(10)
      invoiceInsertSpy.mockResolvedValue({ dataValues: 'dummy' })
      invoiceUpdateCountSpy.mockResolvedValue({}) // invoiceController.updateCount() でエラーを出力させない為に必要
      accessTradeshiftSpy
        .mockResolvedValueOnce({
          numPages: 2,
          pageId: 2,
          Connections: {
            Connection: [
              { State: 'ACCEPTED', CompanyAccountId: '927635b5-f469-493b-9ce0-b2bfc4062959' },
              { State: 'ACCEPTED', CompanyAccountId: '927635b5-f469-493b-9ce0-b2bfc4062951' },
              { State: 'ACCEPTED', CompanyAccountId: '3cfebb4f-2338-4dc7-9523-5423a027a880' }
            ]
          }
        })
        .mockResolvedValueOnce({ numPages: 2, pageId: 2, Document: [] })
        .mockResolvedValueOnce({})
      BconCsv.mockImplementation(() => {
        return {
          getInvoiceList() {
            return [
              {
                invoiceId: 'dummyInvoiceId',
                status: 0,
                INVOICE: {
                  getDocument: () => {
                    return {
                      ID: { value: 'T001' },
                      InvoiceLine: []
                    }
                  },
                  getDocumentId: () => 'T001'
                }
              }
            ]
          }
        }
      })

      await csvuploadRouter.cbPostUpload(request, response, next)

      expect(infoSpy).nthCalledWith(2, { action: 'invoiceUploadRequest', tenantId: 'dummyTenantId' })
      expect(infoSpy).nthCalledWith(8, {
        action: 'uploadedInvoiceInfo',
        uploadedInvoiceCount: 1,
        tenantId: 'dummyTenantId',
        invoices: [{ detailCount: 0, invoiceId: 'dummyInvoiceId', status: 'success' }]
      })
    })
  })
})
