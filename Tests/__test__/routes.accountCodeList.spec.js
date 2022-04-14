'use strict'

jest.mock('../../Application/node_modules/express', () => {
  return require('jest-express')
})

const Request = require('jest-express').Request
const Response = require('jest-express').Response
const next = require('jest-express').Next
const errorHelper = require('../../Application/routes/helpers/error')
const noticeHelper = require('../../Application/routes/helpers/notice')
const helper = require('../../Application/routes/helpers/middleware')
const logger = require('../../Application/lib/logger.js')
const tenantController = require('../../Application/controllers/tenantController')
const userController = require('../../Application/controllers/userController.js')
const contractController = require('../../Application/controllers/contractController.js')
const accountCodeController = require('../../Application/controllers/accountCodeController')
const accountCodeList = require('../../Application/routes/accountCodeList')
const userMock = require('../mockDB/Users_Table')
const tenantsMock = require('../mockDB/Tenants_Table')
const contractMock = require('../mockDB/Contracts_Table')

if (process.env.LOCALLY_HOSTED === 'true') {
  // NODE_ENVはJestがデフォルトでtestに指定する。dotenvで上書きできなかったため、package.jsonの実行引数でdevelopmentを指定
  require('dotenv').config({ path: './config/.env' })
}

let request,
  response,
  infoSpy,
  userControllerFindOneSpy,
  contractControllerFindOneSpy,
  findOneSpyContracts,
  getAccountCodeListSpy,
  tenantControllerFindOneSpy,
  contractControllerFindContractSpy
describe('routes.accountListのテスト', () => {
  beforeEach(() => {
    request = new Request()
    response = new Response()
    userControllerFindOneSpy = jest.spyOn(userController, 'findOne')
    tenantControllerFindOneSpy = jest.spyOn(tenantController, 'findOne')
    contractControllerFindOneSpy = jest.spyOn(userController, 'findOne')
    findOneSpyContracts = jest.spyOn(contractController, 'findOne')
    contractControllerFindContractSpy = jest.spyOn(contractController, 'findContract')
    getAccountCodeListSpy = jest.spyOn(accountCodeController, 'getAccountCodeList')
    infoSpy = jest.spyOn(logger, 'info')
  })

  afterEach(() => {
    request.resetMocked()
    response.resetMocked()
    next.mockReset()
    userControllerFindOneSpy.mockRestore()
    tenantControllerFindOneSpy.mockRestore()
    infoSpy.mockRestore()
    contractControllerFindOneSpy.mockRestore()
    findOneSpyContracts.mockRestore()
    getAccountCodeListSpy.mockRestore()
    contractControllerFindContractSpy.mockRestore()
  })

  // 404エラー定義
  const error404 = new Error('お探しのページは見つかりませんでした。')
  error404.name = 'Not Found'
  error404.status = 404

  // 勘定科目が4件の場合
  const accountCodeListArrFour = [
    {
      no: 1,
      accountCodeId: '74a9717e-4ed8-4430-9109-9ab7e850bdc7',
      accountCode: 'AA001',
      accountCodeName: '費用科目',
      updatedAt: '2021/11/25'
    },
    {
      no: 2,
      accountCodeId: '0ab2343d-9d98-4614-b68b-78929bd84fee',
      accountCode: 'AA002',
      accountCodeName: '預金科目',
      updatedAt: '2021/11/25'
    },
    {
      no: 3,
      accountCodeId: '241a8890-14f5-455f-8934-ee1e64b53cb5',
      accountCode: 'AA003',
      accountCodeName: '預かり金',
      updatedAt: '2021/11/25'
    },
    {
      no: 4,
      accountCodeId: 'aab5cd98-dbd8-4222-b3b0-f5318de5bdcf',
      accountCode: 'AA004',
      accountCodeName: '受取手形',
      updatedAt: '2021/11/25'
    }
  ]

  describe('ルーティング', () => {
    test('uploadFormatListのルーティングを確認', async () => {
      expect(accountCodeList.router.get).toBeCalledWith('/', helper.isAuthenticated, accountCodeList.cbGetIndex)
    })
  })

  describe('cbGetIndex', () => {
    test('正常:勘定科目が0件の場合', async () => {
      // 準備
      // session.userContextに正常値(LoggedIn)を想定する
      request.session = {
        userContext: 'LoggedIn',
        userRole: 'dummy'
      }
      request.user = {
        userId: userMock[0].userId
      }
      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(userMock[0])
      findOneSpyContracts.mockReturnValue(contractMock[0])
      tenantControllerFindOneSpy.mockReturnValue(tenantsMock[0])
      contractControllerFindContractSpy.mockReturnValue(contractMock[0])
      getAccountCodeListSpy.mockReturnValue([])

      // 試験実施
      await accountCodeList.cbGetIndex(request, response, next)

      // 期待結果
      // 400,500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(400))
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(500))
      // response.renderでuploadFormatListが呼ばれ「る」
      expect(response.render).toHaveBeenCalledWith('accountCodeList', {
        title: '勘定科目一覧',
        engTitle: 'ACCOUNT CODE LIST',
        btnNameForRegister: '新規登録する',
        listArr: [],
        messageForNotItem: '現在、勘定科目はありません。新規登録するボタンから登録を行ってください。',
        // リスト表示カラム
        listNo: 'No',
        accountCode: '勘定科目コード',
        accountCodeName: '勘定科目名',
        accountCodeUpdatedAt: '最新更新日',
        setClassChangeBtn: 'checkChangeAccountCodeBtn',
        setClassDeleteBtn: 'deleteAccountCodeBtn',
        prevLocation: '/uploadAccount',
        prevLocationName: '←勘定科目一括作成',
        deleteModalTitle: '勘定科目削除'
      })
    })

    test('正常:勘定科目が4件以上の場合', async () => {
      // 準備
      // session.userContextに正常値(LoggedIn)を想定する
      request.session = {
        userContext: 'LoggedIn',
        userRole: 'dummy'
      }
      request.user = {
        userId: '12345678-cb0b-48ad-857d-4b42a44ede13'
      }
      // DBからの正常なユーザデータの取得を想定する
      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(userMock[0])
      findOneSpyContracts.mockReturnValue(contractMock[0])
      tenantControllerFindOneSpy.mockReturnValue(tenantsMock[0])
      contractControllerFindContractSpy.mockReturnValue(contractMock[0])
      getAccountCodeListSpy.mockReturnValue(accountCodeListArrFour)

      // 試験実施
      await accountCodeList.cbGetIndex(request, response, next)

      // 期待結果
      // 400,500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(400))
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(500))
      // response.renderでuploadFormatListが呼ばれ「る」
      expect(response.render).toHaveBeenCalledWith('accountCodeList', {
        title: '勘定科目一覧',
        engTitle: 'ACCOUNT CODE LIST',
        btnNameForRegister: '新規登録する',
        listArr: accountCodeListArrFour,
        messageForNotItem: '現在、勘定科目はありません。新規登録するボタンから登録を行ってください。',
        // リスト表示カラム
        listNo: 'No',
        accountCode: '勘定科目コード',
        accountCodeName: '勘定科目名',
        accountCodeUpdatedAt: '最新更新日',
        setClassChangeBtn: 'checkChangeAccountCodeBtn',
        setClassDeleteBtn: 'deleteAccountCodeBtn',
        prevLocation: '/uploadAccount',
        prevLocationName: '←勘定科目一括作成',
        deleteModalTitle: '勘定科目削除'
      })
    })

    test('正常：登録申込中の場合', async () => {
      // 準備
      // session.userContextに正常値(LoggedIn)を想定する
      request.session = {
        userContext: 'LoggedIn',
        userRole: 'dummy'
      }
      request.user = {
        userId: '12345678-cb0b-48ad-857d-4b42a44ede13'
      }
      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(userMock[1])
      findOneSpyContracts.mockReturnValue(contractMock[1])
      tenantControllerFindOneSpy.mockReturnValue(tenantsMock[1])
      contractControllerFindContractSpy.mockReturnValue(contractMock[1])
      getAccountCodeListSpy.mockReturnValue([])

      // 試験実施
      await accountCodeList.cbGetIndex(request, response, next)

      // 期待結果
      // 400,500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(400))
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(500))
      // response.renderでuploadFormatListが呼ばれ「る」
      expect(response.render).toHaveBeenCalledWith('accountCodeList', {
        title: '勘定科目一覧',
        engTitle: 'ACCOUNT CODE LIST',
        btnNameForRegister: '新規登録する',
        listArr: [],
        messageForNotItem: '現在、勘定科目はありません。新規登録するボタンから登録を行ってください。',
        // リスト表示カラム
        listNo: 'No',
        accountCode: '勘定科目コード',
        accountCodeName: '勘定科目名',
        accountCodeUpdatedAt: '最新更新日',
        setClassChangeBtn: 'checkChangeAccountCodeBtn',
        setClassDeleteBtn: 'deleteAccountCodeBtn',
        prevLocation: '/uploadAccount',
        prevLocationName: '←勘定科目一括作成',
        deleteModalTitle: '勘定科目削除'
      })
    })

    test('正常：登録受取中の場合', async () => {
      // 準備
      // session.userContextに正常値(LoggedIn)を想定する
      request.session = {
        userContext: 'LoggedIn',
        userRole: 'dummy'
      }
      request.user = {
        userId: '12345678-cb0b-48ad-857d-4b42a44ede13'
      }
      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(userMock[2])
      findOneSpyContracts.mockReturnValue(contractMock[2])
      tenantControllerFindOneSpy.mockReturnValue(tenantsMock[2])
      contractControllerFindContractSpy.mockReturnValue(contractMock[2])
      getAccountCodeListSpy.mockReturnValue([])

      // 試験実施
      await accountCodeList.cbGetIndex(request, response, next)

      // 期待結果
      // 400,500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(400))
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(500))
      // response.renderでuploadFormatListが呼ばれ「る」
      expect(response.render).toHaveBeenCalledWith('accountCodeList', {
        title: '勘定科目一覧',
        engTitle: 'ACCOUNT CODE LIST',
        btnNameForRegister: '新規登録する',
        listArr: [],
        messageForNotItem: '現在、勘定科目はありません。新規登録するボタンから登録を行ってください。',
        // リスト表示カラム
        listNo: 'No',
        accountCode: '勘定科目コード',
        accountCodeName: '勘定科目名',
        accountCodeUpdatedAt: '最新更新日',
        setClassChangeBtn: 'checkChangeAccountCodeBtn',
        setClassDeleteBtn: 'deleteAccountCodeBtn',
        prevLocation: '/uploadAccount',
        prevLocationName: '←勘定科目一括作成',
        deleteModalTitle: '勘定科目削除'
      })
    })

    test('正常：変更申込中の場合', async () => {
      // 準備
      // session.userContextに正常値(LoggedIn)を想定する
      request.session = {
        userContext: 'LoggedIn',
        userRole: 'dummy'
      }
      request.user = {
        userId: '12345678-cb0b-48ad-857d-4b42a44ede13'
      }
      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(userMock[3])
      findOneSpyContracts.mockReturnValue(contractMock[3])
      tenantControllerFindOneSpy.mockReturnValue(tenantsMock[3])
      contractControllerFindContractSpy.mockReturnValue(contractMock[3])
      getAccountCodeListSpy.mockReturnValue([])

      // 試験実施
      await accountCodeList.cbGetIndex(request, response, next)

      // 期待結果
      // 400,500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(400))
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(500))
      // response.renderでuploadFormatListが呼ばれ「る」
      expect(response.render).toHaveBeenCalledWith('accountCodeList', {
        title: '勘定科目一覧',
        engTitle: 'ACCOUNT CODE LIST',
        btnNameForRegister: '新規登録する',
        listArr: [],
        messageForNotItem: '現在、勘定科目はありません。新規登録するボタンから登録を行ってください。',
        // リスト表示カラム
        listNo: 'No',
        accountCode: '勘定科目コード',
        accountCodeName: '勘定科目名',
        accountCodeUpdatedAt: '最新更新日',
        setClassChangeBtn: 'checkChangeAccountCodeBtn',
        setClassDeleteBtn: 'deleteAccountCodeBtn',
        prevLocation: '/uploadAccount',
        prevLocationName: '←勘定科目一括作成',
        deleteModalTitle: '勘定科目削除'
      })
    })

    test('正常：変更受取中の場合', async () => {
      // 準備
      // session.userContextに正常値(LoggedIn)を想定する
      request.session = {
        userContext: 'LoggedIn',
        userRole: 'dummy'
      }
      request.user = {
        userId: '12345678-cb0b-48ad-857d-4b42a44ede13'
      }
      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(userMock[4])
      findOneSpyContracts.mockReturnValue(contractMock[4])
      tenantControllerFindOneSpy.mockReturnValue(tenantsMock[4])
      contractControllerFindContractSpy.mockReturnValue(contractMock[4])
      getAccountCodeListSpy.mockReturnValue([])

      // 試験実施
      await accountCodeList.cbGetIndex(request, response, next)

      // 期待結果
      // 400,500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(400))
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(500))
      // response.renderでuploadFormatListが呼ばれ「る」
      expect(response.render).toHaveBeenCalledWith('accountCodeList', {
        title: '勘定科目一覧',
        engTitle: 'ACCOUNT CODE LIST',
        btnNameForRegister: '新規登録する',
        listArr: [],
        messageForNotItem: '現在、勘定科目はありません。新規登録するボタンから登録を行ってください。',
        // リスト表示カラム
        listNo: 'No',
        accountCode: '勘定科目コード',
        accountCodeName: '勘定科目名',
        accountCodeUpdatedAt: '最新更新日',
        setClassChangeBtn: 'checkChangeAccountCodeBtn',
        setClassDeleteBtn: 'deleteAccountCodeBtn',
        prevLocation: '/uploadAccount',
        prevLocationName: '←勘定科目一括作成',
        deleteModalTitle: '勘定科目削除'
      })
    })

    test('正常：一般ユーザーの場合', async () => {
      // 準備
      // session.userContextに正常値(LoggedIn)を想定する
      request.session = {
        userContext: 'LoggedIn',
        userRole: 'dummy'
      }
      request.user = {
        userId: '12345678-cb0b-48ad-857d-4b42a44ede13'
      }
      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(userMock[5])
      findOneSpyContracts.mockReturnValue(contractMock[0])
      tenantControllerFindOneSpy.mockReturnValue(tenantsMock[0])
      contractControllerFindContractSpy.mockReturnValue(contractMock[0])
      getAccountCodeListSpy.mockReturnValue([])

      // 試験実施
      await accountCodeList.cbGetIndex(request, response, next)

      // 期待結果
      // 400,500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(400))
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(500))
      // response.renderでuploadFormatListが呼ばれ「る」
      expect(response.render).toHaveBeenCalledWith('accountCodeList', {
        title: '勘定科目一覧',
        engTitle: 'ACCOUNT CODE LIST',
        btnNameForRegister: '新規登録する',
        listArr: [],
        messageForNotItem: '現在、勘定科目はありません。新規登録するボタンから登録を行ってください。',
        // リスト表示カラム
        listNo: 'No',
        accountCode: '勘定科目コード',
        accountCodeName: '勘定科目名',
        accountCodeUpdatedAt: '最新更新日',
        setClassChangeBtn: 'checkChangeAccountCodeBtn',
        setClassDeleteBtn: 'deleteAccountCodeBtn',
        prevLocation: '/uploadAccount',
        prevLocationName: '←勘定科目一括作成',
        deleteModalTitle: '勘定科目削除'
      })
    })

    test('準正常：解約申込中の場合', async () => {
      // 準備
      // session.userContextに正常値(LoggedIn)を想定する
      request.session = {
        userContext: 'LoggedIn',
        userRole: 'dummy'
      }
      request.user = {
        userId: '12345678-cb0b-48ad-857d-4b42a44ede13'
      }
      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(userMock[6])
      findOneSpyContracts.mockReturnValue(contractMock[5])
      tenantControllerFindOneSpy.mockReturnValue(tenantsMock[5])
      contractControllerFindContractSpy.mockReturnValue(contractMock[5])
      getAccountCodeListSpy.mockReturnValue([])

      // 試験実施
      await accountCodeList.cbGetIndex(request, response, next)

      // 期待結果
      // 400,500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(400))
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(500))
      // 解約手続き中画面が表示「される」
      expect(next).toHaveBeenCalledWith(noticeHelper.create('cancelprocedure'))
    })

    test('準正常：解約受取中の場合', async () => {
      // 準備
      // session.userContextに正常値(LoggedIn)を想定する
      request.session = {
        userContext: 'LoggedIn',
        userRole: 'dummy'
      }
      request.user = {
        userId: '12345678-cb0b-48ad-857d-4b42a44ede13'
      }
      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(userMock[7])
      findOneSpyContracts.mockReturnValue(contractMock[6])
      tenantControllerFindOneSpy.mockReturnValue(tenantsMock[6])
      contractControllerFindContractSpy.mockReturnValue(contractMock[6])
      getAccountCodeListSpy.mockReturnValue([])

      // 試験実施
      await accountCodeList.cbGetIndex(request, response, next)

      // 期待結果
      // 400,500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(400))
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(500))
      // 解約手続き中画面が表示「される」
      expect(next).toHaveBeenCalledWith(noticeHelper.create('cancelprocedure'))
    })

    test('準正常：解約完了の場合', async () => {
      // 準備
      // session.userContextに正常値(LoggedIn)を想定する
      request.session = {
        userContext: 'LoggedIn',
        userRole: 'dummy'
      }
      request.user = {
        userId: userMock[9].userId
      }
      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(userMock[9])
      findOneSpyContracts.mockReturnValue(contractMock[7])
      tenantControllerFindOneSpy.mockReturnValue(tenantsMock[8])
      contractControllerFindContractSpy.mockReturnValue(contractMock[7])
      getAccountCodeListSpy.mockReturnValue([])

      // 試験実施
      await accountCodeList.cbGetIndex(request, response, next)

      // 期待結果
      // 400エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(400))
      // 途中解約済みになる場合500エラー
      expect(next).toHaveBeenCalledWith(errorHelper.create(500))
    })

    test('404エラー：DBから取得したユーザのuserStatusが0以外の場合', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = {
        userContext: 'LoggedIn',
        userRole: 'dummy'
      }
      request.user = {
        userId: '12345678-cb0b-48ad-857d-4b42a44ede13'
      }
      // DBから取得したユーザデータのuserStatusが0以外の場合を想定する
      userControllerFindOneSpy.mockReturnValue(userMock[8])

      // 試験実施
      await accountCodeList.cbGetIndex(request, response, next)

      // 期待結果
      // 404エラーがエラーハンドリング「される」
      expect(next).toHaveBeenCalledWith(error404)
      // 500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(500))
      // response.renderが呼ばれ「ない」
      expect(response.render).not.toHaveBeenCalled()
    })

    test('500エラー：不正なContractデータの場合', async () => {
      // 準備
      // requestのtenantIdに正常値を入れる
      request.session = {
        userContext: 'LoggedIn',
        userRole: 'dummy'
      }
      request.user = {
        userId: '12345678-cb0b-48ad-857d-4b42a44ede13'
      }

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(userMock[0])
      findOneSpyContracts.mockReturnValue(contractMock[7])

      // 試験実施
      await accountCodeList.cbGetIndex(request, response, next)

      // 期待結果
      // 400エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(400))
      // 500エラーがエラーハンドリング「される」
      expect(next).toHaveBeenCalledWith(errorHelper.create(500))
    })

    test('500エラー：requestのsession,userIdがnullの場合', async () => {
      // 準備
      // requestのsession,userIdにnullを入れる
      request.session = null
      request.user = {
        userId: null
      }

      // 試験実施
      await accountCodeList.cbGetIndex(request, response, next)

      // 期待結果
      // 500エラーがエラーハンドリング「される」
      expect(next).toHaveBeenCalledWith(errorHelper.create(500))

      // response.renderが呼ばれ「ない」
      expect(response.render).not.toHaveBeenCalled()
    })

    test('500エラー：DBからユーザが取得できなかった(null)場合', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = {
        userContext: 'LoggedIn',
        userRole: 'dummy'
      }
      request.user = {
        userId: '12345678-cb0b-48ad-857d-4b42a44ede13'
      }
      // DBからのユーザデータの取得ができなかった(null)場合を想定する
      userControllerFindOneSpy.mockReturnValue(null)

      // 試験実施
      await accountCodeList.cbGetIndex(request, response, next)

      // 期待結果
      // 500エラーがエラーハンドリング「される」
      expect(next).toHaveBeenCalledWith(errorHelper.create(500))
      // response.renderが呼ばれ「ない」
      expect(response.render).not.toHaveBeenCalled()
    })

    test('500エラー：DBから契約情報が取得できなかった(null)場合', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = {
        userContext: 'LoggedIn',
        userRole: 'dummy'
      }
      request.user = {
        userId: '12345678-cb0b-48ad-857d-4b42a44ede13'
      }
      // DBからの契約情報が取得ができなかった(null)場合を想定する
      userControllerFindOneSpy.mockReturnValue(userMock[0])
      findOneSpyContracts.mockReturnValue(null)

      // 試験実施
      await accountCodeList.cbGetIndex(request, response, next)

      // 期待結果
      // 500エラーがエラーハンドリング「される」
      expect(next).toHaveBeenCalledWith(errorHelper.create(500))
      // response.renderが呼ばれ「ない」
      expect(response.render).not.toHaveBeenCalled()
    })

    test('500エラー：ユーザDBエラーの場合', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = {
        userContext: 'LoggedIn',
        userRole: 'dummy'
      }
      request.user = {
        userId: '12345678-cb0b-48ad-857d-4b42a44ede13'
      }
      // DBからのユーザデータの取得でエラーが発生した場合を想定する
      const connectionError = new Error('DB connection Error')
      userControllerFindOneSpy.mockReturnValue(connectionError)

      // 試験実施
      await accountCodeList.cbGetIndex(request, response, next)

      // 期待結果
      // 500エラーがエラーハンドリング「される」
      expect(next).toHaveBeenCalledWith(errorHelper.create(500))
      // response.renderが呼ばれ「ない」
      expect(response.render).not.toHaveBeenCalled()
    })

    test('500エラー：契約DBエラーの場合', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = {
        userContext: 'LoggedIn',
        userRole: 'dummy'
      }
      request.user = {
        userId: '12345678-cb0b-48ad-857d-4b42a44ede13'
      }
      // DBからのユーザデータの取得でエラーが発生した場合を想定する
      const sqlError = new Error('DB SQL Error')
      userControllerFindOneSpy.mockReturnValue(userMock[0])
      findOneSpyContracts.mockReturnValue(sqlError)

      // 試験実施
      await accountCodeList.cbGetIndex(request, response, next)

      // 期待結果
      // 500エラーがエラーハンドリング「される」
      expect(next).toHaveBeenCalledWith(errorHelper.create(500))
      // response.renderが呼ばれ「ない」
      expect(response.render).not.toHaveBeenCalled()
    })
    test('500エラー：勘定科目DBエラーの場合', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = {
        userContext: 'LoggedIn',
        userRole: 'dummy'
      }
      request.user = {
        userId: '12345678-cb0b-48ad-857d-4b42a44ede13'
      }

      userControllerFindOneSpy.mockReturnValue(userMock[0])
      findOneSpyContracts.mockReturnValue(contractMock[0])
      tenantControllerFindOneSpy.mockReturnValue(tenantsMock[0])
      contractControllerFindContractSpy.mockReturnValue(contractMock[0])
      const dbError = new Error('accountCode Table Error')
      getAccountCodeListSpy.mockReturnValue(dbError)

      // 試験実施
      await accountCodeList.cbGetIndex(request, response, next)

      // 期待結果
      // 500エラーがエラーハンドリング「される」
      expect(next).toHaveBeenCalledWith(errorHelper.create(500))
      // response.renderが呼ばれ「ない」
      expect(response.render).not.toHaveBeenCalled()
    })
  })
})
