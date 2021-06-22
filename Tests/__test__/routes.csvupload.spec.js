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

  // 正常系データ定義
  // email,userId正常値
  const user = {
    email: 'dummy@testdummy.com',
    userId: '12345678-cb0b-48ad-857d-4b42a44ede13'
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
  const fileData = Buffer.from(decodeURIComponent(`発行日,請求書番号,テナントID,支払期日,納品日,備考,銀行名,支店名,科目,口座番号,口座名義,その他特異事項,明細-項目ID,明細-内容,明細-数量,明細-単位,明細-単価,明細-税,明細-備考
    2021-06-14,UT_TEST_INVOICE_1_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-17,test111,testsiten,testbank,General,11111,kang_test,特記事項テストです。,001,PC,100,EA,100000,10,アップロードテスト`), 'utf8').toString('base64')

  // 請求書が２つ以上、請求書番号が一致していない
  const fileData2 = Buffer.from(decodeURIComponent(`発行日,請求書番号,テナントID,支払期日,納品日,備考,銀行名,支店名,科目,口座番号,口座名義,その他特異事項,明細-項目ID,明細-内容,明細-数量,明細-単位,明細-単価,明細-税,明細-備考
    2021-06-14,UT_TEST_INVOICE_2_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-17,test111,testsiten,testbank,General,11111,kang_test,特記事項テストです。,001,PC,100,EA,100000,10,アップロードテスト
    2021-06-14,UT_TEST_INVOICE_2_2,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-17,test111,testsiten,testbank,General,11111,kang_test,特記事項テストです。,002,ノートパソコン,100,EA,100000,10,アップロードテスト
    2021-06-15,UT_TEST_INVOICE_2_3,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test112,testsiten,testbank,General,11111,kim_test,特記事項テストです。,003,周辺機器,100,EA,100000,10,アップロードテスト
    2021-06-15,UT_TEST_INVOICE_2_4,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-19,test113,testsiten,testbank,General,11111,kim_test,特記事項テストです。,004,プリント用紙,100,EA,100000,10,アップロードテスト`), 'utf8').toString('base64')

  // 請求書が２つ以上、請求書番号が一致していて、順番になっている
  const fileData3 = Buffer.from(decodeURIComponent(`発行日,請求書番号,テナントID,支払期日,納品日,備考,銀行名,支店名,科目,口座番号,口座名義,その他特異事項,明細-項目ID,明細-内容,明細-数量,明細-単位,明細-単価,明細-税,明細-備考
    2021-06-15,UT_TEST_INVOICE_3_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test112,testsiten,testbank,General,11111,kim_test,特記事項テストです。,001,PC,100,EA,100000,10,アップロードテスト
    2021-06-15,UT_TEST_INVOICE_3_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-19,test113,testsiten,testbank,General,11111,kim_test,特記事項テストです。,002,ノートパソコン,100,EA,100000,10,アップロードテスト
    2021-06-14,UT_TEST_INVOICE_3_2,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-17,test111,testsiten,testbank,General,11111,kang_test,特記事項テストです。,001,ST001S,100,EA,100000,10,アップロードテスト
    2021-06-14,UT_TEST_INVOICE_3_2,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-17,test111,testsiten,testbank,General,11111,kang_test,特記事項テストです。,002,ST001M,100,EA,100000,10,アップロードテスト`), 'utf8').toString('base64')

  // 請求書が２つ以上、請求書番号が順番になっていること、請求書番号が割り込んでいる
  const fileData4 = Buffer.from(decodeURIComponent(`発行日,請求書番号,テナントID,支払期日,納品日,備考,銀行名,支店名,科目,口座番号,口座名義,その他特異事項,明細-項目ID,明細-内容,明細-数量,明細-単位,明細-単価,明細-税,明細-備考
    2021-06-15,UT_TEST_INVOICE_3_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-18,test112,testsiten,testbank,General,11111,kim_test,特記事項テストです。,001,PC,100,EA,100000,10,アップロードテスト
    2021-06-15,UT_TEST_INVOICE_3_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-19,test113,testsiten,testbank,General,11111,kim_test,特記事項テストです。,002,ノートパソコン,100,EA,100000,10,アップロードテスト
    2021-06-14,UT_TEST_INVOICE_3_2,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-17,test111,testsiten,testbank,General,11111,kang_test,特記事項テストです。,001,ST001S,100,EA,100000,10,アップロードテスト
    2021-06-14,UT_TEST_INVOICE_3_2,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-17,test111,testsiten,testbank,General,11111,kang_test,特記事項テストです。,002,ST002M,100,EA,100000,10,アップロードテスト
    2021-06-14,UT_TEST_INVOICE_3_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-17,test111,testsiten,testbank,General,11111,kang_test,特記事項テストです。,003,マウス,100,EA,100000,10,アップロードテスト
    2021-06-14,UT_TEST_INVOICE_3_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-17,test111,testsiten,testbank,General,11111,kang_test,特記事項テストです。,004,キーボード,100,EA,100000,10,アップロードテスト`), 'utf8').toString('base64')

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
  // cbUploadCsvエラー場合（ファイル名（email））
  const useremailerr = {
    email: '/',
    userId: '12345678-cb0b-48ad-857d-4b42a44ede13'
  }

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
      request.user = user
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
      // ファイルデータを設定
      request.body = {
        fileData
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

      // ファイルデータを設定
      request.body = {
        fileData2
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

      // ファイルデータを設定
      request.body = {
        fileData3
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

      // ファイルデータを設定
      request.body = {
        fileData4
      }

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
        fileData
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
