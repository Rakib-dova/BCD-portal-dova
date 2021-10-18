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
const multer = require('multer')
const upload = multer({ dest: process.env.INVOICE_UPLOAD_PATH })
let uploadData

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

  const originName = path.resolve(filePath, req.file.filename)
  const newName = path.resolve(filePath, `${user.dataValues.userId}_${req.file.originalname}`)
  fs.renameSync(originName, newName)

  // アプロードしたファイルを読み込む
  const csvfilename = newName.replace(path.resolve(filePath), '')
  let uploadFormatNumber = 0
  // ヘッダなしの場合
  if (req.body.checkItemNameLine === 'on') {
    uploadFormatNumber = req.body.uploadFormatNumber - 1
  }

  const defaultNumber = req.body.defaultNumber - 1

  // データ開始行番号、項目名の行番号チェック
  if ((req.body.checkItemNameLine === 'on' && ~~req.body.uploadFormatNumber <= 0) || ~~req.body.defaultNumber <= 0) {
    // csv削除
    if (cbRemoveCsv(filePath, csvfilename) === false) {
      return next(errorHelper.create(500))
    }
    // 前の画面に遷移
    const backURL = req.header('Referer') || '/'
    return res.redirect(backURL)
  }
  // ファイル読み込む
  let csv
  const extractFullpathFile = path.join(filePath, '/') + csvfilename

  try {
    csv = fs.readFileSync(extractFullpathFile, 'utf8')
  } catch {
    return next(errorHelper.create(500))
  }

  const tmpRows = csv.split(/\r?\n|\r/)
  const checkRow = []
  tmpRows.forEach((row) => {
    if (row.trim() !== '') {
      checkRow.push(row)
    } else {
      checkRow.push('')
    }
  })

  if (checkRow.length < defaultNumber + 1) {
    const backURL = req.header('Referer') || '/'
    return res.redirect(backURL)
  }

  const mesaiArr = tmpRows[defaultNumber].trim().split(',')
  let headerArr = []
  if (req.body.checkItemNameLine === 'on') {
    headerArr = tmpRows[uploadFormatNumber].trim().split(',')
    uploadData = `${tmpRows[uploadFormatNumber]}\n`
  } else {
    let headlessItems = ''
    let idx = 0
    while (idx < 19) {
      if (idx !== 18) {
        headlessItems += `項目${idx + 1},`
      } else {
        headlessItems += `項目${idx + 1}`
      }
      idx++
    }
    mesaiArr.map((meisai) => {
      headerArr.push('')
      return ''
    })
    uploadData = `${headlessItems}\n`
  }
  uploadData += `${tmpRows[defaultNumber]}`

  let duplicateFlag = false
  // 配列に読み込んだcsvデータを入れる。
  const columnArr = constantsDefine.csvFormatDefine.columnArr
  const csvData = headerArr.map((header) => {
    if (header.length > 100) {
      duplicateFlag = true
    }
    return { item: header, value: '' }
  })

  // csv削除
  if (cbRemoveCsv(filePath, csvfilename) === false) {
    return next(errorHelper.create(500))
  }

  // 配列に読み込んだcsvデータのエラー発せの場合前画面に移動
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

  // 変数にページからもらったデータを格納
  const uploadFormatItemName = req.body.uploadFormatItemName
  const uploadType = req.body.uploadType

  const uploadGeneral = {
    uploadFormatItemName: uploadFormatItemName,
    uploadType: uploadType
  }

  // tax
  const keyConsumptionTax = req.body.keyConsumptionTax
  const keyReducedTax = req.body.keyReducedTax
  const keyFreeTax = req.body.keyFreeTax
  const keyDutyFree = req.body.keyDutyFree
  const keyExemptTax = req.body.keyExemptTax

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

  // taxバリデーションチェック
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
  const keyManMonth = req.body.keyManMonth
  const keyBottle = req.body.keyBottle
  const keyCost = req.body.keyCost
  const keyContainer = req.body.keyContainer
  const keyCentilitre = req.body.keyCentilitre
  const keySquareCentimeter = req.body.keySquareCentimeter
  const keyCubicCentimeter = req.body.keyCubicCentimeter
  const keyCentimeter = req.body.keyCentimeter
  const keyCase = req.body.keyCase
  const keyCarton = req.body.keyCarton
  const keyDay = req.body.keyDay
  const keyDeciliter = req.body.keyDeciliter
  const keyDecimeter = req.body.keyDecimeter
  const keyGrossKilogram = req.body.keyGrossKilogram
  const keyPieces = req.body.keyPieces
  const keyFeet = req.body.keyFeet
  const keyGallon = req.body.keyGallon
  const keyGram = req.body.keyGram
  const keyGrossTonnage = req.body.keyGrossTonnage
  const keyHour = req.body.keyHour
  const keyKilogram = req.body.keyKilogram
  const keyKilometers = req.body.keyKilometers
  const keyKilowattHour = req.body.keyKilowattHour
  const keyPound = req.body.keyPound
  const keyLiter = req.body.keyLiter
  const keyMilligram = req.body.keyMilligram
  const keyMilliliter = req.body.keyMilliliter
  const keyMillimeter = req.body.keyMillimeter
  const keyMonth = req.body.keyMonth
  const keySquareMeter = req.body.keySquareMeter
  const keyCubicMeter = req.body.keyCubicMeter
  const keyMeter = req.body.keyMeter
  const keyNetTonnage = req.body.keyNetTonnage
  const keyPackage = req.body.keyPackage
  const keyRoll = req.body.keyRoll
  const keyFormula = req.body.keyFormula
  const keyTonnage = req.body.keyTonnage
  const keyOthers = req.body.keyOthers

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

  // unitバリデーションチェック
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
    columnArr: columnArr,
    uploadGeneral: uploadGeneral,
    taxIds: taxIds,
    unitIds: unitIds,
    csvfilename: csvfilename,
    selectedFormatData: emptyselectedFormatData,
    itemRowNo: req.body.uploadFormatNumber,
    dataStartRowNo: req.body.defaultNumber,
    checkItemNameLine: req.body.checkItemNameLine
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

  // uploadFormat登録
  let resultUploadFormat
  const uploadFormatId = uuidv4()
  // 項目名の行有無によるDB入力データ「itemRowNo」の変更
  if (req.body.checkItemNameLine === 'on') {
    resultUploadFormat = await uploadFormatController.insert(req.user.tenantId, {
      uploadFormatId: uploadFormatId,
      contractId: contract.dataValues.contractId,
      setName: req.body.uploadFormatItemName,
      uploadType: req.body.uploadType,
      itemRowNo: req.body.itemRowNo,
      dataStartRowNo: req.body.dataStartRowNo,
      uploadData: uploadData
    })
  } else {
    resultUploadFormat = await uploadFormatController.insert(req.user.tenantId, {
      uploadFormatId: uploadFormatId,
      contractId: contract.dataValues.contractId,
      setName: req.body.uploadFormatItemName,
      uploadType: req.body.uploadType,
      itemRowNo: 0,
      dataStartRowNo: req.body.dataStartRowNo,
      uploadData: uploadData
    })
  }

  if (!resultUploadFormat?.dataValues) {
    logger.info(`${constantsDefine.logMessage.DBINF001} + 'cbPostConfirmIndex'`)
  }

  // uploadFormatDetail登録
  let iCnt = 1
  const columnArr = constantsDefine.csvFormatDefine.columnArr

  let resultUploadFormatDetail
  for (let idx = 0; idx < columnArr.length; idx++) {
    if (req.body.formatData[idx].length !== 0) {
      resultUploadFormatDetail = await uploadFormatDetailController.insert({
        uploadFormatId: uploadFormatId,
        serialNumber: iCnt, // 通番変数,
        uploadFormatItemName: req.body.headerItems[req.body.formatData[idx]], // 左のアイテム名,
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

  // uploadFormatIdentifier登録（税）
  iCnt = 1

  const taxIds = [
    { name: '消費税', value: req.body.keyConsumptionTax },
    { name: '軽減税率', value: req.body.keyReducedTax },
    { name: '不課税', value: req.body.keyFreeTax },
    { name: '免税', value: req.body.keyDutyFree },
    { name: '非課税', value: req.body.keyExemptTax }
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
  // uploadFormatIdentifier登録（単位）
  const unitIds = [
    { name: '人月', value: req.body.keyManMonth },
    { name: 'ボトル', value: req.body.keyBottle },
    { name: 'コスト', value: req.body.keyCost },
    { name: 'コンテナ', value: req.body.keyContainer },
    { name: 'センチリットル', value: req.body.keyCentilitre },
    { name: '平方センチメートル', value: req.body.keySquareCentimeter },
    { name: '立方センチメートル', value: req.body.keyCubicCentimeter },
    { name: 'センチメートル', value: req.body.keyCentimeter },
    { name: 'ケース', value: req.body.keyCase },
    { name: 'カートン', value: req.body.keyCarton },
    { name: '日', value: req.body.keyDay },
    { name: 'デシリットル', value: req.body.keyDeciliter },
    { name: 'デシメートル', value: req.body.keyDecimeter },
    { name: 'グロス・キログラム', value: req.body.keyGrossKilogram },
    { name: '個', value: req.body.keyPieces },
    { name: 'フィート', value: req.body.keyFeet },
    { name: 'ガロン', value: req.body.keyGallon },
    { name: 'グラム', value: req.body.keyGram },
    { name: '総トン', value: req.body.keyGrossTonnage },
    { name: '時間', value: req.body.keyHour },
    { name: 'キログラム', value: req.body.keyKilogram },
    { name: 'キロメートル', value: req.body.keyKilometers },
    { name: 'キロワット時', value: req.body.keyKilowattHour },
    { name: 'ポンド', value: req.body.keyPound },
    { name: 'リットル', value: req.body.keyLiter },
    { name: 'ミリグラム', value: req.body.keyMilligram },
    { name: 'ミリリットル', value: req.body.keyMilliliter },
    { name: 'ミリメートル', value: req.body.keyMillimeter },
    { name: '月', value: req.body.keyMonth },
    { name: '平方メートル', value: req.body.keySquareMeter },
    { name: '立方メートル', value: req.body.keyCubicMeter },
    { name: 'メーター', value: req.body.keyMeter },
    { name: '純トン', value: req.body.keyNetTonnage },
    { name: '包', value: req.body.keyPackage },
    { name: '巻', value: req.body.keyRoll },
    { name: '式', value: req.body.keyFormula },
    { name: 'トン', value: req.body.keyTonnage },
    { name: 'その他', value: req.body.keyOthers }
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

  // 画面移動
  res.redirect(303, '/portal')
  logger.info(constantsDefine.logMessage.INF001 + 'cbPostConfirmIndex')
}

// CSVファイル削除機能
const cbRemoveCsv = (_deleteDataPath, _filename) => {
  logger.info(constantsDefine.logMessage.INF000 + 'cbRemoveCsv')
  const deleteFile = path.join(_deleteDataPath, '/' + _filename)
  // ファイル有無確認
  if (fs.existsSync(deleteFile)) {
    // ファイル削除
    fs.unlinkSync(deleteFile)
    logger.info(constantsDefine.logMessage.INF001 + 'cbRemoveCsv')
    return true
  } else {
    // 削除対象がない場合、サーバーエラー画面表示
    logger.info(constantsDefine.logMessage.INF001 + 'cbRemoveCsv')
    return false
  }
}

router.post('/', upload.single('dataFile'), cbPostIndex)
router.post('/cbPostConfirmIndex', cbPostConfirmIndex)

module.exports = {
  router: router,
  cbPostIndex: cbPostIndex,
  cbPostConfirmIndex: cbPostConfirmIndex,
  cbRemoveCsv: cbRemoveCsv
}
