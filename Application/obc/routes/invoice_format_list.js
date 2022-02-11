'use strict'
const express = require('express')
const formats = require('./helpers/formats')
const { handler, api } = require('./helpers/util')
require('date-utils')

// CSRF対策
const csrf = require('csurf')
const csrfProtection = csrf({ cookie: false })

const middleware = require('./helpers/middleware')

/**
 * 初期表示
 */
const display = async (req, res) => {
  const rows = await formats.list(req)
  const data = rows.map((format) => {
    return {
      id: format.id,
      name: format.name,
      createdAt: format.createdAt?.toFormat('YYYY/MM/DD HH24:MI:SS') ?? '-',
      createdUser: format.createdUser ?? '-',
      updatedAt: format.updatedAt?.toFormat('YYYY/MM/DD HH24:MI:SS') ?? '-',
      updatedUser: format.updatedUser ?? '-',
      builtin: format.id === 0
    }
  })
  await res.render('invoice_format_list.hbs', { formats: data, csrfToken: req.csrfToken() })
}

/**
 * フォーマット削除
 */
const deleteFormat = async (req, res) => {
  await formats.destroy(req, req.params.formatId)
  res.send({ status: 'ok' })
}

const router = express.Router()
router.get('/', ...middleware, csrfProtection, handler(display))
router.delete('/:formatId', ...middleware, csrfProtection, api(deleteFormat, 'フォーマットの削除に失敗しました。'))

module.exports = router
