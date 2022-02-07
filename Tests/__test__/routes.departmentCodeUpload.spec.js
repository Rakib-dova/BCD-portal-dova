'use strict'

jest.mock('../../Application/node_modules/express', () => {
  return require('jest-express')
})
process.env.INVOICE_UPLOAD_PATH ?? JSON.stringify({ INVOICE_UPLOAD_PATH: './testData' })
const departmentCodeUpload = require('../../Application/routes/departmentCodeUpload')
const Request = require('jest-express').Request
const Response = require('jest-express').Response
const next = require('jest-express').Next
const helper = require('../../Application/routes/helpers/middleware')
const errorHelper = require('../../Application/routes/helpers/error')
const noticeHelper = require('../../Application/routes/helpers/notice')
const userController = require('../../Application/controllers/userController.js')
const contractController = require('../../Application/controllers/contractController.js')
const tenantController = require('../../Application/controllers/tenantController')
const departmentCodeUploadController = require('../../Application/controllers/departmentCodeUploadController.js')
const logger = require('../../Application/lib/logger.js')

let request, response, infoSpy
let userControllerFindOneSpy,
  contractControllerFindOneSpy,
  departmentCodeUploadControllerUploadSpy,
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

describe('departmentCodeUploadのテスト', () => {
  beforeEach(() => {
    request = new Request()
    request.body = {}
    response = new Response()
    infoSpy = jest.spyOn(logger, 'info')
    userControllerFindOneSpy = jest.spyOn(userController, 'findOne')
    userControllerFindAndUpdate = jest.spyOn(userController, 'findAndUpdate')
    contractControllerFindOneSpy = jest.spyOn(contractController, 'findOne')
    contractControllerFindContractSpy = jest.spyOn(contractController, 'findContract')
    tenatnsFindOneSpy = jest.spyOn(tenantController, 'findOne')
    request.flash = jest.fn()
    checkContractStatusSpy = jest.spyOn(helper, 'checkContractStatus')
    departmentCodeUploadControllerUploadSpy = jest.spyOn(departmentCodeUploadController, 'upload')
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
    tenatnsFindOneSpy.mockRestore()
    checkContractStatusSpy.mockRestore()
    departmentCodeUploadControllerUploadSpy.mockRestore()
  })

  describe('ルーティング', () => {
    test('departmentCodeUploadのルーティングを確認', async () => {
      expect(departmentCodeUpload.router.get).toBeCalledWith(
        '/',
        helper.isAuthenticated,
        departmentCodeUpload.cbGetIndex
      )

      expect(departmentCodeUpload.router.post).toBeCalledWith(
        '/',
        helper.isAuthenticated,
        expect.any(Function),
        departmentCodeUpload.cbPostIndex
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
      await departmentCodeUpload.cbGetIndex(request, response, next)

      // 期待結果
      // userContextがLoggedInになっている
      expect(request.session?.userContext).toBe('LoggedIn')
      // session.userRoleが'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'になっている
      expect(request.session?.userRole).toBe('a6a3edcd-00d9-427c-bf03-4ef0112ba16d')
      // response.renderでdepartmentUploadが呼ばれ「る」
      expect(response.render).toHaveBeenCalledWith('departmentCodeUpload', {
        uploadCommonLayoutTitle: '部門データ一括作成',
        uploadCommonLayoutEngTitle: 'BULK UPLOAD DEPARTMENT CODE',
        fileInputName: 'bulkDepartmentCode',
        cautionForSelectedFile: 'ファイルを選択してください。',
        listLocation: '/departmentCodeList',
        listLoacationName: '部門データ一覧→',
        accountCodeUpload: '/uploadDepartment',
        procedureContents: {
          procedureTitle: '(手順)',
          procedureComment1: '1. 下記リンクをクリックし、アップロード用のCSVファイルをダウンロード',
          procedureComment2: '2. CSVファイルに部門データを記入',
          procedureComment2Children: [
            'A列：部門コード　英・数字・カナのみ（10桁）',
            'B列：部門名　　　文字列（40桁）',
            '※1ファイルで作成できる部門データの数は200まで'
          ],
          procedureComment3: '3.「ファイル選択」ボタンをクリックし、記入したCSVファイルを選択',
          procedureComment4: '4.「アップロード開始」ボタンをクリック'
        },
        formatFileLocation: '../html/部門データ一括作成フォーマット.csv',
        formatFileLinkText: 'アップロード用CSVファイルダウンロード'
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
      // DBからの正常な部門データ情報取得を想定する
      tenatnsFindOneSpy.mockReturnValue(Tenants[5])
      // ユーザ権限チェック結果設定
      checkContractStatusSpy.mockReturnValue('30')

      // 試験実施
      await departmentCodeUpload.cbGetIndex(request, response, next)

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
      // DBからの正常な部門データ情報取得を想定する
      tenatnsFindOneSpy.mockReturnValue(Tenants[8])

      // 試験実施
      await departmentCodeUpload.cbGetIndex(request, response, next)

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
      await departmentCodeUpload.cbGetIndex(request, response, next)

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
      await departmentCodeUpload.cbGetIndex(request, response, next)

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
      await departmentCodeUpload.cbGetIndex(request, response, next)

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
      await departmentCodeUpload.cbGetIndex(request, response, next)

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
      await departmentCodeUpload.cbGetIndex(request, response, next)

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
      await departmentCodeUpload.cbGetIndex(request, response, next)

      // 期待結果
      // 404エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      expect(next).toHaveBeenCalledWith(errorHelper.create(500))
    })
  })

  describe('コールバック:cbPostIndex', () => {
    test('正常：部門データ一括作成', async () => {
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
      // dpeartmentUploadController.uploadのモックバリュー
      departmentCodeUploadControllerUploadSpy.mockReturnValue(0)

      // 試験実施
      await departmentCodeUpload.cbPostIndex(request, response, next)

      // 期待結果
      // userContextがLoggedInになっている
      expect(request.session?.userContext).toBe('LoggedIn')
      // session.userRoleが'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'になっている
      expect(request.session?.userRole).toBe('a6a3edcd-00d9-427c-bf03-4ef0112ba16d')
      // request.flashが呼ばれ「る」
      expect(request.flash).toHaveBeenCalledWith('info', '部門データ取込が完了しました。')
      // 部門データ一覧へリダイレクトされ「る」
      expect(response.redirect).toHaveBeenCalledWith('/portal')
    })

    test('異常：部門データ一括作成', async () => {
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
      // dpeartmentUploadController.uploadのモックバリュー
      departmentCodeUploadControllerUploadSpy.mockReturnValue(new Error())

      // 試験実施
      await departmentCodeUpload.cbPostIndex(request, response, next)

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
      // 部門データ一括作成へリダイレクトされ「る」
      expect(response.redirect).toHaveBeenCalledWith('/uploadDepartment')
    })

    test('準正常：部門取込が完了（ヘッダーに誤り）', async () => {
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
      // dpeartmentUploadController.uploadのモックバリュー
      departmentCodeUploadControllerUploadSpy.mockReturnValue(-1)

      // 試験実施
      await departmentCodeUpload.cbPostIndex(request, response, next)

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
      // 部門データ一括作成へリダイレクトされ「る」
      expect(response.redirect).toHaveBeenCalledWith('/uploadDepartment')
    })

    test('準正常：部門取込が完了（取込データが存在しない）', async () => {
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
      // dpeartmentUploadController.uploadのモックバリュー
      departmentCodeUploadControllerUploadSpy.mockReturnValue(-2)

      // 試験実施
      await departmentCodeUpload.cbPostIndex(request, response, next)

      // 期待結果
      // userContextがLoggedInになっている
      expect(request.session?.userContext).toBe('LoggedIn')
      // session.userRoleが'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'になっている
      expect(request.session?.userRole).toBe('a6a3edcd-00d9-427c-bf03-4ef0112ba16d')
      // request.flashが呼ばれ「る」
      expect(request.flash).toHaveBeenCalledWith('noti', ['取込に失敗しました。', '項目数が異なります。', 'SYSERR'])
      // 部門データ一括作成へリダイレクトされ「る」
      expect(response.redirect).toHaveBeenCalledWith('/uploadDepartment')
    })

    test('準正常：部門取込が完了（一度に取り込める部門データは200件以上）', async () => {
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
      // dpeartmentUploadController.uploadのモックバリュー
      departmentCodeUploadControllerUploadSpy.mockReturnValue(-3)

      // 試験実施
      await departmentCodeUpload.cbPostIndex(request, response, next)

      // 期待結果
      // userContextがLoggedInになっている
      expect(request.session?.userContext).toBe('LoggedIn')
      // session.userRoleが'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'になっている
      expect(request.session?.userRole).toBe('a6a3edcd-00d9-427c-bf03-4ef0112ba16d')
      // request.flashが呼ばれ「る」
      expect(request.flash).toHaveBeenCalledWith('noti', [
        '取込に失敗しました。',
        '部門データが200件を超えています。<BR>CSVファイルを確認後もう一度アップロードしてください。<BR>  （一度に取り込める部門データは200件までとなります。）',
        'SYSERR'
      ])
      // 部門データ一括作成へリダイレクトされ「る」
      expect(response.redirect).toHaveBeenCalledWith('/uploadDepartment')
    })

    test('準正常：部門データ取込が完了（一部行目に誤り）', async () => {
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
      // dpeartmentUploadController.uploadのモックバリュー
      departmentCodeUploadControllerUploadSpy.mockReturnValue(-4)

      // 試験実施
      await departmentCodeUpload.cbPostIndex(request, response, next)

      // 期待結果
      // userContextがLoggedInになっている
      expect(request.session?.userContext).toBe('LoggedIn')
      // session.userRoleが'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'になっている
      expect(request.session?.userRole).toBe('a6a3edcd-00d9-427c-bf03-4ef0112ba16d')
      // request.flashが呼ばれ「る」
      expect(request.flash).toHaveBeenCalledWith('noti', ['取込に失敗しました。', '項目数が異なります。', 'SYSERR'])
      // 部門データ一括作成へリダイレクトされ「る」
      expect(response.redirect).toHaveBeenCalledWith('/uploadDepartment')
    })

    test('準正常：部門データ取込が完了（重複する部門コードスキップ）', async () => {
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
      // dpeartmentUploadController.uploadのモックバリュー
      departmentCodeUploadControllerUploadSpy.mockReturnValue([])

      // 試験実施
      await departmentCodeUpload.cbPostIndex(request, response, next)

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
      // 部門データ一括作成へリダイレクトされ「る」
      expect(response.redirect).toHaveBeenCalledWith('/uploadDepartment')
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
      await departmentCodeUpload.cbPostIndex(request, response, next)

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
      // DBからの正常な部門データ情報取得を想定する
      tenatnsFindOneSpy.mockReturnValue(Tenants[8])
      // 契約不正の場合
      contractControllerFindContractSpy.mockReturnValue(Contracts[7])

      // 試験実施
      await departmentCodeUpload.cbPostIndex(request, response, next)

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
      await departmentCodeUpload.cbPostIndex(request, response, next)

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
      await departmentCodeUpload.cbPostIndex(request, response, next)

      // 期待結果
      // 404エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)

      // 500エラーがエラーハンドリング「される」
      expect(next).toHaveBeenCalledWith(errorHelper.create(500))
    })

    test('404エラー：user.statusが0ではない場合', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...Users[8] }

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[8])

      // 試験実施
      await departmentCodeUpload.cbPostIndex(request, response, next)

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
      await departmentCodeUpload.cbPostIndex(request, response, next)

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
      await departmentCodeUpload.cbPostIndex(request, response, next)

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
      await departmentCodeUpload.cbPostIndex(request, response, next)

      // 期待結果
      // 404エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      expect(next).toHaveBeenCalledWith(errorHelper.create(500))
    })
  })
})
