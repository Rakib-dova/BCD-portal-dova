'use strict'

jest.mock('../../Application/node_modules/express', () => {
  return require('jest-express')
})

const accountCodeEdit = require('../../Application/routes/accountCodeEdit')
const Request = require('jest-express').Request
const Response = require('jest-express').Response
const next = require('jest-express').Next
const helper = require('../../Application/routes/helpers/middleware')
const errorHelper = require('../../Application/routes/helpers/error')
const noticeHelper = require('../../Application/routes/helpers/notice')
const userController = require('../../Application/controllers/userController.js')
const contractController = require('../../Application/controllers/contractController.js')
const tenantController = require('../../Application/controllers/tenantController')
const accountCodeController = require('../../Application/controllers/accountCodeController.js')
const logger = require('../../Application/lib/logger.js')

let request, response, infoSpy
let userControllerFindOneSpy,
  contractControllerFindOneSpy,
  accountCodeControllerGetAccountCodeSpy,
  tenatnsFindOneSpy,
  userControllerFindAndUpdate,
  contractControllerFindContractSpy,
  checkContractStatusSpy

// 404エラー定義
const error404 = new Error('お探しのページは見つかりませんでした。')
error404.name = 'Not Found'
error404.status = 404

// 正常セッションでの場合
const session = {
  userContext: 'LoggedIn',
  userRole: 'dummy'
}

// モックテーブル定義
const Users = require('../mockDB/Users_Table')
const Contracts = require('../mockDB/Contracts_Table')
const Tenants = require('../mockDB/Tenants_Table')
const AccountCode = require('../mockDB/AccountCode_Table')

describe('accountCodeEditのテスト', () => {
  beforeEach(() => {
    request = new Request()
    response = new Response()
    infoSpy = jest.spyOn(logger, 'info')
    userControllerFindOneSpy = jest.spyOn(userController, 'findOne')
    userControllerFindAndUpdate = jest.spyOn(userController, 'findAndUpdate')
    contractControllerFindOneSpy = jest.spyOn(contractController, 'findOne')
    contractControllerFindContractSpy = jest.spyOn(contractController, 'findContract')
    accountCodeControllerGetAccountCodeSpy = jest.spyOn(accountCodeController, 'getAccountCode')
    tenatnsFindOneSpy = jest.spyOn(tenantController, 'findOne')
    request.flash = jest.fn()
    checkContractStatusSpy = jest.spyOn(helper, 'checkContractStatus')
  })
  afterEach(() => {
    request.resetMocked()
    response.resetMocked()
    next.mockReset()
    infoSpy.mockRestore()
    userControllerFindOneSpy.mockRestore()
    contractControllerFindOneSpy.mockRestore()
    contractControllerFindContractSpy.mockRestore()
    userControllerFindAndUpdate.mockRestore()
    accountCodeControllerGetAccountCodeSpy.mockRestore()
    tenatnsFindOneSpy.mockRestore()
    checkContractStatusSpy.mockRestore()
  })

  describe('ルーティング', () => {
    test('accountCodeのルーティングを確認', async () => {
      expect(accountCodeEdit.router.get).toBeCalledWith(
        '/:accountCodeId',
        helper.isAuthenticated,
        accountCodeEdit.cbGetIndex
      )
    })
  })

  describe('コールバック:cbGetIndex', () => {
    test('正常', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...Users[0] }

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[0])
      // DBからの正常な契約情報取得を想定する
      contractControllerFindOneSpy.mockReturnValue(Contracts[0])
      // DBからの正常なテナント情報取得を想定する
      tenatnsFindOneSpy.mockReturnValue(Tenants[0])
      // DBからの正常なコントラクター情報取得を想定する
      contractControllerFindContractSpy.mockReturnValue(Contracts[0])
      // DBからの正常な勘定科目情報取得を想定する
      accountCodeControllerGetAccountCodeSpy.mockReturnValue(AccountCode[0])

      // 試験実施
      await accountCodeEdit.cbGetIndex(request, response, next)

      // 期待結果
      // userContextがLoggedInになっている
      expect(request.session?.userContext).toBe('LoggedIn')
      // session.userRoleが'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'になっている
      expect(request.session?.userRole).toBe('a6a3edcd-00d9-427c-bf03-4ef0112ba16d')
      // response.renderでregistAccountCodeが呼ばれ「る」
      expect(response.render).toHaveBeenCalledWith('registAccountCode', {
        codeName: '勘定科目確認・変更',
        codeLabel: '勘定科目コード',
        codeNameLabel: '勘定科目名',
        requiredTagCode: 'accountCodeTagRequired',
        requiredTagName: 'accountCodeNameRequired',
        idForCodeInput: 'setAccountCodeInputId',
        idForNameInput: 'setAccountCodeNameInputId',
        modalTitle: '勘定科目設定確認',
        backUrl: '/accountCodeList',
        valueForCodeInput: AccountCode[0].accountCode,
        valueForNameInput: AccountCode[0].accountCodeName
      })
    })

    test('正常：データがない場合', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...Users[0] }

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[0])
      // DBからの正常な契約情報取得を想定する
      contractControllerFindOneSpy.mockReturnValue(Contracts[0])
      // DBからの正常なテナント情報取得を想定する
      tenatnsFindOneSpy.mockReturnValue(Tenants[0])
      // DBからの正常なコントラクター情報取得を想定する
      contractControllerFindContractSpy.mockReturnValue(Contracts[0])
      // DBからの正常な勘定科目情報取得を想定する
      accountCodeControllerGetAccountCodeSpy.mockReturnValue(null)

      // 試験実施
      await accountCodeEdit.cbGetIndex(request, response, next)

      // 期待結果
      // userContextがLoggedInになっている
      expect(request.session?.userContext).toBe('LoggedIn')
      // session.userRoleが'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'になっている
      expect(request.session?.userRole).toBe('a6a3edcd-00d9-427c-bf03-4ef0112ba16d')
      // response.renderでregistAccountCodeが呼ばれ「る」
      expect(response.render).toHaveBeenCalledWith('registAccountCode', {
        codeName: '勘定科目確認・変更',
        codeLabel: '勘定科目コード',
        codeNameLabel: '勘定科目名',
        requiredTagCode: 'accountCodeTagRequired',
        requiredTagName: 'accountCodeNameRequired',
        idForCodeInput: 'setAccountCodeInputId',
        idForNameInput: 'setAccountCodeNameInputId',
        modalTitle: '勘定科目設定確認',
        backUrl: '/accountCodeList',
        valueForCodeInput: '',
        valueForNameInput: ''
      })
    })

    test('正常：解約申込中の場合', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...Users[6] }

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[6])
      // DBからの正常な契約情報取得を想定する
      contractControllerFindOneSpy.mockReturnValue(Contracts[5])
      // DBからの正常な勘定科目情報取得を想定する
      tenatnsFindOneSpy.mockReturnValue(Tenants[5])

      // 試験実施
      await accountCodeEdit.cbGetIndex(request, response, next)

      // 期待結果
      // 404，500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      // expect(next).not.toHaveBeenCalledWith(errorHelper.create(500))
      // userContextがLoggedInになっている
      expect(request.session?.userContext).toBe('LoggedIn')
      // session.userRoleが'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'になっている
      expect(request.session?.userRole).toBe('a6a3edcd-00d9-427c-bf03-4ef0112ba16d')
      // 解約手続き中画面が表示「される」
      expect(next).toHaveBeenCalledWith(noticeHelper.create('cancelprocedure'))
    })

    test('500エラー:不正なContractデータの場合', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...Users[9] }

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[9])
      // DBからの正常な契約情報取得を想定する
      contractControllerFindOneSpy.mockReturnValue(Contracts[7])
      // DBからの正常な勘定科目情報取得を想定する
      tenatnsFindOneSpy.mockReturnValue(Tenants[8])

      // 試験実施
      await accountCodeEdit.cbGetIndex(request, response, next)

      // 期待結果
      // 404エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      // userContextがLoggedInになっている
      expect(request.session?.userContext).toBe('LoggedIn')
      // session.userRoleが'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'になっている
      expect(request.session?.userRole).toBe('a6a3edcd-00d9-427c-bf03-4ef0112ba16d')
      // 解約手続き中画面が表示「される」
      expect(next).toHaveBeenCalledWith(errorHelper.create(500))
    })

    test('500エラー：requestのsession,userIdがnullの場合', async () => {
      // 試験実施
      await accountCodeEdit.cbGetIndex(request, response, next)

      // 期待結果
      // 404エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)

      // 解約手続き中画面が表示「される」
      expect(next).toHaveBeenCalledWith(errorHelper.create(500))
    })

    test('500エラー：user検索の時、DBエラー', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...Users[0] }

      // DBからの正常なユーザデータの取得を想定する
      const userDbError = new Error('User Table Error')
      userControllerFindOneSpy.mockReturnValue(userDbError)

      // 試験実施
      await accountCodeEdit.cbGetIndex(request, response, next)

      // 期待結果
      // 404エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)

      // 解約手続き中画面が表示「される」
      expect(next).toHaveBeenCalledWith(errorHelper.create(500))
    })

    test('500エラー：user.statusが0ではない場合', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...Users[8] }

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[8])

      // 試験実施
      await accountCodeEdit.cbGetIndex(request, response, next)

      // 期待結果
      expect(next).toHaveBeenCalledWith(errorHelper.create(404))
    })

    test('500エラー：contracts検索の時、DBエラー', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...Users[0] }

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[0])
      const contractDbError = new Error('Contracts Table Error')
      contractControllerFindOneSpy.mockReturnValue(contractDbError)

      // 試験実施
      await accountCodeEdit.cbGetIndex(request, response, next)

      // 期待結果
      expect(next).toHaveBeenCalledWith(errorHelper.create(500))
    })

    test('500エラー：不正なcheckContractStatus(null)', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...Users[9] }

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[9])
      // DBからの正常な契約情報取得を想定する
      contractControllerFindOneSpy.mockReturnValue(Contracts[7])
      // DBからの正常なテナント情報取得を想定する
      tenatnsFindOneSpy.mockReturnValue(null)
      // DBからの正常なコントラクター情報取得を想定する
      contractControllerFindContractSpy.mockReturnValue(Contracts[7])

      // checkContractStatusからreturnされる値設定
      checkContractStatusSpy.mockReturnValue(null)

      // 試験実施
      await accountCodeEdit.cbGetIndex(request, response, next)

      // 期待結果
      // 404エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      expect(next).toHaveBeenCalledWith(errorHelper.create(500))
    })

    test('500エラー：不正なcheckContractStatus(999)', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...Users[0] }

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[0])
      // DBからの正常な契約情報取得を想定する
      contractControllerFindOneSpy.mockReturnValue(Contracts[8])
      // DBからの正常なテナント情報取得を想定する
      tenatnsFindOneSpy.mockReturnValue(Tenants[0])
      // DBからの正常なコントラクター情報取得を想定する
      contractControllerFindContractSpy.mockReturnValue(Contracts[8])

      // checkContractStatusからreturnされる値設定
      checkContractStatusSpy.mockReturnValue(999)
      // 試験実施
      await accountCodeEdit.cbGetIndex(request, response, next)

      // 期待結果
      // 404エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      expect(next).toHaveBeenCalledWith(errorHelper.create(500))
    })
  })
})
