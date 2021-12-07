'use strict'

const express = require('express')
const router = express.Router()

const cbGetIndex = (req, res, next) => {
  // 将来的にポータルがトレードシフトから切り離される場合に備えて、indexを確保
  // 現在はポータルへのリダイレクトのみとする
  res.redirect(303, '/auth')
}

const cbGetRegister = (req, res, next) => {
  // アカウント作成 遷移
  res.redirect(303, 'https://sandbox.tradeshift.com/register')
}

const cbGetLogin = (req, res, next) => {
  // ログイン 遷移
  res.redirect(303, 'https://sandbox.tradeshift.com/?currentScreen=0')
}

router.get('/', cbGetIndex)
router.get('/gtm_sinup', cbGetRegister)
router.get('/gtm_login', cbGetLogin)

module.exports = {
  router: router,
  cbGetIndex: cbGetIndex,
  cbGetRegister: cbGetRegister,
  cbGetLogin: cbGetLogin
}
