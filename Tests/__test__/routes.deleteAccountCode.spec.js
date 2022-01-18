/* eslint-disable new-cap */
'use strict'

jest.mock('../../Application/node_modules/express', () => {
  return require('jest-express')
})

const deleteAccountCode = require('../../Application/routes/deleteAccountCode')
const Request = require('jest-express').Request
const Response = require('jest-express').Response
const next = require('jest-express').Next
const helper = require('../../Application/routes/helpers/middleware')
const userController = require('../../Application/controllers/userController.js')
const contractController = require('../../Application/controllers/contractController.js')
const tenantController = require('../../Application/controllers/tenantController')
const AccountCodeController = require('../../Application/controllers/accountCodeController')
const logger = require('../../Application/lib/logger.js')
const path = require('path')

if (process.env.LOCALLY_HOSTED === 'true') {
  // NODE_ENVはJestがデフォルトでtestに指定する。dotenvで上書きできなかったため、package.jsonの実行引数でdevelopmentを指定
  require('dotenv').config({ path: './config/.env' })
}

let request, response
let infoSpy, findOneSpy, findOneSypTenant, findOneSpyContracts, pathSpy
let helpercheckContractStatusSpy, deleteForAccountCodeSpy

describe('deleteAccountCodeのテスト', () => {
  beforeEach(() => {
    request = new Request()
    response = new Response()
    infoSpy = jest.spyOn(logger, 'info')
    findOneSpy = jest.spyOn(userController, 'findOne')
    findOneSypTenant = jest.spyOn(tenantController, 'findOne')
    findOneSpyContracts = jest.spyOn(contractController, 'findOne')
    pathSpy = jest.spyOn(path, 'join')
    helpercheckContractStatusSpy = jest.spyOn(helper, 'checkContractStatus')
    deleteForAccountCodeSpy = jest.spyOn(AccountCodeController, 'deleteForAccountCode')
  })
  afterEach(() => {
    request.resetMocked()
    response.resetMocked()
    next.mockReset()
    infoSpy.mockRestore()
    findOneSpy.mockRestore()
    findOneSypTenant.mockRestore()
    findOneSpyContracts.mockRestore()
    pathSpy.mockRestore()
    helpercheckContractStatusSpy.mockRestore()
    deleteForAccountCodeSpy.mockRestore()
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

  describe('ルーティング', () => {
    test('deleteAccountCodeのルーティングを確認', async () => {
      expect(deleteAccountCode.router.delete).toHaveBeenLastCalledWith(
        '/:accountCodeId',
        deleteAccountCode.cbDeleteAccountCode
      )
    })
  })

  describe('cbDeleteAccountCode', () => {
    test('正常：削除完了', async () => {
      request.session = {
        usercontext: 'LoggedIn',
        userRole: 'dummy'
      }
      request.user = {
        userId: '12345678-cb0b-48ad-857d-4b42a44ede13'
      }
      request.params = {
        accountCodeId: '55555555-cb0b-48ad-857d-4b42a44ede13'
      }

      findOneSpy.mockReturnValue(dataValues)
      findOneSpyContracts.mockReturnValue(contractdataValues)
      // ユーザ権限チェック結果設定
      helpercheckContractStatusSpy.mockReturnValue(contractdataValues.dataValues.contractStatus)

      request.flash = jest.fn()

      // 削除結果（Mock）
      deleteForAccountCodeSpy.mockReturnValue(1)

      // 勘定科目削除実施
      await deleteAccountCode.cbDeleteAccountCode(request, response, next)

      // request.flashが呼ばれ「る」
      expect(request.flash).toHaveBeenCalledWith('info', '勘定科目を削除しました。')

      // 正常の場合、レスポンスボディのresultで1を返す
      expect(response.body.result).toBe(1)
    })

    test('準正常：解約中', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = {
        usercontext: 'LoggedIn',
        userRole: 'dummy'
      }
      request.user = {
        userId: '12345678-cb0b-48ad-857d-4b42a44ede13'
      }

      // DBからの正常なユーザデータの取得を想定する
      findOneSpy.mockReturnValue(dataValues)
      // DBからの正常な契約情報取得を想定する
      findOneSpyContracts.mockReturnValue(contractInfoDatatoBeReceiptCancel)
      // ユーザ権限チェック結果設定
      helpercheckContractStatusSpy.mockReturnValue(contractInfoDatatoBeReceiptCancel.dataValues.contractStatus)

      // 勘定科目削除実施
      await deleteAccountCode.cbDeleteAccountCode(request, response, next)

      // 期待結果
      // 404，500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      expect(next).not.toHaveBeenCalledWith(error500)

      // 解約中の場合、レスポンスボディのresultで0を返す
      expect(response.body.result).toBe(0)
    })

    test('準正常:既に削除しました。', async () => {
      request.session = {
        usercontext: 'LoggedIn',
        userRole: 'dummy'
      }
      request.user = {
        userId: '12345678-cb0b-48ad-857d-4b42a44ede13'
      }
      request.params = {
        accountCodeId: '55555555-cb0b-48ad-857d-4b42a44ede13'
      }

      findOneSpy.mockReturnValue(dataValues)
      findOneSpyContracts.mockReturnValue(contractdataValues)
      helper.checkContractStatus = (req, res, nex) => {
        return '00'
      }

      // 削除結果（Mock）
      deleteForAccountCodeSpy.mockReturnValue(-1)

      // 勘定科目削除実施
      await deleteAccountCode.cbDeleteAccountCode(request, response, next)

      // 準正常の場合（既に削除された場合）、レスポンスボディのresultで-1を返す
      expect(response.body.result).toBe(-1)
    })

    test('準正常:DBエラー発生', async () => {
      request.session = {
        usercontext: 'LoggedIn',
        userRole: 'dummy'
      }
      request.user = {
        userId: '12345678-cb0b-48ad-857d-4b42a44ede13'
      }

      findOneSpy.mockReturnValue(dataValues)
      findOneSpyContracts.mockReturnValue(contractdataValues)
      helper.checkContractStatus = (req, res, nex) => {
        return '00'
      }

      // 勘定科目削除実施
      await deleteAccountCode.cbDeleteAccountCode(request, response, next)

      // 準正常の場合（DBエラー発生）、レスポンスボディのresultで0を返す
      expect(response.body.result).toBe(0)
    })

    test('異常：500エラー（DBからユーザ取得エラー）', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = {
        userContext: 'LoggedIn',
        userRole: 'dummy'
      }
      request.user = user
      // DBからのユーザデータの取得ができなかった(null)場合を想定する
      findOneSpy.mockReturnValue(null)
      findOneSpyContracts.mockReturnValue(contractdataValues)
      // ユーザ権限チェック結果設定
      helpercheckContractStatusSpy.mockReturnValue(contractdataValues.dataValues.contractStatus)
      // 勘定科目削除実施
      await deleteAccountCode.cbDeleteAccountCode(request, response, next)

      // 期待結果
      // 500エラーの場合レスポンスボディのresultで0を返す
      expect(response.body.result).toBe(0)
    })

    test('異常：404エラーDBから取得したユーザのuserStatusが0以外の場合', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = {
        userContext: 'NotLoggedIn',
        userRole: 'dummy'
      }
      request.user = user
      // DBから取得したユーザデータのuserStatusが0以外の場合を想定する
      findOneSpy.mockReturnValue(dataValuesStatuserr)
      findOneSpyContracts.mockReturnValue(contractdataValues)
      // ユーザ権限チェック結果設定
      helpercheckContractStatusSpy.mockReturnValue(contractdataValues.dataValues.contractStatus)

      // 勘定科目削除実施
      await deleteAccountCode.cbDeleteAccountCode(request, response, next)

      // 期待結果
      // 404エラーの場合レスポンスボディのresultで0を返す
      expect(response.body.result).toBe(0)
    })

    test('異常：500エラー（ContractStatusが取得されない場合）', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = {
        userContext: 'LoggedIn',
        userRole: 'dummy'
      }
      request.user = user

      // DBからの正常なユーザデータの取得を想定する
      findOneSpy.mockReturnValue(dataValues)
      // DBからの契約情報を取得出来なかったことを想定する
      findOneSpyContracts.mockReturnValue(null)

      // 勘定科目削除実施
      await deleteAccountCode.cbDeleteAccountCode(request, response, next)

      // 期待結果
      // 500エラーの場合レスポンスボディのresultで0を返す
      expect(response.body.result).toBe(0)
    })

    test('異常：500エラー（不正なContractStatus）', async () => {
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
      findOneSpyContracts.mockReturnValue(contractdataValues4)
      // ユーザ権限チェック結果設定
      helpercheckContractStatusSpy.mockReturnValue(999)

      // 勘定科目削除実施
      await deleteAccountCode.cbDeleteAccountCode(request, response, next)

      // 期待結果
      // 500エラーの場合レスポンスボディのresultで0を返す
      expect(response.body.result).toBe(0)
    })
  })
})
