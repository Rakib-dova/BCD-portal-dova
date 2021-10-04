/* eslint-disable new-cap */
'use strict'

jest.mock('../../Application/node_modules/express', () => {
  return require('jest-express')
})

const uploadFormat = require('../../Application/routes/uploadFormat')
const csvBasicFormat = require('../../Application/routes/csvBasicFormat')
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
const SUCCESSMESSAGE = constantsDefine.invoiceErrMsg.SUCCESS
const SKIPMESSAGE = constantsDefine.invoiceErrMsg.SKIP

if (process.env.LOCALLY_HOSTED === 'true') {
  // NODE_ENVはJestがデフォルトでtestに指定する。dotenvで上書きできなかったため、package.jsonの実行引数でdevelopmentを指定
  require('dotenv').config({ path: './config/.envUploadFormat' })
}
let request, response
let infoSpy, findOneSpy, findOneSypTenant, findOneSpyContracts
describe('csvBasicFormatのテスト', () => {
  beforeEach(() => {
    request = new Request()
    response = new Response()
    infoSpy = jest.spyOn(logger, 'info')
    findOneSpy = jest.spyOn(userController, 'findOne')
    findOneSypTenant = jest.spyOn(tenantController, 'findOne')
    findOneSpyContracts = jest.spyOn(contractController, 'findOne')
  })
  afterEach(() => {
    request.resetMocked()
    response.resetMocked()
    next.mockReset()
    infoSpy.mockRestore()
    findOneSpy.mockRestore()
    findOneSypTenant.mockRestore()
    findOneSpyContracts.mockRestore()
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

  const userInfoData = {
    dataValues: {
      userId: '12345678-cb0b-48ad-857d-4b42a44ede13',
      tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089',
      userRole: 'a6a3edcd-00d9-427c-bf03-4ef0112ba16d',
      appVersion: '0.0.1',
      refreshToken: 'dummyRefreshToken',
      subRefreshToken: null,
      userStatus: 0,
      lastRefreshedAt: null,
      createdAt: '2021-01-25T08:45:49.803Z',
      updatedAt: '2021-01-25T08:45:49.803Z'
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

  const csvTax = [
    { name: '消費税', id: 'keyConsumptionTax' },
    { name: '軽減税率', id: 'keyReducedTax' },
    { name: '不課税', id: 'keyFreeTax' },
    { name: '免税', id: 'keyDutyFree' },
    { name: '非課税', id: 'keyExemptTax' }
  ]

  const csvUnit = [
    { name: '人月', id: 'keyManMonth' },
    { name: 'ボトル', id: 'keyBottle' },
    { name: 'コスト', id: 'keyCost' },
    { name: 'コンテナ', id: 'keyContainer' },
    { name: 'センチリットル', id: 'keyCentilitre' },
    { name: '平方センチメートル', id: 'keySquareCentimeter' },
    { name: '立方センチメートル', id: 'keyCubicCentimeter' },
    { name: 'センチメートル', id: 'keyCentimeter' },
    { name: 'ケース', id: 'keyCase' },
    { name: 'カートン', id: 'keyCarton' },
    { name: '日', id: 'keyDay' },
    { name: 'デシリットル', id: 'keyDeciliter' },
    { name: 'デシメートル', id: 'keyDecimeter' },
    { name: 'グロス・キログラム', id: 'keyGrossKilogram' },
    { name: '個', id: 'keyPieces' },
    { name: 'フィート', id: 'keyFeet' },
    { name: 'ガロン', id: 'keyGallon' },
    { name: 'グラム', id: 'keyGram' },
    { name: '総トン', id: 'keyGrossTonnage' },
    { name: '時間', id: 'keyHour' },
    { name: 'キログラム', id: 'keyKilogram' },
    { name: 'キロメートル', id: 'keyKilometers' },
    { name: 'キロワット時', id: 'keyKilowattHour' },
    { name: 'ポンド', id: 'keyPound' },
    { name: 'リットル', id: 'keyLiter' },
    { name: 'ミリグラム', id: 'keyMilligram' },
    { name: 'ミリリットル', id: 'keyMilliliter' },
    { name: 'ミリメートル', id: 'keyMillimeter' },
    { name: '月', id: 'keyMonth' },
    { name: '平方メートル', id: 'keySquareMeter' },
    { name: '立方メートル', id: 'keyCubicMeter' },
    { name: 'メーター', id: 'keyMeter' },
    { name: '純トン', id: 'keyNetTonnage' },
    { name: '包', id: 'keyPackage' },
    { name: '巻', id: 'keyRoll' },
    { name: '式', id: 'keyFormula' },
    { name: 'トン', id: 'keyTonnage' },
    { name: 'その他', id: 'keyOthers' }
  ]

  const contractInfoData = {
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

  // ファイルパス設定
  const filePath = process.env.INVOICE_UPLOAD_PATH
  // ファイル名設定
  const fileName = 'uploadFormatTest.csv'
  // ファイルデータ
  // 請求書が1つの場合
  const fileData = Buffer.from(
    `発行日,請求書番号,テナントID,支払期日,納品日,備考,銀行名,支店名,科目,口座番号,口座名義,その他特記事項,明細-項目ID,明細-内容,明細-数量,明細-単位,明細-単価,明細-税（消費税／軽減税率／不課税／免税／非課税）,明細-備考
2021-06-14,UT_TEST_INVOICE_1_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-17,test111,testsiten,testbank,普通,1111111,kang_test,特記事項テストです。,001,PC,100,個,100000,消費税,アップロードテスト`
  ).toString('base64')

  // テナントIDがUUID形式出ない
  const tenantIdTypeErr = Buffer.from(
    `発行日,請求書番号,テナントID,支払期日,納品日,備考,銀行名,支店名,科目,口座番号,口座名義,その他特記事項,明細-項目ID,明細-内容,明細-数量,明細-単位,明細-単価,明細-税（消費税／軽減税率／不課税／免税／非課税）,明細-備考
2021-06-14,UT_TEST_INVOICE_1_1,3c,2021-03-31,2021-03-17,test111,testsiten,testbank,普通,1111111,kang_test,特記事項テストです。,001,PC,100,個,100000,消費税,アップロードテスト`
  ).toString('base64')

  const reqBodyForCbPostIndex = {
    uploadFormatItemName: 'testItemName',
    uploadType: '',
    hiddenFileData: Buffer.from(decodeURIComponent(fileData), 'base64').toString('utf8'),
    dataFileName: 'uploadFormatTest.csv',
    dataFile: 'uploadFormatTest.csv',
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

  const taxIds = {
    keyConsumptionTax: '3',
    keyDutyFree: '6',
    keyExemptTax: '7',
    keyFreeTax: '5',
    keyReducedTax: '4'
  }
  const unitIds = {
    keyBottle: '9',
    keyCarton: '17',
    keyCase: '16',
    keyCentilitre: '12',
    keyCentimeter: '15',
    keyContainer: '11',
    keyCost: '10',
    keyCubicCentimeter: '14',
    keyCubicMeter: '38',
    keyDay: '18',
    keyDeciliter: '19',
    keyDecimeter: '20',
    keyFeet: '23',
    keyFormula: '43',
    keyGallon: '24',
    keyGram: '25',
    keyGrossKilogram: '21',
    keyGrossTonnage: '26',
    keyHour: '27',
    keyKilogram: '28',
    keyKilometers: '29',
    keyKilowattHour: '30',
    keyLiter: '32',
    keyManMonth: '8',
    keyMeter: '39',
    keyMilligram: '33',
    keyMilliliter: '34',
    keyMillimeter: '35',
    keyMonth: '36',
    keyNetTonnage: '40',
    keyOthers: '45',
    keyPackage: '41',
    keyPieces: '22',
    keyPound: '31',
    keyRoll: '42',
    keySquareCentimeter: '13',
    keySquareMeter: '37',
    keyTonnage: '44'
  }
  
  const uploadGeneral = {
    uploadFormatItemName: 'testItemName',
    uploadType: '',
  }

  const taxIdsaaaaaa = {
    keyConsumptionTax: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    keyDutyFree: '6',
    keyExemptTax: '7',
    keyFreeTax: '5',
    keyReducedTax: '4'    
  }

  const unitIdsaaaaaa =  {
    keyBottle: '9',
    keyCarton: '17',
    keyCase: '16',
    keyCentilitre: '12',
    keyCentimeter: '15',
    keyContainer: '11',
    keyCost: '10',
    keyCubicCentimeter: '14',
    keyCubicMeter: '38',
    keyDay: '18',
    keyDeciliter: '19',
    keyDecimeter: '20',
    keyFeet: '23',
    keyFormula: '43',
    keyGallon: '24',
    keyGram: '25',
    keyGrossKilogram: '21',
    keyGrossTonnage: '26',
    keyHour: '27',
    keyKilogram: '28',
    keyKilometers: '29',
    keyKilowattHour: '30',
    keyLiter: '32',
    keyManMonth: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    keyMeter: '39',
    keyMilligram: '33',
    keyMilliliter: '34',
    keyMillimeter: '35',
    keyMonth: '36',
    keyNetTonnage: '40',
    keyOthers: '45',
    keyPackage: '41',
    keyPieces: '22',
    keyPound: '31',
    keyRoll: '42',
    keySquareCentimeter: '13',
    keySquareMeter: '37',
    keyTonnage: '44'
  }
  
  describe('ルーティング', () => {
    test('uploadFormatのルーティングを確認', async () => {
      expect(uploadFormat.router.post).toBeCalledWith('/', uploadFormat.cbPostIndex)
    })
  })

  // -----------------------------------------------------------------------------------------
  // cbPostIndexの確認

  describe('cbPostIndex', () => {
    test('正常', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = {
        userContext: 'LoggedIn',
        userRole: 'dummy'
      }
      request.user = user
      // ファイルデータを設定
      request.body = {
        ...reqBodyForCbPostIndex
      }

      // DBからの正常なユーザデータの取得を想定する
      findOneSpy.mockReturnValue(dataValues)
      // DBからの正常な契約情報取得を想定する
      findOneSpyContracts.mockReturnValue(contractdataValues)

      // テスト用csvファイルアップロード
      await csvBasicFormat.fileUpload(
        '/home/upload',
        'uploadFormatTest.csv',
        Buffer.from(decodeURIComponent(fileData), 'base64').toString('utf8')
      )
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
        csvfilename: '12345678-cb0b-48ad-857d-4b42a44ede13_uploadFormatTest.csv',
        headerItems: [
          { item: '発行日', value: '2021-06-14' },
          { item: '請求書番号', value: 'UT_TEST_INVOICE_1_1' },
          { item: 'テナントID', value: '3cfebb4f-2338-4dc7-9523-5423a027a880' },
          { item: '支払期日', value: '2021-03-31' },
          { item: '納品日', value: '2021-03-17' },
          { item: '備考', value: 'test111' },
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
        ],
        selectedFormatData: ['', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
        taxIds: taxIds,
        unitIds: unitIds,
        uploadGeneral: uploadGeneral

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
      console.log(request.user)

      // ファイルデータを設定
      request.body = {
        ...reqBodyForCbPostIndex
      }

      // DBからの正常なユーザデータの取得を想定する
      findOneSpy.mockReturnValue(dataValues)
      // DBからの正常な契約情報取得を想定する
      findOneSpyContracts.mockReturnValue(contractInfoDatatoBeReceiptCancel)

      // テスト用csvファイルアップロード
      await csvBasicFormat.fileUpload(
        '/home/upload',
        'uploadFormatTest.csv',
        Buffer.from(decodeURIComponent(fileData), 'base64').toString('utf8')
      )
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
        ...reqBodyForCbPostIndex,
        checkItemNameLine: 'on',
        uploadFormatNumber: ''
      }

      request.Referer = '/csvBasicFormat'

      // DBからの正常なユーザデータの取得を想定する
      findOneSpy.mockReturnValue(dataValues)
      // DBからの正常な契約情報取得を想定する
      findOneSpyContracts.mockReturnValue(contractdataValues)

      // テスト用csvファイルアップロード
      await csvBasicFormat.fileUpload(
        '/home/upload',
        'uploadFormatTest.csv',
        Buffer.from(decodeURIComponent(fileData), 'base64').toString('utf8')
      )
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
        ...reqBodyForCbPostIndex,
        checkItemNameLine: 'on',
        uploadFormatNumber: '0'
      }

      request.Referer = '/csvBasicFormat'

      // DBからの正常なユーザデータの取得を想定する
      findOneSpy.mockReturnValue(dataValues)
      // DBからの正常な契約情報取得を想定する
      findOneSpyContracts.mockReturnValue(contractdataValues)

      // テスト用csvファイルアップロード
      await csvBasicFormat.fileUpload(
        '/home/upload',
        'uploadFormatTest.csv',
        Buffer.from(decodeURIComponent(fileData), 'base64').toString('utf8')
      )
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

    test('準正常：ヘッダありでヘッダの数字>データ開始番号', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = {
        userContext: 'LoggedIn',
        userRole: 'dummy'
      }
      request.user = user

      // ファイルデータを設定
      request.body = {
        ...reqBodyForCbPostIndex,
        checkItemNameLine: 'on',
        uploadFormatNumber: '2',
        defaultNumber: '1'
      }

      request.Referer = '/csvBasicFormat'

      // DBからの正常なユーザデータの取得を想定する
      findOneSpy.mockReturnValue(dataValues)
      // DBからの正常な契約情報取得を想定する
      findOneSpyContracts.mockReturnValue(contractdataValues)

      // テスト用csvファイルアップロード
      await csvBasicFormat.fileUpload(
        '/home/upload',
        'uploadFormatTest.csv',
        Buffer.from(decodeURIComponent(fileData), 'base64').toString('utf8')
      )
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
        ...reqBodyForCbPostIndex,
        checkItemNameLine: 'off',
        defaultNumber: '0'
      }

      request.Referer = '/csvBasicFormat'

      // DBからの正常なユーザデータの取得を想定する
      findOneSpy.mockReturnValue(dataValues)
      // DBからの正常な契約情報取得を想定する
      findOneSpyContracts.mockReturnValue(contractdataValues)

      // テスト用csvファイルアップロード
      await csvBasicFormat.fileUpload(
        '/home/upload',
        'uploadFormatTest.csv',
        Buffer.from(decodeURIComponent(fileData), 'base64').toString('utf8')
      )
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
        ...reqBodyForCbPostIndex,
        checkItemNameLine: 'off',
        defaultNumber: '3'
      }

      request.Referer = '/csvBasicFormat'

      // DBからの正常なユーザデータの取得を想定する
      findOneSpy.mockReturnValue(dataValues)
      // DBからの正常な契約情報取得を想定する
      findOneSpyContracts.mockReturnValue(contractdataValues)

      // テスト用csvファイルアップロード
      await csvBasicFormat.fileUpload(
        '/home/upload',
        'uploadFormatTest.csv',
        Buffer.from(decodeURIComponent(fileData), 'base64').toString('utf8')
      )
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
      // uploadFormat.jsが遷移を拒否して、前URLに戻る
      expect(response.headers.Location).toBe('/')
      expect(response.statusCode).toBe(307)
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
        ...reqBodyForCbPostIndex,
        keyConsumptionTax: '3',
        keyReducedTax: '3',
        keyFreeTax: '5',
        keyDutyFree: '6',
        keyExemptTax: '7'
      }

      request.Referer = '/csvBasicFormat'

      // DBからの正常なユーザデータの取得を想定する
      findOneSpy.mockReturnValue(dataValues)
      // DBからの正常な契約情報取得を想定する
      findOneSpyContracts.mockReturnValue(contractdataValues)

      // テスト用csvファイルアップロード
      await csvBasicFormat.fileUpload(
        '/home/upload',
        'uploadFormatTest.csv',
        Buffer.from(decodeURIComponent(fileData), 'base64').toString('utf8')
      )
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
        ...reqBodyForCbPostIndex,
        keyConsumptionTax: '3',
        keyReducedTax: '4',
        keyFreeTax: '3',
        keyDutyFree: '6',
        keyExemptTax: '7'
      }

      request.Referer = '/csvBasicFormat'

      // DBからの正常なユーザデータの取得を想定する
      findOneSpy.mockReturnValue(dataValues)
      // DBからの正常な契約情報取得を想定する
      findOneSpyContracts.mockReturnValue(contractdataValues)

      // テスト用csvファイルアップロード
      await csvBasicFormat.fileUpload(
        '/home/upload',
        'uploadFormatTest.csv',
        Buffer.from(decodeURIComponent(fileData), 'base64').toString('utf8')
      )
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
        ...reqBodyForCbPostIndex,
        keyConsumptionTax: '3',
        keyReducedTax: '4',
        keyFreeTax: '5',
        keyDutyFree: '3',
        keyExemptTax: '7'
      }

      request.Referer = '/csvBasicFormat'

      // DBからの正常なユーザデータの取得を想定する
      findOneSpy.mockReturnValue(dataValues)
      // DBからの正常な契約情報取得を想定する
      findOneSpyContracts.mockReturnValue(contractdataValues)

      // テスト用csvファイルアップロード
      await csvBasicFormat.fileUpload(
        '/home/upload',
        'uploadFormatTest.csv',
        Buffer.from(decodeURIComponent(fileData), 'base64').toString('utf8')
      )
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
        ...reqBodyForCbPostIndex,
        keyConsumptionTax: '3',
        keyReducedTax: '4',
        keyFreeTax: '5',
        keyDutyFree: '6',
        keyExemptTax: '3'
      }

      request.Referer = '/csvBasicFormat'

      // DBからの正常なユーザデータの取得を想定する
      findOneSpy.mockReturnValue(dataValues)
      // DBからの正常な契約情報取得を想定する
      findOneSpyContracts.mockReturnValue(contractdataValues)

      // テスト用csvファイルアップロード
      await csvBasicFormat.fileUpload(
        '/home/upload',
        'uploadFormatTest.csv',
        Buffer.from(decodeURIComponent(fileData), 'base64').toString('utf8')
      )
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
        ...reqBodyForCbPostIndex,
        keyConsumptionTax: '3',
        keyReducedTax: '4',
        keyFreeTax: '4',
        keyDutyFree: '6',
        keyExemptTax: '7'
      }

      request.Referer = '/csvBasicFormat'

      // DBからの正常なユーザデータの取得を想定する
      findOneSpy.mockReturnValue(dataValues)
      // DBからの正常な契約情報取得を想定する
      findOneSpyContracts.mockReturnValue(contractdataValues)

      // テスト用csvファイルアップロード
      await csvBasicFormat.fileUpload(
        '/home/upload',
        'uploadFormatTest.csv',
        Buffer.from(decodeURIComponent(fileData), 'base64').toString('utf8')
      )
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
        ...reqBodyForCbPostIndex,
        keyConsumptionTax: '3',
        keyReducedTax: '4',
        keyFreeTax: '5',
        keyDutyFree: '4',
        keyExemptTax: '7'
      }

      request.Referer = '/csvBasicFormat'

      // DBからの正常なユーザデータの取得を想定する
      findOneSpy.mockReturnValue(dataValues)
      // DBからの正常な契約情報取得を想定する
      findOneSpyContracts.mockReturnValue(contractdataValues)

      // テスト用csvファイルアップロード
      await csvBasicFormat.fileUpload(
        '/home/upload',
        'uploadFormatTest.csv',
        Buffer.from(decodeURIComponent(fileData), 'base64').toString('utf8')
      )
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
        ...reqBodyForCbPostIndex,
        keyConsumptionTax: '3',
        keyReducedTax: '4',
        keyFreeTax: '5',
        keyDutyFree: '6',
        keyExemptTax: '4'
      }

      request.Referer = '/csvBasicFormat'

      // DBからの正常なユーザデータの取得を想定する
      findOneSpy.mockReturnValue(dataValues)
      // DBからの正常な契約情報取得を想定する
      findOneSpyContracts.mockReturnValue(contractdataValues)

      // テスト用csvファイルアップロード
      await csvBasicFormat.fileUpload(
        '/home/upload',
        'uploadFormatTest.csv',
        Buffer.from(decodeURIComponent(fileData), 'base64').toString('utf8')
      )
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
        ...reqBodyForCbPostIndex,
        keyConsumptionTax: '3',
        keyReducedTax: '4',
        keyFreeTax: '5',
        keyDutyFree: '5',
        keyExemptTax: '7'
      }

      request.Referer = '/csvBasicFormat'

      // DBからの正常なユーザデータの取得を想定する
      findOneSpy.mockReturnValue(dataValues)
      // DBからの正常な契約情報取得を想定する
      findOneSpyContracts.mockReturnValue(contractdataValues)

      // テスト用csvファイルアップロード
      await csvBasicFormat.fileUpload(
        '/home/upload',
        'uploadFormatTest.csv',
        Buffer.from(decodeURIComponent(fileData), 'base64').toString('utf8')
      )
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
        ...reqBodyForCbPostIndex,
        keyConsumptionTax: '3',
        keyReducedTax: '4',
        keyFreeTax: '5',
        keyDutyFree: '6',
        keyExemptTax: '5'
      }

      request.Referer = '/csvBasicFormat'

      // DBからの正常なユーザデータの取得を想定する
      findOneSpy.mockReturnValue(dataValues)
      // DBからの正常な契約情報取得を想定する
      findOneSpyContracts.mockReturnValue(contractdataValues)

      // テスト用csvファイルアップロード
      await csvBasicFormat.fileUpload(
        '/home/upload',
        'uploadFormatTest.csv',
        Buffer.from(decodeURIComponent(fileData), 'base64').toString('utf8')
      )
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
        ...reqBodyForCbPostIndex,
        keyConsumptionTax: '3',
        keyReducedTax: '4',
        keyFreeTax: '5',
        keyDutyFree: '6',
        keyExemptTax: '6'
      }

      request.Referer = '/csvBasicFormat'

      // DBからの正常なユーザデータの取得を想定する
      findOneSpy.mockReturnValue(dataValues)
      // DBからの正常な契約情報取得を想定する
      findOneSpyContracts.mockReturnValue(contractdataValues)

      // テスト用csvファイルアップロード
      await csvBasicFormat.fileUpload(
        '/home/upload',
        'uploadFormatTest.csv',
        Buffer.from(decodeURIComponent(fileData), 'base64').toString('utf8')
      )
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
        ...reqBodyForCbPostIndex,
        keyConsumptionTax:
          'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
      }

      request.Referer = '/csvBasicFormat'

      // DBからの正常なユーザデータの取得を想定する
      findOneSpy.mockReturnValue(dataValues)
      // DBからの正常な契約情報取得を想定する
      findOneSpyContracts.mockReturnValue(contractdataValues)

      // テスト用csvファイルアップロード
      await csvBasicFormat.fileUpload(
        '/home/upload',
        'uploadFormatTest.csv',
        Buffer.from(decodeURIComponent(fileData), 'base64').toString('utf8')
      )
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
        csvfilename: '12345678-cb0b-48ad-857d-4b42a44ede13_uploadFormatTest.csv',
        headerItems: [
          { item: '発行日', value: '2021-06-14' },
          { item: '請求書番号', value: 'UT_TEST_INVOICE_1_1' },
          { item: 'テナントID', value: '3cfebb4f-2338-4dc7-9523-5423a027a880' },
          { item: '支払期日', value: '2021-03-31' },
          { item: '納品日', value: '2021-03-17' },
          { item: '備考', value: 'test111' },
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
        ],
        selectedFormatData: ['', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
        taxIds: taxIdsaaaaaa,
        unitIds: unitIds,
        uploadGeneral: uploadGeneral
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
        ...reqBodyForCbPostIndex,
        keyConsumptionTax:
          'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
      }

      request.Referer = '/csvBasicFormat'

      // DBからの正常なユーザデータの取得を想定する
      findOneSpy.mockReturnValue(dataValues)
      // DBからの正常な契約情報取得を想定する
      findOneSpyContracts.mockReturnValue(contractdataValues)

      // テスト用csvファイルアップロード
      await csvBasicFormat.fileUpload(
        '/home/upload',
        'uploadFormatTest.csv',
        Buffer.from(decodeURIComponent(fileData), 'base64').toString('utf8')
      )
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
        ...reqBodyForCbPostIndex,
        keyManMonth: '8',
        keyBottle: '8'
      }

      request.Referer = '/csvBasicFormat'

      // DBからの正常なユーザデータの取得を想定する
      findOneSpy.mockReturnValue(dataValues)
      // DBからの正常な契約情報取得を想定する
      findOneSpyContracts.mockReturnValue(contractdataValues)

      // テスト用csvファイルアップロード
      await csvBasicFormat.fileUpload(
        '/home/upload',
        'uploadFormatTest.csv',
        Buffer.from(decodeURIComponent(fileData), 'base64').toString('utf8')
      )
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
        ...reqBodyForCbPostIndex,
        keyManMonth:
          'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
      }

      request.Referer = '/csvBasicFormat'

      // DBからの正常なユーザデータの取得を想定する
      findOneSpy.mockReturnValue(dataValues)
      // DBからの正常な契約情報取得を想定する
      findOneSpyContracts.mockReturnValue(contractdataValues)

      // テスト用csvファイルアップロード
      await csvBasicFormat.fileUpload(
        '/home/upload',
        'uploadFormatTest.csv',
        Buffer.from(decodeURIComponent(fileData), 'base64').toString('utf8')
      )
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
        csvfilename: '12345678-cb0b-48ad-857d-4b42a44ede13_uploadFormatTest.csv',
        headerItems: [
          { item: '発行日', value: '2021-06-14' },
          { item: '請求書番号', value: 'UT_TEST_INVOICE_1_1' },
          { item: 'テナントID', value: '3cfebb4f-2338-4dc7-9523-5423a027a880' },
          { item: '支払期日', value: '2021-03-31' },
          { item: '納品日', value: '2021-03-17' },
          { item: '備考', value: 'test111' },
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
        ],
        selectedFormatData: ['', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
        taxIds: taxIds,
        unitIds: unitIdsaaaaaa,
        uploadGeneral: uploadGeneral
      })
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
        ...reqBodyForCbPostIndex,
        keyManMonth:
          'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
      }

      request.Referer = '/csvBasicFormat'

      // DBからの正常なユーザデータの取得を想定する
      findOneSpy.mockReturnValue(dataValues)
      // DBからの正常な契約情報取得を想定する
      findOneSpyContracts.mockReturnValue(contractdataValues)

      // テスト用csvファイルアップロード
      await csvBasicFormat.fileUpload(
        '/home/upload',
        'uploadFormatTest.csv',
        Buffer.from(decodeURIComponent(fileData), 'base64').toString('utf8')
      )
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
      // uploadFormat.jsが遷移を拒否して、前URLに戻る
      expect(response.headers.Location).toBe('/')
      expect(response.statusCode).toBe(307)
    })
  })

  
  // // -----------------------------------------------------------------------------------------
  // // cbRemoveCsvの確認

  describe('cbRemoveCsv', () => {
    test('正常', async () => {
      // 準備
      request.user = user

      // テスト用csvファイルアップロード
      await csvBasicFormat.fileUpload(
        '/home/upload',
        'uploadFormatTest.csv',
        Buffer.from(decodeURIComponent(fileData), 'base64').toString('utf8')
      )

      // 試験実施
      const resultRemove = await uploadFormat.cbRemoveCsv('/home/upload', 'uploadFormatTest.csv')

      // 期待結果
      expect(resultRemove).toBeTruthy()
    })
  })
  // -----------------------------------------------------------------------------------------
})
