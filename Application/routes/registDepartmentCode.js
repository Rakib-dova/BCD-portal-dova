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
const departmentCodeController = require('../controllers/departmentCodeController')

const cbGetRegistDepartmentCode = async (req, res, next) => {
  logger.info(constantsDefine.logMessage.INF000 + 'cbGetRegistDepartmentCode')

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

  res.render('registDepartmentCode', {
    codeName: '部門データ',
    codeLabel: '部門コード',
    codeNameLabel: '部門名',
    requiredTagCode: 'departmentCodeTagRequired',
    requiredTagName: 'departmentCodeNameRequired',
    idForCodeInput: 'setDepartmentCodeInputId',
    idForNameInput: 'setDepartmentCodeNameInputId',
    modalTitle: '部門データ設定確認',
    backUrl: '/departmentCodeList',
    logTitle: '部門データ登録',
    logTitleEng: 'REGIST DEPARTMENT',
    isRegistDepartmentCode: true,
    pTagForcheckInput1: 'checksetDepartmentCodeInputId',
    pTagForcheckInput2: 'checksetDepartmentCodeNameInputId',
    checkModalLabel1: '部門コード',
    checkModalLabel2: '部門名'
  })

  logger.info(constantsDefine.logMessage.INF001 + 'cbGetRegistDepartmentCode')
}

const cbPostRegistDepartmentCode = async (req, res, next) => {
  logger.info(constantsDefine.logMessage.INF000 + 'cbPostRegistDepartmentCode')

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

  const departmentCode = req.body.setDepartmentCodeInputId
  const departmentCodeName = req.body.setDepartmentCodeNameInputId

  // 部門データをDBに保存する。
  // 結果：true 正常登録、false 登録失敗、Error DBエラー発生
  const result = await departmentCodeController.insert(contract, { departmentCode, departmentCodeName })

  if (result instanceof Error) return next(errorHelper.create(500))

  // 結果確認
  if (result) {
    // 正常に登録ができた場合
    req.flash('info', '部門データを登録しました。')
    res.redirect('/departmentCodeList')
  } else {
    // 失敗した時
    req.flash('noti', ['部門データ登録', '部門データ登録に失敗しました。'])
    res.redirect('/registDepartmentCode')
  }

  logger.info(constantsDefine.logMessage.INF001 + 'cbPostRegistDepartmentCode')
}

router.get('/', helper.isAuthenticated, cbGetRegistDepartmentCode)
router.post('/', helper.isAuthenticated, cbPostRegistDepartmentCode)

module.exports = {
  router: router,
  cbGetRegistDepartmentCode: cbGetRegistDepartmentCode,
  cbPostRegistDepartmentCode: cbPostRegistDepartmentCode
}
