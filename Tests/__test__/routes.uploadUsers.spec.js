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
const uploadUsers = require('../../Application/routes/uploadUsers')
const uploadController = require('../../Application/controllers/uploadUsersController')

let request, response, infoSpy
let userControllerFindOneSpy,
  contractControllerFindOneSpy,
  userControllerFindAndUpdate,
  contractControllerFindContractSpy,
  checkContractStatusSpy,
  uploadControllerSpy

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
    uploadControllerSpy = jest.spyOn(uploadController, 'upload')
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
    uploadControllerSpy.mockRestore()
  })

  describe('ルーティング', () => {
    test('uploadUsersのルーティングを確認', async () => {
      expect(uploadUsers.router.get).toBeCalledWith(
        '/',
        helper.isAuthenticated,
        expect.any(Function),
        uploadUsers.cbGetIndex
      )

      expect(uploadUsers.router.post).toBeCalledWith(
        '/',
        helper.isAuthenticated,
        expect.any(Function),
        expect.any(Function),
        uploadUsers.cbPostIndex
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
      await uploadUsers.cbGetIndex(request, response, next)

      // 期待結果
      // userContextがLoggedInになっている
      expect(request.session?.userContext).toBe('LoggedIn')
      // session.userRoleが'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'になっている
      expect(request.session?.userRole).toBe('a6a3edcd-00d9-427c-bf03-4ef0112ba16d')
      // response.renderでuploadUsersが呼ばれ「る」
      expect(response.render).toHaveBeenCalledWith('uploadUsers', {
        uploadCommonLayoutTitle: 'ユーザー一括登録',
        uploadCommonLayoutEngTitle: 'BULK UPLOAD USERS',
        fileInputName: 'userNameFileUpload',
        cautionForSelectedFile: 'ファイルを選択してください。',
        formatFileLocation: '../html/ユーザー一括登録フォーマット.csv',
        formatFileLinkText: 'アップロード用CSVファイルダウンロード',
        usersUpload: '/uploadUsers',
        procedureContents: {
          procedureComment1: '1. 下記リンクをクリックし、アップロード用のCSVファイルをダウンロード',
          procedureComment2: '2. CSVファイルにユーザーデータを記入',
          procedureComment2Children: [
            'A列：メールアドレス',
            'B列：ロール(数字)',
            '※1ファイルで作成できるユーザーデータの数は200件まで',
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
      await uploadUsers.cbGetIndex(request, response, next)

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
      await uploadUsers.cbGetIndex(request, response, next)

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
      await uploadUsers.cbGetIndex(request, response, next)

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
      await uploadUsers.cbGetIndex(request, response, next)

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
      await uploadUsers.cbGetIndex(request, response, next)

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
      await uploadUsers.cbGetIndex(request, response, next)

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
      await uploadUsers.cbGetIndex(request, response, next)

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
      await uploadUsers.cbGetIndex(request, response, next)

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
      await uploadUsers.cbGetIndex(request, response, next)

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
      await uploadUsers.cbGetIndex(request, response, next)

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
      await uploadUsers.cbGetIndex(request, response, next)

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
      await uploadUsers.cbGetIndex(request, response, next)

      // 期待結果
      // 404エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      expect(next).toHaveBeenCalledWith(errorHelper.create(500))
    })
  })

  describe('コールバック:cbPostIndex', () => {
    test('正常：ユーザー一括登録する。(1名)', async () => {
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
      // uploadController.uploadモック
      const resgistUser = { username: 'test@test.com', status: 'Created' }
      uploadControllerSpy.mockReturnValue([0, [resgistUser]])

      // 試験実施
      await uploadUsers.cbPostIndex(request, response, next)

      // 期待結果
      // userContextがLoggedInになっている
      expect(request.session?.userContext).toBe('LoggedIn')
      // session.userRoleが'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'になっている
      expect(request.session?.userRole).toBe('a6a3edcd-00d9-427c-bf03-4ef0112ba16d')
      // request.flashが呼ばれ「る」
      expect(request.flash).toHaveBeenCalledWith('noti', [
        'ユーザー一括登録',
        `${resgistUser.username}を登録しました。<br>`,
        ''
      ])
      // ユーザー一括登録へリダイレクトされ「る」
      expect(response.redirect).toHaveBeenCalledWith('/uploadUsers')
    })

    test('正常：ユーザー一括登録する。(正常2件、スキップ5件)', async () => {
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
      // uploadController.uploadモック
      const resgistUser = [
        { username: 'test@test.com', status: 'Created' },
        { username: 'test@test.com', status: 'Invited' },
        { username: 'test@test.com', status: 'Duplicated' },
        { username: 'test@test.com', status: 'Invited Api Error' },
        { username: 'test@test.com', status: 'Error' },
        { username: 'test@', status: 'Email Type Error' },
        { username: 'test@', status: 'Role Type Error' }
      ]

      let resultMsg = ''
      for (let idx = 0; idx < resgistUser.length; idx++) {
        switch (resgistUser[idx].status) {
          case 'Created':
            resultMsg += `${resgistUser[idx].username}を登録しました。<br>`
            break
          case 'Invited':
            resultMsg += `${resgistUser[idx].username}を招待しました。<br>`
            break
          case 'Duplicated':
            resultMsg += `${resgistUser[idx].username}は既に登録済みのメールアドレスです。（スキップ）<br>`
            break
          case 'Invited Api Error':
            resultMsg += `${resgistUser[idx].username}への招待メールはAPIエラーが発生しました。（スキップ）<br>`
            break
          case 'Error':
            resultMsg += `${resgistUser[idx].username}の検索はAPIでエラー発生しました。（スキップ）<br>`
            break
          case 'Email Type Error':
            resultMsg += `${resgistUser[idx].username}はメール形式ではありません。（スキップ）<br>`
            break
          case 'Role Type Error':
            resultMsg += `${resgistUser[idx].username}のロールは正しい形式ではありません。（スキップ）<br>`
            break
        }
      }

      uploadControllerSpy.mockReturnValue([0, resgistUser])

      // 試験実施
      await uploadUsers.cbPostIndex(request, response, next)

      // 期待結果
      // userContextがLoggedInになっている
      expect(request.session?.userContext).toBe('LoggedIn')
      // session.userRoleが'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'になっている
      expect(request.session?.userRole).toBe('a6a3edcd-00d9-427c-bf03-4ef0112ba16d')
      // request.flashが呼ばれ「る」
      expect(request.flash).toHaveBeenCalledWith('noti', ['ユーザー一括登録', resultMsg, ''])
      // ユーザー一括登録へリダイレクトされ「る」
      expect(response.redirect).toHaveBeenCalledWith('/uploadUsers')
    })

    test('異常：ユーザー一括登録エラー発生', async () => {
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
      uploadControllerSpy.mockReturnValue([new Error(), null])

      // 試験実施
      await uploadUsers.cbPostIndex(request, response, next)

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
      // ユーザー一括登録へリダイレクトされ「る」
      expect(response.redirect).toHaveBeenCalledWith('/uploadUsers')
    })

    test('準正常：ユーザー一括登録（ヘッダーに誤り）', async () => {
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
      uploadControllerSpy.mockReturnValue([-1, null])

      // 試験実施
      await uploadUsers.cbPostIndex(request, response, next)

      // 期待結果
      // userContextがLoggedInになっている
      expect(request.session?.userContext).toBe('LoggedIn')
      // session.userRoleが'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'になっている
      expect(request.session?.userRole).toBe('a6a3edcd-00d9-427c-bf03-4ef0112ba16d')
      // request.flashが呼ばれ「る」
      expect(request.flash).toHaveBeenCalledWith('noti', [
        'ユーザー一括登録',
        'ヘッダーが指定のものと異なります。',
        'SYSERR'
      ])
      // ユーザー一括登録へリダイレクトされ「る」
      expect(response.redirect).toHaveBeenCalledWith('/uploadUsers')
    })

    test('準正常：ユーザー一括登録（取込データが存在しない）', async () => {
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
      uploadControllerSpy.mockReturnValue([-2, null])

      // 試験実施
      await uploadUsers.cbPostIndex(request, response, next)

      // 期待結果
      // userContextがLoggedInになっている
      expect(request.session?.userContext).toBe('LoggedIn')
      // session.userRoleが'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'になっている
      expect(request.session?.userRole).toBe('a6a3edcd-00d9-427c-bf03-4ef0112ba16d')
      // request.flashが呼ばれ「る」
      expect(request.flash).toHaveBeenCalledWith('noti', ['ユーザー一括登録', '項目数が異なります。', 'SYSERR'])
      // ユーザー一括登録へリダイレクトされ「る」
      expect(response.redirect).toHaveBeenCalledWith('/uploadUsers')
    })

    test('準正常：ユーザー一括登録（一度に取り込めるユーザーが200件以上）', async () => {
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
      uploadControllerSpy.mockReturnValue([-3, null])

      // 試験実施
      await uploadUsers.cbPostIndex(request, response, next)

      // 期待結果
      // userContextがLoggedInになっている
      expect(request.session?.userContext).toBe('LoggedIn')
      // session.userRoleが'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'になっている
      expect(request.session?.userRole).toBe('a6a3edcd-00d9-427c-bf03-4ef0112ba16d')
      // request.flashが呼ばれ「る」
      const constantsCodeErrMsg = require('../../Application/constants/codeErrMsg')
      const msg200Over = constantsCodeErrMsg.UPLOADUSERCOUNTER000

      expect(request.flash).toHaveBeenCalledWith('noti', ['ユーザー一括登録', msg200Over, 'SYSERR'])
      // ユーザー一括登録へリダイレクトされ「る」
      expect(response.redirect).toHaveBeenCalledWith('/uploadUsers')
    })

    test('準正常：ユーザー一括登録（一部行目に誤り）', async () => {
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
      uploadControllerSpy.mockReturnValue([-2, null])

      // 試験実施
      await uploadUsers.cbPostIndex(request, response, next)

      // 期待結果
      // userContextがLoggedInになっている
      expect(request.session?.userContext).toBe('LoggedIn')
      // session.userRoleが'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'になっている
      expect(request.session?.userRole).toBe('a6a3edcd-00d9-427c-bf03-4ef0112ba16d')
      // request.flashが呼ばれ「る」
      expect(request.flash).toHaveBeenCalledWith('noti', ['ユーザー一括登録', '項目数が異なります。', 'SYSERR'])
      // ユーザー一括登録へリダイレクトされ「る」
      expect(response.redirect).toHaveBeenCalledWith('/uploadUsers')
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
      await uploadUsers.cbPostIndex(request, response, next)

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
      await uploadUsers.cbPostIndex(request, response, next)

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
      await uploadUsers.cbPostIndex(request, response, next)

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
      await uploadUsers.cbPostIndex(request, response, next)

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
      await uploadUsers.cbPostIndex(request, response, next)

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
      await uploadUsers.cbPostIndex(request, response, next)

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
      await uploadUsers.cbPostIndex(request, response, next)

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
      await uploadUsers.cbPostIndex(request, response, next)

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
      await uploadUsers.cbPostIndex(request, response, next)

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
      await uploadUsers.cbPostIndex(request, response, next)

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
      await uploadUsers.cbPostIndex(request, response, next)

      // 期待結果
      // 404エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      expect(next).toHaveBeenCalledWith(errorHelper.create(500))
    })
  })
})
