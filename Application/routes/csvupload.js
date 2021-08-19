'use strict'
const express = require('express')
const fs = require('fs')
const path = require('path')
const router = express.Router()
const helper = require('./helpers/middleware')
const errorHelper = require('./helpers/error')
const noticeHelper = require('./helpers/notice')
const userController = require('../controllers/userController.js')
const contractController = require('../controllers/contractController.js')
const logger = require('../lib/logger')
const validate = require('../lib/validate')
const apiManager = require('../controllers/apiManager')
const filePath = process.env.INVOICE_UPLOAD_PATH
const constantsDefine = require('../constants')

const bodyParser = require('body-parser')
router.use(
  bodyParser.json({
    type: 'application/json',
    limit: '6826KB'
  })
)
const bconCsv = require('../lib/bconCsv')

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

  if (!validate.isStatusForCancel(contractStatus, deleteFlag)) {
    return next(noticeHelper.create('cancelprocedure'))
  }

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
  let errorText = null
  // csvアップロード
  if (cbUploadCsv(filePath, filename, uploadCsvData) === false) return next(errorHelper.create(500))
  // csvからデータ抽出
  switch (await cbExtractInvoice(filePath, filename, userToken)) {
    case 101:
      errorText = constantsDefine.statusConstants.INVOICE_FAILED
      break
    case 102:
      errorText = constantsDefine.statusConstants.OVER_SPECIFICATION
      break
    case 103:
      errorText = constantsDefine.statusConstants.OVERLAPPED_INVOICE
      break
    default:
      break
  }

  // csv削除
  if (cbRemoveCsv(filePath, filename) === false) return next(errorHelper.create(500))

  logger.info(constantsDefine.logMessage.INF001 + 'cbPostUpload')

  if (errorText === null) return res.status(200).send(constantsDefine.statusConstants.SUCCESS)

  return res.status(200).send(errorText)
}

// csvアップロード
const cbUploadCsv = (_filePath, _filename, _uploadCsvData) => {
  logger.info(constantsDefine.logMessage.INF000 + 'cbPostUploadCsv')
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
      logger.info(constantsDefine.logMessage.INF001 + 'cbPostUploadCsv')
      return true
    } else {
      // ユーザディレクトリが存在しない場合、ユーザディレクトリ作成
      fs.mkdirSync(uploadPath)
      writeFile()
      logger.info(constantsDefine.logMessage.INF001 + 'cbPostUploadCsv')
      return true
    }
  } catch (error) {
    return false
  }
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
      logger.info(constantsDefine.logMessage.INF001 + 'cbRemoveCsv')
      return false
    }
  } else {
    // 削除対象がない場合、サーバーエラー画面表示
    logger.info(constantsDefine.logMessage.INF001 + 'cbRemoveCsv')
    return false
  }
}

const cbExtractInvoice = async (_extractDir, _filename, _user) => {
  logger.info(constantsDefine.logMessage.INF000 + 'cbExtractInvoice')
  const extractFullpathFile = path.join(_extractDir, '/') + _filename
  const csvObj = new bconCsv(extractFullpathFile)
  const invoiceList = csvObj.getInvoiceList()
  const invoiceCnt = invoiceList.length
  const setHeaders = {}
  setHeaders.Accepts = 'application/json'
  setHeaders.Authorization = `Bearer ${_user.accessToken}`
  setHeaders['Content-Type'] = 'application/json'

  let meisaiFlag = 0

  // トレードシフトからドキュメントを取得
  let documentsList
  const documentIds = []
  let numPages
  let currPage
  let documentsURL = '/documents?stag=draft&stag=outbox&limit=10000'
  do {
    if (Object.prototype.toString.call(currPage) !== '[object Undefined]') {
      currPage++
      documentsURL = `/documents?stag=draft&stag=outbox&limit=10000&page=${currPage}`
    }
    documentsList = await apiManager.accessTradeshift(_user.accessToken, _user.refreshToken, 'get', documentsURL)
    documentsList.Document.forEach((document) => {
      documentIds.push(document.ID)
    })
    numPages = documentsList.numPages
    currPage = documentsList.pageId
  } while (currPage < numPages)

  if (invoiceCnt > 100) {
    logger.error(constantsDefine.logMessage.ERR001 + 'invoiceToomuch Error')
    return 101
  }

  let idx = 0
  while (invoiceList[idx]) {
    // 明細check
    const meisaiLength = invoiceList[idx].INVOICE.getDocument().InvoiceLine.length

    if (meisaiLength > 200) {
      logger.error(
        constantsDefine.logMessage.ERR001 + invoiceList[idx].INVOICE.getDocument().ID.value + ' - specificToomuch Error'
      )
      meisaiFlag = 1
    } else {
      // アップロードするドキュメントが重複のチェック
      const docNo = invoiceList[idx].INVOICE.getDocument().ID.value
      documentIds.forEach((id) => {
        if (docNo === id && invoiceList[idx].status !== -1) {
          invoiceList[idx].status = 1
        }
      })
      switch (invoiceList[idx].status) {
        case 0:
          await apiManager.accessTradeshift(
            _user.accessToken,
            _user.refreshToken,
            'put',
            '/documents/' +
              invoiceList[idx].INVOICE.getDocumentId() +
              '?draft=true&documentProfileId=tradeshift.invoice.1.0',
            JSON.stringify(invoiceList[idx].INVOICE.getDocument()),
            {
              headers: setHeaders
            }
          )
          break
        case 1:
          meisaiFlag = 2
          break
        case -1:
          logger.info(invoiceList[idx].errorData)
      }
    }
    idx++
  }
  logger.info(constantsDefine.logMessage.INF001 + 'cbExtractInvoice')

  switch (meisaiFlag) {
    case 1:
      return 102
    case 2:
      return 103
  }

  return 0
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
  cbExtractInvoice: cbExtractInvoice,
  getTimeStamp: getTimeStamp
  // cbPostUpload, cbUploadCsv, cbRemoveCsv, cbExtractInvoice, getTimeStampはUTテストのため追加
}
