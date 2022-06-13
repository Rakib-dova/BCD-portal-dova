'use strict'

const express = require('express')
const router = express.Router()

router.get('/', (req, res) => {
  res.redirect(303, '/portal')
})

router.get('/tenant', (req, res) => {
  res.render('tenant-register')
})

router.post('/tenant/register', (req, res) => {
  res.redirect(303, '/portal')
})

router.get('/portal', (req, res) => {
  res.render('portal', { newsDataArr: [], constructDataArr: [] })
})

module.exports = router
