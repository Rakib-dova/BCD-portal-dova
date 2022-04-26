'use strict'
const express = require('express')
const router = express.Router()

const helper = require('./helpers/middleware')
// Require our controllers.
const userController = require('../controllers/userController.js')
const apiManager = require('../controllers/apiManager')
const noticeHelper = require('./helpers/notice')
const logger = require('../lib/logger')

const errorHelper = require('./helpers/error')

const constantsDefine = require('../constants')
const contractInformationnewOrder = require('../orderTemplate/contractInformationnewOrder.json')

// CSR対策
const csrf = require('csurf')
const csrfProtection = csrf({ cookie: false })

const cbGetRegister = async (req, res, next) => {
  if (req.session?.userContext !== 'NotTenantRegistered') {
    return next(errorHelper.create(400))
  }

  if (!req.user?.accessToken || !req.user?.refreshToken) {
    return next(errorHelper.create(500))
  }

  const userdata = await apiManager.accessTradeshift(
    req.user.accessToken,
    req.user.refreshToken,
    'get',
    '/account/info/user'
  )

  // Tradeshift APIへのアクセスエラーは、エラーオブジェクトが返る
  if (userdata instanceof Error) {
    return next(errorHelper.create(500))
  }

  if (userdata.Memberships?.[0].Role?.toLowerCase() !== constantsDefine.userRoleConstants.tenantManager) {
    return next(noticeHelper.create('generaluser'))
  }

  switch (await helper.checkContractStatus(req.user.tenantId)) {
    case '00':
    case '10':
    case '11':
    case '30':
    case '31':
    case '40':
    case '41':
      return next(errorHelper.create(500))
    default:
      break
  }

  const companyName = userdata.CompanyName
  const userName = userdata.LastName + ' ' + userdata.FirstName
  const email = userdata.Username // TradeshiftのAPIではUsernameにemailが入っている

  const companydata = await apiManager.accessTradeshift(
    req.user.accessToken,
    req.user.refreshToken,
    'get',
    '/account/info'
  )
  // Tradeshift APIへのアクセスエラーは、エラーオブジェクトが返る
  if (companydata instanceof Error) return next(errorHelper.create(500))

  // city,street,zipは空値の可能性がある
  // ただし全て空値か、全て値が入っているかの二択
  let city, street, zip
  try {
    city = companydata.AddressLines.filter((item) => item.scheme === 'city')[0].value
    street = companydata.AddressLines.filter((item) => item.scheme === 'street')[0].value
    zip = companydata.AddressLines.filter((item) => item.scheme === 'zip')[0].value.replace(/-/g, '') // 郵便番号はハイフンなし
  } catch {
    city = street = zip = ''
  }
  const address = city + ' ' + street

  res.render('tenant-register', {
    title: '利用登録',
    companyName: companyName,
    userName: userName,
    email: email,
    zip: zip,
    address: address,
    customerId: 'none',
    csrfToken: req.csrfToken()
  })
}

const cbPostRegister = async (req, res, next) => {
  if (req.session?.userContext !== 'NotTenantRegistered') {
    return next(errorHelper.create(400))
  }

  if (!req.user?.accessToken || !req.user?.refreshToken) {
    return next(errorHelper.create(500))
  }

  const userdata = await apiManager.accessTradeshift(
    req.user.accessToken,
    req.user.refreshToken,
    'get',
    '/account/info/user'
  )
  // Tradeshift APIへのアクセスエラーは、エラーオブジェクトが返る
  if (userdata instanceof Error) return next(errorHelper.create(500))

  if (userdata.Memberships?.[0].Role?.toLowerCase() !== constantsDefine.userRoleConstants.tenantManager) {
    return next(noticeHelper.create('generaluser'))
  }

  switch (await helper.checkContractStatus(req.user.tenantId)) {
    case '00':
    case '10':
    case '11':
    case '30':
    case '31':
    case '40':
    case '41':
      return next(errorHelper.create(500))
    default:
      break
  }

  if (req.body?.termsCheck !== 'on') return next(errorHelper.create(400))

  // contractBasicInfo 設定
  contractInformationnewOrder.contractBasicInfo.tradeshiftId = req.user.tenantId
  contractInformationnewOrder.contractBasicInfo.orderType = constantsDefine.statusConstants.orderTypeNewOrder
  contractInformationnewOrder.contractBasicInfo.campaignCode = req.body.campaignCode
  contractInformationnewOrder.contractBasicInfo.salesPersonName = req.body.salesPersonName.replace(/\s+/g, '')
  contractInformationnewOrder.contractBasicInfo.kaianPassword = req.body.password

  // contractorName
  contractInformationnewOrder.contractAccountInfo.contractorName = req.body.contractorName
  // contractorKanaName
  contractInformationnewOrder.contractAccountInfo.contractorKanaName = req.body.contractorKanaName
  // postalName
  contractInformationnewOrder.contractAccountInfo.postalNumber = req.body.postalNumber
  // contractAddress
  contractInformationnewOrder.contractAccountInfo.contractAddress = req.body.contractAddressVal
  // banchi1
  contractInformationnewOrder.contractAccountInfo.banch1 = req.body.banch1
  // tatemono1
  contractInformationnewOrder.contractAccountInfo.tatemono1 = req.body.tatemono1

  // contactPersonName
  contractInformationnewOrder.contactList[0].contactPersonName = req.body.contactPersonName
  contractInformationnewOrder.contactList[0].contactPhoneNumber = req.body.contactPhoneNumber
  contractInformationnewOrder.contactList[0].contactMail = req.body.contactMail

  // ユーザ登録と同時にテナント登録も行われる
  const user = await userController.create(req.user.accessToken, req.user.refreshToken, contractInformationnewOrder)

  // データベースエラーは、エラーオブジェクトが返る
  if (user instanceof Error) return next(errorHelper.create(500))

  if (user === null) return next(errorHelper.create(500))

  // ユーザはfindOrCreateで登録されるため戻り値userには配列が入る
  // 重複加入については登録時、userControllerで'99'以外の契約がある場合重複登録に見て、「null」を返して500エラーにする
  if (user[0]?.dataValues?.userId !== req.user.userId) return next(errorHelper.create(500))

  // テナント＆ユーザ登録成功したら
  logger.info({ tenant: req.user?.tenantId, user: req.user?.userId }, 'Tenant Registration Succeeded')
  req.session.userContext = 'TenantRegistrationCompleted'
  req.flash('info', '利用登録が完了いたしました。')

  return res.redirect(303, '/portal')
}

router.get('/register', helper.isAuthenticated, csrfProtection, cbGetRegister)

// helper.isAuthenticatedがミドルウェアとして入っているとセッションタイムアウトが判定できない
router.post('/register', csrfProtection, cbPostRegister)

module.exports = {
  router: router,
  cbGetRegister: cbGetRegister,
  cbPostRegister: cbPostRegister
}
