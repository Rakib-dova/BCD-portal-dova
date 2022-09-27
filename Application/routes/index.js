'use strict'

const express = require('express')
const router = express.Router()

/**
 * ポータル画面の表示
 * @param {object} req HTTPリクエストオブジェクト
 * @param {object} res HTTPレスポンスオブジェクト
 * @param {function} next 次の処理
 * @returns {object} ポータル画面
 */
const cbGetIndex = (req, res, next) => {
  // 将来的にポータルがトレードシフトから切り離される場合に備えて、indexを確保
  // 現在はポータルへのリダイレクトのみとする
  res.redirect(303, '/auth')
}

router.get('/', cbGetIndex)

module.exports = {
  router: router,
  cbGetIndex: cbGetIndex
}
