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
const accountCodeController = require('../controllers/accountCodeController')
const fs = require('fs')
const path = require('path')
const filePath = process.env.INVOICE_UPLOAD_PATH
const bodyParser = require('body-parser')
router.use(
  bodyParser.json({
    type: 'application/json',
    limit: '6826KB'
  })
)
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

  // 勘定科目
  const accountCodeListArr = await accountCodeController.getAccountCodeList(contract.contractId)

  if (accountCodeListArr instanceof Error) return next(errorHelper.create(500))

  // アップロードフォーマットデータを画面に渡す。
  res.render('accountUpload', {
    uploadCommonLayoutTitle: '勘定科目一括作成',
    uploadCommonLayoutEngTitle: 'BULK UPLOAD ACCOUNT CODE',
    fileInputName: 'bulkAccountCode',
    cautionForSelectedFile: 'ファイル選択してください。',
    listLocation: '/accountCodeList',
    listLoacationName: '勘定科目一覧→'
  })
  logger.info(constantsDefine.logMessage.INF001 + 'cbGetIndex')
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

  // CSVfile 読み込む
  const today = new Date().getTime()
  const filename = '勘定科目' + '_' + today + '_' + req.user.userId + '_' + req.body.filename + '.csv'
  const uploadCsvData = Buffer.from(decodeURIComponent(req.body.fileData), 'base64').toString('utf8')

  // サーバへ保存処理
  if (cbUploadAccountCsv(filePath, filename, uploadCsvData) === false) {
    logger.info(constantsDefine.logMessage.INF001 + 'cbPostIndex')
    return res.status(500).send(constantsDefine.statusConstants.SYSTEMERRORMESSAGE)
  }

  // 以後はCSVファイルからデータ読み込み処理

  // csvファイル削除
  if (cbRemoveAccountCsv(filePath, filename) === false) {
    return res.status(500).send(constantsDefine.statusConstants.SYSTEMERRORMESSAGE)
  }

  logger.info(constantsDefine.logMessage.INF001 + 'cbPostIndex')

  return res.status(200).send('勘定科目取込が完了しました。')
}

// csvアップロード
const cbUploadAccountCsv = (_filePath, _filename, _uploadCsvData) => {
  logger.info(constantsDefine.logMessage.INF000 + 'cbUploadAccountCsv')
  const uploadPath = path.join(_filePath, '/')
  const filename = _filename
  const uploadData = _uploadCsvData
  const writeFile = () => {
    fs.writeFileSync(uploadPath + filename, uploadData, 'utf8')
  }
  try {
    // ユーザディレクトリが存在すること確認
    if (fs.existsSync(uploadPath)) {
      // ユーザディレクトリが存在している場合、CSVファイルを保存する
      writeFile()
      logger.info(constantsDefine.logMessage.INF001 + 'cbUploadAccountCsv')
      return true
    } else {
      // ユーザディレクトリが存在しない場合、ユーザディレクトリ作成
      fs.mkdirSync(uploadPath)
      writeFile()
      logger.info(constantsDefine.logMessage.INF001 + 'cbUploadAccountCsv')
      return true
    }
  } catch (error) {
    return false
  }
}

// CSVファイル削除機能
const cbRemoveAccountCsv = (_deleteDataPath, _filename) => {
  logger.info(constantsDefine.logMessage.INF000 + 'cbRemoveAccountCsv')
  const deleteFile = path.join(_deleteDataPath, '/' + _filename)

  if (fs.existsSync(deleteFile)) {
    try {
      fs.unlinkSync(deleteFile)
      logger.info(constantsDefine.logMessage.INF001 + 'cbRemoveAccountCsv')
      return true
    } catch (error) {
      logger.info(constantsDefine.logMessage.INF001 + 'cbRemoveAccountCsv')
      return false
    }
  } else {
    // 削除対象がない場合、サーバーエラー画面表示
    logger.info(constantsDefine.logMessage.INF001 + 'cbRemoveAccountCsv')
    return false
  }
}

router.get('/', helper.isAuthenticated, cbGetIndex)
router.post('/', helper.isAuthenticated, cbPostIndex)

module.exports = {
  router: router,
  cbGetIndex: cbGetIndex,
  cbPostIndex: cbPostIndex,
  cbUploadAccountCsv: cbUploadAccountCsv,
  cbRemoveAccountCsv: cbRemoveAccountCsv
}
