'use strict'

const express = require('express')
const router = express.Router()
const helper = require('./helpers/middleware')
const validate = require('../lib/validate')
const errorHelper = require('./helpers/error')
const noticeHelper = require('./helpers/notice')
const userController = require('../controllers/userController.js')
const contractController = require('../controllers/contractController.js')
const logger = require('../lib/logger')
const constantsDefine = require('../constants')
const codeAccountController = require('../controllers/codeAccountController')

const cbGetCodeAccount = async (req, res, next) => {
  logger.info(constantsDefine.logMessage.INF000 + 'cbGetCodeAccount')

  // 認証情報取得処理
  if (!req.session || !req.user?.userId) return next(errorHelper.create(500))

  // DBからuserデータ取得
  const user = await userController.findOne(req.user.userId)
  // データベースエラーは、エラーオブジェクトが返る
  // user未登録の場合もエラーを上げる
  if (user instanceof Error || user === null) return next(errorHelper.create(500))

  // TX依頼後に改修、ユーザステイタスが0以外の場合、「404」エラーとする not 403
  if (user.dataValues?.userStatus !== 0) return next(errorHelper.create(404))
  if (req.session?.userContext !== 'LoggedIn') return next(errorHelper.create(400))

  // DBから契約情報取得
  const contract = await contractController.findOne(req.user.tenantId)
  // データベースエラーは、エラーオブジェクトが返る
  // 契約情報未登録の場合もエラーを上げる
  if (contract instanceof Error || contract === null) return next(errorHelper.create(500))

  // ユーザ権限を取得
  req.session.userRole = user.dataValues?.userRole
  const deleteFlag = contract.dataValues.deleteFlag
  const contractStatus = contract.dataValues.contractStatus
  const checkContractStatus = helper.checkContractStatus

  if (checkContractStatus === null || checkContractStatus === 999) return next(errorHelper.create(500))

  if (!validate.isStatusForCancel(contractStatus, deleteFlag)) return next(noticeHelper.create('cancelprocedure'))

  res.render('registAccountCode', {
    subjectName: '勘定科目',
    codeLabel: '勘定科目コード',
    nameLabel: '勘定科目名',
    requiredTagCode: 'codeAccountCodeRequired',
    requiredTagName: 'codeAccountNameRequired',
    idForCodeInput: 'codeAccountCode',
    idForNameInput: 'codeAccountName',
    modalTitle: '勘定科目設定確認'
  })

  logger.info(constantsDefine.logMessage.INF001 + 'cbGetCodeAccount')
}

const cbPostCreateCodeAccount = async (req, res, next) => {
  logger.info(constantsDefine.logMessage.INF000 + 'cbPostCreateCodeAccount')

  // 認証情報取得処理
  if (!req.session || !req.user?.userId) return next(errorHelper.create(500))

  // DBからuserデータ取得
  const user = await userController.findOne(req.user.userId)
  // データベースエラーは、エラーオブジェクトが返る
  // user未登録の場合もエラーを上げる
  if (user instanceof Error || user === null) return next(errorHelper.create(500))

  // TX依頼後に改修、ユーザステイタスが0以外の場合、「404」エラーとする not 403
  if (user.dataValues?.userStatus !== 0) return next(errorHelper.create(404))
  if (req.session?.userContext !== 'LoggedIn') return next(errorHelper.create(400))

  // DBから契約情報取得
  const contract = await contractController.findOne(req.user.tenantId)
  // データベースエラーは、エラーオブジェクトが返る
  // 契約情報未登録の場合もエラーを上げる
  if (contract instanceof Error || contract === null) return next(errorHelper.create(500))

  // ユーザ権限を取得
  req.session.userRole = user.dataValues?.userRole
  const deleteFlag = contract.dataValues.deleteFlag
  const contractStatus = contract.dataValues.contractStatus
  const checkContractStatus = helper.checkContractStatus

  if (checkContractStatus === null || checkContractStatus === 999) return next(errorHelper.create(500))

  if (!validate.isStatusForCancel(contractStatus, deleteFlag)) return next(noticeHelper.create('cancelprocedure'))

  const subjectCode = req.body.codeAccountCode
  const subjectName = req.body.codeAccountName

  // 勘定科目をDBに保存する。
  // 結果：true 正常登録、false 登録失敗、Error DBエラー発生
  const result = await codeAccountController.insert(contract, { subjectCode, subjectName })

  if (result instanceof Error) return next(errorHelper.create(500))

  // 結果確認
  if (result) {
    // 正常に登録ができた場合
    req.flash('info', '勘定科目を登録しました。')
    res.redirect('/portal')
  } else {
    // 失敗した時
    req.flash('noti', '勘定科目登録に失敗しました。')
    res.redirect('/registAccountCode')
  }

  logger.info(constantsDefine.logMessage.INF001 + 'cbPostCreateCodeAccount')
}

router.get('/', helper.isAuthenticated, cbGetCodeAccount)
router.post('/', helper.isAuthenticated, cbPostCreateCodeAccount)

module.exports = {
  router: router,
  cbGetCodeAccount: cbGetCodeAccount,
  cbPostCreateCodeAccount: cbPostCreateCodeAccount
}
