'use strict'

const logger = require('../../Application/lib/logger')
const apiManager = require('../../Application/controllers/apiManager')
const approverController = require('../../Application/controllers/approverController')
const db = require('../../Application/models')
const ApproveRoute = db.ApproveRoute
const ApproveUser = db.ApproveUser
const ApproveObj = require('../../Application/lib/approver/Approver')

let errorSpy, infoSpy, accessTradeshift
let approveRouteFindAll, approverouteCreate, approveGetApproveRoute, approveRouteUpdate
let approveUserCreate, approveUserFindOne

const findUsers = {
  itemsPerPage: 25,
  itemCount: 1,
  numPages: 1,
  pageId: 0,
  UserAccounts: [
    {
      Id: '53607702-b94b-4a94-9459-6cf3acd65603',
      CompanyAccountId: '221559d0-53aa-44a2-ab29-0c4a6cb02bde',
      CompanyName: '本社',
      Username: 'uttest@uttest.com',
      Language: 'ja',
      TimeZone: 'Asia/Tokyo',
      Created: '2021-05-17T08:12:48.291Z',
      State: 'ACTIVE',
      Type: 'PERSON',
      FirstName: 'テスト',
      LastName: '管理者',
      Visible: true,
      Memberships: [
        {
          UserId: '53607702-b94b-4a94-9459-6cf3acd65603',
          GroupId: '221559d0-53aa-44a2-ab29-0c4a6cb02bde',
          Role: 'dummy'
        }
      ]
    },
    {
      Id: '3b6a13d6-cb89-414b-9597-175ba89329aa',
      CompanyAccountId: '221559d0-53aa-44a2-ab29-0c4a6cb02bde',
      CompanyName: '本社',
      Username: 'uttest2@uttest.com',
      Language: 'ja',
      TimeZone: 'Asia/Tokyo',
      Created: '2021-05-24T03:24:26.537Z',
      State: 'ACTIVE',
      Type: 'PERSON',
      FirstName: 'テスト',
      LastName: '管理者2',
      Title: '',
      Visible: true,
      Memberships: [
        {
          UserId: '3b6a13d6-cb89-414b-9597-175ba89329aa',
          GroupId: '221559d0-53aa-44a2-ab29-0c4a6cb02bde',
          Role: 'dummy'
        }
      ]
    },
    {
      Id: '7fa489ad-4c50-43d6-8057-1279877c8ef5',
      CompanyAccountId: '221559d0-53aa-44a2-ab29-0c4a6cb02bde',
      CompanyName: '本社',
      Username: 'uttest3@uttest.com',
      Language: 'ja',
      TimeZone: 'Asia/Tokyo',
      Created: '2021-06-11T08:49:30.939Z',
      State: 'ACTIVE',
      Type: 'PERSON',
      FirstName: 'テスト',
      LastName: '一般',
      Visible: true,
      Memberships: [
        {
          UserId: '7fa489ad-4c50-43d6-8057-1279877c8ef5',
          GroupId: '221559d0-53aa-44a2-ab29-0c4a6cb02bde',
          Role: 'dummy'
        }
      ]
    },
    {
      Id: 'aa974511-8188-4022-bd86-45e251fd259e',
      CompanyAccountId: '221559d0-53aa-44a2-ab29-0c4a6cb02bde',
      CompanyName: '本社',
      Username: 'uttest4@uttest.com',
      Language: 'ja',
      TimeZone: 'Asia/Tokyo',
      Created: '2021-08-03T02:06:10.626Z',
      State: 'ACTIVE',
      Type: 'PERSON',
      FirstName: 'テスト',
      LastName: '一般2',
      Visible: true,
      Memberships: [
        {
          UserId: 'aa974511-8188-4022-bd86-45e251fd259e',
          GroupId: '221559d0-53aa-44a2-ab29-0c4a6cb02bde',
          Role: 'dummy'
        }
      ]
    }
  ],
  PrimaryUser: ''
}

describe('approverControllerのテスト', () => {
  beforeEach(() => {
    errorSpy = jest.spyOn(logger, 'error')
    infoSpy = jest.spyOn(logger, 'info')
    accessTradeshift = jest.spyOn(apiManager, 'accessTradeshift')
    approveRouteFindAll = jest.spyOn(ApproveRoute, 'findAll')
    approverouteCreate = jest.spyOn(ApproveRoute, 'create')
    approveRouteUpdate = jest.spyOn(ApproveRoute, 'update')
    approveUserCreate = jest.spyOn(ApproveUser, 'create')
    approveGetApproveRoute = jest.spyOn(ApproveRoute, 'getApproveRoute')
    approveUserFindOne = jest.spyOn(ApproveUser, 'findOne')
    ApproveUser.save = jest.fn()
  })

  afterEach(() => {
    errorSpy.mockRestore()
    infoSpy.mockRestore()
    accessTradeshift.mockRestore()
    approveRouteFindAll.mockRestore()
    approverouteCreate.mockRestore()
    approveUserCreate.mockRestore()
    approveGetApproveRoute.mockRestore()
    approveUserFindOne.mockRestore()
    approveRouteUpdate.mockRestore()
  })

  describe('getApprover', () => {
    test('正常：氏名とメールアドレスのAND検索', async () => {
      // 準備
      // アクセストークンの用意
      const accessToken = 'dummy-access-token'
      const refreshToken = 'dummy-refresh-token'
      const tenantId = 'dummy-tennant'
      const keyword = {
        firstName: 'テスト',
        lastName: '一般2',
        email: 'uttest4@uttest.com'
      }

      // トレードシフトから取得データ
      const findUsers1 = { ...findUsers }
      // トレードシフトのユーザー情報取得
      accessTradeshift.mockReturnValueOnce(findUsers1)

      // 検索予想結果
      const expectResult = [
        {
          id: 'aa974511-8188-4022-bd86-45e251fd259e',
          name: 'テスト 一般2',
          email: 'uttest4@uttest.com'
        }
      ]

      // 試験実施
      const result = await approverController.getApprover(accessToken, refreshToken, tenantId, keyword)

      // 期待結果
      // 想定したデータがReturnされていること
      expect(JSON.stringify(result)).toEqual(JSON.stringify(expectResult))
    })

    test('正常:姓名の検索', async () => {
      // 準備
      // アクセストークンの用意
      const accessToken = 'dummy-access-token'
      const refreshToken = 'dummy-refresh-token'
      const tenantId = 'dummy-tennant'
      const keyword = {
        firstName: '',
        lastName: '管理者2',
        email: ''
      }

      // トレードシフトから取得データ
      const findUsers1 = { ...findUsers }
      // トレードシフトのユーザー情報取得
      accessTradeshift.mockReturnValueOnce(findUsers1)

      // 検索予想結果
      const expectResult = [
        {
          id: '3b6a13d6-cb89-414b-9597-175ba89329aa',
          name: 'テスト 管理者2',
          email: 'uttest2@uttest.com'
        }
      ]

      // 試験実施
      const result = await approverController.getApprover(accessToken, refreshToken, tenantId, keyword)

      // 期待結果
      // 想定したデータがReturnされていること
      expect(JSON.stringify(result)).toEqual(JSON.stringify(expectResult))
    })

    test('正常:メールアドレスの検索', async () => {
      // 準備
      // アクセストークンの用意
      const accessToken = 'dummy-access-token'
      const refreshToken = 'dummy-refresh-token'
      const tenantId = 'dummy-tennant'
      const keyword = {
        firstName: '',
        lastName: '',
        email: 'uttest@uttest.com'
      }

      // トレードシフトから取得データ
      const findUsers1 = { ...findUsers }
      // トレードシフトのユーザー情報取得
      accessTradeshift.mockReturnValueOnce(findUsers1)

      // 検索予想結果
      const expectResult = [
        {
          id: '53607702-b94b-4a94-9459-6cf3acd65603',
          name: 'テスト 管理者',
          email: 'uttest@uttest.com'
        }
      ]

      // 試験実施
      const result = await approverController.getApprover(accessToken, refreshToken, tenantId, keyword)

      // 期待結果
      // 想定したデータがReturnされていること
      expect(JSON.stringify(result)).toEqual(JSON.stringify(expectResult))
    })

    test('正常:全体取得', async () => {
      // 準備
      // アクセストークンの用意
      const accessToken = 'dummy-access-token'
      const refreshToken = 'dummy-refresh-token'
      const tenantId = 'dummy-tennant'
      const keyword = {
        firstName: '',
        lastName: '',
        email: ''
      }

      // トレードシフトから取得データ
      const findUsers1 = { ...findUsers }
      // トレードシフトのユーザー情報取得
      accessTradeshift.mockReturnValueOnce(findUsers1)

      // 検索予想結果
      const expectResult = [
        {
          id: '53607702-b94b-4a94-9459-6cf3acd65603',
          name: 'テスト 管理者',
          email: 'uttest@uttest.com'
        },
        {
          id: '3b6a13d6-cb89-414b-9597-175ba89329aa',
          name: 'テスト 管理者2',
          email: 'uttest2@uttest.com'
        },
        {
          id: '7fa489ad-4c50-43d6-8057-1279877c8ef5',
          name: 'テスト 一般',
          email: 'uttest3@uttest.com'
        },
        {
          id: 'aa974511-8188-4022-bd86-45e251fd259e',
          name: 'テスト 一般2',
          email: 'uttest4@uttest.com'
        }
      ]

      // 試験実施
      const result = await approverController.getApprover(accessToken, refreshToken, tenantId, keyword)

      // 期待結果
      // 想定したデータがReturnされていること
      expect(JSON.stringify(result)).toEqual(JSON.stringify(expectResult))
    })

    test('準正常:アクセストークンエラー', async () => {
      // 準備
      // アクセストークンの用意
      const accessToken = 'dummy-access-token'
      const refreshToken = 'dummy-refresh-token'
      const tenantId = 'dummy-tennant'
      const keyword = {
        firstName: '',
        lastName: '',
        email: ''
      }

      const error401 = new Error(
        'Request failed with status code 401 at createError(../Application/node_modules/axios/lib/core/createError.js:16:15)'
      )
      error401.config = {
        url: 'https://api-sandbox.tradeshift.com/tradeshift/rest/external/account/dummy-tennant/users?limit=1&page=0&numPages=1'
      }
      error401.response = {
        status: 401
      }
      // トレードシフトのユーザー情報取得
      accessTradeshift.mockImplementation(() => {
        return error401
      })

      // 試験実施
      const result = await approverController.getApprover(accessToken, refreshToken, tenantId, keyword)

      // 期待結果
      // 想定したデータがReturnされていること
      expect(result).toEqual(-1)
    })

    test('準正常:システムエラー', async () => {
      // 準備
      // アクセストークンの用意
      const accessToken = 'dummy-access-token'
      const refreshToken = 'dummy-refresh-token'
      const tenantId = 'dummy-tennant'
      const keyword = {
        firstName: '',
        lastName: '',
        email: ''
      }

      const error5XX = new Error('システムエラー')
      error5XX.response = {
        status: 500
      }
      // トレードシフトのユーザー情報取得
      accessTradeshift.mockImplementation(() => {
        return error5XX
      })

      // 試験実施
      const result = await approverController.getApprover(accessToken, refreshToken, tenantId, keyword)

      // 期待結果
      // 想定したデータがReturnされていること
      expect(result).toEqual(-2)
    })
  })

  describe('insertApprover', () => {
    test('正常:DBには最初の登録', async () => {
      // contract
      const contract = 'dummy-contract'
      // DB登録するデータ
      const values = {
        setApproveRouteNameInputId: 'dummy-approve-route-name',
        accountCode: 'dummy-account-code',
        uuid: 'dummy-uuid'
      }

      const expectApproveRoute = ApproveRoute.build({
        contract,
        approveRouteName: values.setApproveRouteNameInputId
      })

      const expectApproveUser = ApproveUser.build({
        approveRouteId: expectApproveRoute.approveRouteId,
        approveUser: values.uuid,
        prevApproveUser: null,
        nextApproveUser: null,
        isLastApproveUser: false
      })

      // 最初DBにはデータがない
      approveRouteFindAll.mockReturnValueOnce([])

      // createで保存されたらApproveRouteオブジェクトを返す
      approverouteCreate.mockReturnValueOnce(expectApproveRoute)

      // ユーザ生成
      approveUserCreate.mockReturnValueOnce(expectApproveUser)

      // 試験実施
      const insertResult = await approverController.insertApprover(contract, values)

      // 期待結果
      // 結果値が０になる
      expect(insertResult).toBe(0)
    })

    test('正常:DBには最初の登録(複数ユーザ)', async () => {
      // contract
      const contract = 'dummy-contract'
      // DB登録するデータ
      const values = {
        setApproveRouteNameInputId: 'dummy-approve-route-name',
        accountCode: 'dummy-account-code',
        uuid: ['dummy-uuid1', 'dymmy-uuid2']
      }

      const expectApproveRoute = ApproveRoute.build({
        contract,
        approveRouteName: values.setApproveRouteNameInputId
      })

      const expectApproveUser1 = ApproveUser.build({
        approveRouteId: expectApproveRoute.approveRouteId,
        approveUser: values.uuid,
        prevApproveUser: null,
        nextApproveUser: 'dummy-uuid1',
        isLastApproveUser: false
      })
      expectApproveUser1.save = jest.fn()

      const expectApproveUser2 = ApproveUser.build({
        approveRouteId: expectApproveRoute.approveRouteId,
        approveUser: values.uuid,
        prevApproveUser: 'dymmy-uuid2',
        nextApproveUser: null,
        isLastApproveUser: true
      })
      expectApproveUser2.save = jest.fn()

      // 最初DBにはデータがない
      approveRouteFindAll.mockReturnValueOnce([])

      // createで保存されたらApproveRouteオブジェクトを返す
      approverouteCreate.mockReturnValueOnce(expectApproveRoute)

      // ユーザ生成
      approveUserCreate.mockReturnValueOnce(expectApproveUser2)
      approveUserCreate.mockReturnValueOnce(expectApproveUser1)

      // 試験実施
      const insertResult = await approverController.insertApprover(contract, values)

      // 期待結果
      // 結果値が０になる
      expect(insertResult).toBe(0)
    })

    test('正常:重複の場合', async () => {
      // contract
      const contract = 'dummy-contract'
      // DB登録するデータ
      const values = {
        setApproveRouteNameInputId: 'dummy-approve-route-name',
        accountCode: 'dummy-account-code',
        uuid: ['dummy-uuid1', 'dymmy-uuid2']
      }

      const expectApproveRoute = ApproveRoute.build({
        contract,
        approveRouteName: values.setApproveRouteNameInputId
      })

      // 最初DBにはデータがない
      approveRouteFindAll.mockReturnValueOnce([expectApproveRoute])

      // 試験実施
      const insertResult = await approverController.insertApprover(contract, values)

      // 期待結果
      // 結果値が1になる
      expect(insertResult).toBe(1)
    })

    test('準正常:承認ルート登録失敗', async () => {
      // contract
      const contract = 'dummy-contract'
      // DB登録するデータ
      const values = {
        setApproveRouteNameInputId: 'dummy-approve-route-name',
        accountCode: 'dummy-account-code',
        uuid: 'dummy-uuid'
      }

      // 最初DBにはデータがない
      approveRouteFindAll.mockReturnValueOnce([])

      // createで保存されたらApproveRouteオブジェクトを返す
      approverouteCreate.mockReturnValueOnce(null)

      // 試験実施
      const insertResult = await approverController.insertApprover(contract, values)

      // 期待結果
      // 結果値が０になる
      expect(insertResult).toBe(-1)
    })

    test('正常:ユーザ登録失敗', async () => {
      // contract
      const contract = 'dummy-contract'
      // DB登録するデータ
      const values = {
        setApproveRouteNameInputId: 'dummy-approve-route-name',
        accountCode: 'dummy-account-code',
        uuid: 'dummy-uuid'
      }

      const expectApproveRoute = ApproveRoute.build({
        contract,
        accountCode: 'dummy-account-code',
        approveRouteName: values.setApproveRouteNameInputId
      })

      // 最初DBにはデータがない
      approveRouteFindAll.mockReturnValueOnce([])

      // createで保存されたらApproveRouteオブジェクトを返す
      approverouteCreate.mockReturnValueOnce(expectApproveRoute)

      // ユーザ生成
      approveUserCreate.mockReturnValueOnce(null)

      // 試験実施
      const insertResult = await approverController.insertApprover(contract, values)

      // 期待結果
      // 結果値が０になる
      expect(insertResult).toBe(-1)
    })

    test('正常:システムエラー発生', async () => {
      // contract
      const contract = 'dummy-contract'
      // DB登録するデータ
      const values = {
        setApproveRouteNameInputId: 'dummy-approve-route-name',
        accountCode: 'dummy-account-code',
        uuid: 'dummy-uuid'
      }

      const expectApproveRoute = ApproveRoute.build({
        contract,
        accountCode: 'dummy-account-code',
        approveRouteName: values.setApproveRouteNameInputId
      })

      const dbError = new Error('SequelizeConnectionError')
      dbError.stack = 'SequelizeConnectionError'
      // 最初DBにはデータがない
      approveRouteFindAll.mockImplementation(() => {
        throw dbError
      })

      // createで保存されたらApproveRouteオブジェクトを返す
      approverouteCreate.mockReturnValueOnce(expectApproveRoute)

      // ユーザ生成
      approveUserCreate.mockReturnValueOnce(null)

      // 試験実施
      const insertResult = await approverController.insertApprover(contract, values)

      // 期待結果
      // 結果値が０になる
      expect(insertResult).toBe(dbError)
    })
  })

  describe('getApproveRouteList', () => {
    test('正常：承認ルートがない場合', async () => {
      const contractId = 'dummy-contractid'
      // DBのデータがない場合
      approveRouteFindAll.mockReturnValueOnce([])

      const result = await approverController.getApproveRouteList(contractId)

      expect(result).toHaveLength(0)
    })

    test('正常：承認ルートがある場合', async () => {
      const contractId = 'dummy-contractid'

      // 承認ルートDB検索
      const approveRouteArr = []
      const approveRoute1 = ApproveRoute.build({
        contractId: 'dummy-contractid',
        approveRouteName: '承認ルート1',
        createdAt: new Date('2022-02-17T05:12:15.623Z'),
        updatedAt: new Date('2022-02-17T05:12:15.623Z'),
        deleteFlag: false
      })
      const approveRoute1approver1 = ApproveUser.build({
        approveRouteId: approveRoute1.approveRouteId,
        approveUser: '7fa489ad-4c50-43d6-8057-1279877c8ef5',
        prevApproveUser: null,
        nextApproveUser: null
      })
      approveRoute1.ApproveUsers = [approveRoute1approver1]
      const approveRoute2 = ApproveRoute.build({
        contractId: 'dummy-contractid',
        approveRouteName: '承認ルート2',
        createdAt: new Date('2022-02-17T05:12:15.623Z'),
        updatedAt: new Date('2022-02-17T05:12:15.623Z'),
        deleteFlag: true
      })
      const approveRoute3 = ApproveRoute.build({
        contractId: 'dummy-contractid',
        approveRouteName: '承認ルート0',
        createdAt: new Date('2022-02-17T05:12:15.623Z'),
        updatedAt: new Date('2022-02-17T05:12:15.623Z'),
        deleteFlag: true
      })
      const approveRoute3approver1 = ApproveUser.build({
        approveRouteId: approveRoute3.approveRouteId,
        approveUser: '7fa489ad-4c50-43d6-aaaa-1279877c8ef5',
        prevApproveUser: null,
        nextApproveUser: null
      })
      approveRoute3.ApproveUsers = [approveRoute3approver1]
      const approveRoute1approver2approver1 = ApproveUser.build({
        approveRouteId: approveRoute2.approveRouteId,
        approveUser: '7fa489ad-4c50-43d6-8057-1279877c8ef5',
        prevApproveUser: null,
        nextApproveUser: '3b6a13d6-cb89-414b-9597-175ba89329aa'
      })
      const approveRoute1approver2approver2 = ApproveUser.build({
        approveRouteId: approveRoute2.approveRouteId,
        approveUser: '3b6a13d6-cb89-414b-9597-175ba89329aa',
        prevApproveUser: approveRoute1approver2approver1.approveUser,
        nextApproveUser: null
      })
      approveRoute2.ApproveUsers = [approveRoute1approver2approver1, approveRoute1approver2approver2]
      approveRouteArr.push(approveRoute1, approveRoute2, approveRoute3)
      // DBのデータがある場合
      approveRouteFindAll.mockReturnValueOnce(approveRouteArr)

      const result = await approverController.getApproveRouteList(contractId)

      expect(result).toHaveLength(3)
    })

    test('正常：検索時、DBエラー発生', async () => {
      const contractId = 'dummy-contractid'

      const dbError = new Error(
        'SequelizeConnectionError: Failed to connect to localhost:1433 - Could not connect (sequence)'
      )
      dbError.stack = 'SequelizeConnectionError: Failed to connect to localhost:1433 - Could not connect (sequence)'
      // 承認ルートDBエラー発生
      approveRouteFindAll.mockImplementation(() => {
        throw dbError
      })

      const result = await approverController.getApproveRouteList(contractId)

      expect(result).toBe(dbError)
    })
  })

  describe('getApproveRoute', () => {
    test('正常：登録した承認ルートを検索', async () => {
      // ダミーデータの用意
      const accessToken = 'dummy-acesstoken'
      const refreshToken = 'dummy-refreshToken'
      const contractId = 'dummy-contractId'
      const approveRouteId = 'dummy-approve-routeId'

      // ApproveRoute.getApproveRoute承認ルートを検索
      approveGetApproveRoute.mockReturnValueOnce([
        {
          approveRouteId: '6693f071-9150-4005-bb06-3f8d30724f9b',
          contractId: contractId,
          approveRouteName: 'UTテスト承認ルート',
          createdAt: new Date('2022-02-18'),
          updatedAt: new Date('2022-02-18'),
          deleteFlag: false,
          'ApproveUsers.approveUserId': '1e5e24aa-77c3-4571-a93c-5caa0e336ddb',
          'ApproveUsers.approveRouteId': '6693f071-9150-4005-bb06-3f8d30724f9b',
          'ApproveUsers.approveUser': 'aa974511-8188-4022-bd86-45e251fd259e',
          'ApproveUsers.prevApproveUser': '25e611d1-b91d-4937-bf9c-fcd242762526',
          'ApproveUsers.nextApproveUser': null,
          'ApproveUsers.isLastApproveUser': true,
          'ApproveUsers.createdAt': new Date('2022-02-18'),
          'ApproveUsers.updatedAt': new Date('2022-02-18')
        },
        {
          approveRouteId: '6693f071-9150-4005-bb06-3f8d30724f9b',
          contractId: contractId,
          approveRouteName: 'UTテスト承認ルート',
          createdAt: new Date('2022-02-18'),
          updatedAt: new Date('2022-02-18'),
          deleteFlag: false,
          'ApproveUsers.approveUserId': '25e611d1-b91d-4937-bf9c-fcd242762526',
          'ApproveUsers.approveRouteId': '6693f071-9150-4005-bb06-3f8d30724f9b',
          'ApproveUsers.approveUser': '7fa489ad-4c50-43d6-8057-1279877c8ef5',
          'ApproveUsers.prevApproveUser': 'd4a11d99-1bb2-48b3-9c98-abefdb40dba2',
          'ApproveUsers.nextApproveUser': '1e5e24aa-77c3-4571-a93c-5caa0e336ddb',
          'ApproveUsers.isLastApproveUser': false,
          'ApproveUsers.createdAt': new Date('2022-02-18'),
          'ApproveUsers.updatedAt': new Date('2022-02-18')
        },
        {
          approveRouteId: '6693f071-9150-4005-bb06-3f8d30724f9b',
          contractId: contractId,
          approveRouteName: 'UTテスト承認ルート',
          createdAt: new Date('2022-02-18'),
          updatedAt: new Date('2022-02-18'),
          deleteFlag: false,
          'ApproveUsers.approveUserId': '8b087e49-6a91-4fc2-8dc8-f30f56d9acd6',
          'ApproveUsers.approveRouteId': '6693f071-9150-4005-bb06-3f8d30724f9b',
          'ApproveUsers.approveUser': '53607702-b94b-4a94-9459-6cf3acd65603',
          'ApproveUsers.prevApproveUser': null,
          'ApproveUsers.nextApproveUser': 'd4a11d99-1bb2-48b3-9c98-abefdb40dba2',
          'ApproveUsers.isLastApproveUser': false,
          'ApproveUsers.createdAt': new Date('2022-02-18'),
          'ApproveUsers.updatedAt': new Date('2022-02-18')
        },
        {
          approveRouteId: '6693f071-9150-4005-bb06-3f8d30724f9b',
          contractId: contractId,
          approveRouteName: 'UTテスト承認ルート',
          createdAt: new Date('2022-02-18'),
          updatedAt: new Date('2022-02-18'),
          deleteFlag: false,
          'ApproveUsers.approveUserId': 'd4a11d99-1bb2-48b3-9c98-abefdb40dba2',
          'ApproveUsers.approveRouteId': '6693f071-9150-4005-bb06-3f8d30724f9b',
          'ApproveUsers.approveUser': '3b6a13d6-cb89-414b-9597-175ba89329aa',
          'ApproveUsers.prevApproveUser': '8b087e49-6a91-4fc2-8dc8-f30f56d9acd6',
          'ApproveUsers.nextApproveUser': '25e611d1-b91d-4937-bf9c-fcd242762526',
          'ApproveUsers.isLastApproveUser': false,
          'ApproveUsers.createdAt': new Date('2022-02-18'),
          'ApproveUsers.updatedAt': new Date('2022-02-18')
        }
      ])

      // 承認ルートのユーザー
      approveUserFindOne.mockImplementation((options) => {
        const users = [
          ApproveUser.build({
            approveUserId: 'd4a11d99-1bb2-48b3-9c98-abefdb40dba2',
            approveRouteId: '6693f071-9150-4005-bb06-3f8d30724f9b',
            approveUser: '3b6a13d6-cb89-414b-9597-175ba89329aa',
            prevApproveUser: '8b087e49-6a91-4fc2-8dc8-f30f56d9acd6',
            nextApproveUser: '25e611d1-b91d-4937-bf9c-fcd242762526',
            isLastApproveUser: false
          }),
          ApproveUser.build({
            approveUserId: '8b087e49-6a91-4fc2-8dc8-f30f56d9acd6',
            approveRouteId: '6693f071-9150-4005-bb06-3f8d30724f9b',
            approveUser: '53607702-b94b-4a94-9459-6cf3acd65603',
            prevApproveUser: null,
            nextApproveUser: 'd4a11d99-1bb2-48b3-9c98-abefdb40dba2',
            isLastApproveUser: false
          }),
          ApproveUser.build({
            approveUserId: '25e611d1-b91d-4937-bf9c-fcd242762526',
            approveRouteId: '6693f071-9150-4005-bb06-3f8d30724f9b',
            approveUser: '7fa489ad-4c50-43d6-8057-1279877c8ef5',
            prevApproveUser: 'd4a11d99-1bb2-48b3-9c98-abefdb40dba2',
            nextApproveUser: '1e5e24aa-77c3-4571-a93c-5caa0e336ddb',
            isLastApproveUser: false
          }),
          ApproveUser.build({
            approveUserId: '1e5e24aa-77c3-4571-a93c-5caa0e336ddb',
            approveRouteId: '6693f071-9150-4005-bb06-3f8d30724f9b',
            approveUser: 'aa974511-8188-4022-bd86-45e251fd259e',
            prevApproveUser: '25e611d1-b91d-4937-bf9c-fcd242762526',
            nextApproveUser: null,
            isLastApproveUser: false
          })
        ]
        for (let idx = 0; idx < users.length; idx++) {
          if (users[idx].approveUserId === options.where.approveUserId) {
            return users[idx]
          }
        }

        return null
      })
      const expectedUser = [
        new ApproveObj({
          Id: '53607702-b94b-4a94-9459-6cf3acd65603',
          CompanyAccountId: '221559d0-53aa-44a2-ab29-0c4a6cb02bde',
          CompanyName: 'UTテスト会社',
          Username: 'UTTESTER1@UTCODE.COM',
          Language: 'ja',
          TimeZone: 'Asia/Tokyo',
          Memberships: [
            {
              UserId: '53607702-b94b-4a94-9459-6cf3acd65603',
              GroupId: '221559d0-53aa-44a2-ab29-0c4a6cb02bde',
              Role: 'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'
            }
          ],
          Created: '2021-05-17T08:12:48.291Z',
          State: 'ACTIVE',
          Type: 'PERSON',
          FirstName: 'UTテスト',
          LastName: 'ユーザー',
          Visible: true
        }),
        new ApproveObj({
          Id: '3b6a13d6-cb89-414b-9597-175ba89329aa',
          CompanyAccountId: '221559d0-53aa-44a2-ab29-0c4a6cb02bde',
          CompanyName: 'UTテスト会社',
          Username: 'UTTESTER2@UTCODE.COM',
          Language: 'ja',
          TimeZone: 'Asia/Tokyo',
          Memberships: [
            {
              UserId: '53607702-b94b-4a94-9459-6cf3acd65603',
              GroupId: '221559d0-53aa-44a2-ab29-0c4a6cb02bde',
              Role: 'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'
            }
          ],
          Created: '2021-05-24T03:24:26.537Z',
          State: 'ACTIVE',
          Type: 'PERSON',
          FirstName: 'UTテスト',
          LastName: 'ユーザー2',
          Title: 'portal test',
          Visible: true
        }),
        new ApproveObj({
          Id: '7fa489ad-4c50-43d6-8057-1279877c8ef5',
          CompanyAccountId: '221559d0-53aa-44a2-ab29-0c4a6cb02bde',
          CompanyName: 'UTテスト会社',
          Username: 'UTTESTER3@UTCODE.COM',
          Language: 'ja',
          TimeZone: 'Asia/Tokyo',
          Memberships: [
            {
              UserId: '7fa489ad-4c50-43d6-8057-1279877c8ef5',
              GroupId: '221559d0-53aa-44a2-ab29-0c4a6cb02bde',
              Role: '824b4cb4-3bd9-4dd3-a0d4-e18586b6c03d'
            }
          ],
          Created: '2021-06-11T08:49:30.939Z',
          State: 'ACTIVE',
          Type: 'PERSON',
          FirstName: 'UTテスト',
          LastName: 'ユーザー3',
          Visible: true
        }),
        new ApproveObj({
          Id: 'aa974511-8188-4022-bd86-45e251fd259e',
          CompanyAccountId: '221559d0-53aa-44a2-ab29-0c4a6cb02bde',
          CompanyName: 'UTテスト会社',
          Username: 'UTTESTER4@UTCODE.COM',
          Language: 'ja',
          TimeZone: 'Asia/Tokyo',
          Memberships: [
            {
              UserId: 'aa974511-8188-4022-bd86-45e251fd259e',
              GroupId: '221559d0-53aa-44a2-ab29-0c4a6cb02bde',
              Role: '8370ee3e-5f31-47bf-a139-d4218fb7689f'
            }
          ],
          Created: '2021-08-03T02:06:10.626Z',
          State: 'ACTIVE',
          Type: 'PERSON',
          FirstName: 'UTテスト',
          LastName: 'ユーザー4',
          Visible: true
        })
      ]

      // ユーザーをトレードシフトとの検索
      accessTradeshift.mockImplementation((accToken, refreshToken, method, url) => {
        const params = url.replace('/account/users/', '')
        const dummyData = [
          {
            Id: '53607702-b94b-4a94-9459-6cf3acd65603',
            CompanyAccountId: '221559d0-53aa-44a2-ab29-0c4a6cb02bde',
            CompanyName: 'UTテスト会社',
            Username: 'UTTESTER1@UTCODE.COM',
            Language: 'ja',
            TimeZone: 'Asia/Tokyo',
            Memberships: [
              {
                UserId: '53607702-b94b-4a94-9459-6cf3acd65603',
                GroupId: '221559d0-53aa-44a2-ab29-0c4a6cb02bde',
                Role: 'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'
              }
            ],
            Created: '2021-05-17T08:12:48.291Z',
            State: 'ACTIVE',
            Type: 'PERSON',
            FirstName: 'UTテスト',
            LastName: 'ユーザー',
            Visible: true
          },
          {
            Id: '3b6a13d6-cb89-414b-9597-175ba89329aa',
            CompanyAccountId: '221559d0-53aa-44a2-ab29-0c4a6cb02bde',
            CompanyName: 'UTテスト会社',
            Username: 'UTTESTER2@UTCODE.COM',
            Language: 'ja',
            TimeZone: 'Asia/Tokyo',
            Memberships: [
              {
                UserId: '53607702-b94b-4a94-9459-6cf3acd65603',
                GroupId: '221559d0-53aa-44a2-ab29-0c4a6cb02bde',
                Role: 'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'
              }
            ],
            Created: '2021-05-24T03:24:26.537Z',
            State: 'ACTIVE',
            Type: 'PERSON',
            FirstName: 'UTテスト',
            LastName: 'ユーザー2',
            Title: 'portal test',
            Visible: true
          },
          {
            Id: '7fa489ad-4c50-43d6-8057-1279877c8ef5',
            CompanyAccountId: '221559d0-53aa-44a2-ab29-0c4a6cb02bde',
            CompanyName: 'UTテスト会社',
            Username: 'UTTESTER3@UTCODE.COM',
            Language: 'ja',
            TimeZone: 'Asia/Tokyo',
            Memberships: [
              {
                UserId: '7fa489ad-4c50-43d6-8057-1279877c8ef5',
                GroupId: '221559d0-53aa-44a2-ab29-0c4a6cb02bde',
                Role: '824b4cb4-3bd9-4dd3-a0d4-e18586b6c03d'
              }
            ],
            Created: '2021-06-11T08:49:30.939Z',
            State: 'ACTIVE',
            Type: 'PERSON',
            FirstName: 'UTテスト',
            LastName: 'ユーザー3',
            Visible: true
          },
          {
            Id: 'aa974511-8188-4022-bd86-45e251fd259e',
            CompanyAccountId: '221559d0-53aa-44a2-ab29-0c4a6cb02bde',
            CompanyName: 'UTテスト会社',
            Username: 'UTTESTER4@UTCODE.COM',
            Language: 'ja',
            TimeZone: 'Asia/Tokyo',
            Memberships: [
              {
                UserId: 'aa974511-8188-4022-bd86-45e251fd259e',
                GroupId: '221559d0-53aa-44a2-ab29-0c4a6cb02bde',
                Role: '8370ee3e-5f31-47bf-a139-d4218fb7689f'
              }
            ],
            Created: '2021-08-03T02:06:10.626Z',
            State: 'ACTIVE',
            Type: 'PERSON',
            FirstName: 'UTテスト',
            LastName: 'ユーザー4',
            Visible: true
          }
        ]
        for (let idx = 0; idx < dummyData.length; idx++) {
          if (dummyData[idx].Id === params) {
            return dummyData[idx]
          }
        }
      })

      // 試験実施
      const result = await approverController.getApproveRoute(accessToken, refreshToken, contractId, approveRouteId)

      expect(JSON.stringify(result)).toBe(
        JSON.stringify({
          approveRouteId: '6693f071-9150-4005-bb06-3f8d30724f9b',
          contractId: 'dummy-contractId',
          name: 'UTテスト承認ルート',
          users: expectedUser
        })
      )
    })

    test('準正常：登録した承認ルート検索が０件', async () => {
      // ダミーデータの用意
      const accessToken = 'dummy-acesstoken'
      const refreshToken = 'dummy-refreshToken'
      const contractId = 'dummy-contractId'
      const approveRouteId = 'dummy-approve-routeId'

      // ApproveRoute.getApproveRoute承認ルートを検索
      approveGetApproveRoute.mockReturnValueOnce([])

      // 試験実施
      const result = await approverController.getApproveRoute(accessToken, refreshToken, contractId, approveRouteId)

      expect(result).toBe(-1)
    })

    test('準正常：DBエラー発生', async () => {
      // ダミーデータの用意
      const accessToken = 'dummy-acesstoken'
      const refreshToken = 'dummy-refreshToken'
      const contractId = 'dummy-contractId'
      const approveRouteId = 'dummy-approve-routeId'

      // ApproveRoute.getApproveRoute承認ルートを検索エラー発生
      const dbError = new Error(
        'SequelizeConnectionError: Failed to connect to localhost:1433 - Could not connect (sequence)'
      )
      approveGetApproveRoute.mockImplementation(() => {
        throw dbError
      })

      // 承認ルートのユーザー
      approveUserFindOne.mockReturnValueOnce(
        ApproveUser.build({
          approveUserId: '1e5e24aa-77c3-4571-a93c-5caa0e336ddb',
          approveRouteId: '6693f071-9150-4005-bb06-3f8d30724f9b',
          approveUser: 'aa974511-8188-4022-bd86-45e251fd259e',
          prevApproveUser: '8b087e49-6a91-4fc2-8dc8-f30f56d9acd6',
          nextApproveUser: null,
          isLastApproveUser: false
        })
      )

      // 試験実施
      const result = await approverController.getApproveRoute(accessToken, refreshToken, contractId, approveRouteId)

      expect(result).toBe(dbError)
    })
  })

  describe('duplicateApproveRoute', () => {
    test('正常：単数最終承認者', async () => {
      // パラメータ作成
      const approveRoute = {
        setApproveRouteNameInputId: 'UTテストコード',
        userName: 'テスト ユーザー',
        mailAddress: 'dev.master.bconnection+flow3.002@gmail.com',
        uuid: '81ae1ddf-0017-471c-962b-b4dac1b72117'
      }

      // approverオブジェクト作成
      const lastApprover = new ApproveObj({
        FirstName: 'テスト',
        LastName: 'ユーザー',
        Username: 'dev.master.bconnection+flow3.002@gmail.com',
        Memberships: [{ GroupId: null }],
        Id: approveRoute.uuid
      })
      const result = await approverController.duplicateApproveRoute(approveRoute)

      // 結果確認
      expect(result.approveRouteName).toMatch(approveRoute.setApproveRouteNameInputId)
      expect(result.approverUsers.length).toBe(0)
      expect(result.lastApprover).toEqual(lastApprover)
    })

    test('正常：複数承認者', async () => {
      // パラメータ作成
      const approveRoute = {
        setApproveRouteNameInputId: 'UTテストコード',
        userName: ['テスト ユーザー1', 'テスト ユーザー2'],
        mailAddress: ['dev.master.bconnection+flow3.001@gmail.com', 'dev.master.bconnection+flow3.002@gmail.com'],
        uuid: ['81ae1ddf-0017-471c-962b-b4dac1b72117', '81ae1ddf-0017-aaa-962b-b4dac1b72117']
      }

      // approverオブジェクト作成
      const approver = new ApproveObj({
        FirstName: 'テスト',
        LastName: 'ユーザー1',
        Username: 'dev.master.bconnection+flow3.001@gmail.com',
        Memberships: [{ GroupId: null }],
        Id: approveRoute.uuid[0]
      })
      const lastApprover = new ApproveObj({
        FirstName: 'テスト',
        LastName: 'ユーザー2',
        Username: 'dev.master.bconnection+flow3.002@gmail.com',
        Memberships: [{ GroupId: null }],
        Id: approveRoute.uuid[1]
      })
      const result = await approverController.duplicateApproveRoute(approveRoute)

      // 結果確認
      expect(result.approveRouteName).toMatch(approveRoute.setApproveRouteNameInputId)
      expect(result.approverUsers.length).toBe(1)
      expect(result.approverUsers[0]).toEqual(approver)
      expect(result.lastApprover).toEqual(lastApprover)
    })
  })

  describe('editApprover', () => {
    test('正常:1行の場合', async () => {
      const accessToken = 'dummy-access-token-data'
      const refreshToken = 'dummy-refresh-token-data'
      const contract = '343b34d1-f4db-484e-b822-8e2ce9017d14'
      const value = {
        setApproveRouteNameInputId: 'test2',
        uuid: 'aa974511-8188-4022-bd86-45e251fd259e'
      }
      const prevApproveRouteId = 'eb9835ae-afc7-4a55-92b3-9df762b3d6e6'

      // 重複コード検索結果：データがない場合
      approveRouteFindAll.mockReturnValueOnce([])

      // 更新した承認ルートを保存する。
      const expectApproveRoute = ApproveRoute.build({
        contract: contract,
        approveRouteName: value.setApproveRouteNameInputId,
        prevApproveRouteId: prevApproveRouteId
      })
      approverouteCreate.mockReturnValueOnce(expectApproveRoute)

      // 更新した承認ルートのユーザーを保存
      const expectApproveRouteUser = ApproveUser.build({
        approveRouteId: expectApproveRoute.approveRouteId,
        approveUser: 'aa974511-8188-4022-bd86-45e251fd259e',
        prevApproveUser: null,
        nextApproveUser: null,
        isLastApproveUser: false
      })
      approveUserCreate.mockReturnValueOnce(expectApproveRouteUser)

      // getApproveRouteの結果
      // ApproveRoute.getApproveRoute承認ルートを検索
      approveGetApproveRoute.mockReturnValueOnce([
        {
          approveRouteId: '6693f071-9150-4005-bb06-3f8d30724f9b',
          contractId: contract,
          approveRouteName: 'UTテスト承認ルート',
          createdAt: new Date('2022-02-18'),
          updatedAt: new Date('2022-02-18'),
          deleteFlag: false,
          'ApproveUsers.approveUserId': '1e5e24aa-77c3-4571-a93c-5caa0e336ddb',
          'ApproveUsers.approveRouteId': '6693f071-9150-4005-bb06-3f8d30724f9b',
          'ApproveUsers.approveUser': 'aa974511-8188-4022-bd86-45e251fd259e',
          'ApproveUsers.prevApproveUser': '25e611d1-b91d-4937-bf9c-fcd242762526',
          'ApproveUsers.nextApproveUser': null,
          'ApproveUsers.isLastApproveUser': true,
          'ApproveUsers.createdAt': new Date('2022-02-18'),
          'ApproveUsers.updatedAt': new Date('2022-02-18')
        },
        {
          approveRouteId: '6693f071-9150-4005-bb06-3f8d30724f9b',
          contractId: contract,
          approveRouteName: 'UTテスト承認ルート',
          createdAt: new Date('2022-02-18'),
          updatedAt: new Date('2022-02-18'),
          deleteFlag: false,
          'ApproveUsers.approveUserId': '25e611d1-b91d-4937-bf9c-fcd242762526',
          'ApproveUsers.approveRouteId': '6693f071-9150-4005-bb06-3f8d30724f9b',
          'ApproveUsers.approveUser': '7fa489ad-4c50-43d6-8057-1279877c8ef5',
          'ApproveUsers.prevApproveUser': 'd4a11d99-1bb2-48b3-9c98-abefdb40dba2',
          'ApproveUsers.nextApproveUser': '1e5e24aa-77c3-4571-a93c-5caa0e336ddb',
          'ApproveUsers.isLastApproveUser': false,
          'ApproveUsers.createdAt': new Date('2022-02-18'),
          'ApproveUsers.updatedAt': new Date('2022-02-18')
        },
        {
          approveRouteId: '6693f071-9150-4005-bb06-3f8d30724f9b',
          contractId: contract,
          approveRouteName: 'UTテスト承認ルート',
          createdAt: new Date('2022-02-18'),
          updatedAt: new Date('2022-02-18'),
          deleteFlag: false,
          'ApproveUsers.approveUserId': '8b087e49-6a91-4fc2-8dc8-f30f56d9acd6',
          'ApproveUsers.approveRouteId': '6693f071-9150-4005-bb06-3f8d30724f9b',
          'ApproveUsers.approveUser': '53607702-b94b-4a94-9459-6cf3acd65603',
          'ApproveUsers.prevApproveUser': null,
          'ApproveUsers.nextApproveUser': 'd4a11d99-1bb2-48b3-9c98-abefdb40dba2',
          'ApproveUsers.isLastApproveUser': false,
          'ApproveUsers.createdAt': new Date('2022-02-18'),
          'ApproveUsers.updatedAt': new Date('2022-02-18')
        },
        {
          approveRouteId: '6693f071-9150-4005-bb06-3f8d30724f9b',
          contractId: contract,
          approveRouteName: 'UTテスト承認ルート',
          createdAt: new Date('2022-02-18'),
          updatedAt: new Date('2022-02-18'),
          deleteFlag: false,
          'ApproveUsers.approveUserId': 'd4a11d99-1bb2-48b3-9c98-abefdb40dba2',
          'ApproveUsers.approveRouteId': '6693f071-9150-4005-bb06-3f8d30724f9b',
          'ApproveUsers.approveUser': '3b6a13d6-cb89-414b-9597-175ba89329aa',
          'ApproveUsers.prevApproveUser': '8b087e49-6a91-4fc2-8dc8-f30f56d9acd6',
          'ApproveUsers.nextApproveUser': '25e611d1-b91d-4937-bf9c-fcd242762526',
          'ApproveUsers.isLastApproveUser': false,
          'ApproveUsers.createdAt': new Date('2022-02-18'),
          'ApproveUsers.updatedAt': new Date('2022-02-18')
        }
      ])

      // 既存承認ルートはFlagをtrueにする。
      approveRouteUpdate.mockReturnValueOnce(1)

      // 試験実施
      const result = await approverController.editApprover(
        accessToken,
        refreshToken,
        contract,
        value,
        prevApproveRouteId
      )

      // 期待結果
      expect(result).toBe(0)
    })

    test('正常:複数ユーザー', async () => {
      const accessToken = 'dummy-access-token-data'
      const refreshToken = 'dummy-refresh-token-data'
      const contract = '343b34d1-f4db-484e-b822-8e2ce9017d14'
      const value = {
        setApproveRouteNameInputId: 'test2',
        uuid: [
          'aa974511-8188-4022-bd86-45e251fd259e',
          '11a19c99-0256-4ff0-9ebb-8bda7d0e5031',
          '7fa489ad-4c50-43d6-8057-1279877c8ef5'
        ]
      }
      const prevApproveRouteId = 'eb9835ae-afc7-4a55-92b3-9df762b3d6e6'

      // 重複コード検索結果：データがない場合
      approveRouteFindAll.mockReturnValueOnce([])

      // 更新した承認ルートを保存する。
      const expectApproveRoute = ApproveRoute.build({
        contract: contract,
        approveRouteName: value.setApproveRouteNameInputId,
        prevApproveRouteId: prevApproveRouteId
      })
      approverouteCreate.mockReturnValueOnce(expectApproveRoute)

      // 更新した承認ルートのユーザーを保存
      const expectApproveRouteUser3 = ApproveUser.build({
        approveRouteId: expectApproveRoute.approveRouteId,
        approveUser: '7fa489ad-4c50-43d6-8057-1279877c8ef5',
        prevApproveUser: null,
        nextApproveUser: null,
        isLastApproveUser: false
      })
      expectApproveRouteUser3.save = jest.fn()
      const expectApproveRouteUser2 = ApproveUser.build({
        approveRouteId: expectApproveRoute.approveRouteId,
        approveUser: '11a19c99-0256-4ff0-9ebb-8bda7d0e5031',
        prevApproveUser: null,
        nextApproveUser: expectApproveRouteUser3.approveRouteId,
        isLastApproveUser: false
      })
      expectApproveRouteUser2.save = jest.fn()
      const expectApproveRouteUser1 = ApproveUser.build({
        approveRouteId: expectApproveRoute.approveRouteId,
        approveUser: 'aa974511-8188-4022-bd86-45e251fd259e',
        prevApproveUser: null,
        nextApproveUser: expectApproveRouteUser2.approveRouteId,
        isLastApproveUser: false
      })
      expectApproveRouteUser1.save = jest.fn()
      expectApproveRouteUser2.prevApproveUser = expectApproveRouteUser3.approveRouteId
      expectApproveRouteUser3.prevApproveUser = expectApproveRouteUser2.approveRouteId
      approveUserCreate.mockReturnValueOnce(expectApproveRouteUser3)
      approveUserCreate.mockReturnValueOnce(expectApproveRouteUser2)
      approveUserCreate.mockReturnValueOnce(expectApproveRouteUser1)

      // getApproveRouteの結果
      // ApproveRoute.getApproveRoute承認ルートを検索
      approveGetApproveRoute.mockReturnValueOnce([
        {
          approveRouteId: '6693f071-9150-4005-bb06-3f8d30724f9b',
          contractId: contract,
          approveRouteName: 'UTテスト承認ルート',
          createdAt: new Date('2022-02-18'),
          updatedAt: new Date('2022-02-18'),
          deleteFlag: false,
          'ApproveUsers.approveUserId': '1e5e24aa-77c3-4571-a93c-5caa0e336ddb',
          'ApproveUsers.approveRouteId': '6693f071-9150-4005-bb06-3f8d30724f9b',
          'ApproveUsers.approveUser': 'aa974511-8188-4022-bd86-45e251fd259e',
          'ApproveUsers.prevApproveUser': '25e611d1-b91d-4937-bf9c-fcd242762526',
          'ApproveUsers.nextApproveUser': null,
          'ApproveUsers.isLastApproveUser': true,
          'ApproveUsers.createdAt': new Date('2022-02-18'),
          'ApproveUsers.updatedAt': new Date('2022-02-18')
        },
        {
          approveRouteId: '6693f071-9150-4005-bb06-3f8d30724f9b',
          contractId: contract,
          approveRouteName: 'UTテスト承認ルート',
          createdAt: new Date('2022-02-18'),
          updatedAt: new Date('2022-02-18'),
          deleteFlag: false,
          'ApproveUsers.approveUserId': '25e611d1-b91d-4937-bf9c-fcd242762526',
          'ApproveUsers.approveRouteId': '6693f071-9150-4005-bb06-3f8d30724f9b',
          'ApproveUsers.approveUser': '7fa489ad-4c50-43d6-8057-1279877c8ef5',
          'ApproveUsers.prevApproveUser': 'd4a11d99-1bb2-48b3-9c98-abefdb40dba2',
          'ApproveUsers.nextApproveUser': '1e5e24aa-77c3-4571-a93c-5caa0e336ddb',
          'ApproveUsers.isLastApproveUser': false,
          'ApproveUsers.createdAt': new Date('2022-02-18'),
          'ApproveUsers.updatedAt': new Date('2022-02-18')
        },
        {
          approveRouteId: '6693f071-9150-4005-bb06-3f8d30724f9b',
          contractId: contract,
          approveRouteName: 'UTテスト承認ルート',
          createdAt: new Date('2022-02-18'),
          updatedAt: new Date('2022-02-18'),
          deleteFlag: false,
          'ApproveUsers.approveUserId': '8b087e49-6a91-4fc2-8dc8-f30f56d9acd6',
          'ApproveUsers.approveRouteId': '6693f071-9150-4005-bb06-3f8d30724f9b',
          'ApproveUsers.approveUser': '53607702-b94b-4a94-9459-6cf3acd65603',
          'ApproveUsers.prevApproveUser': null,
          'ApproveUsers.nextApproveUser': 'd4a11d99-1bb2-48b3-9c98-abefdb40dba2',
          'ApproveUsers.isLastApproveUser': false,
          'ApproveUsers.createdAt': new Date('2022-02-18'),
          'ApproveUsers.updatedAt': new Date('2022-02-18')
        },
        {
          approveRouteId: '6693f071-9150-4005-bb06-3f8d30724f9b',
          contractId: contract,
          approveRouteName: 'UTテスト承認ルート',
          createdAt: new Date('2022-02-18'),
          updatedAt: new Date('2022-02-18'),
          deleteFlag: false,
          'ApproveUsers.approveUserId': 'd4a11d99-1bb2-48b3-9c98-abefdb40dba2',
          'ApproveUsers.approveRouteId': '6693f071-9150-4005-bb06-3f8d30724f9b',
          'ApproveUsers.approveUser': '3b6a13d6-cb89-414b-9597-175ba89329aa',
          'ApproveUsers.prevApproveUser': '8b087e49-6a91-4fc2-8dc8-f30f56d9acd6',
          'ApproveUsers.nextApproveUser': '25e611d1-b91d-4937-bf9c-fcd242762526',
          'ApproveUsers.isLastApproveUser': false,
          'ApproveUsers.createdAt': new Date('2022-02-18'),
          'ApproveUsers.updatedAt': new Date('2022-02-18')
        }
      ])

      // 既存承認ルートはFlagをtrueにする。
      approveRouteUpdate.mockReturnValueOnce(1)

      // 試験実施
      const result = await approverController.editApprover(
        accessToken,
        refreshToken,
        contract,
        value,
        prevApproveRouteId
      )

      // 期待結果
      expect(result).toBe(0)
    })

    test('正常:複数行の場合', async () => {
      const accessToken = 'dummy-access-token-data'
      const refreshToken = 'dummy-refresh-token-data'
      const contract = '343b34d1-f4db-484e-b822-8e2ce9017d14'
      const value = {
        setApproveRouteNameInputId: 'test2',
        uuid: 'aa974511-8188-4022-bd86-45e251fd259e'
      }
      const prevApproveRouteId = 'eb9835ae-afc7-4a55-92b3-9df762b3d6e6'

      // 重複コード検索結果：データがない場合
      approveRouteFindAll.mockReturnValueOnce([
        ApproveRoute.build({
          contract: contract,
          approveRouteName: 'TEST2'
        }),
        ApproveRoute.build({
          contract: contract,
          approveRouteName: 'Test2'
        })
      ])

      // 更新した承認ルートを保存する。
      const expectApproveRoute = ApproveRoute.build({
        contract: contract,
        approveRouteName: value.setApproveRouteNameInputId,
        prevApproveRouteId: prevApproveRouteId
      })
      approverouteCreate.mockReturnValueOnce(expectApproveRoute)

      // 更新した承認ルートのユーザーを保存
      const expectApproveRouteUser = ApproveUser.build({
        approveRouteId: expectApproveRoute.approveRouteId,
        approveUser: 'aa974511-8188-4022-bd86-45e251fd259e',
        prevApproveUser: null,
        nextApproveUser: null,
        isLastApproveUser: false
      })
      approveUserCreate.mockReturnValueOnce(expectApproveRouteUser)

      // getApproveRouteの結果
      // ApproveRoute.getApproveRoute承認ルートを検索
      approveGetApproveRoute.mockReturnValueOnce({})

      // 既存承認ルートはFlagをtrueにする。
      approveRouteUpdate.mockReturnValueOnce(1)

      // 試験実施
      const result = await approverController.editApprover(
        accessToken,
        refreshToken,
        contract,
        value,
        prevApproveRouteId
      )

      // 期待結果
      expect(result).toBe(0)
    })

    test('準正常:重複の場合', async () => {
      const accessToken = 'dummy-access-token-data'
      const refreshToken = 'dummy-refresh-token-data'
      const contract = '343b34d1-f4db-484e-b822-8e2ce9017d14'
      const value = {
        setApproveRouteNameInputId: 'test2',
        uuid: 'aa974511-8188-4022-bd86-45e251fd259e'
      }
      const prevApproveRouteId = 'eb9835ae-afc7-4a55-92b3-9df762b3d6e6'

      // 重複コード検索結果：データがない場合
      approveRouteFindAll.mockReturnValueOnce([
        ApproveRoute.build({
          contract: contract,
          approveRouteName: 'TEST2'
        }),
        ApproveRoute.build({
          contract: contract,
          approveRouteName: 'test2'
        })
      ])

      // 試験実施
      const result = await approverController.editApprover(
        accessToken,
        refreshToken,
        contract,
        value,
        prevApproveRouteId
      )

      // 期待結果
      expect(result).toBe(1)
    })

    test('準正常:承認ルート更新失敗', async () => {
      const accessToken = 'dummy-access-token-data'
      const refreshToken = 'dummy-refresh-token-data'
      const contract = '343b34d1-f4db-484e-b822-8e2ce9017d14'
      const value = {
        setApproveRouteNameInputId: 'test2',
        uuid: 'aa974511-8188-4022-bd86-45e251fd259e'
      }
      const prevApproveRouteId = 'eb9835ae-afc7-4a55-92b3-9df762b3d6e6'

      // 重複コード検索結果：データがない場合
      approveRouteFindAll.mockReturnValueOnce([
        ApproveRoute.build({
          contract: contract,
          approveRouteName: 'TEST2'
        }),
        ApproveRoute.build({
          contract: contract,
          approveRouteName: 'Test2'
        })
      ])

      // 承認ルート保存失敗
      approverouteCreate.mockReturnValueOnce(null)

      // 試験実施
      const result = await approverController.editApprover(
        accessToken,
        refreshToken,
        contract,
        value,
        prevApproveRouteId
      )

      // 期待結果
      expect(result).toBe(-1)
    })

    test('準正常:DB保存失敗したらモデルApproveRouteインスタンスではない', async () => {
      const accessToken = 'dummy-access-token-data'
      const refreshToken = 'dummy-refresh-token-data'
      const contract = '343b34d1-f4db-484e-b822-8e2ce9017d14'
      const value = {
        setApproveRouteNameInputId: 'test2',
        uuid: 'aa974511-8188-4022-bd86-45e251fd259e'
      }
      const prevApproveRouteId = 'eb9835ae-afc7-4a55-92b3-9df762b3d6e6'

      // 重複コード検索結果：データがない場合
      approveRouteFindAll.mockReturnValueOnce([
        ApproveRoute.build({
          contract: contract,
          approveRouteName: 'TEST2'
        }),
        ApproveRoute.build({
          contract: contract,
          approveRouteName: 'Test2'
        })
      ])

      // 更新した承認ルートを保存する。
      const expectApproveRoute = ApproveRoute.build({
        contract: contract,
        approveRouteName: value.setApproveRouteNameInputId,
        prevApproveRouteId: prevApproveRouteId
      })
      approverouteCreate.mockReturnValueOnce(expectApproveRoute)

      // 更新した承認ルートのユーザーを保存
      const expectApproveRouteUser = ApproveUser.build({
        approveRouteId: expectApproveRoute.approveRouteId,
        approveUser: 'aa974511-8188-4022-bd86-45e251fd259e',
        prevApproveUser: null,
        nextApproveUser: null,
        isLastApproveUser: false
      })
      approveUserCreate.mockReturnValueOnce(expectApproveRouteUser)

      // getApproveRouteの結果
      // ApproveRoute.getApproveRoute承認ルートを検索
      approveGetApproveRoute.mockReturnValueOnce([])

      // 試験実施
      const result = await approverController.editApprover(
        accessToken,
        refreshToken,
        contract,
        value,
        prevApproveRouteId
      )

      // 期待結果
      expect(result).toBe(-1)
    })

    test('準正常:既存承認ルートのアップデートフラグを立ちを失敗', async () => {
      const accessToken = 'dummy-access-token-data'
      const refreshToken = 'dummy-refresh-token-data'
      const contract = '343b34d1-f4db-484e-b822-8e2ce9017d14'
      const value = {
        setApproveRouteNameInputId: 'test2',
        uuid: 'aa974511-8188-4022-bd86-45e251fd259e'
      }
      const prevApproveRouteId = 'eb9835ae-afc7-4a55-92b3-9df762b3d6e6'

      // 重複コード検索結果：データがない場合
      approveRouteFindAll.mockReturnValueOnce([
        ApproveRoute.build({
          contract: contract,
          approveRouteName: 'TEST2'
        }),
        ApproveRoute.build({
          contract: contract,
          approveRouteName: 'Test2'
        })
      ])

      // 更新した承認ルートを保存する。
      const expectApproveRoute = ApproveRoute.build({
        contract: contract,
        approveRouteName: value.setApproveRouteNameInputId,
        prevApproveRouteId: prevApproveRouteId
      })
      approverouteCreate.mockReturnValueOnce(expectApproveRoute)

      // 更新した承認ルートのユーザーを保存
      const expectApproveRouteUser = ApproveUser.build({
        approveRouteId: expectApproveRoute.approveRouteId,
        approveUser: 'aa974511-8188-4022-bd86-45e251fd259e',
        prevApproveUser: null,
        nextApproveUser: null,
        isLastApproveUser: false
      })
      approveUserCreate.mockReturnValueOnce(expectApproveRouteUser)

      // getApproveRouteの結果
      // ApproveRoute.getApproveRoute承認ルートを検索
      approveGetApproveRoute.mockReturnValueOnce([
        {
          approveRouteId: '6693f071-9150-4005-bb06-3f8d30724f9b',
          contractId: contract,
          approveRouteName: 'UTテスト承認ルート',
          createdAt: new Date('2022-02-18'),
          updatedAt: new Date('2022-02-18'),
          deleteFlag: false,
          'ApproveUsers.approveUserId': '1e5e24aa-77c3-4571-a93c-5caa0e336ddb',
          'ApproveUsers.approveRouteId': '6693f071-9150-4005-bb06-3f8d30724f9b',
          'ApproveUsers.approveUser': 'aa974511-8188-4022-bd86-45e251fd259e',
          'ApproveUsers.prevApproveUser': '25e611d1-b91d-4937-bf9c-fcd242762526',
          'ApproveUsers.nextApproveUser': null,
          'ApproveUsers.isLastApproveUser': true,
          'ApproveUsers.createdAt': new Date('2022-02-18'),
          'ApproveUsers.updatedAt': new Date('2022-02-18')
        }
      ])

      approveRouteUpdate.mockReturnValueOnce(0)

      // 試験実施
      const result = await approverController.editApprover(
        accessToken,
        refreshToken,
        contract,
        value,
        prevApproveRouteId
      )

      // 期待結果
      expect(result).toBe(-1)
    })

    test('準正常:更新承認ルートの承認者をDB保存する場合、失敗', async () => {
      const accessToken = 'dummy-access-token-data'
      const refreshToken = 'dummy-refresh-token-data'
      const contract = '343b34d1-f4db-484e-b822-8e2ce9017d14'
      const value = {
        setApproveRouteNameInputId: 'test2',
        uuid: 'aa974511-8188-4022-bd86-45e251fd259e'
      }
      const prevApproveRouteId = 'eb9835ae-afc7-4a55-92b3-9df762b3d6e6'

      // 重複コード検索結果：データがない場合
      approveRouteFindAll.mockReturnValueOnce([
        ApproveRoute.build({
          contract: contract,
          approveRouteName: 'TEST2'
        }),
        ApproveRoute.build({
          contract: contract,
          approveRouteName: 'Test2'
        })
      ])

      // 更新した承認ルートを保存する。
      const expectApproveRoute = ApproveRoute.build({
        contract: contract,
        approveRouteName: value.setApproveRouteNameInputId,
        prevApproveRouteId: prevApproveRouteId
      })
      approverouteCreate.mockReturnValueOnce(expectApproveRoute)

      // 更新した承認ルートのユーザーを保存
      approveUserCreate.mockReturnValueOnce(null)

      // getApproveRouteの結果
      // ApproveRoute.getApproveRoute承認ルートを検索
      approveGetApproveRoute.mockReturnValueOnce([
        {
          approveRouteId: '6693f071-9150-4005-bb06-3f8d30724f9b',
          contractId: contract,
          approveRouteName: 'UTテスト承認ルート',
          createdAt: new Date('2022-02-18'),
          updatedAt: new Date('2022-02-18'),
          deleteFlag: false,
          'ApproveUsers.approveUserId': '1e5e24aa-77c3-4571-a93c-5caa0e336ddb',
          'ApproveUsers.approveRouteId': '6693f071-9150-4005-bb06-3f8d30724f9b',
          'ApproveUsers.approveUser': 'aa974511-8188-4022-bd86-45e251fd259e',
          'ApproveUsers.prevApproveUser': '25e611d1-b91d-4937-bf9c-fcd242762526',
          'ApproveUsers.nextApproveUser': null,
          'ApproveUsers.isLastApproveUser': true,
          'ApproveUsers.createdAt': new Date('2022-02-18'),
          'ApproveUsers.updatedAt': new Date('2022-02-18')
        }
      ])

      approveRouteUpdate.mockReturnValueOnce(1)

      // 試験実施
      const result = await approverController.editApprover(
        accessToken,
        refreshToken,
        contract,
        value,
        prevApproveRouteId
      )

      // 期待結果
      expect(result).toBe(-1)
    })

    test('準正常:システムエラー発生', async () => {
      const accessToken = 'dummy-access-token-data'
      const refreshToken = 'dummy-refresh-token-data'
      const contract = '343b34d1-f4db-484e-b822-8e2ce9017d14'
      const value = {
        setApproveRouteNameInputId: 'test2',
        uuid: 'aa974511-8188-4022-bd86-45e251fd259e'
      }
      const prevApproveRouteId = 'eb9835ae-afc7-4a55-92b3-9df762b3d6e6'

      // 重複コード検索結果：データがない場合
      approveRouteFindAll.mockReturnValueOnce([
        ApproveRoute.build({
          contract: contract,
          approveRouteName: 'TEST2'
        }),
        ApproveRoute.build({
          contract: contract,
          approveRouteName: 'Test2'
        })
      ])

      // 更新した承認ルートを保存する。
      const expectApproveRoute = ApproveRoute.build({
        contract: contract,
        approveRouteName: value.setApproveRouteNameInputId,
        prevApproveRouteId: prevApproveRouteId
      })
      approverouteCreate.mockReturnValueOnce(expectApproveRoute)

      const dbError = new Error(
        'SequelizeConnectionError: The "config.server" property is required and must be of type string.'
      )
      dbError.stack = 'SequelizeConnectionError: The "config.server" property is required and must be of type string.'
      // approveUserCreateの呼び出しの時、エラーが発生
      approveUserCreate.mockImplementation(() => {
        throw dbError
      })

      // 試験実施
      const result = await approverController.editApprover(
        accessToken,
        refreshToken,
        contract,
        value,
        prevApproveRouteId
      )

      // 期待結果
      expect(result).toEqual(dbError)
    })
  })
})
