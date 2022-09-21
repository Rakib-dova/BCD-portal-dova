'use strict'
const express = require('express')
const router = express.Router()
const helper = require('./helpers/middleware')
const errorHelper = require('./helpers/error')
const noticeHelper = require('./helpers/notice')
const userController = require('../controllers/userController.js')
const contractController = require('../controllers/contractController.js')
const subAccountCodeController = require('../controllers/subAccountCodeController.js')
const logger = require('../lib/logger')
const validate = require('../lib/validate')
const constantsDefine = require('../constants')
const csrf = require('csurf')
const csrfProtection = csrf({ cookie: false })

/**
 * 補助科目一覧画面のルーター
 * @param {object} req HTTPリクエストオブジェクト
 * @param {object} res HTTPレスポンスオブジェクト
 * @param {function} next 次の処理
 * @returns {object} 補助科目一覧画面表示、またはエラー
 */
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

  // 補助科目
  const subAccountCodeListArr = await subAccountCodeController.getSubAccountCodeList(contract)

  if (subAccountCodeListArr instanceof Error) return next(errorHelper.create(500))

  // 補助科目データを画面に渡す。
  res.render('subAccountCodeList', {
    title: '補助科目一覧',
    engTitle: 'SUBACCOUNT CODE LIST',
    btnNameForRegister: '新規登録する',
    listArr: subAccountCodeListArr,
    messageForNotItem: '現在、補助科目はありません。新規登録するボタンから登録を行ってください。',
    // リスト表示カラム
    listNo: 'No',
    subjectCode: '補助科目コード',
    subjectName: '補助科目名',
    accountCodeName: '勘定科目名',
    updatedDate: '最新更新日',
    setClassChangeBtn: 'checkChangeSubAccountCodeBtn',
    setClassDeleteBtn: 'deleteSubAccountCodeBtn',
    prevLocation: '/uploadSubAccount',
    prevLocationName: '←補助科目一括作成',
    // 削除モーダル表示
    deleteModalTitle: '補助科目削除',
    csrfToken: req.csrfToken()
  })
  logger.info(constantsDefine.logMessage.INF001 + 'cbGetIndex')
}

router.get('/', helper.isAuthenticated, csrfProtection, cbGetIndex)

module.exports = {
  router: router,
  cbGetIndex: cbGetIndex
}
