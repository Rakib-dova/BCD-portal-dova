'use strict'

const logger = require('../../lib/logger')

// Require our controllers.

module.exports = {
  /**
   * 引数の「status」でエラーの内容を判定する
   * @param {int} status HTTPステータス
   * @returns {object} エラー
   */
  create: (status) => {
    let e
    switch (status) {
      case 400:
        e = new Error('不正なページからアクセスされたか、セッションタイムアウトが発生しました。')
        e.name = 'Bad Request'
        e.status = 400
        e.desc = '上部メニューのHOMEボタンを押下し、再度操作をやり直してください。'
        break
      case 404:
        e = new Error('お探しのページは見つかりませんでした。')
        e.name = 'Not Found'
        e.status = 404
        e.desc = '上部メニューのHOMEボタンを押下し、トップページへお戻りください。'
        break
      default:
        e = new Error('サーバ内部でエラーが発生しました。')
        e.name = 'Internal Server Error'
        e.status = 500
        break
    }
    return e
  },

  /**
   * レンダー処理
   * @param {object} err エラー情報
   * @param {object} req HTTPリクエストオブジェクト
   * @param {object} res HTTPレスポンスオブジェクト
   * @param {function} next 次の処理
   * @returns {object} エラー画面表示
   */
  render: (err, req, res, next) => {
    let errorStatus, errorMessage, errorDescription

    if (!err.status) {
      const dummyErr = module.exports.create(500)
      errorStatus = dummyErr.status
      errorMessage = dummyErr.message
    } else {
      errorStatus = err.status
      errorMessage = err.message
    }

    // output log
    // ログには生のエラー情報を吐く
    const logMessage = { status: errorStatus, path: req.path }

    // ログインしていればユーザID、テナントIDを吐く
    if (req.user?.userId && req.user?.tenantId) {
      logMessage.tenant = req.user.tenantId
      logMessage.user = req.user.userId
    }

    // error発生時のみstackを吐く
    if (errorStatus >= 500) {
      logMessage.stack = err.stack
      logger.error(logMessage, err.name)
    } else {
      logger.warn(logMessage, err.name)
    }

    if (errorStatus >= 500) {
      // 脆弱性対策のため、500エラーの時は404エラーの文言を画面に表示する
      errorMessage = 'お探しのページは見つかりませんでした。'
      errorDescription = '上部メニューのHOMEボタンを押下し、トップページへお戻りください。'
    } else if (err.code === 'EBADCSRFTOKEN') {
      // csurfモジュールによる403エラーの時は400エラーの文言を画面に表示する
      errorMessage = '不正なページからアクセスされたか、セッションタイムアウトが発生しました。'
      errorDescription = '上部メニューのHOMEボタンを押下し、再度操作をやり直してください。'
    } else if (err.desc) {
      errorDescription = err.desc
    }

    // ステータスコードの設定
    if (process.env.LOCALLY_HOSTED === 'true') {
      // ローカル環境ではそのまま返す
      res.status(errorStatus)
    } else {
      // 脆弱性対策のため200で返却する
      res.status(200)
    }

    // エラーページには詳細な情報は提示しない
    res.render('error', {
      message: errorMessage,
      description: !errorDescription ? null : errorDescription
    })
  }
}
