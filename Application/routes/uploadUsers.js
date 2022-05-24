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
const uploadUsersController = require('../controllers/uploadUsersController')

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

  if (!validate.isTenantManager(user.dataValues?.userRole, deleteFlag)) {
    return next(noticeHelper.create('generaluser'))
  }

  if (!validate.isStatusForRegister(contractStatus, deleteFlag)) {
    return next(noticeHelper.create('registerprocedure'))
  }

  if (!validate.isStatusForSimpleChange(contractStatus, deleteFlag)) {
    return next(noticeHelper.create('changeprocedure'))
  }

  const procedureContents = {
    procedureTitle: '(手順)',
    procedureComment1: '1. 下記リンクをクリックし、アップロード用のCSVファイルをダウンロード',
    procedureComment2: '2. CSVファイルにユーザーデータを記入',
    procedureComment2Children: [
      'A列：メールアドレス',
      'B列：ロール(数字)',
      '※1ファイルで作成できるユーザーデータの数は200件まで',
      '※文字コードはUTF-8 BOM付で作成してください'
    ],
    procedureComment3: '3.「ファイル選択」ボタンをクリックし、記入したCSVファイルを選択',
    procedureComment4: '4.「アップロード開始」ボタンをクリック'
  }

  // アップロードフォーマットデータを画面に渡す。
  res.render('uploadUsers', {
    uploadCommonLayoutTitle: 'ユーザー一括登録',
    uploadCommonLayoutEngTitle: 'BULK UPLOAD USERS',
    fileInputName: 'userNameFileUpload',
    cautionForSelectedFile: 'ファイルを選択してください。',
    usersUpload: '/uploadUsers',
    procedureContents: procedureContents,
    formatFileLocation: '../html/ユーザー一括登録フォーマット.csv',
    formatFileLinkText: 'アップロード用CSVファイルダウンロード'
  })
  logger.info(constantsDefine.logMessage.INF001 + 'cbGetIndex')
}

const cbPostIndex = async (req, res, next) => {
  logger.info(constantsDefine.logMessage.INF000 + 'uploadUsers.cbPostIndex')
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

  if (!validate.isTenantManager(user.dataValues?.userRole, deleteFlag)) {
    return next(noticeHelper.create('generaluser'))
  }

  if (!validate.isStatusForRegister(contractStatus, deleteFlag)) {
    return next(noticeHelper.create('registerprocedure'))
  }

  if (!validate.isStatusForSimpleChange(contractStatus, deleteFlag)) {
    return next(noticeHelper.create('changeprocedure'))
  }

  // req.file.userId設定
  req.file.userId = req.user.userId
  const [status, createdResult] = await uploadUsersController.upload(req.user, contract, req.file)

  if (status instanceof Error) {
    req.flash('noti', ['取込に失敗しました。', constantsDefine.codeErrMsg.SYSERR000, 'SYSERR'])
    logger.info(constantsDefine.logMessage.INF001 + 'uploadUsers.cbPostIndex')
    return res.redirect('/uploadUsers')
  }

  let resultMessage = null
  let flashParams = null

  switch (status) {
    // 正常
    case 0:
      resultMessage = ''
      for (const created of createdResult) {
        switch (created.status) {
          case 'Created':
            resultMessage += `${created.username}を登録しました。<br>`
            break
          case 'Invited':
            resultMessage += `${created.username}を招待しました。<br>`
            break
          case 'Duplicated':
            resultMessage += `${created.username}は既に登録済みのメールアドレスです。（スキップ）<br>`
            break
          case 'Invited Api Error':
            resultMessage += `${created.username}への招待メールはAPIエラーが発生しました。（スキップ）<br>`
            break
          case 'Invited Error':
            resultMessage += `${created.username}への招待メール送信が失敗しました。（スキップ）<br>`
            break
          case 'Error':
            resultMessage += `${created.username}の検索はAPIでエラー発生しました。（スキップ）<br>`
            break
          case 'Email Type Error':
            resultMessage += `${created.username}はメール形式ではありません。（スキップ）<br>`
            break
          case 'Role Type Error':
            resultMessage += `${created.username}のロールは正しい形式ではありません。（スキップ）<br>`
            break
        }
      }
      flashParams = ['noti', ['ユーザー一括登録に成功しました。', resultMessage, '']]
      break
    // ヘッダー不一致
    case -1:
      resultMessage = constantsDefine.codeErrMsg.CODEHEADERERR000
      flashParams = ['noti', ['取込に失敗しました。', resultMessage, 'SYSERR']]
      break
    case -2:
      resultMessage = constantsDefine.codeErrMsg.CODEDATAERR000
      flashParams = ['noti', ['取込に失敗しました。', resultMessage, 'SYSERR']]
      break
    case -3:
      resultMessage = constantsDefine.codeErrMsg.UPLOADUSERCOUNTER000
      flashParams = ['noti', ['取込に失敗しました。', resultMessage, 'SYSERR']]
      break
  }

  logger.info(constantsDefine.logMessage.INF001 + 'uploadUsers.cbPostIndex')
  req.flash(flashParams[0], flashParams[1])
  res.redirect('/uploadUsers')
}

router.get('/', helper.isAuthenticated, cbGetIndex)
router.post('/', helper.isAuthenticated, upload.single('userNameFileUpload'), cbPostIndex)

module.exports = {
  router: router,
  cbGetIndex: cbGetIndex,
  cbPostIndex: cbPostIndex
}
