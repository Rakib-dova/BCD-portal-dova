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

  // // 検索キー取得（契約情報ID、部門データID）
  // const contractId = contract.contractId
  // const departmentCodeId = req.params.departmentCodeId
  // // DBからデータ取得
  // const result = await departmentCodeController.getDepartmentCode(contractId, departmentCodeId)

  // if (result instanceof Error) return next(errorHelper.create(500))

  // アップロードフォーマットデータを画面に渡す。
  // res.render('registApprvoeRoute', {
  //   codeName: '承認ルート確認・変更',
  //   codeLabel: '部門コード',
  //   codeNameLabel: '部門名',
  //   requiredTagCode: 'departmentCodeTagRequired',
  //   requiredTagName: 'departmentCodeNameRequired',
  //   idForCodeInput: 'setDepartmentCodeInputId',
  //   idForNameInput: 'setDepartmentCodeNameInputId',
  //   modalTitle: '部門データ設定確認',
  //   backUrl: '/approveRouteList',
  //   isRegistDepartmentCode: true,
  //   pTagForcheckInput1: 'checksetDepartmentCodeInputId',
  //   pTagForcheckInput2: 'checksetDepartmentCodeNameInputId',
  //   valueForCodeInput: result?.departmentCode ?? '',
  //   valueForNameInput: result?.departmentCodeName ?? '',
  //   checkModalLabel1: '部門コード',
  //   checkModalLabel2: '部門名',
  //   logTitle: '部門データ確認・変更',
  //   logTitleEng: 'EDIT DEPARTMENT'
  // })
  console.log('approveRouteEdit')

  const dummyUsers = [
    {
      userNo:1,
      userName: 'User1',
      userEmail: 'test1@test.com'
    },
    {
      userNo:2,
      userName: 'User2',
      userEmail: 'test2@test.com'
    },
    {
      userNo:3,
      userName: 'User3',
      userEmail: 'test3@test.com'
    },
    {
      userNo:4,
      userName: 'User4',
      userEmail: 'test4@test.com'
    }
  ]

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
    approveUsers: dummyUsers
  })
  logger.info(constantsDefine.logMessage.INF001 + 'cbGetIndex')
}

router.get('/', helper.isAuthenticated, cbGetIndex)

module.exports = {
  router: router,
  cbGetIndex: cbGetIndex
}
