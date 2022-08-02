'use strict'

jest.mock('../../Application/node_modules/express', () => {
  return require('jest-express')
})

const Request = require('jest-express').Request
const Response = require('jest-express').Response
const next = require('jest-express').Next
const logger = require('../../Application/lib/logger')
const rejectApproval = require('../../Application/routes/rejectApproval')
const helper = require('../../Application/routes/helpers/middleware')
const userController = require('../../Application/controllers/userController')
const contractController = require('../../Application/controllers/contractController.js')
const noticeHelper = require('../../Application/routes/helpers/notice')
const errorHelper = require('../../Application/routes/helpers/error')
const approverController = require('../../Application/controllers/approverController')
const rejectApporovalController = require('../../Application/controllers/rejectApporovalController')
const inboxController = require('../../Application/controllers/inboxController')
const mailMsg = require('../../Application/lib/mailMsg')

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

// モックテーブル定義
const Users = require('../mockDB/Users_Table')
const Contracts = require('../mockDB/Contracts_Table')

let errorSpy, infoSpy
let request, response
let userControllerFindOneSpy, contractControllerFindOneSpy, checkContractStatusSpy
let approverControllerSearchApproveRouteList, inboxControllerGetInvoiceDetail
let approverControllerGetApproveRoute, approverControllerCheckApproveRoute, approverControllerSaveApproval
let approverControllerReadApproval
let rejectApporovalControllerRejectApprove
let mailMsgSendPaymentRequestMail

describe('rejectApprovalのテスト', () => {
  beforeEach(() => {
    request = new Request()
    request.flash = jest.fn()
    response = new Response()
    errorSpy = jest.spyOn(logger, 'error')
    infoSpy = jest.spyOn(logger, 'info')
    userControllerFindOneSpy = jest.spyOn(userController, 'findOne')
    contractControllerFindOneSpy = jest.spyOn(contractController, 'findOne')
    checkContractStatusSpy = jest.spyOn(helper, 'checkContractStatus')
    approverControllerSearchApproveRouteList = jest.spyOn(approverController, 'searchApproveRouteList')
    inboxControllerGetInvoiceDetail = jest.spyOn(inboxController, 'getInvoiceDetail')
    approverControllerGetApproveRoute = jest.spyOn(approverController, 'getApproveRoute')
    approverControllerReadApproval = jest.spyOn(approverController, 'readApproval')
    approverControllerCheckApproveRoute = jest.spyOn(approverController, 'checkApproveRoute')
    approverControllerSaveApproval = jest.spyOn(approverController, 'saveApproval')
    rejectApporovalControllerRejectApprove = jest.spyOn(rejectApporovalController, 'rejectApprove')
    mailMsgSendPaymentRequestMail = jest.spyOn(mailMsg, 'sendPaymentRequestMail')
  })
  afterEach(() => {
    request.resetMocked()
    response.resetMocked()
    next.mockReset()
    errorSpy.mockRestore()
    infoSpy.mockRestore()
    userControllerFindOneSpy.mockRestore()
    contractControllerFindOneSpy.mockRestore()
    checkContractStatusSpy.mockRestore()
    approverControllerSearchApproveRouteList.mockRestore()
    inboxControllerGetInvoiceDetail.mockRestore()
    approverControllerGetApproveRoute.mockRestore()
    approverControllerReadApproval.mockRestore()
    approverControllerCheckApproveRoute.mockRestore()
    approverControllerSaveApproval.mockRestore()
    rejectApporovalControllerRejectApprove.mockRestore()
    mailMsgSendPaymentRequestMail.mockRestore()
  })

  describe('ルーティング', () => {
    test('rejectApprovalのルーティングを確認', async () => {
      expect(rejectApproval.router.post).toBeCalledWith(
        '/:invoiceId',
        helper.isAuthenticated,
        expect.any(Function),
        rejectApproval.cbPostApprove
      )
    })
  })

  describe('コールバック:cbPostApprove', () => {
    test('正常', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = {
        ...session,
        rejectApproval: { message: 'test', approveRouteId: '', isSaved: true },
        isSaved: true
      }
      request.user = { ...user[0] }
      request.params = {
        invoiceId: 'bfc26e3a-f2e8-5a05-9f8d-1e8f41196904'
      }

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[0])
      // DBからの正常な契約情報取得を想定する
      contractControllerFindOneSpy.mockReturnValue(Contracts[0])

      // ユーザ権限チェック結果設定
      checkContractStatusSpy.mockReturnValue(Contracts[0].dataValues.contractStatus)

      rejectApporovalControllerRejectApprove.mockReturnValue(true)
      mailMsgSendPaymentRequestMail.mockReturnValue(0)

      // 試験実施
      await rejectApproval.cbPostApprove(request, response, next)

      // 結果確認
      // request.flashが呼ばれ「る」
      expect(request.flash).toHaveBeenCalledWith(
        'info',
        '支払依頼を差し戻しました。依頼者にはメールで通知が送られます。'
      )
      expect(response.redirect).toHaveBeenCalledWith('/inboxList/1')
    })

    test('準正常：差し戻しのメール通知が失敗した場合', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = {
        ...session,
        rejectApproval: { message: 'test', approveRouteId: '', isSaved: true },
        isSaved: true
      }
      request.user = { ...user[0] }
      request.params = {
        invoiceId: 'bfc26e3a-f2e8-5a05-9f8d-1e8f41196904'
      }

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[0])
      // DBからの正常な契約情報取得を想定する
      contractControllerFindOneSpy.mockReturnValue(Contracts[0])

      // ユーザ権限チェック結果設定
      checkContractStatusSpy.mockReturnValue(Contracts[0].dataValues.contractStatus)

      rejectApporovalControllerRejectApprove.mockReturnValue(true)
      mailMsgSendPaymentRequestMail.mockReturnValue(1)

      // 試験実施
      await rejectApproval.cbPostApprove(request, response, next)

      // 結果確認
      // request.flashが呼ばれ「る」
      expect(request.flash).toHaveBeenCalledWith(
        'error',
        '支払依頼を差し戻しました。メールの通知に失敗しましたので、依頼者に連絡をとってください。'
      )
      expect(response.redirect).toHaveBeenCalledWith('/inboxList/1')
    })

    test('準正常：差し戻し処理が失敗した場合', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = {
        ...session,
        rejectApproval: { message: 'test', approveRouteId: '', isSaved: true },
        isSaved: true
      }
      request.user = { ...user[0] }
      request.params = {
        invoiceId: 'bfc26e3a-f2e8-5a05-9f8d-1e8f41196904'
      }

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[0])
      // DBからの正常な契約情報取得を想定する
      contractControllerFindOneSpy.mockReturnValue(Contracts[0])

      // ユーザ権限チェック結果設定
      checkContractStatusSpy.mockReturnValue(Contracts[0].dataValues.contractStatus)

      rejectApporovalControllerRejectApprove.mockReturnValue(false)

      // 試験実施
      await rejectApproval.cbPostApprove(request, response, next)

      // 結果確認
      // request.flashが呼ばれ「る」
      expect(request.flash).toHaveBeenCalledWith('noti', ['支払依頼', '差し戻しに失敗しました。'])
      expect(response.redirect).toHaveBeenCalledWith(`/approvalInbox/${request.params.invoiceId}`)
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

      await rejectApproval.cbPostApprove(request, response, next)

      // 結果確認
      // 404エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)

      // userContextがLoggedInになっている
      expect(request.session?.userContext).toBe('LoggedIn')
      // session.userRoleが'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'になっている
      expect(request.session?.userRole).toBe('a6a3edcd-00d9-427c-bf03-4ef0112ba16d')
      // 解約手続き中画面が表示「される」
      expect(next).toHaveBeenCalledWith(noticeHelper.create('cancelprocedure'))
    })

    test('異常：hasPowerOfEditingがFalseの場合（ログインユーザが差し戻し直前のステータス確認で先にステータスが変わった場合→重複差し戻しの対応）', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = {
        ...session,
        rejectApproval: { message: 'test', approveRouteId: '', isSaved: true },
        isSaved: true
      }
      request.user = { ...user[0] }
      request.params = {
        invoiceId: 'bfc26e3a-f2e8-5a05-9f8d-1e8f41196904'
      }

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[0])
      // DBからの正常な契約情報取得を想定する
      contractControllerFindOneSpy.mockReturnValue(Contracts[0])

      // ユーザ権限チェック結果設定
      checkContractStatusSpy.mockReturnValue(Contracts[0].dataValues.contractStatus)

      rejectApporovalControllerRejectApprove.mockReturnValue(-1)
      mailMsgSendPaymentRequestMail.mockReturnValue(0)

      // 試験実施
      await rejectApproval.cbPostApprove(request, response, next)

      // 結果確認
      // request.flashが呼ばれ「る」
      expect(request.flash).toHaveBeenCalledWith('error', '差し戻しに失敗しました。')
      expect(response.redirect).toHaveBeenCalledWith('/inboxList/1')
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

      // ユーザ権限チェック結果設定
      checkContractStatusSpy.mockReturnValue(Contracts[5].dataValues.contractStatus)

      await rejectApproval.cbPostApprove(request, response, next)

      // 結果確認
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
      // DBからの正常な契約情報取得を想定する
      contractControllerFindOneSpy.mockReturnValue(null)

      await rejectApproval.cbPostApprove(request, response, next)

      // 結果確認
      // 404，500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      // expect(next).not.toHaveBeenCalledWith(errorHelper.create(500))
      // userContextがLoggedInになっている
      expect(request.session?.userContext).toBe('LoggedIn')
      // 解約手続き中画面が表示「される」
      expect(next).toHaveBeenCalledWith(errorHelper.create(500))
    })

    test('500エラー：requestのsession,userIdがnullの場合', async () => {
      // 実施
      await rejectApproval.cbPostApprove(request, response, next)

      // 結果確認
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

      await rejectApproval.cbPostApprove(request, response, next)

      // 結果確認
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
      await rejectApproval.cbPostApprove(request, response, next)

      // 結果確認
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
      await rejectApproval.cbPostApprove(request, response, next)

      // 結果確認
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
      await rejectApproval.cbPostApprove(request, response, next)

      // 結果確認
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
      await rejectApproval.cbPostApprove(request, response, next)

      // 結果確認
      // 404エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      expect(next).toHaveBeenCalledWith(errorHelper.create(500))
    })
  })
})
