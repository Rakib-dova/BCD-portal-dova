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

const csrf = require('csurf')
const csrfProtection = csrf({ cookie: false })

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
  const checkContractStatus = await helper.checkContractStatus(req.user.tenantId)

  if (checkContractStatus === null || checkContractStatus === 999) {
    return next(errorHelper.create(500))
  }

  if (!validate.isStatusForCancel(contractStatus, deleteFlag)) {
    return next(noticeHelper.create('cancelprocedure'))
  }

  // 勘定科目
  const accountCodeListArr = await accountCodeController.getAccountCodeList(contract.contractId)

  if (accountCodeListArr instanceof Error) return next(errorHelper.create(500))

  // 勘定科目データを画面に渡す。
  res.render('accountCodeList', {
    title: '勘定科目一覧',
    engTitle: 'ACCOUNT CODE LIST',
    btnNameForRegister: '新規登録する',
    listArr: accountCodeListArr,
    messageForNotItem: '現在、勘定科目はありません。新規登録するボタンから登録を行ってください。',
    // リスト表示カラム
    listNo: 'No',
    accountCode: '勘定科目コード',
    accountCodeName: '勘定科目名',
    accountCodeUpdatedAt: '最新更新日',
    setClassChangeBtn: 'checkChangeAccountCodeBtn',
    setClassDeleteBtn: 'deleteAccountCodeBtn',
    prevLocation: '/uploadAccount',
    prevLocationName: '←勘定科目一括作成',
    // 削除モーダル表示
    deleteModalTitle: '勘定科目削除',
    csrfToken: req.csrfToken()
  })
  logger.info(constantsDefine.logMessage.INF001 + 'cbGetIndex')
}

router.get('/', helper.isAuthenticated, csrfProtection, cbGetIndex)

module.exports = {
  router: router,
  cbGetIndex: cbGetIndex
}
