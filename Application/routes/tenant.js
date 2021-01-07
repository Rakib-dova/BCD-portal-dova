'use strict'
const express = require('express')
const router = express.Router()

const helper = require('./helpers/middleware')
// Require our controllers.
const userController = require('../controllers/userController.js')
const validate = require('../lib/validate')
const apihelper = require('../lib/apihelper')
const logger = require('../lib/logger')

const errorHelper = require('./helpers/error')

const cbGetRegister = async (req, res, next) => {
  if (req.session?.userContext !== 'NotTenantRegistered') {
    return next(errorHelper.create(400))
  }

  if (!req.user?.accessToken || !req.user?.refreshToken) {
    return next(errorHelper.create(500))
  }

  const userdata = await apihelper.accessTradeshift(
    req.user.accessToken,
    req.user.refreshToken,
    'get',
    '/account/info/user'
  )

  if (!userdata) {
    return next(errorHelper.create(500))
  }
  if (userdata.Memberships?.[0].Role?.toLowerCase() !== 'a6a3edcd-00d9-427c-bf03-4ef0112ba16d') {
    // TODO: 画面文言
    const e = new Error('デジタルトレードのご利用にはアカウント管理者による利用登録が必要です。')
    e.name = 'Forbidden'
    e.status = 403
    e.desc = 'アカウント管理者権限のあるユーザで再度操作をお試しください。'
    return next(e)
  }
  const companyName = userdata.CompanyName
  const userName = userdata.LastName + ' ' + userdata.FirstName
  const email = userdata.Username // TradeshiftのAPIではUsernameにemailが入っている

  const companydata = await apihelper.accessTradeshift(
    req.user.accessToken,
    req.user.refreshToken,
    'get',
    '/account/info'
  )

  if (!companydata) {
    return next(errorHelper.create(500))
  }
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
    customerId: 'none'
  })
}

const cbPostRegister = async (req, res, next) => {
  if (req.session?.userContext !== 'NotTenantRegistered') {
    return next(errorHelper.create(400))
  }

  if (!req.user?.accessToken || !req.user?.refreshToken) {
    return next(errorHelper.create(500))
  }
  // TODO: formのバリデーションチェック

  // TODO: SO系にformの内容を送信

  // ユーザ登録と同時にテナント登録も行われる
  const user = await userController.create(req.user.accessToken, req.user.refreshToken)

  // ユーザはfindOrCreateで登録されるため戻り値userには配列が入る
  if (user !== null && validate.isArray(user)) {
    // userの配列[0]にオブジェクト、配列[1]にcreatedのtrue or false
    // falseの場合は、フォームの二重送信に該当
    console.log(user)
    if (user[1] === false) {
      const e = new Error('データが二重送信された可能性があります。')
      e.name = 'Bad Request'
      e.status = 400
      e.desc = '既にご利用のユーザーの登録は完了しています。'
      return next(e)
    }

    if (user[0].dataValues?.userId !== req.user.userId) return next(errorHelper.create(500))

    // テナント＆ユーザ登録成功したら
    logger.info({ tenant: req.user?.companyId, user: req.user?.userId }, 'Tenant Registration Succeeded')
    req.session.userContext = 'TenantRegistrationCompleted'
    req.flash('info', '利用登録が完了いたしました。')

    return res.redirect('/portal')
  } else {
    // 失敗したら
    return next(errorHelper.create(500))
  }
}

router.get('/register', helper.isAuthenticated, cbGetRegister)

router.post('/register', helper.isAuthenticated, cbPostRegister)

module.exports = {
  router: router,
  cbGetRegister: cbGetRegister,
  cbPostRegister: cbPostRegister
}
