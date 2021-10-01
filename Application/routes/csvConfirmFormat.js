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
const uploadFormatController = require('../controllers/uploadFormatController')
const uploadFormatDetailController = require('../controllers/uploadFormatDetailController')
const uploadFormatIdentifierController = require('../controllers/uploadFormatIdentifierController')
const { v4: uuidv4 } = require('uuid')
const url = require('url')
const filePath = process.env.INVOICE_UPLOAD_PATH
let csvfilename
let headerItems
let formatData
const cbGetCsvConfirmFormat = async (req, res, next) => {
  logger.info(constantsDefine.logMessage.INF000 + 'cbGetCsvConfirmFormat')

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

  csvfilename = req.body.csvfilename
  res.render('csvConfirmFormat', {
    csvTax: csvTax,
    csvUnit: csvUnit,
    TS_HOST: process.env.TS_HOST
  })
  logger.info(constantsDefine.logMessage.INF001 + 'cbGetCsvConfirmFormat')
}

const cbPostCsvConfirmFormat = async (req, res, next) => {
  logger.info(constantsDefine.logMessage.INF000 + 'cbPostCsvConfirmFormat')

  // DBから契約情報取得
  const contract = await contractController.findOne(req.user.tenantId)
  // データベースエラーは、エラーオブジェクトが返る
  // 契約情報未登録の場合もエラーを上げる
  if (contract instanceof Error || contract === null) return next(errorHelper.create(500))

  headerItems = JSON.parse(req.body.headerItems)
  formatData = req.body.formatData
  const uploadGeneral = JSON.parse(req.body.uploadGeneral)
  const taxIds = JSON.parse(req.body.taxIds)
  const unitIds = JSON.parse(req.body.unitIds)
  const csvTax = constantsDefine.csvFormatDefine.csvTax
  csvTax.map(tax => {
    const id = tax.id
    tax.id = taxIds[id]
    return ''
  })
  const csvUnit = constantsDefine.csvFormatDefine.csvUnit
  csvUnit.map(unit => {
    const id = unit.id
    unit.id = unitIds[id]
    return ''
  })
  console.log(formatData)

  const columnArr = [
    { columnName: '発行日', item: '', value: '' },
    { columnName: '請求書番号', item: '', value: '' },
    { columnName: 'テナントID', item: '', value: '' },
    { columnName: '支払期日', item: '', value: '' },
    { columnName: '納品日', item: '', value: '' },
    { columnName: '備考', item: '', value: '' },
    { columnName: '銀行名', item: '', value: '' },
    { columnName: '支店名', item: '', value: '' },
    { columnName: '科目', item: '', value: '' },
    { columnName: '口座番号', item: '', value: '' },
    { columnName: '口座名義', item: '', value: '' },
    { columnName: 'その他特記事項', item: '', value: '' },
    { columnName: '明細-項目ID', item: '', value: '' },
    { columnName: '明細-内容', item: '', value: '' },
    { columnName: '明細-数量', item: '', value: '' },
    { columnName: '明細-単位', item: '', value: '' },
    { columnName: '明細-単価', item: '', value: '' },
    { columnName: '明細-税（消費税／軽減税率／不課税／免税／非課税）', item: '', value: '' },
    { columnName: '明細-備考', item: '', value: '' }
  ]
  formatData.map((format, idx) => {
    if (format.length !== 0) {
      columnArr[idx].item = headerItems[format].item
      columnArr[idx].value = headerItems[format].value
      return ''
    } else {
      columnArr[idx].item = ''
      columnArr[idx].value = ''
      return ''
    }
  })

  res.render('csvConfirmFormat', {
    uploadFormatItemName: uploadGeneral.uploadFormatItemName,
    uploadType: uploadGeneral.uploadType,
    uploadGeneral: uploadGeneral,
    taxIds: taxIds,
    unitIds: unitIds,
    csvTax: csvTax,
    csvUnit: csvUnit,
    columnArr: columnArr,
    TS_HOST: process.env.TS_HOST
  })
}

const cbPostDBIndex = async (req, res, next) => {
  const functionName = 'cbPostDBIndex'
  logger.info(`${constantsDefine.logMessage.INF000}${functionName}`)
  if (!req.session || !req.user?.userId) {
    setErrorLog(req, 500)
    return res.status(500).send(constantsDefine.statusConstants.SYSTEMERRORMESSAGE)
  }

  const user = await userController.findOne(req.user.userId)
  if (user instanceof Error || user === null) {
    setErrorLog(req, 500)
    return res.status(500).send(constantsDefine.statusConstants.SYSTEMERRORMESSAGE)
  }
  if (user.dataValues?.userStatus !== 0) {
    setErrorLog(req, 500)
    return res.status(500).send(constantsDefine.statusConstants.SYSTEMERRORMESSAGE)
  }

  // DBから契約情報取得
  const contract = await contractController.findOne(req.user.tenantId)
  // データベースエラーは、エラーオブジェクトが返る
  // 契約情報未登録の場合もエラーを上げる
  if (contract instanceof Error || contract === null) {
    setErrorLog(req, 500)
    return res.status(500).send(constantsDefine.statusConstants.SYSTEMERRORMESSAGE)
  }

  const checkContractStatus = helper.checkContractStatus
  if (checkContractStatus === null || checkContractStatus === 999) {
    setErrorLog(req, 500)
    return res.status(500).send(constantsDefine.statusConstants.SYSTEMERRORMESSAGE)
  }

  req.session.userContext = 'LoggedIn'
  req.session.userRole = user.dataValues?.userRole

  const uploadFormatId = uuidv4()
  const resultUploadFormat = await uploadFormatController.insert(req.user.tenantId, {
    uploadFormatId: uploadFormatId,
    contractId: contract.dataValues.contractId,
    setName: req.body.uploadFormatItemName,
    uploadType: req.body.uploadType
  })

  if (!resultUploadFormat?.dataValues) {
    logger.info(`${constantsDefine.logMessage.DBINF001}${functionName}`)
  }

  let iCnt = 1
  let columnArr = [
    '発行日',
    '請求書番号',
    'テナントID',
    '支払期日',
    '納品日',
    '備考',
    '銀行名',
    '支店名',
    '科目',
    '口座番号',
    '口座名義',
    'その他特記事項',
    '明細-項目ID',
    '明細-内容',
    '明細-数量',
    '明細-単位',
    '明細-単価',
    '明細-税（消費税／軽減税率／不課税／免税／非課税）',
    '明細-備考'
  ]

  const globalCsvData = headerItems
  let resultUploadFormatDetail
  for (let idx = 0; idx < columnArr.length; idx++) {
    if (formatData[idx].length !== 0) {
      resultUploadFormatDetail = await uploadFormatDetailController.insert({
        uploadFormatId: uploadFormatId,
        serialNumber: iCnt, // 通番変数,
        uploadFormatItemName: globalCsvData[formatData[idx]]?.item, // 左のアイテム名,
        uploadFormatNumber: formatData[idx], // 左の番号,
        defaultItemName: columnArr[idx], // 右のアイテム名,
        defaultNumber: idx // 右の番号
      })
      iCnt++
      if (!resultUploadFormatDetail?.dataValues) {
        logger.info(`${constantsDefine.logMessage.DBINF001}${functionName}`)
      }
    }
  }

  iCnt = 1
  const csvTax = [
    { name: '消費税', value: req.body['消費税'] },
    { name: '軽減税率', value: req.body['軽減税率'] },
    { name: '不課税', value: req.body['不課税'] },
    { name: '免税', value: req.body['免税'] },
    { name: '非課税', value: req.body['非課税'] }
  ]
  for (let idx = 0; idx < csvTax.length; idx++) {
    if (csvTax[idx].value.length !== 0) {
      const resultUploadFormatIdentifier = await uploadFormatIdentifierController.insert({
        uploadFormatId: uploadFormatId,
        serialNumber: iCnt, // 通番変数,
        extensionType: '0', // 税(0)/単位(1) 判別,
        uploadFormatExtension: csvTax[idx].value, // 変更後名,
        defaultExtension: csvTax[idx].name // 変更前前
      })
      iCnt++
      if (!resultUploadFormatIdentifier?.dataValues) {
        logger.info(`${constantsDefine.logMessage.DBINF001}${functionName}`)
      }
    }
  }

  const csvUnit = [
    { name: '人月', value: req.body['人月'] },
    { name: 'ボトル', value: req.body['ボトル'] },
    { name: 'コスト', value: req.body['コスト'] },
    { name: 'コンテナ', value: req.body['コンテナ'] },
    { name: 'センチリットル', value: req.body['センチリットル'] },
    { name: '平方センチメートル', value: req.body['平方センチメートル'] },
    { name: '立方センチメートル', value: req.body['立方センチメートル'] },
    { name: 'センチメートル', value: req.body['センチメートル'] },
    { name: 'ケース', value: req.body['ケース'] },
    { name: 'カートン', value: req.body['カートン'] },
    { name: '日', value: req.body['日'] },
    { name: 'デシリットル', value: req.body['デシリットル'] },
    { name: 'デシメートル', value: req.body['デシメートル'] },
    { name: 'グロス・キログラム', value: req.body['グロス・キログラム'] },
    { name: '個', value: req.body['個'] },
    { name: 'フィート', value: req.body['フィート'] },
    { name: 'ガロン', value: req.body['ガロン'] },
    { name: 'グラム', value: req.body['グラム'] },
    { name: '総トン', value: req.body['総トン'] },
    { name: '時間', value: req.body['時間'] },
    { name: 'キログラム', value: req.body['キログラム'] },
    { name: 'キロメートル', value: req.body['キロメートル'] },
    { name: 'キロワット時', value: req.body['キロワット時'] },
    { name: 'ポンド', value: req.body['ポンド'] },
    { name: 'リットル', value: req.body['リットル'] },
    { name: 'ミリグラム', value: req.body['ミリグラム'] },
    { name: 'ミリリットル', value: req.body['ミリリットル'] },
    { name: 'ミリメートル', value: req.body['ミリメートル'] },
    { name: '月', value: req.body['月'] },
    { name: '平方メートル', value: req.body['平方メートル'] },
    { name: '立方メートル', value: req.body['立方メートル'] },
    { name: 'メーター', value: req.body['メーター'] },
    { name: '純トン', value: req.body['純トン'] },
    { name: '包', value: req.body['包'] },
    { name: '巻', value: req.body['巻'] },
    { name: '式', value: req.body['式'] },
    { name: 'トン', value: req.body['トン'] },
    { name: 'その他', value: req.body['その他'] }
  ]

  for (let idx = 0; idx < csvUnit.length; idx++) {
    if (csvUnit[idx].value.length !== 0) {
      const resultUploadFormatIdentifier = await uploadFormatIdentifierController.insert({
        uploadFormatId: uploadFormatId,
        serialNumber: iCnt, // 通番変数,
        extensionType: '1', // 税(0)/単位(1) 判別,
        uploadFormatExtension: csvUnit[idx].value, // 変更後名,
        defaultExtension: csvUnit[idx].name // 変更前前
      })
      iCnt++
      if (!resultUploadFormatIdentifier?.dataValues) {
        logger.info(`${constantsDefine.logMessage.DBINF001}${functionName}`)
      }
    }
  }

  // csv削除
  if (cbRemoveCsv(filePath, csvfilename) === false) {
    setErrorLog(req, 500)
    return res.status(500).send(constantsDefine.statusConstants.SYSTEMERRORMESSAGE)
  }

  res.redirect(303, '/portal')
  logger.info(constantsDefine.logMessage.INF001 + 'cbPostUploadFormat')
}

// CSVファイル削除機能
const cbRemoveCsv = (_deleteDataPath, _filename) => {
  logger.info(constantsDefine.logMessage.INF000 + 'cbRemoveCsv')
  const deleteFile = path.join(_deleteDataPath, '/' + _filename)
  if (fs.existsSync(deleteFile)) {
    fs.unlinkSync(deleteFile)
    logger.info(constantsDefine.logMessage.INF001 + 'cbRemoveCsv')
    return true
  } else {
    // 削除対象がない場合、サーバーエラー画面表示
    logger.info(constantsDefine.logMessage.INF001 + 'cbRemoveCsv')
    return false
  }
}

const setErrorLog = async (req, errorCode) => {
  const err = errorHelper.create(errorCode)
  const errorStatus = err.status

  // output log
  // ログには生のエラー情報を吐く
  const logMessage = { status: errorStatus, path: req.path }

  // ログインしていればユーザID、テナントIDを吐く
  if (req.user?.userId && req.user?.tenantId) {
    logMessage.tenant = req.user.tenantId
    logMessage.user = req.user.userId
  }

  logMessage.stack = err.stack

  logger.error(logMessage, err.name)
}


router.get('/', helper.isAuthenticated, cbGetCsvConfirmFormat)
router.post('/', cbPostCsvConfirmFormat)
router.post('/cbPostDBIndex', cbPostDBIndex)

module.exports = {
  router: router,
  cbGetCsvConfirmFormat: cbGetCsvConfirmFormat,
  cbPostCsvConfirmFormat: cbPostCsvConfirmFormat,
  cbRemoveCsv: cbRemoveCsv
}