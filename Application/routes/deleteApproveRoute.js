'use strict'

const express = require('express')
const router = express.Router()
const helper = require('./helpers/middleware')
const validate = require('../lib/validate')
const userController = require('../controllers/userController.js')
const approverController = require('../controllers/approverController')
const contractController = require('../controllers/contractController.js')
const logger = require('../lib/logger')
const constantsDefine = require('../constants')
const errorHelper = require('./helpers/error')
const noticeHelper = require('./helpers/notice')

const cbDeleteApproveRoute = async (req, res, next) => {
  logger.info(constantsDefine.logMessage.INF000 + 'cbDeleteApproveRoute')

  if (!req.session || !req.user?.userId) {
    return res.send({
      result: 0
    })
  }
  // DBからuserデータ取得
  const user = await userController.findOne(req.user.userId)
  // データベースエラーは、エラーオブジェクトが返る
  // user未登録の場合もエラーを上げる
  if (user instanceof Error || user === null) {
    return res.send({
      result: 0
    })
  }

  // TX依頼後に改修、ユーザステイタスが0以外の場合、「404」エラーとする not 403
  if (user.dataValues?.userStatus !== 0) {
    return res.send({
      result: 0
    })
  }

  // DBから契約情報取得
  const contract = await contractController.findOne(req.user.tenantId)
  // データベースエラーは、エラーオブジェクトが返る
  // 契約情報未登録の場合もエラーを上げる
  if (contract instanceof Error || contract === null) {
    return res.send({
      result: 0
    })
  }

  // ユーザ権限を取得
  req.session.userRole = user.dataValues?.userRole
  const deleteFlag = contract.dataValues.deleteFlag
  const contractStatus = contract.dataValues.contractStatus
  const checkContractStatus = await helper.checkContractStatus(req.user.tenantId)

  if (checkContractStatus === null || checkContractStatus === 999) {
    return res.send({
      result: 0
    })
  }

  if (!validate.isStatusForCancel(contractStatus, deleteFlag)) {
    return res.send({
      result: 0
    })
  }

  // 確認画面から渡された approveRouteId 取得
  const approveRouteId = req.params.approveRouteId
  if (!validate.isUUID(approveRouteId)) {
    return res.send({
      result: 0
    })
  }

  // 削除処理
  // resultOfDeletedApproveRoute : 削除処理結果
  //              -1 : 削除対象のがない場合
  //               1 : 正常_削除成功
  //               0 : エラー
  const resultOfDeletedApproveRoute = await approverController.deleteApproveRoute(approveRouteId)

  // 結果確認（正常）
  if (resultOfDeletedApproveRoute === 1) {
    req.flash('info', '承認ルートを削除しました。')
  }

  res.send({
    result: resultOfDeletedApproveRoute
  })

  logger.info(constantsDefine.logMessage.INF001 + 'cbDeleteApproveRoute')
}

const cbGetCheckApproveRoute = async (req, res, next) => {
  logger.info(constantsDefine.logMessage.INF000 + 'cbGetCheckApproveRoute')

  if (!req.session || !req.user?.userId) return next(errorHelper.create(500))

  // DBからuserデータ取得
  const user = await userController.findOne(req.user.userId)
  // データベースエラーは、エラーオブジェクトが返る
  // user未登録の場合もエラーを上げる
  if (user instanceof Error || user === null) return next(errorHelper.create(500))

  // TX依頼後に改修、ユーザステイタスが0以外の場合、「404」エラーとする not 403
  if (user.dataValues?.userStatus !== 0) return next(errorHelper.create(404))

  // DBから契約情報取得
  const contract = await contractController.findOne(req.user.tenantId)
  // データベースエラーは、エラーオブジェクトが返る
  // 契約情報未登録の場合もエラーを上げる
  if (contract instanceof Error || contract === null) return next(errorHelper.create(500))

  // ユーザ権限を取得
  req.session.userRole = user.dataValues?.userRole
  const deleteFlag = contract.dataValues.deleteFlag
  const contractStatus = contract.dataValues.contractStatus
  const checkContractStatus = await helper.checkContractStatus(req.user.tenantId)

  if (checkContractStatus === null || checkContractStatus === 999) return next(errorHelper.create(500))

  if (!validate.isStatusForCancel(contractStatus, deleteFlag)) return next(noticeHelper.create('cancelprocedure'))

  // 確認画面から渡されたapporveRouteId取得
  const approveRouteId = req.params.approveRouteId
  if (!validate.isUUID(approveRouteId)) {
    return res.send({
      result: 0
    })
  }

  // 承認ルートが削除されているのか確認
  let resultOfCheckedApproveRoute = await approverController.checkApproveRoute(contract.contractId, approveRouteId)
  if (resultOfCheckedApproveRoute) {
    resultOfCheckedApproveRoute = 1
  } else {
    resultOfCheckedApproveRoute = -1
  }

  // result 1は存在すること、0はシステムエラー, -1は既に削除されたもの
  res.send({
    result: resultOfCheckedApproveRoute
  })
  logger.info(constantsDefine.logMessage.INF001 + 'cbGetCheckApproveRoute')
}

router.delete('/:approveRouteId', cbDeleteApproveRoute)
router.get('/:approveRouteId', cbGetCheckApproveRoute)

module.exports = {
  router: router,
  cbDeleteApproveRoute: cbDeleteApproveRoute,
  cbGetCheckApproveRoute: cbGetCheckApproveRoute
}
