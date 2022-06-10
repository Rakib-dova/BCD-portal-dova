'use strict'
const express = require('express')
const router = express.Router()
const helper = require('./helpers/middleware')
const contractController = require('../controllers/contractController.js')
const logger = require('../lib/logger')

const noticeHelper = require('./helpers/notice')

const constantsDefine = require('../constants')

const checkContractStatus = async (req, res, next) => {
  // TODO 申し込み前、または申し込み～竣工完了まで
  const contractStatus = ''
  if (contractStatus) {
    return next(noticeHelper.create('lightPlanUnRegistered'))
  }
  next()
}

const showCancelLightPlan = async (req, res, next) => {
  logger.info(constantsDefine.logMessage.INF000 + 'showCancelLightPlan')

  // DBから契約情報取得
  const contract = await contractController.findOne(req.user.tenantId)

  // ライトプラン解約画面表示
  res.render('cancelLightPlan', {
    numberN: contract.dataValues?.numberN
  })
  logger.info(constantsDefine.logMessage.INF001 + 'showCancelLightPlan')
}

const cancelLightPlan = async (req, res, next) => {
  logger.info(constantsDefine.logMessage.INF000 + 'cancelLightPlan')

  req.flash('info', 'ライトプラン解約が完了いたしました。')
  logger.info(constantsDefine.logMessage.INF001 + 'cancelLightPlan')
  return res.redirect(303, '/portal')
}

router.get(
  '/',
  helper.isAuthenticated,
  helper.isTenantRegistered,
  helper.isUserRegistered,
  checkContractStatus,
  showCancelLightPlan
)
router.post(
  '/',
  helper.isAuthenticated,
  helper.isTenantRegistered,
  helper.isUserRegistered,
  checkContractStatus,
  cancelLightPlan
)

module.exports = {
  router: router,
  checkContractStatus: checkContractStatus,
  showCancelLightPlan: showCancelLightPlan,
  cancelLightPlan: cancelLightPlan
}
