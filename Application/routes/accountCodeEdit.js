'use strict'
const express = require('express')
const router = express.Router()
const helper = require('./helpers/middleware')
const errorHelper = require('./helpers/error')
const noticeHelper = require('./helpers/notice')
const userController = require('../controllers/userController.js')
const contractController = require('../controllers/contractController.js')
const logger = require('../lib/logger')
const validate = require('../lib/validate')
const constantsDefine = require('../constants')

const cbGetIndex = async (req, res, next) => {
  logger.info(constantsDefine.logMessage.INF000 + 'cbGetIndex')
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

  // DBから契約情報取得
  const contract = await contractController.findOne(req.user.tenantId)
  // データベースエラーは、エラーオブジェクトが返る
  // 契約情報未登録の場合もエラーを上げる
  if (contract instanceof Error || contract === null) return next(errorHelper.create(500))

  req.session.userContext = 'LoggedIn'

  // ユーザ権限を取得
  req.session.userRole = user.dataValues?.userRole
  const deleteFlag = contract.dataValues.deleteFlag
  const contractStatus = contract.dataValues.contractStatus
  const checkContractStatus = await helper.checkContractStatus(req, res, next)

  if (checkContractStatus === null || checkContractStatus === 999) {
    return next(errorHelper.create(500))
  }

  if (!validate.isStatusForCancel(contractStatus, deleteFlag)) {
    return next(noticeHelper.create('cancelprocedure'))
  }

  // DBからデータ取得（ダミーデータ）
  const result = await dummyDataController(req.params.accountCodeId)

  if (result instanceof Error) return next(errorHelper.create(500))

  // アップロードフォーマットデータを画面に渡す。
  res.render('registAccountCode', {
    codeName: '勘定科目確認・変更',
    codeLabel: '勘定科目コード',
    codeNameLabel: '勘定科目名',
    requiredTagCode: 'accountCodeTagRequired',
    requiredTagName: 'accountCodeNameRequired',
    idForCodeInput: 'setAccountCodeInputId',
    idForNameInput: 'setAccountCodeNameInputId',
    modalTitle: '勘定科目設定確認',
    backUrl: '/accountCodeList',
    valueForCodeInput: result.accountCode,
    valueForNameInput: result.accountCodeName
  })
  logger.info(constantsDefine.logMessage.INF001 + 'cbGetIndex')
}

router.get('/:accountCodeId', helper.isAuthenticated, cbGetIndex)

const dummyDataController = async (accountId) => {
  return { accountCode: 'AA001', accountCodeName: '費用科目' }
}

module.exports = {
  router: router,
  cbGetIndex: cbGetIndex
}
