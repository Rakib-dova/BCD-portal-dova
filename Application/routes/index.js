'use strict'

const express = require('express')
const router = express.Router()

const cbGetIndex = (req, res, next) => {
  const test = req.query.test

  if (test === 'sinup_dxstore') {
    // dxストアから遷移した場合、Cookieをセット
    res.cookie('CustomReferer', 'dxstore', {
      secure: true,
      sameSite: 'none',
      httpOnly: false,
      maxAge: 86400000
    })
    // アカウント登録ページに遷移
    res.redirect(303, 'https://sandbox.tradeshift.com/register')
  } else if (test === 'sinup') {
    // アカウント登録ページに遷移
    res.redirect(303, 'https://sandbox.tradeshift.com/register')
  } else if (test === 'login') {
    // ログインページに遷移
    res.redirect(303, 'https://sandbox.tradeshift.com/?currentScreen=0')
  } else {
    // 将来的にポータルがトレードシフトから切り離される場合に備えて、indexを確保
    // 現在はポータルへのリダイレクトのみとする
    res.redirect(303, '/auth')
  }
}

router.get('/', cbGetIndex)

module.exports = {
  router: router,
  cbGetIndex: cbGetIndex
}
