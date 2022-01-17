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

  const procedureContents = {
    procedureTitle: '(手順)',
    procedureComment1: '1. 下記リンクをクリックし、アップロード用のCSVファイルをダウンロード',
    procedureComment2: '2. CSVファイルに勘定科目を記入',
    procedureComment2Children: [
      'A列：勘定科目コード　英・数字のみ（10桁）',
      'B列：勘定科目名　　　文字列（40桁）',
      '※1ファイルで作成できる勘定科目の数は200まで'
    ],
    procedureComment3: '3.「ファイル選択」ボタンをクリックし、記入したCSVファイルを選択',
    procedureComment4: '4.「アップロード開始」ボタンをクリック'
  }

  // アップロードフォーマットデータを画面に渡す。
  res.render('accountUpload', {
    uploadCommonLayoutTitle: '勘定科目一括作成',
    uploadCommonLayoutEngTitle: 'BULK UPLOAD ACCOUNT CODE',
    fileInputName: 'bulkAccountCode',
    cautionForSelectedFile: 'ファイルを選択してください。',
    listLocation: '/accountCodeList',
    listLoacationName: '勘定科目一覧→',
    accountCodeUpload: '/uploadAccount',
    procedureContents: procedureContents,
    formatFileLocation: '../html/勘定科目一括作成フォーマット.csv',
    formatFileLinkText: 'アップロード用CSVファイルダウンロード'
  })
  logger.info(constantsDefine.logMessage.INF001 + 'cbGetIndex')
}

const cbPostIndex = async (req, res, next) => {
  logger.info(constantsDefine.logMessage.INF000 + 'accountCodeUpload.cbPostIndex')
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
    req.flash('noti', ['取込に失敗しました。', constantsDefine.codeErrMsg.SYSERR000, 'SYSERR'])
    logger.info(constantsDefine.logMessage.INF001 + 'accountCodeUpload.cbPostIndex')
    return res.redirect('/uploadAccount')
  }

  // エラーメッセージが有無確認
  if (validate.isArray(status)) {
    req.flash('errnoti', [
      '取込に失敗しました。',
      '下記表に記載されている内容を修正して、再アップロードして下さい。',
      'SYSERR',
      status
    ])
  } else {
    switch (status) {
      // 正常
      case 0:
        req.flash('info', '勘定科目取込が完了しました。')
        return res.redirect('/accountCodeList')
      // ヘッダー不一致
      case -1:
        req.flash('noti', ['取込に失敗しました。', constantsDefine.codeErrMsg.CODEHEADERERR000, 'SYSERR'])
        break
      // 勘定科目データが0件の場合
      case -2:
        req.flash('noti', ['取込に失敗しました。', constantsDefine.codeErrMsg.CODEDATAERR000, 'SYSERR'])
        break
      // 勘定科目データが200件の超過の場合
      case -3:
        req.flash('noti', ['取込に失敗しました。', constantsDefine.codeErrMsg.ACCOUNTCOUNTERR000, 'SYSERR'])
        break
      // 勘定科目データが様式を従っていない
      case -4:
        req.flash('noti', ['取込に失敗しました。', constantsDefine.codeErrMsg.CODEDATAERR000, 'SYSERR'])
        break
      // 既に登録済み勘定科目がある場合
    }
  }
  logger.info(constantsDefine.logMessage.INF001 + 'accountCodeUpload.cbPostIndex')
  res.redirect('/uploadAccount')
}

router.get('/', helper.isAuthenticated, cbGetIndex)
router.post('/', helper.isAuthenticated, upload.single('bulkAccountCode'), cbPostIndex)

module.exports = {
  router: router,
  cbGetIndex: cbGetIndex,
  cbPostIndex: cbPostIndex
}
