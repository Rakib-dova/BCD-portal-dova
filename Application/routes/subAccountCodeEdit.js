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
const subAccountCodeController = require('../controllers/subAccountCodeController')

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

  // 検索キー取得（契約情報ID、補助科目ID）
  const subAccountCodeId = req.params.subAccountCodeId
  const contractId = contract.contractId

  // DBからデータ取得
  const result = await subAccountCodeController.getSubAccountCode(contractId, subAccountCodeId)

  // 変更の同時削除された場合
  if (result === null) {
    logger.info(constantsDefine.logMessage.INF001 + 'cbGetIndex')
    req.flash('noti', ['補助科目一覧', '該当する勘定科目が存在しませんでした。'])
    return res.redirect('/subAccountCodeList')
  }

  if (result instanceof Error) return next(errorHelper.create(500))

  // アップロードフォーマットデータを画面に渡す。
  res.render('registSubAccountCode', {
    codeName: '補助科目',
    codeLabel: '補助科目コード',
    codeNameLabel: '補助科目名',
    requiredTagCode: 'subAccountCodeTagRequired',
    requiredTagName: 'subAccountCodeNameRequired',
    idForCodeInput: 'setSubAccountCodeInputId',
    idForNameInput: 'setSubAccountCodeNameInputId',
    modalTitle: '補助科目設定確認',
    backUrl: '/subAccountCodeList',
    logTitle: '補助科目確認・変更',
    logTitleEng: 'EDIT SUB ACCOUNT CODE',
    isRegistSubAccountCode: true,
    parentCodeLabel: '勘定科目コード',
    parentCodeNameLabel: '勘定科目名',
    parentIdForCodeInput: 'setAccountCodeInputId',
    parentIdForNameInput: 'setAccountCodeNameInputId',
    pTagForcheckInput1: 'checksetAccountCodeInputId',
    pTagForcheckInput2: 'checksetSubAccountCodeInputId',
    pTagForcheckInput3: 'checksetSubAccountNameInputId',
    checkModalLabel1: '勘定科目コード',
    checkModalLabel2: '補助科目コード',
    checkModalLabel3: '補助科目名',
    valueForCodeInput: result.subjectCode,
    valueForNameInput: result.subjectName,
    valueForAccountCodeInput: result.accountCodeId,
    valueForAccountCode: result.accountCode,
    valueForAccountCodeName: result.accountCodeName
  })
  logger.info(constantsDefine.logMessage.INF001 + 'cbGetIndex')
}

router.get('/:subAccountCodeId', helper.isAuthenticated, cbGetIndex)

module.exports = {
  router: router,
  cbGetIndex: cbGetIndex
}
