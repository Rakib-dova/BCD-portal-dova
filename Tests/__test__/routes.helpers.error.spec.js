'use strict'
jest.mock('../../Application/node_modules/express', () => {
  return require('jest-express')
})

const Request = require('jest-express').Request
const Response = require('jest-express').Response
const next = require('jest-express').Next
const helper = require('../../Application/routes/helpers/middleware')
const errorHelper = require('../../Application/routes/helpers/error')
const logger = require('../../Application/lib/logger.js')

if (process.env.LOCALLY_HOSTED === 'true') {
  require('dotenv').config({ path: './config/.env' })
}
let request, response, warnSpy, errorSpy, env
describe('helpers/errorのテスト', () => {
  beforeEach(() => {
    env = Object.assign({}, process.env)
    request = new Request()
    response = new Response()
    errorSpy = jest.spyOn(logger, 'error')
    warnSpy = jest.spyOn(logger, 'warn')
  })
  afterEach(() => {
    request.resetMocked()
    response.resetMocked()
    next.mockReset()
    errorSpy.mockRestore()
    warnSpy.mockRestore()
    process.env = env
  })

  describe('create', () => {
    test('400エラー：400を指定した場合', async () => {
      //準備

      // 試験実施
      const result = errorHelper.create(400)

      // 期待結果
      // 400エラーが返される
      expect(result).toEqual(new Error('不正なページからアクセスされたか、セッションタイムアウトが発生しました。'))
      expect(result.desc).toBe('上部メニューのHOMEボタンを押下し、再度操作をやり直してください。')
      expect(result.name).toBe('Bad Request')
      expect(result.status).toBe(400)
    })

    test('404エラー：404を指定した場合', async () => {
      //準備

      // 試験実施
      const result = errorHelper.create(404)

      // 期待結果
      // 404エラーが返される
      const error = new Error('お探しのページは見つかりませんでした。')
      error.name = 'Not Found'
      error.status = 404
      error.desc = '上部メニューのHOMEボタンを押下し、トップページへお戻りください。'
      expect(result).toEqual(new Error('お探しのページは見つかりませんでした。'))
      expect(result.name).toBe('Not Found')
      expect(result.status).toBe(404)
    })

    test('500エラー：400,404以外を指定した場合', async () => {
      //準備

      // 試験実施
      const result = errorHelper.create(500)
      const result2 = errorHelper.create()
      const result3 = errorHelper.create(123)

      // 期待結果
      // 500エラーが返される
      expect(result).toEqual(new Error('サーバ内部でエラーが発生しました。'))
      expect(result.name).toBe('Internal Server Error')
      expect(result.status).toBe(500)

      expect(result2).toEqual(new Error('サーバ内部でエラーが発生しました。'))
      expect(result2.name).toBe('Internal Server Error')
      expect(result2.status).toBe(500)

      expect(result3).toEqual(new Error('サーバ内部でエラーが発生しました。'))
      expect(result3.name).toBe('Internal Server Error')
      expect(result3.status).toBe(500)
    })
  })
  describe('render', () => {
    test('Errorログ:userId&tenantIdがあり、500エラーを指定した場合', async () => {
      //準備
      // userId,tenantIdに正常値を入れる
      request.user = {
        tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089',
        userId: '976d46d7-cb0b-48ad-857d-4b42a44ede13'
      }
      // env.LOCALLY_HOSTEDを'false'にする
      process.env.LOCALLY_HOSTED = 'false'
      // エラーを用意する
      const dummyError = new Error('dummy')
      dummyError.name = 'Dummy name'
      dummyError.status = 500
      dummyError.desc = 'Dummy desc'

      // 試験実施
      errorHelper.render(dummyError, request, response, next)

      // 期待結果
      // response.statusで用意したエラーのstatusが呼ばれ「ない」（ローカル環境ではないため200となる）
      expect(response.status).toHaveBeenCalledWith(200)
      // 用意したエラー情報でrenderが呼ばれ「ない」（ローカル環境ではないため404のメッセージとなる）
      expect(response.render).toHaveBeenCalledWith('error', {
        message: 'お探しのページは見つかりませんでした。',
        description: '上部メニューのHOMEボタンを押下し、トップページへお戻りください。'
      })
      // warnログは呼ばれ「ない」
      expect(warnSpy).not.toHaveBeenCalled()
      // errorログが表示される
      expect(errorSpy).toHaveBeenCalledWith(
        {
          tenant: request.user.tenantId,
          user: request.user.userId,
          stack: dummyError.stack,
          status: dummyError.status
        },
        dummyError.name
      )
    })

    test('Errorログ:userId&tenantIdがなく、500エラーを指定した場合', async () => {
      //準備
      // userにnullを入れる
      request.user = null
      // env.LOCALLY_HOSTEDを'false'にする
      process.env.LOCALLY_HOSTED = 'false'
      // エラーを用意する
      const dummyError = new Error('dummy')
      dummyError.name = 'Dummy name'
      dummyError.status = 500
      dummyError.desc = 'Dummy desc'

      // 試験実施
      errorHelper.render(dummyError, request, response, next)

      // 期待結果
      // response.statusで用意したエラーのstatusが呼ばれ「ない」（ローカル環境ではないため200となる）
      expect(response.status).toHaveBeenCalledWith(200)
      // 用意したエラー情報でrenderが呼ばれ「ない」（ローカル環境ではないため404のメッセージとなる）
      expect(response.render).toHaveBeenCalledWith('error', {
        message: 'お探しのページは見つかりませんでした。',
        description: '上部メニューのHOMEボタンを押下し、トップページへお戻りください。'
      })
      // warnログは呼ばれ「ない」
      expect(warnSpy).not.toHaveBeenCalled()
      // errorログが表示れ「る」
      expect(errorSpy).toHaveBeenCalledWith(
        {
          stack: dummyError.stack,
          status: dummyError.status
        },
        dummyError.name
      )
    })

    test('WARNログ:userId&tenantIdがあり、400エラーを指定した場合', async () => {
      //準備
      // userId,tenantIdに正常値を入れる
      request.user = {
        tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089',
        userId: '976d46d7-cb0b-48ad-857d-4b42a44ede13'
      }
      // env.LOCALLY_HOSTEDを'false'にする
      process.env.LOCALLY_HOSTED = 'false'
      // エラーを用意する
      const dummyError = new Error('dummy')
      dummyError.name = 'Dummy name'
      dummyError.status = 400
      dummyError.desc = 'Dummy desc'

      // 試験実施
      errorHelper.render(dummyError, request, response, next)

      // 期待結果
      // response.statusで用意したエラーのstatusが呼ばれ「ない」(ローカル環境ではないため200となる)
      expect(response.status).toHaveBeenCalledWith(200)
      // 用意したエラー情報でrenderが呼ばれ「る」
      expect(response.render).toHaveBeenCalledWith('error', {
        message: dummyError.message,
        description: dummyError.desc
      })
      // errorログは呼ばれ「ない」
      expect(errorSpy).not.toHaveBeenCalled()
      // warnログが表示れ「る」
      expect(warnSpy).toHaveBeenCalledWith(
        {
          tenant: request.user.tenantId,
          user: request.user.userId,
          status: dummyError.status
        },
        dummyError.name
      )
    })

    test('WARNログ:userId&tenantIdがなく、400エラーを指定した場合', async () => {
      //準備
      // userにnullを入れる
      request.user = null
      // env.LOCALLY_HOSTEDを'false'にする
      process.env.LOCALLY_HOSTED = 'false'
      // エラーを用意する
      const dummyError = new Error('dummy')
      dummyError.name = 'Dummy name'
      dummyError.status = 400
      dummyError.desc = 'Dummy desc'

      // 試験実施
      errorHelper.render(dummyError, request, response, next)

      // 期待結果
      // response.statusで用意したエラーのstatusが呼ばれ「ない」(ローカル環境ではないため200となる)
      expect(response.status).toHaveBeenCalledWith(200)
      // 用意したエラー情報でrenderが呼ばれ「る」
      expect(response.render).toHaveBeenCalledWith('error', {
        message: dummyError.message,
        description: dummyError.desc
      })
      // errorログは呼ばれ「ない」
      expect(errorSpy).not.toHaveBeenCalled()
      // warnログが表示れ「る」
      expect(warnSpy).toHaveBeenCalledWith(
        {
          status: dummyError.status
        },
        dummyError.name
      )
    })

    test('Errorログ:情報の少ないエラーを指定した場合', async () => {
      //準備
      // userにnullを入れる
      request.user = null
      // 試験で引数に渡すエラーを用意する
      const dummyError = new Error('dummy')
      // 期待結果のエラーを用意する
      const error500 = errorHelper.create(500)
      // env.LOCALLY_HOSTEDを'true'にする
      process.env.LOCALLY_HOSTED = 'true'

      // 試験実施
      errorHelper.render(dummyError, request, response, next)

      // 期待結果
      // response.statusで500が呼ばれ「る」
      expect(response.status).toHaveBeenCalledWith(error500.status)
      // 以下の情報でrenderが呼ばれ「る」
      // title,message,statusには、create(500)のエラー情報※渡したエラーにstatusがないため
      // descriptionはnull※desc情報がないため
      // errorには渡したエラー情報※env.LOCALLY_HOSTEDがtrueのため
      expect(response.render).toHaveBeenCalledWith('error', {
        message: error500.message,
        description: null
      })
      // warnログは呼ばれ「ない」
      expect(warnSpy).not.toHaveBeenCalled()
      // 元のエラー情報+status500のerrorログが表示され「る」
      expect(errorSpy).toHaveBeenCalledWith(
        {
          stack: dummyError.stack,
          status: error500.status,
          path: ''
        },
        dummyError.name
      )
    })
    test('ローカル環境ではステータスコードがそのまま返却され、ログにはリクエストのパスが出力される', async () => {
      // 準備
      // userにnullを入れる
      request.user = null
      request.path = '/dummy'
      // env.LOCALLY_HOSTEDを'true'にする
      process.env.LOCALLY_HOSTED = 'true'
      // エラーを用意する
      const dummyError = new Error('dummy')
      dummyError.name = 'Dummy name'
      dummyError.status = 500
      dummyError.desc = 'Dummy desc'

      // 試験実施
      errorHelper.render(dummyError, request, response, next)

      // 期待結果
      // response.statusで用意したエラーのstatusが呼ばれ「る」
      expect(response.status).toHaveBeenCalledWith(dummyError.status)
      // 用意したエラー情報でrenderが呼ばれ「る」
      expect(response.render).toHaveBeenCalledWith('error', {
        message: dummyError.message,
        description: dummyError.desc
      })
      // warnログは呼ばれ「ない」
      expect(warnSpy).not.toHaveBeenCalled()
      // errorログが表示されれ「る」、パスが含まれ「る」
      expect(errorSpy).toHaveBeenCalledWith(
        {
          stack: dummyError.stack,
          status: dummyError.status,
          path: '/dummy'
        },
        dummyError.name
      )
    })
    test('ローカル環境以外ではステータスコードが200で返却され、ログにはリクエストのパスが出力されない', async () => {
      // 準備
      // userにnullを入れる
      request.user = null
      request.path = '/dummy'
      // env.LOCALLY_HOSTEDを'false'にする
      process.env.LOCALLY_HOSTED = 'false'
      // エラーを用意する
      const dummyError = new Error('dummy')
      dummyError.name = 'Dummy name'
      dummyError.status = 500
      dummyError.desc = 'Dummy desc'

      // 試験実施
      errorHelper.render(dummyError, request, response, next)

      // 期待結果
      // response.statusで用意したエラーのstatusが呼ばれ「ない」（200で返却される）
      expect(response.status).toHaveBeenCalledWith(200)
      // 用意したエラー情報でrenderが呼ばれ「ない」（404のメッセージとなる）
      expect(response.render).toHaveBeenCalledWith('error', {
        message: 'お探しのページは見つかりませんでした。',
        description: '上部メニューのHOMEボタンを押下し、トップページへお戻りください。'
      })
      // warnログは呼ばれ「ない」
      expect(warnSpy).not.toHaveBeenCalled()
      // errorログが表示されれ「る」、パスが含まれ「ない」
      expect(errorSpy).toHaveBeenCalledWith(
        {
          stack: dummyError.stack,
          status: dummyError.status
        },
        dummyError.name
      )
    })
  })
})
