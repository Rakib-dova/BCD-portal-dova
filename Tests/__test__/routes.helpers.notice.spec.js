'use strict'
jest.mock('../../Application/node_modules/express', () => {
  return require('jest-express')
})

const Request = require('jest-express').Request
const Response = require('jest-express').Response
const next = require('jest-express').Next
const noticHelper = require('../../Application/routes/helpers/notice')
const errorHelper = require('../../Application/routes/helpers/error')

if (process.env.LOCALLY_HOSTED === 'true') {
  // NODE_ENVはJestがデフォルトでtestに指定する。dotenvで上書きできなかったため、package.jsonの実行引数でdevelopmentを指定
  require('dotenv').config({ path: './config/.env' })
}
let request, response
describe('helpers/errorのテスト', () => {
  beforeEach(() => {
    request = new Request()
    response = new Response()
  })
  afterEach(() => {
    request.resetMocked()
    response.resetMocked()
    next.mockReset()
  })

  describe('create', () => {
    test('cancellation：messageStatusがcancellationの場合', async () => {
      // 準備

      // 試験実施
      const result = noticHelper.create('cancellation')

      // 期待結果
      expect(result).toBe('cancellation')
    })

    test('cancelprocedure：messageStatusがcancelprocedureの場合', async () => {
      // 準備

      // 試験実施
      const result = noticHelper.create('cancelprocedure')

      // 期待結果
      expect(result).toBe('cancelprocedure')
    })
  })
  describe('render', () => {
    test('cancellation：messageStatusがcancellationの場合', async () => {
      // 準備
      // userId,tenantIdに正常値を入れる
      const messageStatus = 'cancellation'

      // 試験実施
      noticHelper.render(messageStatus, request, response, next)

      // 期待結果
      // 用意したエラー情報でrenderが呼ばれ「ない」（500エラーの時は404のメッセージとなる）
      expect(response.render).toHaveBeenCalledWith('notice', {
        message: '解約の申請を受け付けました。',
        description1: 'デジタルトレードアプリをご利用いただき誠にありがとうございました。',
        description2: 'またのご利用を心よりお待ちしております。'
      })
    })

    test('cancelprocedure：messageStatusがcancelprocedureの場合', async () => {
      // 準備
      // userId,tenantIdに正常値を入れる
      const messageStatus = 'cancelprocedure'

      // 試験実施
      noticHelper.render(messageStatus, request, response, next)

      // 期待結果
      // 用意したエラー情報でrenderが呼ばれ「ない」（500エラーの時は404のメッセージとなる）
      expect(response.render).toHaveBeenCalledWith('notice', {
        message: '現在解約手続き中です。',
        description1: '解約手続き完了後、再度ご利用開始いただけます。',
        description2: null
      })
    })

    test('400エラー：指定以外messageStatusの場合', async () => {
      // 準備
      // userId,tenantIdに正常値を入れる
      const messageStatus = 'test'

      // 試験実施
      noticHelper.render(messageStatus, request, response, next)

      // 期待結果
      // 400エラーがエラーハンドリング「される」
      expect(next).toHaveBeenCalledWith(errorHelper.create(400))
    })
  })
})
