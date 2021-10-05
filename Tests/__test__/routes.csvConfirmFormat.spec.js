/* eslint-disable new-cap */
'use strict'

jest.mock('../../Application/node_modules/express', () => {
  return require('jest-express')
})

const csvConfirmFormat = require('../../Application/routes/csvConfirmFormat')
const csvBasicFormat = require('../../Application/routes/csvBasicFormat')
const Request = require('jest-express').Request
const Response = require('jest-express').Response
const next = require('jest-express').Next
const helper = require('../../Application/routes/helpers/middleware')
const errorHelper = require('../../Application/routes/helpers/error')
const noticeHelper = require('../../Application/routes/helpers/notice')
const userController = require('../../Application/controllers/userController.js')
const contractController = require('../../Application/controllers/contractController.js')
const tenantController = require('../../Application/controllers/tenantController')
const logger = require('../../Application/lib/logger.js')

if (process.env.LOCALLY_HOSTED === 'true') {
  // NODE_ENVはJestがデフォルトでtestに指定する。dotenvで上書きできなかったため、package.jsonの実行引数でdevelopmentを指定
  require('dotenv').config({ path: './config/.envUploadFormat' })
}
let request, response
let infoSpy, findOneSpy, findOneSypTenant, findOneSpyContracts
describe('csvConfirmFormatのテスト', () => {
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

  // ファイルデータ
  // 請求書が1つの場合
  const fileData = Buffer.from(
    `発行日,請求書番号,テナントID,支払期日,納品日,備考,銀行名,支店名,科目,口座番号,口座名義,その他特記事項,明細-項目ID,明細-内容,明細-数量,明細-単位,明細-単価,明細-税（消費税／軽減税率／不課税／免税／非課税）,明細-備考
2021-06-14,UT_TEST_INVOICE_1_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-17,test111,testsiten,testbank,普通,1111111,kang_test,特記事項テストです。,001,PC,100,個,100000,消費税,アップロードテスト`
  ).toString('base64')

  const headerItems =
    '[{"item":"発行日","value":"2021/09/27"},{"item":"請求書番号","value":"PB147500101"},{"item":"テナントID","value":"9bd4923d-1b65-43b9-9b8d-34dbd1c9ac40"},{"item":"支払期日","value":"2022/10/10"},{"item":"納品日","value":"2021/10/10"},{"item":"備考","value":"PBI1475_手動試験"},{"item":"銀行名","value":"手動銀行"},{"item":"支店名","value":"手動支店"},{"item":"科目","value":"普通"},{"item":"口座番号","value":"1234567"},{"item":"口座名義","value":"手動"},{"item":"その他特記事項","value":"請求書一括作成_1.csv"},{"item":"明細-項目ID","value":"1"},{"item":"明細-内容","value":"明細１"},{"item":"明細-数量","value":"1"},{"item":"明細-単位","value":"個"},{"item":"明細-単価","value":"100000"},{"item":"明細-税（消費税／軽減税率／不課税／免税／非課税）","value":"消費税"},{"item":"明細-備考","value":"手動試験データ"},{"item":"備考1","value":"1"},{"item":"備考2","value":"2"},{"item":"備考3","value":"3"}]'
  const taxIds = '{"keyConsumptionTax":"a","keyReducedTax":"","keyFreeTax":"","keyDutyFree":"","keyExemptTax":""}'
  const unitIds =
    '{"keyManMonth":"b","keyBottle":"","keyCost":"","keyContainer":"","keyCentilitre":"","keySquareCentimeter":"","keyCubicCentimeter":"","keyCentimeter":"","keyCase":"","keyCarton":"","keyDay":"","keyDeciliter":"","keyDecimeter":"","keyGrossKilogram":"","keyPieces":"","keyFeet":"","keyGallon":"","keyGram":"","keyGrossTonnage":"","keyHour":"","keyKilogram":"","keyKilometers":"","keyKilowattHour":"","keyPound":"","keyLiter":"","keyMilligram":"","keyMilliliter":"","keyMillimeter":"","keyMonth":"","keySquareMeter":"","keyCubicMeter":"","keyMeter":"","keyNetTonnage":"","keyPackage":"","keyRoll":"","keyFormula":"","keyTonnage":"","keyOthers":""}'

  const uploadGeneral = '{"uploadFormatItemName":"1","uploadType":"請求書データ"}'

  const formatData = ['0', '1', '2', '', '', '', '', '', '', '', '', '', '12', '13', '14', '15', '16', '17', '']

  const testfilename = 'testfilename'
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
    keyOthers: '45',
    headerItems: headerItems,
    taxIds: taxIds,
    unitIds: unitIds,
    uploadGeneral: uploadGeneral,
    formatData: formatData,
    csvfilename: testfilename
  }
  const columnArr = [
    { columnName: '発行日', item: '発行日', value: '2021/09/27' },
    { columnName: '請求書番号', item: '請求書番号', value: 'PB147500101' },
    {
      columnName: 'テナントID',
      item: 'テナントID',
      value: '9bd4923d-1b65-43b9-9b8d-34dbd1c9ac40'
    },
    { columnName: '支払期日', item: '', value: '' },
    { columnName: '納品日', item: '', value: '' },
    { columnName: '備考', item: '', value: '' },
    { columnName: '銀行名', item: '', value: '' },
    { columnName: '支店名', item: '', value: '' },
    { columnName: '科目', item: '', value: '' },
    { columnName: '口座番号', item: '', value: '' },
    { columnName: '口座名義', item: '', value: '' },
    { columnName: 'その他特記事項', item: '', value: '' },
    { columnName: '明細-項目ID', item: '明細-項目ID', value: '1' },
    { columnName: '明細-内容', item: '明細-内容', value: '明細１' },
    { columnName: '明細-数量', item: '明細-数量', value: '1' },
    { columnName: '明細-単位', item: '明細-単位', value: '個' },
    { columnName: '明細-単価', item: '明細-単価', value: '100000' },
    {
      columnName: '明細-税（消費税／軽減税率／不課税／免税／非課税）',
      item: '明細-税（消費税／軽減税率／不課税／免税／非課税）',
      value: '消費税'
    },
    { columnName: '明細-備考', item: '', value: '' }
  ]

  const csvTaxresult = [
    { name: '消費税', id: 'a' },
    { name: '軽減税率', id: '' },
    { name: '不課税', id: '' },
    { name: '免税', id: '' },
    { name: '非課税', id: '' }
  ]

  const csvUnitresult = [
    { name: '人月', id: 'b' },
    { name: 'ボトル', id: '' },
    { name: 'コスト', id: '' },
    { name: 'コンテナ', id: '' },
    { name: 'センチリットル', id: '' },
    { name: '平方センチメートル', id: '' },
    { name: '立方センチメートル', id: '' },
    { name: 'センチメートル', id: '' },
    { name: 'ケース', id: '' },
    { name: 'カートン', id: '' },
    { name: '日', id: '' },
    { name: 'デシリットル', id: '' },
    { name: 'デシメートル', id: '' },
    { name: 'グロス・キログラム', id: '' },
    { name: '個', id: '' },
    { name: 'フィート', id: '' },
    { name: 'ガロン', id: '' },
    { name: 'グラム', id: '' },
    { name: '総トン', id: '' },
    { name: '時間', id: '' },
    { name: 'キログラム', id: '' },
    { name: 'キロメートル', id: '' },
    { name: 'キロワット時', id: '' },
    { name: 'ポンド', id: '' },
    { name: 'リットル', id: '' },
    { name: 'ミリグラム', id: '' },
    { name: 'ミリリットル', id: '' },
    { name: 'ミリメートル', id: '' },
    { name: '月', id: '' },
    { name: '平方メートル', id: '' },
    { name: '立方メートル', id: '' },
    { name: 'メーター', id: '' },
    { name: '純トン', id: '' },
    { name: '包', id: '' },
    { name: '巻', id: '' },
    { name: '式', id: '' },
    { name: 'トン', id: '' },
    { name: 'その他', id: '' }
  ]

  const headerItemsBackResult = [
    {
      item: '発行日',
      value: '2021/09/27'
    },
    {
      item: '請求書番号',
      value: 'PB147500101'
    },
    {
      item: 'テナントID',
      value: '9bd4923d-1b65-43b9-9b8d-34dbd1c9ac40'
    },
    {
      item: '支払期日',
      value: '2022/10/10'
    },
    {
      item: '納品日',
      value: '2021/10/10'
    },
    {
      item: '備考',
      value: 'PBI1475_手動試験'
    },
    {
      item: '銀行名',
      value: '手動銀行'
    },
    {
      item: '支店名',
      value: '手動支店'
    },
    {
      item: '科目',
      value: '普通'
    },
    {
      item: '口座番号',
      value: '1234567'
    },
    {
      item: '口座名義',
      value: '手動'
    },
    {
      item: 'その他特記事項',
      value: '請求書一括作成_1.csv'
    },
    {
      item: '明細-項目ID',
      value: '1'
    },
    {
      item: '明細-内容',
      value: '明細１'
    },
    {
      item: '明細-数量',
      value: '1'
    },
    {
      item: '明細-単位',
      value: '個'
    },
    {
      item: '明細-単価',
      value: '100000'
    },
    {
      item: '明細-税（消費税／軽減税率／不課税／免税／非課税）',
      value: '消費税'
    },
    {
      item: '明細-備考',
      value: '手動試験データ'
    },
    {
      item: '備考1',
      value: '1'
    },
    {
      item: '備考2',
      value: '2'
    },
    {
      item: '備考3',
      value: '3'
    }
  ]
  const taxIdsBackResult = {
    keyConsumptionTax: 'a',
    keyReducedTax: '',
    keyFreeTax: '',
    keyDutyFree: '',
    keyExemptTax: ''
  }
  const unitIdsBackResult = {
    keyManMonth: 'b',
    keyBottle: '',
    keyCost: '',
    keyContainer: '',
    keyCentilitre: '',
    keySquareCentimeter: '',
    keyCubicCentimeter: '',
    keyCentimeter: '',
    keyCase: '',
    keyCarton: '',
    keyDay: '',
    keyDeciliter: '',
    keyDecimeter: '',
    keyGrossKilogram: '',
    keyPieces: '',
    keyFeet: '',
    keyGallon: '',
    keyGram: '',
    keyGrossTonnage: '',
    keyHour: '',
    keyKilogram: '',
    keyKilometers: '',
    keyKilowattHour: '',
    keyPound: '',
    keyLiter: '',
    keyMilligram: '',
    keyMilliliter: '',
    keyMillimeter: '',
    keyMonth: '',
    keySquareMeter: '',
    keyCubicMeter: '',
    keyMeter: '',
    keyNetTonnage: '',
    keyPackage: '',
    keyRoll: '',
    keyFormula: '',
    keyTonnage: '',
    keyOthers: ''
  }
  const uploadGeneralBackResult = { uploadFormatItemName: '1', uploadType: '請求書データ' }
  describe('ルーティング', () => {
    test('uploadFormatのルーティングを確認', async () => {
      // expect(csvConfirmFormat.router.post).toBeCalledWith('/', csvConfirmFormat.cbPostCsvConfirmFormat)
    })
  })

  // -----------------------------------------------------------------------------------------
  // cbPostIndexの確認

  describe('cbPostCsvConfirmFormat', () => {
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
      await csvConfirmFormat.cbPostCsvConfirmFormat(request, response, next)

      // 期待結果
      // 404，500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      expect(next).not.toHaveBeenCalledWith(error500)
      // userContextがLoggedInになっている
      expect(request.session?.userContext).toBe('LoggedIn')
      // session.userRoleが'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'になっている
      // expect(request.session?.userRole).toBe('a6a3edcd-00d9-427c-bf03-4ef0112ba16d')
      // response.renderでcsvBasicFormatが呼ばれ「る」
      expect(response.render).toHaveBeenCalledWith('csvConfirmFormat', {
        TS_HOST: undefined,
        columnArr: columnArr,
        csvTax: csvTaxresult,
        csvUnit: csvUnitresult,
        selectedFormatData: ['0', '1', '2', '', '', '', '', '', '', '', '', '', '12', '13', '14', '15', '16', '17', ''],
        uploadFormatItemName: '1',
        uploadGeneral: {
          uploadFormatItemName: '1',
          uploadType: '請求書データ'
        },
        uploadType: '請求書データ',
        csvfilename: testfilename
      })
    })

    test('準正常：契約情報未登録の場合', async () => {
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
      // DBからの異常な契約情報取得を想定する
      findOneSpyContracts.mockReturnValue(null)

      // テスト用csvファイルアップロード
      await csvBasicFormat.fileUpload(
        '/home/upload',
        'uploadFormatTest.csv',
        Buffer.from(decodeURIComponent(fileData), 'base64').toString('utf8')
      )
      // 試験実施
      await csvConfirmFormat.cbPostCsvConfirmFormat(request, response, next)

      // 期待結果
      // 404，500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      expect(next).toHaveBeenCalledWith(error500)
    })

    test('準正常：解約申込中', async () => {
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
      findOneSpyContracts.mockReturnValue(contractdataValues2)

      // テスト用csvファイルアップロード
      await csvBasicFormat.fileUpload(
        '/home/upload',
        'uploadFormatTest.csv',
        Buffer.from(decodeURIComponent(fileData), 'base64').toString('utf8')
      )
      // 試験実施
      await csvConfirmFormat.cbPostCsvConfirmFormat(request, response, next)

      // 期待結果
      // 404，500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(500))
      // userContextがLoggedInになっている
      expect(request.session?.userContext).toBe('LoggedIn')
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
      // ファイルデータを設定
      request.body = {
        ...reqBodyForCbPostIndex
      }

      // DBからの正常なユーザデータの取得を想定する
      findOneSpy.mockReturnValue(null)
      // DBからの正常な契約情報取得を想定する
      findOneSpyContracts.mockReturnValue(contractdataValues)

      // テスト用csvファイルアップロード
      await csvBasicFormat.fileUpload(
        '/home/upload',
        'uploadFormatTest.csv',
        Buffer.from(decodeURIComponent(fileData), 'base64').toString('utf8')
      )
      // 試験実施
      await csvConfirmFormat.cbPostCsvConfirmFormat(request, response, next)

      // 期待結果
      // 404エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      // 500エラーがエラーハンドリング「される」
      expect(next).toHaveBeenCalledWith(error500)
    })

    test('404エラー：DBから取得したユーザのuserStatusが0以外の場合', async () => {
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
      findOneSpy.mockReturnValue(dataValuesStatuserr)

      // テスト用csvファイルアップロード
      await csvBasicFormat.fileUpload(
        '/home/upload',
        'uploadFormatTest.csv',
        Buffer.from(decodeURIComponent(fileData), 'base64').toString('utf8')
      )
      // 試験実施
      await csvConfirmFormat.cbPostCsvConfirmFormat(request, response, next)

      // 期待結果
      // 404エラーがエラーハンドリング「される」
      expect(next).toHaveBeenCalledWith(error404)
    })

    test('異常：400エラー（NotLoggedIn）', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = {
        userContext: 'NotLoggedIn',
        userRole: 'dummy'
      }
      request.user = user
      // ファイルデータを設定
      request.body = {
        ...reqBodyForCbPostIndex
      }

      // DBからの正常なユーザデータの取得を想定する
      findOneSpy.mockReturnValue(userInfoData)
      // DBからの正常な契約情報取得を想定する
      findOneSpyContracts.mockReturnValue(contractdataValues)

      // テスト用csvファイルアップロード
      await csvBasicFormat.fileUpload(
        '/home/upload',
        'uploadFormatTest.csv',
        Buffer.from(decodeURIComponent(fileData), 'base64').toString('utf8')
      )
      // 試験実施
      await csvConfirmFormat.cbPostCsvConfirmFormat(request, response, next)

      // 期待結果
      // 400エラーがエラーハンドリング「される」
      expect(next).toHaveBeenCalledWith(errorHelper.create(400))
      // response.renderが呼ばれ「ない」
      expect(response.render).not.toHaveBeenCalled()
    })

    test('異常：500エラー（不正なContractStatus）', async () => {
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

      helper.checkContractStatus = 999

      // テスト用csvファイルアップロード
      await csvBasicFormat.fileUpload(
        '/home/upload',
        'uploadFormatTest.csv',
        Buffer.from(decodeURIComponent(fileData), 'base64').toString('utf8')
      )
      // 試験実施
      await csvConfirmFormat.cbPostCsvConfirmFormat(request, response, next)

      // 期待結果
      // 404，500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      expect(next).toHaveBeenCalledWith(errorHelper.create(500))
    })
  })

  // -----------------------------------------------------------------------------------------
  // cbPostDBIndex
  describe('cbPostDBIndex', () => {
    test('正常:', async () => {
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
      findOneSpyContracts.mockReturnValue(contractdataValues)

      // ファイルデータを設定
      request.body = {
        dataFileName: 'uploadFormatTest.csv',
        formatData: [
          '0',
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
          '18'
        ],
        消費税: 'a',
        軽減税率: '',
        不課税: '',
        免税: '',
        非課税: '',
        人月: 'b',
        ボトル: '',
        コスト: '',
        コンテナ: '',
        センチリットル: '',
        平方センチメートル: '',
        立方センチメートル: '',
        センチメートル: '',
        ケース: '',
        カートン: '',
        日: '',
        デシリットル: '',
        デシメートル: '',
        'グロス・キログラム': '',
        個: '',
        フィート: '',
        ガロン: '',
        グラム: '',
        総トン: '',
        時間: '',
        キログラム: '',
        キロメートル: '',
        キロワット時: '',
        ポンド: '',
        リットル: '',
        ミリグラム: '',
        ミリリットル: '',
        ミリメートル: '',
        月: '',
        平方メートル: '',
        立方メートル: '',
        メーター: '',
        純トン: '',
        包: '',
        巻: '',
        式: '',
        トン: '',
        その他: ''
      }

      helper.checkContractStatus = 10

      // テスト用csvファイルアップロード
      await csvBasicFormat.fileUpload(
        '/home/upload',
        'uploadFormatTest.csv',
        Buffer.from(decodeURIComponent(fileData), 'base64').toString('utf8')
      )

      // 試験実施
      await csvConfirmFormat.cbPostDBIndex(request, response, next)

      // 期待結果
      // 404，500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      expect(next).not.toHaveBeenCalledWith(error500)
    })

    test('準正常：解約申込中', async () => {
      // 準備
      // requestのuserIdに正常値を入れる
      request.session = {
        userContext: 'LoggedIn',
        userRole: 'dummy'
      }
      request.user = user
      // DBからの正常なユーザデータの取得を想定する
      findOneSpy.mockReturnValue(dataValues)
      // DBからの正常な契約情報取得を想定する
      findOneSpyContracts.mockReturnValue(contractdataValues2)

      // ファイルデータを設定
      request.body = {
        formatData: [
          '0',
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
          '18'
        ]
      }

      // 試験実施
      await csvConfirmFormat.cbPostDBIndex(request, response, next)

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

    test('異常：500エラー（reqエラー）', async () => {
      // 準備
      // requestのuserIdに正常値を入れる
      request.session = {
        userContext: 'NotLoggedIn',
        userRole: 'dummy'
      }
      request.user = null
      // DBからの正常なユーザデータの取得を想定する
      findOneSpy.mockReturnValue(dataValues)
      // DBからの正常な契約情報取得を想定する
      findOneSpyContracts.mockReturnValue(contractdataValues)

      // ファイルデータを設定
      request.body = {
        formatData: [
          '0',
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
          '18'
        ]
      }

      // 試験実施
      await csvConfirmFormat.cbPostDBIndex(request, response, next)

      // 期待結果
      // 404，500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      expect(next).toHaveBeenCalledWith(errorHelper.create(500))
    })

    test('異常：500エラー（不正なContractStatus）', async () => {
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
      findOneSpyContracts.mockReturnValue(contractdataValues4)

      helper.checkContractStatus = 999

      // ファイルデータを設定
      request.body = {
        formatData: [
          '0',
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
          '18'
        ]
      }

      // 試験実施
      await csvConfirmFormat.cbPostDBIndex(request, response, next)

      // 期待結果
      // 404，500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      expect(next).toHaveBeenCalledWith(errorHelper.create(500))
    })

    test('異常：500エラー（userデータ取得エラー）', async () => {
      // 準備
      // requestのuserIdに正常値を入れる
      request.session = {
        userContext: 'NotLoggedIn',
        userRole: 'dummy'
      }
      request.user = user
      // DBからの正常なユーザデータの取得を想定する
      findOneSpy.mockReturnValue(null)
      // DBからの正常な契約情報取得を想定する
      findOneSpyContracts.mockReturnValue(contractdataValues)

      // ファイルデータを設定
      request.body = {
        formatData: [
          '0',
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
          '18'
        ]
      }

      // 試験実施
      await csvConfirmFormat.cbPostDBIndex(request, response, next)

      // 期待結果
      // 404，500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      expect(next).toHaveBeenCalledWith(errorHelper.create(500))
    })

    test('異常：500エラー（userStatusが0以外）', async () => {
      // 準備
      // requestのuserIdに正常値を入れる
      request.session = {
        userContext: 'NotLoggedIn',
        userRole: 'dummy'
      }
      request.user = user
      // DBからの正常なユーザデータの取得を想定する
      findOneSpy.mockReturnValue(dataValuesStatuserr)
      // DBからの正常な契約情報取得を想定する
      findOneSpyContracts.mockReturnValue(contractdataValues)

      // ファイルデータを設定
      request.body = {
        formatData: [
          '0',
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
          '18'
        ]
      }

      // 試験実施
      await csvConfirmFormat.cbPostDBIndex(request, response, next)

      // 期待結果
      // 404，500エラーがエラーハンドリング「されない」
      expect(next).toHaveBeenCalledWith(error404)
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(500))
    })

    test('異常:500エラー（Contractsデータエラー）', async () => {
      // 準備
      // requestのuserIdに正常値を入れる
      request.session = {
        userContext: 'LoggedIn',
        userRole: 'dummy'
      }
      request.user = user
      // DBからの正常なユーザデータの取得を想定する
      findOneSpy.mockReturnValue(dataValues)
      // DBからの正常な契約情報取得を想定する
      findOneSpyContracts.mockReturnValue(null)

      // ファイルデータを設定
      request.body = {
        formatData: [
          '0',
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
          '18'
        ]
      }

      // 試験実施
      await csvConfirmFormat.cbPostDBIndex(request, response, next)

      // 期待結果
      // 404エラーがエラーハンドリング「されない」
      // 500エラーがエラーハンドリング「される」
      expect(next).not.toHaveBeenCalledWith(error404)
      expect(next).toHaveBeenCalledWith(errorHelper.create(500))
    })

    test('異常：500エラー（不正なContractデータ）', async () => {
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
      findOneSpyContracts.mockReturnValue(contractdataValues)

      // ファイルデータを設定
      request.body = {
        formatData: [
          '0',
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
          '18'
        ]
      }

      helper.checkContractStatus = 999

      // 試験実施
      await csvConfirmFormat.cbPostDBIndex(request, response, next)

      // 期待結果
      // 404，500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      expect(next).toHaveBeenCalledWith(errorHelper.create(500))
    })
  })

  // // -----------------------------------------------------------------------------------------
  // // cbPostBackIndex
  describe('cbPostBackIndex', () => {
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
      await csvConfirmFormat.cbPostBackIndex(request, response, next)

      // 期待結果
      expect(response.render).toHaveBeenCalledWith('uploadFormat', {
        headerItems: headerItemsBackResult,
        uploadGeneral: uploadGeneralBackResult,
        taxIds: taxIdsBackResult,
        unitIds: unitIdsBackResult,
        selectedFormatData: formatData,
        csvfilename: testfilename
      })
    })
  })
})
