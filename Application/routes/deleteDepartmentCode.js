'use strict'

const express = require('express')
const router = express.Router()
const helper = require('./helpers/middleware')
const validate = require('../lib/validate')
const userController = require('../controllers/userController.js')
const contractController = require('../controllers/contractController.js')
const logger = require('../lib/logger')
const constantsDefine = require('../constants')
const departmentCodeController = require('../controllers/departmentCodeController')
const errorHelper = require('./helpers/error')
const noticeHelper = require('./helpers/notice')

const cbDeleteDepartmentCode = async (req, res, next) => {
  logger.info(constantsDefine.logMessage.INF000 + 'cbDeleteDepartmentCode')

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
  // 確認画面から渡されたdepartmentCodeId取得
  const departmentCodeId = req.params.departmentCodeId
  if (!validate.isUUID(departmentCodeId)) {
    return res.send({
      result: 0
    })
  }

  // 削除処理
  // resultOfDeletedDepartmentCode : 削除処理結果
  //              -1 : 削除対象の部門データがない場合。
  //               1 : 正常（部門データの削除成功）
  //               0 : エラー
  const resultOfDeletedDepartmentCode = await departmentCodeController.deleteForDepartmentCode(departmentCodeId)

  // 結果確認（正常）
  if (resultOfDeletedDepartmentCode === 1) {
    req.flash('info', '部門データを削除しました。')
  }

  res.send({
    result: resultOfDeletedDepartmentCode
  })

  logger.info(constantsDefine.logMessage.INF001 + 'cbDeleteDepartmentCode')
}

const cbGetCheckDepartmentCode = async (req, res, next) => {
  logger.info(constantsDefine.logMessage.INF000 + 'cbGetCheckDepartmentCode')

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

  // 確認画面から渡されたdepartmentCodeId取得
  const departmentCodeId = req.params.checkDepartmentCode
  if (!validate.isUUID(departmentCodeId)) {
    return res.send({
      result: 0
    })
  }

  // 部門データが削除されているのか確認
  const resultOfCheckedDepartmentCode = await departmentCodeController.checkDataForDepartmentCode(departmentCodeId)

  // result 1は存在すること、0はシステムエラー, -1は既に削除されたもの
  res.send({
    result: resultOfCheckedDepartmentCode
  })
  logger.info(constantsDefine.logMessage.INF001 + 'cbGetCheckDepartmentCode')
}

router.delete('/:departmentCodeId', cbDeleteDepartmentCode)
router.get('/:checkDepartmentCode', cbGetCheckDepartmentCode)

module.exports = {
  router: router,
  cbDeleteDepartmentCode: cbDeleteDepartmentCode,
  cbGetCheckDepartmentCode: cbGetCheckDepartmentCode
}
