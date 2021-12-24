'use strict'

jest.mock('../../Application/node_modules/express', () => {
  return require('jest-express')
})

const registSubAccountCode = require('../../Application/routes/registSubAccountCode')
const Request = require('jest-express').Request
const Response = require('jest-express').Response
const next = require('jest-express').Next
const helper = require('../../Application/routes/helpers/middleware')
const errorHelper = require('../../Application/routes/helpers/error')
const noticeHelper = require('../../Application/routes/helpers/notice')
const userController = require('../../Application/controllers/userController.js')
const contractController = require('../../Application/controllers/contractController.js')
const accountCodeController = require('../../Application/controllers/accountCodeController.js')
const subAccountCodeController = require('../../Application/controllers/subAccountCodeController.js')
const logger = require('../../Application/lib/logger.js')

let request, response, infoSpy
let userControllerFindOneSpy,
  contractControllerFindOneSpy,
  accountCodeControllerSearchAccountCodetSpy,
  checkContractStatusSpy,
  subAccountCodeControllerInsertSpy,
  accountCodeControllerGetAccountCodeListSpy

// 404エラー定義
const error404 = new Error('お探しのページは見つかりませんでした。')
error404.name = 'Not Found'
error404.status = 404

const user = [
  {
    // 契約ステータス：契約中
    userId: '388014b9-d667-4144-9cc4-5da420981438'
  },
  {
    // 契約ステータス：解約中
    userId: '3b3ff8ac-f544-4eee-a4b0-0ca7a0edacea'
  },
  {
    // ユーザステータス：0以外
    userId: '045fb5fd-7cd1-499e-9e1d-b3635b039d9f'
  }
]

// 正常セッションでの場合
const session = {
  userContext: 'LoggedIn',
  userRole: 'dummy'
}

// 正常セッションではない場合
const notLoggedInsession = {
  userContext: 'dummy',
  userRole: 'dummy'
}

const accountCodeList = {
  accountCodeId: '6eb2a17e-ae3a-4300-a83e-7e4c6e6aaffc',
  accountCode: 'A01001',
  accountCodeName: 'accountCodeName'
}

// モックテーブル定義
const Users = require('../mockDB/Users_Table')
const Contracts = require('../mockDB/Contracts_Table')

describe('registSubAccountCodeのテスト', () => {
  beforeEach(() => {
    request = new Request()
    response = new Response()
    infoSpy = jest.spyOn(logger, 'info')
    userControllerFindOneSpy = jest.spyOn(userController, 'findOne')
    contractControllerFindOneSpy = jest.spyOn(contractController, 'findOne')
    accountCodeControllerSearchAccountCodetSpy = jest.spyOn(accountCodeController, 'searchAccountCode')
    accountCodeControllerGetAccountCodeListSpy = jest.spyOn(accountCodeController, 'getAccountCodeList')
    subAccountCodeControllerInsertSpy = jest.spyOn(subAccountCodeController, 'insert')
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
    accountCodeControllerSearchAccountCodetSpy.mockRestore()
    accountCodeControllerGetAccountCodeListSpy.mockRestore()
    subAccountCodeControllerInsertSpy.mockRestore()
    checkContractStatusSpy.mockRestore()
  })

  describe('ルーティング', () => {
    test('registSubAccountCodeのルーティングを確認', async () => {
      expect(registSubAccountCode.router.get).toBeCalledWith(
        '/',
        helper.isAuthenticated,
        registSubAccountCode.cbGetIndex
      )
      expect(registSubAccountCode.router.post).toBeCalledWith(
        '/getAccountCode',
        helper.isAuthenticated,
        registSubAccountCode.cbPostGetAccountCode
      )
      expect(registSubAccountCode.router.post).toBeCalledWith(
        '/',
        helper.isAuthenticated,
        registSubAccountCode.cbPostIndex
      )
    })
  })

  describe('コールバック:cbGetIndex', () => {
    test('正常', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...user[0] }

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[0])
      // DBからの正常な契約情報取得を想定する
      contractControllerFindOneSpy.mockReturnValue(Contracts[0])

      // ユーザ権限チェック結果設定
      checkContractStatusSpy.mockReturnValue(Contracts[0].dataValues.contractStatus)

      accountCodeControllerGetAccountCodeListSpy.mockReturnValue([accountCodeList])

      // 試験実施
      await registSubAccountCode.cbGetIndex(request, response, next)

      // 期待結果
      // userContextがLoggedInになっている
      expect(request.session?.userContext).toBe('LoggedIn')
      // session.userRoleが'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'になっている
      expect(request.session?.userRole).toBe('a6a3edcd-00d9-427c-bf03-4ef0112ba16d')
      // response.renderでregistSubAccountCodeが呼ばれ「る」
      expect(response.render).toHaveBeenCalledWith('registSubAccountCode', {
        codeName: '補助科目',
        codeLabel: '補助科目コード',
        codeNameLabel: '補助科目名',
        requiredTagCode: 'subAccountCodeTagRequired',
        requiredTagName: 'subAccountCodeNameRequired',
        idForCodeInput: 'setSubAccountCodeInputId',
        idForNameInput: 'setSubAccountCodeNameInputId',
        modalTitle: '補助科目設定確認',
        backUrl: '/subAccountCodeList',
        logTitle: '補助科目登録',
        logTitleEng: 'REGIST SUB ACCOUNT CODE',
        isRegistSubAccountCode: true,
        parentCodeLabel: '勘定科目コード',
        parentCodeNameLabel: '勘定科目名',
        parentIdForCodeInput: 'setAccountCodeInputId',
        parentIdForCodeInputResult: 'setAccountCodeInputIdResult',
        parentIdForNameInput: 'setAccountCodeNameInputId',
        pTagForcheckInput1: 'checksetAccountCodeInputId',
        pTagForcheckInput2: 'checksetSubAccountCodeInputId',
        pTagForcheckInput3: 'checksetSubAccountNameInputId',
        checkModalLabel1: '勘定科目コード',
        checkModalLabel2: '補助科目コード',
        checkModalLabel3: '補助科目名'
      })
    })

    test('正常：勘定科目が存在しない場合', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...user[0] }
      request.body = {
        accountCode: 'A01001',
        accountCodeName: 'accountCodeName'
      }
      request.flash = jest.fn()

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[0])
      // DBからの正常な契約情報取得を想定する
      contractControllerFindOneSpy.mockReturnValue(Contracts[0])
      accountCodeControllerGetAccountCodeListSpy.mockReturnValue([])

      // ユーザ権限チェック結果設定
      checkContractStatusSpy.mockReturnValue(Contracts[0].dataValues.contractStatus)

      // 試験実施
      await registSubAccountCode.cbGetIndex(request, response, next)

      // 期待結果
      // userContextがLoggedInになっている
      expect(request.session?.userContext).toBe('LoggedIn')
      // session.userRoleが'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'になっている
      expect(request.session?.userRole).toBe('a6a3edcd-00d9-427c-bf03-4ef0112ba16d')

      expect(request.flash).toHaveBeenCalledWith('noti', ['補助科目登録', '事前に勘定科目登録する必要があります。'])
    })

    test('正常：解約申込中の場合', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...user[1] }

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[1])
      // DBからの正常な契約情報取得を想定する
      contractControllerFindOneSpy.mockReturnValue(Contracts[5])
      // ユーザ権限チェック結果設定
      checkContractStatusSpy.mockReturnValue(Contracts[5].dataValues.contractStatus)
      // 試験実施
      await registSubAccountCode.cbGetIndex(request, response, next)

      // 期待結果
      // 404エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)

      // userContextがLoggedInになっている
      expect(request.session?.userContext).toBe('LoggedIn')
      // session.userRoleが'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'になっている
      expect(request.session?.userRole).toBe('a6a3edcd-00d9-427c-bf03-4ef0112ba16d')
      // 解約手続き中画面が表示「される」
      expect(next).toHaveBeenCalledWith(noticeHelper.create('cancelprocedure'))
    })

    test('400エラー:LoggedInではないsessionの場合', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...notLoggedInsession }
      request.user = { ...user[1] }

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[1])
      // DBからの正常な契約情報取得を想定する
      contractControllerFindOneSpy.mockReturnValue(Contracts[1])
      // 試験実施
      await registSubAccountCode.cbGetIndex(request, response, next)

      // 期待結果
      // 404，500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      expect(next).toHaveBeenCalledWith(errorHelper.create(400))
    })

    test('500エラー:不正なContractデータの場合', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...user[1] }

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[1])
      // DBからの不正な契約情報取得を想定する
      contractControllerFindOneSpy.mockReturnValue(null)
      // 試験実施
      await registSubAccountCode.cbGetIndex(request, response, next)

      // 期待結果
      // 404，500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      // expect(next).not.toHaveBeenCalledWith(errorHelper.create(500))
      // userContextがLoggedInになっている
      expect(request.session?.userContext).toBe('LoggedIn')
      // 解約手続き中画面が表示「される」
      expect(next).toHaveBeenCalledWith(errorHelper.create(500))
    })

    test('500エラー：requestのsession,userIdがnullの場合', async () => {
      // 試験実施
      await registSubAccountCode.cbGetIndex(request, response, next)

      // 期待結果
      // 404，500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)

      // 解約手続き中画面が表示「される」
      expect(next).toHaveBeenCalledWith(errorHelper.create(500))
    })

    test('500エラー：user検索の時、DBエラー', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...user[2] }

      // DBからの正常なユーザデータの取得を想定する
      const userDbError = new Error('User Table Error')
      userControllerFindOneSpy.mockReturnValue(userDbError)

      // 試験実施
      await registSubAccountCode.cbGetIndex(request, response, next)

      // 期待結果
      // 404，500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)

      // 解約手続き中画面が表示「される」
      expect(next).toHaveBeenCalledWith(errorHelper.create(500))
    })

    test('500エラー：user.statusが0ではない場合', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...user[2] }

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[8])

      // 試験実施
      await registSubAccountCode.cbGetIndex(request, response, next)

      // 期待結果
      expect(next).toHaveBeenCalledWith(errorHelper.create(404))
    })

    test('500エラー：contracts検索の時、DBエラー', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...user[0] }

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[0])
      const contractDbError = new Error('Contracts Table Error')
      contractControllerFindOneSpy.mockReturnValue(contractDbError)

      // 試験実施
      await registSubAccountCode.cbGetIndex(request, response, next)

      // 期待結果
      expect(next).toHaveBeenCalledWith(errorHelper.create(500))
    })

    test('500エラー：不正なcheckContractStatus(null)', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...user[0] }

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[1])
      // DBからの正常な契約情報取得を想定する
      contractControllerFindOneSpy.mockReturnValue(Contracts[1])
      // ユーザ権限チェック結果設定
      checkContractStatusSpy.mockReturnValue(null)
      // 試験実施
      await registSubAccountCode.cbGetIndex(request, response, next)

      // 期待結果
      // 404エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      expect(next).toHaveBeenCalledWith(errorHelper.create(500))
    })

    test('500エラー：不正なcheckContractStatus(999)', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...user[0] }

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[1])
      // DBからの正常な契約情報取得を想定する
      contractControllerFindOneSpy.mockReturnValue(Contracts[1])

      // ユーザ権限チェック結果設定
      checkContractStatusSpy.mockReturnValue(999)

      // 試験実施
      await registSubAccountCode.cbGetIndex(request, response, next)

      // 期待結果
      // 404エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      expect(next).toHaveBeenCalledWith(errorHelper.create(500))
    })
  })

  describe('コールバック:cbPostGetAccountCode', () => {
    test('正常', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...user[0] }
      request.body = {
        accountCode: 'A01001',
        accountCodeName: 'accountCodeName'
      }

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[0])
      // DBからの正常な契約情報取得を想定する
      contractControllerFindOneSpy.mockReturnValue(Contracts[0])
      accountCodeControllerSearchAccountCodetSpy.mockReturnValue({
        accountCodeId: '6eb2a17e-ae3a-4300-a83e-7e4c6e6aaffc',
        accountCode: 'A01001',
        accountCodeName: 'accountCodeName'
      })

      // ユーザ権限チェック結果設定
      checkContractStatusSpy.mockReturnValue(Contracts[0].dataValues.contractStatus)

      // 試験実施
      await registSubAccountCode.cbPostGetAccountCode(request, response, next)

      // 期待結果
      // userContextがLoggedInになっている
      expect(request.session?.userContext).toBe('LoggedIn')
      // session.userRoleが'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'になっている
      expect(request.session?.userRole).toBe('a6a3edcd-00d9-427c-bf03-4ef0112ba16d')

      expect(response.body).toEqual({
        accountCodeId: '6eb2a17e-ae3a-4300-a83e-7e4c6e6aaffc',
        accountCode: 'A01001',
        accountCodeName: 'accountCodeName'
      })
    })

    test('異常:勘定科目コード11桁、勘定科目名41桁以上の場合', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.flash = jest.fn()
      request.session = { ...session }
      request.user = { ...user[0] }
      request.body = {
        accountCode: 'A01001A01001',
        accountCodeName: 'accountCodeNameaccountCodeNameaccountCodeName'
      }

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[0])
      // DBからの正常な契約情報取得を想定する
      contractControllerFindOneSpy.mockReturnValue(Contracts[0])
      // ユーザ権限チェック結果設定
      checkContractStatusSpy.mockReturnValue(Contracts[0].dataValues.contractStatus)

      // 試験実施
      await registSubAccountCode.cbPostGetAccountCode(request, response, next)

      // 期待結果
      // userContextがLoggedInになっている
      expect(request.session?.userContext).toBe('LoggedIn')
      // session.userRoleが'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'になっている
      expect(request.session?.userRole).toBe('a6a3edcd-00d9-427c-bf03-4ef0112ba16d')
      // responseのヘッダ
      expect(response.status).toHaveBeenCalledWith(400)
      expect(response.body).toEqual('400 Bad Request')
    })

    test('異常:勘定科目コード、勘定科目名未入力の場合', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.flash = jest.fn()
      request.session = { ...session }
      request.user = { ...user[0] }
      request.body = {}

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[0])
      // DBからの正常な契約情報取得を想定する
      contractControllerFindOneSpy.mockReturnValue(Contracts[0])
      // ユーザ権限チェック結果設定
      checkContractStatusSpy.mockReturnValue(Contracts[0].dataValues.contractStatus)

      accountCodeControllerSearchAccountCodetSpy.mockReturnValue(accountCodeList)

      // 試験実施
      await registSubAccountCode.cbPostGetAccountCode(request, response, next)

      // 期待結果
      // userContextがLoggedInになっている
      expect(request.session?.userContext).toBe('LoggedIn')
      // session.userRoleが'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'になっている
      expect(request.session?.userRole).toBe('a6a3edcd-00d9-427c-bf03-4ef0112ba16d')
      // responseのヘッダ
      expect(response.body).toEqual(accountCodeList)
    })

    test('400エラー:LoggedInではないsessionの場合', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...notLoggedInsession }
      request.user = { ...user[1] }

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[1])
      // DBからの正常な契約情報取得を想定する
      contractControllerFindOneSpy.mockReturnValue(Contracts[1])
      // 試験実施
      await registSubAccountCode.cbPostGetAccountCode(request, response, next)

      // 期待結果
      // 404，500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      expect(next).toHaveBeenCalledWith(errorHelper.create(400))
    })

    test('500エラー：requestのsession,userIdがnullの場合', async () => {
      // 試験実施
      await registSubAccountCode.cbPostGetAccountCode(request, response, next)

      // 期待結果
      // 404，500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      expect(next).toHaveBeenCalledWith(errorHelper.create(500))
    })

    test('500エラー：user検索の時、DBエラー', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...user[0] }

      // DBからの正常なユーザデータの取得を想定する
      const userDbError = new Error('User Table Error')
      userControllerFindOneSpy.mockReturnValue(userDbError)
      // DBからの正常な契約情報取得を想定する
      contractControllerFindOneSpy.mockReturnValue(Contracts[1])

      // 試験実施
      await registSubAccountCode.cbPostGetAccountCode(request, response, next)

      // 期待結果
      // 404，500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      expect(next).toHaveBeenCalledWith(errorHelper.create(500))
    })

    test('500エラー：user.statusが0ではない場合', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...user[0] }
      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue({ dataValues: { userStatus: 1 } })
      // DBからの正常な契約情報取得を想定する
      contractControllerFindOneSpy.mockReturnValue(Contracts[1])

      // 試験実施
      await registSubAccountCode.cbPostGetAccountCode(request, response, next)

      // 期待結果
      // 404，500エラーがエラーハンドリング「されない」
      expect(next).toHaveBeenCalledWith(error404)
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(500))
    })

    test('500エラー：contracts検索の時、DBエラー', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...user[0] }

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[1])
      // DBからの正常な契約情報取得を想定する
      const contractDbError = new Error('Contracts Table Error')
      contractControllerFindOneSpy.mockReturnValue(contractDbError)

      // 試験実施
      await registSubAccountCode.cbPostGetAccountCode(request, response, next)

      // 期待結果
      // 404，500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      expect(next).toHaveBeenCalledWith(errorHelper.create(500))
    })

    test('500エラー：不正なContractStatus(null)、 DBエラー', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...user[0] }

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[1])
      // DBからの正常な契約情報取得を想定する
      contractControllerFindOneSpy.mockReturnValue(Contracts[1])

      // ユーザ権限チェック結果設定
      checkContractStatusSpy.mockReturnValue(null)

      // 試験実施
      await registSubAccountCode.cbPostGetAccountCode(request, response, next)

      // 期待結果
      // 404エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      expect(next).toHaveBeenCalledWith(errorHelper.create(500))
    })

    test('500エラー：不正なContractStatus、 DBエラー', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...user[0] }

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[1])
      // DBからの正常な契約情報取得を想定する
      contractControllerFindOneSpy.mockReturnValue(Contracts[1])
      // ユーザ権限チェック結果設定
      checkContractStatusSpy.mockReturnValue(999)

      // 試験実施
      await registSubAccountCode.cbPostGetAccountCode(request, response, next)

      // 期待結果
      // 404エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      expect(next).toHaveBeenCalledWith(errorHelper.create(500))
    })

    test('解約', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...user[0] }
      request.body = {
        setAccountCodeInputId: 'A01001',
        setAccountCodeNameInputId: 'setAccountCodeNameInputId'
      }

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[7])
      // DBからの正常な契約情報取得を想定する
      contractControllerFindOneSpy.mockReturnValue(Contracts[6])
      // ユーザ権限チェック結果設定
      checkContractStatusSpy.mockReturnValue(Contracts[6].dataValues.contractStatus)
      // 試験実施
      await registSubAccountCode.cbPostGetAccountCode(request, response, next)

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
  })

  describe('コールバック:cbPostIndex', () => {
    test('正常', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...user[0] }
      request.body = {
        setAccountCodeInputId: 'A01001',
        setSubAccountCodeInputId: 'A01001001',
        setSubAccountCodeNameInputId: 'setSubAccountCodeNameInputId'
      }
      request.flash = jest.fn()

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[0])
      // DBからの正常な契約情報取得を想定する
      contractControllerFindOneSpy.mockReturnValue(Contracts[0])
      // ユーザ権限チェック結果設定
      checkContractStatusSpy.mockReturnValue(Contracts[0].dataValues.contractStatus)
      // 補助科目登録結果設定
      subAccountCodeControllerInsertSpy.mockReturnValue(0)

      // 試験実施
      await registSubAccountCode.cbPostIndex(request, response, next)

      // 期待結果
      // userContextがLoggedInになっている
      expect(request.session?.userContext).toBe('LoggedIn')
      // session.userRoleが'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'になっている
      expect(request.session?.userRole).toBe('a6a3edcd-00d9-427c-bf03-4ef0112ba16d')
      // response.renderでportalが呼ばれ「る」
      expect(response.getHeader('Location')).toEqual('/subAccountCodeList')
      expect(request.flash).toHaveBeenCalledWith('info', '補助科目を登録しました。')
    })

    test('正常：解約申込中の場合', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...user[1] }

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[1])
      // DBからの正常な契約情報取得を想定する
      contractControllerFindOneSpy.mockReturnValue(Contracts[5])
      // ユーザ権限チェック結果設定
      checkContractStatusSpy.mockReturnValue(Contracts[5].dataValues.contractStatus)
      // 試験実施
      await registSubAccountCode.cbPostIndex(request, response, next)

      // 期待結果
      // 404エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)

      // userContextがLoggedInになっている
      expect(request.session?.userContext).toBe('LoggedIn')
      // session.userRoleが'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'になっている
      expect(request.session?.userRole).toBe('a6a3edcd-00d9-427c-bf03-4ef0112ba16d')
      // 解約手続き中画面が表示「される」
      expect(next).toHaveBeenCalledWith(noticeHelper.create('cancelprocedure'))
    })

    test('正常：補助科目が重複の場合', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...user[0] }
      request.body = {
        setAccountCodeInputId: 'A01001',
        setSubAccountCodeInputId: 'A01001001',
        setSubAccountCodeNameInputId: 'setSubAccountCodeNameInputId'
      }
      request.flash = jest.fn()

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[0])
      // DBからの正常な契約情報取得を想定する
      contractControllerFindOneSpy.mockReturnValue(Contracts[0])
      // ユーザ権限チェック結果設定
      checkContractStatusSpy.mockReturnValue(Contracts[0].dataValues.contractStatus)
      // 補助科目登録結果設定
      subAccountCodeControllerInsertSpy.mockReturnValue(1)

      // 試験実施
      await registSubAccountCode.cbPostIndex(request, response, next)

      // 期待結果
      // userContextがLoggedInになっている
      expect(request.session?.userContext).toBe('LoggedIn')
      // session.userRoleが'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'になっている
      expect(request.session?.userRole).toBe('a6a3edcd-00d9-427c-bf03-4ef0112ba16d')
      // response.renderでregistSubAccountCodeが呼ばれ「る」
      expect(response.getHeader('Location')).toEqual('/registSubAccountCode')
      expect(request.flash).toHaveBeenCalledWith('noti', ['補助科目登録', '補助科目登録に失敗しました。'])
    })

    test('異常：補助科目登録失敗の場合', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...user[0] }
      request.body = {
        setAccountCodeInputId: 'A01001',
        setSubAccountCodeInputId: 'A01001001',
        setSubAccountCodeNameInputId: 'setSubAccountCodeNameInputId'
      }
      request.flash = jest.fn()

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[0])
      // DBからの正常な契約情報取得を想定する
      contractControllerFindOneSpy.mockReturnValue(Contracts[0])
      // ユーザ権限チェック結果設定
      checkContractStatusSpy.mockReturnValue(Contracts[0].dataValues.contractStatus)
      // 補助科目登録結果設定
      subAccountCodeControllerInsertSpy.mockReturnValue(-1)

      // 試験実施
      await registSubAccountCode.cbPostIndex(request, response, next)

      // 期待結果
      // userContextがLoggedInになっている
      expect(request.session?.userContext).toBe('LoggedIn')
      // session.userRoleが'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'になっている
      expect(request.session?.userRole).toBe('a6a3edcd-00d9-427c-bf03-4ef0112ba16d')
      // response.renderでregistSubAccountCodeが呼ばれ「る」
      expect(response.getHeader('Location')).toEqual('/registSubAccountCode')
      expect(request.flash).toHaveBeenCalledWith('noti', ['補助科目登録', '補助科目登録に失敗しました。'])
    })

    test('異常：補助科目登録DBエラーの場合', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...user[0] }
      request.body = {
        setAccountCodeInputId: 'A01001',
        setSubAccountCodeInputId: 'A01001001',
        setSubAccountCodeNameInputId: 'setSubAccountCodeNameInputId'
      }

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[0])
      // DBからの正常な契約情報取得を想定する
      contractControllerFindOneSpy.mockReturnValue(Contracts[0])
      // ユーザ権限チェック結果設定
      checkContractStatusSpy.mockReturnValue(Contracts[0].dataValues.contractStatus)
      // 補助科目登録DBエラー設定
      const insertDbError = new Error('SubAccountCode Table Error')
      subAccountCodeControllerInsertSpy.mockReturnValue(insertDbError)

      // 試験実施
      await registSubAccountCode.cbPostIndex(request, response, next)

      // 期待結果
      // userContextがLoggedInになっている
      expect(request.session?.userContext).toBe('LoggedIn')
      // session.userRoleが'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'になっている
      expect(request.session?.userRole).toBe('a6a3edcd-00d9-427c-bf03-4ef0112ba16d')
      // response.renderでregistSubAccountCodeが呼ばれ「る」
      expect(next).toHaveBeenCalledWith(errorHelper.create(500))
    })

    test('400エラー:LoggedInではないsessionの場合', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...notLoggedInsession }
      request.user = { ...user[1] }

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[1])
      // DBからの正常な契約情報取得を想定する
      contractControllerFindOneSpy.mockReturnValue(Contracts[1])
      // 試験実施
      await registSubAccountCode.cbPostIndex(request, response, next)

      // 期待結果
      // 404，500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      expect(next).toHaveBeenCalledWith(errorHelper.create(400))
    })

    test('500エラー:不正なContractデータの場合', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...user[1] }

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[1])
      // DBからの不正な契約情報取得を想定する
      contractControllerFindOneSpy.mockReturnValue(null)
      // 試験実施
      await registSubAccountCode.cbPostIndex(request, response, next)

      // 期待結果
      // 404，500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      // expect(next).not.toHaveBeenCalledWith(errorHelper.create(500))
      // userContextがLoggedInになっている
      expect(request.session?.userContext).toBe('LoggedIn')
      // 解約手続き中画面が表示「される」
      expect(next).toHaveBeenCalledWith(errorHelper.create(500))
    })

    test('500エラー：requestのsession,userIdがnullの場合', async () => {
      // 試験実施
      await registSubAccountCode.cbPostIndex(request, response, next)

      // 期待結果
      // 404，500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)

      // 解約手続き中画面が表示「される」
      expect(next).toHaveBeenCalledWith(errorHelper.create(500))
    })

    test('500エラー：user検索の時、DBエラー', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...user[2] }

      // DBからの正常なユーザデータの取得を想定する
      const userDbError = new Error('User Table Error')
      userControllerFindOneSpy.mockReturnValue(userDbError)

      // 試験実施
      await registSubAccountCode.cbPostIndex(request, response, next)

      // 期待結果
      // 404，500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)

      // 解約手続き中画面が表示「される」
      expect(next).toHaveBeenCalledWith(errorHelper.create(500))
    })

    test('500エラー：user.statusが0ではない場合', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...user[2] }

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[8])

      // 試験実施
      await registSubAccountCode.cbPostIndex(request, response, next)

      // 期待結果
      expect(next).toHaveBeenCalledWith(errorHelper.create(404))
    })

    test('500エラー：contracts検索の時、DBエラー', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...user[0] }

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[0])
      const contractDbError = new Error('Contracts Table Error')
      contractControllerFindOneSpy.mockReturnValue(contractDbError)

      // 試験実施
      await registSubAccountCode.cbPostIndex(request, response, next)

      // 期待結果
      expect(next).toHaveBeenCalledWith(errorHelper.create(500))
    })

    test('500エラー：不正なcheckContractStatus(null)', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...user[0] }

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[1])
      // DBからの正常な契約情報取得を想定する
      contractControllerFindOneSpy.mockReturnValue(Contracts[1])
      // ユーザ権限チェック結果設定
      checkContractStatusSpy.mockReturnValue(null)
      // 試験実施
      await registSubAccountCode.cbPostIndex(request, response, next)

      // 期待結果
      // 404エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      expect(next).toHaveBeenCalledWith(errorHelper.create(500))
    })

    test('500エラー：不正なcheckContractStatus(999)', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...user[0] }

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[1])
      // DBからの正常な契約情報取得を想定する
      contractControllerFindOneSpy.mockReturnValue(Contracts[1])

      // ユーザ権限チェック結果設定
      checkContractStatusSpy.mockReturnValue(999)

      // 試験実施
      await registSubAccountCode.cbPostIndex(request, response, next)

      // 期待結果
      // 404エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      expect(next).toHaveBeenCalledWith(errorHelper.create(500))
    })
  })
})
