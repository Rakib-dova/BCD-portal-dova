'use strict'

const express = require('express')
const router = express.Router()
const helper = require('./helpers/middleware')
const validate = require('../lib/validate')
const fs = require('fs')
const path = require('path')
const errorHelper = require('./helpers/error')
const noticeHelper = require('./helpers/notice')
const userController = require('../controllers/userController.js')
const contractController = require('../controllers/contractController.js')
const logger = require('../lib/logger')
const constantsDefine = require('../constants')

const cbGetCsvBasicFormat = async (req, res, next) => {
  logger.info(constantsDefine.logMessage.INF000 + 'cbGetCsvBasicFormat')

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
  const checkContractStatus = helper.checkContractStatus

  if (checkContractStatus === null || checkContractStatus === 999) return next(errorHelper.create(500))

  if (!validate.isStatusForCancel(contractStatus, deleteFlag)) return next(noticeHelper.create('cancelprocedure'))

  const csvTax = constantsDefine.csvFormatDefine.csvTax
  const csvUnit = constantsDefine.csvFormatDefine.csvUnit

  res.render('csvBasicFormat', {
    csvTax: csvTax,
    csvUnit: csvUnit,
    TS_HOST: process.env.TS_HOST
  })

  logger.info(constantsDefine.logMessage.INF001 + 'cbGetCsvBasicFormat')
}

const cbPostCsvBasicFormat = async (req, res, next) => {
  logger.info(constantsDefine.logMessage.INF000 + 'cbPostCsvBasicFormat')

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

  // ユーザ権限を取得
  const deleteFlag = contract.dataValues.deleteFlag
  const contractStatus = contract.dataValues.contractStatus
  const checkContractStatus = helper.checkContractStatus

  if (checkContractStatus === null || checkContractStatus === 999) return next(errorHelper.create(500))

  if (!validate.isStatusForCancel(contractStatus, deleteFlag)) return next(noticeHelper.create('cancelprocedure'))

  const uploadCsvData = Buffer.from(decodeURIComponent(req.body.hiddenFileData), 'base64').toString('utf8')

  const filePath = process.env.INVOICE_UPLOAD_PATH

  const dataFileName = user.dataValues.userId + '_' + req.body.dataFileName

  // csvファイルアップロード
  if (fileUpload(filePath, dataFileName, uploadCsvData) === false) return next(errorHelper.create(500))

  logger.info(constantsDefine.logMessage.INF001 + 'cbPostCsvBasicFormat')

  // 画面送信
  res.redirect(307, '/uploadFormat')
}

const fileUpload = (_filePath, _filename, _uploadCsvData) => {
  logger.info(constantsDefine.logMessage.INF000 + 'fileUpload')
  const uploadPath = path.join(_filePath, '/')
  const filename = _filename
  const uploadData = _uploadCsvData
  const writeFile = () => {
    fs.writeFileSync(uploadPath + filename, uploadData, 'utf8')
  }
  try {
    // ユーザディレクトリが存在すること確認
    if (!fs.existsSync(uploadPath)) {
      // ユーザディレクトリが存在しない場合、ユーザディレクトリ作成
      fs.mkdirSync(uploadPath)
    }
    // CSVファイルを保存する
    writeFile()
    logger.info(constantsDefine.logMessage.INF001 + 'fileUpload')
    return true
  } catch (error) {
    return false
  }
}

router.get('/', helper.isAuthenticated, cbGetCsvBasicFormat)
router.post('/', cbPostCsvBasicFormat)

module.exports = {
  router: router,
  cbGetCsvBasicFormat: cbGetCsvBasicFormat,
  cbPostCsvBasicFormat: cbPostCsvBasicFormat,
  fileUpload: fileUpload
}
