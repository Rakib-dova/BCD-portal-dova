'use strict'
const {
  Terms,
  User,
  Sequelize: { Op }
} = require('../models')
const { handler, currentTenantId } = require('./helpers/util')
const express = require('express')

// CSRF対策
const csrf = require('csurf')
const csrfProtection = csrf({ cookie: false })

const middleware = require('./helpers/middleware')

/**
 * 初期表示
 */
const display = async (req, res, next) => {
  const tos = await Terms.findOne({
    where: {
      effectiveAt: {
        [Op.lte]: new Date()
      }
    },
    order: [['effectiveAt', 'DESC']],
    limit: 1
  })

  await res.render('tos.hbs', { tos: tos, csrfToken: req.csrfToken() })
}

/**
 * 許諾
 */
const agree = async (req, res, next) => {
  await User.update(
    {
      tosVersion: req.body.version
    },
    {
      where: { uuid: currentTenantId(req) }
    }
  )
  await res.redirect('/bugyo/menu')
}

const router = express.Router()
router.get('/', ...middleware, csrfProtection, handler(display))
router.post('/', ...middleware, csrfProtection, handler(agree))

module.exports = router
