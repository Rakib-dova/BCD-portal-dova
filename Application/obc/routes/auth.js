'use strict'
const express = require('express')
const logger = require('../../lib/logger')
const obcApi = require('../controllers/apihelper').bugyoApi()
const { handler } = require('./helpers/util')

const REDIRECT_URL = `https://${process.env.APP_HOST}/bugyo/auth/callback/`
const CLIENT_ID = process.env.OBC_API_CLIENT_ID

const auth = async (req, res, next) => {
  const url = `${process.env.OBC_API_AUTH_URL}?response_type=code&client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URL}`
  res.redirect(303, url)
}

const callback = async (req, res, next) => {
  // 認証コードフローでトークンを発行する
  req.session.bugyo = await obcApi.token(req, {
    grant_type: 'authorization_code',
    code: req.query.code,
    redirect_uri: REDIRECT_URL,
    client_id: CLIENT_ID,
    client_secret: process.env.OBC_API_CLIENT_SECRET
  })
  // テナントIDを取得する
  const tenant = await obcApi.searchTenant(req)
  req.session.bugyo.tenant_id = tenant[0].id
  res.redirect(303, '/bugyo/menu')
}

const router = express.Router()
router.get('/', handler(auth))
router.get('/callback', handler(callback))

module.exports = router
