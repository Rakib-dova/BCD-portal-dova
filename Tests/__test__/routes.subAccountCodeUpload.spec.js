'use strict'

jest.mock('../../Application/node_modules/express', () => {
  return require('jest-express')
})
process.env.INVOICE_UPLOAD_PATH ?? JSON.stringify({ INVOICE_UPLOAD_PATH: './testData' })
const subAccountCodeUpload = require('../../Application/routes/subAccountCodeUpload')
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
const subAccountUploadController = require('../../Application/controllers/subAccountUploadController.js')
const logger = require('../../Application/lib/logger.js')

let request, response, infoSpy
let userControllerFindOneSpy,
  contractControllerFindOneSpy,
  accountCodeControllerGetAccountCodeSpy,
  tenatnsFindOneSpy,
  userControllerFindAndUpdate,
  contractControllerFindContractSpy,
  checkContractStatusSpy,
  updatedAccountCodeSpy,
  subAccountUploadControllerUploadSpy

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

describe('accountCodeUploadのテスト', () => {
  beforeEach(() => {
    request = new Request()
    request.body = {}
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
    updatedAccountCodeSpy = jest.spyOn(accountCodeController, 'updatedAccountCode')
    subAccountUploadControllerUploadSpy = jest.spyOn(subAccountUploadController, 'upload')
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
    updatedAccountCodeSpy.mockRestore()
    subAccountUploadControllerUploadSpy.mockRestore()
  })

  describe('ルーティング', () => {
    test('accountCodeのルーティングを確認', async () => {
      expect(subAccountCodeUpload.router.get).toBeCalledWith(
        '/',
        helper.isAuthenticated,
        subAccountCodeUpload.cbGetIndex
      )

      expect(subAccountCodeUpload.router.post).toBeCalledWith(
        '/',
        helper.isAuthenticated,
        expect.any(Function),
        subAccountCodeUpload.cbPostIndex
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

      // 試験実施
      await subAccountCodeUpload.cbGetIndex(request, response, next)

      // 期待結果
      // userContextがLoggedInになっている
      expect(request.session?.userContext).toBe('LoggedIn')
      // session.userRoleが'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'になっている
      expect(request.session?.userRole).toBe('a6a3edcd-00d9-427c-bf03-4ef0112ba16d')
      // response.renderでsubAccountUploadが呼ばれ「る」
      expect(response.render).toHaveBeenCalledWith('subAccountUpload', {
        uploadCommonLayoutTitle: '補助科目一括作成',
        uploadCommonLayoutEngTitle: 'BULK UPLOAD SUBACCOUNT CODE',
        fileInputName: 'bulkSubAccountCode',
        cautionForSelectedFile: 'ファイルを選択してください。',
        listLocation: '/subAccountCodeList',
        formatFileLocation: '../html/補助科目一括作成フォーマット.csv',
        formatFileLinkText: 'アップロード用CSVファイルダウンロード',
        listLoacationName: '補助科目一覧→',
        accountCodeUpload: '/uploadSubAccount',
        procedureContents: {
          procedureComment1: '1. 下記リンクをクリックし、アップロード用のCSVファイルをダウンロード',
          procedureComment2: '2. CSVファイルに補助科目を記入',
          procedureComment2Children: [
            'A列：勘定科目コード 英・数字のみ（10桁）',
            'B列：補助科目コード 英・数字のみ（10桁）',
            'C列：補助科目名 文字列（40桁）',
            '※1ファイルで作成できる補助科目の数は200まで',
            '※登録済みの勘定科目コードを入力してください'
          ],
          procedureComment3: '3.「ファイル選択」ボタンをクリックし、記入したCSVファイルを選択',
          procedureComment4: '4.「アップロード開始」ボタンをクリック',
          procedureTitle: '(手順)'
        }
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
      // DBからの正常な補助科目情報取得を想定する
      tenatnsFindOneSpy.mockReturnValue(Tenants[5])
      // ユーザ権限チェック結果設定
      checkContractStatusSpy.mockReturnValue('30')

      // 試験実施
      await subAccountCodeUpload.cbGetIndex(request, response, next)

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

    test('500エラー:不正なContractデータの場合', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...Users[9] }

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[9])
      // DBからの正常な契約情報取得を想定する
      contractControllerFindOneSpy.mockReturnValue(Contracts[7])
      // DBからの正常な補助科目情報取得を想定する
      tenatnsFindOneSpy.mockReturnValue(Tenants[8])

      // 試験実施
      await subAccountCodeUpload.cbGetIndex(request, response, next)

      // 期待結果
      // 404エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      // userContextがLoggedInになっている
      expect(request.session?.userContext).toBe('LoggedIn')
      // session.userRoleが'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'になっている
      expect(request.session?.userRole).toBe('a6a3edcd-00d9-427c-bf03-4ef0112ba16d')
      // 500エラーがエラーハンドリング「される」
      expect(next).toHaveBeenCalledWith(errorHelper.create(500))
    })

    test('500エラー：requestのsession,userIdがnullの場合', async () => {
      // 試験実施
      await subAccountCodeUpload.cbGetIndex(request, response, next)

      // 期待結果
      // 404エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)

      // 500エラーがエラーハンドリング「される」
      expect(next).toHaveBeenCalledWith(errorHelper.create(500))
    })

    test('500エラー：user検索の時、DBエラー', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...Users[0] }

      // DBからエラーが発生することを想定する
      const userDbError = new Error('User Table Error')
      userControllerFindOneSpy.mockReturnValue(userDbError)

      // 試験実施
      await subAccountCodeUpload.cbGetIndex(request, response, next)

      // 期待結果
      // 404エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)

      // 500エラーがエラーハンドリング「される」
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
      await subAccountCodeUpload.cbGetIndex(request, response, next)

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
      await subAccountCodeUpload.cbGetIndex(request, response, next)

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
      tenatnsFindOneSpy.mockReturnValue(Tenants[8])
      // DBからの正常なコントラクター情報取得を想定する
      contractControllerFindContractSpy.mockReturnValue(Contracts[7])

      // checkContractStatusからreturnされる値設定
      checkContractStatusSpy.mockReturnValue(null)

      // 試験実施
      await subAccountCodeUpload.cbGetIndex(request, response, next)

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
      await subAccountCodeUpload.cbGetIndex(request, response, next)

      // 期待結果
      // 404エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      expect(next).toHaveBeenCalledWith(errorHelper.create(500))
    })
  })

  describe('コールバック:cbPostIndex', () => {
    test('正常：補助科目コードと補助科目名一括作成', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...Users[0] }
      request.file = {
        originalname: 'test1.csv',
        userId: '74a9717e-4ed8-4430-9109-9ab7e850bdc7',
        fileName: 'filename'
      }

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[0])
      // DBからの正常な契約情報取得を想定する
      contractControllerFindOneSpy.mockReturnValue(Contracts[0])
      // DBからの正常なテナント情報取得を想定する
      tenatnsFindOneSpy.mockReturnValue(Tenants[0])
      // DBからの正常なコントラクター情報取得を想定する
      contractControllerFindContractSpy.mockReturnValue(Contracts[0])
      // subAccountUploadController.uploadのモックバリュー
      subAccountUploadControllerUploadSpy.mockReturnValue(0)

      // 試験実施
      await subAccountCodeUpload.cbPostIndex(request, response, next)

      // 期待結果
      // userContextがLoggedInになっている
      expect(request.session?.userContext).toBe('LoggedIn')
      // session.userRoleが'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'になっている
      expect(request.session?.userRole).toBe('a6a3edcd-00d9-427c-bf03-4ef0112ba16d')
      // request.flashが呼ばれ「る」
      expect(request.flash).toHaveBeenCalledWith('info', '補助科目取込が完了しました。')
      // 補助科目一覧へリダイレクトされ「る」
      expect(response.redirect).toHaveBeenCalledWith('/subAccountCodeList')
    })

    test('異常：補助科目コードと補助科目名一括作成', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...Users[0] }
      request.file = {
        originalname: 'test1.csv',
        userId: '74a9717e-4ed8-4430-9109-9ab7e850bdc7',
        fileName: 'filename'
      }

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[0])
      // DBからの正常な契約情報取得を想定する
      contractControllerFindOneSpy.mockReturnValue(Contracts[0])
      // DBからの正常なテナント情報取得を想定する
      tenatnsFindOneSpy.mockReturnValue(Tenants[0])
      // DBからの正常なコントラクター情報取得を想定する
      contractControllerFindContractSpy.mockReturnValue(Contracts[0])
      // subAccountUploadController.uploadのモックバリュー
      subAccountUploadControllerUploadSpy.mockReturnValue(new Error())

      // 試験実施
      await subAccountCodeUpload.cbPostIndex(request, response, next)

      // 期待結果
      // userContextがLoggedInになっている
      expect(request.session?.userContext).toBe('LoggedIn')
      // session.userRoleが'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'になっている
      expect(request.session?.userRole).toBe('a6a3edcd-00d9-427c-bf03-4ef0112ba16d')
      // request.flashが呼ばれ「る」
      expect(request.flash).toHaveBeenCalledWith('noti', [
        '取込に失敗しました。',
        'システムエラーです。<BR>（後程、接続してください。）',
        'SYSERR'
      ])
      // 補助科目一覧へリダイレクトされ「る」
      expect(response.redirect).toHaveBeenCalledWith('/uploadSubAccount')
    })

    test('準正常：補助科目取込が完了（ヘッダーに誤り）', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...Users[0] }
      request.file = {
        originalname: 'test1.csv',
        userId: '74a9717e-4ed8-4430-9109-9ab7e850bdc7',
        fileName: 'filename'
      }

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[0])
      // DBからの正常な契約情報取得を想定する
      contractControllerFindOneSpy.mockReturnValue(Contracts[0])
      // DBからの正常なテナント情報取得を想定する
      tenatnsFindOneSpy.mockReturnValue(Tenants[0])
      // DBからの正常なコントラクター情報取得を想定する
      contractControllerFindContractSpy.mockReturnValue(Contracts[0])
      // subAccountUploadController.uploadのモックバリュー
      subAccountUploadControllerUploadSpy.mockReturnValue(-1)

      // 試験実施
      await subAccountCodeUpload.cbPostIndex(request, response, next)

      // 期待結果
      // userContextがLoggedInになっている
      expect(request.session?.userContext).toBe('LoggedIn')
      // session.userRoleが'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'になっている
      expect(request.session?.userRole).toBe('a6a3edcd-00d9-427c-bf03-4ef0112ba16d')
      // request.flashが呼ばれ「る」
      expect(request.flash).toHaveBeenCalledWith('noti', [
        '取込に失敗しました。',
        'ヘッダーが指定のものと異なります。',
        'SYSERR'
      ])
      // 補助科目一覧へリダイレクトされ「る」
      expect(response.redirect).toHaveBeenCalledWith('/uploadSubAccount')
    })

    test('準正常：補助科目取込が完了（取込データが存在しない）', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...Users[0] }
      request.file = {
        originalname: 'test1.csv',
        userId: '74a9717e-4ed8-4430-9109-9ab7e850bdc7',
        fileName: 'filename'
      }

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[0])
      // DBからの正常な契約情報取得を想定する
      contractControllerFindOneSpy.mockReturnValue(Contracts[0])
      // DBからの正常なテナント情報取得を想定する
      tenatnsFindOneSpy.mockReturnValue(Tenants[0])
      // DBからの正常なコントラクター情報取得を想定する
      contractControllerFindContractSpy.mockReturnValue(Contracts[0])
      // subAccountUploadController.uploadのモックバリュー
      subAccountUploadControllerUploadSpy.mockReturnValue(-2)

      // 試験実施
      await subAccountCodeUpload.cbPostIndex(request, response, next)

      // 期待結果
      // userContextがLoggedInになっている
      expect(request.session?.userContext).toBe('LoggedIn')
      // session.userRoleが'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'になっている
      expect(request.session?.userRole).toBe('a6a3edcd-00d9-427c-bf03-4ef0112ba16d')
      // request.flashが呼ばれ「る」
      expect(request.flash).toHaveBeenCalledWith('noti', ['取込に失敗しました。', '項目数が異なります。', 'SYSERR'])
      // 補助科目一覧へリダイレクトされ「る」
      expect(response.redirect).toHaveBeenCalledWith('/uploadSubAccount')
    })

    test('準正常：補助科目取込が完了（一度に取り込める補助科目は200件以上）', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...Users[0] }
      request.file = {
        originalname: 'test1.csv',
        userId: '74a9717e-4ed8-4430-9109-9ab7e850bdc7',
        fileName: 'filename'
      }

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[0])
      // DBからの正常な契約情報取得を想定する
      contractControllerFindOneSpy.mockReturnValue(Contracts[0])
      // DBからの正常なテナント情報取得を想定する
      tenatnsFindOneSpy.mockReturnValue(Tenants[0])
      // DBからの正常なコントラクター情報取得を想定する
      contractControllerFindContractSpy.mockReturnValue(Contracts[0])
      // subAccountUploadController.uploadのモックバリュー
      subAccountUploadControllerUploadSpy.mockReturnValue(-3)

      // 試験実施
      await subAccountCodeUpload.cbPostIndex(request, response, next)

      // 期待結果
      // userContextがLoggedInになっている
      expect(request.session?.userContext).toBe('LoggedIn')
      // session.userRoleが'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'になっている
      expect(request.session?.userRole).toBe('a6a3edcd-00d9-427c-bf03-4ef0112ba16d')
      // request.flashが呼ばれ「る」
      expect(request.flash).toHaveBeenCalledWith('noti', [
        '取込に失敗しました。',
        '補助科目が200件を超えています。<BR>CSVファイルを確認後もう一度アップロードしてください。<BR>（一度に取り込める補助科目は200件までとなります。）',
        'SYSERR'
      ])
      // 補助科目一覧へリダイレクトされ「る」
      expect(response.redirect).toHaveBeenCalledWith('/uploadSubAccount')
    })

    test('準正常：補助科目取込が完了（一部行目に誤り）', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...Users[0] }
      request.file = {
        originalname: 'test1.csv',
        userId: '74a9717e-4ed8-4430-9109-9ab7e850bdc7',
        fileName: 'filename'
      }

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[0])
      // DBからの正常な契約情報取得を想定する
      contractControllerFindOneSpy.mockReturnValue(Contracts[0])
      // DBからの正常なテナント情報取得を想定する
      tenatnsFindOneSpy.mockReturnValue(Tenants[0])
      // DBからの正常なコントラクター情報取得を想定する
      contractControllerFindContractSpy.mockReturnValue(Contracts[0])
      // subAccountUploadController.uploadのモックバリュー
      subAccountUploadControllerUploadSpy.mockReturnValue(-4)

      // 試験実施
      await subAccountCodeUpload.cbPostIndex(request, response, next)

      // 期待結果
      // userContextがLoggedInになっている
      expect(request.session?.userContext).toBe('LoggedIn')
      // session.userRoleが'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'になっている
      expect(request.session?.userRole).toBe('a6a3edcd-00d9-427c-bf03-4ef0112ba16d')
      // request.flashが呼ばれ「る」
      expect(request.flash).toHaveBeenCalledWith('noti', ['取込に失敗しました。', '項目数が異なります。', 'SYSERR'])
      // 補助科目一覧へリダイレクトされ「る」
      expect(response.redirect).toHaveBeenCalledWith('/uploadSubAccount')
    })

    test('準正常：補助科目取込が完了（重複する補助科目コードスキップ）', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...Users[0] }
      request.file = {
        originalname: 'test1.csv',
        userId: '74a9717e-4ed8-4430-9109-9ab7e850bdc7',
        fileName: 'filename'
      }

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[0])
      // DBからの正常な契約情報取得を想定する
      contractControllerFindOneSpy.mockReturnValue(Contracts[0])
      // DBからの正常なテナント情報取得を想定する
      tenatnsFindOneSpy.mockReturnValue(Tenants[0])
      // DBからの正常なコントラクター情報取得を想定する
      contractControllerFindContractSpy.mockReturnValue(Contracts[0])
      // subAccountUploadController.uploadのモックバリュー
      subAccountUploadControllerUploadSpy.mockReturnValue([])

      // 試験実施
      await subAccountCodeUpload.cbPostIndex(request, response, next)

      // 期待結果
      // userContextがLoggedInになっている
      expect(request.session?.userContext).toBe('LoggedIn')
      // session.userRoleが'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'になっている
      expect(request.session?.userRole).toBe('a6a3edcd-00d9-427c-bf03-4ef0112ba16d')
      // request.flashが呼ばれ「る」
      expect(request.flash).toHaveBeenCalledWith('errnoti', [
        '取込に失敗しました。',
        '下記表に記載されている内容を修正して、再アップロードして下さい。',
        'SYSERR',
        []
      ])
      // 補助科目一覧へリダイレクトされ「る」
      expect(response.redirect).toHaveBeenCalledWith('/uploadSubAccount')
    })

    test('準正常：解約申込中の場合', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...Users[6] }
      request.file = {
        originalname: 'test1.csv',
        userId: '74a9717e-4ed8-4430-9109-9ab7e850bdc7',
        fileName: 'filename'
      }

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[6])
      // DBからの正常な契約情報取得を想定する
      contractControllerFindOneSpy.mockReturnValue(Contracts[5])
      checkContractStatusSpy.mockReturnValue('30')

      // 試験実施
      await subAccountCodeUpload.cbPostIndex(request, response, next)

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

    test('500エラー:不正なContractデータの場合', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...Users[9] }
      request.file = {
        originalname: 'test1.csv',
        userId: '74a9717e-4ed8-4430-9109-9ab7e850bdc7',
        fileName: 'filename'
      }

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[9])
      // DBからの正常な契約情報取得を想定する
      contractControllerFindOneSpy.mockReturnValue(Contracts[7])
      // DBからの正常な補助科目情報取得を想定する
      tenatnsFindOneSpy.mockReturnValue(Tenants[8])
      // 契約不正の場合
      contractControllerFindContractSpy.mockReturnValue(Contracts[7])

      // 試験実施
      await subAccountCodeUpload.cbPostIndex(request, response, next)

      // 期待結果
      // 404エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      // userContextがLoggedInになっている
      expect(request.session?.userContext).toBe('LoggedIn')
      // session.userRoleが'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'になっている
      expect(request.session?.userRole).toBe('a6a3edcd-00d9-427c-bf03-4ef0112ba16d')
      // 500エラーがエラーハンドリング「される」
      expect(next).toHaveBeenCalledWith(errorHelper.create(500))
    })

    test('500エラー：requestのsession,userIdがnullの場合', async () => {
      // 試験実施
      await subAccountCodeUpload.cbPostIndex(request, response, next)

      // 期待結果
      // 404エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)

      // 500エラーがエラーハンドリング「される」」
      expect(next).toHaveBeenCalledWith(errorHelper.create(500))
    })

    test('500エラー：user検索の時、DBエラー', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...Users[0] }

      // DBからエラーが発生することを想定する
      const userDbError = new Error('User Table Error')
      userControllerFindOneSpy.mockReturnValue(userDbError)

      // 試験実施
      await subAccountCodeUpload.cbPostIndex(request, response, next)

      // 期待結果
      // 404エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)

      // 500エラーがエラーハンドリング「される」
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
      await subAccountCodeUpload.cbPostIndex(request, response, next)

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
      await subAccountCodeUpload.cbPostIndex(request, response, next)

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
      tenatnsFindOneSpy.mockReturnValue(Tenants[8])
      // DBからの正常なコントラクター情報取得を想定する
      contractControllerFindContractSpy.mockReturnValue(Contracts[7])

      // checkContractStatusからreturnされる値設定
      checkContractStatusSpy.mockReturnValue(null)

      // 試験実施
      await subAccountCodeUpload.cbPostIndex(request, response, next)

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
      await subAccountCodeUpload.cbPostIndex(request, response, next)

      // 期待結果
      // 404エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      expect(next).toHaveBeenCalledWith(errorHelper.create(500))
    })
  })
})
