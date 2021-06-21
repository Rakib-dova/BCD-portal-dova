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
const Request = require('jest-express').Request
const Response = require('jest-express').Response
const next = require('jest-express').Next
const helper = require('../../Application/routes/helpers/middleware')
const errorHelper = require('../../Application/routes/helpers/error')
const userController = require('../../Application/controllers/userController.js')
const logger = require('../../Application/lib/logger.js')

if (process.env.LOCALLY_HOSTED === 'true') {
  // NODE_ENVはJestがデフォルトでtestに指定する。dotenvで上書きできなかったため、package.jsonの実行引数でdevelopmentを指定
  require('dotenv').config({ path: './config/.env' })
}
let request, response, infoSpy, findOneSpy
describe('csvuploadのテスト', () => {
  beforeEach(() => {
    request = new Request()
    response = new Response()
    infoSpy = jest.spyOn(logger, 'info')
    findOneSpy = jest.spyOn(userController, 'findOne')
  })
  afterEach(() => {
    request.resetMocked()
    response.resetMocked()
    next.mockReset()
    infoSpy.mockRestore()
    findOneSpy.mockRestore()
  })

  // 404エラー定義
  const error404 = new Error('お探しのページは見つかりませんでした。')
  error404.name = 'Not Found'
  error404.status = 404

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
      request.user = {
        userId: '12345678-cb0b-48ad-857d-4b42a44ede13'
      }
      // DBからの正常なユーザデータの取得を想定する
      findOneSpy.mockReturnValue({
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
      })

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

    test('500エラー：requestのsession,userIdがnullの場合', async () => {
      // 準備
      // requestのsession,userIdにnullを入れる
      request.session = null
      request.user = {
        userId: null
      }

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
      request.user = {
        userId: '12345678-cb0b-48ad-857d-4b42a44ede13'
      }
      // DBからのユーザデータの取得ができなかった(null)場合を想定する
      findOneSpy.mockReturnValue(null)

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

    test('500エラー：DBエラーの場合', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = {
        userContext: 'NotLoggedIn',
        userRole: 'dummy'
      }
      request.user = {
        userId: '12345678-cb0b-48ad-857d-4b42a44ede13'
      }
      // DBからのユーザデータの取得でエラーが発生した場合を想定する
      findOneSpy.mockReturnValue(new Error('DB error mock'))
      // 試験実施
      await csvupload.cbGetIndex(request, response, next)

      // 期待結果
      // 500エラーがエラーハンドリング「される」
      expect(next).toHaveBeenCalledWith(errorHelper.create(500))
    })

    test('500エラー：DBエラーの場合', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = {
        userContext: 'NotLoggedIn',
        userRole: 'dummy'
      }
      request.user = {
        userId: '12345678-cb0b-48ad-857d-4b42a44ede13'
      }
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
      request.user = {
        userId: '12345678-cb0b-48ad-857d-4b42a44ede13'
      }
      // DBから取得したユーザデータのuserStatusが0以外の場合を想定する
      findOneSpy.mockReturnValue({
        dataValues: {
          userStatus: 1
        }
      })
      // 試験実施
      await csvupload.cbGetIndex(request, response, next)

      // 期待結果
      // 404エラーがエラーハンドリング「される」
      expect(next).toHaveBeenCalledWith(error404)
    })
  })

  // cbPostUploadの確認
  describe('cbPostUpload', () => {
    test('正常', async () => {
      // 準備
      // requestのuserIdに正常値を入れる
      request.session = {
        userContext: 'NotLoggedIn',
        userRole: 'dummy'
      }
      request.user = {
        userId: '12345678-cb0b-48ad-857d-4b42a44ede13'
      }
      // DBからの正常なユーザデータの取得を想定する
      findOneSpy.mockReturnValue({
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
      })

      // ファイルデータを設定
      request.body = {
        fileData:
          '55m66KGM5pelLOiri+axguabuOeVquWPtyzjg4bjg4rjg7Pjg4hJRCzmlK/miZXmnJ/ml6Us57SN5ZOB5pelLOWCmeiAgyzpioDooYzlkI0s5pSv5bqX5ZCNLOenkeebrizlj6Pluqfnlarlj7cs5Y+j5bqn5ZCN576pLOOBneOBruS7lueJueS6i+mghSzmmI7ntLAt6aCF55uuSUQs5piO57SwLeWGheWuuSzmmI7ntLAt5pWw6YePLOaYjue0sC3ljZjkvY0s5piO57SwLeWNmOS+oSzmmI7ntLAt5Y2Y5L6hLOaYjue0sC3nqI4s5piO57SwLeWCmeiAgw0KMjAyMS0wNi0wOSwyMDIxMDYxNF90ZXN0X3BvY18yLGY3ODNiZTBlLWU3MTYtNGVhYi1hN2VjLTVjZTM2YjNjN2IzMSwyMDIxLTAzLTMxLDIwMjEtMDMtMTcsdGVzdDExMSx0ZXN0c2l0ZW4sdGVzdGJhbmssR2Vu'
      }

      // 試験実施
      await csvupload.cbPostUpload(request, response, next)

      // 期待結果
      // 404，500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(404)
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(500))
    })

    test('Upload File is Empty.(error)', async () => {
      // requestのuserIdに正常値を入れる
      request.user = {
        userId: '12345678-cb0b-48ad-857d-4b42a44ede13'
      }
      // DBからの正常なユーザデータの取得を想定する
      findOneSpy.mockReturnValue({
        dataValues: {
          tenantId: null,
          userRole: 'a6a3edcd-00d9-427c-bf03-4ef0112ba16d',
          appVersion: '0.0.1',
          refreshToken: 'dummyRefreshToken',
          subRefreshToken: null,
          userStatus: 0,
          lastRefreshedAt: null,
          createdAt: '2021-06-07T08:45:49.803Z',
          updatedAt: '2021-06-07T08:45:49.803Z'
        }
      })

      // ファイルデータを設定
      request.body = {
        fileData:
          null
      }

      // 試験実施
      await csvupload.cbPostUpload(request, response, next)

      // 期待結果
      // 404，500エラーがエラーハンドリング「されない」
      expect(next).toHaveBeenCalledWith(errorHelper.create(500))
    })

    test('500エラー：DBからユーザが取得できなかった(null)場合', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = {
        userContext: 'NotLoggedIn',
        userRole: 'dummy'
      }
      request.user = {
        userId: '12345678-cb0b-48ad-857d-4b42a44ede13'
      }
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
      request.user = {
        userId: '12345678-cb0b-48ad-857d-4b42a44ede13'
      }
      // DBから取得したユーザデータのuserStatusが0以外の場合を想定する
      findOneSpy.mockReturnValue({
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
      })
      // 試験実施
      await csvupload.cbPostUpload(request, response, next)

      // 期待結果
      // 404エラーがエラーハンドリング「される」
      expect(next).toHaveBeenCalledWith(error404)
    })
  })

  // cbUploadCsvの確認
  describe('cbUploadCsv', () => {
    test('正常', async () => {
      // 準備
      request.user = {
        email: 'dummy@testdummy.com',
        tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089'
      }

      request.body = {
        fileData:
          '55m66KGM5pelLOiri+axguabuOeVquWPtyzjg4bjg4rjg7Pjg4hJRCzmlK/miZXmnJ/ml6Us57SN5ZOB5pelLOWCmeiAgyzpioDooYzlkI0s5pSv5bqX5ZCNLOenkeebrizlj6Pluqfnlarlj7cs5Y+j5bqn5ZCN576pLOOBneOBruS7lueJueS6i+mghSzmmI7ntLAt6aCF55uuSUQs5piO57SwLeWGheWuuSzmmI7ntLAt5pWw6YePLOaYjue0sC3ljZjkvY0s5piO57SwLeWNmOS+oSzmmI7ntLAt5Y2Y5L6hLOaYjue0sC3nqI4s5piO57SwLeWCmeiAgw0KMjAyMS0wNi0wOSwyMDIxMDYxNF90ZXN0X3BvY18yLGY3ODNiZTBlLWU3MTYtNGVhYi1hN2VjLTVjZTM2YjNjN2IzMSwyMDIxLTAzLTMxLDIwMjEtMDMtMTcsdGVzdDExMSx0ZXN0c2l0ZW4sdGVzdGJhbmssR2Vu'
      }

      const filename = request.user.tenantId + '_' + request.user.email + '_' + '20210611102239848' + '.csv'
      const uploadCsvData = Buffer.from(decodeURIComponent(request.body.fileData), 'base64').toString('utf8')
      const filePath = '/home/upload'

      // 試験実施
      const result = await csvupload.cbUploadCsv(filePath, filename, uploadCsvData)

      // returnがtrueであること
      expect(result).toBeTruthy()

      // 期待結果
      // 404，500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(404)
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(500))
    })

    test('CSV File Upload failed.(error)', async () => {
      // 準備
      request.user = {
        email: 'dummy@testdummy.com',
        tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089'
      }

      request.body = {
        fileData:
          '55m66KGM5pelLOiri+axguabuOeVquWPtyzjg4bjg4rjg7Pjg4hJRCzmlK/miZXmnJ/ml6Us57SN5ZOB5pelLOWCmeiAgyzpioDooYzlkI0s5pSv5bqX5ZCNLOenkeebrizlj6Pluqfnlarlj7cs5Y+j5bqn5ZCN576pLOOBneOBruS7lueJueS6i+mghSzmmI7ntLAt6aCF55uuSUQs5piO57SwLeWGheWuuSzmmI7ntLAt5pWw6YePLOaYjue0sC3ljZjkvY0s5piO57SwLeWNmOS+oSzmmI7ntLAt5Y2Y5L6hLOaYjue0sC3nqI4s5piO57SwLeWCmeiAgw0KMjAyMS0wNi0wOSwyMDIxMDYxNF90ZXN0X3BvY18yLGY3ODNiZTBlLWU3MTYtNGVhYi1hN2VjLTVjZTM2YjNjN2IzMSwyMDIxLTAzLTMxLDIwMjEtMDMtMTcsdGVzdDExMSx0ZXN0c2l0ZW4sdGVzdGJhbmssR2Vu'
      }

      // 試験実施
      const result = await csvupload.cbUploadCsv('/home/upload', null, null)

      // returnがfalseであること
      expect(result).toBeFalsy()
    })

    test('Failed to Save CSVFile. (error)', async () => {
      // 準備
      request.user = {
        email: 'dummy@testdummy.com',
        tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089'
      }

      request.body = {
        fileData:
          '55m66KGM5pelLOiri+axguabuOeVquWPtyzjg4bjg4rjg7Pjg4hJRCzmlK/miZXmnJ/ml6Us57SN5ZOB5pelLOWCmeiAgyzpioDooYzlkI0s5pSv5bqX5ZCNLOenkeebrizlj6Pluqfnlarlj7cs5Y+j5bqn5ZCN576pLOOBneOBruS7lueJueS6i+mghSzmmI7ntLAt6aCF55uuSUQs5piO57SwLeWGheWuuSzmmI7ntLAt5pWw6YePLOaYjue0sC3ljZjkvY0s5piO57SwLeWNmOS+oSzmmI7ntLAt5Y2Y5L6hLOaYjue0sC3nqI4s5piO57SwLeWCmeiAgw0KMjAyMS0wNi0wOSwyMDIxMDYxNF90ZXN0X3BvY18yLGY3ODNiZTBlLWU3MTYtNGVhYi1hN2VjLTVjZTM2YjNjN2IzMSwyMDIxLTAzLTMxLDIwMjEtMDMtMTcsdGVzdDExMSx0ZXN0c2l0ZW4sdGVzdGJhbmssR2Vu'
      }

      const filename = request.user.tenantId + '_' + request.user.email + '_' + '20210611102239848' + '.csv'
      const uploadCsvData = Buffer.from(decodeURIComponent(request.body.fileData), 'base64').toString('utf8')
      const filePath = '///'

      // 試験実施
      const result = await csvupload.cbUploadCsv(filePath, filename, uploadCsvData)

      // returnがfalseであること
      expect(result).toBeFalsy()
    })

    test('User Directory is Nothing.(error)', async () => {
      // 準備
      request.user = {
        email: 'dummy@testdummy.com',
        tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089'
      }

      request.body = {
        fileData:
          '55m66KGM5pelLOiri+axguabuOeVquWPtyzjg4bjg4rjg7Pjg4hJRCzmlK/miZXmnJ/ml6Us57SN5ZOB5pelLOWCmeiAgyzpioDooYzlkI0s5pSv5bqX5ZCNLOenkeebrizlj6Pluqfnlarlj7cs5Y+j5bqn5ZCN576pLOOBneOBruS7lueJueS6i+mghSzmmI7ntLAt6aCF55uuSUQs5piO57SwLeWGheWuuSzmmI7ntLAt5pWw6YePLOaYjue0sC3ljZjkvY0s5piO57SwLeWNmOS+oSzmmI7ntLAt5Y2Y5L6hLOaYjue0sC3nqI4s5piO57SwLeWCmeiAgw0KMjAyMS0wNi0wOSwyMDIxMDYxNF90ZXN0X3BvY18yLGY3ODNiZTBlLWU3MTYtNGVhYi1hN2VjLTVjZTM2YjNjN2IzMSwyMDIxLTAzLTMxLDIwMjEtMDMtMTcsdGVzdDExMSx0ZXN0c2l0ZW4sdGVzdGJhbmssR2Vu'
      }

      const filename = request.user.tenantId + '_' + request.user.email + '_' + '20210611102239848' + '.csv'
      const uploadCsvData = Buffer.from(decodeURIComponent(request.body.fileData), 'base64').toString('utf8')
      const filePath = '/test'

      // 試験実施
      const result = await csvupload.cbUploadCsv(filePath, filename, uploadCsvData)

      // returnがfalseであること
      expect(result).toBeFalsy()
    })
  })

  // cbExtractInvoiceの確認
  describe('cbExtractInvoice', () => {
    test('正常', async () => {
      // 準備
      request.user = {
        email: 'dummy@testdummy.com',
        tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089',
        accessToken: 'dummyAccessToken',
        refreshToken: 'dummyRefreshToken'
      }

      const userToken = {
        accessToken: request.user.accessToken,
        refreshToken: request.user.refreshToken
      }

      const filename = request.user.tenantId + '_' + request.user.email + '_' + '20210611102239848' + '.csv'
      const filePath = '/home/upload'

      // 試験実施(returnがtrueであること)
      request.body = {
        fileData:
          '55m66KGM5pelLOiri+axguabuOeVquWPtyzjg4bjg4rjg7Pjg4hJRCzmlK/miZXmnJ/ml6Us57SN5ZOB5pelLOWCmeiAgyzpioDooYzlkI0s5pSv5bqX5ZCNLOenkeebrizlj6Pluqfnlarlj7cs5Y+j5bqn5ZCN576pLOOBneOBruS7lueJueS6i+mghSzmmI7ntLAt6aCF55uuSUQs5piO57SwLeWGheWuuSzmmI7ntLAt5pWw6YePLOaYjue0sC3ljZjkvY0s5piO57SwLeWNmOS+oSzmmI7ntLAt5Y2Y5L6hLOaYjue0sC3nqI4s5piO57SwLeWCmeiAgw0KMjAyMS0wNi0wOSwyMDIxMDYxNF90ZXN0X3BvY18yLGY3ODNiZTBlLWU3MTYtNGVhYi1hN2VjLTVjZTM2YjNjN2IzMSwyMDIxLTAzLTMxLDIwMjEtMDMtMTcsdGVzdDExMSx0ZXN0c2l0ZW4sdGVzdGJhbmssR2Vu'
      }

      const uploadCsvData = Buffer.from(decodeURIComponent(request.body.fileData), 'base64').toString('utf8')

      // 試験実施
      csvupload.cbUploadCsv(filePath, filename, uploadCsvData)

      const result_ext = csvupload.cbExtractInvoice(filePath, filename, userToken)
      expect(result_ext).toBeTruthy()

      const result_rem = csvupload.cbRemoveCsv(filePath, filename)
      expect(result_rem).toBeTruthy()

      // 期待結果
      // 404，500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(404)
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(500))
    })
  })

  // cbRemoveCsvの確認
  describe('cbRemoveCsv', () => {
    test('正常', async () => {
      // 準備
      request.user = {
        email: 'dummy@testdummy.com',
        tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089'
      }

      const filename = request.user.tenantId + '_' + request.user.email + '_' + '20210611102239848' + '.csv'
      const filePath = '/home/upload'

      request.body = {
        fileData:
          '55m66KGM5pelLOiri+axguabuOeVquWPtyzjg4bjg4rjg7Pjg4hJRCzmlK/miZXmnJ/ml6Us57SN5ZOB5pelLOWCmeiAgyzpioDooYzlkI0s5pSv5bqX5ZCNLOenkeebrizlj6Pluqfnlarlj7cs5Y+j5bqn5ZCN576pLOOBneOBruS7lueJueS6i+mghSzmmI7ntLAt6aCF55uuSUQs5piO57SwLeWGheWuuSzmmI7ntLAt5pWw6YePLOaYjue0sC3ljZjkvY0s5piO57SwLeWNmOS+oSzmmI7ntLAt5Y2Y5L6hLOaYjue0sC3nqI4s5piO57SwLeWCmeiAgw0KMjAyMS0wNi0wOSwyMDIxMDYxNF90ZXN0X3BvY18yLGY3ODNiZTBlLWU3MTYtNGVhYi1hN2VjLTVjZTM2YjNjN2IzMSwyMDIxLTAzLTMxLDIwMjEtMDMtMTcsdGVzdDExMSx0ZXN0c2l0ZW4sdGVzdGJhbmssR2Vu'
      }

      const uploadCsvData = Buffer.from(decodeURIComponent(request.body.fileData), 'base64').toString('utf8')

      // 試験実施
      csvupload.cbUploadCsv(filePath, filename, uploadCsvData)

      // 試験実施
      const result = csvupload.cbRemoveCsv(filePath, filename)

      // returnがtrueであること
      expect(result).toBeTruthy()

      // 期待結果
      // 404，500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(404)
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(500))
    })

    test('ファイルが存在しない場合', async () => {
      // 準備
      request.user = {
        email: 'dummy@testdummy.com',
        tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089'
      }
      const filename = request.user.tenantId + '_' + request.user.email + '_' + '20210611102239848' + '.csv'
      const filePath = '/home/upload'

      // 試験実施(returnがtrueであること)
      const result = csvupload.cbRemoveCsv(filePath, "")

      // returnがfalseであること
      expect(result).toBeFalsy()
    })

    test('Failed to Delete CSVFile.(error)', async () => {
      // 準備
      request.user = {
        email: 'dummy@testdummy.com',
        tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089'
      }
      const filename = request.user.tenantId + '_' + request.user.email + '_' + '20210611102239848' + '.csv'
      const filePath = '///'

      // 試験実施(returnがtrueであること)
      const result = csvupload.cbRemoveCsv(filePath, filename)

      // returnがfalseであること
      expect(result).toBeFalsy()
    })
  })

  // getTimeStampの確認
  describe('getTimeStamp', () => {
    test('正常', async () => {
      // 試験実施
      const timeStamp = csvupload.getTimeStamp()
      // returnがnullでないこと
      expect(timeStamp).not.toBe(null)
    })
  })
})
