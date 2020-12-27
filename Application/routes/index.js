'use strict'
const express = require('express')
const router = express.Router()

/* GET home page. */
router.get('/', async (req, res, next) => {
  // 将来的にポータルがトレードシフトから切り離される場合に備えて、indexを確保
  // 現在はポータルへのリダイレクトのみとする
  res.redirect('/portal')
})

module.exports = router
