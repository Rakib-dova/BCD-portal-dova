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
const uploadFormatController = require('../controllers/uploadFormatController')
const uploadFormatDetailController = require('../controllers/uploadFormatDetailController')
const uploadFormatIdentifierController = require('../controllers/uploadFormatIdentifierController')
const { v4: uuidv4 } = require('uuid')
const fs = require('fs')
const path = require('path')
const filePath = process.env.INVOICE_UPLOAD_PATH
let globalCsvData = []
let uploadFormatItemName
let uploadType
let csvfilename
let uploadFormatNumber
let defaultNumber

let keyConsumptionTax
let keyReducedTax
let keyFreeTax
let keyDutyFree
let keyExemptTax

let keyManMonth
let keyBottle
let keyCost
let keyContainer
let keyCentilitre
let keySquareCentimeter
let keyCubicCentimeter
let keyCentimeter
let keyCase
let keyCarton
let keyDay
let keyDeciliter
let keyDecimeter
let keyGrossKilogram
let keyPieces
let keyFeet
let keyGallon
let keyGram
let keyGrossTonnage
let keyHour
let keyKilogram
let keyKilometers
let keyKilowattHour
let keyPound
let keyLiter
let keyMilligram
let keyMilliliter
let keyMillimeter
let keyMonth
let keySquareMeter
let keyCubicMeter
let keyMeter
let keyNetTonnage
let keyPackage
let keyRoll
let keyFormula
let keyTonnage
let keyOthers

const bodyParser = require('body-parser')
router.use(
  bodyParser.json({
    type: 'application/json',
    limit: '100KB'
  })
)

const cbPostIndex = async (req, res, next) => {
  logger.info(constantsDefine.logMessage.INF000 + 'cbPostIndex')
  if (!req.session || !req.user?.userId) {
    setErrorLog(req, 500)
    return res.status(500).send(constantsDefine.statusConstants.SYSTEMERRORMESSAGE)
  }
  // DBからuserデータ取得
  const user = await userController.findOne(req.user.userId)
  // データベースエラーは、エラーオブジェクトが返る
  // user未登録の場合もエラーを上げる
  if (user instanceof Error || user === null) {
    setErrorLog(req, 500)
    return res.status(500).send(constantsDefine.statusConstants.SYSTEMERRORMESSAGE)
  }

  // TX依頼後に改修、ユーザステイタスが0以外の場合、「404」エラーとする not 403
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

  // ユーザ権限を取得
  req.session.userRole = user.dataValues?.userRole
  const deleteFlag = contract.dataValues.deleteFlag
  const contractStatus = contract.dataValues.contractStatus

  if (!validate.isStatusForCancel(contractStatus, deleteFlag)) {
    return next(noticeHelper.create('cancelprocedure'))
  }

  // アプロードしたファイルを読み込む
  csvfilename = req.body.dataFileName
  uploadFormatNumber = req.body.uploadFormatNumber - 1
  defaultNumber = req.body.defaultNumber - 1
  const extractFullpathFile = path.join(filePath, '/') + req.body.dataFileName
  const csv = fs.readFileSync(extractFullpathFile, 'utf8')
  const tmpRows = csv.split(/\r?\n|\r/)
  const mesaiArr = tmpRows[defaultNumber].trim().split(',') // 修正必要（データ開始行番号）
  let headerArr = []
  if (req.body.checkItemNameLine === 'on') {
    headerArr = tmpRows[uploadFormatNumber].trim().split(',') // 修正必要（項目名の行番号）
  } else {
    mesaiArr.map((meisai) => {
      headerArr.push('')
      return ''
    })
  }
  // 配列に読み込んだcsvデータを入れる。
  const csvData = headerArr.map((header) => { return { item: header, value: '' } })

  mesaiArr.map((mesai, idx) => {
    csvData[idx].value = mesai
    return ''
  })

  globalCsvData = csvData
  uploadFormatItemName = req.body.uploadFormatItemName
  uploadType = req.body.uploadType

  // tax
  keyConsumptionTax = req.body.keyConsumptionTax
  keyReducedTax = req.body.keyReducedTax
  keyFreeTax = req.body.keyFreeTax
  keyDutyFree = req.body.keyDutyFree
  keyExemptTax = req.body.keyExemptTax

  // unit
  keyManMonth = req.body.keyManMonth
  keyBottle = req.body.keyBottle
  keyCost = req.body.keyCost
  keyContainer = req.body.keyContainer
  keyCentilitre = req.body.keyCentilitre
  keySquareCentimeter = req.body.keySquareCentimeter
  keyCubicCentimeter = req.body.keyCubicCentimeter
  keyCentimeter = req.body.keyCentimeter
  keyCase = req.body.keyCase
  keyCarton = req.body.keyCarton
  keyDay = req.body.keyDay
  keyDeciliter = req.body.keyDeciliter
  keyDecimeter = req.body.keyDecimeter
  keyGrossKilogram = req.body.keyGrossKilogram
  keyPieces = req.body.keyPieces
  keyFeet = req.body.keyFeet
  keyGallon = req.body.keyGallon
  keyGram = req.body.keyGram
  keyGrossTonnage = req.body.keyGrossTonnage
  keyHour = req.body.keyHour
  keyKilogram = req.body.keyKilogram
  keyKilometers = req.body.keyKilometers
  keyKilowattHour = req.body.keyKilowattHour
  keyPound = req.body.keyPound
  keyLiter = req.body.keyLiter
  keyMilligram = req.body.keyMilligram
  keyMilliliter = req.body.keyMilliliter
  keyMillimeter = req.body.keyMillimeter
  keyMonth = req.body.keyMonth
  keySquareMeter = req.body.keySquareMeter
  keyCubicMeter = req.body.keyCubicMeter
  keyMeter = req.body.keyMeter
  keyNetTonnage = req.body.keyNetTonnage
  keyPackage = req.body.keyPackage
  keyRoll = req.body.keyRoll
  keyFormula = req.body.keyFormula
  keyTonnage = req.body.keyTonnage
  keyOthers = req.body.keyOthers
  res.render('uploadFormat', {
    headerItems: csvData
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
    setName: uploadFormatItemName,
    uploadType: uploadType
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
  let resultUploadFormatDetail
  for (let idx = 0; idx < columnArr.length; idx++) {
    if (req.body.formatData[idx].length !== 0) {
      resultUploadFormatDetail = await uploadFormatDetailController.insert({
        uploadFormatId: uploadFormatId,
        serialNumber: iCnt, // 通番変数,
        uploadFormatItemName: globalCsvData[req.body.formatData[idx]]?.item, // 左のアイテム名,
        uploadFormatNumber: req.body.formatData[idx], // 左の番号,
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
    { name: '消費税', value: keyConsumptionTax },
    { name: '軽減税率', value: keyReducedTax },
    { name: '不課税', value: keyFreeTax },
    { name: '免税', value: keyDutyFree },
    { name: '非課税', value: keyExemptTax }
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
    { name: '人月', value: keyManMonth },
    { name: 'ボトル', value: keyBottle },
    { name: 'コスト', value: keyCost },
    { name: 'コンテナ', value: keyContainer },
    { name: 'センチリットル', value: keyCentilitre },
    { name: '平方センチメートル', value: keySquareCentimeter },
    { name: '立方センチメートル', value: keyCubicCentimeter },
    { name: 'センチメートル', value: keyCentimeter },
    { name: 'ケース', value: keyCase },
    { name: 'カートン', value: keyCarton },
    { name: '日', value: keyDay },
    { name: 'デシリットル', value: keyDeciliter },
    { name: 'デシメートル', value: keyDecimeter },
    { name: 'グロス・キログラム', value: keyGrossKilogram },
    { name: '個', value: keyPieces },
    { name: 'フィート', value: keyFeet },
    { name: 'ガロン', value: keyGallon },
    { name: 'グラム', value: keyGram },
    { name: '総トン', value: keyGrossTonnage },
    { name: '時間', value: keyHour },
    { name: 'キログラム', value: keyKilogram },
    { name: 'キロメートル', value: keyKilometers },
    { name: 'キロワット時', value: keyKilowattHour },
    { name: 'ポンド', value: keyPound },
    { name: 'リットル', value: keyLiter },
    { name: 'ミリグラム', value: keyMilligram },
    { name: 'ミリリットル', value: keyMilliliter },
    { name: 'ミリメートル', value: keyMillimeter },
    { name: '月', value: keyMonth },
    { name: '平方メートル', value: keySquareMeter },
    { name: '立方メートル', value: keyCubicMeter },
    { name: 'メーター', value: keyMeter },
    { name: '純トン', value: keyNetTonnage },
    { name: '包', value: keyPackage },
    { name: '巻', value: keyRoll },
    { name: '式', value: keyFormula },
    { name: 'トン', value: keyTonnage },
    { name: 'その他', value: keyOthers }
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

router.post('/', cbPostIndex)
router.post('/cbPostDBIndex', cbPostDBIndex)

module.exports = {
  router: router,
  cbPostIndex: cbPostIndex,
  cbPostDBIndex: cbPostDBIndex,
  cbRemoveCsv: cbRemoveCsv // UTtestのため
}
