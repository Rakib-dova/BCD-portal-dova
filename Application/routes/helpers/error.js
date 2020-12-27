﻿'use strict'

const logger = require('../../lib/logger')

// Require our controllers.

module.exports = {
  create: (status) => {
    let e
    switch (status) {
      case 400:
        e = new Error('不正なリクエストが実行されました。')
        e.name = 'Bad Request'
        e.status = 400
        break
      case 404:
        e = new Error('お探しのページは見つかりませんでした。')
        e.name = 'Not Found'
        e.status = 404
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
    let errorStatus, errorTitle, errorMessage

    if (!err.status) {
      const dummyErr = module.exports.create(500)
      errorStatus = dummyErr.status
      errorMessage = dummyErr.message
      errorTitle = dummyErr.name
    } else {
      errorStatus = err.status
      errorMessage = err.message
      errorTitle = err.name
    }

    // render page
    res.status(errorStatus)

    // エラーページには詳細な情報は提示しない
    res.render('error', {
      title: errorTitle,
      message: errorMessage,
      status: errorStatus,
      error: process.env.LOCALLY_HOSTED === 'true' ? err : {}
    })

    // output log
    // ログには生のエラー情報を吐く
    if (req.user?.userId && req.user?.companyId) {
      if (errorStatus >= 500) {
        logger.error(
          { tenant: req.user.companyId, user: req.user.userId, stack: err.stack, status: errorStatus },
          err.name
        )
      } else {
        logger.warn({ tenant: req.user.companyId, user: req.user.userId, status: errorStatus }, err.name)
      }
    } else {
      if (errorStatus >= 500) {
        logger.error({ stack: err.stack, status: errorStatus }, err.name)
      } else {
        logger.warn({ status: errorStatus }, err.name)
      }
    }
  },
  checkUserContext: (userContext, requiredContext, next) => {
    if (userContext !== requiredContext) {
      return next(module.exports.create(400))
    }
  },
  checkUserTokens: (accessToken, refreshToken, next) => {
    // TODO: uuidのバリデーションチェック
    if (!accessToken || !refreshToken) {
      return next(module.exports.create(500))
    }
  }
}
