'use strict'

jest.mock('../../Application/node_modules/axios')
jest.mock('../../Application/lib/logger')

const apiManager = require('../../Application/controllers/apiManager')
const axios = require('../../Application/node_modules/axios')
const logger = require('../../Application/lib/logger')

let errorSpy, getSpy, postSpy, request, error401, error500
describe('apiManagerのテスト', () => {
  beforeEach(() => {
    errorSpy = jest.spyOn(logger, 'error')
    getSpy = jest.spyOn(axios, 'get')
    postSpy = jest.spyOn(axios, 'post')
  })
  afterEach(() => {
    errorSpy.mockRestore()
    getSpy.mockRestore()
    postSpy.mockRestore()
  })
  // request定義
  request = {
    user: {
      tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089',
      userId: '976d46d7-cb0b-48ad-857d-4b42a44ede13',
      accessToken: 'dummyAccessToken',
      refreshToken: 'dummyRefreshToken'
    }
  }
  // 401エラー定義
  error401 = { response: { status: '401' }, stack: 'dummy401' }
  // 500エラー定義
  error500 = { response: { status: '500' }, stack: 'dummy500' }

  describe('accessTradeshift', () => {
    test('正常: アクセストークンで取得時', async () => {
      // 準備
      // 1回目のアクセストークンによるアクセスで正常データの取得を想定する
      getSpy.mockReturnValue({
        data: {
          Id: '976d46d7-cb0b-48ad-857d-4b42a44ede13',
          CompanyAccountId: '15e2d952-8ba0-42a4-8582-b234cb4a2089',
          CompanyName: 'UnitTestCompany',
          Username: 'dummy@example.com',
          Language: 'ja',
          TimeZone: 'Asia/Tokyo',
          Memberships: [
            {
              UserId: '976d46d7-cb0b-48ad-857d-4b42a44ede13',
              GroupId: '15e2d952-8ba0-42a4-8582-b234cb4a2089',
              Role: 'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'
            }
          ],
          Created: '2021-01-20T05:11:15.177Z',
          State: 'ACTIVE',
          Type: 'PERSON',
          FirstName: 'Yamada',
          LastName: 'Taro',
          Visible: true
        }
      })

      // 試験実施
      const result = await apiManager.accessTradeshift(
        request.user.accessToken,
        request.user.refreshToken,
        'get',
        '/account/info'
      )

      // 期待結果
      // 取得した情報がReturnされていること
      expect(result).toEqual({
        Id: '976d46d7-cb0b-48ad-857d-4b42a44ede13',
        CompanyAccountId: '15e2d952-8ba0-42a4-8582-b234cb4a2089',
        CompanyName: 'UnitTestCompany',
        Username: 'dummy@example.com',
        Language: 'ja',
        TimeZone: 'Asia/Tokyo',
        Memberships: [
          {
            UserId: '976d46d7-cb0b-48ad-857d-4b42a44ede13',
            GroupId: '15e2d952-8ba0-42a4-8582-b234cb4a2089',
            Role: 'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'
          }
        ],
        Created: '2021-01-20T05:11:15.177Z',
        State: 'ACTIVE',
        Type: 'PERSON',
        FirstName: 'Yamada',
        LastName: 'Taro',
        Visible: true
      })
    })
    test('正常: アクセストークンで401エラー、取得したリフレッシュトークンで取得成功時', async () => {
      // 準備
      // 1回目のアクセストークンによるアクセスは401エラーを想定する
      getSpy
        .mockImplementationOnce(() => {
          throw error401
        })
        // 2回目のリフレッシュトークンによるアクセスで正常データの取得を想定する
        .mockReturnValueOnce({
          data: {
            Id: '976d46d7-cb0b-48ad-857d-4b42a44ede13',
            CompanyAccountId: '15e2d952-8ba0-42a4-8582-b234cb4a2089',
            CompanyName: 'UnitTestCompany',
            Username: 'dummy@example.com',
            Language: 'ja',
            TimeZone: 'Asia/Tokyo',
            Memberships: [
              {
                UserId: '976d46d7-cb0b-48ad-857d-4b42a44ede13',
                GroupId: '15e2d952-8ba0-42a4-8582-b234cb4a2089',
                Role: 'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'
              }
            ],
            Created: '2021-01-20T05:11:15.177Z',
            State: 'ACTIVE',
            Type: 'PERSON',
            FirstName: 'Yamada',
            LastName: 'Taro',
            Visible: true
          }
        })
      // リフレッシュトークンの取得が正常にできた場合を想定する
      postSpy.mockReturnValue({ data: { access_token: 'newRefreshToken' } })

      // 試験実施
      const result = await apiManager.accessTradeshift(
        request.user.accessToken,
        request.user.refreshToken,
        'get',
        '/account/info'
      )

      // 期待結果
      // 取得した情報がReturnされていること
      expect(result).toEqual({
        Id: '976d46d7-cb0b-48ad-857d-4b42a44ede13',
        CompanyAccountId: '15e2d952-8ba0-42a4-8582-b234cb4a2089',
        CompanyName: 'UnitTestCompany',
        Username: 'dummy@example.com',
        Language: 'ja',
        TimeZone: 'Asia/Tokyo',
        Memberships: [
          {
            UserId: '976d46d7-cb0b-48ad-857d-4b42a44ede13',
            GroupId: '15e2d952-8ba0-42a4-8582-b234cb4a2089',
            Role: 'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'
          }
        ],
        Created: '2021-01-20T05:11:15.177Z',
        State: 'ACTIVE',
        Type: 'PERSON',
        FirstName: 'Yamada',
        LastName: 'Taro',
        Visible: true
      })
    })
    test('access failure: アクセストークンで401以外のエラー発生', async () => {
      // 準備
      // 1回目のアクセストークンによるアクセスは500エラーを想定する
      getSpy.mockImplementation(() => {
        throw error500
      })
      // 試験実施
      const result = await apiManager.accessTradeshift(
        request.user.accessToken,
        request.user.refreshToken,
        'get',
        '/account/info'
      )

      // 期待結果
      // access failureのErrorログ出力が呼ばれること
      expect(errorSpy).toHaveBeenCalledWith(
        { stack: error500.stack, status: 1 },
        'Tradeshift API Access: access failure'
      )
      // APIアクセス時のErrorが返されること
      expect(result).toEqual(error500)
    })

    test('access failure: アクセストークン、取得したリフレッシュトークンでも401エラー発生', async () => {
      // 準備
      // 1回目のアクセストークン、2回目のリフレッシュトークンによるアクセスは401エラーを想定する
      getSpy.mockImplementation(() => {
        throw error401
      })
      // リフレッシュトークンは正常データの取得を想定する
      postSpy.mockReturnValue({ data: { access_token: 'newRefreshToken' } })

      // 試験実施
      const result = await apiManager.accessTradeshift(
        request.user.accessToken,
        request.user.refreshToken,
        'get',
        '/account/info'
      )

      // 期待結果
      // access failureのErrorログ出力が呼ばれること
      expect(errorSpy).toHaveBeenCalledWith(
        { stack: error401.stack, status: 1 },
        'Tradeshift API Access: access failure'
      )
      // APIアクセス時のErrorが返されること
      expect(result).toEqual(error401)
    })
    test('refresh failure: アクセストークンで401エラー、リフレッシュトークン取得でエラー発生時', async () => {
      // 準備
      // 1回目のアクセストークンによるアクセスは401エラーを想定する
      getSpy.mockImplementation(() => {
        throw error401
      })
      //リフレッシュトークンの取得も401エラーを想定する
      postSpy.mockImplementation(() => {
        throw error401
      })

      // 試験実施
      const result = await apiManager.accessTradeshift(
        request.user.accessToken,
        request.user.refreshToken,
        'get',
        '/account/info'
      )

      // 期待結果
      // status: 1,refresh failureのErrorログ出力が呼ばれること
      expect(errorSpy).toHaveBeenCalledWith(
        { stack: error401.stack, status: 1 },
        'Tradeshift API Access: refresh failure'
      )
      // APIアクセス時のErrorが返されること
      expect(result).toEqual(error401)
    })
  })
})
