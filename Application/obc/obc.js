'use strict'
const path = require('path')
const express = require('express')
const hbs = require('hbs')

const router = express.Router()

hbs.registerPartials(path.join(__dirname, 'views/partials'))
hbs.registerHelper('currency', (number) => number?.toLocaleString())

router.use('/auth', require('./routes/auth'))
// メイン画面
router.use('/menu', require('./routes/menu'))
// 利用許諾画面
router.use('/tos', require('./routes/tos'))
// 請求書フォーマット一覧
router.use('/invoice_format_list', require('./routes/invoice_format_list'))
// 請求書フォーマット
router.use('/invoice_format', require('./routes/invoice_format'))
// 請求書送信
router.use('/send_invoice', require('./routes/send_invoice'))
// 設定 得意先紐付け
router.use('/settings_connection', require('./routes/settings_connection'))

module.exports = router
