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
const departmentCodeController = require('../controllers/departmentCodeController')

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
  // 異常経路接続接続防止（ログイン→ポータル→サービス）
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

  if (checkContractStatus === null || checkContractStatus === 999) {
    return next(errorHelper.create(500))
  }

  if (!validate.isStatusForCancel(contractStatus, deleteFlag)) {
    return next(noticeHelper.create('cancelprocedure'))
  }

  // 検索キー取得（契約情報ID、部門データID）
  const contractId = contract.contractId
  const departmentCodeId = req.params.departmentCodeId
  // DBからデータ取得
  const result = await departmentCodeController.getDepartmentCode(contractId, departmentCodeId)

  if (result instanceof Error) return next(errorHelper.create(500))

  // アップロードフォーマットデータを画面に渡す。
  res.render('registDepartmentCode', {
    codeName: '部門データ確認・変更',
    codeLabel: '部門コード',
    codeNameLabel: '部門名',
    requiredTagCode: 'departmentCodeTagRequired',
    requiredTagName: 'departmentCodeNameRequired',
    idForCodeInput: 'setDepartmentCodeInputId',
    idForNameInput: 'setDepartmentCodeNameInputId',
    modalTitle: '部門データ設定確認',
    backUrl: '/departmentCodeList',
    isRegistDepartmentCode: true,
    pTagForcheckInput1: 'checksetDepartmentCodeInputId',
    pTagForcheckInput2: 'checksetDepartmentCodeNameInputId',
    valueForCodeInput: result?.departmentCode ?? '',
    valueForNameInput: result?.departmentCodeName ?? '',
    checkModalLabel1: '部門コード',
    checkModalLabel2: '部門名',
    logTitle: '部門データ確認・変更',
    logTitleEng: 'EDIT DEPARTMENT CODE'
  })
  logger.info(constantsDefine.logMessage.INF001 + 'cbGetIndex')
}

const cbPostIndex = async function (req, res, next) {
  logger.info(constantsDefine.logMessage.INF000 + 'cbPostIndex')
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
  // 異常経路接続接続防止（ログイン→ポータル→サービス）
  if (req.session?.userContext !== 'LoggedIn') return next(errorHelper.create(400))

  // ユーザ権限を取得
  req.session.userRole = user.dataValues?.userRole
  const deleteFlag = contract.dataValues.deleteFlag
  const contractStatus = contract.dataValues.contractStatus
  const checkContractStatus = await helper.checkContractStatus(req.user.tenantId)

  if (checkContractStatus === null || checkContractStatus === 999) {
    return next(errorHelper.create(500))
  }

  if (!validate.isStatusForCancel(contractStatus, deleteFlag)) {
    return next(noticeHelper.create('cancelprocedure'))
  }

  // 部門コードの変更の時、検索データと変更値をとる
  const contractId = contract.contractId
  const departmentCodeId = req.params.departmentCodeId ?? 'failedDepartmentCodeId'
  const departmentCode = req.body.setDepartmentCodeInputId ?? 'failedDepartmentCode'
  const departmentCodeName =
    req.body.setDepartmentCodeNameInputId ?? 'failedRequestBodySetDepartmentCodeNameFromDepartmentCodeEdit.Get'

  if (departmentCodeId.length === 0 || departmentCodeId === 'failedDepartmentCodeId') {
    req.flash('noti', ['部門データ変更', '部門データ変更する値に誤りがあります。'])
    res.redirect('/departmentCodeList')
    logger.info(constantsDefine.logMessage.INF001 + 'cbPostIndex')
    return
  }

  if (
    departmentCode.length === 0 ||
    departmentCodeName.length === 0 ||
    departmentCode === 'failedDepartmentCode' ||
    departmentCodeName === 'failedRequestBodySetDepartmentCodeNameFromDepartmentCodeEdit.Get'
  ) {
    req.flash('noti', ['部門データ変更', '部門データ変更する値に誤りがあります。'])
    res.redirect(`/departmentCodeEdit/${departmentCodeId}`)
    logger.info(constantsDefine.logMessage.INF001 + 'cbPostIndex')
    return
  }

  // 部門データを変更する。
  const result = await departmentCodeController.updatedDepartmentCode(
    contractId,
    departmentCodeId,
    departmentCode,
    departmentCodeName
  )

  // DB変更の時エラーが発生したら500ページへ遷移する。
  if (result instanceof Error) return next(errorHelper.create(500))

  // 変更結果を表示する。
  // 結果：0（正常変更）、1（変更なし）、-1（重複コードの場合）、-2（部門データ検索失敗）
  switch (result) {
    case 0:
      req.flash('info', '部門データの変更が完了しました。')
      res.redirect('/departmentCodeList')
      break
    case 1:
      req.flash('noti', ['部門データ変更', '入力した部門データは既に登録されています。'])
      res.redirect(`/departmentCodeEdit/${departmentCodeId}`)
      break
    case -1:
      req.flash('noti', ['部門データ変更', '入力した部門コードは重複されています。'])
      res.redirect(`/departmentCodeEdit/${departmentCodeId}`)
      break
    case -2:
      req.flash('noti', ['部門データ変更', '当該部門データをDBから見つかりませんでした。'])
      res.redirect('/departmentCodeList')
      break
  }
  logger.info(constantsDefine.logMessage.INF001 + 'cbPostIndex')
}

router.get('/:departmentCodeId', helper.isAuthenticated, cbGetIndex)
router.post('/:departmentCodeId', helper.isAuthenticated, cbPostIndex)

module.exports = {
  router: router,
  cbGetIndex: cbGetIndex,
  cbPostIndex: cbPostIndex
}
