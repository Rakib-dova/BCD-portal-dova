'use strict'

const express = require('express')
const router = express.Router()
const helper = require('./helpers/middleware')

const errorHelper = require('./helpers/error')
const noticeHelper = require('./helpers/notice')
const userController = require('../controllers/userController.js')
const contractController = require('../controllers/contractController.js')
const logger = require('../lib/logger')

const constantsDefine = require('../constants')

const cbGetChangeIndex = async (req, res, next) => {
  logger.info(constantsDefine.logMessage.INF000 + 'cbGetChangeIndex')

  // 認証情報取得処理
  if (!req.session || !req.user?.userId) {
    return next(errorHelper.create(500))
  }

  // DBからuserデータ取得
  const user = await userController.findOne(req.user.userId)
  // データベースエラーは、エラーオブジェクトが返る
  // user未登録の場合もエラーを上げる
  if (user instanceof Error || user === null) return next(errorHelper.create(500))

  // TX依頼後に改修、ユーザステイタスが0以外の場合、「404」エラーとする not 403
  if (user.dataValues?.userStatus !== 0) return next(errorHelper.create(404))
  if (req.session?.userContext !== 'LoggedIn') {
    return next(errorHelper.create(400))
  }

  // DBから契約情報取得
  const contract = await contractController.findOne(req.user.tenantId)
  // データベースエラーは、エラーオブジェクトが返る
  // 契約情報未登録の場合もエラーを上げる
  if (contract instanceof Error || contract === null) return next(errorHelper.create(500))

  // ユーザ権限を取得
  req.session.userRole = user.dataValues?.userRole

  if (
    (contract.dataValues.contractStatus === constantsDefine.statusConstants.contractStatusCancellationOrder ||
      contract.dataValues.contractStatus === constantsDefine.statusConstants.contractStatusCancellationReceive) &&
    !contract.dataValues.deleteFlag
  ) {
    return next(noticeHelper.create(''))
  }

  // ユーザ権限も画面に送る
  res.render('change', {
    tenantId: req.user.tenantId,
    userRole: req.session.userRole,
    numberN: contract.dataValues?.numberN,
    TS_HOST: process.env.TS_HOST
  })
  logger.info(constantsDefine.logMessage.INF001 + 'cbGetChangeIndex')
}

const cbPostChangeIndex = async (req, res, next) => {
  logger.info(constantsDefine.logMessage.INF000 + 'cbPostChangeIndex')

  const userTenantId = req.user.tenantId
  const userId = req.user.userId

  // DBから契約情報取得
  const contract = await contractController.findOne(userTenantId)
  const user = await userController.findOne(userId)

  // データベースエラーは、エラーオブジェクトが返る
  // 契約情報未登録の場合もエラーを上げる
  if (contract instanceof Error || contract === null) return next(errorHelper.create(500))

  console.log(contract)
  if (user.dataValues.userRole !== 'a6a3edcd-00d9-427c-bf03-4ef0112ba16d') {
    return next(errorHelper.create(403))
  }
  // 修正内容をDBに反映
  // チェックボックス body.chkContractName
  // 契約者名 body.contractName
  // 契約者名カナ body.contractKanaName

  logger.info(constantsDefine.logMessage.INF001 + 'cbPostChangeIndex')
  req.flash('info', '契約者情報変更を受け付けました。')
  return res.redirect('/portal')
}

router.get('/', helper.isAuthenticated, helper.isTenantRegistered, helper.isUserRegistered, cbGetChangeIndex)
router.post('/', helper.isAuthenticated, helper.isTenantRegistered, helper.isUserRegistered, cbPostChangeIndex)

module.exports = {
  router: router,
  cbGetChangeIndex: cbGetChangeIndex,
  cbPostChangeIndex: cbPostChangeIndex
}
