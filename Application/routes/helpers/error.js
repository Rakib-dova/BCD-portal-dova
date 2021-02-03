'use strict'

const logger = require('../../lib/logger')

// Require our controllers.

module.exports = {
  create: (status) => {
    let e
    switch (status) {
      case 400:
        e = new Error('不正なページからアクセスされたか、セッションタイムアウトが発生しました。')
        e.name = 'Bad Request'
        e.status = 400
        break
      case 404:
        // TX依頼後に改修 404時の画面下部に文言追加
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
  render: (err, req, res, next) => {
    // TX依頼後に改修 エラー画面には「404 Not Found」等のタイトルを表示しない
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
    // TX依頼後に改修 ローカル環境でのエラー時にはpathを吐く
    const logMessage = { status: errorStatus }
    if (process.env.LOCALLY_HOSTED === 'true') logMessage.path = req.path

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

    // TX依頼後に改修 脆弱性対策のため、実際のエラーに関わらず画面には404エラーの文言を表示する
    if (errorStatus !== 404) {
      errorMessage = 'お探しのページは見つかりませんでした。'
      errorDescription = '上部メニューのHOMEボタンを押下し、トップページへお戻りください。'
    } else if (err.desc) {
      errorDescription = err.desc
    }

    // TX依頼後に改修 脆弱性対策のため、エラーがあっても200で返却する
    res.status(200)

    // TX依頼後に改修 エラーページには詳細な情報は提示しない
    res.render('error', {
      message: errorMessage,
      description: !errorDescription ? null : errorDescription
    })
  }
}
