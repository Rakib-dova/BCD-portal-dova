'use strict'

const logger = require('../../Application/lib/logger')
const apiManager = require('../../Application/controllers/apiManager')
const approverController = require('../../Application/controllers/approverController')

let errorSpy, infoSpy, accessTradeshift

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
  })
  afterEach(() => {
    errorSpy.mockRestore()
    infoSpy.mockRestore()
    accessTradeshift.mockRestore()
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
})
