'use strict'
const portal = require('../../../routes/helpers/middleware')

const isBugyoAuthenticated = async (req, res, next) => {
  const bugyo = req && req.session && req.session.bugyo
  if (bugyo) {
    next()
  } else {
    res.redirect(303, '/bugyo/auth')
  }
}

module.exports = [portal.isAuthenticated, isBugyoAuthenticated]
