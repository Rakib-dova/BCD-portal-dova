'use strict'

jest.mock('../../Application/node_modules/express', () => {
  return require('jest-express')
})

const subAccountCodeEdit = require('../../Application/routes/subAccountCodeEdit')
const Request = require('jest-express').Request
const Response = require('jest-express').Response
const next = require('jest-express').Next
const helper = require('../../Application/routes/helpers/middleware')
const errorHelper = require('../../Application/routes/helpers/error')
const noticeHelper = require('../../Application/routes/helpers/notice')
const userController = require('../../Application/controllers/userController.js')
const contractController = require('../../Application/controllers/contractController.js')
const subAccountCodeController = require('../../Application/controllers/subAccountCodeController.js')
const logger = require('../../Application/lib/logger.js')

let request, response, infoSpy
let userControllerFindOneSpy
let contractControllerFindOneSpy
let checkContractStatusSpy
let subAccountCodeControllerGetSubAccountCode
let subAccountCodeControllerUpdateSubAccountCode

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
    subAccountCodeControllerGetSubAccountCode = jest.spyOn(subAccountCodeController, 'getSubAccountCode')
    request.flash = jest.fn()
    checkContractStatusSpy = jest.spyOn(helper, 'checkContractStatus')
    subAccountCodeControllerUpdateSubAccountCode = jest.spyOn(subAccountCodeController, 'updateSubAccountCode')
  })
  afterEach(() => {
    request.resetMocked()
    response.resetMocked()
    next.mockReset()
    infoSpy.mockRestore()
    userControllerFindOneSpy.mockRestore()
    contractControllerFindOneSpy.mockRestore()
    subAccountCodeControllerGetSubAccountCode.mockRestore()
    checkContractStatusSpy.mockRestore()
    subAccountCodeControllerUpdateSubAccountCode.mockRestore()
  })

  describe('ルーティング', () => {
    test('registSubAccountCodeのルーティングを確認', async () => {
      expect(subAccountCodeEdit.router.get).toBeCalledWith(
        '/:subAccountCodeId',
        helper.isAuthenticated,
        subAccountCodeEdit.cbGetIndex
      )
      expect(subAccountCodeEdit.router.post).toBeCalledWith(
        '/:subAccountCodeId',
        helper.isAuthenticated,
        subAccountCodeEdit.cbPostIndex
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
      const accountCodeAndSubAccountCode = {
        ...accountCodeList,
        subjectCode: '188121',
        subjectName: 'テスト'
      }

      subAccountCodeControllerGetSubAccountCode.mockReturnValue(accountCodeAndSubAccountCode)

      // 試験実施
      await subAccountCodeEdit.cbGetIndex(request, response, next)

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
        logTitle: '補助科目確認・変更',
        logTitleEng: 'EDIT SUB ACCOUNT CODE',
        isRegistSubAccountCode: true,
        parentCodeLabel: '勘定科目コード',
        parentCodeNameLabel: '勘定科目名',
        parentIdForCodeInput: 'setAccountCodeInputId',
        parentIdForNameInput: 'setAccountCodeNameInputId',
        pTagForcheckInput1: 'checksetAccountCodeInputId',
        pTagForcheckInput2: 'checksetSubAccountCodeInputId',
        pTagForcheckInput3: 'checksetSubAccountNameInputId',
        checkModalLabel1: '勘定科目コード',
        checkModalLabel2: '補助科目コード',
        checkModalLabel3: '補助科目名',
        valueForCodeInput: accountCodeAndSubAccountCode.subjectCode,
        valueForNameInput: accountCodeAndSubAccountCode.subjectName,
        valueForAccountCodeInput: accountCodeAndSubAccountCode.accountCodeId,
        valueForAccountCode: accountCodeAndSubAccountCode.accountCode,
        valueForAccountCodeName: accountCodeAndSubAccountCode.accountCodeName,
        parentIdForCodeInputResult: 'setAccountCodeInputIdResult'
      })
    })

    test('正常：補助科目が存在しない場合', async () => {
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

      // ユーザ権限チェック結果設定
      checkContractStatusSpy.mockReturnValue(Contracts[0].dataValues.contractStatus)

      // 確認する補助科目が確認時、消した場合
      subAccountCodeControllerGetSubAccountCode.mockReturnValue(null)

      // 試験実施
      await subAccountCodeEdit.cbGetIndex(request, response, next)

      // 期待結果
      // userContextがLoggedInになっている
      expect(request.session?.userContext).toBe('LoggedIn')
      // session.userRoleが'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'になっている
      expect(request.session?.userRole).toBe('a6a3edcd-00d9-427c-bf03-4ef0112ba16d')
      // メッセージの表示を確認
      expect(request.flash).toHaveBeenCalledWith('noti', ['補助科目一覧', '該当する補助科目が存在しませんでした。'])
      // 補助科目リスト画面へリダイレクトすることを確認
      expect(response.redirect).toHaveBeenCalledWith('/subAccountCodeList')
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
      await subAccountCodeEdit.cbGetIndex(request, response, next)

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
      await subAccountCodeEdit.cbGetIndex(request, response, next)

      // 期待結果
      // 404エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      // 400エラーがエラーハンドリング
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
      await subAccountCodeEdit.cbGetIndex(request, response, next)

      // 期待結果
      // 404エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      // userContextがLoggedInになっている
      expect(request.session?.userContext).toBe('LoggedIn')
      // 解約手続き中画面が表示「される」
      expect(next).toHaveBeenCalledWith(errorHelper.create(500))
    })

    test('500エラー：requestのsession,userIdがnullの場合', async () => {
      // 試験実施
      await subAccountCodeEdit.cbGetIndex(request, response, next)

      // 期待結果
      // 404エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      // 500エラーがエラーハンドリング
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
      await subAccountCodeEdit.cbGetIndex(request, response, next)

      // 期待結果
      // 404エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      // 500エラーがエラーハンドリング
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
      await subAccountCodeEdit.cbGetIndex(request, response, next)

      // 期待結果
      // 404エラーがエラーハンドリング
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
      await subAccountCodeEdit.cbGetIndex(request, response, next)

      // 期待結果
      // 500エラーがエラーハンドリング
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
      await subAccountCodeEdit.cbGetIndex(request, response, next)

      // 期待結果
      // 404エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      // 500エラーがエラーハンドリング
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
      await subAccountCodeEdit.cbGetIndex(request, response, next)

      // 期待結果
      // 404エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      // 500エラーがエラーハンドリング
      expect(next).toHaveBeenCalledWith(errorHelper.create(500))
    })

    test('正常：確認画面表示時、DBエラー発生', async () => {
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

      // ユーザ権限チェック結果設定
      checkContractStatusSpy.mockReturnValue(Contracts[0].dataValues.contractStatus)

      // 確認する補助科目が確認時、消した場合
      const dbError = new Error("DatabaseError [SequelizeDatabaseError]: Invalid column name 'subAccountCodeId'.")
      dbError.code = 'EREQUEST'
      dbError.number = 207
      dbError.state = 1
      dbError.class = 16
      dbError.serverName = 'sqlserver'
      dbError.procName = ''
      dbError.lineNumber = 1
      dbError.sql = 'SELECT'
      subAccountCodeControllerGetSubAccountCode.mockReturnValue(dbError)

      // 試験実施
      await subAccountCodeEdit.cbGetIndex(request, response, next)

      // 期待結果
      // userContextがLoggedInになっている
      expect(request.session?.userContext).toBe('LoggedIn')
      // session.userRoleが'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'になっている
      expect(request.session?.userRole).toBe('a6a3edcd-00d9-427c-bf03-4ef0112ba16d')
      // 500エラーがエラーハンドリング
      expect(next).toHaveBeenCalledWith(errorHelper.create(500))
    })
  })

  describe('コールバック:cbPostIndex', () => {
    test('正常:変更成功', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...user[0] }
      // パラメータ
      request.body = {
        setAccountCodeId: '1af5541e-6d8c-4335-a570-b471ff8d58e7',
        setSubAccountCodeInputId: 'A1001',
        setSubAccountCodeNameInputId: 'UTテスト'
      }
      request.params = {
        subAccountCodeId: '0a6eb23d-f91b-4266-ac72-eb59cb9f5ad1'
      }
      // メッセージ関数準備
      request.flash = jest.fn()

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[0])
      // DBからの正常な契約情報取得を想定する
      contractControllerFindOneSpy.mockReturnValue(Contracts[0])
      // ユーザ権限チェック結果設定
      checkContractStatusSpy.mockReturnValue(Contracts[0].dataValues.contractStatus)
      // subAccountCodeControllerの返却値の設定
      subAccountCodeControllerUpdateSubAccountCode.mockReturnValue(0)

      // 実施
      await subAccountCodeEdit.cbPostIndex(request, response, next)

      // 期待結果
      // メッセージ表示
      expect(request.flash).toHaveBeenCalledWith('info', '補助科目を変更しました。')
      // 補助科目一覧に遷移
      expect(response.redirect).toHaveBeenCalledWith('/subAccountCodeList')
    })

    test('準正常:値の変更なし', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...user[0] }
      // パラメータ
      request.body = {
        setAccountCodeId: '1af5541e-6d8c-4335-a570-b471ff8d58e7',
        setSubAccountCodeInputId: 'A1001',
        setSubAccountCodeNameInputId: 'UTテスト'
      }
      request.params = {
        subAccountCodeId: '0a6eb23d-f91b-4266-ac72-eb59cb9f5ad1'
      }
      // メッセージ関数準備
      request.flash = jest.fn()

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[0])
      // DBからの正常な契約情報取得を想定する
      contractControllerFindOneSpy.mockReturnValue(Contracts[0])
      // ユーザ権限チェック結果設定
      checkContractStatusSpy.mockReturnValue(Contracts[0].dataValues.contractStatus)
      // subAccountCodeControllerの返却値の設定
      subAccountCodeControllerUpdateSubAccountCode.mockReturnValue(1)

      // 実施
      await subAccountCodeEdit.cbPostIndex(request, response, next)

      // 期待結果
      // メッセージ表示
      expect(request.flash).toHaveBeenCalledWith('noti', ['補助科目変更', 'すでに登録されている値です。'])
      // 補助科目変更に戻る
      expect(response.redirect).toHaveBeenCalledWith(`/subAccountCodeEdit/${request.params.subAccountCodeId}`)
    })

    test('準正常:コードの重複', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...user[0] }
      // パラメータ
      request.body = {
        setAccountCodeId: '1af5541e-6d8c-4335-a570-b471ff8d58e7',
        setSubAccountCodeInputId: 'A1001',
        setSubAccountCodeNameInputId: 'UTテスト'
      }
      request.params = {
        subAccountCodeId: '0a6eb23d-f91b-4266-ac72-eb59cb9f5ad1'
      }
      // メッセージ関数準備
      request.flash = jest.fn()

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[0])
      // DBからの正常な契約情報取得を想定する
      contractControllerFindOneSpy.mockReturnValue(Contracts[0])
      // ユーザ権限チェック結果設定
      checkContractStatusSpy.mockReturnValue(Contracts[0].dataValues.contractStatus)
      // subAccountCodeControllerの返却値の設定
      subAccountCodeControllerUpdateSubAccountCode.mockReturnValue(-1)

      // 実施
      await subAccountCodeEdit.cbPostIndex(request, response, next)

      // 期待結果
      // メッセージ表示
      expect(request.flash).toHaveBeenCalledWith('noti', [
        '補助科目変更',
        '既に登録されている補助科目コードがあることを確認しました。'
      ])
      // 補助科目変更に戻る
      expect(response.redirect).toHaveBeenCalledWith(`/subAccountCodeEdit/${request.params.subAccountCodeId}`)
    })

    test('準正常:変更の時データが削除などで取得失敗', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...user[0] }
      // パラメータ
      request.body = {
        setAccountCodeId: '1af5541e-6d8c-4335-a570-b471ff8d58e7',
        setSubAccountCodeInputId: 'A1001',
        setSubAccountCodeNameInputId: 'UTテスト'
      }
      request.params = {
        subAccountCodeId: '0a6eb23d-f91b-4266-ac72-eb59cb9f5ad1'
      }
      // メッセージ関数準備
      request.flash = jest.fn()

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[0])
      // DBからの正常な契約情報取得を想定する
      contractControllerFindOneSpy.mockReturnValue(Contracts[0])
      // ユーザ権限チェック結果設定
      checkContractStatusSpy.mockReturnValue(Contracts[0].dataValues.contractStatus)
      // subAccountCodeControllerの返却値の設定
      subAccountCodeControllerUpdateSubAccountCode.mockReturnValue(-2)

      // 実施
      await subAccountCodeEdit.cbPostIndex(request, response, next)

      // 期待結果
      // メッセージ表示
      expect(request.flash).toHaveBeenCalledWith('noti', ['補助科目変更', '当該補助科目をDBから見つかりませんでした。'])
      // 補助科目一覧にリダイレクト
      expect(response.redirect).toHaveBeenCalledWith('/subAccountCodeList')
    })

    test('準正常:元のデータ取得失敗', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...user[0] }
      // パラメータ
      request.body = {
        setAccountCodeId: '1af5541e-6d8c-4335-a570-b471ff8d58e7',
        setSubAccountCodeInputId: 'A1001',
        setSubAccountCodeNameInputId: 'UTテスト'
      }
      request.params = {
        subAccountCodeId: '0a6eb23d-f91b-4266-ac72-eb59cb9f5ad1'
      }
      // メッセージ関数準備
      request.flash = jest.fn()

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[0])
      // DBからの正常な契約情報取得を想定する
      contractControllerFindOneSpy.mockReturnValue(Contracts[0])
      // ユーザ権限チェック結果設定
      checkContractStatusSpy.mockReturnValue(Contracts[0].dataValues.contractStatus)
      // subAccountCodeControllerの返却値の設定
      subAccountCodeControllerUpdateSubAccountCode.mockReturnValue(-3)

      // 実施
      await subAccountCodeEdit.cbPostIndex(request, response, next)

      // 期待結果
      // メッセージ表示
      expect(request.flash).toHaveBeenCalledWith('noti', [
        '補助科目変更',
        '当該補助科目をDB変更中エラーが発生しました。'
      ])
      // 補助科目一覧にリダイレクト
      expect(response.redirect).toHaveBeenCalledWith('/subAccountCodeList')
    })

    test('準正常:勘定科目コードIDの正常値ではない場合', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...user[0] }
      // パラメータ
      request.body = {
        setAccountCodeId: 'test',
        setSubAccountCodeInputId: 'A1001',
        setSubAccountCodeNameInputId: 'UTテスト'
      }
      request.params = {
        subAccountCodeId: '0a6eb23d-f91b-4266-ac72-eb59cb9f5ad1'
      }
      // メッセージ関数準備
      request.flash = jest.fn()

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[0])
      // DBからの正常な契約情報取得を想定する
      contractControllerFindOneSpy.mockReturnValue(Contracts[0])
      // ユーザ権限チェック結果設定
      checkContractStatusSpy.mockReturnValue(Contracts[0].dataValues.contractStatus)
      // subAccountCodeControllerの返却値の設定
      subAccountCodeControllerUpdateSubAccountCode.mockReturnValue(-3)

      // 実施
      await subAccountCodeEdit.cbPostIndex(request, response, next)

      // 期待結果
      // メッセージ表示
      expect(request.flash).toHaveBeenCalledWith('noti', ['補助科目変更', '変更中エラーが発生しました。'])
      // 補助科目一覧にリダイレクト
      expect(response.redirect).toHaveBeenCalledWith('/subAccountCodeList')
    })

    test('準正常:補助科目コードIDの正常値ではない場合', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...user[0] }
      // パラメータ
      request.body = {
        setAccountCodeId: '0a6eb23d-f91b-4266-ac72-eb59cb9f5ad1',
        setSubAccountCodeInputId: 'A1001',
        setSubAccountCodeNameInputId: 'UTテスト'
      }
      request.params = {
        subAccountCodeId: 'test'
      }
      // メッセージ関数準備
      request.flash = jest.fn()

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[0])
      // DBからの正常な契約情報取得を想定する
      contractControllerFindOneSpy.mockReturnValue(Contracts[0])
      // ユーザ権限チェック結果設定
      checkContractStatusSpy.mockReturnValue(Contracts[0].dataValues.contractStatus)
      // subAccountCodeControllerの返却値の設定
      subAccountCodeControllerUpdateSubAccountCode.mockReturnValue(-3)

      // 実施
      await subAccountCodeEdit.cbPostIndex(request, response, next)

      // 期待結果
      // メッセージ表示
      expect(request.flash).toHaveBeenCalledWith('noti', ['補助科目変更', '変更中エラーが発生しました。'])
      // 補助科目一覧にリダイレクト
      expect(response.redirect).toHaveBeenCalledWith('/subAccountCodeList')
    })

    test('準正常:補助科目コードの英数字ではない', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...user[0] }
      // パラメータ
      request.body = {
        setAccountCodeId: '1af5541e-6d8c-4335-a570-b471ff8d58e7',
        setSubAccountCodeInputId: 'テスト001',
        setSubAccountCodeNameInputId: 'UTテスト'
      }
      request.params = {
        subAccountCodeId: '0a6eb23d-f91b-4266-ac72-eb59cb9f5ad1'
      }
      // メッセージ関数準備
      request.flash = jest.fn()

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[0])
      // DBからの正常な契約情報取得を想定する
      contractControllerFindOneSpy.mockReturnValue(Contracts[0])
      // ユーザ権限チェック結果設定
      checkContractStatusSpy.mockReturnValue(Contracts[0].dataValues.contractStatus)
      // subAccountCodeControllerの返却値の設定
      subAccountCodeControllerUpdateSubAccountCode.mockReturnValue(-3)

      // 実施
      await subAccountCodeEdit.cbPostIndex(request, response, next)

      // 期待結果
      // メッセージ表示
      expect(request.flash).toHaveBeenCalledWith('noti', ['補助科目変更', '変更中エラーが発生しました。'])
      // 補助科目一覧にリダイレクト
      expect(response.redirect).toHaveBeenCalledWith('/subAccountCodeList')
    })

    test('準正常:補助科目コード名0桁', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...user[0] }
      // パラメータ
      request.body = {
        setAccountCodeId: '1af5541e-6d8c-4335-a570-b471ff8d58e7',
        setSubAccountCodeInputId: 'テスト001',
        setSubAccountCodeNameInputId: ' '
      }
      request.params = {
        subAccountCodeId: '0a6eb23d-f91b-4266-ac72-eb59cb9f5ad1'
      }
      // メッセージ関数準備
      request.flash = jest.fn()

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[0])
      // DBからの正常な契約情報取得を想定する
      contractControllerFindOneSpy.mockReturnValue(Contracts[0])
      // ユーザ権限チェック結果設定
      checkContractStatusSpy.mockReturnValue(Contracts[0].dataValues.contractStatus)
      // subAccountCodeControllerの返却値の設定
      subAccountCodeControllerUpdateSubAccountCode.mockReturnValue(-3)

      // 実施
      await subAccountCodeEdit.cbPostIndex(request, response, next)

      // 期待結果
      // メッセージ表示
      expect(request.flash).toHaveBeenCalledWith('noti', ['補助科目変更', '変更中エラーが発生しました。'])
      // 補助科目一覧にリダイレクト
      expect(response.redirect).toHaveBeenCalledWith('/subAccountCodeList')
    })

    test('準正常:補助科目コード名40桁超過', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...user[0] }
      // パラメータ
      request.body = {
        setAccountCodeId: '1af5541e-6d8c-4335-a570-b471ff8d58e7',
        setSubAccountCodeInputId: 'テスト001',
        setSubAccountCodeNameInputId: 'UTテスト'
      }
      request.params = {
        subAccountCodeId: '0a6eb23d-f91b-4266-ac72-eb59cb9f5ad1'
      }
      // メッセージ関数準備
      request.flash = jest.fn()

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[0])
      // DBからの正常な契約情報取得を想定する
      contractControllerFindOneSpy.mockReturnValue(Contracts[0])
      // ユーザ権限チェック結果設定
      checkContractStatusSpy.mockReturnValue(Contracts[0].dataValues.contractStatus)
      // subAccountCodeControllerの返却値の設定
      subAccountCodeControllerUpdateSubAccountCode.mockReturnValue(-3)

      // 実施
      await subAccountCodeEdit.cbPostIndex(request, response, next)

      // 期待結果
      // メッセージ表示
      expect(request.flash).toHaveBeenCalledWith('noti', ['補助科目変更', '変更中エラーが発生しました。'])
      // 補助科目一覧にリダイレクト
      expect(response.redirect).toHaveBeenCalledWith('/subAccountCodeList')
    })

    test('500エラー：変更中コントローラエラー発生', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...user[0] }
      // パラメータ
      request.body = {
        setAccountCodeId: '1af5541e-6d8c-4335-a570-b471ff8d58e7',
        setSubAccountCodeInputId: 'UTEST',
        setSubAccountCodeNameInputId: 'UTテスト'
      }
      request.params = {
        subAccountCodeId: '0a6eb23d-f91b-4266-ac72-eb59cb9f5ad1'
      }
      // メッセージ関数準備
      request.flash = jest.fn()

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[0])
      // DBからの正常な契約情報取得を想定する
      contractControllerFindOneSpy.mockReturnValue(Contracts[0])
      // ユーザ権限チェック結果設定
      checkContractStatusSpy.mockReturnValue(Contracts[0].dataValues.contractStatus)
      // DBエラー
      const dbError = new Error('DatabaseError [SequelizeDatabaseError]')
      dbError.code = 'EREQUEST'
      dbError.number = 207
      dbError.state = 1
      dbError.class = 16
      dbError.serverName = 'sqlserver'
      dbError.procName = ''
      dbError.lineNumber = 1
      dbError.sql = 'SELECT'
      // subAccountCodeControllerの返却値の設定
      subAccountCodeControllerUpdateSubAccountCode.mockReturnValue(dbError)

      // 実施
      await subAccountCodeEdit.cbPostIndex(request, response, next)

      // 期待結果
      // 500エラーハンドリング
      expect(next).toHaveBeenCalledWith(errorHelper.create(500))
    })

    test('500エラー：不正なcheckContractStatus(null)', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...user[0] }
      // パラメータ
      request.body = {
        setAccountCodeId: '1af5541e-6d8c-4335-a570-b471ff8d58e7',
        setSubAccountCodeInputId: 'A1001',
        setSubAccountCodeNameInputId: 'UTテスト'
      }
      request.params = {
        subAccountCodeId: '0a6eb23d-f91b-4266-ac72-eb59cb9f5ad1'
      }
      // メッセージ関数準備
      request.flash = jest.fn()

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[0])
      // DBからの正常な契約情報取得を想定する
      contractControllerFindOneSpy.mockReturnValue(Contracts[0])
      // ユーザ権限チェック結果設定
      checkContractStatusSpy.mockReturnValue(null)
      // subAccountCodeControllerの返却値の設定
      subAccountCodeControllerUpdateSubAccountCode.mockReturnValue(-3)

      // 実施
      await subAccountCodeEdit.cbPostIndex(request, response, next)

      // 期待結果
      // 500エラーハンドリング確認
      expect(next).toHaveBeenCalledWith(errorHelper.create(500))
    })

    test('500エラー：不正なcheckContractStatus(999)', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...user[0] }
      // パラメータ
      request.body = {
        setAccountCodeId: '1af5541e-6d8c-4335-a570-b471ff8d58e7',
        setSubAccountCodeInputId: 'A1001',
        setSubAccountCodeNameInputId: 'UTテスト'
      }
      request.params = {
        subAccountCodeId: '0a6eb23d-f91b-4266-ac72-eb59cb9f5ad1'
      }
      // メッセージ関数準備
      request.flash = jest.fn()

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[0])
      // DBからの正常な契約情報取得を想定する
      contractControllerFindOneSpy.mockReturnValue(Contracts[0])
      // ユーザ権限チェック結果設定
      checkContractStatusSpy.mockReturnValue(999)
      // subAccountCodeControllerの返却値の設定
      subAccountCodeControllerUpdateSubAccountCode.mockReturnValue(-3)

      // 実施
      await subAccountCodeEdit.cbPostIndex(request, response, next)

      // 期待結果
      // 500エラーハンドリング確認
      expect(next).toHaveBeenCalledWith(errorHelper.create(500))
    })

    test('500エラー：解約申込中の場合', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...user[0] }
      // パラメータ
      request.body = {
        setAccountCodeId: '1af5541e-6d8c-4335-a570-b471ff8d58e7',
        setSubAccountCodeInputId: 'A1001',
        setSubAccountCodeNameInputId: 'UTテスト'
      }
      request.params = {
        subAccountCodeId: '0a6eb23d-f91b-4266-ac72-eb59cb9f5ad1'
      }
      // メッセージ関数準備
      request.flash = jest.fn()

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[6])
      // DBからの正常な契約情報取得を想定する
      contractControllerFindOneSpy.mockReturnValue(Contracts[5])
      // ユーザ権限チェック結果設定
      checkContractStatusSpy.mockReturnValue('00')
      // subAccountCodeControllerの返却値の設定
      subAccountCodeControllerUpdateSubAccountCode.mockReturnValue()

      // 実施
      await subAccountCodeEdit.cbPostIndex(request, response, next)

      // 期待結果
      // 解約画面表示
      expect(next).toHaveBeenCalledWith(noticeHelper.create('cancelprocedure'))
    })

    test('500エラー：DBユーザの情報なし', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...user[0] }
      // パラメータ
      request.body = {
        setAccountCodeId: '1af5541e-6d8c-4335-a570-b471ff8d58e7',
        setSubAccountCodeInputId: 'A1001',
        setSubAccountCodeNameInputId: 'UTテスト'
      }
      request.params = {
        subAccountCodeId: '0a6eb23d-f91b-4266-ac72-eb59cb9f5ad1'
      }
      // メッセージ関数準備
      request.flash = jest.fn()

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(null)
      // DBからの正常な契約情報取得を想定する
      contractControllerFindOneSpy.mockReturnValue()
      // ユーザ権限チェック結果設定
      checkContractStatusSpy.mockReturnValue()
      // subAccountCodeControllerの返却値の設定
      subAccountCodeControllerUpdateSubAccountCode.mockReturnValue()

      // 実施
      await subAccountCodeEdit.cbPostIndex(request, response, next)

      // 期待結果
      // 500ハンドリング
      expect(next).toHaveBeenCalledWith(errorHelper.create(500))
    })

    test('500エラー：ユーザの取得時、DBエラー発生', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...user[0] }
      // パラメータ
      request.body = {
        setAccountCodeId: '1af5541e-6d8c-4335-a570-b471ff8d58e7',
        setSubAccountCodeInputId: 'A1001',
        setSubAccountCodeNameInputId: 'UTテスト'
      }
      request.params = {
        subAccountCodeId: '0a6eb23d-f91b-4266-ac72-eb59cb9f5ad1'
      }
      // メッセージ関数準備
      request.flash = jest.fn()
      // DBエラー
      const dbError = new Error('DatabaseError [SequelizeDatabaseError]')
      dbError.code = 'EREQUEST'
      dbError.number = 207
      dbError.state = 1
      dbError.class = 16
      dbError.serverName = 'sqlserver'
      dbError.procName = ''
      dbError.lineNumber = 1
      dbError.sql = 'SELECT'

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(dbError)
      // DBからの正常な契約情報取得を想定する
      contractControllerFindOneSpy.mockReturnValue()
      // ユーザ権限チェック結果設定
      checkContractStatusSpy.mockReturnValue()
      // subAccountCodeControllerの返却値の設定
      subAccountCodeControllerUpdateSubAccountCode.mockReturnValue()

      // 実施
      await subAccountCodeEdit.cbPostIndex(request, response, next)

      // 期待結果
      // 500ハンドリング
      expect(next).toHaveBeenCalledWith(errorHelper.create(500))
    })

    test('404エラー：ユーザのステータスが0ではない', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...Users[8] }
      // パラメータ
      request.body = {
        setAccountCodeId: '1af5541e-6d8c-4335-a570-b471ff8d58e7',
        setSubAccountCodeInputId: 'A1001',
        setSubAccountCodeNameInputId: 'UTテスト'
      }
      request.params = {
        subAccountCodeId: '0a6eb23d-f91b-4266-ac72-eb59cb9f5ad1'
      }
      // メッセージ関数準備
      request.flash = jest.fn()

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[8])
      // DBからの正常な契約情報取得を想定する
      contractControllerFindOneSpy.mockReturnValue()
      // ユーザ権限チェック結果設定
      checkContractStatusSpy.mockReturnValue()
      // subAccountCodeControllerの返却値の設定
      subAccountCodeControllerUpdateSubAccountCode.mockReturnValue()

      // 実施
      await subAccountCodeEdit.cbPostIndex(request, response, next)

      // 期待結果
      // 500ハンドリング
      expect(next).toHaveBeenCalledWith(errorHelper.create(404))
    })

    test('400エラー：userContextがnotLoogedIn', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...notLoggedInsession }
      request.user = { ...Users[0] }
      // パラメータ
      request.body = {
        setAccountCodeId: '1af5541e-6d8c-4335-a570-b471ff8d58e7',
        setSubAccountCodeInputId: 'A1001',
        setSubAccountCodeNameInputId: 'UTテスト'
      }
      request.params = {
        subAccountCodeId: '0a6eb23d-f91b-4266-ac72-eb59cb9f5ad1'
      }
      // メッセージ関数準備
      request.flash = jest.fn()

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[0])

      // 実施
      await subAccountCodeEdit.cbPostIndex(request, response, next)

      // 期待結果
      // 400ハンドリング
      expect(next).toHaveBeenCalledWith(errorHelper.create(400))
    })

    test('500エラー：contract取得なし', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...Users[0] }
      // パラメータ
      request.body = {
        setAccountCodeId: '1af5541e-6d8c-4335-a570-b471ff8d58e7',
        setSubAccountCodeInputId: 'A1001',
        setSubAccountCodeNameInputId: 'UTテスト'
      }
      request.params = {
        subAccountCodeId: '0a6eb23d-f91b-4266-ac72-eb59cb9f5ad1'
      }
      // メッセージ関数準備
      request.flash = jest.fn()

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[0])
      // DBからの正常な契約情報取得を想定する
      contractControllerFindOneSpy.mockReturnValue(null)

      // 実施
      await subAccountCodeEdit.cbPostIndex(request, response, next)

      // 期待結果
      // 500ハンドリング
      expect(next).toHaveBeenCalledWith(errorHelper.create(500))
    })

    test('500エラー：contract取得時、エラー発生', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...Users[0] }
      // パラメータ
      request.body = {
        setAccountCodeId: '1af5541e-6d8c-4335-a570-b471ff8d58e7',
        setSubAccountCodeInputId: 'A1001',
        setSubAccountCodeNameInputId: 'UTテスト'
      }
      request.params = {
        subAccountCodeId: '0a6eb23d-f91b-4266-ac72-eb59cb9f5ad1'
      }
      // メッセージ関数準備
      request.flash = jest.fn()
      // DBエラー
      const dbError = new Error('DatabaseError [SequelizeDatabaseError]')
      dbError.code = 'EREQUEST'
      dbError.number = 207
      dbError.state = 1
      dbError.class = 16
      dbError.serverName = 'sqlserver'
      dbError.procName = ''
      dbError.lineNumber = 1
      dbError.sql = 'SELECT'

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[0])
      // DBからの正常な契約情報取得を想定する
      contractControllerFindOneSpy.mockReturnValue(dbError)

      // 実施
      await subAccountCodeEdit.cbPostIndex(request, response, next)

      // 期待結果
      // 500ハンドリング
      expect(next).toHaveBeenCalledWith(errorHelper.create(500))
    })
  })
})
