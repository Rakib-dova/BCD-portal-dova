'use strict'

const express = require('express')
const router = express.Router()
const helper = require('./helpers/middleware')
const validate = require('../lib/validate')
const userController = require('../controllers/userController.js')
const contractController = require('../controllers/contractController.js')
const logger = require('../lib/logger')
const constantsDefine = require('../constants')
const subAccountCodeController = require('../controllers/subAccountCodeController')
const errorHelper = require('./helpers/error')
const noticeHelper = require('./helpers/notice')

const csrf = require('csurf')
const csrfProtection = csrf({ cookie: false })

const cbDeleteSubAccountCode = async (req, res, next) => {
  logger.info(constantsDefine.logMessage.INF000 + 'cbDeleteSubAccountCode')

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
  // 確認画面から渡されたsubAccountCodeId取得
  const subAccountCodeId = req.params.subAccountCodeId
  if (!validate.isUUID(subAccountCodeId)) {
    return res.send({
      result: 0
    })
  }

  // 削除処理
  // resultOfDeletedSubAccountCode : 削除処理結果
  //              -1 : 削除対象の補助科目がない場合。
  //               1 : 正常（補助科目の削除成功）
  //               0 : エラー
  const resultOfDeletedSubAccountCode = await subAccountCodeController.deleteForSubAccountCode(subAccountCodeId)

  // 結果確認（正常）
  if (resultOfDeletedSubAccountCode === 1) {
    req.flash('info', '補助科目を削除しました。')
  }

  res.send({
    result: resultOfDeletedSubAccountCode
  })

  logger.info(constantsDefine.logMessage.INF001 + 'cbDeleteSubAccountCode')
}

const cbGetCheckSubAccountCode = async (req, res, next) => {
  logger.info(constantsDefine.logMessage.INF000 + 'cbGetCheckSubAccountCode')

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

  // 確認画面から渡されたsubAccountCodeId取得
  const subAccountCodeId = req.params.checkSubAccountCode
  if (!validate.isUUID(subAccountCodeId)) {
    return res.send({
      result: 0
    })
  }

  // 補助科目が削除されているのか確認
  const resultOfCheckedSubAccountCode = await subAccountCodeController.checkDataForSubAccountCode(subAccountCodeId)

  // result 1は存在すること、0はシステムエラー, -1は既に削除されたもの
  res.send({
    result: resultOfCheckedSubAccountCode
  })
  logger.info(constantsDefine.logMessage.INF001 + 'cbGetCheckSubAccountCode')
}

router.delete('/:subAccountCodeId', csrfProtection, cbDeleteSubAccountCode)
router.get('/:checkSubAccountCode', csrfProtection, cbGetCheckSubAccountCode)

module.exports = {
  router: router,
  cbDeleteSubAccountCode: cbDeleteSubAccountCode,
  cbGetCheckSubAccountCode: cbGetCheckSubAccountCode
}
