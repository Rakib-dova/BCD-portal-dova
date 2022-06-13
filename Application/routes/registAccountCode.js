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
const accountCodeController = require('../controllers/accountCodeController')
const csrf = require('csurf')
const csrfProtection = csrf({ cookie: false })

const cbGetRegistAccountCode = async (req, res, next) => {
  logger.info(constantsDefine.logMessage.INF000 + 'cbGetRegistAccountCode')

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
  const checkContractStatus = await helper.checkContractStatus(req.user.tenantId)

  if (checkContractStatus === null || checkContractStatus === 999) return next(errorHelper.create(500))

  if (!validate.isStatusForCancel(contractStatus, deleteFlag)) return next(noticeHelper.create('cancelprocedure'))

  res.render('registAccountCode', {
    codeName: '勘定科目',
    codeLabel: '勘定科目コード',
    codeNameLabel: '勘定科目名',
    requiredTagCode: 'accountCodeTagRequired',
    requiredTagName: 'accountCodeNameRequired',
    idForCodeInput: 'setAccountCodeInputId',
    idForNameInput: 'setAccountCodeNameInputId',
    modalTitle: '勘定科目設定確認',
    backUrl: '/accountCodeList',
    logTitle: '勘定科目登録',
    logTitleEng: 'REGIST ACCOUNT CODE',
    csrfToken: req.csrfToken()
  })

  logger.info(constantsDefine.logMessage.INF001 + 'cbGetRegistAccountCode')
}

const cbPostRegistAccountCode = async (req, res, next) => {
  logger.info(constantsDefine.logMessage.INF000 + 'cbPostRegistAccountCode')

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
  const checkContractStatus = await helper.checkContractStatus(req.user.tenantId)

  if (checkContractStatus === null || checkContractStatus === 999) return next(errorHelper.create(500))

  if (!validate.isStatusForCancel(contractStatus, deleteFlag)) return next(noticeHelper.create('cancelprocedure'))

  const accountCode = req.body.setAccountCodeInputId
  const accountCodeName = req.body.setAccountCodeNameInputId

  // 勘定科目をDBに保存する。
  // 結果：true 正常登録、false 登録失敗、Error DBエラー発生
  const result = await accountCodeController.insert(contract, { accountCode, accountCodeName })

  if (result instanceof Error) return next(errorHelper.create(500))

  // 結果確認
  if (result) {
    // 正常に登録ができた場合
    req.flash('info', '勘定科目を登録しました。')
    res.redirect('/accountCodeList')
  } else {
    // 失敗した時
    req.flash('noti', ['勘定科目登録', '勘定科目登録に失敗しました。'])
    res.redirect('/registAccountCode')
  }

  logger.info(constantsDefine.logMessage.INF001 + 'cbPostRegistAccountCode')
}

router.get('/', helper.isAuthenticated, csrfProtection, cbGetRegistAccountCode)
router.post('/', helper.isAuthenticated, csrfProtection, cbPostRegistAccountCode)

module.exports = {
  router: router,
  cbGetRegistAccountCode: cbGetRegistAccountCode,
  cbPostRegistAccountCode: cbPostRegistAccountCode
}
