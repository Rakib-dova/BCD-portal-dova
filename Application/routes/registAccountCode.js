'use strict'

const express = require('express')
const router = express.Router()
const helper = require('./helpers/middleware')
const validate = require('../lib/validate')
const errorHelper = require('./helpers/error')
const noticeHelper = require('./helpers/notice')
const userController = require('../controllers/userController.js')
const contractController = require('../controllers/contractController.js')
const codeAccountController = require('../controllers/codeAccountController.js')
const logger = require('../lib/logger')
const constantsDefine = require('../constants')
const { v4: uuidv4 } = require('uuid')

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

  res.render('registAccoutCode', {
    TS_HOST: process.env.TS_HOST
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
  console.log(req.body)
  const codeAccountName = req.body.codeAccountName
  const codeAccountCode = req.body.codeAccountCode
  console.log(codeAccountName)
  console.log(codeAccountCode)
  const codeAccountId = uuidv4()
  const result = await codeAccountController.insert(req.user.tenantId, {
    codeAccountId: codeAccountId,
    contractId: contract.dataValues.contractId,
    subjectName: codeAccountName,
    subjectCode: codeAccountCode
  })
  console.log(result)

  logger.info(constantsDefine.logMessage.INF001 + 'cbPostCreateCodeAccount')
}

router.get('/', helper.isAuthenticated, cbGetCodeAccount)
router.post('/createCodeAccount', helper.isAuthenticated, cbPostCreateCodeAccount)

module.exports = {
  router: router,
  cbGetCodeAccount: cbGetCodeAccount,
  cbPostCreateCodeAccount: cbPostCreateCodeAccount
}
