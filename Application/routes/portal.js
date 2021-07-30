'use strict'
const express = require('express')
const router = express.Router()
const helper = require('./helpers/middleware')

const errorHelper = require('./helpers/error')
const noticeHelper = require('./helpers/notice')

const userController = require('../controllers/userController.js')
const contractController = require('../controllers/contractController.js')

const constantsDefine = require('../constants')

const cbGetIndex = async (req, res, next) => {
  if (!req.session || !req.user?.userId) {
    return next(errorHelper.create(500))
  }

  // portal遷移前にはuserは取得できることは確定
  const user = await userController.findOne(req.user.userId)
  // データベースエラーは、エラーオブジェクトが返る
  // portalではuser未登録の場合もエラーを上げる
  if (user instanceof Error || user === null) return next(errorHelper.create(500))

  // TX依頼後に改修、ユーザステイタスが0以外の場合、「404」エラーとする not 403
  if (user.dataValues?.userStatus !== 0) return next(errorHelper.create(404))

  // DBから契約情報取得
  const contract = await contractController.findOne(req.user.tenantId)
  // データベースエラーは、エラーオブジェクトが返る
  // 契約情報未登録の場合もエラーを上げる
  if (contract instanceof Error || contract === null) return next(errorHelper.create(500))

  req.session.userContext = 'LoggedIn'

  // ユーザ権限を取得
  req.session.userRole = user.dataValues?.userRole

  if (
    (contract.dataValues.contractStatus === constantsDefine.statusConstants.contractStatusCancellationOrder ||
      contract.dataValues.contractStatus === constantsDefine.statusConstants.contractStatusCancellationReceive) &&
    !contract.dataValues.deleteFlag
  ) {
    return next(noticeHelper.create('cancelprocedure'))
  } else if (
    (contract.dataValues.contractStatus === constantsDefine.statusConstants.contractStatusChangeContractOrder ||
      contract.dataValues.contractStatus === constantsDefine.statusConstants.contractStatusChangeContractReceive) &&
    !contract.dataValues.deleteFlag
  ) {
    return next(noticeHelper.create('changeprocedure'))
  }

  // ユーザ権限も画面に送る
  res.render('portal', {
    title: 'ポータル',
    tenantId: req.user.tenantId,
    userRole: req.session.userRole,
    numberN: contract.dataValues?.numberN,
    TS_HOST: process.env.TS_HOST
  })
}

router.get('/', helper.isAuthenticated, helper.isTenantRegistered, helper.isUserRegistered, cbGetIndex)

module.exports = {
  router: router,
  cbGetIndex: cbGetIndex
}
