'use strict'
const {
  Terms,
  User,
  Sequelize: { Op }
} = require('../models')
const { handler, currentTenantId } = require('./helpers/util')
const express = require('express')
const middleware = require('./helpers/middleware')

/**
 * 初期表示
 */
const display = async (req, res, next) => {
  const tenantId = currentTenantId(req)
  const [user] = await User.findOrCreate({
    where: { uuid: tenantId },
    defaults: {
      uuid: tenantId
    }
  })
  const tos = await Terms.findOne({
    exclude: ['content'],
    where: {
      effectiveAt: {
        [Op.lte]: new Date()
      }
    },
    order: [['effectiveAt', 'DESC']],
    limit: 1
  })

  if (user.tosVersion == tos.version) {
    await res.render('menu.hbs')
  } else {
    await res.redirect('/bugyo/tos')
  }
}

const router = express.Router()
router.get('/', ...middleware, handler(display))

module.exports = router
