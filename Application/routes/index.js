'use strict'
const express = require('express')
const router = express.Router()

const cbGetIndex = (req, res, next) => {
  // 将来的にポータルがトレードシフトから切り離される場合に備えて、indexを確保
  // 現在はポータルへのリダイレクトのみとする
  res.redirect('/portal')
}

router.get('/', cbGetIndex)

module.exports = {
  router: router,
  cbGetIndex: cbGetIndex
}
