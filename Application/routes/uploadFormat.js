'use strict'
const express = require('express')
const router = express.Router()
const helper = require('./helpers/middleware')
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
    limit: '6826KB' // フォーマットサイズ５M以下
  })
)

const cbPostIndex = async (req, res, next) => {
  console.log('uploadFormat_cbPostIndex1')
  logger.info(constantsDefine.logMessage.INF000 + 'cbPostIndex')

  console.log('uploadFormat_cbPostIndex2')
  if (!req.session || !req.user?.userId) {
    return next(errorHelper.create(500))
  }

  console.log('uploadFormat_cbPostIndex3')
  req.session.csvUploadFormatReturnFlag1 = true

  // DBからuserデータ取得
  console.log('uploadFormat_cbPostIndex4')
  const user = await userController.findOne(req.user.userId)
  // データベースエラーは、エラーオブジェクトが返る
  // user未登録の場合もエラーを上げる
  console.log('uploadFormat_cbPostIndex5')
  if (user instanceof Error || user === null) {
    return next(errorHelper.create(500))
  }

  // TX依頼後に改修、ユーザステイタスが0以外の場合、「404」エラーとする not 403
  console.log('uploadFormat_cbPostIndex6')
  if (user.dataValues?.userStatus !== 0) {
    return next(errorHelper.create(404))
  }

  // DBから契約情報取得
  console.log('uploadFormat_cbPostIndex7')
  const contract = await contractController.findOne(req.user.tenantId)
  // データベースエラーは、エラーオブジェクトが返る
  // 契約情報未登録の場合もエラーを上げる
  console.log('uploadFormat_cbPostIndex8')
  if (contract instanceof Error || contract === null) {
    return next(errorHelper.create(500))
  }

  // ユーザ権限を取得
  console.log('uploadFormat_cbPostIndex9')
  req.session.userRole = user.dataValues?.userRole
  const deleteFlag = contract.dataValues.deleteFlag
  const contractStatus = contract.dataValues.contractStatus
  const checkContractStatus = helper.checkContractStatus

  console.log('uploadFormat_cbPostIndex10')
  if (checkContractStatus === null || checkContractStatus === 999) return next(errorHelper.create(500))

  console.log('uploadFormat_cbPostIndex11')
  if (!validate.isStatusForCancel(contractStatus, deleteFlag)) {
    return next(noticeHelper.create('cancelprocedure'))
  }

  // アプロードしたファイルを読み込む
  console.log('uploadFormat_cbPostIndex12')
  csvfilename = user.dataValues.userId + '_' + req.body.dataFileName
  uploadFormatNumber = req.body.uploadFormatNumber - 1
  defaultNumber = req.body.defaultNumber - 1

  console.log('uploadFormat_cbPostIndex13')
  if (
    (req.body.checkItemNameLine === 'on' && ~~req.body.uploadFormatNumber <= 0) ||
    ~~req.body.defaultNumber <= 0 ||
    ~~req.body.defaultNumber <= ~~req.body.uploadFormatNumber
  ) {
    console.log('uploadFormat_cbPostIndex14')
    console.log('uploadFormat_cbPostIndex15')
    const backURL = req.header('Referer') || '/'
    return res.redirect(backURL)
  }
  console.log('uploadFormat_cbPostIndex16')
  const extractFullpathFile = path.join(filePath, '/') + csvfilename

  console.log('uploadFormat_cbPostIndex17')
  const csv = fs.readFileSync(extractFullpathFile, 'utf8')
  const tmpRows = csv.split(/\r?\n|\r/)
  const checkRow = []
  tmpRows.forEach((row) => {
    if (row.trim() !== '') checkRow.push(row)
  })

  console.log('uploadFormat_cbPostIndex18')
  if (checkRow.length < defaultNumber + 1) {
    const backURL = req.header('Referer') || '/'
    return res.redirect(backURL)
  }
  console.log('uploadFormat_cbPostIndex19')
  const mesaiArr = tmpRows[defaultNumber].trim().split(',') // 修正必要（データ開始行番号）
  let headerArr = []
  console.log('uploadFormat_cbPostIndex20')
  if (req.body.checkItemNameLine === 'on') {
    console.log('uploadFormat_cbPostIndex21')
    headerArr = tmpRows[uploadFormatNumber].trim().split(',')
  } else {
    console.log('uploadFormat_cbPostIndex22')
    mesaiArr.map((meisai) => {
      headerArr.push('')
      return ''
    })
  }

  console.log('uploadFormat_cbPostIndex23')
  let duplicateFlag = false
  // 配列に読み込んだcsvデータを入れる。
  const csvData = headerArr.map((header) => {
    if (header.length > 100) {
      duplicateFlag = true
    }
    return { item: header, value: '' }
  })

  console.log('uploadFormat_cbPostIndex24')
  if (duplicateFlag) {
    const backURL = req.header('Referer') || '/'
    return res.redirect(backURL)
  }

  console.log('uploadFormat_cbPostIndex25')
  mesaiArr.map((mesai, idx) => {
    if (mesai.length > 100) {
      duplicateFlag = true
    }
    csvData[idx].value = mesai
    return ''
  })

  console.log('uploadFormat_cbPostIndex26')
  if (duplicateFlag) {
    const backURL = req.header('Referer') || '/'
    return res.redirect(backURL)
  }

  console.log('uploadFormat_cbPostIndex27')
  uploadFormatItemName = req.body.uploadFormatItemName
  uploadType = req.body.uploadType
  const uploadGeneral = {
    uploadFormatItemName: uploadFormatItemName,
    uploadType: uploadType
  }

  console.log('uploadFormat_cbPostIndex28')
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

  console.log('uploadFormat_cbPostIndex29')
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
  console.log('uploadFormat_cbPostIndex29')

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
  console.log('uploadFormat_cbPostIndex30')
  const emptyselectedFormatData = []
  for (let i = 0; i < 19; i++) {
    emptyselectedFormatData.push('')
  }

  console.log('uploadFormat_cbPostIndex31')
  // csv削除
  if (cbRemoveCsv(filePath, csvfilename) === false) {
    return next(errorHelper.create(500))
  }

  console.log('uploadFormat_cbPostIndex32')
  res.render('uploadFormat', {
    headerItems: csvData,
    uploadGeneral: uploadGeneral,
    taxIds: taxIds,
    unitIds: unitIds,
    csvfilename: csvfilename,
    selectedFormatData: emptyselectedFormatData
  })
  console.log('uploadFormat_cbPostIndex33')
  logger.info(constantsDefine.logMessage.INF001 + 'cbPostIndex')
}

const cbPostConfirmIndex = async (req, res, next) => {
  console.log('uploadFormat_cbPostConfirmIndex1')
  logger.info(constantsDefine.logMessage.INF000 + 'cbPostConfirmIndex')
  if (!req.session || !req.user?.userId) {
    return next(errorHelper.create(500))
  }
  // DBからuserデータ取得
  console.log('uploadFormat_cbPostConfirmIndex2')
  const user = await userController.findOne(req.user.userId)
  // データベースエラーは、エラーオブジェクトが返る
  // user未登録の場合もエラーを上げる
  console.log('uploadFormat_cbPostConfirmIndex3')
  if (user instanceof Error || user === null) {
    return next(errorHelper.create(500))
  }

  console.log('uploadFormat_cbPostConfirmIndex4')
  // TX依頼後に改修、ユーザステイタスが0以外の場合、「404」エラーとする not 403
  if (user.dataValues?.userStatus !== 0) {
    return next(errorHelper.create(404))
  }

  // DBから契約情報取得
  console.log('uploadFormat_cbPostConfirmIndex5')
  const contract = await contractController.findOne(req.user.tenantId)
  // データベースエラーは、エラーオブジェクトが返る
  // 契約情報未登録の場合もエラーを上げる
  if (contract instanceof Error || contract === null) {
    return next(errorHelper.create(500))
  }

  // ユーザ権限を取得
  console.log('uploadFormat_cbPostConfirmIndex6')
  req.session.userRole = user.dataValues?.userRole
  const deleteFlag = contract.dataValues.deleteFlag
  const contractStatus = contract.dataValues.contractStatus
  const checkContractStatus = helper.checkContractStatus

  console.log('uploadFormat_cbPostConfirmIndex7')
  if (checkContractStatus === null || checkContractStatus === 999) return next(errorHelper.create(500))

  console.log('uploadFormat_cbPostConfirmIndex8')
  if (!validate.isStatusForCancel(contractStatus, deleteFlag)) {
    return next(noticeHelper.create('cancelprocedure'))
  }

  console.log('uploadFormat_cbPostConfirmIndex9')
  res.redirect(
    307,
    url.format({
      pathname: '/csvConfirmFormat',
      body: {
        tenantId: req.user.tenantId,
        userRole: req.session.userRole,
        numberN: contract.dataValues?.numberN,
        TS_HOST: process.env.TS_HOST
      }
    })
  )
  console.log('uploadFormat_cbPostConfirmIndex10')
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

const cbPostBackIndex = async (req, res, next) => {
  console.log('uploadFormat_cbPostBackIndex1')
  logger.info(constantsDefine.logMessage.INF000 + 'cbPostBackIndex')
  req.session.csvUploadFormatReturnFlag2 = true

  // 認証情報取得処理
  console.log('uploadFormat_cbPostBackIndex2')
  if (!req.session || !req.user?.userId) return next(errorHelper.create(500))

  // DBからuserデータ取得
  console.log('uploadFormat_cbPostBackIndex3')
  const user = await userController.findOne(req.user.userId)
  // データベースエラーは、エラーオブジェクトが返る
  // user未登録の場合もエラーを上げる
  console.log('uploadFormat_cbPostBackIndex4')
  if (user instanceof Error || user === null) return next(errorHelper.create(500))

  // TX依頼後に改修、ユーザステイタスが0以外の場合、「404」エラーとする not 403
  console.log('uploadFormat_cbPostBackIndex5')
  if (user.dataValues?.userStatus !== 0) return next(errorHelper.create(404))
  if (req.session?.userContext !== 'LoggedIn') return next(errorHelper.create(400))

  // DBから契約情報取得
  console.log('uploadFormat_cbPostBackIndex6')
  const contract = await contractController.findOne(req.user.tenantId)
  // データベースエラーは、エラーオブジェクトが返る
  // 契約情報未登録の場合もエラーを上げる
  console.log('uploadFormat_cbPostBackIndex7')
  if (contract instanceof Error || contract === null) return next(errorHelper.create(500))

  // ユーザ権限を取得
  console.log('uploadFormat_cbPostBackIndex8')
  req.session.userRole = user.dataValues?.userRole
  const deleteFlag = contract.dataValues.deleteFlag
  const contractStatus = contract.dataValues.contractStatus
  const checkContractStatus = helper.checkContractStatus

  console.log('uploadFormat_cbPostBackIndex9')
  if (checkContractStatus === null || checkContractStatus === 999) return next(errorHelper.create(500))

  console.log('uploadFormat_cbPostBackIndex10')
  if (!validate.isStatusForCancel(contractStatus, deleteFlag)) return next(noticeHelper.create('cancelprocedure'))

  console.log('uploadFormat_cbPostBackIndex11')
  res.redirect('/csvBasicFormat')

  console.log('uploadFormat_cbPostBackIndex12')
  logger.info(constantsDefine.logMessage.INF001 + 'cbPostBackIndex')
}

router.post('/', cbPostIndex)
router.post('/cbPostDBIndex', cbPostConfirmIndex)
router.post('/cbPostBackIndex', cbPostBackIndex)

module.exports = {
  router: router,
  cbPostIndex: cbPostIndex,
  cbPostConfirmIndex: cbPostConfirmIndex,
  cbRemoveCsv: cbRemoveCsv,
  cbPostBackIndex: cbPostBackIndex
}
