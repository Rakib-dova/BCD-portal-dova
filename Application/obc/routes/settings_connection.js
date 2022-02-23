'use strict'
const express = require('express')
const ts = require('../controllers/apihelper').tradeshiftApi()
const obc = require('../controllers/apihelper').bugyoApi()
const customer = require('./helpers/customer')
const Formats = require('./helpers/formats')
const { handler, api } = require('./helpers/util')

// CSRF対策
const csrf = require('csurf')
const csrfProtection = csrf({ cookie: false })

const middleware = require('./helpers/middleware')

/**
 * Tradeshiftの住所を書式化する
 */
const formatAddress = (company) => {
  const map = Object.fromEntries(company.AddressLines.map((e) => [e.scheme, e.value]))
  return [map['city'], map['street'], map['locality']].join('')
}

/**
 * Tradeshift上で接続済みの企業情報を取得する
 */
const getConnections = async (req) => {
  const connections = await ts.findConnections(req)
  return await Promise.all(
    connections.Connections.Connection.map(async (item) => {
      const detail = await ts.getCompany(req, item.CompanyAccountId)
      return {
        companyAccountId: item.CompanyAccountId,
        companyName: item.CompanyName,
        address: formatAddress(detail)
      }
    })
  )
}

/**
 * 奉行クラウドから得意先データを取得する
 */
const getCustomers = async (req) => {
  const searchBody = customer.searchBody()
  const customers = await obc.exportCustomer(req, searchBody)
  return customer.convertFrom(customers)
}

/**
 * 登録済み請求書フォーマットを取得する
 */
const getFormats = async (req) => {
  const formats = await Formats.list(req)
  return formats.map((format) => {
    return {
      id: format.id,
      name: format.name
    }
  })
}

/**
 * 初期表示
 */
const display = async (req, res, next) => {
  // トレードシフトコネクション
  const connections = await getConnections(req)
  // 商奉行得意先データ
  const customers = await getCustomers(req)
  // フォーマット
  const formats = await getFormats(req)
  const assignMap = await Formats.assignMap(req)
  // 返却値を組み合わせる
  customers.forEach((value, index) => {
    value['connections'] = connections.map((item) => {
      return Object.assign(
        {
          url: `${ts.baseUrl()}/#/profile/Tradeshift.CompanyProfile/profile/${item.companyAccountId}`,
          selected: item.companyAccountId === value.companyId
        },
        item
      )
    })
    value['formats'] = formats.map((format) => {
      return Object.assign(
        {
          selected: assignMap[value.companyId] == format.id
        },
        format
      )
    })
  })
  await res.render('settings_connection.hbs', { customers: customers, formats: formats, csrfToken: req.csrfToken() })
}

/**
 * 保存処理
 */
const save = async (req, res, next) => {
  const data = req.body
  await obc.importCustomer(req, customer.convertTo(data.tenants))
  await Formats.assign(req, data.formats)
  res.send({ status: 'ok', message: '得意先の紐付けが完了しました。' })
}

const router = express.Router()
router.get('/', ...middleware, csrfProtection, handler(display))
router.post('/save', ...api([...middleware, csrfProtection], save, '得意先の紐付けに失敗しました。'))

module.exports = router
