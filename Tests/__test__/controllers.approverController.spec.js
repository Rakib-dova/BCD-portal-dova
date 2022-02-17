'use strict'

const logger = require('../../Application/lib/logger')
const apiManager = require('../../Application/controllers/apiManager')
const approverController = require('../../Application/controllers/approverController')
const db = require('../../Application/models')
const ApproveRoute = db.ApproveRoute
const ApproveUser = db.ApproveUser

let errorSpy, infoSpy, accessTradeshift
let approveRouteFindAll, approverouteCreate
let approveUserCreate

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
      Visible: true
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
      Visible: true
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
      Visible: true
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
      Visible: true
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
    approveUserCreate = jest.spyOn(ApproveUser, 'create')
  })
  afterEach(() => {
    errorSpy.mockRestore()
    infoSpy.mockRestore()
    accessTradeshift.mockRestore()
    approveRouteFindAll.mockRestore()
    approverouteCreate.mockRestore()
    approveUserCreate.mockRestore()
  })

  describe('getApprover', () => {
    test('正常:姓名とメールアドレスのAND検索', async () => {
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

      const expectApproveUser2 = ApproveUser.build({
        approveRouteId: expectApproveRoute.approveRouteId,
        approveUser: values.uuid,
        prevApproveUser: 'dymmy-uuid2',
        nextApproveUser: null,
        isLastApproveUser: true
      })

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
      approveRouteArr.push(approveRoute1, approveRoute2)
      // DBのデータが場合
      approveRouteFindAll.mockReturnValueOnce(approveRouteArr)

      const result = await approverController.getApproveRouteList(contractId)

      expect(result).toHaveLength(2)
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
})
