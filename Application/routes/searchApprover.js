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
const approverController = require('../controllers/approverController')

const bodyParser = require('body-parser')
router.use(
  bodyParser.json({
    type: 'application/json',
    limit: '100KB'
  })
)

const cbPostSearchApprover = async (req, res, next) => {
  const functionName = 'cbPostSearchApprover'
  logger.info(`${constantsDefine.logMessage.INF000}${functionName}`)

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

  if (req.body.name === undefined && req.body.email === undefined) {
    return res.status(403).send('403 client forbidden')
  }

  const emailPattern = '^[a-zA-Z0-9-._+]+@[a-zA-Z0-9-._+]+$'
  const emailRegExp = new RegExp(emailPattern)
  if (!emailRegExp.test(req.body.email) && req.body.email.trim().length > 0) {
    return res.status(403).send('403 client forbidden')
  }

  const keyword = {
    name: req.body.name || '',
    email: req.body.email || ''
  }

  const accToken = req.user.accessToken
  const refreshToken = req.user.refreshToken
  const tenantId = contract.tenantId

  const approverList = await approverController.getApprover(accToken, refreshToken, tenantId, keyword)

  // アクセストークンが無効になる。
  if (approverList === -1) {
    return res.status(401).send('Tradeshift API Access: access failure')
  }

  // システムエラー
  if (approverList === -2) {
    return res.status(500).send('システムエラー')
  }

  logger.info(`${constantsDefine.logMessage.INF001}${functionName}`)
  // 配列形式を返す
  return res.status(200).send(approverList)
}

router.post('', cbPostSearchApprover)

module.exports = {
  router: router,
  cbPostSearchApprover: cbPostSearchApprover
}
