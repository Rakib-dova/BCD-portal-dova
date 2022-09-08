'use strict'

jest.mock('../../Application/node_modules/express', () => {
  return require('jest-express')
})

process.env.INVOICE_UPLOAD_PATH ?? JSON.stringify({ INVOICE_UPLOAD_PATH: './testData' })
const Request = require('jest-express').Request
const Response = require('jest-express').Response
const next = require('jest-express').Next
const helper = require('../../Application/routes/helpers/middleware')
const errorHelper = require('../../Application/routes/helpers/error')
const noticeHelper = require('../../Application/routes/helpers/notice')
const userController = require('../../Application/controllers/userController.js')
const contractController = require('../../Application/controllers/contractController.js')
const logger = require('../../Application/lib/logger.js')
const uploadSuppliers = require('../../Application/routes/uploadSuppliers')
const uploadSuppliersController = require('../../Application/controllers/uploadSuppliersController')

let request, response, infoSpy
let userControllerFindOneSpy,
  contractControllerFindOneSpy,
  userControllerFindAndUpdate,
  contractControllerFindContractSpy,
  checkContractStatusSpy,
  uploadSuppliersControllerSpy

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

describe('uploadUsersのテスト', () => {
  beforeEach(() => {
    request = new Request()
    request.body = {}
    response = new Response()
    infoSpy = jest.spyOn(logger, 'info')
    userControllerFindOneSpy = jest.spyOn(userController, 'findOne')
    userControllerFindAndUpdate = jest.spyOn(userController, 'findAndUpdate')
    contractControllerFindOneSpy = jest.spyOn(contractController, 'findOne')
    contractControllerFindContractSpy = jest.spyOn(contractController, 'findContract')
    request.flash = jest.fn()
    checkContractStatusSpy = jest.spyOn(helper, 'checkContractStatus')
    uploadSuppliersControllerSpy = jest.spyOn(uploadSuppliersController, 'upload')
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
    checkContractStatusSpy.mockRestore()
    uploadSuppliersControllerSpy.mockRestore()
  })

  describe('ルーティング', () => {
    test('uploadSuppliersのルーティングを確認', async () => {
      expect(uploadSuppliers.router.get).toBeCalledWith(
        '/',
        helper.isAuthenticated,
        expect.any(Function),
        uploadSuppliers.cbGetIndex
      )

      expect(uploadSuppliers.router.post).toBeCalledWith(
        '/',
        helper.isAuthenticated,
        expect.any(Function),
        expect.any(Function),
        uploadSuppliers.cbPostIndex
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
      // DBからの正常なコントラクター情報取得を想定する
      contractControllerFindContractSpy.mockReturnValue(Contracts[0])
      // CSRF対策
      const dummyToken = 'testCsrfToken'
      request.csrfToken = jest.fn(() => {
        return dummyToken
      })

      // 試験実施
      await uploadSuppliers.cbGetIndex(request, response, next)

      // 期待結果
      // userContextがLoggedInになっている
      expect(request.session?.userContext).toBe('LoggedIn')
      // session.userRoleが'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'になっている
      expect(request.session?.userRole).toBe('a6a3edcd-00d9-427c-bf03-4ef0112ba16d')
      // response.renderでuploadUsersが呼ばれ「る」
      expect(response.render).toHaveBeenCalledWith('uploadSuppliers', {
        uploadCommonLayoutTitle: '取引先一括登録',
        uploadCommonLayoutEngTitle: 'BULK UPLOAD SUPPLIERS',
        fileInputName: 'suppliersFileUpload',
        cautionForSelectedFile: 'ファイルを選択してください。',
        formatFileLocation: '../html/取引先一括登録フォーマット.csv',
        formatFileLinkText: 'アップロード用CSVファイルダウンロード',
        suppliersUpload: '/uploadSuppliers',
        procedureContents: {
          procedureComment1: '1. 下記リンクをクリックし、アップロード用のCSVファイルをダウンロード',
          procedureComment2: '2. CSVファイルに取引先データを記入',
          procedureComment2Children: [
            'A列：企業名',
            'B列：企業管理者メールアドレス',
            '※1ファイルで作成できる取引先データの数は200件まで',
            '※文字コードはUTF-8 BOM付で作成してください'
          ],
          procedureComment3: '3.「ファイル選択」ボタンをクリックし、記入したCSVファイルを選択',
          procedureComment4: '4.「アップロード開始」ボタンをクリック',
          procedureTitle: '(手順)'
        },
        csrfToken: dummyToken
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
      // ユーザ権限チェック結果設定
      checkContractStatusSpy.mockReturnValue('30')

      // 試験実施
      await uploadSuppliers.cbGetIndex(request, response, next)

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

    test('正常：解約申込中の場合', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...Users[6] }

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[6])
      // DBからの正常な契約情報取得を想定する
      contractControllerFindOneSpy.mockReturnValue(Contracts[5])
      // ユーザ権限チェック結果設定
      checkContractStatusSpy.mockReturnValue('30')

      // 試験実施
      await uploadSuppliers.cbGetIndex(request, response, next)

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

    test('正常：一般ユーザーの場合', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...Users[5] }

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[5])
      // DBからの正常な契約情報取得を想定する
      contractControllerFindOneSpy.mockReturnValue(Contracts[0])
      // ユーザ権限チェック結果設定
      checkContractStatusSpy.mockReturnValue('00')

      // 試験実施
      await uploadSuppliers.cbGetIndex(request, response, next)

      // 期待結果
      // 404エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      // userContextがLoggedInになっている
      expect(request.session?.userContext).toBe('LoggedIn')
      // session.userRoleが'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'になっている
      expect(request.session?.userRole).toBe('fe888fbb-172f-467c-b9ad-efe0720fecf9')
      // 利用不可画面が表示「される」
      expect(next).toHaveBeenCalledWith(noticeHelper.create('generaluser'))
    })

    test('正常：登録申込中の場合', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...Users[1] }

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[1])
      // DBからの正常な契約情報取得を想定する
      contractControllerFindOneSpy.mockReturnValue(Contracts[1])
      // ユーザ権限チェック結果設定
      checkContractStatusSpy.mockReturnValue('30')

      // 試験実施
      await uploadSuppliers.cbGetIndex(request, response, next)

      // 期待結果
      // 404エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      // userContextがLoggedInになっている
      expect(request.session?.userContext).toBe('LoggedIn')
      // session.userRoleが'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'になっている
      expect(request.session?.userRole).toBe('a6a3edcd-00d9-427c-bf03-4ef0112ba16d')
      // 利用登録手続き中画面が表示「される」
      expect(next).toHaveBeenCalledWith(noticeHelper.create('registerprocedure'))
    })

    test('正常：変更申込中の場合', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...Users[3] }

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[3])
      // DBからの正常な契約情報取得を想定する
      contractControllerFindOneSpy.mockReturnValue(Contracts[3])
      // ユーザ権限チェック結果設定
      checkContractStatusSpy.mockReturnValue('30')

      // 試験実施
      await uploadSuppliers.cbGetIndex(request, response, next)

      // 期待結果
      // 404エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      // userContextがLoggedInになっている
      expect(request.session?.userContext).toBe('LoggedIn')
      // session.userRoleが'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'になっている
      expect(request.session?.userRole).toBe('a6a3edcd-00d9-427c-bf03-4ef0112ba16d')
      // 契約情報変更手続き中画面が表示「される」
      expect(next).toHaveBeenCalledWith(noticeHelper.create('changeprocedure'))
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

      // 試験実施
      await uploadSuppliers.cbGetIndex(request, response, next)

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
      await uploadSuppliers.cbGetIndex(request, response, next)

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
      await uploadSuppliers.cbGetIndex(request, response, next)

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
      await uploadSuppliers.cbGetIndex(request, response, next)

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
      await uploadSuppliers.cbGetIndex(request, response, next)

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
      // DBからの正常なコントラクター情報取得を想定する
      contractControllerFindContractSpy.mockReturnValue(Contracts[7])

      // checkContractStatusからreturnされる値設定
      checkContractStatusSpy.mockReturnValue(null)

      // 試験実施
      await uploadSuppliers.cbGetIndex(request, response, next)

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
      // DBからの正常なコントラクター情報取得を想定する
      contractControllerFindContractSpy.mockReturnValue(Contracts[8])

      // checkContractStatusからreturnされる値設定
      checkContractStatusSpy.mockReturnValue(999)
      // 試験実施
      await uploadSuppliers.cbGetIndex(request, response, next)

      // 期待結果
      // 404エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      expect(next).toHaveBeenCalledWith(errorHelper.create(500))
    })
  })

  describe('コールバック:cbPostIndex', () => {
    test('正常：取引先一括登録する。(1件)', async () => {
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
      // DBからの正常なコントラクター情報取得を想定する
      contractControllerFindContractSpy.mockReturnValue(Contracts[0])
      // uploadSuppliersController.uploadモック
      const resgistSupplier = { companyName: 'test', mailAddress: 'test@test.com', status: 'Add Success', stack: null }
      uploadSuppliersControllerSpy.mockReturnValue([0, [resgistSupplier]])

      // 試験実施
      await uploadSuppliers.cbPostIndex(request, response, next)

      // 期待結果
      // userContextがLoggedInになっている
      expect(request.session?.userContext).toBe('LoggedIn')
      // session.userRoleが'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'になっている
      expect(request.session?.userRole).toBe('a6a3edcd-00d9-427c-bf03-4ef0112ba16d')
      // request.flashが呼ばれ「る」
      expect(request.flash).toHaveBeenCalledWith('noti', [
        '取引先一括登録',
        `${resgistSupplier.companyName}をネットワークに招待しました。<br>`,
        ''
      ])
      // 取引先一括登録へリダイレクトされ「る」
      expect(response.redirect).toHaveBeenCalledWith('/uploadSuppliers')
    })

    test('正常：取引先一括登録する。(正常2件、スキップ5件)', async () => {
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
      // DBからの正常なコントラクター情報取得を想定する
      contractControllerFindContractSpy.mockReturnValue(Contracts[0])
      // uploadSuppliersController.uploadモック
      const invitationResult = [
        { companyName: 'test1', mailAddress: 'test1@test.com', status: 'Add Success', stack: null },
        { companyName: 'test2', mailAddress: 'test2@test.com', status: 'Update Success', stack: null },
        { companyName: 'test3', mailAddress: 'test3@test.com', status: 'API Error', stack: null },
        { companyName: 'test4', mailAddress: 'test4@test.com', status: 'Already Invitation', stack: null },
        { companyName: 'test5', mailAddress: 'test5@test.com', status: 'Already Connection', stack: null },
        { companyName: 'test6', mailAddress: 'test6@test.com', status: 'Email Not Match', stack: null },
        { companyName: 'test7', mailAddress: 'test7@test.com', status: 'Email Type Error', stack: null },
        { companyName: 'test8', mailAddress: 'test8@test.com', status: 'Duplicate Email Error', stack: null }
      ]

      let resultMessage = ''
      for (const invitation of invitationResult) {
        switch (invitation.status) {
          case 'Add Success':
            resultMessage += `${invitation.companyName}をネットワークに招待しました。<br>`
            break
          case 'Update Success':
            resultMessage += `${invitation.companyName}を企業登録に招待しました。<br>`
            break
          case 'API Error':
            resultMessage += `${invitation.companyName}の招待でAPIエラーが発生しました。（スキップ）<br>`
            break
          case 'Already Invitation':
            resultMessage += `${invitation.companyName}のメールアドレス(${invitation.mailAddress})は既に招待済みです。（スキップ）<br>`
            break
          case 'Already Connection':
            resultMessage += `${invitation.companyName}は既にネットワークに登録されています。（スキップ）<br>`
            break
          case 'Email Not Match':
            resultMessage += `${invitation.companyName}のメールアドレス(${invitation.mailAddress})は企業に登録されていません。（スキップ）<br>`
            break
          case 'Email Type Error':
            resultMessage += `${invitation.companyName}のメールアドレス(${invitation.mailAddress})はメール形式ではありません。（スキップ）<br>`
            break
          case 'Duplicate Email Error':
            resultMessage += `${invitation.companyName}のメールアドレス(${invitation.mailAddress})は重複しています。（スキップ）<br>`
            break
        }
      }

      uploadSuppliersControllerSpy.mockReturnValue([0, invitationResult])

      // 試験実施
      await uploadSuppliers.cbPostIndex(request, response, next)

      // 期待結果
      // userContextがLoggedInになっている
      expect(request.session?.userContext).toBe('LoggedIn')
      // session.userRoleが'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'になっている
      expect(request.session?.userRole).toBe('a6a3edcd-00d9-427c-bf03-4ef0112ba16d')
      // request.flashが呼ばれ「る」
      expect(request.flash).toHaveBeenCalledWith('noti', ['取引先一括登録', resultMessage, ''])
      // 取引先一括登録へリダイレクトされ「る」
      expect(response.redirect).toHaveBeenCalledWith('/uploadSuppliers')
    })

    test('異常：取引先一括登録エラー発生', async () => {
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
      // DBからの正常なコントラクター情報取得を想定する
      contractControllerFindContractSpy.mockReturnValue(Contracts[0])
      // uploadUsersController.uploadのモックバリュー
      uploadSuppliersControllerSpy.mockReturnValue([new Error(), null])

      // 試験実施
      await uploadSuppliers.cbPostIndex(request, response, next)

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
      // 取引先一括登録へリダイレクトされ「る」
      expect(response.redirect).toHaveBeenCalledWith('/uploadSuppliers')
    })

    test('準正常：取引先一括登録（ヘッダーに誤り）', async () => {
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
      // DBからの正常なコントラクター情報取得を想定する
      contractControllerFindContractSpy.mockReturnValue(Contracts[0])
      // uploadUsersController.uploadのモックバリュー
      uploadSuppliersControllerSpy.mockReturnValue([-1, null])

      // 試験実施
      await uploadSuppliers.cbPostIndex(request, response, next)

      // 期待結果
      // userContextがLoggedInになっている
      expect(request.session?.userContext).toBe('LoggedIn')
      // session.userRoleが'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'になっている
      expect(request.session?.userRole).toBe('a6a3edcd-00d9-427c-bf03-4ef0112ba16d')
      // request.flashが呼ばれ「る」
      expect(request.flash).toHaveBeenCalledWith('noti', [
        '取引先一括登録',
        'ヘッダーが指定のものと異なります。',
        'SYSERR'
      ])
      // 取引先一括登録へリダイレクトされ「る」
      expect(response.redirect).toHaveBeenCalledWith('/uploadSuppliers')
    })

    test('準正常：取引先一括登録（取込データが存在しない）', async () => {
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
      // DBからの正常なコントラクター情報取得を想定する
      contractControllerFindContractSpy.mockReturnValue(Contracts[0])
      // uploadUsersController.uploadのモックバリュー
      uploadSuppliersControllerSpy.mockReturnValue([-2, null])

      // 試験実施
      await uploadSuppliers.cbPostIndex(request, response, next)

      // 期待結果
      // userContextがLoggedInになっている
      expect(request.session?.userContext).toBe('LoggedIn')
      // session.userRoleが'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'になっている
      expect(request.session?.userRole).toBe('a6a3edcd-00d9-427c-bf03-4ef0112ba16d')
      // request.flashが呼ばれ「る」
      expect(request.flash).toHaveBeenCalledWith('noti', ['取引先一括登録', '項目数が異なります。', 'SYSERR'])
      // 取引先一括登録へリダイレクトされ「る」
      expect(response.redirect).toHaveBeenCalledWith('/uploadSuppliers')
    })

    test('準正常：取引先一括登録（一度に取り込める：取引先が200件以上）', async () => {
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
      // DBからの正常なコントラクター情報取得を想定する
      contractControllerFindContractSpy.mockReturnValue(Contracts[0])
      // uploadUsersController.uploadのモックバリュー
      uploadSuppliersControllerSpy.mockReturnValue([-3, null])

      // 試験実施
      await uploadSuppliers.cbPostIndex(request, response, next)

      // 期待結果
      // userContextがLoggedInになっている
      expect(request.session?.userContext).toBe('LoggedIn')
      // session.userRoleが'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'になっている
      expect(request.session?.userRole).toBe('a6a3edcd-00d9-427c-bf03-4ef0112ba16d')
      // request.flashが呼ばれ「る」
      const constantsCodeErrMsg = require('../../Application/constants/codeErrMsg')
      const msg200Over = constantsCodeErrMsg.UPLOADSUPPLIERSCOUNTER000

      expect(request.flash).toHaveBeenCalledWith('noti', ['取引先一括登録', msg200Over, 'SYSERR'])
      // 取引先一括登録へリダイレクトされ「る」
      expect(response.redirect).toHaveBeenCalledWith('/uploadSuppliers')
    })

    test('準正常：取引先一括登録（一部行目に誤り）', async () => {
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
      // DBからの正常なコントラクター情報取得を想定する
      contractControllerFindContractSpy.mockReturnValue(Contracts[0])
      // uploadUsersController.uploadのモックバリュー
      uploadSuppliersControllerSpy.mockReturnValue([-2, null])

      // 試験実施
      await uploadSuppliers.cbPostIndex(request, response, next)

      // 期待結果
      // userContextがLoggedInになっている
      expect(request.session?.userContext).toBe('LoggedIn')
      // session.userRoleが'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'になっている
      expect(request.session?.userRole).toBe('a6a3edcd-00d9-427c-bf03-4ef0112ba16d')
      // request.flashが呼ばれ「る」
      expect(request.flash).toHaveBeenCalledWith('noti', ['取引先一括登録', '項目数が異なります。', 'SYSERR'])
      // 取引先一括登録へリダイレクトされ「る」
      expect(response.redirect).toHaveBeenCalledWith('/uploadSuppliers')
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
      await uploadSuppliers.cbPostIndex(request, response, next)

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

    test('正常：一般ユーザーの場合', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...Users[5] }

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[5])
      // DBからの正常な契約情報取得を想定する
      contractControllerFindOneSpy.mockReturnValue(Contracts[0])
      // ユーザ権限チェック結果設定
      checkContractStatusSpy.mockReturnValue('00')

      // 試験実施
      await uploadSuppliers.cbPostIndex(request, response, next)

      // 期待結果
      // 404エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      // userContextがLoggedInになっている
      expect(request.session?.userContext).toBe('LoggedIn')
      // session.userRoleが'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'になっている
      expect(request.session?.userRole).toBe('fe888fbb-172f-467c-b9ad-efe0720fecf9')
      // 利用不可画面が表示「される」
      expect(next).toHaveBeenCalledWith(noticeHelper.create('generaluser'))
    })

    test('正常：登録申込中の場合', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...Users[1] }

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[1])
      // DBからの正常な契約情報取得を想定する
      contractControllerFindOneSpy.mockReturnValue(Contracts[1])
      // ユーザ権限チェック結果設定
      checkContractStatusSpy.mockReturnValue('30')

      // 試験実施
      await uploadSuppliers.cbPostIndex(request, response, next)

      // 期待結果
      // 404エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      // userContextがLoggedInになっている
      expect(request.session?.userContext).toBe('LoggedIn')
      // session.userRoleが'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'になっている
      expect(request.session?.userRole).toBe('a6a3edcd-00d9-427c-bf03-4ef0112ba16d')
      // 利用登録手続き中画面が表示「される」
      expect(next).toHaveBeenCalledWith(noticeHelper.create('registerprocedure'))
    })

    test('正常：変更申込中の場合', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...Users[3] }

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[3])
      // DBからの正常な契約情報取得を想定する
      contractControllerFindOneSpy.mockReturnValue(Contracts[3])
      // ユーザ権限チェック結果設定
      checkContractStatusSpy.mockReturnValue('30')

      // 試験実施
      await uploadSuppliers.cbPostIndex(request, response, next)

      // 期待結果
      // 404エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      // userContextがLoggedInになっている
      expect(request.session?.userContext).toBe('LoggedIn')
      // session.userRoleが'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'になっている
      expect(request.session?.userRole).toBe('a6a3edcd-00d9-427c-bf03-4ef0112ba16d')
      // 契約情報変更手続き中画面が表示「される」
      expect(next).toHaveBeenCalledWith(noticeHelper.create('changeprocedure'))
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
      // 契約不正の場合
      contractControllerFindContractSpy.mockReturnValue(Contracts[7])

      // 試験実施
      await uploadSuppliers.cbPostIndex(request, response, next)

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
      await uploadSuppliers.cbPostIndex(request, response, next)

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
      await uploadSuppliers.cbPostIndex(request, response, next)

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
      await uploadSuppliers.cbPostIndex(request, response, next)

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
      await uploadSuppliers.cbPostIndex(request, response, next)

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
      // DBからの正常なコントラクター情報取得を想定する
      contractControllerFindContractSpy.mockReturnValue(Contracts[7])

      // checkContractStatusからreturnされる値設定
      checkContractStatusSpy.mockReturnValue(null)

      // 試験実施
      await uploadSuppliers.cbPostIndex(request, response, next)

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
      // DBからの正常なコントラクター情報取得を想定する
      contractControllerFindContractSpy.mockReturnValue(Contracts[8])

      // checkContractStatusからreturnされる値設定
      checkContractStatusSpy.mockReturnValue(999)
      // 試験実施
      await uploadSuppliers.cbPostIndex(request, response, next)

      // 期待結果
      // 404エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      expect(next).toHaveBeenCalledWith(errorHelper.create(500))
    })
  })
})
