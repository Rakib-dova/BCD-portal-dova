'use strict'
const express = require('express')
const router = express.Router()
const helper = require('./helpers/middleware')
const errorHelper = require('./helpers/error')
// const noticeHelper = require('./helpers/notice')
const OrderData = require('./helpers/OrderData')
const logger = require('../lib/logger')
const applyOrderController = require('../controllers/applyOrderController.js')
const constantsDefine = require('../constants')
const checkContractStatus = async (req, res, next) => {
//   // TODO 契約中の場合(申し込み～解約処理完了まで)
//   const contractStatus = ''
//   if (contractStatus) {
//     return next(noticeHelper.create('lightPlanRegistered'))
//   }
  next()
}

const showIntroductionSupport = async (req, res, next) => {
  logger.info(constantsDefine.logMessage.INF000 + 'showIntroductionSupport')
  const salesChannelDeptList = [
    { code: '001', name: 'Com第一営業本部' },
    { code: '002', name: 'Com第二営業本部' },
    { code: '003', name: 'Com第三営業本部' }
  ]
  // 導入支援サービス申し込み画面表示
  res.render('introductionSupport', {
    title: '導入支援サービス申し込み',
    salesChannelDeptList: salesChannelDeptList
  })
  logger.info(constantsDefine.logMessage.INF001 + 'showIntroductionSupport')
}
const registerIntroductionSupport = async (req, res, next) => {
  logger.info(constantsDefine.logMessage.INF000 + 'registerIntroductionSupport')
  // オーダー情報の取得
  const orderData = new OrderData(
    req.user.tenantId,
    req.body,
    constantsDefine.statusConstants.orderTypeNewOrder,
    constantsDefine.statusConstants.serviceTypeIntroductionSupport,
    constantsDefine.statusConstants.prdtCodeIntroductionSupport,
    constantsDefine.statusConstants.appTypeNew
  )
  console.log(orderData)
  // Contracts,Ordersにデータを登録する
  // const result = await applyOrderController.applyOrderController(req.user?.tenantId, orderData)
  // データベースエラーは、エラーオブジェクトが返る
  // if (result instanceof Error) return next(errorHelper.create(500))
  // 契約とオーダー情報登録成功したら
  req.flash('info', '導入支援サービスの申し込みが完了いたしました。')
  logger.info({ tenant: req.user?.tenantId, user: req.user?.userId }, 'Introduction Support Registration Succeeded')
  // logger.info({ tenant: req.user?.tenantId, user: req.user?.userId }, 'Light Plan Registration Succeeded')
  return res.redirect(303, '/portal')
}
router.get(
  '/',
  helper.isAuthenticated,
  helper.isTenantRegistered,
  helper.isUserRegistered,
  checkContractStatus,
  showIntroductionSupport
)
router.post(
  '/register',
  helper.isAuthenticated,
  helper.isTenantRegistered,
  helper.isUserRegistered,
  checkContractStatus,
  registerIntroductionSupport
)
module.exports = {
  router: router,
  checkContractStatus: checkContractStatus,
  showIntroductionSupport: showIntroductionSupport,
  registerIntroductionSupport: registerIntroductionSupport
}
