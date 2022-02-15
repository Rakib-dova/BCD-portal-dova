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

const cbGetRegistApproveRoute = async (req, res, next) => {
  logger.info(constantsDefine.logMessage.INF000 + 'cbGetRegistApproveRoute')

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

  res.render('registApproveRoute', {
    panelHead: '条件絞り込み',
    approveRouteNameLabel: '承認ルート名',
    codeNameLabel: '勘定科目名',
    requiredTagApproveRouteName: 'approveRouteNameTagRequired',
    idForApproveRouteNameInput: 'setApproveRouteNameInputId',
    idForNameInput: 'setAccountCodeNameInputId',
    modalTitle: '承認者検索',
    backUrl: '/portal',
    logTitle: '承認ルート登録',
    logTitleEng: 'REGIST APPROVE ROUTE'
  })

  logger.info(constantsDefine.logMessage.INF001 + 'cbGetRegistApproveRoute')
}

router.get('/', helper.isAuthenticated, cbGetRegistApproveRoute)

module.exports = {
  router: router,
  cbGetRegistApproveRoute: cbGetRegistApproveRoute
}
