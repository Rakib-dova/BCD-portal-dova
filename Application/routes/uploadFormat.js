'use strict'
const express = require('express')
const router = express.Router()
const noticeHelper = require('./helpers/notice')
const errorHelper = require('./helpers/error')
const userController = require('../controllers/userController.js')
const contractController = require('../controllers/contractController.js')
const logger = require('../lib/logger')
const validate = require('../lib/validate')
const constantsDefine = require('../constants')
const fs = require('fs')
const path = require('path')
const url = require('url')
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
    limit: '100MB' // フォーマットサイズ５M以上
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
  csvfilename = user.dataValues.userId + '_' + req.body.dataFileName
  uploadFormatNumber = req.body.uploadFormatNumber - 1
  defaultNumber = req.body.defaultNumber - 1

  if (
    ~~req.body.defaultNumber <= 0 ||
    ~~req.body.uploadFormatNumber <= 0 ||
    ~~req.body.defaultNumber <= ~~req.body.uploadFormatNumber
  ) {
    const backURL = req.header('Referer') || '/'
    return res.redirect(backURL)
  }
  const extractFullpathFile = path.join(filePath, '/') + csvfilename

  const csv = fs.readFileSync(extractFullpathFile, 'utf8')
  const tmpRows = csv.split(/\r?\n|\r/)
  const checkRow = []
  tmpRows.forEach((row) => {
    console.log(row)
    if (row.trim() !== '') checkRow.push(row)
  })
  
  if (checkRow.length < defaultNumber + 1) {
    const backURL = req.header('Referer') || '/'
    return res.redirect(backURL)
  }
  const mesaiArr = tmpRows[defaultNumber].trim().split(',') // 修正必要（データ開始行番号）
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
  const csvData = headerArr.map((header) => {
    if (header.length > 100) {
      duplicateFlag = true
    }
    return { item: header, value: '' }
  })

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

<<<<<<< HEAD
=======
  if (duplicateFlag) {
    const backURL = req.header('Referer') || '/'
    return res.redirect(backURL)
  }

  globalCsvData = csvData
>>>>>>> bf59967997c66de29eb67d26552a81a5973fd78b
  uploadFormatItemName = req.body.uploadFormatItemName
  uploadType = req.body.uploadType
  const uploadGeneral= {
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

  {
    const checkDuplicate = [keyConsumptionTax, keyReducedTax, keyFreeTax, keyDutyFree, keyExemptTax]
    const resultDuplicate = checkDuplicate.map((item, idx, arr) => {
      if (Object.prototype.toString.call(item) === undefined) {
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
<<<<<<< HEAD
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

=======

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
      if (Object.prototype.toString.call(item) === undefined) {
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
>>>>>>> bf59967997c66de29eb67d26552a81a5973fd78b
  res.render('uploadFormat', {
    headerItems: csvData,
    uploadGeneral: uploadGeneral,
    taxIds: taxIds,
    unitIds: unitIds,
    csvfilename: csvfilename
  })
}

const cbPostConfirmIndex = async (req, res, next) => {
  logger.info(constantsDefine.logMessage.INF000 + 'cbPostConfirmIndex')
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

  // res.redirect(303, '/csvConfirmFormat')
  res.redirect(307, url.format({
    pathname:'/csvConfirmFormat',
    body: {
      tenantId: req.user.tenantId,
      userRole: req.session.userRole,
      numberN: contract.dataValues?.numberN,
      TS_HOST: process.env.TS_HOST
    }
  }))
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
// router.post('/cbPostDBIndex', cbPostDBIndex)
router.post('/cbPostDBIndex', cbPostConfirmIndex)

module.exports = {
  router: router,
  cbPostIndex: cbPostIndex,
  // cbPostDBIndex: cbPostDBIndex,
  cbPostConfirmIndex: cbPostConfirmIndex
}
