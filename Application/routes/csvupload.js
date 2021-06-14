'use strict'
const express = require('express')
const fs = require('fs')
const path = require('path')
const router = express.Router()
const helper = require('./helpers/middleware')
const errorHelper = require('./helpers/error')
const userController = require('../controllers/userController.js')
const logger = require('../lib/logger')
const apiManager = require('../controllers/apiManager')
const filePath = process.env.INVOICE_UPLOAD_PATH
const constantsDefine = require('../constants')

const bodyParser = require('body-parser')
router.use(
  bodyParser.json({
    type: 'application/json',
    limit: '100KB'
  })
)
const bconCsv = require('../lib/bconCsv')

const cbGetIndex = async (req, res, next) => {
  logger.info(constantsDefine.logMessage.INF000 + 'cbGetIndex')
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
  logger.info(constantsDefine.logMessage.INF001 + 'cbGetIndex')
}

const cbPostUpload = async (req, res, next) => {
  logger.info(constantsDefine.logMessage.INF000 + 'cbPostUpload')
  if (!req.session || !req.user?.userId) {
    return next(errorHelper.create(500))
  }

  const user = await userController.findOne(req.user.userId)
  if (user instanceof Error || user === null) return next(errorHelper.create(500))
  if (user.dataValues?.userStatus !== 0) return next(errorHelper.create(404))
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

  logger.info(constantsDefine.logMessage.INF001 + 'cbPostUpload')
  return res.status(200).send('OK')
}

// csvアップロード
const cbUploadCsv = (_filePath, _filename, _uploadCsvData) => {
  logger.info(constantsDefine.logMessage.INF000 + 'cbPostUploadCsv')
  const uploadPath = path.join(_filePath, '/')
  const filename = _filename
  const uploadData = _uploadCsvData
  const writeFile = () => {
    try {
      fs.writeFileSync(uploadPath + filename, uploadData, 'utf8')
      return true
    } catch (error) {
      //logger.error(constantsDefine.logMessage.ERROR*:q''
      return false
    }
  }
  // ユーザディレクトリが存在すること確認
  if (fs.existsSync(uploadPath)) {
    // ユーザディレクトリが存在している場合、CSVファイルを保存する
    try {
      return writeFile()
    } catch (error) {
      return false
    }
  } else {
    // ユーザディレクトリが存在しない場合、ユーザディレクトリ作成
    try {
      fs.mkdirSync(uploadPath)
      return writeFile()
    } catch {
      return false
    }
  }
  logger.info('cbPostUploadCsv' + constantsDefine.logMessage.INF001)   
}

// CSVファイル削除機能
const cbRemoveCsv = (_deleteDataPath, _filename) => {
  logger.info(constantsDefine.logMessage.INF000 + 'cbRemoveCsv') 
  const deleteFile = path.join(_deleteDataPath, '/' + _filename)

  if (fs.existsSync(deleteFile)) {
    try {
      fs.unlinkSync(deleteFile)
      logger.info(constantsDefine.logMessage.INF001 + 'cbRemoveCsv')   
      return true
    } catch (error) {
      //logger.warn(constantsDefine.logMessage. + 'cbRemoveCsv')   
      logger.info(constantsDefine.logMessage.INF001 + 'cbRemoveCsv')   
      return false
    }
  } else {
    // 削除対象がない場合、サーバーエラー画面表示
    //logger.warn(constantsDefine.logMessage.WARN00 + 'cbRemoveCsv')
    return false
  }
}

const cbExtractInvoice = (_extractDir, _filename, _user) => {
  logger.info(constantsDefine.logMessage.INF000 + 'cbExtractInvoice')   
  const extractFullpathFile = path.join(_extractDir, '/') + _filename
  const csvObj = new bconCsv(extractFullpathFile)
  const invoiceList = csvObj.getInvoiceList()
  const invoiceCnt = invoiceList.length
  let setHeaders = {}
  setHeaders['Accepts'] = 'application/json'
  setHeaders['Authorization'] = `Bearer ${_user.accessToken}`
  setHeaders['Content-Type'] = 'application/json'
  for (let idx = 0; idx < invoiceCnt; idx++) {
    const res = apiManager.accessTradeshift(
      _user.accessToken,
      _user.refreshToken,
      'put',
      '/documents/' + invoiceList[idx].getDocumentId() + '?draft=true&documentProfileId=tradeshift.invoice.1.0',
      JSON.stringify(invoiceList[idx].getDocument()),
      {
        headers: setHeaders
      }
    )
  }
  logger.info(constantsDefine.logMessage.INF001 + 'cbExtractInvoice')
  return 
}

const getTimeStamp = () => {
  logger.info(constantsDefine.logMessage.INF000 + 'getTimeStamp')
  const now = new Date()
  const stamp =
    now.getFullYear() +
    (now.getMonth() + 1 < 10 ? '0' + (now.getMonth() + 1) : now.getMonth() + 1) +
    (now.getDate() < 10 ? '0' + now.getDate() : now.getDate()) +
    (now.getHours() < 10 ? '0' + now.getHours() : now.getHours()) +
    (now.getMinutes() < 10 ? '0' + now.getMinutes() : now.getMinutes()) +
    (now.getSeconds() < 10 ? '0' + now.getSeconds() : now.getSeconds()) +
    (now.getMilliseconds() < 10 ? '0' + now.getMilliseconds() : now.getMilliseconds())
  logger.info(constantsDefine.logMessage.INF001 + 'getTimeStamp')
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
  cbExtractInvoice: cbExtractInvoice
  // cbPostUpload, cbUploadCsv, cbRemoveCsv, cbExtractInvoiceはUTテストのため追加
}
