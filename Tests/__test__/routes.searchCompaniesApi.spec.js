'use strict'

jest.mock('../../Application/node_modules/express', () => {
  return require('jest-express')
})

const searchCompaniesApi = require('../../Application/routes/searchCompaniesApi')
const apiManager = require('../../Application/controllers/apiManager')
const Request = require('jest-express').Request
const Response = require('jest-express').Response
const next = require('jest-express').Next
const constantsDefine = require('../../Application/constants')

if (process.env.LOCALLY_HOSTED === 'true') {
  // NODE_ENVはJestがデフォルトでtestに指定する。dotenvで上書きできなかったため、package.jsonの実行引数でdevelopmentを指定
  require('dotenv').config({ path: './config/.env' })
}

// session、userに正常値を想定
const session = {
  userContext: 'NotLoggedIn',
  userRole: 'dummy'
}

const user = {
  userId: '12345678-cb0b-48ad-857d-4b42a44ede13',
  tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089',
  accessToken: 'dummyAccessToken',
  refreshToken: 'dummyRefreshToken'
}

// 自分自身の企業情報
const accountCompanyResult = {
  CompanyAccountId: '15e2d952-8ba0-42a4-8582-b234cb4a2001',
  CompanyName: '株式会社テスト1'
}

// ネットワークが紐づいている企業検索結果
const companyResult = {
  itemsPerPage: 25,
  itemCount: 3,
  numPages: 1,
  pageId: 0,
  Connection: [
    { CompanyAccountId: '15e2d952-8ba0-42a4-8582-b234cb4a2002', CompanyName: '株式会社テスト2' },
    { CompanyAccountId: '15e2d952-8ba0-42a4-8582-b234cb4a2003', CompanyName: '株式会社テスト3' },
    { CompanyAccountId: '15e2d952-8ba0-42a4-8582-b234cb4a2004', CompanyName: '株式会社テスト2' }
  ]
}

// ネットワークが紐づいている企業検索結果複数ページ
// 1ページ目
const companyResultPage1 = {
  itemsPerPage: 2,
  itemCount: 4,
  numPages: 2,
  pageId: 0,
  Connection: [
    { CompanyAccountId: '15e2d952-8ba0-42a4-8582-b234cb4a2004', CompanyName: '株式会社テスト4' },
    { CompanyAccountId: '15e2d952-8ba0-42a4-8582-b234cb4a2005', CompanyName: '株式会社テスト5' }
  ]
}
// 2ページ目
const companyResultPage2 = {
  itemsPerPage: 2,
  itemCount: 4,
  numPages: 2,
  pageId: 1,
  Connection: [
    { CompanyAccountId: '15e2d952-8ba0-42a4-8582-b234cb4a2006', CompanyName: '株式会社テスト6' },
    { CompanyAccountId: '15e2d952-8ba0-42a4-8582-b234cb4a2007', CompanyName: '株式会社テスト7' }
  ]
}

// API 400エラー
const errorResult400 = new Error('Request failed with status code 404')
errorResult400.response = { status: 400 }

// API 500エラー
const errorResult500 = new Error('Request failed with status code 500')
errorResult500.response = { status: 500 }

let request, response, apiManagerSpy

describe('searchCompaniesApiのテスト', () => {
  beforeEach(() => {
    request = new Request()
    response = new Response()
    apiManagerSpy = jest.spyOn(apiManager, 'accessTradeshift')
  })
  afterEach(() => {
    request.resetMocked()
    response.resetMocked()
    next.mockReset()
    apiManagerSpy.mockRestore()
  })

  describe('cbSearchCompanies', () => {
    test('正常', async () => {
      // 準備
      // sessionとuserに正常値を想定する
      request.session = { ...session }
      request.user = { ...user }

      // 検索する企業名想定する
      request.body = {
        companyName: '株式会社'
      }

      // apiのreturn値を想定する
      apiManagerSpy.mockReturnValueOnce({ ...accountCompanyResult }).mockReturnValueOnce({ ...companyResult })

      // 試験実施
      await searchCompaniesApi.cbSearchCompanies(request, response)

      // 期待結果
      // response.statusが200
      expect(response.status).toHaveBeenCalledWith(200)
      // response.bodyに予想したデータが入っている
      expect(response.body).toContainEqual(accountCompanyResult)
      expect(response.body).toContainEqual(companyResult.Connection[0])
      expect(response.body).toContainEqual(companyResult.Connection[1])
    })

    test('正常:企業が指定したリミットより多い場合', async () => {
      // 準備
      // sessionとuserに正常値を想定する
      request.session = { ...session }
      request.user = { ...user }

      // 検索する企業名想定する
      request.body = {
        companyName: '株式会社'
      }

      // apiのreturn値を想定する
      // apiManagerSpy.mockReturnValueOnce({ ...companyResultPage1 }).mockReturnValueOnce({ ...companyResultPage2 })
      apiManagerSpy
        .mockReturnValueOnce({ ...accountCompanyResult })
        .mockReturnValueOnce({ ...companyResultPage1 })
        .mockReturnValueOnce({ ...companyResultPage2 })

      // 試験実施
      await searchCompaniesApi.cbSearchCompanies(request, response)

      // 期待結果
      // response.statusが200
      expect(response.status).toHaveBeenCalledWith(200)
      // response.bodyに予想したデータが入っている
      expect(response.body).toContainEqual(accountCompanyResult)
      expect(response.body).toContainEqual(companyResultPage1.Connection[0])
      expect(response.body).toContainEqual(companyResultPage1.Connection[1])
      expect(response.body).toContainEqual(companyResultPage2.Connection[0])
      expect(response.body).toContainEqual(companyResultPage2.Connection[1])
    })

    test('403エラー：認証情報取得失敗した場合', async () => {
      // 準備
      // 検索する企業名想定する
      request.body = {
        companyName: '株式会社'
      }

      // 試験実施
      await searchCompaniesApi.cbSearchCompanies(request, response)

      // 期待結果
      // 403エラーがエラーハンドリング「される」
      expect(response.status).toHaveBeenCalledWith(403)
    })

    test('400エラー：リクエストボディがない場合', async () => {
      // 準備
      // sessionとuserに正常値を想定する
      request.session = { ...session }
      request.user = { ...user }

      // 試験実施
      await searchCompaniesApi.cbSearchCompanies(request, response)

      // 期待結果
      // 400エラーがエラーハンドリング「される」
      expect(response.status).toHaveBeenCalledWith(400)
    })

    test('API400エラー：accountAPI', async () => {
      // 準備
      // sessionとuserに正常値を想定する
      request.session = { ...session }
      request.user = { ...user }

      // 検索する企業名想定する
      request.body = {
        companyName: '株式会社'
      }

      apiManagerSpy.mockReturnValueOnce(errorResult400).mockReturnValueOnce({ ...companyResult })

      // 試験実施
      await searchCompaniesApi.cbSearchCompanies(request, response)

      // 期待結果
      // response.statusが400
      expect(response.status).toHaveBeenCalledWith(400)
      // response.bodyに予想したデータが入っている
      expect(response.body).toBe(constantsDefine.statusConstants.CSVDOWNLOAD_APIERROR)
    })

    test('API500エラー：accountAPI', async () => {
      // 準備
      // sessionとuserに正常値を想定する
      request.session = { ...session }
      request.user = { ...user }

      // 検索する企業名想定する
      request.body = {
        companyName: '株式会社'
      }

      apiManagerSpy.mockReturnValueOnce(errorResult500).mockReturnValueOnce({ ...companyResult })

      // 試験実施
      await searchCompaniesApi.cbSearchCompanies(request, response)

      // 期待結果
      // response.statusが500
      expect(response.status).toHaveBeenCalledWith(500)
      // response.bodyに予想したデータが入っている
      expect(response.body).toBe(constantsDefine.statusConstants.CSVDOWNLOAD_SYSERROR)
    })

    test('API400エラー：connectionsAPI', async () => {
      // 準備
      // sessionとuserに正常値を想定する
      request.session = { ...session }
      request.user = { ...user }

      // 検索する企業名想定する
      request.body = {
        companyName: '株式会社'
      }

      // apiのreturn値を想定する
      apiManagerSpy.mockReturnValueOnce({ ...accountCompanyResult }).mockReturnValueOnce(errorResult400)

      // 試験実施
      await searchCompaniesApi.cbSearchCompanies(request, response)

      // 期待結果
      // response.statusが400
      expect(response.status).toHaveBeenCalledWith(400)
      // response.bodyに予想したデータが入っている
      expect(response.body).toBe(constantsDefine.statusConstants.CSVDOWNLOAD_APIERROR)
    })

    test('API500エラー：connectionsAPI', async () => {
      // 準備
      // sessionとuserに正常値を想定する
      request.session = { ...session }
      request.user = { ...user }

      // 検索する企業名想定する
      request.body = {
        companyName: '株式会社'
      }

      apiManagerSpy.mockReturnValueOnce(errorResult500)

      // 試験実施
      await searchCompaniesApi.cbSearchCompanies(request, response)

      // 期待結果
      // response.statusが500
      expect(response.status).toHaveBeenCalledWith(500)
      // response.bodyに予想したデータが入っている
      expect(response.body).toBe(constantsDefine.statusConstants.CSVDOWNLOAD_SYSERROR)
    })
  })

  describe('errorHandle', () => {
    test('異常:APIエラー', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...user }

      // 試験実施
      await searchCompaniesApi.errorHandle(errorResult400, response, request)

      // 期待結果
      // 400エラーがエラーハンドリング「される」
      expect(response.status).toHaveBeenCalledWith(400)
      // response.bodyに予想したデータが入っている
      expect(response.body).toBe(constantsDefine.statusConstants.CSVDOWNLOAD_APIERROR)
    })

    test('異常:システムエラー', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...user }

      // 試験実施
      await searchCompaniesApi.errorHandle(errorResult500, response, request)

      // 期待結果
      // 500エラーがエラーハンドリング「される」
      expect(response.status).toHaveBeenCalledWith(500)
      // response.bodyに予想したデータが入っている
      expect(response.body).toBe(constantsDefine.statusConstants.CSVDOWNLOAD_SYSERROR)
    })
  })
})
