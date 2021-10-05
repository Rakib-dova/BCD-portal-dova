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
  const fileNameErr = 'uploadFormatTest2.csv'
  const uploadFileName = dataValues.dataValues.userId + '_' + fileName
  const uploadFileNameErr = dataValues.dataValues.userId + '_' + fileNameErr
  // ファイルデータ
  // 請求書が1つの場合
  const fileData = Buffer.from(
    `発行日,請求書番号,テナントID,支払期日,納品日,備考,銀行名,支店名,科目,口座番号,口座名義,その他特記事項,明細-項目ID,明細-内容,明細-数量,明細-単位,明細-単価,明細-税（消費税／軽減税率／不課税／免税／非課税）,明細-備考
2021-06-14,UT_TEST_INVOICE_1_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-17,test111,testsiten,testbank,普通,1111111,kang_test,特記事項テストです。,001,PC,100,個,100000,消費税,アップロードテスト`
  ).toString('base64')

  const fileDataHeaderErr = Buffer.from(
    `aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa,請求書番号,テナントID,支払期日,納品日,備考,銀行名,支店名,科目,口座番号,口座名義,その他特記事項,明細-項目ID,明細-内容,明細-数量,明細-単位,明細-単価,明細-税（消費税／軽減税率／不課税／免税／非課税）,明細-備考
2021-06-14,UT_TEST_INVOICE_1_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-17,test111,testsiten,testbank,普通,1111111,kang_test,特記事項テストです。,001,PC,100,個,100000,消費税,アップロードテスト`
  ).toString('base64')

  const fileDataMesai = Buffer.from(
    `発行日,請求書番号,テナントID,支払期日,納品日,備考,銀行名,支店名,科目,口座番号,口座名義,その他特記事項,明細-項目ID,明細-内容,明細-数量,明細-単位,明細-単価,明細-税（消費税／軽減税率／不課税／免税／非課税）,明細-備考
2021-06-14,aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-17,test111,testsiten,testbank,普通,1111111,kang_test,特記事項テストです。,001,PC,100,個,100000,消費税,アップロードテスト`
  ).toString('base64')

  const reqBodyForCbPostIndexOn = {
    uploadFormatItemName: 'testItemName',
    uploadType: '',
    hiddenFileData: Buffer.from(decodeURIComponent(fileData), 'base64').toString('utf8'),
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
    keyOthers: '45'
  }

  const reqBodyForCbPostIndexOff = {
    uploadFormatItemName: 'testItemName',
    uploadType: '',
    hiddenFileData: Buffer.from(decodeURIComponent(fileData), 'base64').toString('utf8'),
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
    keyOthers: '45'
  }

  const reqBodyForCbPostIndexErr = {
    uploadFormatItemName: 'testItemName',
    uploadType: '',
    hiddenFileData: Buffer.from(decodeURIComponent(fileData), 'base64').toString('utf8'),
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
    hiddenFileData: Buffer.from(decodeURIComponent(fileData), 'base64').toString('utf8'),
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
    hiddenFileData: Buffer.from(decodeURIComponent(fileData), 'base64').toString('utf8'),
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
    uploadType: ''
  }

  const taxIdsaaaaaa = {
    keyConsumptionTax:
      'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    keyDutyFree: '6',
    keyExemptTax: '7',
    keyFreeTax: '5',
    keyReducedTax: '4'
  }

  const unitIdsaaaaaa = {
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

  const taxIdsUndefined = {
    keyConsumptionTax: undefined,
    keyDutyFree: undefined,
    keyExemptTax: undefined,
    keyFreeTax: undefined,
    keyReducedTax: undefined
  }

  const unitIdsUndefined = {
    keyBottle: undefined,
    keyCarton: undefined,
    keyCase: undefined,
    keyCentilitre: undefined,
    keyCentimeter: undefined,
    keyContainer: undefined,
    keyCost: undefined,
    keyCubicCentimeter: undefined,
    keyCubicMeter: undefined,
    keyDay: undefined,
    keyDeciliter: undefined,
    keyDecimeter: undefined,
    keyFeet: undefined,
    keyFormula: undefined,
    keyGallon: undefined,
    keyGram: undefined,
    keyGrossKilogram: undefined,
    keyGrossTonnage: undefined,
    keyHour: undefined,
    keyKilogram: undefined,
    keyKilometers: undefined,
    keyKilowattHour: undefined,
    keyLiter: undefined,
    keyManMonth: undefined,
    keyMeter: undefined,
    keyMilligram: undefined,
    keyMilliliter: undefined,
    keyMillimeter: undefined,
    keyMonth: undefined,
    keyNetTonnage: undefined,
    keyOthers: undefined,
    keyPackage: undefined,
    keyPieces: undefined,
    keyPound: undefined,
    keyRoll: undefined,
    keySquareCentimeter: undefined,
    keySquareMeter: undefined,
    keyTonnage: undefined
  }

  describe('ルーティング', () => {
    test('uploadFormatのルーティングを確認', async () => {
      // expect(uploadFormat.router.post).toBeCalledWith('/', uploadFormat.cbPostIndex)
    })
  })

  // -----------------------------------------------------------------------------------------
  // cbPostIndexの確認

  // describe('cbPostIndex', () => {
  //   test('正常：ヘッダあり', async () => {
  //     // 準備
  //     // requestのsession,userIdに正常値を入れる
  //     request.session = {
  //       userContext: 'LoggedIn',
  //       userRole: 'dummy'
  //     }
  //     request.user = user
  //     // ファイルデータを設定
  //     request.body = {
  //       ...reqBodyForCbPostIndexOn
  //     }

  //     // DBからの正常なユーザデータの取得を想定する
  //     findOneSpy.mockReturnValue(dataValues)
  //     // DBからの正常な契約情報取得を想定する
  //     findOneSpyContracts.mockReturnValue(contractdataValues)

  //     // テスト用csvファイルアップロード
  //     await csvBasicFormat.fileUpload(
  //       filePath,
  //       uploadFileName,
  //       Buffer.from(decodeURIComponent(fileData), 'base64').toString('utf8')
  //     )
  //     // 試験実施
  //     await uploadFormat.cbPostIndex(request, response, next)

  //     // 期待結果
  //     // 404，500エラーがエラーハンドリング「されない」
  //     // expect(next).not.toHaveBeenCalledWith(error404)
  //     // expect(next).not.toHaveBeenCalledWith(error500)
  //     // // userContextがLoggedInになっている
  //     // expect(request.session?.userContext).toBe('LoggedIn')
  //     // // session.userRoleが'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'になっている
  //     // expect(request.session?.userRole).toBe('a6a3edcd-00d9-427c-bf03-4ef0112ba16d')
  //     // // response.renderでcsvBasicFormatが呼ばれ「る」
  //     // expect(response.render).toHaveBeenCalledWith('uploadFormat', {
  //     //   csvfilename: '12345678-cb0b-48ad-857d-4b42a44ede13_uploadFormatTest.csv',
  //     //   headerItems: [
  //     //     { item: '発行日', value: '2021-06-14' },
  //     //     { item: '請求書番号', value: 'UT_TEST_INVOICE_1_1' },
  //     //     { item: 'テナントID', value: '3cfebb4f-2338-4dc7-9523-5423a027a880' },
  //     //     { item: '支払期日', value: '2021-03-31' },
  //     //     { item: '納品日', value: '2021-03-17' },
  //     //     { item: '備考', value: 'test111' },
  //     //     { item: '銀行名', value: 'testsiten' },
  //     //     { item: '支店名', value: 'testbank' },
  //     //     { item: '科目', value: '普通' },
  //     //     { item: '口座番号', value: '1111111' },
  //     //     { item: '口座名義', value: 'kang_test' },
  //     //     { item: 'その他特記事項', value: '特記事項テストです。' },
  //     //     { item: '明細-項目ID', value: '001' },
  //     //     { item: '明細-内容', value: 'PC' },
  //     //     { item: '明細-数量', value: '100' },
  //     //     { item: '明細-単位', value: '個' },
  //     //     { item: '明細-単価', value: '100000' },
  //     //     { item: '明細-税（消費税／軽減税率／不課税／免税／非課税）', value: '消費税' },
  //     //     { item: '明細-備考', value: 'アップロードテスト' }
  //     //   ],
  //     //   selectedFormatData: ['', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
  //     //   taxIds: taxIds,
  //     //   unitIds: unitIds,
  //     //   uploadGeneral: uploadGeneral
  //     // })
  //   })

  //   test('正常：ヘッダなし', async () => {
  //     // 準備
  //     // requestのsession,userIdに正常値を入れる
  //     request.session = {
  //       userContext: 'LoggedIn',
  //       userRole: 'dummy'
  //     }
  //     request.user = user
  //     // ファイルデータを設定
  //     request.body = {
  //       ...reqBodyForCbPostIndexOff
  //     }

  //     // DBからの正常なユーザデータの取得を想定する
  //     findOneSpy.mockReturnValue(dataValues)
  //     // DBからの正常な契約情報取得を想定する
  //     findOneSpyContracts.mockReturnValue(contractdataValues)

  //     // テスト用csvファイルアップロード
  //     await csvBasicFormat.fileUpload(
  //       filePath,
  //       uploadFileName,
  //       Buffer.from(decodeURIComponent(fileData), 'base64').toString('utf8')
  //     )
  //     // 試験実施
  //     await uploadFormat.cbPostIndex(request, response, next)

  //     // 期待結果
  //     // 404，500エラーがエラーハンドリング「されない」
  //     expect(next).not.toHaveBeenCalledWith(error404)
  //     expect(next).not.toHaveBeenCalledWith(error500)
  //     // userContextがLoggedInになっている
  //     expect(request.session?.userContext).toBe('LoggedIn')
  //     // session.userRoleが'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'になっている
  //     expect(request.session?.userRole).toBe('a6a3edcd-00d9-427c-bf03-4ef0112ba16d')
  //     // response.renderでcsvBasicFormatが呼ばれ「る」
  //     expect(response.render).toHaveBeenCalledWith('uploadFormat', {
  //       csvfilename: '12345678-cb0b-48ad-857d-4b42a44ede13_uploadFormatTest.csv',
  //       headerItems: [
  //         { item: '', value: '2021-06-14' },
  //         { item: '', value: 'UT_TEST_INVOICE_1_1' },
  //         { item: '', value: '3cfebb4f-2338-4dc7-9523-5423a027a880' },
  //         { item: '', value: '2021-03-31' },
  //         { item: '', value: '2021-03-17' },
  //         { item: '', value: 'test111' },
  //         { item: '', value: 'testsiten' },
  //         { item: '', value: 'testbank' },
  //         { item: '', value: '普通' },
  //         { item: '', value: '1111111' },
  //         { item: '', value: 'kang_test' },
  //         { item: '', value: '特記事項テストです。' },
  //         { item: '', value: '001' },
  //         { item: '', value: 'PC' },
  //         { item: '', value: '100' },
  //         { item: '', value: '個' },
  //         { item: '', value: '100000' },
  //         { item: '', value: '消費税' },
  //         { item: '', value: 'アップロードテスト' }
  //       ],
  //       selectedFormatData: ['', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
  //       taxIds: taxIds,
  //       unitIds: unitIds,
  //       uploadGeneral: uploadGeneral
  //     })
  //   })

  //   test('正常：税の入力値がない場合', async () => {
  //     // 準備
  //     // requestのsession,userIdに正常値を入れる
  //     request.session = {
  //       userContext: 'LoggedIn',
  //       userRole: 'dummy'
  //     }
  //     request.user = user

  //     // ファイルデータを設定
  //     request.body = {
  //       ...reqBodyForCbPostIndexTaxErr
  //     }

  //     request.Referer = '/csvBasicFormat'

  //     // DBからの正常なユーザデータの取得を想定する
  //     findOneSpy.mockReturnValue(dataValues)
  //     // DBからの正常な契約情報取得を想定する
  //     findOneSpyContracts.mockReturnValue(contractdataValues)

  //     // テスト用csvファイルアップロード
  //     await csvBasicFormat.fileUpload(
  //       filePath,
  //       uploadFileName,
  //       Buffer.from(decodeURIComponent(fileData), 'base64').toString('utf8')
  //     )
  //     // 試験実施
  //     await uploadFormat.cbPostIndex(request, response, next)

  //     // 期待結果
  //     // 404，500エラーがエラーハンドリング「されない」
  //     expect(next).not.toHaveBeenCalledWith(error404)
  //     expect(next).not.toHaveBeenCalledWith(error500)
  //     // userContextがLoggedInになっている
  //     expect(request.session?.userContext).toBe('LoggedIn')
  //     // session.userRoleが'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'になっている
  //     expect(request.session?.userRole).toBe('a6a3edcd-00d9-427c-bf03-4ef0112ba16d')
  //     // response.renderでcsvBasicFormatが呼ばれ「る」
  //     expect(response.render).toHaveBeenCalledWith('uploadFormat', {
  //       csvfilename: '12345678-cb0b-48ad-857d-4b42a44ede13_uploadFormatTest.csv',
  //       headerItems: [
  //         { item: '発行日', value: '2021-06-14' },
  //         { item: '請求書番号', value: 'UT_TEST_INVOICE_1_1' },
  //         { item: 'テナントID', value: '3cfebb4f-2338-4dc7-9523-5423a027a880' },
  //         { item: '支払期日', value: '2021-03-31' },
  //         { item: '納品日', value: '2021-03-17' },
  //         { item: '備考', value: 'test111' },
  //         { item: '銀行名', value: 'testsiten' },
  //         { item: '支店名', value: 'testbank' },
  //         { item: '科目', value: '普通' },
  //         { item: '口座番号', value: '1111111' },
  //         { item: '口座名義', value: 'kang_test' },
  //         { item: 'その他特記事項', value: '特記事項テストです。' },
  //         { item: '明細-項目ID', value: '001' },
  //         { item: '明細-内容', value: 'PC' },
  //         { item: '明細-数量', value: '100' },
  //         { item: '明細-単位', value: '個' },
  //         { item: '明細-単価', value: '100000' },
  //         { item: '明細-税（消費税／軽減税率／不課税／免税／非課税）', value: '消費税' },
  //         { item: '明細-備考', value: 'アップロードテスト' }
  //       ],
  //       selectedFormatData: ['', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
  //       taxIds: taxIdsUndefined,
  //       unitIds: unitIds,
  //       uploadGeneral: uploadGeneral
  //     })
  //   })

  //   test('正常：単位の入力値がない場合', async () => {
  //     // 準備
  //     // requestのsession,userIdに正常値を入れる
  //     request.session = {
  //       userContext: 'LoggedIn',
  //       userRole: 'dummy'
  //     }
  //     request.user = user

  //     // ファイルデータを設定
  //     request.body = {
  //       ...reqBodyForCbPostIndexUnitErr
  //     }

  //     request.Referer = '/csvBasicFormat'

  //     // DBからの正常なユーザデータの取得を想定する
  //     findOneSpy.mockReturnValue(dataValues)
  //     // DBからの正常な契約情報取得を想定する
  //     findOneSpyContracts.mockReturnValue(contractdataValues)

  //     // テスト用csvファイルアップロード
  //     await csvBasicFormat.fileUpload(
  //       filePath,
  //       uploadFileName,
  //       Buffer.from(decodeURIComponent(fileData), 'base64').toString('utf8')
  //     )
  //     // 試験実施
  //     await uploadFormat.cbPostIndex(request, response, next)

  //     // 期待結果
  //     // 404，500エラーがエラーハンドリング「されない」
  //     expect(next).not.toHaveBeenCalledWith(error404)
  //     expect(next).not.toHaveBeenCalledWith(error500)
  //     // userContextがLoggedInになっている
  //     expect(request.session?.userContext).toBe('LoggedIn')
  //     // session.userRoleが'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'になっている
  //     expect(request.session?.userRole).toBe('a6a3edcd-00d9-427c-bf03-4ef0112ba16d')
  //     // response.renderでcsvBasicFormatが呼ばれ「る」
  //     expect(response.render).toHaveBeenCalledWith('uploadFormat', {
  //       csvfilename: '12345678-cb0b-48ad-857d-4b42a44ede13_uploadFormatTest.csv',
  //       headerItems: [
  //         { item: '発行日', value: '2021-06-14' },
  //         { item: '請求書番号', value: 'UT_TEST_INVOICE_1_1' },
  //         { item: 'テナントID', value: '3cfebb4f-2338-4dc7-9523-5423a027a880' },
  //         { item: '支払期日', value: '2021-03-31' },
  //         { item: '納品日', value: '2021-03-17' },
  //         { item: '備考', value: 'test111' },
  //         { item: '銀行名', value: 'testsiten' },
  //         { item: '支店名', value: 'testbank' },
  //         { item: '科目', value: '普通' },
  //         { item: '口座番号', value: '1111111' },
  //         { item: '口座名義', value: 'kang_test' },
  //         { item: 'その他特記事項', value: '特記事項テストです。' },
  //         { item: '明細-項目ID', value: '001' },
  //         { item: '明細-内容', value: 'PC' },
  //         { item: '明細-数量', value: '100' },
  //         { item: '明細-単位', value: '個' },
  //         { item: '明細-単価', value: '100000' },
  //         { item: '明細-税（消費税／軽減税率／不課税／免税／非課税）', value: '消費税' },
  //         { item: '明細-備考', value: 'アップロードテスト' }
  //       ],
  //       selectedFormatData: ['', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
  //       taxIds: taxIds,
  //       unitIds: unitIdsUndefined,
  //       uploadGeneral: uploadGeneral
  //     })
  //   })

  //   test('準正常：解約中', async () => {
  //     // 準備
  //     // requestのsession,userIdに正常値を入れる
  //     request.session = {
  //       userContext: 'LoggedIn',
  //       userRole: 'dummy'
  //     }
  //     request.user = user

  //     // ファイルデータを設定
  //     request.body = {
  //       ...reqBodyForCbPostIndexOn
  //     }

  //     // DBからの正常なユーザデータの取得を想定する
  //     findOneSpy.mockReturnValue(dataValues)
  //     // DBからの正常な契約情報取得を想定する
  //     findOneSpyContracts.mockReturnValue(contractInfoDatatoBeReceiptCancel)

  //     // テスト用csvファイルアップロード
  //     await csvBasicFormat.fileUpload(
  //       filePath,
  //       uploadFileName,
  //       Buffer.from(decodeURIComponent(fileData), 'base64').toString('utf8')
  //     )
  //     // 試験実施
  //     await uploadFormat.cbPostIndex(request, response, next)

  //     // 期待結果
  //     // 404，500エラーがエラーハンドリング「されない」
  //     expect(next).not.toHaveBeenCalledWith(error404)
  //     expect(next).not.toHaveBeenCalledWith(error500)

  //     // 解約手続き中画面が表示「される」
  //     expect(next).toHaveBeenCalledWith(noticeHelper.create('cancelprocedure'))
  //   })

  //   test('準正常：ヘッダありでヘッダ番号の未入力', async () => {
  //     // 準備
  //     // requestのsession,userIdに正常値を入れる
  //     request.session = {
  //       userContext: 'LoggedIn',
  //       userRole: 'dummy'
  //     }
  //     request.user = user

  //     // ファイルデータを設定
  //     request.body = {
  //       ...reqBodyForCbPostIndexOn,
  //       checkItemNameLine: 'on',
  //       uploadFormatNumber: ''
  //     }

  //     request.Referer = '/csvBasicFormat'

  //     // DBからの正常なユーザデータの取得を想定する
  //     findOneSpy.mockReturnValue(dataValues)
  //     // DBからの正常な契約情報取得を想定する
  //     findOneSpyContracts.mockReturnValue(contractdataValues)

  //     helper.checkContractStatus = 10

  //     // テスト用csvファイルアップロード
  //     await csvBasicFormat.fileUpload(
  //       filePath,
  //       uploadFileName,
  //       Buffer.from(decodeURIComponent(fileData), 'base64').toString('utf8')
  //     )
  //     // 試験実施
  //     await uploadFormat.cbPostIndex(request, response, next)

  //     // 期待結果
  //     // 404，500エラーがエラーハンドリング「されない」
  //     expect(next).not.toHaveBeenCalledWith(error404)
  //     expect(next).not.toHaveBeenCalledWith(error500)
  //     // userContextがLoggedInになっている
  //     expect(request.session?.userContext).toBe('LoggedIn')
  //     // session.userRoleが'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'になっている
  //     expect(request.session?.userRole).toBe('a6a3edcd-00d9-427c-bf03-4ef0112ba16d')
  //     // uploadFormat.jsが遷移を拒否して、前URLに戻る
  //     expect(response.headers.Location).toBe('/')
  //     expect(response.statusCode).toBe(307)
  //   })

  //   test('準正常：ヘッダありでヘッダ番号が0の場合', async () => {
  //     // 準備
  //     // requestのsession,userIdに正常値を入れる
  //     request.session = {
  //       userContext: 'LoggedIn',
  //       userRole: 'dummy'
  //     }
  //     request.user = user

  //     // ファイルデータを設定
  //     request.body = {
  //       ...reqBodyForCbPostIndexOn,
  //       checkItemNameLine: 'on',
  //       uploadFormatNumber: '0'
  //     }

  //     request.Referer = '/csvBasicFormat'

  //     // DBからの正常なユーザデータの取得を想定する
  //     findOneSpy.mockReturnValue(dataValues)
  //     // DBからの正常な契約情報取得を想定する
  //     findOneSpyContracts.mockReturnValue(contractdataValues)

  //     // テスト用csvファイルアップロード
  //     await csvBasicFormat.fileUpload(
  //       filePath,
  //       uploadFileName,
  //       Buffer.from(decodeURIComponent(fileData), 'base64').toString('utf8')
  //     )
  //     // 試験実施
  //     await uploadFormat.cbPostIndex(request, response, next)

  //     // 期待結果
  //     // 404，500エラーがエラーハンドリング「されない」
  //     expect(next).not.toHaveBeenCalledWith(error404)
  //     expect(next).not.toHaveBeenCalledWith(error500)
  //     // userContextがLoggedInになっている
  //     expect(request.session?.userContext).toBe('LoggedIn')
  //     // session.userRoleが'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'になっている
  //     expect(request.session?.userRole).toBe('a6a3edcd-00d9-427c-bf03-4ef0112ba16d')
  //     // uploadFormat.jsが遷移を拒否して、前URLに戻る
  //     expect(response.headers.Location).toBe('/')
  //     expect(response.statusCode).toBe(307)
  //   })

  //   test('準正常：ヘッダありでヘッダの数字>データ開始番号', async () => {
  //     // 準備
  //     // requestのsession,userIdに正常値を入れる
  //     request.session = {
  //       userContext: 'LoggedIn',
  //       userRole: 'dummy'
  //     }
  //     request.user = user

  //     // ファイルデータを設定
  //     request.body = {
  //       ...reqBodyForCbPostIndexOn,
  //       checkItemNameLine: 'on',
  //       uploadFormatNumber: '2',
  //       defaultNumber: '1'
  //     }

  //     request.Referer = '/csvBasicFormat'

  //     // DBからの正常なユーザデータの取得を想定する
  //     findOneSpy.mockReturnValue(dataValues)
  //     // DBからの正常な契約情報取得を想定する
  //     findOneSpyContracts.mockReturnValue(contractdataValues)

  //     // テスト用csvファイルアップロード
  //     await csvBasicFormat.fileUpload(
  //       filePath,
  //       uploadFileName,
  //       Buffer.from(decodeURIComponent(fileData), 'base64').toString('utf8')
  //     )
  //     // 試験実施
  //     await uploadFormat.cbPostIndex(request, response, next)

  //     // 期待結果
  //     // 404，500エラーがエラーハンドリング「されない」
  //     expect(next).not.toHaveBeenCalledWith(error404)
  //     expect(next).not.toHaveBeenCalledWith(error500)
  //     // userContextがLoggedInになっている
  //     expect(request.session?.userContext).toBe('LoggedIn')
  //     // session.userRoleが'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'になっている
  //     expect(request.session?.userRole).toBe('a6a3edcd-00d9-427c-bf03-4ef0112ba16d')
  //     // uploadFormat.jsが遷移を拒否して、前URLに戻る
  //     expect(response.headers.Location).toBe('/')
  //     expect(response.statusCode).toBe(307)
  //   })

  //   test('準正常：ヘッダありでヘッダの長さが100以上', async () => {
  //     // 準備
  //     // requestのsession,userIdに正常値を入れる
  //     request.session = {
  //       userContext: 'LoggedIn',
  //       userRole: 'dummy'
  //     }
  //     request.user = user

  //     // ファイルデータを設定
  //     request.body = {
  //       ...reqBodyForCbPostIndexErr
  //     }

  //     request.Referer = '/csvBasicFormat'

  //     // DBからの正常なユーザデータの取得を想定する
  //     findOneSpy.mockReturnValue(dataValues)
  //     // DBからの正常な契約情報取得を想定する
  //     findOneSpyContracts.mockReturnValue(contractdataValues)

  //     // テスト用csvファイルアップロード
  //     await csvBasicFormat.fileUpload(
  //       filePath,
  //       uploadFileNameErr,
  //       Buffer.from(decodeURIComponent(fileDataHeaderErr), 'base64').toString('utf8')
  //     )
  //     // 試験実施
  //     await uploadFormat.cbPostIndex(request, response, next)

  //     // 期待結果
  //     // 404，500エラーがエラーハンドリング「されない」
  //     expect(next).not.toHaveBeenCalledWith(error404)
  //     expect(next).not.toHaveBeenCalledWith(error500)
  //     // userContextがLoggedInになっている
  //     expect(request.session?.userContext).toBe('LoggedIn')
  //     // session.userRoleが'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'になっている
  //     expect(request.session?.userRole).toBe('a6a3edcd-00d9-427c-bf03-4ef0112ba16d')
  //     // uploadFormat.jsが遷移を拒否して、前URLに戻る
  //     expect(response.headers.Location).toBe('/')
  //     expect(response.statusCode).toBe(307)
  //   })

  //   test('準正常：ヘッダなしデータ開始番号が0の場合', async () => {
  //     // 準備
  //     // requestのsession,userIdに正常値を入れる
  //     request.session = {
  //       userContext: 'LoggedIn',
  //       userRole: 'dummy'
  //     }
  //     request.user = user

  //     // ファイルデータを設定
  //     request.body = {
  //       ...reqBodyForCbPostIndexOn,
  //       checkItemNameLine: 'off',
  //       defaultNumber: '0'
  //     }

  //     request.Referer = '/csvBasicFormat'

  //     // DBからの正常なユーザデータの取得を想定する
  //     findOneSpy.mockReturnValue(dataValues)
  //     // DBからの正常な契約情報取得を想定する
  //     findOneSpyContracts.mockReturnValue(contractdataValues)

  //     // テスト用csvファイルアップロード
  //     await csvBasicFormat.fileUpload(
  //       filePath,
  //       uploadFileName,
  //       Buffer.from(decodeURIComponent(fileData), 'base64').toString('utf8')
  //     )
  //     // 試験実施
  //     await uploadFormat.cbPostIndex(request, response, next)

  //     // 期待結果
  //     // 404，500エラーがエラーハンドリング「されない」
  //     expect(next).not.toHaveBeenCalledWith(error404)
  //     expect(next).not.toHaveBeenCalledWith(error500)
  //     // userContextがLoggedInになっている
  //     expect(request.session?.userContext).toBe('LoggedIn')
  //     // session.userRoleが'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'になっている
  //     expect(request.session?.userRole).toBe('a6a3edcd-00d9-427c-bf03-4ef0112ba16d')
  //     // uploadFormat.jsが遷移を拒否して、前URLに戻る
  //     expect(response.headers.Location).toBe('/')
  //     expect(response.statusCode).toBe(307)
  //   })

  //   test('準正常：ヘッダなしデータ開始番号がCSVの行より多いの場合', async () => {
  //     // 準備
  //     // requestのsession,userIdに正常値を入れる
  //     request.session = {
  //       userContext: 'LoggedIn',
  //       userRole: 'dummy'
  //     }
  //     request.user = user

  //     // ファイルデータを設定
  //     request.body = {
  //       ...reqBodyForCbPostIndexOn,
  //       checkItemNameLine: 'off',
  //       defaultNumber: '3'
  //     }

  //     request.Referer = '/csvBasicFormat'

  //     // DBからの正常なユーザデータの取得を想定する
  //     findOneSpy.mockReturnValue(dataValues)
  //     // DBからの正常な契約情報取得を想定する
  //     findOneSpyContracts.mockReturnValue(contractdataValues)

  //     // テスト用csvファイルアップロード
  //     await csvBasicFormat.fileUpload(
  //       filePath,
  //       uploadFileName,
  //       Buffer.from(decodeURIComponent(fileData), 'base64').toString('utf8')
  //     )
  //     // 試験実施
  //     await uploadFormat.cbPostIndex(request, response, next)

  //     // 期待結果
  //     // 404，500エラーがエラーハンドリング「されない」
  //     expect(next).not.toHaveBeenCalledWith(error404)
  //     expect(next).not.toHaveBeenCalledWith(error500)
  //     // userContextがLoggedInになっている
  //     expect(request.session?.userContext).toBe('LoggedIn')
  //     // session.userRoleが'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'になっている
  //     expect(request.session?.userRole).toBe('a6a3edcd-00d9-427c-bf03-4ef0112ba16d')
  //     // uploadFormat.jsが遷移を拒否して、前URLに戻る
  //     expect(response.headers.Location).toBe('/')
  //     expect(response.statusCode).toBe(307)
  //   })

  //   test('準正常：ヘッダありで明細の長さが100以上', async () => {
  //     // 準備
  //     // requestのsession,userIdに正常値を入れる
  //     request.session = {
  //       userContext: 'LoggedIn',
  //       userRole: 'dummy'
  //     }
  //     request.user = user

  //     // ファイルデータを設定
  //     request.body = {
  //       ...reqBodyForCbPostIndexErr
  //     }

  //     request.Referer = '/csvBasicFormat'

  //     // DBからの正常なユーザデータの取得を想定する
  //     findOneSpy.mockReturnValue(dataValues)
  //     // DBからの正常な契約情報取得を想定する
  //     findOneSpyContracts.mockReturnValue(contractdataValues)

  //     // テスト用csvファイルアップロード
  //     await csvBasicFormat.fileUpload(
  //       filePath,
  //       uploadFileNameErr,
  //       Buffer.from(decodeURIComponent(fileDataMesai), 'base64').toString('utf8')
  //     )
  //     // 試験実施
  //     await uploadFormat.cbPostIndex(request, response, next)

  //     // 期待結果
  //     // 404，500エラーがエラーハンドリング「されない」
  //     expect(next).not.toHaveBeenCalledWith(error404)
  //     expect(next).not.toHaveBeenCalledWith(error500)
  //     // userContextがLoggedInになっている
  //     expect(request.session?.userContext).toBe('LoggedIn')
  //     // session.userRoleが'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'になっている
  //     expect(request.session?.userRole).toBe('a6a3edcd-00d9-427c-bf03-4ef0112ba16d')
  //     // uploadFormat.jsが遷移を拒否して、前URLに戻る
  //     expect(response.headers.Location).toBe('/')
  //     expect(response.statusCode).toBe(307)
  //     // テストファイル削除
  //     await uploadFormat.cbRemoveCsv(filePath, uploadFileNameErr)
  //   })

  //   test('準正常：消費税と軽減税率が重複', async () => {
  //     // 準備
  //     // requestのsession,userIdに正常値を入れる
  //     request.session = {
  //       userContext: 'LoggedIn',
  //       userRole: 'dummy'
  //     }
  //     request.user = user

  //     // ファイルデータを設定
  //     request.body = {
  //       ...reqBodyForCbPostIndexOn,
  //       keyConsumptionTax: '3',
  //       keyReducedTax: '3',
  //       keyFreeTax: '5',
  //       keyDutyFree: '6',
  //       keyExemptTax: '7'
  //     }

  //     request.Referer = '/csvBasicFormat'

  //     // DBからの正常なユーザデータの取得を想定する
  //     findOneSpy.mockReturnValue(dataValues)
  //     // DBからの正常な契約情報取得を想定する
  //     findOneSpyContracts.mockReturnValue(contractdataValues)

  //     // テスト用csvファイルアップロード
  //     await csvBasicFormat.fileUpload(
  //       filePath,
  //       uploadFileName,
  //       Buffer.from(decodeURIComponent(fileData), 'base64').toString('utf8')
  //     )
  //     // 試験実施
  //     await uploadFormat.cbPostIndex(request, response, next)

  //     // 期待結果
  //     // 404，500エラーがエラーハンドリング「されない」
  //     expect(next).not.toHaveBeenCalledWith(error404)
  //     expect(next).not.toHaveBeenCalledWith(error500)
  //     // userContextがLoggedInになっている
  //     expect(request.session?.userContext).toBe('LoggedIn')
  //     // session.userRoleが'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'になっている
  //     expect(request.session?.userRole).toBe('a6a3edcd-00d9-427c-bf03-4ef0112ba16d')
  //     // uploadFormat.jsが遷移を拒否して、前URLに戻る
  //     expect(response.headers.Location).toBe('/')
  //     expect(response.statusCode).toBe(307)
  //   })

  //   test('準正常：消費税と不課税が重複', async () => {
  //     // 準備
  //     // requestのsession,userIdに正常値を入れる
  //     request.session = {
  //       userContext: 'LoggedIn',
  //       userRole: 'dummy'
  //     }
  //     request.user = user

  //     // ファイルデータを設定
  //     request.body = {
  //       ...reqBodyForCbPostIndexOn,
  //       keyConsumptionTax: '3',
  //       keyReducedTax: '4',
  //       keyFreeTax: '3',
  //       keyDutyFree: '6',
  //       keyExemptTax: '7'
  //     }

  //     request.Referer = '/csvBasicFormat'

  //     // DBからの正常なユーザデータの取得を想定する
  //     findOneSpy.mockReturnValue(dataValues)
  //     // DBからの正常な契約情報取得を想定する
  //     findOneSpyContracts.mockReturnValue(contractdataValues)

  //     // テスト用csvファイルアップロード
  //     await csvBasicFormat.fileUpload(
  //       filePath,
  //       uploadFileName,
  //       Buffer.from(decodeURIComponent(fileData), 'base64').toString('utf8')
  //     )
  //     // 試験実施
  //     await uploadFormat.cbPostIndex(request, response, next)

  //     // 期待結果
  //     // 404，500エラーがエラーハンドリング「されない」
  //     expect(next).not.toHaveBeenCalledWith(error404)
  //     expect(next).not.toHaveBeenCalledWith(error500)
  //     // userContextがLoggedInになっている
  //     expect(request.session?.userContext).toBe('LoggedIn')
  //     // session.userRoleが'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'になっている
  //     expect(request.session?.userRole).toBe('a6a3edcd-00d9-427c-bf03-4ef0112ba16d')
  //     // uploadFormat.jsが遷移を拒否して、前URLに戻る
  //     expect(response.headers.Location).toBe('/')
  //     expect(response.statusCode).toBe(307)
  //   })

  //   test('準正常：消費税と免税が重複', async () => {
  //     // 準備
  //     // requestのsession,userIdに正常値を入れる
  //     request.session = {
  //       userContext: 'LoggedIn',
  //       userRole: 'dummy'
  //     }
  //     request.user = user

  //     // ファイルデータを設定
  //     request.body = {
  //       ...reqBodyForCbPostIndexOn,
  //       keyConsumptionTax: '3',
  //       keyReducedTax: '4',
  //       keyFreeTax: '5',
  //       keyDutyFree: '3',
  //       keyExemptTax: '7'
  //     }

  //     request.Referer = '/csvBasicFormat'

  //     // DBからの正常なユーザデータの取得を想定する
  //     findOneSpy.mockReturnValue(dataValues)
  //     // DBからの正常な契約情報取得を想定する
  //     findOneSpyContracts.mockReturnValue(contractdataValues)

  //     // テスト用csvファイルアップロード
  //     await csvBasicFormat.fileUpload(
  //       filePath,
  //       uploadFileName,
  //       Buffer.from(decodeURIComponent(fileData), 'base64').toString('utf8')
  //     )
  //     // 試験実施
  //     await uploadFormat.cbPostIndex(request, response, next)

  //     // 期待結果
  //     // 404，500エラーがエラーハンドリング「されない」
  //     expect(next).not.toHaveBeenCalledWith(error404)
  //     expect(next).not.toHaveBeenCalledWith(error500)
  //     // userContextがLoggedInになっている
  //     expect(request.session?.userContext).toBe('LoggedIn')
  //     // session.userRoleが'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'になっている
  //     expect(request.session?.userRole).toBe('a6a3edcd-00d9-427c-bf03-4ef0112ba16d')
  //     // uploadFormat.jsが遷移を拒否して、前URLに戻る
  //     expect(response.headers.Location).toBe('/')
  //     expect(response.statusCode).toBe(307)
  //   })

  //   test('準正常：消費税と非課税が重複', async () => {
  //     // 準備
  //     // requestのsession,userIdに正常値を入れる
  //     request.session = {
  //       userContext: 'LoggedIn',
  //       userRole: 'dummy'
  //     }
  //     request.user = user

  //     // ファイルデータを設定
  //     request.body = {
  //       ...reqBodyForCbPostIndexOn,
  //       keyConsumptionTax: '3',
  //       keyReducedTax: '4',
  //       keyFreeTax: '5',
  //       keyDutyFree: '6',
  //       keyExemptTax: '3'
  //     }

  //     request.Referer = '/csvBasicFormat'

  //     // DBからの正常なユーザデータの取得を想定する
  //     findOneSpy.mockReturnValue(dataValues)
  //     // DBからの正常な契約情報取得を想定する
  //     findOneSpyContracts.mockReturnValue(contractdataValues)

  //     // テスト用csvファイルアップロード
  //     await csvBasicFormat.fileUpload(
  //       filePath,
  //       uploadFileName,
  //       Buffer.from(decodeURIComponent(fileData), 'base64').toString('utf8')
  //     )
  //     // 試験実施
  //     await uploadFormat.cbPostIndex(request, response, next)

  //     // 期待結果
  //     // 404，500エラーがエラーハンドリング「されない」
  //     expect(next).not.toHaveBeenCalledWith(error404)
  //     expect(next).not.toHaveBeenCalledWith(error500)
  //     // userContextがLoggedInになっている
  //     expect(request.session?.userContext).toBe('LoggedIn')
  //     // session.userRoleが'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'になっている
  //     expect(request.session?.userRole).toBe('a6a3edcd-00d9-427c-bf03-4ef0112ba16d')
  //     // uploadFormat.jsが遷移を拒否して、前URLに戻る
  //     expect(response.headers.Location).toBe('/')
  //     expect(response.statusCode).toBe(307)
  //   })

  //   test('準正常：軽減税率と不課税が重複', async () => {
  //     // 準備
  //     // requestのsession,userIdに正常値を入れる
  //     request.session = {
  //       userContext: 'LoggedIn',
  //       userRole: 'dummy'
  //     }
  //     request.user = user

  //     // ファイルデータを設定
  //     request.body = {
  //       ...reqBodyForCbPostIndexOn,
  //       keyConsumptionTax: '3',
  //       keyReducedTax: '4',
  //       keyFreeTax: '4',
  //       keyDutyFree: '6',
  //       keyExemptTax: '7'
  //     }

  //     request.Referer = '/csvBasicFormat'

  //     // DBからの正常なユーザデータの取得を想定する
  //     findOneSpy.mockReturnValue(dataValues)
  //     // DBからの正常な契約情報取得を想定する
  //     findOneSpyContracts.mockReturnValue(contractdataValues)

  //     // テスト用csvファイルアップロード
  //     await csvBasicFormat.fileUpload(
  //       filePath,
  //       uploadFileName,
  //       Buffer.from(decodeURIComponent(fileData), 'base64').toString('utf8')
  //     )
  //     // 試験実施
  //     await uploadFormat.cbPostIndex(request, response, next)

  //     // 期待結果
  //     // 404，500エラーがエラーハンドリング「されない」
  //     expect(next).not.toHaveBeenCalledWith(error404)
  //     expect(next).not.toHaveBeenCalledWith(error500)
  //     // userContextがLoggedInになっている
  //     expect(request.session?.userContext).toBe('LoggedIn')
  //     // session.userRoleが'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'になっている
  //     expect(request.session?.userRole).toBe('a6a3edcd-00d9-427c-bf03-4ef0112ba16d')
  //     // uploadFormat.jsが遷移を拒否して、前URLに戻る
  //     expect(response.headers.Location).toBe('/')
  //     expect(response.statusCode).toBe(307)
  //   })

  //   test('準正常：軽減税率と免税が重複', async () => {
  //     // 準備
  //     // requestのsession,userIdに正常値を入れる
  //     request.session = {
  //       userContext: 'LoggedIn',
  //       userRole: 'dummy'
  //     }
  //     request.user = user

  //     // ファイルデータを設定
  //     request.body = {
  //       ...reqBodyForCbPostIndexOn,
  //       keyConsumptionTax: '3',
  //       keyReducedTax: '4',
  //       keyFreeTax: '5',
  //       keyDutyFree: '4',
  //       keyExemptTax: '7'
  //     }

  //     request.Referer = '/csvBasicFormat'

  //     // DBからの正常なユーザデータの取得を想定する
  //     findOneSpy.mockReturnValue(dataValues)
  //     // DBからの正常な契約情報取得を想定する
  //     findOneSpyContracts.mockReturnValue(contractdataValues)

  //     // テスト用csvファイルアップロード
  //     await csvBasicFormat.fileUpload(
  //       filePath,
  //       uploadFileName,
  //       Buffer.from(decodeURIComponent(fileData), 'base64').toString('utf8')
  //     )
  //     // 試験実施
  //     await uploadFormat.cbPostIndex(request, response, next)

  //     // 期待結果
  //     // 404，500エラーがエラーハンドリング「されない」
  //     expect(next).not.toHaveBeenCalledWith(error404)
  //     expect(next).not.toHaveBeenCalledWith(error500)
  //     // userContextがLoggedInになっている
  //     expect(request.session?.userContext).toBe('LoggedIn')
  //     // session.userRoleが'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'になっている
  //     expect(request.session?.userRole).toBe('a6a3edcd-00d9-427c-bf03-4ef0112ba16d')
  //     // uploadFormat.jsが遷移を拒否して、前URLに戻る
  //     expect(response.headers.Location).toBe('/')
  //     expect(response.statusCode).toBe(307)
  //   })

  //   test('準正常：軽減税率と非課税が重複', async () => {
  //     // 準備
  //     // requestのsession,userIdに正常値を入れる
  //     request.session = {
  //       userContext: 'LoggedIn',
  //       userRole: 'dummy'
  //     }
  //     request.user = user

  //     // ファイルデータを設定
  //     request.body = {
  //       ...reqBodyForCbPostIndexOn,
  //       keyConsumptionTax: '3',
  //       keyReducedTax: '4',
  //       keyFreeTax: '5',
  //       keyDutyFree: '6',
  //       keyExemptTax: '4'
  //     }

  //     request.Referer = '/csvBasicFormat'

  //     // DBからの正常なユーザデータの取得を想定する
  //     findOneSpy.mockReturnValue(dataValues)
  //     // DBからの正常な契約情報取得を想定する
  //     findOneSpyContracts.mockReturnValue(contractdataValues)

  //     // テスト用csvファイルアップロード
  //     await csvBasicFormat.fileUpload(
  //       filePath,
  //       uploadFileName,
  //       Buffer.from(decodeURIComponent(fileData), 'base64').toString('utf8')
  //     )
  //     // 試験実施
  //     await uploadFormat.cbPostIndex(request, response, next)

  //     // 期待結果
  //     // 404，500エラーがエラーハンドリング「されない」
  //     expect(next).not.toHaveBeenCalledWith(error404)
  //     expect(next).not.toHaveBeenCalledWith(error500)
  //     // userContextがLoggedInになっている
  //     expect(request.session?.userContext).toBe('LoggedIn')
  //     // session.userRoleが'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'になっている
  //     expect(request.session?.userRole).toBe('a6a3edcd-00d9-427c-bf03-4ef0112ba16d')
  //     // uploadFormat.jsが遷移を拒否して、前URLに戻る
  //     expect(response.headers.Location).toBe('/')
  //     expect(response.statusCode).toBe(307)
  //   })

  //   test('準正常：不課税と免税が重複', async () => {
  //     // 準備
  //     // requestのsession,userIdに正常値を入れる
  //     request.session = {
  //       userContext: 'LoggedIn',
  //       userRole: 'dummy'
  //     }
  //     request.user = user

  //     // ファイルデータを設定
  //     request.body = {
  //       ...reqBodyForCbPostIndexOn,
  //       keyConsumptionTax: '3',
  //       keyReducedTax: '4',
  //       keyFreeTax: '5',
  //       keyDutyFree: '5',
  //       keyExemptTax: '7'
  //     }

  //     request.Referer = '/csvBasicFormat'

  //     // DBからの正常なユーザデータの取得を想定する
  //     findOneSpy.mockReturnValue(dataValues)
  //     // DBからの正常な契約情報取得を想定する
  //     findOneSpyContracts.mockReturnValue(contractdataValues)

  //     // テスト用csvファイルアップロード
  //     await csvBasicFormat.fileUpload(
  //       filePath,
  //       uploadFileName,
  //       Buffer.from(decodeURIComponent(fileData), 'base64').toString('utf8')
  //     )
  //     // 試験実施
  //     await uploadFormat.cbPostIndex(request, response, next)

  //     // 期待結果
  //     // 404，500エラーがエラーハンドリング「されない」
  //     expect(next).not.toHaveBeenCalledWith(error404)
  //     expect(next).not.toHaveBeenCalledWith(error500)
  //     // userContextがLoggedInになっている
  //     expect(request.session?.userContext).toBe('LoggedIn')
  //     // session.userRoleが'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'になっている
  //     expect(request.session?.userRole).toBe('a6a3edcd-00d9-427c-bf03-4ef0112ba16d')
  //     // uploadFormat.jsが遷移を拒否して、前URLに戻る
  //     expect(response.headers.Location).toBe('/')
  //     expect(response.statusCode).toBe(307)
  //   })

  //   test('準正常：不課税と非課税が重複', async () => {
  //     // 準備
  //     // requestのsession,userIdに正常値を入れる
  //     request.session = {
  //       userContext: 'LoggedIn',
  //       userRole: 'dummy'
  //     }
  //     request.user = user

  //     // ファイルデータを設定
  //     request.body = {
  //       ...reqBodyForCbPostIndexOn,
  //       keyConsumptionTax: '3',
  //       keyReducedTax: '4',
  //       keyFreeTax: '5',
  //       keyDutyFree: '6',
  //       keyExemptTax: '5'
  //     }

  //     request.Referer = '/csvBasicFormat'

  //     // DBからの正常なユーザデータの取得を想定する
  //     findOneSpy.mockReturnValue(dataValues)
  //     // DBからの正常な契約情報取得を想定する
  //     findOneSpyContracts.mockReturnValue(contractdataValues)

  //     // テスト用csvファイルアップロード
  //     await csvBasicFormat.fileUpload(
  //       filePath,
  //       uploadFileName,
  //       Buffer.from(decodeURIComponent(fileData), 'base64').toString('utf8')
  //     )
  //     // 試験実施
  //     await uploadFormat.cbPostIndex(request, response, next)

  //     // 期待結果
  //     // 404，500エラーがエラーハンドリング「されない」
  //     expect(next).not.toHaveBeenCalledWith(error404)
  //     expect(next).not.toHaveBeenCalledWith(error500)
  //     // userContextがLoggedInになっている
  //     expect(request.session?.userContext).toBe('LoggedIn')
  //     // session.userRoleが'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'になっている
  //     expect(request.session?.userRole).toBe('a6a3edcd-00d9-427c-bf03-4ef0112ba16d')
  //     // uploadFormat.jsが遷移を拒否して、前URLに戻る
  //     expect(response.headers.Location).toBe('/')
  //     expect(response.statusCode).toBe(307)
  //   })

  //   test('準正常：免税と非課税が重複', async () => {
  //     // 準備
  //     // requestのsession,userIdに正常値を入れる
  //     request.session = {
  //       userContext: 'LoggedIn',
  //       userRole: 'dummy'
  //     }
  //     request.user = user

  //     // ファイルデータを設定
  //     request.body = {
  //       ...reqBodyForCbPostIndexOn,
  //       keyConsumptionTax: '3',
  //       keyReducedTax: '4',
  //       keyFreeTax: '5',
  //       keyDutyFree: '6',
  //       keyExemptTax: '6'
  //     }

  //     request.Referer = '/csvBasicFormat'

  //     // DBからの正常なユーザデータの取得を想定する
  //     findOneSpy.mockReturnValue(dataValues)
  //     // DBからの正常な契約情報取得を想定する
  //     findOneSpyContracts.mockReturnValue(contractdataValues)

  //     // テスト用csvファイルアップロード
  //     await csvBasicFormat.fileUpload(
  //       filePath,
  //       uploadFileName,
  //       Buffer.from(decodeURIComponent(fileData), 'base64').toString('utf8')
  //     )
  //     // 試験実施
  //     await uploadFormat.cbPostIndex(request, response, next)

  //     // 期待結果
  //     // 404，500エラーがエラーハンドリング「されない」
  //     expect(next).not.toHaveBeenCalledWith(error404)
  //     expect(next).not.toHaveBeenCalledWith(error500)
  //     // userContextがLoggedInになっている
  //     expect(request.session?.userContext).toBe('LoggedIn')
  //     // session.userRoleが'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'になっている
  //     expect(request.session?.userRole).toBe('a6a3edcd-00d9-427c-bf03-4ef0112ba16d')
  //     // uploadFormat.jsが遷移を拒否して、前URLに戻る
  //     expect(response.headers.Location).toBe('/')
  //     expect(response.statusCode).toBe(307)
  //   })

  //   test('準正常：税の100文字', async () => {
  //     // 準備
  //     // requestのsession,userIdに正常値を入れる
  //     request.session = {
  //       userContext: 'LoggedIn',
  //       userRole: 'dummy'
  //     }
  //     request.user = user

  //     // ファイルデータを設定
  //     request.body = {
  //       ...reqBodyForCbPostIndexOn,
  //       keyConsumptionTax:
  //         'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
  //     }

  //     request.Referer = '/csvBasicFormat'

  //     // DBからの正常なユーザデータの取得を想定する
  //     findOneSpy.mockReturnValue(dataValues)
  //     // DBからの正常な契約情報取得を想定する
  //     findOneSpyContracts.mockReturnValue(contractdataValues)

  //     // テスト用csvファイルアップロード
  //     await csvBasicFormat.fileUpload(
  //       filePath,
  //       uploadFileName,
  //       Buffer.from(decodeURIComponent(fileData), 'base64').toString('utf8')
  //     )
  //     // 試験実施
  //     await uploadFormat.cbPostIndex(request, response, next)

  //     // 期待結果
  //     // 404，500エラーがエラーハンドリング「されない」
  //     expect(next).not.toHaveBeenCalledWith(error404)
  //     expect(next).not.toHaveBeenCalledWith(error500)
  //     // userContextがLoggedInになっている
  //     expect(request.session?.userContext).toBe('LoggedIn')
  //     // session.userRoleが'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'になっている
  //     expect(request.session?.userRole).toBe('a6a3edcd-00d9-427c-bf03-4ef0112ba16d')
  //     // response.renderでcsvBasicFormatが呼ばれ「る」
  //     expect(response.render).toHaveBeenCalledWith('uploadFormat', {
  //       csvfilename: '12345678-cb0b-48ad-857d-4b42a44ede13_uploadFormatTest.csv',
  //       headerItems: [
  //         { item: '発行日', value: '2021-06-14' },
  //         { item: '請求書番号', value: 'UT_TEST_INVOICE_1_1' },
  //         { item: 'テナントID', value: '3cfebb4f-2338-4dc7-9523-5423a027a880' },
  //         { item: '支払期日', value: '2021-03-31' },
  //         { item: '納品日', value: '2021-03-17' },
  //         { item: '備考', value: 'test111' },
  //         { item: '銀行名', value: 'testsiten' },
  //         { item: '支店名', value: 'testbank' },
  //         { item: '科目', value: '普通' },
  //         { item: '口座番号', value: '1111111' },
  //         { item: '口座名義', value: 'kang_test' },
  //         { item: 'その他特記事項', value: '特記事項テストです。' },
  //         { item: '明細-項目ID', value: '001' },
  //         { item: '明細-内容', value: 'PC' },
  //         { item: '明細-数量', value: '100' },
  //         { item: '明細-単位', value: '個' },
  //         { item: '明細-単価', value: '100000' },
  //         { item: '明細-税（消費税／軽減税率／不課税／免税／非課税）', value: '消費税' },
  //         { item: '明細-備考', value: 'アップロードテスト' }
  //       ],
  //       selectedFormatData: ['', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
  //       taxIds: taxIdsaaaaaa,
  //       unitIds: unitIds,
  //       uploadGeneral: uploadGeneral
  //     })
  //   })

  //   test('準正常：税の100文字以上', async () => {
  //     // 準備
  //     // requestのsession,userIdに正常値を入れる
  //     request.session = {
  //       userContext: 'LoggedIn',
  //       userRole: 'dummy'
  //     }
  //     request.user = user

  //     // ファイルデータを設定
  //     request.body = {
  //       ...reqBodyForCbPostIndexOn,
  //       keyConsumptionTax:
  //         'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
  //     }

  //     request.Referer = '/csvBasicFormat'

  //     // DBからの正常なユーザデータの取得を想定する
  //     findOneSpy.mockReturnValue(dataValues)
  //     // DBからの正常な契約情報取得を想定する
  //     findOneSpyContracts.mockReturnValue(contractdataValues)

  //     // テスト用csvファイルアップロード
  //     await csvBasicFormat.fileUpload(
  //       filePath,
  //       uploadFileName,
  //       Buffer.from(decodeURIComponent(fileData), 'base64').toString('utf8')
  //     )
  //     // 試験実施
  //     await uploadFormat.cbPostIndex(request, response, next)

  //     // 期待結果
  //     // 404，500エラーがエラーハンドリング「されない」
  //     expect(next).not.toHaveBeenCalledWith(error404)
  //     expect(next).not.toHaveBeenCalledWith(error500)
  //     // userContextがLoggedInになっている
  //     expect(request.session?.userContext).toBe('LoggedIn')
  //     // session.userRoleが'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'になっている
  //     expect(request.session?.userRole).toBe('a6a3edcd-00d9-427c-bf03-4ef0112ba16d')
  //     // uploadFormat.jsが遷移を拒否して、前URLに戻る
  //     expect(response.headers.Location).toBe('/')
  //     expect(response.statusCode).toBe(307)
  //   })

  //   test('準正常：単位が重複', async () => {
  //     // 準備
  //     // requestのsession,userIdに正常値を入れる
  //     request.session = {
  //       userContext: 'LoggedIn',
  //       userRole: 'dummy'
  //     }
  //     request.user = user

  //     // ファイルデータを設定
  //     request.body = {
  //       ...reqBodyForCbPostIndexOn,
  //       keyManMonth: '8',
  //       keyBottle: '8'
  //     }

  //     request.Referer = '/csvBasicFormat'

  //     // DBからの正常なユーザデータの取得を想定する
  //     findOneSpy.mockReturnValue(dataValues)
  //     // DBからの正常な契約情報取得を想定する
  //     findOneSpyContracts.mockReturnValue(contractdataValues)

  //     // テスト用csvファイルアップロード
  //     await csvBasicFormat.fileUpload(
  //       filePath,
  //       uploadFileName,
  //       Buffer.from(decodeURIComponent(fileData), 'base64').toString('utf8')
  //     )
  //     // 試験実施
  //     await uploadFormat.cbPostIndex(request, response, next)

  //     // 期待結果
  //     // 404，500エラーがエラーハンドリング「されない」
  //     expect(next).not.toHaveBeenCalledWith(error404)
  //     expect(next).not.toHaveBeenCalledWith(error500)
  //     // userContextがLoggedInになっている
  //     expect(request.session?.userContext).toBe('LoggedIn')
  //     // session.userRoleが'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'になっている
  //     expect(request.session?.userRole).toBe('a6a3edcd-00d9-427c-bf03-4ef0112ba16d')
  //     // uploadFormat.jsが遷移を拒否して、前URLに戻る
  //     expect(response.headers.Location).toBe('/')
  //     expect(response.statusCode).toBe(307)
  //   })

  //   test('準正常：単位の100文字', async () => {
  //     // 準備
  //     // requestのsession,userIdに正常値を入れる
  //     request.session = {
  //       userContext: 'LoggedIn',
  //       userRole: 'dummy'
  //     }
  //     request.user = user

  //     // ファイルデータを設定
  //     request.body = {
  //       ...reqBodyForCbPostIndexOn,
  //       keyManMonth:
  //         'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
  //     }

  //     request.Referer = '/csvBasicFormat'

  //     // DBからの正常なユーザデータの取得を想定する
  //     findOneSpy.mockReturnValue(dataValues)
  //     // DBからの正常な契約情報取得を想定する
  //     findOneSpyContracts.mockReturnValue(contractdataValues)

  //     // テスト用csvファイルアップロード
  //     await csvBasicFormat.fileUpload(
  //       filePath,
  //       uploadFileName,
  //       Buffer.from(decodeURIComponent(fileData), 'base64').toString('utf8')
  //     )
  //     // 試験実施
  //     await uploadFormat.cbPostIndex(request, response, next)

  //     // 期待結果
  //     // 404，500エラーがエラーハンドリング「されない」
  //     expect(next).not.toHaveBeenCalledWith(error404)
  //     expect(next).not.toHaveBeenCalledWith(error500)
  //     // userContextがLoggedInになっている
  //     expect(request.session?.userContext).toBe('LoggedIn')
  //     // session.userRoleが'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'になっている
  //     expect(request.session?.userRole).toBe('a6a3edcd-00d9-427c-bf03-4ef0112ba16d')
  //     // response.renderでcsvBasicFormatが呼ばれ「る」
  //     expect(response.render).toHaveBeenCalledWith('uploadFormat', {
  //       csvfilename: '12345678-cb0b-48ad-857d-4b42a44ede13_uploadFormatTest.csv',
  //       headerItems: [
  //         { item: '発行日', value: '2021-06-14' },
  //         { item: '請求書番号', value: 'UT_TEST_INVOICE_1_1' },
  //         { item: 'テナントID', value: '3cfebb4f-2338-4dc7-9523-5423a027a880' },
  //         { item: '支払期日', value: '2021-03-31' },
  //         { item: '納品日', value: '2021-03-17' },
  //         { item: '備考', value: 'test111' },
  //         { item: '銀行名', value: 'testsiten' },
  //         { item: '支店名', value: 'testbank' },
  //         { item: '科目', value: '普通' },
  //         { item: '口座番号', value: '1111111' },
  //         { item: '口座名義', value: 'kang_test' },
  //         { item: 'その他特記事項', value: '特記事項テストです。' },
  //         { item: '明細-項目ID', value: '001' },
  //         { item: '明細-内容', value: 'PC' },
  //         { item: '明細-数量', value: '100' },
  //         { item: '明細-単位', value: '個' },
  //         { item: '明細-単価', value: '100000' },
  //         { item: '明細-税（消費税／軽減税率／不課税／免税／非課税）', value: '消費税' },
  //         { item: '明細-備考', value: 'アップロードテスト' }
  //       ],
  //       selectedFormatData: ['', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
  //       taxIds: taxIds,
  //       unitIds: unitIdsaaaaaa,
  //       uploadGeneral: uploadGeneral
  //     })
  //   })

  //   test('準正常：単位の100文字', async () => {
  //     // 準備
  //     // requestのsession,userIdに正常値を入れる
  //     request.session = {
  //       userContext: 'LoggedIn',
  //       userRole: 'dummy'
  //     }
  //     request.user = user

  //     // ファイルデータを設定
  //     request.body = {
  //       ...reqBodyForCbPostIndexOn,
  //       keyManMonth:
  //         'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
  //     }

  //     request.Referer = '/csvBasicFormat'

  //     // DBからの正常なユーザデータの取得を想定する
  //     findOneSpy.mockReturnValue(dataValues)
  //     // DBからの正常な契約情報取得を想定する
  //     findOneSpyContracts.mockReturnValue(contractdataValues)

  //     // テスト用csvファイルアップロード
  //     await csvBasicFormat.fileUpload(
  //       filePath,
  //       uploadFileName,
  //       Buffer.from(decodeURIComponent(fileData), 'base64').toString('utf8')
  //     )
  //     // 試験実施
  //     await uploadFormat.cbPostIndex(request, response, next)

  //     // 期待結果
  //     // 404，500エラーがエラーハンドリング「されない」
  //     expect(next).not.toHaveBeenCalledWith(error404)
  //     expect(next).not.toHaveBeenCalledWith(error500)
  //     // userContextがLoggedInになっている
  //     expect(request.session?.userContext).toBe('LoggedIn')
  //     // session.userRoleが'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'になっている
  //     expect(request.session?.userRole).toBe('a6a3edcd-00d9-427c-bf03-4ef0112ba16d')
  //     // uploadFormat.jsが遷移を拒否して、前URLに戻る
  //     expect(response.headers.Location).toBe('/')
  //     expect(response.statusCode).toBe(307)
  //   })

  //   test('異常：500エラー（session、userIdエラー）', async () => {
  //     // 準備
  //     // requestのsession,userIdに不正な値を入れる
  //     request.session = null

  //     request.user = null
  //     // DBからのユーザデータの取得ができなかった(null)場合を想定する
  //     findOneSpy.mockReturnValue(null)
  //     findOneSpyContracts.mockReturnValue(contractdataValues)

  //     // 試験実施
  //     await uploadFormat.cbPostIndex(request, response, next)

  //     // 期待結果
  //     // 404エラーがエラーハンドリング「されない」
  //     expect(next).not.toHaveBeenCalledWith(error404)
  //     // 500エラーがエラーハンドリング「される」
  //     expect(next).toHaveBeenCalledWith(error500)
  //   })

  //   test('異常：500エラー（DBからユーザ取得エラー）', async () => {
  //     // 準備
  //     // requestのsession,userIdに正常値を入れる
  //     request.session = {
  //       userContext: 'LoggedIn',
  //       userRole: 'dummy'
  //     }
  //     request.user = user
  //     // DBからのユーザデータの取得ができなかった(null)場合を想定する
  //     findOneSpy.mockReturnValue(null)
  //     findOneSpyContracts.mockReturnValue(contractdataValues)

  //     // 試験実施
  //     await uploadFormat.cbPostIndex(request, response, next)

  //     // 期待結果
  //     // 404エラーがエラーハンドリング「されない」
  //     expect(next).not.toHaveBeenCalledWith(error404)
  //     // 500エラーがエラーハンドリング「される」
  //     expect(next).toHaveBeenCalledWith(error500)
  //   })

  //   test('異常：404エラーDBから取得したユーザのuserStatusが0以外の場合', async () => {
  //     // 準備
  //     // requestのsession,userIdに正常値を入れる
  //     request.session = {
  //       userContext: 'NotLoggedIn',
  //       userRole: 'dummy'
  //     }
  //     request.user = user
  //     // DBから取得したユーザデータのuserStatusが0以外の場合を想定する
  //     findOneSpy.mockReturnValue(dataValuesStatuserr)
  //     findOneSpyContracts.mockReturnValue(contractdataValues)

  //     // 試験実施
  //     await uploadFormat.cbPostIndex(request, response, next)

  //     // 期待結果
  //     // 404エラーがエラーハンドリング「される」
  //     expect(next).toHaveBeenCalledWith(error404)
  //   })

  //   test('異常：500エラー（不正なContractStatus）', async () => {
  //     // 準備
  //     // requestのsession,userIdに正常値を入れる
  //     request.session = {
  //       userContext: 'LoggedIn',
  //       userRole: 'dummy'
  //     }
  //     request.user = user

  //     // DBからの正常なユーザデータの取得を想定する
  //     findOneSpy.mockReturnValue(dataValues)
  //     // DBからの不正な契約情報取得を想定する
  //     findOneSpyContracts.mockReturnValue(null)

  //     // 試験実施
  //     await uploadFormat.cbPostIndex(request, response, next)

  //     // 期待結果
  //     // 404，500エラーがエラーハンドリング「されない」
  //     expect(next).not.toHaveBeenCalledWith(error404)
  //     // 500エラーがエラーハンドリング「される」
  //     expect(next).toHaveBeenCalledWith(error500)
  //   })

  //   test('異常：500エラー（不正なContractStatus）', async () => {
  //     // 準備
  //     // requestのsession,userIdに正常値を入れる
  //     request.session = {
  //       userContext: 'LoggedIn',
  //       userRole: 'dummy'
  //     }
  //     request.user = user

  //     // DBからの正常なユーザデータの取得を想定する
  //     findOneSpy.mockReturnValue(dataValues)
  //     // DBからの不正な契約情報取得を想定する
  //     findOneSpyContracts.mockReturnValue(contractdataValues4)

  //     helper.checkContractStatus = 999

  //     // 試験実施
  //     await uploadFormat.cbPostIndex(request, response, next)

  //     // 期待結果
  //     // 404，500エラーがエラーハンドリング「されない」
  //     expect(next).not.toHaveBeenCalledWith(error404)
  //     // 500エラーがエラーハンドリング「される」
  //     expect(next).toHaveBeenCalledWith(error500)
  //   })
  // })

  // // -----------------------------------------------------------------------------------------
  // // cbPostIndexの確認

  // describe('cbPostConfirmIndex', () => {
  //   test('正常', async () => {
  //     // 準備
  //     // requestのsession,userIdに正常値を入れる
  //     request.session = {
  //       userContext: 'LoggedIn',
  //       userRole: 'dummy'
  //     }
  //     request.user = user
  //     // ファイルデータを設定
  //     request.body = {
  //       ...reqBodyForCbPostIndexOn
  //     }

  //     // DBからの正常なユーザデータの取得を想定する
  //     findOneSpy.mockReturnValue(dataValues)
  //     // DBからの正常な契約情報取得を想定する
  //     findOneSpyContracts.mockReturnValue(contractdataValues)

  //     helper.checkContractStatus = 10

  //     // 試験実施
  //     await uploadFormat.cbPostConfirmIndex(request, response, next)

  //     // 期待結果
  //     // 404，500エラーがエラーハンドリング「されない」
  //     expect(next).not.toHaveBeenCalledWith(error404)
  //     expect(next).not.toHaveBeenCalledWith(error500)
  //     // userContextがLoggedInになっている
  //     expect(request.session?.userContext).toBe('LoggedIn')
  //     // session.userRoleが'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'になっている
  //     expect(request.session?.userRole).toBe('a6a3edcd-00d9-427c-bf03-4ef0112ba16d')
  //     // response.renderでcsvConfirmFormatが呼ばれ「る」
  //     expect(response.redirect).toHaveBeenCalledWith(307, '/csvConfirmFormat')
  //   })

  //   test('準正常：解約中', async () => {
  //     // 準備
  //     // requestのsession,userIdに正常値を入れる
  //     request.session = {
  //       userContext: 'LoggedIn',
  //       userRole: 'dummy'
  //     }
  //     request.user = user

  //     // ファイルデータを設定
  //     request.body = {
  //       ...reqBodyForCbPostIndexOn
  //     }

  //     // DBからの正常なユーザデータの取得を想定する
  //     findOneSpy.mockReturnValue(dataValues)
  //     // DBからの正常な契約情報取得を想定する
  //     findOneSpyContracts.mockReturnValue(contractInfoDatatoBeReceiptCancel)

  //     // 試験実施
  //     await uploadFormat.cbPostConfirmIndex(request, response, next)

  //     // 期待結果
  //     // 404，500エラーがエラーハンドリング「されない」
  //     expect(next).not.toHaveBeenCalledWith(error404)
  //     expect(next).not.toHaveBeenCalledWith(error500)

  //     // 解約手続き中画面が表示「される」
  //     expect(next).toHaveBeenCalledWith(noticeHelper.create('cancelprocedure'))
  //   })

  //   test('異常：500エラー（DBからユーザ取得エラー）', async () => {
  //     // 準備
  //     // requestのsession,userIdに正常値を入れる
  //     request.session = {
  //       userContext: 'LoggedIn',
  //       userRole: 'dummy'
  //     }
  //     request.user = user
  //     // DBからのユーザデータの取得ができなかった(null)場合を想定する
  //     findOneSpy.mockReturnValue(null)
  //     findOneSpyContracts.mockReturnValue(contractdataValues)

  //     // 試験実施
  //     await uploadFormat.cbPostConfirmIndex(request, response, next)

  //     // 期待結果
  //     // 404エラーがエラーハンドリング「されない」
  //     expect(next).not.toHaveBeenCalledWith(error404)
  //     // 500エラーがエラーハンドリング「される」
  //     expect(next).toHaveBeenCalledWith(error500)
  //   })

  //   test('異常：404エラーDBから取得したユーザのuserStatusが0以外の場合', async () => {
  //     // 準備
  //     // requestのsession,userIdに正常値を入れる
  //     request.session = {
  //       userContext: 'NotLoggedIn',
  //       userRole: 'dummy'
  //     }
  //     request.user = user
  //     // DBから取得したユーザデータのuserStatusが0以外の場合を想定する
  //     findOneSpy.mockReturnValue(dataValuesStatuserr)
  //     findOneSpyContracts.mockReturnValue(contractdataValues)

  //     // 試験実施
  //     await uploadFormat.cbPostConfirmIndex(request, response, next)

  //     // 期待結果
  //     // 404エラーがエラーハンドリング「される」
  //     expect(next).toHaveBeenCalledWith(error404)
  //   })

  //   test('異常：500エラー（不正なContractStatus）', async () => {
  //     // 準備
  //     // requestのsession,userIdに正常値を入れる
  //     request.session = {
  //       userContext: 'LoggedIn',
  //       userRole: 'dummy'
  //     }
  //     request.user = user

  //     // DBからの正常なユーザデータの取得を想定する
  //     findOneSpy.mockReturnValue(dataValues)
  //     // DBからの不正な契約情報取得を想定する
  //     findOneSpyContracts.mockReturnValue(null)

  //     // 試験実施
  //     await uploadFormat.cbPostConfirmIndex(request, response, next)

  //     // 期待結果
  //     // 404，500エラーがエラーハンドリング「されない」
  //     expect(next).not.toHaveBeenCalledWith(error404)
  //     // 500エラーがエラーハンドリング「される」
  //     expect(next).toHaveBeenCalledWith(error500)
  //   })

  //   test('異常：500エラー（不正なContractStatus）', async () => {
  //     // 準備
  //     // requestのsession,userIdに正常値を入れる
  //     request.session = {
  //       userContext: 'LoggedIn',
  //       userRole: 'dummy'
  //     }
  //     request.user = user

  //     // DBからの正常なユーザデータの取得を想定する
  //     findOneSpy.mockReturnValue(dataValues)
  //     // DBからの不正な契約情報取得を想定する
  //     findOneSpyContracts.mockReturnValue(contractdataValues4)

  //     helper.checkContractStatus = 999

  //     // 試験実施
  //     await uploadFormat.cbPostConfirmIndex(request, response, next)

  //     // 期待結果
  //     // 404，500エラーがエラーハンドリング「されない」
  //     expect(next).not.toHaveBeenCalledWith(error404)
  //     // 500エラーがエラーハンドリング「される」
  //     expect(next).toHaveBeenCalledWith(error500)
  //   })
  // })

  // // -----------------------------------------------------------------------------------------
  // // cbRemoveCsvの確認

  // describe('cbRemoveCsv', () => {
  //   test('正常', async () => {
  //     // 準備
  //     request.user = user

  //     // テスト用csvファイルアップロード
  //     await csvBasicFormat.fileUpload(
  //       filePath,
  //       uploadFileName,
  //       Buffer.from(decodeURIComponent(fileData), 'base64').toString('utf8')
  //     )

  //     // 試験実施
  //     const resultRemove = await uploadFormat.cbRemoveCsv(filePath, uploadFileName)

  //     // 期待結果
  //     expect(resultRemove).toBeTruthy()
  //   })

  //   test('異常:ファイルパスが存在しない場合', async () => {
  //     // 準備
  //     request.user = user

  //     // 試験実施
  //     const resultRemove = await uploadFormat.cbRemoveCsv('/test', fileName, uploadFileName)

  //     // 期待結果
  //     expect(resultRemove).toBeFalsy()
  //   })
  // })

  // // -----------------------------------------------------------------------------------------
  // // cbPostBackIndexの確認

  // describe('cbPostBackIndex', () => {
  //   test('正常', async () => {
  //     // 準備
  //     // requestのsession,userIdに正常値を入れる
  //     request.session = {
  //       userContext: 'LoggedIn',
  //       userRole: 'dummy'
  //     }
  //     request.user = user
  //     // ファイルデータを設定
  //     request.body = {
  //       ...reqBodyForCbPostIndexOn
  //     }

  //     // DBからの正常なユーザデータの取得を想定する
  //     findOneSpy.mockReturnValue(dataValues)
  //     // DBからの正常な契約情報取得を想定する
  //     findOneSpyContracts.mockReturnValue(contractdataValues)

  //     helper.checkContractStatus = 10

  //     // 試験実施
  //     await uploadFormat.cbPostBackIndex(request, response, next)

  //     // 期待結果
  //     // 404，500エラーがエラーハンドリング「されない」
  //     expect(next).not.toHaveBeenCalledWith(error404)
  //     expect(next).not.toHaveBeenCalledWith(error500)
  //     // userContextがLoggedInになっている
  //     expect(request.session?.userContext).toBe('LoggedIn')
  //     // session.userRoleが'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'になっている
  //     expect(request.session?.userRole).toBe('a6a3edcd-00d9-427c-bf03-4ef0112ba16d')
  //     // response.renderでcsvConfirmFormatが呼ばれ「る」
  //     expect(response.redirect).toHaveBeenCalledWith('/csvBasicFormat')
  //   })

  //   test('準正常：解約中', async () => {
  //     // 準備
  //     // requestのsession,userIdに正常値を入れる
  //     request.session = {
  //       userContext: 'LoggedIn',
  //       userRole: 'dummy'
  //     }
  //     request.user = user

  //     // ファイルデータを設定
  //     request.body = {
  //       ...reqBodyForCbPostIndexOn
  //     }

  //     // DBからの正常なユーザデータの取得を想定する
  //     findOneSpy.mockReturnValue(dataValues)
  //     // DBからの正常な契約情報取得を想定する
  //     findOneSpyContracts.mockReturnValue(contractInfoDatatoBeReceiptCancel)

  //     // 試験実施
  //     await uploadFormat.cbPostBackIndex(request, response, next)

  //     // 期待結果
  //     // 404，500エラーがエラーハンドリング「されない」
  //     expect(next).not.toHaveBeenCalledWith(error404)
  //     expect(next).not.toHaveBeenCalledWith(error500)

  //     // 解約手続き中画面が表示「される」
  //     expect(next).toHaveBeenCalledWith(noticeHelper.create('cancelprocedure'))
  //   })

  //   test('異常：500エラー（DBからユーザ取得エラー）', async () => {
  //     // 準備
  //     // requestのsession,userIdに正常値を入れる
  //     request.session = {
  //       userContext: 'LoggedIn',
  //       userRole: 'dummy'
  //     }
  //     request.user = user
  //     // DBからのユーザデータの取得ができなかった(null)場合を想定する
  //     findOneSpy.mockReturnValue(null)
  //     findOneSpyContracts.mockReturnValue(contractdataValues)

  //     // 試験実施
  //     await uploadFormat.cbPostBackIndex(request, response, next)

  //     // 期待結果
  //     // 404エラーがエラーハンドリング「されない」
  //     expect(next).not.toHaveBeenCalledWith(error404)
  //     // 500エラーがエラーハンドリング「される」
  //     expect(next).toHaveBeenCalledWith(error500)
  //   })

  //   test('異常：404エラーDBから取得したユーザのuserStatusが0以外の場合', async () => {
  //     // 準備
  //     // requestのsession,userIdに正常値を入れる
  //     request.session = {
  //       userContext: 'NotLoggedIn',
  //       userRole: 'dummy'
  //     }
  //     request.user = user
  //     // DBから取得したユーザデータのuserStatusが0以外の場合を想定する
  //     findOneSpy.mockReturnValue(dataValuesStatuserr)
  //     findOneSpyContracts.mockReturnValue(contractdataValues)

  //     // 試験実施
  //     await uploadFormat.cbPostBackIndex(request, response, next)

  //     // 期待結果
  //     // 404エラーがエラーハンドリング「される」
  //     expect(next).toHaveBeenCalledWith(error404)
  //   })

  //   test('異常：500エラー（不正なContractStatus）', async () => {
  //     // 準備
  //     // requestのsession,userIdに正常値を入れる
  //     request.session = {
  //       userContext: 'LoggedIn',
  //       userRole: 'dummy'
  //     }
  //     request.user = user

  //     // DBからの正常なユーザデータの取得を想定する
  //     findOneSpy.mockReturnValue(dataValues)
  //     // DBからの不正な契約情報取得を想定する
  //     findOneSpyContracts.mockReturnValue(null)

  //     // 試験実施
  //     await uploadFormat.cbPostBackIndex(request, response, next)

  //     // 期待結果
  //     // 404，500エラーがエラーハンドリング「されない」
  //     expect(next).not.toHaveBeenCalledWith(error404)
  //     // 500エラーがエラーハンドリング「される」
  //     expect(next).toHaveBeenCalledWith(error500)
  //   })

  //   test('異常：500エラー（不正なContractStatus）', async () => {
  //     // 準備
  //     // requestのsession,userIdに正常値を入れる
  //     request.session = {
  //       userContext: 'LoggedIn',
  //       userRole: 'dummy'
  //     }
  //     request.user = user

  //     // DBからの正常なユーザデータの取得を想定する
  //     findOneSpy.mockReturnValue(dataValues)
  //     // DBからの不正な契約情報取得を想定する
  //     findOneSpyContracts.mockReturnValue(contractdataValues4)

  //     helper.checkContractStatus = 999

  //     // 試験実施
  //     await uploadFormat.cbPostBackIndex(request, response, next)

  //     // 期待結果
  //     // 404，500エラーがエラーハンドリング「されない」
  //     expect(next).not.toHaveBeenCalledWith(error404)
  //     // 500エラーがエラーハンドリング「される」
  //     expect(next).toHaveBeenCalledWith(error500)

  //     helper.checkContractStatus = 10
  //   })
  // })
})
