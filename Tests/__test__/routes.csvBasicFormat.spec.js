/* eslint-disable new-cap */
'use strict'

jest.mock('../../Application/node_modules/express', () => {
  return require('jest-express')
})

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
const path = require('path')

if (process.env.LOCALLY_HOSTED === 'true') {
  // NODE_ENVはJestがデフォルトでtestに指定する。dotenvで上書きできなかったため、package.jsonの実行引数でdevelopmentを指定
  require('dotenv').config({ path: './config/.env' })
}
let request, response
let infoSpy, findOneSpy, findOneSypTenant, findOneSpyContracts, pathSpy, checkContractStatusSpy
describe('csvBasicFormatのテスト', () => {
  beforeEach(() => {
    request = new Request()
    response = new Response()
    infoSpy = jest.spyOn(logger, 'info')
    findOneSpy = jest.spyOn(userController, 'findOne')
    findOneSypTenant = jest.spyOn(tenantController, 'findOne')
    findOneSpyContracts = jest.spyOn(contractController, 'findOne')
    checkContractStatusSpy = jest.spyOn(helper, 'checkContractStatus')
    pathSpy = jest.spyOn(path, 'resolve')
  })
  afterEach(() => {
    request.resetMocked()
    response.resetMocked()
    next.mockReset()
    infoSpy.mockRestore()
    findOneSpy.mockRestore()
    findOneSypTenant.mockRestore()
    findOneSpyContracts.mockRestore()
    checkContractStatusSpy.mockReturnValue()
    pathSpy.mockRestore()
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

  const csvBasicArr = {
    uploadFormatId: '',
    uploadFormatItemName: '',
    dataFileName: '',
    uploadFormatNumber: '',
    defaultNumber: ''
  }
  const taxArr = {
    consumptionTax: '',
    reducedTax: '',
    freeTax: '',
    dutyFree: '',
    exemptTax: ''
  }
  const unitArr = {
    manMonth: '',
    BO: '',
    C5: '',
    CH: '',
    CLT: '',
    CMK: '',
    CMQ: '',
    CMT: '',
    CS: '',
    CT: '',
    DAY: '',
    DLT: '',
    DMT: '',
    E4: '',
    EA: '',
    FOT: '',
    GLL: '',
    GRM: '',
    GT: '',
    HUR: '',
    KGM: '',
    KTM: '',
    KWH: '',
    LBR: '',
    LTR: '',
    MGM: '',
    MLT: '',
    MMT: '',
    MON: '',
    MTK: '',
    MTQ: '',
    MTR: '',
    NT: '',
    PK: '',
    RO: '',
    SET: '',
    TNE: '',
    ZZ: ''
  }
  describe('ルーティング', () => {
    test('csvBasicFormatのルーティングを確認', async () => {
      expect(csvBasicFormat.router.get).toBeCalledWith(
        '/',
        helper.isAuthenticated,
        expect.any(Function),
        csvBasicFormat.cbGetCsvBasicFormat
      )
    })
  })

  // -----------------------------------------------------------------------------------------
  // cbGetCsvBasicFormatの確認

  describe('cbGetCsvBasicFormat', () => {
    test('正常', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = {
        userContext: 'LoggedIn',
        userRole: 'dummy'
      }
      request.user = user

      // DBからの正常なユーザデータの取得を想定する
      findOneSpy.mockReturnValue(dataValues)
      // DBからの正常な契約情報取得を想定する
      findOneSpyContracts.mockReturnValue(contractdataValues)
      checkContractStatusSpy.mockReturnValue('00')
      // CSRF対策
      const dummyToken = 'testCsrfToken'
      request.csrfToken = jest.fn(() => {
        return dummyToken
      })

      // 試験実施
      await csvBasicFormat.cbGetCsvBasicFormat(request, response, next)

      // 期待結果
      // 404，500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      expect(next).not.toHaveBeenCalledWith(error500)
      // userContextがLoggedInになっている
      expect(request.session?.userContext).toBe('LoggedIn')
      // session.userRoleが'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'になっている
      expect(request.session?.userRole).toBe('a6a3edcd-00d9-427c-bf03-4ef0112ba16d')
      // response.renderでcsvBasicFormatが呼ばれ「る」
      expect(response.render).toHaveBeenCalledWith('csvBasicFormat', {
        csvTax: csvTax,
        csvUnit: csvUnit,
        TS_HOST: process.env.TS_HOST,
        csrfToken: dummyToken
      })
    })

    test('正常２：ReturnFlagがtrue', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = {
        userContext: 'LoggedIn',
        userRole: 'dummy',
        csvUploadFormatReturnFlag1: true,
        csvUploadFormatReturnFlag2: true
      }
      request.user = user

      // DBからの正常なユーザデータの取得を想定する
      findOneSpy.mockReturnValue(dataValues)
      // DBからの正常な契約情報取得を想定する
      findOneSpyContracts.mockReturnValue(contractdataValues)
      checkContractStatusSpy.mockReturnValue('00')
      // CSRF対策
      const dummyToken = 'testCsrfToken'
      request.csrfToken = jest.fn(() => {
        return dummyToken
      })

      // 試験実施
      await csvBasicFormat.cbGetCsvBasicFormat(request, response, next)

      // 期待結果
      // 404，500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      expect(next).not.toHaveBeenCalledWith(error500)
      // userContextがLoggedInになっている
      expect(request.session?.userContext).toBe('LoggedIn')
      // session.userRoleが'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'になっている
      expect(request.session?.userRole).toBe('a6a3edcd-00d9-427c-bf03-4ef0112ba16d')
      // response.renderでcsvBasicFormatが呼ばれ「る」
      expect(response.render).toHaveBeenCalledWith('csvBasicFormat', {
        csvTax: csvTax,
        csvUnit: csvUnit,
        TS_HOST: process.env.TS_HOST,
        csrfToken: dummyToken
      })
    })

    test('正常３：Formdataがtrue', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = {
        userContext: 'LoggedIn',
        userRole: 'dummy',
        csvUploadFormatReturnFlag1: true,
        csvUploadFormatReturnFlag2: true,
        formData: {
          taxArr: taxArr,
          csvBasicArr: csvBasicArr,
          unitArr: unitArr
        }
      }
      request.user = user

      // DBからの正常なユーザデータの取得を想定する
      findOneSpy.mockReturnValue(dataValues)
      // DBからの正常な契約情報取得を想定する
      findOneSpyContracts.mockReturnValue(contractdataValues)
      // CSRF対策
      const dummyToken = 'testCsrfToken'
      request.csrfToken = jest.fn(() => {
        return dummyToken
      })

      // 試験実施
      await csvBasicFormat.cbGetCsvBasicFormat(request, response, next)

      // 期待結果
      // 404，500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      expect(next).not.toHaveBeenCalledWith(error500)
      // userContextがLoggedInになっている
      expect(request.session?.userContext).toBe('LoggedIn')
      // session.userRoleが'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'になっている
      expect(request.session?.userRole).toBe('a6a3edcd-00d9-427c-bf03-4ef0112ba16d')
      // response.renderでcsvBasicFormatが呼ばれ「る」
      expect(response.render).toHaveBeenCalledWith('csvBasicFormat', {
        csvTax: csvTax,
        csvUnit: csvUnit,
        TS_HOST: process.env.TS_HOST,
        csrfToken: dummyToken
      })
    })

    test('準正常：解約申込中', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = {
        userContext: 'LoggedIn',
        userRole: 'dummy'
      }
      request.user = user

      // DBからの正常なユーザデータの取得を想定する
      findOneSpy.mockReturnValue(dataValues)
      // DBからの正常な申込中の契約情報取得を想定する
      findOneSpyContracts.mockReturnValue(contractdataValues2)

      // 試験実施
      await csvBasicFormat.cbGetCsvBasicFormat(request, response, next)

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

    test('異常：500エラー（DBからユーザ取得エラー）', async () => {
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
      await csvBasicFormat.cbGetCsvBasicFormat(request, response, next)

      // 期待結果
      // 404エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      // 500エラーがエラーハンドリング「される」
      expect(next).toHaveBeenCalledWith(error500)
      // userContextがLoggedInになって「いない」
      expect(request.session?.userContext).not.toBe('LoggedIn')
      // session.userRoleが初期値のままになっている
      expect(request.session?.userRole).toBe('dummy')
      // response.renderが呼ばれ「ない」
      expect(response.render).not.toHaveBeenCalled()
    })

    test('異常：404エラー：DBから取得したユーザのuserStatusが0以外の場合', async () => {
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
      await csvBasicFormat.cbGetCsvBasicFormat(request, response, next)

      // 期待結果
      // 404エラーがエラーハンドリング「される」
      expect(next).toHaveBeenCalledWith(error404)
    })

    test('異常：400エラー（NotLoggedIn）', async () => {
      // 準備
      // requestのsession,userIdにnullを入れる
      request.session = {
        userContext: 'NotLoggedIn',
        userRole: 'dummy'
      }

      // request.userに正常値を想定する
      request.user = {
        userId: '12345678-cb0b-48ad-857d-4b42a44ede13'
      }
      // DBからの正常なユーザデータの取得を想定する
      findOneSpy.mockReturnValue(userInfoData)
      findOneSpyContracts.mockReturnValue(contractInfoData)

      // 試験実施
      await csvBasicFormat.cbGetCsvBasicFormat(request, response, next)

      // 期待結果
      // 400エラーがエラーハンドリング「される」
      expect(next).toHaveBeenCalledWith(errorHelper.create(400))
      // response.renderが呼ばれ「ない」
      expect(response.render).not.toHaveBeenCalled()
    })

    test('異常：500エラー（不正なContractStatus①）', async () => {
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
      await csvBasicFormat.cbGetCsvBasicFormat(request, response, next)

      // 期待結果
      // 404，500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      // 500エラーがエラーハンドリング「される」
      expect(next).toHaveBeenCalledWith(error500)
    })

    test('異常：500エラー（不正なContractStatus②）', async () => {
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
      findOneSpyContracts.mockReturnValue(contractdataValues)
      checkContractStatusSpy.mockReturnValue(999)

      // 試験実施
      await csvBasicFormat.cbGetCsvBasicFormat(request, response, next)

      // 期待結果
      // 404，500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      // 500エラーがエラーハンドリング「される」
      expect(next).toHaveBeenCalledWith(error500)
    })
  })
  // -----------------------------------------------------------------------------------------
})
