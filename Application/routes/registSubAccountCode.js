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

const cbGetIndex = async (req, res, next) => {
  logger.info(constantsDefine.logMessage.INF000 + 'cbGetIndex')

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

  res.render('registSubAccountCode', {
    codeName: '補助科目',
    codeLabel: '補助科目コード',
    codeNameLabel: '補助科目名',
    requiredTagCode: 'subAccountCodeTagRequired',
    requiredTagName: 'subAccountCodeNameRequired',
    idForCodeInput: 'setSubAccountCodeInputId',
    idForNameInput: 'setSubAccountCodeNameInputId',
    modalTitle: '補助科目設定確認',
    backUrl: '/portal',
    logTitle: '補助科目登録',
    logTitleEng: 'REGIST SUB ACCOUNT CODE',
    isRegistSubAccountCode: true,
    parentCodeLabel: '勘定科目',
    parentCodeNameLabel: '勘定科目名',
    parentIdForCodeInput: 'setAccountCodeInputId',
    parentIdForNameInput: 'setAccountCodeNameInputId'
  })

  logger.info(constantsDefine.logMessage.INF001 + 'cbGetIndex')
}

router.get('/', helper.isAuthenticated, cbGetIndex)

module.exports = {
  router: router,
  cbGetRegistAccountCode: cbGetIndex
}
