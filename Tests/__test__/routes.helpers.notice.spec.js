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

    test('registerprocedure：messageStatusがregisterprocedureの場合', async () => {
      // 準備

      // 試験実施
      const result = noticHelper.create('registerprocedure')

      // 期待結果
      expect(result).toBe('registerprocedure')
    })

    test('changeprocedure：messageStatusがchangeprocedureの場合', async () => {
      // 準備

      // 試験実施
      const result = noticHelper.create('changeprocedure')

      // 期待結果
      expect(result).toBe('changeprocedure')
    })

    test('generaluser：messageStatusがgeneraluserの場合', async () => {
      // 準備

      // 試験実施
      const result = noticHelper.create('generaluser')

      // 期待結果
      expect(result).toBe('generaluser')
    })

    test('introductionSupportregistered: messageStatusがintroductionSupportregisteredの場合', () => {
      // 試験実施
      const result = noticHelper.create('introductionSupportregistered')

      // 期待結果
      expect(result).toBe('introductionSupportregistered')
    })

    test('standardRegistering: messageStatusがstandardRegisteringの場合', () => {
      // 試験実施
      const result = noticHelper.create('standardRegistering')

      // 期待結果
      expect(result).toBe('standardRegistering')
    })

    test('standardRegistered: messageStatusがstandardRegisteredの場合', () => {
      // 試験実施
      const result = noticHelper.create('standardRegistered')

      // 期待結果
      expect(result).toBe('standardRegistered')
    })

    test('standardCanceling: messageStatusがstandardCancelingの場合', () => {
      // 試験実施
      const result = noticHelper.create('standardCanceling')

      // 期待結果
      expect(result).toBe('standardCanceling')
    })

    test('standardUnregistered: messageStatusがstandardUnregisteredの場合', () => {
      // 試験実施
      const result = noticHelper.create('standardUnregistered')

      // 期待結果
      expect(result).toBe('standardUnregistered')
    })

    test('haveStandard: messageStatusがhaveStandardの場合', () => {
      // 試験実施
      const result = noticHelper.create('haveStandard')

      // 期待結果
      expect(result).toBe('haveStandard')
    })

    test('haveIntroductionSupport: messageStatusがhaveIntroductionSupportの場合', () => {
      // 試験実施
      const result = noticHelper.create('haveIntroductionSupport')

      // 期待結果
      expect(result).toBe('haveIntroductionSupport')
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

    test('registerprocedure：messageStatusがregisterprocedureの場合', async () => {
      // 準備
      // userId,tenantIdに正常値を入れる
      const messageStatus = 'registerprocedure'

      // 試験実施
      noticHelper.render(messageStatus, request, response, next)

      // 期待結果
      // 用意したエラー情報でrenderが呼ばれ「ない」（500エラーの時は404のメッセージとなる）
      expect(response.render).toHaveBeenCalledWith('notice', {
        message: '現在利用登録手続き中です。',
        description1: '利用登録完了後、本機能はご利用可能となります。',
        description2: null
      })
    })

    test('changeprocedure：messageStatusがchangeprocedureの場合', async () => {
      // 準備
      // userId,tenantIdに正常値を入れる
      const messageStatus = 'changeprocedure'

      // 試験実施
      noticHelper.render(messageStatus, request, response, next)

      // 期待結果
      // 用意したエラー情報でrenderが呼ばれ「ない」（500エラーの時は404のメッセージとなる）
      expect(response.render).toHaveBeenCalledWith('notice', {
        message: '現在契約情報変更手続き中です。',
        description1: '契約情報変更完了後、本機能は再度ご利用可能となります。',
        description2: null
      })
    })

    test('generaluser：messageStatusがgeneraluserの場合', async () => {
      // 準備
      // userId,tenantIdに正常値を入れる
      const messageStatus = 'generaluser'

      // 試験実施
      noticHelper.render(messageStatus, request, response, next)

      // 期待結果
      // 用意したエラー情報でrenderが呼ばれ「ない」（500エラーの時は404のメッセージとなる）
      expect(response.render).toHaveBeenCalledWith('notice', {
        message: '本機能はご利用いただけません。',
        description1: 'テナント管理者権限のあるユーザで再度操作をお試しください。',
        description2: null
      })
    })

    test('introductionSupportregistered: messageStatusがintroductionSupportregisteredの場合', () => {
      // 準備
      const messageStatus = 'introductionSupportregistered'

      // 試験実施
      noticHelper.render(messageStatus, request, response, next)

      // 期待結果
      expect(response.render).toHaveBeenCalledWith('notice', {
        message: '導入支援サービスは申し込み済です。',
        description1: null,
        description2: null
      })
    })

    test('standardRegistering: messageStatusがstandardRegisteringの場合', () => {
      // 準備
      const messageStatus = 'standardRegistering'

      // 試験実施
      noticHelper.render(messageStatus, request, response, next)

      // 期待結果
      expect(response.render).toHaveBeenCalledWith('notice', {
        message: '現在スタンダードプランは申込中です。',
        description1: null,
        description2: null
      })
    })

    test('standardRegistered: messageStatusがstandardRegisteredの場合', () => {
      // 準備
      const messageStatus = 'standardRegistered'

      // 試験実施
      noticHelper.render(messageStatus, request, response, next)

      // 期待結果
      expect(response.render).toHaveBeenCalledWith('notice', {
        message: '現在スタンダードプランは契約中です。',
        description1: null,
        description2: null
      })
    })

    test('standardCanceling: messageStatusがstandardCancelingの場合', () => {
      // 準備
      const messageStatus = 'standardCanceling'

      // 試験実施
      noticHelper.render(messageStatus, request, response, next)

      // 期待結果
      expect(response.render).toHaveBeenCalledWith('notice', {
        message: '現在スタンダードプランは解約中です。',
        description1: null,
        description2: null
      })
    })

    test('standardUnregistered: messageStatusがstandardUnregisteredの場合', () => {
      // 準備
      const messageStatus = 'standardUnregistered'

      // 試験実施
      noticHelper.render(messageStatus, request, response, next)

      // 期待結果
      expect(response.render).toHaveBeenCalledWith('notice', {
        message: '現在スタンダードプランは未契約です。',
        description1: null,
        description2: null
      })
    })

    test('haveStandard: messageStatusがhaveStandardの場合', () => {
      // 準備
      const messageStatus = 'haveStandard'

      // 試験実施
      noticHelper.render(messageStatus, request, response, next)

      // 期待結果
      expect(response.render).toHaveBeenCalledWith('notice', {
        message: 'スタンダードプラン契約中のため解約できません。',
        description1: null,
        description2: null
      })
    })

    test('haveIntroductionSupport: messageStatusがhaveIntroductionSupportの場合', () => {
      // 準備
      const messageStatus = 'haveIntroductionSupport'

      // 試験実施
      noticHelper.render(messageStatus, request, response, next)

      // 期待結果
      expect(response.render).toHaveBeenCalledWith('notice', {
        message: '導入支援サービス契約処理中のため解約できません。',
        description1: null,
        description2: null
      })
    })

    test('500エラー', async () => {
      // 準備
      const messageStatus = { status: 500 }

      // 試験実施
      noticHelper.render(messageStatus, request, response, next)

      // 期待結果
      // 500エラーがエラーハンドリング「される」
      expect(next).toHaveBeenCalledWith(errorHelper.create(500))
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
