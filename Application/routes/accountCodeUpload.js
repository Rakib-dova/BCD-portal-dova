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
const upload = require('multer')({ dest: process.env.INVOICE_UPLOAD_PATH })
const accountUploadController = require('../controllers/accountUploadController')

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

  // アップロードフォーマットデータを画面に渡す。
  res.render('accountUpload', {
    uploadCommonLayoutTitle: '勘定科目一括作成',
    uploadCommonLayoutEngTitle: 'BULK UPLOAD ACCOUNT CODE',
    fileInputName: 'bulkAccountCode',
    cautionForSelectedFile: 'ファイル選択してください。',
    listLocation: '/accountCodeList',
    listLoacationName: '勘定科目一覧→',
    accountCodeUpload: '/uploadAccount'
  })
  logger.info(constantsDefine.logMessage.INF001 + 'cbGetIndex')
}

const cbPostIndex = async (req, res, next) => {
  logger.info(constantsDefine.logMessage.INF000 + 'cbPostIndex')
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

  // req.file.userId設定

  req.file.userId = req.user.userId
  const status = await accountUploadController.upload(req.file, contract)

  if (status instanceof Error) {
    req.flash('noti', ['勘定科目一括作成', '勘定科目一括作成間エラーが発生しました。'])
    res.redirect('/uploadAccount')
  }

  switch (status) {
    // 正常
    case 0:
      req.flash('info', '勘定科目取込が完了しました。')
      return res.redirect('/accountCodeList')
    // ヘッダー不一致
    case -1:
      req.flash('noti', ['勘定科目一括作成', '勘定科目取込が完了しました。（ヘッダーに誤りがあります。）'])
      break
    // 勘定科目データが0件の場合
    case -2:
      req.flash('noti', ['勘定科目一括作成', '勘定科目取込が完了しました。（取込データが存在していません。）'])
      break
    // 勘定科目データが200件の超過の場合
    case -3:
      req.flash('noti', [
        '勘定科目一括作成',
        '勘定科目取込が完了しました。（一度に取り込める勘定科目は200件までとなります。）'
      ])
      break
    // 勘定科目データが様式を従っていない
    case -4:
      req.flash('noti', ['勘定科目一括作成', '勘定科目取込が完了しました。（一部行目に誤りがあります。）'])
      break
    // 既に登録済み勘定科目がある場合
    case -5:
      req.flash('noti', [
        '勘定科目一括作成',
        '勘定科目取込が完了しました。（勘定科目コードが重複する勘定科目はスキップしました。）'
      ])
      break
    // 勘定科目コードのバリデーションチェックが間違い場合
    case -6:
      req.flash('noti', [
        '勘定科目一括作成',
        '勘定科目取込が完了しました。（勘定科目コードは半角英数字10文字以内で入力してください。）'
      ])
      break
    // 勘定科目名のバリデーションチェックが間違い場合
    case -7:
      req.flash('noti', [
        '勘定科目一括作成',
        '勘定科目取込が完了しました。（勘定科目名は全角・半角40文字以内で入力してください。）'
      ])
      break
  }
  res.redirect('/uploadAccount')
}

router.get('/', helper.isAuthenticated, cbGetIndex)
router.post('/', helper.isAuthenticated, upload.single('bulkAccountCode'), cbPostIndex)

module.exports = {
  router: router,
  cbGetIndex: cbGetIndex,
  cbPostIndex: cbPostIndex
}
