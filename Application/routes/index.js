'use strict'

const express = require('express')
const router = express.Router()

const cbGetIndex = (req, res, next) => {
  const transition = req.query.transition
  const dxstoreFlg = req.query.dxstoreFlg

  // if (dxstoreFlg === 'true') {
  //   // dxストアから遷移した場合、Cookieをセット
  //   res.cookie('customReferrer', 'dxstore', {
  //     secure: true,
  //     sameSite: 'none',
  //     httpOnly: true,
  //     maxAge: 86400000
  //   })
  // }

  res.cookie('customReferrer', 'dxstore', {
    secure: true,
    sameSite: 'none',
    httpOnly: false,
    maxAge: 86400000
  })

  if (transition === 'sinup') {
    // アカウント登録ページに遷移
    res.redirect(303, 'https://sandbox.tradeshift.com/register')
  } else if (transition === 'login') {
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
