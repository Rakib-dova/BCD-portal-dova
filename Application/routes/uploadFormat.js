'use strict'
const express = require('express')
const router = express.Router()
const helper = require('./helpers/middleware')
const noticeHelper = require('./helpers/notice')
const errorHelper = require('./helpers/error')
const userController = require('../controllers/userController.js')
const contractController = require('../controllers/contractController.js')
const uploadFormatController = require('../controllers/uploadFormatController')
const uploadFormatDetailController = require('../controllers/uploadFormatDetailController')
const uploadFormatIdentifierController = require('../controllers/uploadFormatIdentifierController')
const { v4: uuidv4 } = require('uuid')
const logger = require('../lib/logger')
const validate = require('../lib/validate')
const constantsDefine = require('../constants')
const fs = require('fs')
const path = require('path')
const filePath = process.env.INVOICE_UPLOAD_PATH
const bodyParser = require('body-parser')
router.use(
  bodyParser.urlencoded({
    extended: false,
    type: 'multipart/form-data',
    limit: '6826KB'
  })
)

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

const cbPostIndex = async (req, res, next) => {
  logger.info(constantsDefine.logMessage.INF000 + 'cbPostIndex')

  if (!req.session || !req.user?.userId) return next(errorHelper.create(500))

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
  req.session.userRole = user.dataValues?.userRole
  const deleteFlag = contract.dataValues.deleteFlag
  const contractStatus = contract.dataValues.contractStatus
  const checkContractStatus = helper.checkContractStatus

  if (checkContractStatus === null || checkContractStatus === 999) return next(errorHelper.create(500))

  if (!validate.isStatusForCancel(contractStatus, deleteFlag)) return next(noticeHelper.create('cancelprocedure'))

  // アプロードしたファイルを読み込む
  csvfilename = user.dataValues.userId + '_' + req.body.dataFileName
  uploadFormatNumber = req.body.uploadFormatNumber - 1
  defaultNumber = req.body.defaultNumber - 1

  if (
    (req.body.checkItemNameLine === 'on' && ~~req.body.uploadFormatNumber <= 0) ||
    ~~req.body.defaultNumber <= 0 ||
    ~~req.body.defaultNumber <= ~~req.body.uploadFormatNumber
  ) {
    // csv削除
    if (cbRemoveCsv(filePath, csvfilename) === false) {
      return next(errorHelper.create(500))
    }

    // 前の画面に遷移
    const backURL = req.header('Referer') || '/'
    return res.redirect(backURL)
  }

  const extractFullpathFile = path.join(filePath, '/') + csvfilename

  const csv = fs.readFileSync(extractFullpathFile, 'utf8')
  const tmpRows = csv.split(/\r?\n|\r/)
  const checkRow = []
  tmpRows.forEach((row) => {
    if (row.trim() !== '') checkRow.push(row)
  })

  if (checkRow.length < defaultNumber + 1) {
    const backURL = req.header('Referer') || '/'
    return res.redirect(backURL)
  }
  const mesaiArr = tmpRows[defaultNumber].trim().split(',')
  let headerArr = []
  if (req.body.checkItemNameLine === 'on') {
    headerArr = tmpRows[uploadFormatNumber].trim().split(',')
  } else {
    mesaiArr.map((meisai) => {
      headerArr.push('')
      return ''
    })
  }

  let duplicateFlag = false
  // 配列に読み込んだcsvデータを入れる。
  const columnArr = constantsDefine.csvFormatDefine.columnArr
  const csvData = headerArr.map((header, idx) => {
    if (header.length > 100) {
      duplicateFlag = true
    }

    const colName = columnArr[idx] === undefined ? '' : columnArr[idx].columnName

    return { item: header, value: '', moto: colName }
  })

  // csv削除
  if (cbRemoveCsv(filePath, csvfilename) === false) {
    return next(errorHelper.create(500))
  }

  if (duplicateFlag) {
    const backURL = req.header('Referer') || '/'
    return res.redirect(backURL)
  }

  mesaiArr.map((mesai, idx) => {
    if (mesai.length > 100) {
      duplicateFlag = true
    }
    csvData[idx].value = mesai
    return ''
  })

  if (duplicateFlag) {
    const backURL = req.header('Referer') || '/'
    return res.redirect(backURL)
  }

  globalCsvData = csvData
  uploadFormatItemName = req.body.uploadFormatItemName
  uploadType = req.body.uploadType

  const uploadGeneral = {
    uploadFormatItemName: uploadFormatItemName,
    uploadType: uploadType
  }

  // tax
  keyConsumptionTax = req.body.keyConsumptionTax
  keyReducedTax = req.body.keyReducedTax
  keyFreeTax = req.body.keyFreeTax
  keyDutyFree = req.body.keyDutyFree
  keyExemptTax = req.body.keyExemptTax

  const taxIds = {
    keyConsumptionTax: keyConsumptionTax,
    keyReducedTax: keyReducedTax,
    keyFreeTax: keyFreeTax,
    keyDutyFree: keyDutyFree,
    keyExemptTax: keyExemptTax
  }

  const taxKey = Object.keys(taxIds)

  taxKey.forEach((key, idx, obj) => {
    taxIds[key] = {
      key: key,
      value: taxIds[key],
      itemName: constantsDefine.csvFormatDefine.csvTax[idx].name
    }
  })

  {
    const checkDuplicate = [keyConsumptionTax, keyReducedTax, keyFreeTax, keyDutyFree, keyExemptTax]
    const resultDuplicate = checkDuplicate.map((item, idx, arr) => {
      if (item === undefined) {
        return false
      }
      if (item.length > 100) {
        return true
      }
      if (item !== '') {
        for (let start = idx + 1; start < arr.length; start++) {
          if (item === arr[start]) {
            return true
          }
        }
      }
      return false
    })

    if (resultDuplicate.indexOf(true) !== -1) {
      const backURL = req.header('Referer') || '/'
      return res.redirect(backURL)
    }
  }

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

  const unitIds = {
    keyManMonth: keyManMonth,
    keyBottle: keyBottle,
    keyCost: keyCost,
    keyContainer: keyContainer,
    keyCentilitre: keyCentilitre,
    keySquareCentimeter: keySquareCentimeter,
    keyCubicCentimeter: keyCubicCentimeter,
    keyCentimeter: keyCentimeter,
    keyCase: keyCase,
    keyCarton: keyCarton,
    keyDay: keyDay,
    keyDeciliter: keyDeciliter,
    keyDecimeter: keyDecimeter,
    keyGrossKilogram: keyGrossKilogram,
    keyPieces: keyPieces,
    keyFeet: keyFeet,
    keyGallon: keyGallon,
    keyGram: keyGram,
    keyGrossTonnage: keyGrossTonnage,
    keyHour: keyHour,
    keyKilogram: keyKilogram,
    keyKilometers: keyKilometers,
    keyKilowattHour: keyKilowattHour,
    keyPound: keyPound,
    keyLiter: keyLiter,
    keyMilligram: keyMilligram,
    keyMilliliter: keyMilliliter,
    keyMillimeter: keyMillimeter,
    keyMonth: keyMonth,
    keySquareMeter: keySquareMeter,
    keyCubicMeter: keyCubicMeter,
    keyMeter: keyMeter,
    keyNetTonnage: keyNetTonnage,
    keyPackage: keyPackage,
    keyRoll: keyRoll,
    keyFormula: keyFormula,
    keyTonnage: keyTonnage,
    keyOthers: keyOthers
  }

  const unitKey = Object.keys(unitIds)

  unitKey.forEach((key, idx, obj) => {
    unitIds[key] = {
      key: key,
      value: unitIds[key],
      itemName: constantsDefine.csvFormatDefine.csvUnit[idx].name
    }
  })

  {
    const checkDuplicate = [
      keyManMonth,
      keyBottle,
      keyCost,
      keyContainer,
      keyCentilitre,
      keySquareCentimeter,
      keyCubicCentimeter,
      keyCentimeter,
      keyCase,
      keyCarton,
      keyDay,
      keyDeciliter,
      keyDecimeter,
      keyGrossKilogram,
      keyPieces,
      keyFeet,
      keyGallon,
      keyGram,
      keyGrossTonnage,
      keyHour,
      keyKilogram,
      keyKilometers,
      keyKilowattHour,
      keyPound,
      keyLiter,
      keyMilligram,
      keyMilliliter,
      keyMillimeter,
      keyMonth,
      keySquareMeter,
      keyCubicMeter,
      keyMeter,
      keyNetTonnage,
      keyPackage,
      keyRoll,
      keyFormula,
      keyTonnage,
      keyOthers
    ]

    const resultDuplicate = checkDuplicate.map((item, idx, arr) => {
      if (item === undefined) {
        return false
      }
      if (item.length > 100) {
        return true
      }
      if (item !== '') {
        for (let start = idx + 1; start < arr.length; start++) {
          if (item === arr[start]) {
            return true
          }
        }
      }
      return false
    })

    if (resultDuplicate.indexOf(true) !== -1) {
      const backURL = req.header('Referer') || '/'
      return res.redirect(backURL)
    }
  }

  const emptyselectedFormatData = []
  for (let i = 0; i < 19; i++) {
    emptyselectedFormatData.push('')
  }

  res.render('uploadFormat', {
    headerItems: csvData,
    uploadGeneral: uploadGeneral,
    taxIds: taxIds,
    unitIds: unitIds,
    csvfilename: csvfilename,
    selectedFormatData: emptyselectedFormatData
  })

  logger.info(constantsDefine.logMessage.INF001 + 'cbPostIndex')
}

const cbPostConfirmIndex = async (req, res, next) => {
  logger.info(constantsDefine.logMessage.INF000 + 'cbPostConfirmIndex')

  if (!req.session || !req.user?.userId) return next(errorHelper.create(500))

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
  req.session.userRole = user.dataValues?.userRole
  const deleteFlag = contract.dataValues.deleteFlag
  const contractStatus = contract.dataValues.contractStatus
  const checkContractStatus = helper.checkContractStatus

  if (checkContractStatus === null || checkContractStatus === 999) return next(errorHelper.create(500))

  if (!validate.isStatusForCancel(contractStatus, deleteFlag)) return next(noticeHelper.create('cancelprocedure'))

  const uploadFormatId = uuidv4()
  const resultUploadFormat = await uploadFormatController.insert(req.user.tenantId, {
    uploadFormatId: uploadFormatId,
    contractId: contract.dataValues.contractId,
    setName: uploadFormatItemName,
    uploadType: uploadType
  })

  if (!resultUploadFormat?.dataValues) {
    logger.info(`${constantsDefine.logMessage.DBINF001} + 'cbPostConfirmIndex'`)
  }

  let iCnt = 1
  const columnArr = constantsDefine.csvFormatDefine.columnArr

  // uploadFormatDetailController登録
  let resultUploadFormatDetail
  for (let idx = 0; idx < columnArr.length; idx++) {
    if (req.body.formatData[idx].length !== 0) {
      resultUploadFormatDetail = await uploadFormatDetailController.insert({
        uploadFormatId: uploadFormatId,
        serialNumber: iCnt, // 通番変数,
        uploadFormatItemName: globalCsvData[req.body.formatData[idx]]?.item, // 左のアイテム名,
        uploadFormatNumber: req.body.formatData[idx], // 左の番号,
        defaultItemName: columnArr[idx].columnName, // 右のアイテム名,
        defaultNumber: idx // 右の番号
      })
      iCnt++
      if (!resultUploadFormatDetail?.dataValues) {
        logger.info(`${constantsDefine.logMessage.DBINF001} + 'cbPostConfirmIndex'`)
      }
    }
  }

  iCnt = 1

  const taxIds = [
    { name: '消費税', value: keyConsumptionTax },
    { name: '軽減税率', value: keyReducedTax },
    { name: '不課税', value: keyFreeTax },
    { name: '免税', value: keyDutyFree },
    { name: '非課税', value: keyExemptTax }
  ]

  for (let idx = 0; idx < taxIds.length; idx++) {
    if (taxIds[idx].value.length !== 0) {
      const resultUploadFormatIdentifier = await uploadFormatIdentifierController.insert({
        uploadFormatId: uploadFormatId,
        serialNumber: iCnt, // 通番変数,
        extensionType: '0', // 税(0)/単位(1) 判別,
        uploadFormatExtension: taxIds[idx].value, // 変更後名,
        defaultExtension: taxIds[idx].name // 変更前前
      })
      iCnt++
      if (!resultUploadFormatIdentifier?.dataValues) {
        logger.info(`${constantsDefine.logMessage.DBINF001} + 'cbPostConfirmIndex'`)
      }
    }
  }

  const unitIds = [
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

  for (let idx = 0; idx < unitIds.length; idx++) {
    if (unitIds[idx].value.length !== 0) {
      const resultUploadFormatIdentifier = await uploadFormatIdentifierController.insert({
        uploadFormatId: uploadFormatId,
        serialNumber: iCnt, // 通番変数,
        extensionType: '1', // 税(0)/単位(1) 判別,
        uploadFormatExtension: unitIds[idx].value, // 変更後名,
        defaultExtension: unitIds[idx].name // 変更前前
      })
      iCnt++
      if (!resultUploadFormatIdentifier?.dataValues) {
        logger.info(`${constantsDefine.logMessage.DBINF001} + 'cbPostConfirmIndex'`)
      }
    }
  }

  res.redirect(303, '/portal')
  logger.info(constantsDefine.logMessage.INF001 + 'cbPostConfirmIndex')
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

router.post('/', cbPostIndex)
router.post('/cbPostConfirmIndex', cbPostConfirmIndex)

module.exports = {
  router: router,
  cbPostIndex: cbPostIndex,
  cbPostConfirmIndex: cbPostConfirmIndex,
  cbRemoveCsv: cbRemoveCsv
}
