/* eslint-disable new-cap */
'use strict'

jest.mock('../../Application/node_modules/express', () => {
  return require('jest-express')
})

const uploadFormatEdit = require('../../Application/routes/uploadFormatEdit')
const Request = require('jest-express').Request
const Response = require('jest-express').Response
const next = require('jest-express').Next
const helper = require('../../Application/routes/helpers/middleware')
const userController = require('../../Application/controllers/userController.js')
const contractController = require('../../Application/controllers/contractController.js')
const tenantController = require('../../Application/controllers/tenantController')
const uploadFormatController = require('../../Application/controllers/uploadFormatController')
const logger = require('../../Application/lib/logger.js')
const path = require('path')
const noticeHelper = require('../../Application/routes/helpers/notice')

const userBase = {
  email: 'dummy@testdummy.com',
  userId: '1b580d19-c0c8-463b-8935-16e82577f282',
  tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089',
  accessToken: 'dummyAccessToken',
  refreshToken: 'dummyRefreshToken'
}

// 404エラー定義
const error404 = new Error('お探しのページは見つかりませんでした。')
error404.name = 'Not Found'
error404.status = 404

// 500エラー定義
const error500 = new Error('サーバ内部でエラーが発生しました。')
error500.name = 'Internal Server Error'
error500.status = 500

if (process.env.LOCALLY_HOSTED === 'true') {
  // NODE_ENVはJestがデフォルトでtestに指定する。dotenvで上書きできなかったため、package.jsonの実行引数でdevelopmentを指定
  require('dotenv').config({ path: './config/.envUploadFormat' })
}
let request, response
let infoSpy,
  userFindOneSpy,
  findOneSypTenant,
  findOneSpyContracts,
  pathSpy,
  controllerSpyUploadFormat,
  findContractSpyContracts,
  controllerSpyChangeUploadFormat,
  helpercheckContractStatusSpy
let user
describe('uploadFormatのテスト', () => {
  beforeEach(() => {
    request = new Request()
    response = new Response()
    infoSpy = jest.spyOn(logger, 'info')
    userFindOneSpy = jest.spyOn(userController, 'findOne')
    findOneSypTenant = jest.spyOn(tenantController, 'findOne')
    findOneSpyContracts = jest.spyOn(contractController, 'findOne')
    findContractSpyContracts = jest.spyOn(contractController, 'findContract')
    pathSpy = jest.spyOn(path, 'join')
    controllerSpyUploadFormat = jest.spyOn(uploadFormatController, 'getDataForUploadFormat')
    controllerSpyChangeUploadFormat = jest.spyOn(uploadFormatController, 'changeDataForUploadFormat')
    helpercheckContractStatusSpy = jest.spyOn(helper, 'checkContractStatus')
    user = { ...userBase }
  })
  afterEach(() => {
    request.resetMocked()
    response.resetMocked()
    next.mockReset()
    infoSpy.mockRestore()
    userFindOneSpy.mockRestore()
    findOneSypTenant.mockRestore()
    findOneSpyContracts.mockRestore()
    findContractSpyContracts.mockRestore()
    pathSpy.mockRestore()
    controllerSpyUploadFormat.mockRestore()
    controllerSpyChangeUploadFormat.mockRestore()
    helpercheckContractStatusSpy.mockRestore()
  })

  describe('ルーティング', () => {
    test('uploadFormatのルーティングを確認', async () => {
      expect(uploadFormatEdit.router.get).toHaveBeenCalledTimes(1)
      expect(uploadFormatEdit.router.get).toHaveBeenLastCalledWith(
        '/:uploadFormatId',
        helper.isAuthenticated,
        uploadFormatEdit.cbGetIndex
      )
    })
  })

  // -----------------------------------------------------------------------------------------
  // cbGetIndex

  describe('cbGetIndex', () => {
    test('異常：500エラーセッション無', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = undefined

      request.user = user

      // 試験実施
      await uploadFormatEdit.cbGetIndex(request, response, next)

      // 期待結果
      // 404エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      // 500エラーがエラーハンドリング「される」
      expect(next).toHaveBeenCalledWith(error500)
    })

    test('異常：500エラーユーザーDBエラー', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = {
        userContext: 'LoggedIn',
        userRole: 'dummy'
      }
      request.user = user

      // DBからの正常なユーザデータの取得を想定する
      userFindOneSpy.mockReturnValue(new Error('User Table Error'))

      // 試験実施
      await uploadFormatEdit.cbGetIndex(request, response, next)

      // 期待結果
      // 404エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      // 500エラーがエラーハンドリング「される」
      expect(next).toHaveBeenCalledWith(error500)
    })

    test('異常：404エラーユーザーステータス0以外', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = {
        userContext: 'LoggedIn',
        userRole: 'dummy'
      }
      request.user = user

      // DBからの正常なユーザデータの取得を想定する
      userFindOneSpy.mockReturnValue({
        dataValues: {
          userStatus: 1
        }
      })

      // 試験実施
      await uploadFormatEdit.cbGetIndex(request, response, next)

      // 期待結果
      // 404エラーがエラーハンドリング「される」
      expect(next).toHaveBeenCalledWith(error404)
      // 500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error500)
    })

    test('異常：500エラー契約テーブルエラー', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = {
        userContext: 'LoggedIn',
        userRole: 'dummy'
      }
      request.user = user

      // DBからの正常なユーザデータの取得を想定する
      userFindOneSpy.mockReturnValue({
        dataValues: {
          userStatus: 0
        }
      })
      findOneSpyContracts.mockReturnValue(new Error('契約テーブルエラー'))

      // 試験実施
      await uploadFormatEdit.cbGetIndex(request, response, next)

      // 期待結果
      // 404エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      // 500エラーがエラーハンドリング「される」
      expect(next).toHaveBeenCalledWith(error500)
    })

    test('異常：500エラー契約ステータスnull', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = {
        userContext: 'LoggedIn',
        userRole: 'dummy'
      }
      request.user = user

      // DBからの正常なユーザデータの取得を想定する
      userFindOneSpy.mockReturnValue({
        dataValues: {
          userStatus: 0
        }
      })
      findOneSpyContracts.mockReturnValue({
        dataValues: {
          contractId: '15e2d952-8ba0-42a4-1111-b234cb4a2089',
          tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089',
          contractStatus: null,
          deleteFlag: 0
        }
      })
      findOneSypTenant.mockReturnValue({
        dataValues: {
          tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089'
        }
      })

      // 試験実施
      await uploadFormatEdit.cbGetIndex(request, response, next)

      // 期待結果
      // 404エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      // 500エラーがエラーハンドリング「される」
      expect(next).toHaveBeenCalledWith(error500)
    })

    test('異常：500エラー契約ステータス999', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = {
        userContext: 'LoggedIn',
        userRole: 'dummy'
      }
      request.user = user

      // DBからの正常なユーザデータの取得を想定する
      userFindOneSpy.mockReturnValue({
        dataValues: {
          userStatus: 0
        }
      })
      findOneSpyContracts.mockReturnValue({
        dataValues: {
          contractId: '15e2d952-8ba0-42a4-1111-b234cb4a2089',
          tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089',
          contractStatus: 999,
          deleteFlag: 0
        }
      })
      findOneSypTenant.mockReturnValue({
        dataValues: {
          tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089'
        }
      })
      helper.checkContractStatus = 999

      // 試験実施
      await uploadFormatEdit.cbGetIndex(request, response, next)

      // 期待結果
      // 404エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      // 500エラーがエラーハンドリング「される」
      expect(next).toHaveBeenCalledWith(error500)
    })

    test('異常：解約ステータス30', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = {
        userContext: 'LoggedIn',
        userRole: 'dummy'
      }
      request.user = user

      // DBからの正常なユーザデータの取得を想定する
      userFindOneSpy.mockReturnValue({
        dataValues: {
          userStatus: 0
        }
      })
      findOneSpyContracts.mockReturnValue({
        dataValues: {
          contractId: '15e2d952-8ba0-42a4-1111-b234cb4a2089',
          tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089',
          contractStatus: '30',
          deleteFlag: false
        }
      })
      findOneSypTenant.mockReturnValue({
        dataValues: {
          tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089'
        }
      })
      helper.checkContractStatus = 0

      // 試験実施
      await uploadFormatEdit.cbGetIndex(request, response, next)

      // 期待結果
      // 404エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      // 解約手続き中画面が表示「される」
      expect(next).toHaveBeenCalledWith(noticeHelper.create('cancelprocedure'))
    })

    test('異常：解約ステータス31', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = {
        userContext: 'LoggedIn',
        userRole: 'dummy'
      }
      request.user = user

      // DBからの正常なユーザデータの取得を想定する
      userFindOneSpy.mockReturnValue({
        dataValues: {
          userStatus: 0
        }
      })
      findOneSpyContracts.mockReturnValue({
        dataValues: {
          contractId: '15e2d952-8ba0-42a4-1111-b234cb4a2089',
          tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089',
          contractStatus: '31',
          deleteFlag: false
        }
      })
      findOneSypTenant.mockReturnValue({
        dataValues: {
          tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089'
        }
      })

      // 試験実施
      await uploadFormatEdit.cbGetIndex(request, response, next)

      // 期待結果
      // 404エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      // 解約手続き中画面が表示「される」
      expect(next).toHaveBeenCalledWith(noticeHelper.create('cancelprocedure'))
    })

    test('異常：uploadFormatDBエラー', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = {
        userContext: 'LoggedIn',
        userRole: 'dummy'
      }
      request.user = user

      // DBからの正常なユーザデータの取得を想定する
      userFindOneSpy.mockReturnValue({
        dataValues: {
          userStatus: 0
        }
      })
      findOneSpyContracts.mockReturnValue({
        dataValues: {
          contractId: '15e2d952-8ba0-42a4-1111-b234cb4a2089',
          tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089',
          contractStatus: '00',
          deleteFlag: false
        }
      })
      findOneSypTenant.mockReturnValue({
        dataValues: {
          tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089'
        }
      })
      controllerSpyUploadFormat.mockReturnValue(new Error('uploadFormatController Error'))

      // 試験実施
      await uploadFormatEdit.cbGetIndex(request, response, next)

      // 期待結果
      // 404エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      // 500エラーがエラーハンドリング「される」
      expect(next).toHaveBeenCalledWith(error500)
    })

    test('正常', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = {
        userContext: 'LoggedIn',
        userRole: 'dummy'
      }
      request.user = user
      request.params = {
        uploadFormatId: 'd1791550-7c28-4ad5-8c52-c57253b84843'
      }
      const constantsDefine = require('../../Application/constants')
      const csvTax = constantsDefine.csvFormatDefine.csvTax
      const csvUnit = constantsDefine.csvFormatDefine.csvUnit
      const result = {
        headerItems: [
          { item: '備考', value: '2021/10/11' },
          { item: '支払期日', value: 'PBI147902001' },
          { item: 'テナントID', value: '221559d0-53aa-44a2-ab29-0c4a6cb02bde' },
          { item: '請求書番号', value: '2021/10/12' },
          { item: '納品日', value: '2021/10/12' },
          { item: '発行日', value: 'PBI1479_手動試験' },
          { item: '銀行名', value: '手動銀行' },
          { item: '支店名', value: '手動支店' },
          { item: '科目', value: '普通' },
          { item: '口座番号', value: '1234567' },
          { item: '口座名義', value: '手動' },
          { item: 'その他特記事項', value: '請求書一括作成_2.csv' },
          { item: '明細-項目ID', value: '1' },
          { item: '明細-内容', value: '明細１' },
          { item: '明細-数量', value: '1' },
          { item: '明細-単位', value: 'test1' },
          { item: '明細-単価', value: '100000' },
          { item: '明細-税', value: '免税' },
          { item: '明細-備考', value: '手動試験データ' }
        ],
        columnArr: [
          { columnName: '発行日', item: '', value: '' },
          { columnName: '請求書番号', item: '', value: '' },
          { columnName: 'テナントID', item: '', value: '' },
          { columnName: '支払期日', item: '', value: '' },
          { columnName: '納品日', item: '', value: '' },
          { columnName: '備考', item: '', value: '' },
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
        ],
        uploadGeneral: { uploadFormatItemName: 'aaa', uploadType: '請求書データ' },
        taxIds: {
          keyConsumptionTax: { key: 'keyConsumptionTax', value: '1212', itemName: '消費税' },
          keyReducedTax: { key: 'keyReducedTax', value: '', itemName: '軽減税率' },
          keyFreeTax: { key: 'keyFreeTax', value: '', itemName: '不課税' },
          keyDutyFree: { key: 'keyDutyFree', value: '', itemName: '免税' },
          keyExemptTax: { key: 'keyExemptTax', value: '', itemName: '非課税' }
        },
        unitIds: {
          keyManMonth: { key: 'keyManMonth', value: '', itemName: '人月' },
          keyBottle: { key: 'keyBottle', value: '', itemName: 'ボトル' },
          keyCost: { key: 'keyCost', value: '', itemName: 'コスト' },
          keyContainer: { key: 'keyContainer', value: '', itemName: 'コンテナ' },
          keyCentilitre: { key: 'keyCentilitre', value: '', itemName: 'センチリットル' },
          keySquareCentimeter: {
            key: 'keySquareCentimeter',
            value: '1212',
            itemName: '平方センチメートル'
          },
          keyCubicCentimeter: { key: 'keyCubicCentimeter', value: '', itemName: '立方センチメートル' },
          keyCentimeter: { key: 'keyCentimeter', value: '12121', itemName: 'センチメートル' },
          keyCase: { key: 'keyCase', value: '', itemName: 'ケース' },
          keyCarton: { key: 'keyCarton', value: '', itemName: 'カートン' },
          keyDay: { key: 'keyDay', value: '', itemName: '日' },
          keyDeciliter: { key: 'keyDeciliter', value: '', itemName: 'デシリットル' },
          keyDecimeter: { key: 'keyDecimeter', value: '', itemName: 'デシメートル' },
          keyGrossKilogram: { key: 'keyGrossKilogram', value: '', itemName: 'グロス・キログラム' },
          keyPieces: { key: 'keyPieces', value: '', itemName: '個' },
          keyFeet: { key: 'keyFeet', value: '', itemName: 'フィート' },
          keyGallon: { key: 'keyGallon', value: '', itemName: 'ガロン' },
          keyGram: { key: 'keyGram', value: '', itemName: 'グラム' },
          keyGrossTonnage: { key: 'keyGrossTonnage', value: '', itemName: '総トン' },
          keyHour: { key: 'keyHour', value: '', itemName: '時間' },
          keyKilogram: { key: 'keyKilogram', value: '', itemName: 'キログラム' },
          keyKilometers: { key: 'keyKilometers', value: '', itemName: 'キロメートル' },
          keyKilowattHour: { key: 'keyKilowattHour', value: '', itemName: 'キロワット時' },
          keyPound: { key: 'keyPound', value: '', itemName: 'ポンド' },
          keyLiter: { key: 'keyLiter', value: '', itemName: 'リットル' },
          keyMilligram: { key: 'keyMilligram', value: '', itemName: 'ミリグラム' },
          keyMilliliter: { key: 'keyMilliliter', value: '', itemName: 'ミリリットル' },
          keyMillimeter: { key: 'keyMillimeter', value: '', itemName: 'ミリメートル' },
          keyMonth: { key: 'keyMonth', value: '', itemName: '月' },
          keySquareMeter: { key: 'keySquareMeter', value: '', itemName: '平方メートル' },
          keyCubicMeter: { key: 'keyCubicMeter', value: '', itemName: '立方メートル' },
          keyMeter: { key: 'keyMeter', value: '', itemName: 'メーター' },
          keyNetTonnage: { key: 'keyNetTonnage', value: '', itemName: '純トン' },
          keyPackage: { key: 'keyPackage', value: '', itemName: '包' },
          keyRoll: { key: 'keyRoll', value: '', itemName: '巻' },
          keyFormula: { key: 'keyFormula', value: '', itemName: '式' },
          keyTonnage: { key: 'keyTonnage', value: '', itemName: 'トン' },
          keyOthers: { key: 'keyOthers', value: '', itemName: 'その他' }
        },
        csvfilename: '/51f3eb20-82a5-4900-acd2-4281621be954_1697_1.csv',
        selectedFormatData: [
          '1',
          '3',
          '4',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '18',
          '19',
          '16',
          '11',
          '13',
          '15',
          '14',
          ''
        ],
        itemRowNo: '1',
        dataStartRowNo: '2',
        checkItemNameLine: 'on'
      }

      // DBからの正常なユーザデータの取得を想定する
      userFindOneSpy.mockReturnValue({
        dataValues: {
          userStatus: 0
        }
      })
      findOneSpyContracts.mockReturnValue({
        dataValues: {
          contractId: '15e2d952-8ba0-42a4-1111-b234cb4a2089',
          tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089',
          contractStatus: '00',
          deleteFlag: 0
        }
      })
      findOneSypTenant.mockReturnValue({
        dataValues: {
          tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089'
        }
      })
      controllerSpyUploadFormat.mockReturnValue(result)
      helpercheckContractStatusSpy.mockReturnValue(0)
      // 試験実施
      await uploadFormatEdit.cbGetIndex(request, response, next)

      // 期待結果
      // 404，500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      expect(next).not.toHaveBeenCalledWith(error500)

      expect(response.render).toHaveBeenCalledWith('uploadFormatEdit', {
        ...result,
        csvTax: csvTax,
        csvUnit: csvUnit,
        uploadFormatId: request.params.uploadFormatId
      })
    })
  })

  // -----------------------------------------------------------------------------------------
  // cbPostIndex

  describe('cbPostIndex', () => {
    test('異常：500エラーセッション無', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = undefined

      request.user = user

      // 試験実施
      await uploadFormatEdit.cbPostIndex(request, response, next)

      // 期待結果
      // 404エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      // 500エラーがエラーハンドリング「される」
      expect(next).toHaveBeenCalledWith(error500)
    })

    test('異常：500エラーユーザーDBエラー', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = {
        userContext: 'LoggedIn',
        userRole: 'dummy'
      }
      request.user = user

      // DBからの正常なユーザデータの取得を想定する
      userFindOneSpy.mockReturnValue(new Error('User Table Error'))

      // 試験実施
      await uploadFormatEdit.cbPostIndex(request, response, next)

      // 期待結果
      // 404エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      // 500エラーがエラーハンドリング「される」
      expect(next).toHaveBeenCalledWith(error500)
    })

    test('異常：500エラーユーザーDBエラー(user is NULL)', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = {
        userContext: 'LoggedIn',
        userRole: 'dummy'
      }
      request.user = user

      // DBからの正常なユーザデータの取得を想定する null
      userFindOneSpy.mockReturnValue(null)

      // 試験実施
      await uploadFormatEdit.cbPostIndex(request, response, next)

      // 期待結果
      // 404エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      // 500エラーがエラーハンドリング「される」
      expect(next).toHaveBeenCalledWith(error500)
    })

    test('異常：404エラーユーザーステータス0以外', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = {
        userContext: 'LoggedIn',
        userRole: 'dummy'
      }
      request.user = user

      // DBからの正常なユーザデータの取得を想定する
      userFindOneSpy.mockReturnValue({
        dataValues: {
          userStatus: 1
        }
      })

      // 試験実施
      await uploadFormatEdit.cbPostIndex(request, response, next)

      // 期待結果
      // 404エラーがエラーハンドリング「される」
      expect(next).toHaveBeenCalledWith(error404)
      // 500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error500)
    })

    test('異常：500エラー契約テーブルエラー', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = {
        userContext: 'LoggedIn',
        userRole: 'dummy'
      }
      request.user = user

      // DBからの正常なユーザデータの取得を想定する
      userFindOneSpy.mockReturnValue({
        dataValues: {
          userStatus: 0
        }
      })
      findOneSpyContracts.mockReturnValue(new Error('契約テーブルエラー'))

      // 試験実施
      await uploadFormatEdit.cbPostIndex(request, response, next)

      // 期待結果
      // 404エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      // 500エラーがエラーハンドリング「される」
      expect(next).toHaveBeenCalledWith(error500)
    })

    test('異常：500エラー契約ステータスnull', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = {
        userContext: 'LoggedIn',
        userRole: 'dummy'
      }
      request.user = user

      // DBからの正常なユーザデータの取得を想定する
      userFindOneSpy.mockReturnValue({
        dataValues: {
          userStatus: 0
        }
      })
      findOneSpyContracts.mockReturnValue({
        dataValues: {
          contractId: '15e2d952-8ba0-42a4-1111-b234cb4a2089',
          tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089',
          contractStatus: null,
          deleteFlag: 0
        }
      })
      findOneSypTenant.mockReturnValue({
        dataValues: {
          tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089'
        }
      })

      // 試験実施
      await uploadFormatEdit.cbPostIndex(request, response, next)

      // 期待結果
      // 404エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      // 500エラーがエラーハンドリング「される」
      expect(next).toHaveBeenCalledWith(error500)
    })

    test('異常：500エラー契約ステータス999', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = {
        userContext: 'LoggedIn',
        userRole: 'dummy'
      }
      request.user = user

      // DBからの正常なユーザデータの取得を想定する
      userFindOneSpy.mockReturnValue({
        dataValues: {
          userStatus: 0
        }
      })
      findOneSpyContracts.mockReturnValue({
        dataValues: {
          contractId: '15e2d952-8ba0-42a4-1111-b234cb4a2089',
          tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089',
          contractStatus: 999,
          deleteFlag: 0
        }
      })
      findOneSypTenant.mockReturnValue({
        dataValues: {
          tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089'
        }
      })
      helpercheckContractStatusSpy.mockReturnValue(999)

      // 試験実施
      await uploadFormatEdit.cbPostIndex(request, response, next)

      // 期待結果
      // 404エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      // 500エラーがエラーハンドリング「される」
      expect(next).toHaveBeenCalledWith(error500)
    })

    test('異常：解約ステータス30', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = {
        userContext: 'LoggedIn',
        userRole: 'dummy'
      }
      request.user = user

      // DBからの正常なユーザデータの取得を想定する
      userFindOneSpy.mockReturnValue({
        dataValues: {
          userStatus: 0
        }
      })
      findOneSpyContracts.mockReturnValue({
        dataValues: {
          contractId: '15e2d952-8ba0-42a4-1111-b234cb4a2089',
          tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089',
          contractStatus: '30',
          deleteFlag: false
        }
      })
      findOneSypTenant.mockReturnValue({
        dataValues: {
          tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089'
        }
      })
      helpercheckContractStatusSpy.mockReturnValue(0)

      // 試験実施
      await uploadFormatEdit.cbPostIndex(request, response, next)

      // 期待結果
      // 404エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      // 解約手続き中画面が表示「される」
      expect(next).toHaveBeenCalledWith(noticeHelper.create('cancelprocedure'))
    })

    test('異常：解約ステータス31', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = {
        userContext: 'LoggedIn',
        userRole: 'dummy'
      }
      request.user = user

      // DBからの正常なユーザデータの取得を想定する
      userFindOneSpy.mockReturnValue({
        dataValues: {
          userStatus: 0
        }
      })
      findOneSpyContracts.mockReturnValue({
        dataValues: {
          contractId: '15e2d952-8ba0-42a4-1111-b234cb4a2089',
          tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089',
          contractStatus: '31',
          deleteFlag: false
        }
      })
      findOneSypTenant.mockReturnValue({
        dataValues: {
          tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089'
        }
      })
      helpercheckContractStatusSpy.mockReturnValue('30')

      // 試験実施
      await uploadFormatEdit.cbPostIndex(request, response, next)

      // 期待結果
      // 404エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      // 解約手続き中画面が表示「される」
      expect(next).toHaveBeenCalledWith(noticeHelper.create('cancelprocedure'))
    })

    test('異常：uploadFormatDBエラー', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = {
        userContext: 'LoggedIn',
        userRole: 'dummy'
      }
      request.user = user

      // DBからの正常なユーザデータの取得を想定する
      userFindOneSpy.mockReturnValue({
        dataValues: {
          userStatus: 0
        }
      })
      findOneSpyContracts.mockReturnValue({
        dataValues: {
          contractId: '15e2d952-8ba0-42a4-1111-b234cb4a2089',
          tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089',
          contractStatus: '00',
          deleteFlag: false
        }
      })
      findOneSypTenant.mockReturnValue({
        dataValues: {
          tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089'
        }
      })
      controllerSpyUploadFormat.mockReturnValue(new Error('uploadFormatController Error'))

      // 試験実施
      await uploadFormatEdit.cbPostIndex(request, response, next)

      // 期待結果
      // 404エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      // 500エラーがエラーハンドリング「される」
      expect(next).toHaveBeenCalledWith(error500)
    })

    test('正常', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = {
        userContext: 'LoggedIn',
        userRole: 'dummy'
      }
      request.user = user
      request.params = {
        uploadFormatId: 'd1791550-7c28-4ad5-8c52-c57253b84843'
      }

      const result = {
        headerItems: [
          { item: '備考', value: '2021/10/11' },
          { item: '支払期日', value: 'PBI147902001' },
          { item: 'テナントID', value: '221559d0-53aa-44a2-ab29-0c4a6cb02bde' },
          { item: '請求書番号', value: '2021/10/12' },
          { item: '納品日', value: '2021/10/12' },
          { item: '発行日', value: 'PBI1479_手動試験' },
          { item: '銀行名', value: '手動銀行' },
          { item: '支店名', value: '手動支店' },
          { item: '科目', value: '普通' },
          { item: '口座番号', value: '1234567' },
          { item: '口座名義', value: '手動' },
          { item: 'その他特記事項', value: '請求書一括作成_2.csv' },
          { item: '明細-項目ID', value: '1' },
          { item: '明細-内容', value: '明細１' },
          { item: '明細-数量', value: '1' },
          { item: '明細-単位', value: 'test1' },
          { item: '明細-単価', value: '100000' },
          { item: '明細-税', value: '免税' },
          { item: '明細-備考', value: '手動試験データ' }
        ],
        columnArr: [
          { columnName: '発行日', item: '', value: '' },
          { columnName: '請求書番号', item: '', value: '' },
          { columnName: 'テナントID', item: '', value: '' },
          { columnName: '支払期日', item: '', value: '' },
          { columnName: '納品日', item: '', value: '' },
          { columnName: '備考', item: '', value: '' },
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
        ],
        uploadGeneral: { uploadFormatItemName: 'aaa', uploadType: '請求書データ' },
        taxIds: {
          keyConsumptionTax: { key: 'keyConsumptionTax', value: '1212', itemName: '消費税' },
          keyReducedTax: { key: 'keyReducedTax', value: '', itemName: '軽減税率' },
          keyFreeTax: { key: 'keyFreeTax', value: '', itemName: '不課税' },
          keyDutyFree: { key: 'keyDutyFree', value: '', itemName: '免税' },
          keyExemptTax: { key: 'keyExemptTax', value: '', itemName: '非課税' }
        },
        unitIds: {
          keyManMonth: { key: 'keyManMonth', value: '', itemName: '人月' },
          keyBottle: { key: 'keyBottle', value: '', itemName: 'ボトル' },
          keyCost: { key: 'keyCost', value: '', itemName: 'コスト' },
          keyContainer: { key: 'keyContainer', value: '', itemName: 'コンテナ' },
          keyCentilitre: { key: 'keyCentilitre', value: '', itemName: 'センチリットル' },
          keySquareCentimeter: {
            key: 'keySquareCentimeter',
            value: '1212',
            itemName: '平方センチメートル'
          },
          keyCubicCentimeter: { key: 'keyCubicCentimeter', value: '', itemName: '立方センチメートル' },
          keyCentimeter: { key: 'keyCentimeter', value: '12121', itemName: 'センチメートル' },
          keyCase: { key: 'keyCase', value: '', itemName: 'ケース' },
          keyCarton: { key: 'keyCarton', value: '', itemName: 'カートン' },
          keyDay: { key: 'keyDay', value: '', itemName: '日' },
          keyDeciliter: { key: 'keyDeciliter', value: '', itemName: 'デシリットル' },
          keyDecimeter: { key: 'keyDecimeter', value: '', itemName: 'デシメートル' },
          keyGrossKilogram: { key: 'keyGrossKilogram', value: '', itemName: 'グロス・キログラム' },
          keyPieces: { key: 'keyPieces', value: '', itemName: '個' },
          keyFeet: { key: 'keyFeet', value: '', itemName: 'フィート' },
          keyGallon: { key: 'keyGallon', value: '', itemName: 'ガロン' },
          keyGram: { key: 'keyGram', value: '', itemName: 'グラム' },
          keyGrossTonnage: { key: 'keyGrossTonnage', value: '', itemName: '総トン' },
          keyHour: { key: 'keyHour', value: '', itemName: '時間' },
          keyKilogram: { key: 'keyKilogram', value: '', itemName: 'キログラム' },
          keyKilometers: { key: 'keyKilometers', value: '', itemName: 'キロメートル' },
          keyKilowattHour: { key: 'keyKilowattHour', value: '', itemName: 'キロワット時' },
          keyPound: { key: 'keyPound', value: '', itemName: 'ポンド' },
          keyLiter: { key: 'keyLiter', value: '', itemName: 'リットル' },
          keyMilligram: { key: 'keyMilligram', value: '', itemName: 'ミリグラム' },
          keyMilliliter: { key: 'keyMilliliter', value: '', itemName: 'ミリリットル' },
          keyMillimeter: { key: 'keyMillimeter', value: '', itemName: 'ミリメートル' },
          keyMonth: { key: 'keyMonth', value: '', itemName: '月' },
          keySquareMeter: { key: 'keySquareMeter', value: '', itemName: '平方メートル' },
          keyCubicMeter: { key: 'keyCubicMeter', value: '', itemName: '立方メートル' },
          keyMeter: { key: 'keyMeter', value: '', itemName: 'メーター' },
          keyNetTonnage: { key: 'keyNetTonnage', value: '', itemName: '純トン' },
          keyPackage: { key: 'keyPackage', value: '', itemName: '包' },
          keyRoll: { key: 'keyRoll', value: '', itemName: '巻' },
          keyFormula: { key: 'keyFormula', value: '', itemName: '式' },
          keyTonnage: { key: 'keyTonnage', value: '', itemName: 'トン' },
          keyOthers: { key: 'keyOthers', value: '', itemName: 'その他' }
        },
        csvfilename: '/51f3eb20-82a5-4900-acd2-4281621be954_1697_1.csv',
        selectedFormatData: [
          '1',
          '3',
          '4',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '18',
          '19',
          '16',
          '11',
          '13',
          '15',
          '14',
          ''
        ],
        itemRowNo: '1',
        dataStartRowNo: '2',
        checkItemNameLine: 'on'
      }

      // DBからの正常なユーザデータの取得を想定する
      userFindOneSpy.mockReturnValue({
        dataValues: {
          userStatus: 0
        }
      })
      findOneSpyContracts.mockReturnValue({
        dataValues: {
          contractId: '15e2d952-8ba0-42a4-1111-b234cb4a2089',
          tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089',
          contractStatus: '00',
          deleteFlag: 0
        }
      })
      findOneSypTenant.mockReturnValue({
        dataValues: {
          tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089'
        }
      })
      findContractSpyContracts.mockReturnValue({
        dataValues: {
          contractId: '15e2d952-8ba0-42a4-1111-b234cb4a2089',
          tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089',
          contractStatus: '00',
          deleteFlag: 0
        }
      })

      controllerSpyUploadFormat.mockReturnValue(result)

      controllerSpyChangeUploadFormat.mockReturnValue(0)

      // request.flashは関数なのでモックする。
      request.flash = jest.fn()

      // 試験実施
      await uploadFormatEdit.cbPostIndex(request, response, next)

      // 期待結果
      // 404，500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      expect(next).not.toHaveBeenCalledWith(error500)

      // request.flashが呼ばれ「る」
      expect(request.flash).toHaveBeenCalledWith('info', 'フォーマットの変更が完了しました。')

      expect(response.redirect).toHaveBeenCalledWith('/uploadFormatList')
    })

    test('準正常：redirect', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = {
        userContext: 'LoggedIn',
        userRole: 'dummy'
      }
      request.user = user
      request.params = {
        uploadFormatId: 'd1791550-7c28-4ad5-8c52-c57253b84843'
      }

      const result = {
        headerItems: [
          { item: '備考', value: '2021/10/11' },
          { item: '支払期日', value: 'PBI147902001' },
          { item: 'テナントID', value: '221559d0-53aa-44a2-ab29-0c4a6cb02bde' },
          { item: '請求書番号', value: '2021/10/12' },
          { item: '納品日', value: '2021/10/12' },
          { item: '発行日', value: 'PBI1479_手動試験' },
          { item: '銀行名', value: '手動銀行' },
          { item: '支店名', value: '手動支店' },
          { item: '科目', value: '普通' },
          { item: '口座番号', value: '1234567' },
          { item: '口座名義', value: '手動' },
          { item: 'その他特記事項', value: '請求書一括作成_2.csv' },
          { item: '明細-項目ID', value: '1' },
          { item: '明細-内容', value: '明細１' },
          { item: '明細-数量', value: '1' },
          { item: '明細-単位', value: 'test1' },
          { item: '明細-単価', value: '100000' },
          { item: '明細-税', value: '免税' },
          { item: '明細-備考', value: '手動試験データ' }
        ],
        columnArr: [
          { columnName: '発行日', item: '', value: '' },
          { columnName: '請求書番号', item: '', value: '' },
          { columnName: 'テナントID', item: '', value: '' },
          { columnName: '支払期日', item: '', value: '' },
          { columnName: '納品日', item: '', value: '' },
          { columnName: '備考', item: '', value: '' },
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
        ],
        uploadGeneral: { uploadFormatItemName: 'aaa', uploadType: '請求書データ' },
        taxIds: {
          keyConsumptionTax: { key: 'keyConsumptionTax', value: '1212', itemName: '消費税' },
          keyReducedTax: { key: 'keyReducedTax', value: '', itemName: '軽減税率' },
          keyFreeTax: { key: 'keyFreeTax', value: '', itemName: '不課税' },
          keyDutyFree: { key: 'keyDutyFree', value: '', itemName: '免税' },
          keyExemptTax: { key: 'keyExemptTax', value: '', itemName: '非課税' }
        },
        unitIds: {
          keyManMonth: { key: 'keyManMonth', value: '', itemName: '人月' },
          keyBottle: { key: 'keyBottle', value: '', itemName: 'ボトル' },
          keyCost: { key: 'keyCost', value: '', itemName: 'コスト' },
          keyContainer: { key: 'keyContainer', value: '', itemName: 'コンテナ' },
          keyCentilitre: { key: 'keyCentilitre', value: '', itemName: 'センチリットル' },
          keySquareCentimeter: {
            key: 'keySquareCentimeter',
            value: '1212',
            itemName: '平方センチメートル'
          },
          keyCubicCentimeter: { key: 'keyCubicCentimeter', value: '', itemName: '立方センチメートル' },
          keyCentimeter: { key: 'keyCentimeter', value: '12121', itemName: 'センチメートル' },
          keyCase: { key: 'keyCase', value: '', itemName: 'ケース' },
          keyCarton: { key: 'keyCarton', value: '', itemName: 'カートン' },
          keyDay: { key: 'keyDay', value: '', itemName: '日' },
          keyDeciliter: { key: 'keyDeciliter', value: '', itemName: 'デシリットル' },
          keyDecimeter: { key: 'keyDecimeter', value: '', itemName: 'デシメートル' },
          keyGrossKilogram: { key: 'keyGrossKilogram', value: '', itemName: 'グロス・キログラム' },
          keyPieces: { key: 'keyPieces', value: '', itemName: '個' },
          keyFeet: { key: 'keyFeet', value: '', itemName: 'フィート' },
          keyGallon: { key: 'keyGallon', value: '', itemName: 'ガロン' },
          keyGram: { key: 'keyGram', value: '', itemName: 'グラム' },
          keyGrossTonnage: { key: 'keyGrossTonnage', value: '', itemName: '総トン' },
          keyHour: { key: 'keyHour', value: '', itemName: '時間' },
          keyKilogram: { key: 'keyKilogram', value: '', itemName: 'キログラム' },
          keyKilometers: { key: 'keyKilometers', value: '', itemName: 'キロメートル' },
          keyKilowattHour: { key: 'keyKilowattHour', value: '', itemName: 'キロワット時' },
          keyPound: { key: 'keyPound', value: '', itemName: 'ポンド' },
          keyLiter: { key: 'keyLiter', value: '', itemName: 'リットル' },
          keyMilligram: { key: 'keyMilligram', value: '', itemName: 'ミリグラム' },
          keyMilliliter: { key: 'keyMilliliter', value: '', itemName: 'ミリリットル' },
          keyMillimeter: { key: 'keyMillimeter', value: '', itemName: 'ミリメートル' },
          keyMonth: { key: 'keyMonth', value: '', itemName: '月' },
          keySquareMeter: { key: 'keySquareMeter', value: '', itemName: '平方メートル' },
          keyCubicMeter: { key: 'keyCubicMeter', value: '', itemName: '立方メートル' },
          keyMeter: { key: 'keyMeter', value: '', itemName: 'メーター' },
          keyNetTonnage: { key: 'keyNetTonnage', value: '', itemName: '純トン' },
          keyPackage: { key: 'keyPackage', value: '', itemName: '包' },
          keyRoll: { key: 'keyRoll', value: '', itemName: '巻' },
          keyFormula: { key: 'keyFormula', value: '', itemName: '式' },
          keyTonnage: { key: 'keyTonnage', value: '', itemName: 'トン' },
          keyOthers: { key: 'keyOthers', value: '', itemName: 'その他' }
        },
        csvfilename: '/51f3eb20-82a5-4900-acd2-4281621be954_1697_1.csv',
        selectedFormatData: [
          '1',
          '3',
          '4',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '18',
          '19',
          '16',
          '11',
          '13',
          '15',
          '14',
          ''
        ],
        itemRowNo: '1',
        dataStartRowNo: '2',
        checkItemNameLine: 'on'
      }

      // DBからの正常なユーザデータの取得を想定する
      userFindOneSpy.mockReturnValue({
        dataValues: {
          userStatus: 0
        }
      })
      findOneSpyContracts.mockReturnValue({
        dataValues: {
          contractId: '15e2d952-8ba0-42a4-1111-b234cb4a2089',
          tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089',
          contractStatus: '00',
          deleteFlag: 0
        }
      })
      findOneSypTenant.mockReturnValue({
        dataValues: {
          tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089'
        }
      })
      findContractSpyContracts.mockReturnValue({
        dataValues: {
          contractId: '15e2d952-8ba0-42a4-1111-b234cb4a2089',
          tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089',
          contractStatus: '00',
          deleteFlag: 0
        }
      })

      controllerSpyUploadFormat.mockReturnValue(result)
      controllerSpyChangeUploadFormat.mockReturnValue(-1)
      // 試験実施
      await uploadFormatEdit.cbPostIndex(request, response, next)

      // 期待結果
      // 404，500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      expect(next).not.toHaveBeenCalledWith(error500)
      expect(response.redirect).toHaveBeenCalledWith('/')
    })
    test('DBエラー', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = {
        userContext: 'LoggedIn',
        userRole: 'dummy'
      }
      request.user = user
      request.params = {
        uploadFormatId: 'd1791550-7c28-4ad5-8c52-c57253b84843'
      }

      const result = {
        headerItems: [
          { item: '備考', value: '2021/10/11' },
          { item: '支払期日', value: 'PBI147902001' },
          { item: 'テナントID', value: '221559d0-53aa-44a2-ab29-0c4a6cb02bde' },
          { item: '請求書番号', value: '2021/10/12' },
          { item: '納品日', value: '2021/10/12' },
          { item: '発行日', value: 'PBI1479_手動試験' },
          { item: '銀行名', value: '手動銀行' },
          { item: '支店名', value: '手動支店' },
          { item: '科目', value: '普通' },
          { item: '口座番号', value: '1234567' },
          { item: '口座名義', value: '手動' },
          { item: 'その他特記事項', value: '請求書一括作成_2.csv' },
          { item: '明細-項目ID', value: '1' },
          { item: '明細-内容', value: '明細１' },
          { item: '明細-数量', value: '1' },
          { item: '明細-単位', value: 'test1' },
          { item: '明細-単価', value: '100000' },
          { item: '明細-税', value: '免税' },
          { item: '明細-備考', value: '手動試験データ' }
        ],
        columnArr: [
          { columnName: '発行日', item: '', value: '' },
          { columnName: '請求書番号', item: '', value: '' },
          { columnName: 'テナントID', item: '', value: '' },
          { columnName: '支払期日', item: '', value: '' },
          { columnName: '納品日', item: '', value: '' },
          { columnName: '備考', item: '', value: '' },
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
        ],
        uploadGeneral: { uploadFormatItemName: 'aaa', uploadType: '請求書データ' },
        taxIds: {
          keyConsumptionTax: { key: 'keyConsumptionTax', value: '1212', itemName: '消費税' },
          keyReducedTax: { key: 'keyReducedTax', value: '', itemName: '軽減税率' },
          keyFreeTax: { key: 'keyFreeTax', value: '', itemName: '不課税' },
          keyDutyFree: { key: 'keyDutyFree', value: '', itemName: '免税' },
          keyExemptTax: { key: 'keyExemptTax', value: '', itemName: '非課税' }
        },
        unitIds: {
          keyManMonth: { key: 'keyManMonth', value: '', itemName: '人月' },
          keyBottle: { key: 'keyBottle', value: '', itemName: 'ボトル' },
          keyCost: { key: 'keyCost', value: '', itemName: 'コスト' },
          keyContainer: { key: 'keyContainer', value: '', itemName: 'コンテナ' },
          keyCentilitre: { key: 'keyCentilitre', value: '', itemName: 'センチリットル' },
          keySquareCentimeter: {
            key: 'keySquareCentimeter',
            value: '1212',
            itemName: '平方センチメートル'
          },
          keyCubicCentimeter: { key: 'keyCubicCentimeter', value: '', itemName: '立方センチメートル' },
          keyCentimeter: { key: 'keyCentimeter', value: '12121', itemName: 'センチメートル' },
          keyCase: { key: 'keyCase', value: '', itemName: 'ケース' },
          keyCarton: { key: 'keyCarton', value: '', itemName: 'カートン' },
          keyDay: { key: 'keyDay', value: '', itemName: '日' },
          keyDeciliter: { key: 'keyDeciliter', value: '', itemName: 'デシリットル' },
          keyDecimeter: { key: 'keyDecimeter', value: '', itemName: 'デシメートル' },
          keyGrossKilogram: { key: 'keyGrossKilogram', value: '', itemName: 'グロス・キログラム' },
          keyPieces: { key: 'keyPieces', value: '', itemName: '個' },
          keyFeet: { key: 'keyFeet', value: '', itemName: 'フィート' },
          keyGallon: { key: 'keyGallon', value: '', itemName: 'ガロン' },
          keyGram: { key: 'keyGram', value: '', itemName: 'グラム' },
          keyGrossTonnage: { key: 'keyGrossTonnage', value: '', itemName: '総トン' },
          keyHour: { key: 'keyHour', value: '', itemName: '時間' },
          keyKilogram: { key: 'keyKilogram', value: '', itemName: 'キログラム' },
          keyKilometers: { key: 'keyKilometers', value: '', itemName: 'キロメートル' },
          keyKilowattHour: { key: 'keyKilowattHour', value: '', itemName: 'キロワット時' },
          keyPound: { key: 'keyPound', value: '', itemName: 'ポンド' },
          keyLiter: { key: 'keyLiter', value: '', itemName: 'リットル' },
          keyMilligram: { key: 'keyMilligram', value: '', itemName: 'ミリグラム' },
          keyMilliliter: { key: 'keyMilliliter', value: '', itemName: 'ミリリットル' },
          keyMillimeter: { key: 'keyMillimeter', value: '', itemName: 'ミリメートル' },
          keyMonth: { key: 'keyMonth', value: '', itemName: '月' },
          keySquareMeter: { key: 'keySquareMeter', value: '', itemName: '平方メートル' },
          keyCubicMeter: { key: 'keyCubicMeter', value: '', itemName: '立方メートル' },
          keyMeter: { key: 'keyMeter', value: '', itemName: 'メーター' },
          keyNetTonnage: { key: 'keyNetTonnage', value: '', itemName: '純トン' },
          keyPackage: { key: 'keyPackage', value: '', itemName: '包' },
          keyRoll: { key: 'keyRoll', value: '', itemName: '巻' },
          keyFormula: { key: 'keyFormula', value: '', itemName: '式' },
          keyTonnage: { key: 'keyTonnage', value: '', itemName: 'トン' },
          keyOthers: { key: 'keyOthers', value: '', itemName: 'その他' }
        },
        csvfilename: '/51f3eb20-82a5-4900-acd2-4281621be954_1697_1.csv',
        selectedFormatData: [
          '1',
          '3',
          '4',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '18',
          '19',
          '16',
          '11',
          '13',
          '15',
          '14',
          ''
        ],
        itemRowNo: '1',
        dataStartRowNo: '2',
        checkItemNameLine: 'on'
      }

      // DBからの正常なユーザデータの取得を想定する
      userFindOneSpy.mockReturnValue({
        dataValues: {
          userStatus: 0
        }
      })
      findOneSpyContracts.mockReturnValue({
        dataValues: {
          contractId: '15e2d952-8ba0-42a4-1111-b234cb4a2089',
          tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089',
          contractStatus: '00',
          deleteFlag: 0
        }
      })
      findOneSypTenant.mockReturnValue({
        dataValues: {
          tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089'
        }
      })
      findContractSpyContracts.mockReturnValue({
        dataValues: {
          contractId: '15e2d952-8ba0-42a4-1111-b234cb4a2089',
          tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089',
          contractStatus: '00',
          deleteFlag: 0
        }
      })

      controllerSpyUploadFormat.mockReturnValue(result)
      const dbError = new Error('DBERROR')
      controllerSpyChangeUploadFormat.mockReturnValue(dbError)
      // 試験実施
      await uploadFormatEdit.cbPostIndex(request, response, next)

      // 期待結果
      // 404，500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      expect(next).toHaveBeenCalledWith(error500)
    })
  })
})
