/**
 * 会員サイト機能コントローラーDAOのテストファイル
 * @author tommorisawa
 */
'use strict'

// モデルをモック化
jest.mock('../../../../../Application/models')

// テスト準備セット
const db = require('../../../../../Application/models').sequelize
const logger = require('../../../../../Application/lib/logger.js')
const logMessageDefine = require('../../../../../Application/constants').logMessage
const { Op } = require('../../../../../Application/node_modules/sequelize')

// テスト対象モジュール
const menberSiteControllerDao = require('../../../../../Application/memberSite/daos/memberSiteControllerDao')

// テスト対象利用ライブラリ（モック対象）
const digitaltradeTokenModel = require('../../../../../Application/models').DigitaltradeToken
const serviceLinkageIdModel = require('../../../../../Application/models').ServiceLinkageIdManagement
const authHistoryModel = require('../../../../../Application/models').AuthenticationHistory
const MemberSiteCoopSession = require('../../../../../Application/memberSite/dtos/memberSiteSessionDto')

/* テスト内デフォルト定数 */
// デジタルトレードトークンテーブル取得値
const digitaltradeTokenDBMemberValue = { dtToken: 'dummyDtToken', digitaltradeId: 'dummyDigitaltradeId' }
const digitaltaldeTokenInfo = {
  dtToken: digitaltradeTokenDBMemberValue.dtToken,
  digitaltradeId: digitaltradeTokenDBMemberValue.digitaltradeId,
  fingerprint: '67d9daeab3acb866f2746549f700b362',
  tokenCategory: 'TRS',
  expireDate: Date.now() + 100000
}

const serviceLinkageIdInfo = {
  digitaltradeId: digitaltradeTokenDBMemberValue.digitaltradeId,
  serviceCategory: 'TRS',
  serviceUserId: 'serviceLinkageIdInfoTradeshiftUserId',
  serviceSubId: 'serviceLinkageIdInfoTradeshiftTenantId',
  serviceUserInfo: JSON.stringify({
    digitaltradeId: digitaltradeTokenDBMemberValue.digitaltradeId,
    tradeshiftUserId: 'serviceLinkageIdInfoTradeshiftUserId',
    tradeshiftTenantId: 'serviceLinkageIdInfoTradeshiftTenantId'
  }),
  deleteFlag: false
}

const memberSiteDto = new MemberSiteCoopSession()

let transactionSpy, loggerInfoSpy, loggerErrorSpy
describe('memberSiteControllerDao UTテスト', () => {
  beforeEach(() => {
    transactionSpy = jest.spyOn(db, 'transaction')
    loggerInfoSpy = jest.spyOn(logger, 'info')
    loggerErrorSpy = jest.spyOn(logger, 'error')
    db.transaction = jest.fn(async (callback) => {
      const transactionObj = {}
      try {
        const result = await callback(transactionObj)
        return await result
      } catch (error) {
        // const dbError = new Error('DB error')
        // throw dbError
        const dbError = error
        throw dbError
      }
    })
  })
  afterEach(() => {
    transactionSpy.mockRestore()
    loggerInfoSpy.mockRestore()
    loggerErrorSpy.mockRestore()
  })

  describe('01 getDigitaltradeTokenBydtToken UTテスト', () => {
    let findOneSpy
    beforeEach(() => {
      findOneSpy = jest.spyOn(digitaltradeTokenModel, 'findOne')
    })
    afterEach(() => {
      findOneSpy.mockRestore()
    })
    const functionName = 'getDigitaltradeTokenBydtToken'
    describe('02 ログ出力確認', () => {
      test('01 開始・終了ログ', async () => {
        // DBからの正常取得を想定する
        findOneSpy.mockReturnValueOnce(digitaltradeTokenDBMemberValue)
        // 試験対象関数実行
        logger.trace({ testCase: expect.getState().currentTestName }, '======= 開始 =======')
        await menberSiteControllerDao.getDigitaltradeTokenBydtToken(digitaltradeTokenDBMemberValue.dtToken)
        expect(loggerInfoSpy).toHaveBeenNthCalledWith(1, logMessageDefine.INF000 + functionName)
        expect(loggerInfoSpy).toHaveBeenLastCalledWith(logMessageDefine.INF001 + functionName)
        logger.trace({ testCase: expect.getState().currentTestName }, '======= 終了 =======')
      })

      test('02 予期せぬエラー', async () => {
        // findOneSpy : エラー
        const findOneError = new Error('mock error')
        findOneSpy.mockImplementation(() => {
          throw findOneError
        })

        // 試験対象関数実行
        logger.trace({ testCase: expect.getState().currentTestName }, '======= 開始 =======')

        const result = await menberSiteControllerDao.getDigitaltradeTokenBydtToken(
          digitaltradeTokenDBMemberValue.dtToken
        )
        expect(loggerErrorSpy).toHaveBeenCalledWith(
          { error: result.stack },
          'ERR-MB999 getDigitaltradeTokenBydtToken:runtime Error'
        )
        logger.trace({ testCase: expect.getState().currentTestName }, '======= 終了 =======')
      })
    })

    describe('03 正常処理', () => {
      let dateSpy
      beforeEach(() => {
        const mockDate = new Date(1594374371110)
        dateSpy = jest.spyOn(global, 'Date').mockImplementation(() => mockDate)
      })
      afterEach(() => {
        dateSpy.mockReset()
        dateSpy.mockRestore()
      })
      test('01 正常処理', async () => {
        // DBからの正常取得を想定する
        findOneSpy.mockReturnValueOnce(digitaltradeTokenDBMemberValue)
        // 試験対象関数実行
        logger.trace({ testCase: expect.getState().currentTestName }, '======= 開始 =======')
        const result = await menberSiteControllerDao.getDigitaltradeTokenBydtToken(
          digitaltradeTokenDBMemberValue.dtToken
        )
        // 時間がずれるかもしれない
        const nowDate = new Date()
        expect(findOneSpy).toHaveBeenCalledWith({
          where: {
            dtToken: digitaltradeTokenDBMemberValue.dtToken,
            tokenCategory: 'TRS',
            expireDate: { [Op.gt]: nowDate },
            tokenflg: false
          }
        })
        expect(result).toBe(digitaltradeTokenDBMemberValue)
        logger.trace({ testCase: expect.getState().currentTestName }, '======= 終了 =======')
      })
    })
  })

  describe('02 getFingerprintBydigitaltradeId UTテスト', () => {
    let findOneSpy
    beforeEach(() => {
      findOneSpy = jest.spyOn(digitaltradeTokenModel, 'findOne')
    })
    afterEach(() => {
      findOneSpy.mockRestore()
    })
    const functionName = 'getFingerprintBydigitaltradeId'
    describe('02 ログ出力確認', () => {
      test('01 開始・終了ログ', async () => {
        // DBからの正常取得を想定する
        findOneSpy.mockReturnValueOnce(digitaltradeTokenDBMemberValue)
        // 試験対象関数実行
        logger.trace({ testCase: expect.getState().currentTestName }, '======= 開始 =======')
        await menberSiteControllerDao.getFingerprintBydigitaltradeId(
          digitaltradeTokenDBMemberValue.digitaltradeId,
          digitaltradeTokenDBMemberValue.dtToken
        )
        expect(loggerInfoSpy).toHaveBeenNthCalledWith(1, logMessageDefine.INF000 + functionName)
        expect(loggerInfoSpy).toHaveBeenLastCalledWith(logMessageDefine.INF001 + functionName)
        logger.trace({ testCase: expect.getState().currentTestName }, '======= 終了 =======')
      })

      test('02 予期せぬエラー', async () => {
        // findOneSpy : エラー
        const findOneError = new Error('mock error')
        findOneSpy.mockImplementation(() => {
          throw findOneError
        })

        // 試験対象関数実行
        logger.trace({ testCase: expect.getState().currentTestName }, '======= 開始 =======')

        const result = await menberSiteControllerDao.getFingerprintBydigitaltradeId(
          digitaltradeTokenDBMemberValue.digitaltradeId,
          digitaltradeTokenDBMemberValue.dtToken
        )
        expect(loggerErrorSpy).toHaveBeenCalledWith(
          { error: result.stack },
          'ERR-MB999 getFingerprintBydigitaltradeId:runtime Error'
        )
        logger.trace({ testCase: expect.getState().currentTestName }, '======= 終了 =======')
      })
    })

    describe('03 正常処理', () => {
      test('01 正常処理', async () => {
        // DBからの正常取得を想定する
        findOneSpy.mockReturnValueOnce(digitaltradeTokenDBMemberValue)
        // 試験対象関数実行
        logger.trace({ testCase: expect.getState().currentTestName }, '======= 開始 =======')
        const result = await menberSiteControllerDao.getFingerprintBydigitaltradeId(
          digitaltradeTokenDBMemberValue.digitaltradeId,
          digitaltradeTokenDBMemberValue.dtToken
        )
        expect(findOneSpy).toHaveBeenCalledWith({
          where: {
            dtToken: digitaltradeTokenDBMemberValue.dtToken,
            digitaltradeId: digitaltradeTokenDBMemberValue.digitaltradeId,
            tokenCategory: 'TRS',
            tokenflg: true
          }
        })
        expect(result).toBe(digitaltradeTokenDBMemberValue)
        logger.trace({ testCase: expect.getState().currentTestName }, '======= 終了 =======')
      })
    })
  })

  describe('03 updateDtTokenFlg UTテスト', () => {
    let updateSpyDigitaltradeTokenModel
    beforeEach(() => {
      updateSpyDigitaltradeTokenModel = jest.spyOn(digitaltradeTokenModel, 'update')
    })
    afterEach(() => {
      updateSpyDigitaltradeTokenModel.mockRestore()
    })
    const functionName = 'updateDtTokenFlg'
    describe('02 ログ出力確認', () => {
      test('01 開始・終了ログ', async () => {
        // DBからの正常取得を想定する
        updateSpyDigitaltradeTokenModel.mockReturnValueOnce(digitaltradeTokenDBMemberValue)
        // 試験対象関数実行
        logger.trace({ testCase: expect.getState().currentTestName }, '======= 開始 =======')
        await menberSiteControllerDao.updateDtTokenFlg(digitaltradeTokenDBMemberValue.dtToken)
        expect(loggerInfoSpy).toHaveBeenNthCalledWith(1, logMessageDefine.INF000 + functionName)
        expect(loggerInfoSpy).toHaveBeenLastCalledWith(logMessageDefine.INF001 + functionName)
        logger.trace({ testCase: expect.getState().currentTestName }, '======= 終了 =======')
      })

      test('02 予期せぬエラー', async () => {
        // findOneSpy : エラー
        const mockError = new Error('mock error')
        updateSpyDigitaltradeTokenModel.mockImplementation(() => {
          throw mockError
        })

        // 試験対象関数実行
        logger.trace({ testCase: expect.getState().currentTestName }, '======= 開始 =======')

        const result = await menberSiteControllerDao.updateDtTokenFlg(digitaltradeTokenDBMemberValue.dtToken)
        expect(loggerErrorSpy).toHaveBeenCalledWith({ error: result.stack }, 'ERR-MB999 updateDtTokenFlg:runtime Error')
        logger.trace({ testCase: expect.getState().currentTestName }, '======= 終了 =======')
      })
    })

    describe('03 正常処理', () => {
      test('01 正常処理', async () => {
        // DBからの正常取得を想定する
        updateSpyDigitaltradeTokenModel.mockReturnValueOnce(1)

        // 試験対象関数実行
        logger.trace({ testCase: expect.getState().currentTestName }, '======= 開始 =======')
        const result = await menberSiteControllerDao.updateDtTokenFlg(digitaltradeTokenDBMemberValue.dtToken)
        expect(updateSpyDigitaltradeTokenModel).toHaveBeenCalledWith(
          { tokenFlg: true },
          {
            where: {
              dtToken: digitaltradeTokenDBMemberValue.dtToken,
              tokenCategory: 'TRS',
              tokenFlg: false
            }
          },
          { transaction: {} }
        )

        expect(result).toBe(1)
        logger.trace({ testCase: expect.getState().currentTestName }, '======= 終了 =======')
      })
    })
  })

  describe('04 getServiceLinkageIdBydigitaltradeId UTテスト', () => {
    let findOneSpyServiceLinkageIdModel
    beforeEach(() => {
      findOneSpyServiceLinkageIdModel = jest.spyOn(serviceLinkageIdModel, 'findOne')
    })
    afterEach(() => {
      findOneSpyServiceLinkageIdModel.mockRestore()
    })
    const functionName = 'getServiceLinkageIdBydigitaltradeId'
    describe('02 ログ出力確認', () => {
      test('01 開始・終了ログ', async () => {
        // DBからの正常取得を想定する
        findOneSpyServiceLinkageIdModel.mockReturnValueOnce(serviceLinkageIdInfo)
        // 試験対象関数実行
        logger.trace({ testCase: expect.getState().currentTestName }, '======= 開始 =======')
        await menberSiteControllerDao.getServiceLinkageIdBydigitaltradeId(serviceLinkageIdInfo.digitaltradeId)
        expect(loggerInfoSpy).toHaveBeenNthCalledWith(1, logMessageDefine.INF000 + functionName)
        expect(loggerInfoSpy).toHaveBeenLastCalledWith(logMessageDefine.INF001 + functionName)
        logger.trace({ testCase: expect.getState().currentTestName }, '======= 終了 =======')
      })

      test('02 予期せぬエラー', async () => {
        // findOneSpy : エラー
        const mockError = new Error('mock error')
        findOneSpyServiceLinkageIdModel.mockImplementation(() => {
          throw mockError
        })

        // 試験対象関数実行
        logger.trace({ testCase: expect.getState().currentTestName }, '======= 開始 =======')

        const result = await menberSiteControllerDao.getServiceLinkageIdBydigitaltradeId(
          serviceLinkageIdInfo.digitaltradeId
        )
        expect(loggerErrorSpy).toHaveBeenCalledWith(
          { error: result.stack },
          'ERR-MB999 getServiceLinkageIdBydigitaltradeId:runtime Error'
        )
        logger.trace({ testCase: expect.getState().currentTestName }, '======= 終了 =======')
      })
    })

    describe('03 正常処理', () => {
      test('01 正常処理', async () => {
        // DBからの正常取得を想定する
        findOneSpyServiceLinkageIdModel.mockReturnValueOnce(serviceLinkageIdInfo)

        // 試験対象関数実行
        logger.trace({ testCase: expect.getState().currentTestName }, '======= 開始 =======')
        const result = await menberSiteControllerDao.getServiceLinkageIdBydigitaltradeId(
          serviceLinkageIdInfo.digitaltradeId
        )
        expect(findOneSpyServiceLinkageIdModel).toHaveBeenCalledWith({
          where: {
            digitaltradeId: serviceLinkageIdInfo.digitaltradeId,
            serviceCategory: 'TRS',
            deleteFlag: false
          }
        })

        expect(result).toBe(serviceLinkageIdInfo)
        logger.trace({ testCase: expect.getState().currentTestName }, '======= 終了 =======')
      })
    })
  })

  describe('05 updateServiceLinkageId UTテスト', () => {
    let updateSpyServiceLinkageIdModel, createSpyAuthHistoryModel
    beforeEach(() => {
      updateSpyServiceLinkageIdModel = jest.spyOn(serviceLinkageIdModel, 'update')
      createSpyAuthHistoryModel = jest.spyOn(authHistoryModel, 'create')
    })
    afterEach(() => {
      updateSpyServiceLinkageIdModel.mockRestore()
      createSpyAuthHistoryModel.mockRestore()
    })
    const functionName = 'updateServiceLinkageId'
    describe('02 ログ出力確認', () => {
      test('01 開始・終了ログ', async () => {
        // DBからの正常取得を想定する
        updateSpyServiceLinkageIdModel.mockReturnValueOnce(1)
        createSpyAuthHistoryModel.mockReturnValueOnce(1)

        // memberSiteDtoの設定
        memberSiteDto.digitaltradeId = serviceLinkageIdInfo.digitaltradeId
        memberSiteDto.tradeshiftUserId = serviceLinkageIdInfo.serviceUserId
        memberSiteDto.tradeshiftTenantId = serviceLinkageIdInfo.serviceSubId

        // 試験対象関数実行
        logger.trace({ testCase: expect.getState().currentTestName }, '======= 開始 =======')
        await menberSiteControllerDao.updateServiceLinkageId(memberSiteDto)
        expect(loggerInfoSpy).toHaveBeenNthCalledWith(1, logMessageDefine.INF000 + functionName)
        expect(loggerInfoSpy).toHaveBeenLastCalledWith(logMessageDefine.INF001 + functionName)
        logger.trace({ testCase: expect.getState().currentTestName }, '======= 終了 =======')
      })

      test('02 予期せぬエラー', async () => {
        // updateSpyServiceLinkageIdModel : エラー
        const mockError = new Error('mock error')
        updateSpyServiceLinkageIdModel.mockImplementation(() => {
          throw mockError
        })
        createSpyAuthHistoryModel.mockReturnValueOnce(1)

        // memberSiteDtoの設定
        memberSiteDto.digitaltradeId = serviceLinkageIdInfo.digitaltradeId
        memberSiteDto.tradeshiftUserId = serviceLinkageIdInfo.serviceUserId
        memberSiteDto.tradeshiftTenantId = serviceLinkageIdInfo.serviceSubId

        // 試験対象関数実行
        logger.trace({ testCase: expect.getState().currentTestName }, '======= 開始 =======')

        const result = await menberSiteControllerDao.updateServiceLinkageId(memberSiteDto)
        expect(loggerErrorSpy).toHaveBeenCalledWith(
          { error: result.stack },
          'ERR-MB999 updateServiceLinkageId:runtime Error'
        )
        logger.trace({ testCase: expect.getState().currentTestName }, '======= 終了 =======')
      })
    })

    describe('03 正常処理', () => {
      test('01 正常処理', async () => {
        // DBからの正常取得を想定する
        updateSpyServiceLinkageIdModel.mockReturnValueOnce(1)
        createSpyAuthHistoryModel.mockReturnValueOnce(1)

        // memberSiteDtoの設定
        memberSiteDto.digitaltradeId = serviceLinkageIdInfo.digitaltradeId
        memberSiteDto.tradeshiftUserId = serviceLinkageIdInfo.serviceUserId
        memberSiteDto.tradeshiftTenantId = serviceLinkageIdInfo.serviceSubId

        // 試験対象関数実行
        logger.trace({ testCase: expect.getState().currentTestName }, '======= 開始 =======')
        await menberSiteControllerDao.updateServiceLinkageId(memberSiteDto)
        expect(updateSpyServiceLinkageIdModel).toHaveBeenCalledWith(
          {
            serviceUserId: memberSiteDto.tradeshiftUserId,
            serviceSubId: memberSiteDto.tradeshiftTenantId,
            serviceUserInfo: serviceLinkageIdInfo.serviceUserInfo
          },
          {
            where: {
              digitaltradeId: memberSiteDto.digitaltradeId,
              serviceCategory: 'TRS'
            }
          },
          { transaction: {} }
        )

        expect(createSpyAuthHistoryModel).toHaveBeenCalledWith(
          {
            digitaltradeId: memberSiteDto.digitaltradeId,
            authenticationLinkageId: null,
            authenticationLoginId: null,
            authenticationServiceCategory: null,
            serviceLinkageId: memberSiteDto.tradeshiftUserId,
            serviceLinkageSubId: memberSiteDto.tradeshiftTenantId,
            serviceLinkageCategory: 'TRS',
            historyCategory: 'IDLINK'
          },
          { transaction: {} }
        )

        logger.trace({ testCase: expect.getState().currentTestName }, '======= 終了 =======')
      })
    })
  })

  describe('06 createServiceLinkageId UTテスト', () => {
    let createSpyServiceLinkageIdModel, createSpyAuthHistoryModel
    beforeEach(() => {
      createSpyServiceLinkageIdModel = jest.spyOn(serviceLinkageIdModel, 'create')
      createSpyAuthHistoryModel = jest.spyOn(authHistoryModel, 'create')
    })
    afterEach(() => {
      createSpyServiceLinkageIdModel.mockRestore()
      createSpyAuthHistoryModel.mockRestore()
    })
    const functionName = 'createServiceLinkageId'
    describe('02 ログ出力確認', () => {
      test('01 開始・終了ログ', async () => {
        // DBからの正常取得を想定する
        createSpyServiceLinkageIdModel.mockReturnValueOnce(1)
        createSpyAuthHistoryModel.mockReturnValueOnce(1)

        // memberSiteDtoの設定
        memberSiteDto.digitaltradeId = serviceLinkageIdInfo.digitaltradeId
        memberSiteDto.tradeshiftUserId = serviceLinkageIdInfo.serviceUserId
        memberSiteDto.tradeshiftTenantId = serviceLinkageIdInfo.serviceSubId

        // 試験対象関数実行
        logger.trace({ testCase: expect.getState().currentTestName }, '======= 開始 =======')
        await menberSiteControllerDao.createServiceLinkageId(memberSiteDto)
        expect(loggerInfoSpy).toHaveBeenNthCalledWith(1, logMessageDefine.INF000 + functionName)
        expect(loggerInfoSpy).toHaveBeenLastCalledWith(logMessageDefine.INF001 + functionName)
        logger.trace({ testCase: expect.getState().currentTestName }, '======= 終了 =======')
      })

      test('02 予期せぬエラー', async () => {
        // updateSpyServiceLinkageIdModel : エラー
        const mockError = new Error('mock error')
        createSpyServiceLinkageIdModel.mockImplementation(() => {
          throw mockError
        })
        createSpyAuthHistoryModel.mockReturnValueOnce(1)

        // memberSiteDtoの設定
        memberSiteDto.digitaltradeId = serviceLinkageIdInfo.digitaltradeId
        memberSiteDto.tradeshiftUserId = serviceLinkageIdInfo.serviceUserId
        memberSiteDto.tradeshiftTenantId = serviceLinkageIdInfo.serviceSubId

        // 試験対象関数実行
        logger.trace({ testCase: expect.getState().currentTestName }, '======= 開始 =======')

        const result = await menberSiteControllerDao.createServiceLinkageId(memberSiteDto)
        expect(loggerErrorSpy).toHaveBeenCalledWith(
          { error: result.stack },
          'ERR-MB999 createServiceLinkageId:runtime Error'
        )
        logger.trace({ testCase: expect.getState().currentTestName }, '======= 終了 =======')
      })
    })

    describe('03 正常処理', () => {
      test('01 正常処理', async () => {
        // DBからの正常取得を想定する
        createSpyServiceLinkageIdModel.mockReturnValueOnce(1)
        createSpyAuthHistoryModel.mockReturnValueOnce(1)

        // memberSiteDtoの設定
        memberSiteDto.digitaltradeId = serviceLinkageIdInfo.digitaltradeId
        memberSiteDto.tradeshiftUserId = serviceLinkageIdInfo.serviceUserId
        memberSiteDto.tradeshiftTenantId = serviceLinkageIdInfo.serviceSubId

        // 試験対象関数実行
        logger.trace({ testCase: expect.getState().currentTestName }, '======= 開始 =======')
        await menberSiteControllerDao.createServiceLinkageId(memberSiteDto)
        expect(createSpyServiceLinkageIdModel).toHaveBeenCalledWith(
          {
            digitaltradeId: memberSiteDto.digitaltradeId,
            serviceCategory: 'TRS',
            serviceUserId: memberSiteDto.tradeshiftUserId,
            serviceSubId: memberSiteDto.tradeshiftTenantId,
            serviceUserInfo: serviceLinkageIdInfo.serviceUserInfo,
            deleteFlag: false
          },
          { transaction: {} }
        )

        expect(createSpyAuthHistoryModel).toHaveBeenCalledWith(
          {
            digitaltradeId: memberSiteDto.digitaltradeId,
            authenticationLinkageId: null,
            authenticationLoginId: null,
            authenticationServiceCategory: null,
            serviceLinkageId: memberSiteDto.tradeshiftUserId,
            serviceLinkageSubId: memberSiteDto.tradeshiftTenantId,
            serviceLinkageCategory: 'TRS',
            historyCategory: 'IDLINK'
          },
          { transaction: {} }
        )

        logger.trace({ testCase: expect.getState().currentTestName }, '======= 終了 =======')
      })
    })
  })

  describe('07 deleteDigitaltradeToken UTテスト', () => {
    let destroySpydigitaltradeTokenModel
    beforeEach(() => {
      destroySpydigitaltradeTokenModel = jest.spyOn(digitaltradeTokenModel, 'destroy')
    })
    afterEach(() => {
      destroySpydigitaltradeTokenModel.mockRestore()
    })
    const functionName = 'deleteDigitaltradeToken'
    describe('02 ログ出力確認', () => {
      test('01 開始・終了ログ', async () => {
        // DBからの正常取得を想定する
        destroySpydigitaltradeTokenModel.mockReturnValueOnce(1)

        // memberSiteDtoの設定
        memberSiteDto.digitaltradeId = digitaltaldeTokenInfo.digitaltradeId
        memberSiteDto.digitaltradeToken = digitaltaldeTokenInfo.dtToken

        // 試験対象関数実行
        logger.trace({ testCase: expect.getState().currentTestName }, '======= 開始 =======')
        await menberSiteControllerDao.deleteDigitaltradeToken(memberSiteDto)
        expect(loggerInfoSpy).toHaveBeenNthCalledWith(1, logMessageDefine.INF000 + functionName)
        expect(loggerInfoSpy).toHaveBeenLastCalledWith(logMessageDefine.INF001 + functionName)
        logger.trace({ testCase: expect.getState().currentTestName }, '======= 終了 =======')
      })

      test('02 予期せぬエラー', async () => {
        // destroySpydigitaltradeTokenModel : エラー
        const mockError = new Error('mock error')
        destroySpydigitaltradeTokenModel.mockImplementation(() => {
          throw mockError
        })

        // memberSiteDtoの設定
        memberSiteDto.digitaltradeId = digitaltaldeTokenInfo.digitaltradeId
        memberSiteDto.digitaltradeToken = digitaltaldeTokenInfo.dtToken

        // 試験対象関数実行
        logger.trace({ testCase: expect.getState().currentTestName }, '======= 開始 =======')

        const result = await menberSiteControllerDao.deleteDigitaltradeToken(memberSiteDto)
        expect(loggerErrorSpy).toHaveBeenCalledWith(
          { error: result.stack },
          'ERR-MB999 deleteDigitaltradeToken:runtime Error'
        )
        logger.trace({ testCase: expect.getState().currentTestName }, '======= 終了 =======')
      })
    })

    describe('03 正常処理', () => {
      test('01 正常処理', async () => {
        // DBからの正常取得を想定する
        destroySpydigitaltradeTokenModel.mockReturnValueOnce(1)

        // memberSiteDtoの設定
        memberSiteDto.digitaltradeId = digitaltaldeTokenInfo.digitaltradeId
        memberSiteDto.digitaltradeToken = digitaltaldeTokenInfo.dtToken

        // 試験対象関数実行
        logger.trace({ testCase: expect.getState().currentTestName }, '======= 開始 =======')
        await menberSiteControllerDao.deleteDigitaltradeToken(memberSiteDto)
        expect(destroySpydigitaltradeTokenModel).toHaveBeenCalledWith(
          {
            where: {
              dtToken: memberSiteDto.digitaltradeToken,
              digitaltradeId: memberSiteDto.digitaltradeId,
              tokenCategory: 'TRS'
            }
          },
          { transaction: {} }
        )

        logger.trace({ testCase: expect.getState().currentTestName }, '======= 終了 =======')
      })
    })
  })
})
