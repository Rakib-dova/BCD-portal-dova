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
const accountCodeController = require('../controllers/accountCodeController')

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

  // 検索キー取得（契約情報ID、勘定科目ID）
  const contractId = contract.contractId
  const accountCodeId = req.params.accountCodeId
  // DBからデータ取得
  const result = await accountCodeController.getAccountCode(contractId, accountCodeId)

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
    valueForCodeInput: result?.accountCode ?? '',
    valueForNameInput: result?.accountCodeName ?? '',
    logTitle: '勘定科目確認・変更',
    logTitleEng: 'EDIT ACCOUNT CODE'
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

  // 勘定科目コードの変更の時、検索データと変更値をとる
  const contractId = contract.contractId
  const accountCodeId = req.params.accountCodeId ?? 'failedAccountCodeId'
  const accountCode = req.body.setAccountCodeInputId ?? 'failedAccountCode'
  const accountCodeName =
    req.body.setAccountCodeNameInputId ?? 'failedRequestBodySetAccountCodeNameFromAccountCodeEdit.Get'

  if (accountCodeId.length === 0 || accountCodeId === 'failedAccountCodeId') {
    req.flash('noti', ['勘定科目変更', '勘定科目変更する値に誤りがあります。'])
    res.redirect('/accountCodeList')
    logger.info(constantsDefine.logMessage.INF001 + 'cbPostIndex')
    return
  }

  if (
    accountCode.length === 0 ||
    accountCodeName.length === 0 ||
    accountCode === 'failedAccountCode' ||
    accountCodeName === 'failedRequestBodySetAccountCodeNameFromAccountCodeEdit.Get'
  ) {
    req.flash('noti', ['勘定科目変更', '勘定科目変更する値に誤りがあります。'])
    res.redirect(`/accountCodeEdit/${accountCodeId}`)
    logger.info(constantsDefine.logMessage.INF001 + 'cbPostIndex')
    return
  }

  // 勘定科目コードを変更する。
  const result = await accountCodeController.updatedAccountCode(contractId, accountCodeId, accountCode, accountCodeName)

  // DB変更の時エラーが発生したら500ページへ遷移する。
  if (result instanceof Error) return next(errorHelper.create(500))

  // 変更結果を表示する。
  // 結果：0（正常変更）、1（変更なし）、-1（重複コードの場合）、-2（勘定科目検索失敗）
  switch (result) {
    case 0:
      req.flash('info', '勘定科目を変更しました。')
      res.redirect('/accountCodeList')
      break
    case 1:
      req.flash('noti', ['勘定科目変更', 'すでに登録されている値です。'])
      res.redirect(`/accountCodeEdit/${accountCodeId}`)
      break
    case -1:
      req.flash('noti', ['勘定科目変更', '既に登録されている勘定科目コードがあることを確認しました。'])
      res.redirect(`/accountCodeEdit/${accountCodeId}`)
      break
    case -2:
      req.flash('noti', ['勘定科目変更', '当該勘定科目をDBから見つかりませんでした。'])
      res.redirect('/accountCodeList')
      break
  }
  logger.info(constantsDefine.logMessage.INF001 + 'cbPostIndex')
}

router.get('/:accountCodeId', helper.isAuthenticated, cbGetIndex)
router.post('/:accountCodeId', helper.isAuthenticated, cbPostIndex)

module.exports = {
  router: router,
  cbGetIndex: cbGetIndex,
  cbPostIndex: cbPostIndex
}
