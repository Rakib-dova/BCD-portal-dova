'use strict'

jest.mock('../../Application/node_modules/express', () => {
  return require('jest-express')
})

const departmentCodeEdit = require('../../Application/routes/departmentCodeEdit')
const Request = require('jest-express').Request
const Response = require('jest-express').Response
const next = require('jest-express').Next
const helper = require('../../Application/routes/helpers/middleware')
const errorHelper = require('../../Application/routes/helpers/error')
const noticeHelper = require('../../Application/routes/helpers/notice')
const userController = require('../../Application/controllers/userController.js')
const contractController = require('../../Application/controllers/contractController.js')
const tenantController = require('../../Application/controllers/tenantController')
const departmentCodeController = require('../../Application/controllers/departmentCodeController.js')
const logger = require('../../Application/lib/logger.js')

let request, response, infoSpy
let userControllerFindOneSpy,
  contractControllerFindOneSpy,
  departmentCodeControllerGetDepartmentCodeSpy,
  tenatnsFindOneSpy,
  userControllerFindAndUpdate,
  contractControllerFindContractSpy,
  checkContractStatusSpy,
  updatedDepartmentCodeSpy

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
const DepartmentCode = require('../mockDB/DepartmentCode_Table')

describe('departmentCodeEditのテスト', () => {
  beforeEach(() => {
    request = new Request()
    request.body = {}
    response = new Response()
    infoSpy = jest.spyOn(logger, 'info')
    userControllerFindOneSpy = jest.spyOn(userController, 'findOne')
    userControllerFindAndUpdate = jest.spyOn(userController, 'findAndUpdate')
    contractControllerFindOneSpy = jest.spyOn(contractController, 'findOne')
    contractControllerFindContractSpy = jest.spyOn(contractController, 'findContract')
    departmentCodeControllerGetDepartmentCodeSpy = jest.spyOn(departmentCodeController, 'getDepartmentCode')
    tenatnsFindOneSpy = jest.spyOn(tenantController, 'findOne')
    request.flash = jest.fn()
    checkContractStatusSpy = jest.spyOn(helper, 'checkContractStatus')
    updatedDepartmentCodeSpy = jest.spyOn(departmentCodeController, 'updatedDepartmentCode')
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
    departmentCodeControllerGetDepartmentCodeSpy.mockRestore()
    tenatnsFindOneSpy.mockRestore()
    checkContractStatusSpy.mockRestore()
    updatedDepartmentCodeSpy.mockRestore()
  })

  describe('ルーティング', () => {
    test('departmentCodeのルーティングを確認', async () => {
      expect(departmentCodeEdit.router.get).toBeCalledWith(
        '/:departmentCodeId',
        helper.isAuthenticated,
        departmentCodeEdit.cbGetIndex
      )
      expect(departmentCodeEdit.router.post).toBeCalledWith(
        '/:departmentCodeId',
        helper.isAuthenticated,
        departmentCodeEdit.cbPostIndex
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
      // DBからの正常な部門データ情報取得を想定する
      departmentCodeControllerGetDepartmentCodeSpy.mockReturnValue(DepartmentCode[0])

      // 試験実施
      await departmentCodeEdit.cbGetIndex(request, response, next)

      // 期待結果
      // userContextがLoggedInになっている
      expect(request.session?.userContext).toBe('LoggedIn')
      // session.userRoleが'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'になっている
      expect(request.session?.userRole).toBe('a6a3edcd-00d9-427c-bf03-4ef0112ba16d')
      // response.renderでregistDepartmentCodeが呼ばれ「る」
      expect(response.render).toHaveBeenCalledWith('registDepartmentCode', {
        codeName: '部門データ確認・変更',
        codeLabel: '部門コード',
        codeNameLabel: '部門名',
        requiredTagCode: 'departmentCodeTagRequired',
        requiredTagName: 'departmentCodeNameRequired',
        idForCodeInput: 'setDepartmentCodeInputId',
        idForNameInput: 'setDepartmentCodeNameInputId',
        logTitle: '部門データ確認・変更',
        logTitleEng: 'EDIT DEPARTMENT',
        modalTitle: '部門データ設定確認',
        backUrl: '/departmentCodeList',
        isRegistDepartmentCode: true,
        pTagForcheckInput1: 'checksetDepartmentCodeInputId',
        pTagForcheckInput2: 'checksetDepartmentCodeNameInputId',
        checkModalLabel1: '部門コード',
        checkModalLabel2: '部門名',
        valueForCodeInput: DepartmentCode[0].departmentCode,
        valueForNameInput: DepartmentCode[0].departmentCodeName
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
      // DBからのnullの部門データ情報取得を想定する
      departmentCodeControllerGetDepartmentCodeSpy.mockReturnValue(null)

      // 試験実施
      await departmentCodeEdit.cbGetIndex(request, response, next)

      // 期待結果
      // userContextがLoggedInになっている
      expect(request.session?.userContext).toBe('LoggedIn')
      // session.userRoleが'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'になっている
      expect(request.session?.userRole).toBe('a6a3edcd-00d9-427c-bf03-4ef0112ba16d')
      // response.renderでregistDepartmentCodeが呼ばれ「る」
      expect(response.render).toHaveBeenCalledWith('registDepartmentCode', {
        codeName: '部門データ確認・変更',
        codeLabel: '部門コード',
        codeNameLabel: '部門名',
        requiredTagCode: 'departmentCodeTagRequired',
        requiredTagName: 'departmentCodeNameRequired',
        idForCodeInput: 'setDepartmentCodeInputId',
        idForNameInput: 'setDepartmentCodeNameInputId',
        logTitle: '部門データ確認・変更',
        logTitleEng: 'EDIT DEPARTMENT',
        modalTitle: '部門データ設定確認',
        backUrl: '/departmentCodeList',
        isRegistDepartmentCode: true,
        pTagForcheckInput1: 'checksetDepartmentCodeInputId',
        pTagForcheckInput2: 'checksetDepartmentCodeNameInputId',
        checkModalLabel1: '部門コード',
        checkModalLabel2: '部門名',
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
      // DBからの正常な部門データ情報取得を想定する
      tenatnsFindOneSpy.mockReturnValue(Tenants[5])
      // ユーザ権限チェック結果設定
      checkContractStatusSpy.mockReturnValue('30')

      // 試験実施
      await departmentCodeEdit.cbGetIndex(request, response, next)

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
      await departmentCodeEdit.cbGetIndex(request, response, next)

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
      await departmentCodeEdit.cbGetIndex(request, response, next)

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

      // DBからエラーが発生することを想定する
      const userDbError = new Error('User Table Error')
      userControllerFindOneSpy.mockReturnValue(userDbError)

      // 試験実施
      await departmentCodeEdit.cbGetIndex(request, response, next)

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
      await departmentCodeEdit.cbGetIndex(request, response, next)

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
      await departmentCodeEdit.cbGetIndex(request, response, next)

      // 期待結果
      expect(next).toHaveBeenCalledWith(errorHelper.create(500))
    })

    test('500エラー：不正な部門データの場合', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...Users[0] }

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[0])
      // DBからの正常な契約情報取得を想定する
      contractControllerFindOneSpy.mockReturnValue(Contracts[0])
      // DBからの正常な部門データ情報取得を想定する
      tenatnsFindOneSpy.mockReturnValue(Tenants[0])
      // ユーザ権限チェック結果設定
      checkContractStatusSpy.mockReturnValue('00')
      const departmentCodeDbError = new Error('AccountCodeCode Table Error')
      // DBからのnullの部門データ情報取得を想定する
      departmentCodeControllerGetDepartmentCodeSpy.mockReturnValue(departmentCodeDbError)
      // checkContractStatusからreturnされる値設定

      // 試験実施
      await departmentCodeEdit.cbGetIndex(request, response, next)

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
      await departmentCodeEdit.cbGetIndex(request, response, next)

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
      await departmentCodeEdit.cbGetIndex(request, response, next)

      // 期待結果
      // 404エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      expect(next).toHaveBeenCalledWith(errorHelper.create(500))
    })

    test('異常：異常経路接続', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session, userContext: 'NotLoggedIn' }
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
      await departmentCodeEdit.cbGetIndex(request, response, next)

      // 期待結果
      // userContextがLoggedInになっている
      expect(request.session?.userContext).toBe('NotLoggedIn')
      // session.userRoleが'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'になっている
      expect(request.session?.userRole).toBe('dummy')
      // 400エラーがエラーハンドリング「される」
      expect(next).toHaveBeenCalledWith(errorHelper.create(400))
    })
  })

  describe('コールバック:cbPostIndex', () => {
    test('正常：部門コードと部門名変更', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...Users[0] }
      request.params.departmentCodeId = '74a9717e-4ed8-4430-9109-9ab7e850bdc7'
      request.body.setDepartmentCodeInputId = 'AA001'
      request.body.setDepartmentCodeNameInputId = '費用科目'

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[0])
      // DBからの正常な契約情報取得を想定する
      contractControllerFindOneSpy.mockReturnValue(Contracts[0])
      // DBからの正常なテナント情報取得を想定する
      tenatnsFindOneSpy.mockReturnValue(Tenants[0])
      // DBからの正常なコントラクター情報取得を想定する
      contractControllerFindContractSpy.mockReturnValue(Contracts[0])
      // departmentCodeController.updatedDepartmentCodeのモックバリュー
      updatedDepartmentCodeSpy.mockReturnValue(0)

      // 試験実施
      await departmentCodeEdit.cbPostIndex(request, response, next)

      // 期待結果
      // userContextがLoggedInになっている
      expect(request.session?.userContext).toBe('LoggedIn')
      // session.userRoleが'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'になっている
      expect(request.session?.userRole).toBe('a6a3edcd-00d9-427c-bf03-4ef0112ba16d')
      // 部門データ一覧へリダイレクトされ「る」
      expect(response.redirect).toHaveBeenCalledWith('/departmentCodeList')
    })

    test('準正常：部門コードと部門名の値は変更なくて変更ボタン押下する。', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...Users[0] }
      request.params.departmentCodeId = '74a9717e-4ed8-4430-9109-9ab7e850bdc7'
      request.body.setDepartmentCodeInputId = 'AA001'
      request.body.setDepartmentCodeNameInputId = '費用科目'

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[0])
      // DBからの正常な契約情報取得を想定する
      contractControllerFindOneSpy.mockReturnValue(Contracts[0])
      // DBからの正常なテナント情報取得を想定する
      tenatnsFindOneSpy.mockReturnValue(Tenants[0])
      // DBからの正常なコントラクター情報取得を想定する
      contractControllerFindContractSpy.mockReturnValue(Contracts[0])
      // departmentCodeController.updatedDepartmentCodeのモックバリュー
      updatedDepartmentCodeSpy.mockReturnValue(1)

      // 試験実施
      await departmentCodeEdit.cbPostIndex(request, response, next)

      // 期待結果
      // userContextがLoggedInになっている
      expect(request.session?.userContext).toBe('LoggedIn')
      // session.userRoleが'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'になっている
      expect(request.session?.userRole).toBe('a6a3edcd-00d9-427c-bf03-4ef0112ba16d')
      // 部門データ変更画面へリダイレクトされ「る」
      expect(response.redirect).toHaveBeenCalledWith(`/departmentCodeEdit/${request.params.departmentCodeId}`)
    })

    test('準正常：既存部門コードがある場合', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...Users[0] }
      request.params.departmentCodeId = '74a9717e-4ed8-4430-9109-9ab7e850bdc7'
      request.body.setDepartmentCodeInputId = 'AA001'
      request.body.setDepartmentCodeNameInputId = '費用科目'

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[0])
      // DBからの正常な契約情報取得を想定する
      contractControllerFindOneSpy.mockReturnValue(Contracts[0])
      // DBからの正常なテナント情報取得を想定する
      tenatnsFindOneSpy.mockReturnValue(Tenants[0])
      // DBからの正常なコントラクター情報取得を想定する
      contractControllerFindContractSpy.mockReturnValue(Contracts[0])
      // departmentCodeController.updatedDepartmentCodeのモックバリュー
      updatedDepartmentCodeSpy.mockReturnValue(-1)

      // 試験実施
      await departmentCodeEdit.cbPostIndex(request, response, next)

      // 期待結果
      // userContextがLoggedInになっている
      expect(request.session?.userContext).toBe('LoggedIn')
      // session.userRoleが'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'になっている
      expect(request.session?.userRole).toBe('a6a3edcd-00d9-427c-bf03-4ef0112ba16d')
      // 部門データ変更画面へリダイレクトされ「る」
      expect(response.redirect).toHaveBeenCalledWith(`/departmentCodeEdit/${request.params.departmentCodeId}`)
    })

    test('準正常：解約申込中の場合', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...Users[6] }

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[6])
      // DBからの正常な契約情報取得を想定する
      contractControllerFindOneSpy.mockReturnValue(Contracts[5])
      checkContractStatusSpy.mockReturnValue('30')

      // 試験実施
      await departmentCodeEdit.cbPostIndex(request, response, next)

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
      // 契約不正の場合
      contractControllerFindContractSpy.mockReturnValue(Contracts[7])

      // 試験実施
      await departmentCodeEdit.cbPostIndex(request, response, next)

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
      await departmentCodeEdit.cbPostIndex(request, response, next)

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
      await departmentCodeEdit.cbPostIndex(request, response, next)

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
      await departmentCodeEdit.cbPostIndex(request, response, next)

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
      await departmentCodeEdit.cbPostIndex(request, response, next)

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
      await departmentCodeEdit.cbPostIndex(request, response, next)

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
      await departmentCodeEdit.cbPostIndex(request, response, next)

      // 期待結果
      // 404エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      expect(next).toHaveBeenCalledWith(errorHelper.create(500))
    })

    test('異常：部門データコントローラのエラー', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...Users[0] }
      request.params.departmentCodeId = '74a9717e-4ed8-4430-9109-9ab7e850bdc7'
      request.body.setDepartmentCodeInputId = 'AA001'
      request.body.setDepartmentCodeNameInputId = '費用科目'

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[0])
      // DBからの正常な契約情報取得を想定する
      contractControllerFindOneSpy.mockReturnValue(Contracts[0])
      // DBからの正常なテナント情報取得を想定する
      tenatnsFindOneSpy.mockReturnValue(Tenants[0])
      // DBからの正常なコントラクター情報取得を想定する
      contractControllerFindContractSpy.mockReturnValue(Contracts[0])
      // departmentCodeController.updatedDepartmentCodeのモックバリュー
      const dbError = new Error('DB Pool Error')
      updatedDepartmentCodeSpy.mockReturnValue(dbError)

      // 試験実施
      await departmentCodeEdit.cbPostIndex(request, response, next)

      // 期待結果
      // userContextがLoggedInになっている
      expect(request.session?.userContext).toBe('LoggedIn')
      // session.userRoleが'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'になっている
      expect(request.session?.userRole).toBe('a6a3edcd-00d9-427c-bf03-4ef0112ba16d')
      // 500エラーがエラーハンドリング「される」
      expect(next).toHaveBeenCalledWith(errorHelper.create(500))
    })

    test('異常：異常経路接続', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session, userContext: 'NotLoggedIn' }
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
      await departmentCodeEdit.cbPostIndex(request, response, next)

      // 期待結果
      // userContextがLoggedInになっている
      expect(request.session?.userContext).toBe('NotLoggedIn')
      // session.userRoleが'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'になっている
      expect(request.session?.userRole).toBe('dummy')
      // 400エラーがエラーハンドリング「される」
      expect(next).toHaveBeenCalledWith(errorHelper.create(400))
    })

    test('異常：パラメータがヌールの場合：departmentCodeId', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...Users[0] }
      request.params.departmentCodeId = null
      request.body.setDepartmentCodeInputId = 'AA001'
      request.body.setDepartmentCodeNameInputId = '費用科目'

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[0])
      // DBからの正常な契約情報取得を想定する
      contractControllerFindOneSpy.mockReturnValue(Contracts[0])
      // DBからの正常なテナント情報取得を想定する
      tenatnsFindOneSpy.mockReturnValue(Tenants[0])
      // DBからの正常なコントラクター情報取得を想定する
      contractControllerFindContractSpy.mockReturnValue(Contracts[0])
      // departmentCodeController.updatedDepartmentCodeのモックバリュー
      updatedDepartmentCodeSpy.mockReturnValue(-2)

      // 試験実施
      await departmentCodeEdit.cbPostIndex(request, response, next)

      // 期待結果
      // userContextがLoggedInになっている
      expect(request.session?.userContext).toBe('LoggedIn')
      // session.userRoleが'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'になっている
      expect(request.session?.userRole).toBe('a6a3edcd-00d9-427c-bf03-4ef0112ba16d')
      // 部門データ一覧画面へリダイレクトされ「る」
      expect(response.redirect).toHaveBeenCalledWith('/departmentCodeList')
    })

    test('異常：パラメータがヌールの場合：departmentCode', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...Users[0] }
      request.params.departmentCodeId = '74a9717e-4ed8-4430-9109-9ab7e850bdc7'
      request.body.setDepartmentCodeInputId = null
      request.body.setDepartmentCodeNameInputId = '費用科目'

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[0])
      // DBからの正常な契約情報取得を想定する
      contractControllerFindOneSpy.mockReturnValue(Contracts[0])
      // DBからの正常なテナント情報取得を想定する
      tenatnsFindOneSpy.mockReturnValue(Tenants[0])
      // DBからの正常なコントラクター情報取得を想定する
      contractControllerFindContractSpy.mockReturnValue(Contracts[0])

      // 試験実施
      await departmentCodeEdit.cbPostIndex(request, response, next)

      // 期待結果
      // userContextがLoggedInになっている
      expect(request.session?.userContext).toBe('LoggedIn')
      // session.userRoleが'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'になっている
      expect(request.session?.userRole).toBe('a6a3edcd-00d9-427c-bf03-4ef0112ba16d')
      // 部門データ一覧画面へリダイレクトされ「る」
      expect(response.redirect).toHaveBeenCalledWith('/departmentCodeEdit/74a9717e-4ed8-4430-9109-9ab7e850bdc7')
    })

    test('異常：パラメータがヌールの場合：departmentCode', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...Users[0] }
      request.params.departmentCodeId = '74a9717e-4ed8-4430-9109-9ab7e850bdc7'
      request.body.setDepartmentCodeInputId = 'AB001'
      request.body.setDepartmentCodeNameInputId = null

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[0])
      // DBからの正常な契約情報取得を想定する
      contractControllerFindOneSpy.mockReturnValue(Contracts[0])
      // DBからの正常なテナント情報取得を想定する
      tenatnsFindOneSpy.mockReturnValue(Tenants[0])
      // DBからの正常なコントラクター情報取得を想定する
      contractControllerFindContractSpy.mockReturnValue(Contracts[0])

      // 試験実施
      await departmentCodeEdit.cbPostIndex(request, response, next)

      // 期待結果
      // userContextがLoggedInになっている
      expect(request.session?.userContext).toBe('LoggedIn')
      // session.userRoleが'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'になっている
      expect(request.session?.userRole).toBe('a6a3edcd-00d9-427c-bf03-4ef0112ba16d')
      // 部門データ一覧画面へリダイレクトされ「る」
      expect(response.redirect).toHaveBeenCalledWith('/departmentCodeEdit/74a9717e-4ed8-4430-9109-9ab7e850bdc7')
    })

    test('異常：変更の瞬間対象データが無：departmentCode', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...Users[0] }
      request.params.departmentCodeId = '74a9717e-4ed8-4430-9109-9ab7e850bdc7'
      request.body.setDepartmentCodeInputId = 'AB001'
      request.body.setDepartmentCodeNameInputId = 'abcd'

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[0])
      // DBからの正常な契約情報取得を想定する
      contractControllerFindOneSpy.mockReturnValue(Contracts[0])
      // DBからの正常なテナント情報取得を想定する
      tenatnsFindOneSpy.mockReturnValue(Tenants[0])
      // DBからの正常なコントラクター情報取得を想定する
      contractControllerFindContractSpy.mockReturnValue(Contracts[0])
      // departmentCodeController.updatedDepartmentCodeのモックバリュー
      updatedDepartmentCodeSpy.mockReturnValue(-2)

      // 試験実施
      await departmentCodeEdit.cbPostIndex(request, response, next)

      // 期待結果
      // userContextがLoggedInになっている
      expect(request.session?.userContext).toBe('LoggedIn')
      // session.userRoleが'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'になっている
      expect(request.session?.userRole).toBe('a6a3edcd-00d9-427c-bf03-4ef0112ba16d')
      // 部門データ一覧画面へリダイレクトされ「る」
      expect(response.redirect).toHaveBeenCalledWith('/departmentCodeList')
    })
  })
})
