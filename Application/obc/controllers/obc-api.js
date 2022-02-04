'use strict'
const axios = require('axios')
const chalk = require('chalk')

const api = {}

const getClient = (ctx, isUnAuth = false, isUnTenant = false) => {
  let headers = {
    'X-OBC-SubscriptionKey': process.env.OBC_API_SUBSCRIPTION_KEY
  }
  if (!isUnAuth) {
    const token = ctx && ctx.session && ctx.session.bugyo && ctx.session.bugyo.access_token
    if (!token) {
      throw new Error('Missing authentication - unable to make an API request.')
    }
    headers['Authorization'] = `Bearer ${token}`
    if (!isUnTenant) {
      headers['X-OBC-TenantID'] = ctx.session.bugyo.tenant_id
    }
  }

  const instance = axios.create({
    baseURL: `${process.env.OBC_API_HOST}`,
    headers: headers
  })

  // log requests to tradeshift api
  instance.interceptors.request.use((config) => {
    console.time('奉行クラウド API')
    console.log(`${chalk.cyan('奉行クラウド API')}: ${config.method.toUpperCase()} ${config.baseURL}${config.url}`)
    return config
  })

  // just pass back `data` for simplicity
  instance.interceptors.response.use(
    function (response) {
      console.timeEnd('奉行クラウド API')
      return response.status === 200 ? response.data : response
    },
    function (error) {
      console.log(error)
      console.log(`${error.response.status}:${error.response.statusText}`)
      console.log(error.response.data)
      throw error
    }
  )

  return instance
}

/** Authorization API */
// OAuth2.0 におけるトークンを発行します
api.token = async (ctx, body) => getClient(ctx, true).post('/oauth2/token', body)

/** Common API */
// 利用可能な法人の取得
api.searchTenant = async (ctx) => getClient(ctx, false, true).post('/mg/SearchTenant')

/** 販売・仕入れ・在庫管理 API */
// 請求書データの取得
api.exportBillIssue = async (ctx, body) => getClient(ctx).post('/sdmm/ExportBillIssue', body)
// 得意先データの取得
api.exportCustomer = async (ctx, body) => getClient(ctx).post('/sdmm/exportCustomer', body)
// 得意先データの更新
api.importCustomer = async (ctx, body) => getClient(ctx).post('/sdmm/importCustomer', body)

module.exports = api
