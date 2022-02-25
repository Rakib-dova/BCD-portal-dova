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
const approverController = require('../controllers/approverController')

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

  const approveRouteId = req.params.approveRouteId
  const approveRouteAndApprover = await approverController.getApproveRoute(
    req.user.accessToken,
    req.user.refreshToken,
    contract.contractId,
    approveRouteId
  )

  if (approveRouteAndApprover instanceof Error) return next(errorHelper.create(500))

  switch (approveRouteAndApprover) {
    case -1:
      req.flash('noti', ['承認ルート一覧', '当該承認ルートをDBから見つかりませんでした。'])
      return res.redirect('/approveRouteList')
  }

  const lastApprover = approveRouteAndApprover.users.pop()

  res.render('registApproveRoute', {
    panelHead: '条件絞り込み',
    approveRouteNameLabel: '承認ルート名',
    requiredTagApproveRouteName: 'approveRouteNameTagRequired',
    idForApproveRouteNameInput: 'setApproveRouteNameInputId',
    isApproveRouteEdit: true,
    modalTitle: '承認者検索',
    backUrl: '/approveRouteList',
    logTitle: '承認ルート確認・変更',
    logTitleEng: 'EDIT APPROVE ROUTE',
    approveRouteName: approveRouteAndApprover.name,
    approveUsers: approveRouteAndApprover.users,
    lastApprover: lastApprover
  })
  logger.info(constantsDefine.logMessage.INF001 + 'cbGetIndex')
}

const cbPostEditApproveRoute = async (req, res, next) => {
  logger.info(constantsDefine.logMessage.INF000 + 'cbPostEditApproveRoute')
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
  if (req.session?.userContext !== 'LoggedIn') return next(errorHelper.create(400))

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

  const prevApproveRouteId = req.params.approveRouteId
  const resultInsert = await approverController.editApprover(
    req.user.accessToken,
    req.user.refreshToken,
    contract.contractId,
    req.body,
    prevApproveRouteId
  )
  if (resultInsert instanceof Error) return next(errorHelper.create(500))

  switch (resultInsert) {
    case 0:
      // 正常に登録ができた場合
      req.flash('info', '承認ルートの変更が完了しました。')
      res.redirect('/approveRouteList')
      break
    case 1:
      req.flash('noti', ['承認ルート変更', '入力した承認ルート名は既に登録されています。'])
      req.session.body = req.body
      res.redirect(`/approveRouteEdit/${prevApproveRouteId}`)
      break
    case -1:
      req.flash('noti', ['承認ルート変更', '承認ルート登録に失敗しました。'])
      res.redirect(`/approveRouteEdit/${prevApproveRouteId}`)
      break
  }

  logger.info(constantsDefine.logMessage.INF001 + 'cbPostEditApproveRoute')
}

router.get('/:approveRouteId', helper.isAuthenticated, cbGetIndex)
router.post('/:approveRouteId', helper.isAuthenticated, cbPostEditApproveRoute)

module.exports = {
  router: router,
  cbGetIndex: cbGetIndex,
  cbPostEditApproveRoute: cbPostEditApproveRoute
}
