'use strict'
const express = require('express')
const fs = require('fs')
const path = require('path')
const router = express.Router()
const helper = require('./helpers/middleware')
const errorHelper = require('./helpers/error')
const userController = require('../controllers/userController.js')
const logger = require('../lib/logger')
const filePath = process.env.INVOICE_UPLOAD_PATH

const bodyParser = require('body-parser')
router.use(
  bodyParser.json({
    type: 'application/json',
    limit: '100KB'
  })
)
const bconCsv = require('../lib/bconCsv')

const cbGetIndex = async (req, res, next) => {
  // 認証情報取得処理
  if (!req.session || !req.user?.userId) {
    return next(errorHelper.create(500))
  }
  // portal遷移前にはuserは取得できることは確定
  const user = await userController.findOne(req.user.userId)
  // データベースエラーは、エラーオブジェクトが返る
  // portalではuser未登録の場合もエラーを上げる
  if (user instanceof Error || user === null) return next(errorHelper.create(500))

  // TX依頼後に改修、ユーザステイタスが0以外の場合、「404」エラーとする not 403
  if (user.dataValues?.userStatus !== 0) return next(errorHelper.create(404))

  req.session.userContext = 'LoggedIn'

  // ユーザ権限を取得
  req.session.userRole = user.dataValues?.userRole
  // ユーザ権限も画面に送る
  res.render('csvupload')
}

const cbPostUpload = async (req, res, next) => {
  if (!req.session || !req.user?.userId) {
    //    return next(errorHelper.create(500))
  }

  const user = await userController.findOne(req.user.userId)
  // if (user instanceof Error || user === null) return next(errorHelper.create(500))
  // if (user.dataValues?.userStatus !== 0) return next(errorHelper.create(404))
  req.session.userContext = 'LoggedIn'
  req.session.userRole = user.dataValues?.userRole

  const filename = req.user.tenantId + '_' + req.user.email + '_' + getTimeStamp() + '.csv'
  const uploadCsvData = Buffer.from(decodeURIComponent(req.body.fileData), 'base64').toString('utf8')
  const userToken = {
    accessToken: req.user.accessToken,
    refreshToken: req.user.refreshToken
  }
  // csvアップロード
  if (cbUploadCsv(filePath, filename, uploadCsvData) === false) return next(errorHelper.create(500))
  // csvからデータ抽出
  if (cbExtractInvoice(filePath, filename, userToken) === false) return next(errorHelper.create(500))
  // csv削除
  if (cbRemoveCsv(filePath, filename) === false) return next(errorHelper.create(500))

  return res.status(200).send('OK')
}

// csvアップロード
const cbUploadCsv = (_filePath, _filename, _uploadCsvData) => {
  logger.info('DEBUG:::::_filePath::::' + _filePath)
  const uploadPath = path.join(_filePath, '/')
  logger.info('DEBUG:::::uploadPath::::' + uploadPath)
  const filename = _filename
  logger.info('DEBUG:::::filename::::' + filename)
  const uploadData = _uploadCsvData
  const writeFile = () => {
    try {
      fs.writeFileSync(uploadPath + filename, uploadData, 'utf8')
      return true
    } catch (error) {
      logger.info('DEBUG:::::writeFile::::false')
      return false
    }
  }
  // ユーザディレクトリが存在すること確認
  if (fs.existsSync(uploadPath)) {
    // ユーザディレクトリが存在している場合、CSVファイルを保存する
    try {
      return writeFile()
    } catch (error) {
      logger.info('DEBUG:::::existsSync::::false')
      return false
    }
  } else {
    // ユーザディレクトリが存在しない場合、ユーザディレクトリ作成
    try {
      fs.mkdirSync(uploadPath)
      return writeFile()
    } catch {
      logger.info('DEBUG:::::mkdirSync::::false')
      return false
    }
  }
}

// CSVファイル削除機能
const cbRemoveCsv = (_deleteDataPath, _filename) => {
  const deleteFile = path.join(_deleteDataPath, '/' + _filename)

  if (fs.existsSync(deleteFile)) {
    try {
      fs.unlinkSync(deleteFile)
      return true
    } catch (error) {
      return false
    }
  } else {
    // 削除対象がない場合、サーバーエラー画面表示
    return false
  }
}

const cbExtractInvoice = (_extractDir, _filename, user) => {
  const extractFullpathFile = path.join(_extractDir, '/') + _filename
  const csvObj = new bconCsv(extractFullpathFile)
  logger.info(csvObj.sendInvoice(user))
}

const getTimeStamp = () => {
  const now = new Date()
  const stamp =
    now.getFullYear() +
    (now.getMonth() + 1 < 10 ? '0' + (now.getMonth() + 1) : now.getMonth() + 1) +
    (now.getDate() < 10 ? '0' + now.getDate() : now.getDate()) +
    (now.getHours() < 10 ? '0' + now.getHours() : now.getHours()) +
    (now.getMinutes() < 10 ? '0' + now.getMinutes() : now.getMinutes()) +
    (now.getSeconds() < 10 ? '0' + now.getSeconds() : now.getSeconds()) +
    (now.getMilliseconds() < 10 ? '0' + now.getMilliseconds() : now.getMilliseconds())
  return stamp
}

router.get('/', helper.isAuthenticated, helper.isTenantRegistered, helper.isUserRegistered, cbGetIndex)

router.post('/', helper.isAuthenticated, helper.isTenantRegistered, helper.isUserRegistered, cbPostUpload)

module.exports = {
  router: router,
  cbGetIndex: cbGetIndex,
  cbPostUpload: cbPostUpload,
  cbUploadCsv: cbUploadCsv,
  cbRemoveCsv: cbRemoveCsv,
  cbExtractInvoice: cbExtractInvoice,
  getTimeStamp: getTimeStamp
  // cbPostUpload, cbUploadCsv, cbRemoveCsv, cbExtractInvoice, getTimeStampはUTテストのため追加
}
