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
const accountCodeController = require('../controllers/accountCodeController')
const subAccountCodeController = require('../controllers/subAccountCodeController.js')
const bodyParser = require('body-parser')
router.use(
  bodyParser.json({
    type: 'application/json',
    limit: '200KB'
  })
)

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

  const registedAccountCodeList = await accountCodeController.getAccountCodeList(contract.contractId)

  if (registedAccountCodeList.length === 0) {
    req.flash('noti', ['補助科目登録', '事前に勘定科目を登録する必要があります。'])
  }

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
    logTitle: '補助科目登録',
    logTitleEng: 'REGIST SUB ACCOUNT CODE',
    isRegistSubAccountCode: true,
    parentCodeLabel: '勘定科目コード',
    parentCodeNameLabel: '勘定科目名',
    parentIdForCodeInput: 'setAccountCodeInputId',
    parentIdForCodeInputResult: 'setAccountCodeInputIdResult',
    parentIdForNameInput: 'setAccountCodeNameInputId',
    pTagForcheckInput1: 'checksetAccountCodeInputId',
    pTagForcheckInput2: 'checksetSubAccountCodeInputId',
    pTagForcheckInput3: 'checksetSubAccountNameInputId',
    checkModalLabel1: '勘定科目コード',
    checkModalLabel2: '補助科目コード',
    checkModalLabel3: '補助科目名'
  })

  logger.info(constantsDefine.logMessage.INF001 + 'cbGetIndex')
}

const cbPostGetAccountCode = async (req, res, next) => {
  logger.info(constantsDefine.logMessage.INF000 + 'cbPostGetAccountCode')

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

  const targetAccountCode = req.body.accountCode ?? ''
  const targetAccountCodeName = req.body.accountCodeName ?? ''

  if (targetAccountCode.length > 10 || targetAccountCodeName.length > 40) {
    logger.info(constantsDefine.logMessage.INF001 + 'cbPostGetAccountCode')
    return res.status(400).send('400 Bad Request')
  }

  const searchResult = await accountCodeController.searchAccountCode(
    contract.contractId,
    targetAccountCode,
    targetAccountCodeName
  )

  res.send(searchResult)
  logger.info(constantsDefine.logMessage.INF001 + 'cbPostGetAccountCode')
}

const cbPostIndex = async (req, res, next) => {
  logger.info(constantsDefine.logMessage.INF000 + 'cbPostIndex')

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

  // 勘定科目accountCodeId
  const accountCodeId = req.body.setAccountCodeId
  // 補助科目コード
  const subAccountCodeId = req.body.setSubAccountCodeInputId
  // 補助科目名
  const subAccountCodeName = req.body.setSubAccountCodeNameInputId
  const values = {
    accountCodeId: accountCodeId,
    subjectCode: subAccountCodeId,
    subjectName: subAccountCodeName
  }

  // 補助科目をDBに保存する。
  // 結果：0 正常登録、1 中腹登録、-1 登録失敗、Error DBエラー発生
  const result = await subAccountCodeController.insert(contract, values)
  if (result instanceof Error) return next(errorHelper.create(500))
  // 結果確認
  switch (result) {
    case 0:
      // 正常に登録ができた場合
      req.flash('info', '補助科目を登録しました。')
      res.redirect('/subAccountCodeList')
      break
    case 1:
    case -1:
      req.flash('noti', ['補助科目登録', '補助科目登録に失敗しました。'])
      res.redirect('/registSubAccountCode')
      break
  }

  logger.info(constantsDefine.logMessage.INF001 + 'cbPostIndex')
}

router.get('/', helper.isAuthenticated, cbGetIndex)
router.post('/getAccountCode', helper.isAuthenticated, cbPostGetAccountCode)
router.post('/', helper.isAuthenticated, cbPostIndex)

module.exports = {
  router: router,
  cbGetIndex: cbGetIndex,
  cbPostGetAccountCode: cbPostGetAccountCode,
  cbPostIndex: cbPostIndex
}
