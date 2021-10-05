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
const { v4: uuidv4 } = require('uuid')
const url = require('url')

const cbGetCsvBasicFormat = async (req, res, next) => {
  console.log('cbGetCsvBasicFormat1')
  logger.info(constantsDefine.logMessage.INF000 + 'cbGetCsvBasicFormat')

  // 認証情報取得処理
  console.log('cbGetCsvBasicFormat2')
  if (!req.session || !req.user?.userId) return next(errorHelper.create(500))

  // if (!req.session.csvUploadFormatReturnFlag1 || !req.session.csvUploadFormatReturnFlag2) {
  //   delete req.session.formData
  //   delete req.session.csvUploadFormatReturnFlag1
  //   delete req.session.csvUploadFormatReturnFlag2
  // } else {
  //   req.session.csvUploadFormatReturnFlag1 = false
  //   req.session.csvUploadFormatReturnFlag2 = false
  // }

  // DBからuserデータ取得
  console.log('cbGetCsvBasicFormat4')
  const user = await userController.findOne(req.user.userId)
  // データベースエラーは、エラーオブジェクトが返る
  // user未登録の場合もエラーを上げる
  console.log('cbGetCsvBasicFormat5')
  if (user instanceof Error || user === null) return next(errorHelper.create(500))

  // TX依頼後に改修、ユーザステイタスが0以外の場合、「404」エラーとする not 403
  console.log('cbGetCsvBasicFormat6')
  if (user.dataValues?.userStatus !== 0) return next(errorHelper.create(404))
  console.log('cbGetCsvBasicFormat7')
  if (req.session?.userContext !== 'LoggedIn') return next(errorHelper.create(400))

  // DBから契約情報取得
  console.log('cbGetCsvBasicFormat8')
  const contract = await contractController.findOne(req.user.tenantId)
  // データベースエラーは、エラーオブジェクトが返る
  // 契約情報未登録の場合もエラーを上げる
  console.log('cbGetCsvBasicFormat9')
  if (contract instanceof Error || contract === null) return next(errorHelper.create(500))

  // ユーザ権限を取得
  console.log('cbGetCsvBasicFormat10')
  req.session.userRole = user.dataValues?.userRole
  const deleteFlag = contract.dataValues.deleteFlag
  const contractStatus = contract.dataValues.contractStatus
  const checkContractStatus = helper.checkContractStatus

  console.log('cbGetCsvBasicFormat11')
  if (checkContractStatus === null || checkContractStatus === 999) return next(errorHelper.create(500))

  console.log('cbGetCsvBasicFormat12')
  if (!validate.isStatusForCancel(contractStatus, deleteFlag)) return next(noticeHelper.create('cancelprocedure'))

  console.log('cbGetCsvBasicFormat13')
  const csvTax = constantsDefine.csvFormatDefine.csvTax
  const csvUnit = constantsDefine.csvFormatDefine.csvUnit
  let csvBasicArr = constantsDefine.csvFormatDefine.csvBasicArr
  let taxArr = constantsDefine.csvFormatDefine.taxArr
  let unitArr = constantsDefine.csvFormatDefine.unitArr

  // if (req.session.formData) {
  //   csvBasicArr = req.session.formData.csvBasicArr
  //   taxArr = req.session.formData.taxArr
  //   unitArr = req.session.formData.unitArr
  // }

  console.log('cbGetCsvBasicFormat15')
  res.render('csvBasicFormat', {
    csvTax: csvTax,
    csvUnit: csvUnit,
    csvBasicArr: csvBasicArr,
    taxArr: taxArr,
    unitArr: unitArr,
    TS_HOST: process.env.TS_HOST
  })
  console.log('cbGetCsvBasicFormat16')
  logger.info(constantsDefine.logMessage.INF001 + 'cbGetCsvBasicFormat')
}

const cbPostCsvBasicFormat = async (req, res, next) => {
  console.log('cbPostCsvBasicFormat1')
  logger.info(constantsDefine.logMessage.INF000 + 'cbPostCsvBasicFormat')

  // DBからuserデータ取得
  console.log('cbPostCsvBasicFormat2')
  const user = await userController.findOne(req.user.userId)
  // データベースエラーは、エラーオブジェクトが返る
  // user未登録の場合もエラーを上げる
  console.log('cbPostCsvBasicFormat3')
  if (user instanceof Error || user === null) return next(errorHelper.create(500))

  // TX依頼後に改修、ユーザステイタスが0以外の場合、「404」エラーとする not 403
  console.log('cbPostCsvBasicFormat4')
  if (user.dataValues?.userStatus !== 0) return next(errorHelper.create(404))

  // DBから契約情報取得
  console.log('cbPostCsvBasicFormat5')
  const contract = await contractController.findOne(req.user.tenantId)
  // データベースエラーは、エラーオブジェクトが返る
  // 契約情報未登録の場合もエラーを上げる
  console.log('cbPostCsvBasicFormat6')
  if (contract instanceof Error || contract === null) return next(errorHelper.create(500))

  // ユーザ権限を取得
  console.log('cbPostCsvBasicFormat7')
  const deleteFlag = contract.dataValues.deleteFlag
  const contractStatus = contract.dataValues.contractStatus
  const checkContractStatus = helper.checkContractStatus

  console.log('cbPostCsvBasicFormat8')
  if (checkContractStatus === null || checkContractStatus === 999) return next(errorHelper.create(500))

  console.log('cbPostCsvBasicFormat9')
  if (!validate.isStatusForCancel(contractStatus, deleteFlag)) return next(noticeHelper.create('cancelprocedure'))

  console.log('cbPostCsvBasicFormat10')
  const uploadCsvData = Buffer.from(decodeURIComponent(req.body.hiddenFileData), 'base64').toString('utf8')

  console.log('cbPostCsvBasicFormat11')
  const filePath = process.env.INVOICE_UPLOAD_PATH

  console.log('cbPostCsvBasicFormat12')
  const dataFileName = user.dataValues.userId + '_' + req.body.dataFileName

  // csvファイルアップロード
  console.log('cbPostCsvBasicFormat13')
  if (fileUpload(filePath, dataFileName, uploadCsvData) === false) return next(errorHelper.create(500))

  console.log('cbPostCsvBasicFormat14')
  const uploadFormatId = uuidv4()

  // リクエストボディから連携用データを作成する
  // アップロードフォーマット基本情報
  console.log('cbPostCsvBasicFormat15')
  const csvBasicArr = {
    uploadFormatId: uploadFormatId,
    uploadFormatItemName: req.body.uploadFormatItemName,
    dataFileName: dataFileName,
    uploadFormatNumber: req.body.uploadFormatNumber,
    defaultNumber: req.body.defaultNumber
  }

  console.log('cbPostCsvBasicFormat16')
  // 明細-税 識別子
  const taxArr = {
    consumptionTax: req.body.keyConsumptionTax,
    reducedTax: req.body.keyReducedTax,
    freeTax: req.body.keyFreeTax,
    dutyFree: req.body.keyDutyFree,
    exemptTax: req.body.keyExemptTax
  }

  // 明細-単位 識別子
  console.log('cbPostCsvBasicFormat17')
  const unitArr = {
    manMonth: req.body.keyManMonth,
    BO: req.body.keyBottle,
    C5: req.body.keyCost,
    CH: req.body.keyContainer,
    CLT: req.body.keyCentilitre,
    CMK: req.body.keySquareCentimeter,
    CMQ: req.body.keyCubicCentimeter,
    CMT: req.body.keyCentimeter,
    CS: req.body.keyCase,
    CT: req.body.keyCarton,
    DAY: req.body.keyDay,
    DLT: req.body.keyDeciliter,
    DMT: req.body.keyDecimeter,
    E4: req.body.keyGrossKilogram,
    EA: req.body.keyPieces,
    FOT: req.body.keyFeet,
    GLL: req.body.keyGallon,
    GRM: req.body.keyGram,
    GT: req.body.keyGrossTonnage,
    HUR: req.body.keyHour,
    KGM: req.body.keyKilogram,
    KTM: req.body.keyKilometers,
    KWH: req.body.keyKilowattHour,
    LBR: req.body.keyPound,
    LTR: req.body.keyLiter,
    MGM: req.body.keyMilligram,
    MLT: req.body.keyMilliliter,
    MMT: req.body.keyMillimeter,
    MON: req.body.keyMonth,
    MTK: req.body.keySquareMeter,
    MTQ: req.body.keyCubicMeter,
    MTR: req.body.keyMeter,
    NT: req.body.keyNetTonnage,
    PK: req.body.keyPackage,
    RO: req.body.keyRoll,
    SET: req.body.keyFormula,
    TNE: req.body.keyTonnage,
    ZZ: req.body.keyOthers
  }

  logger.info(constantsDefine.logMessage.INF001 + 'cbPostCsvBasicFormat')
  console.log('cbPostCsvBasicFormat18')
  req.session.formData = {
    csvBasicArr: csvBasicArr,
    taxArr: taxArr,
    unitArr: unitArr
  }
  // 画面送信
  console.log('cbPostCsvBasicFormat19')
  res.redirect(
    307,
    url.format({
      pathname: '/uploadFormat',
      body: {
        tenantId: req.user.tenantId,
        userRole: req.session.userRole,
        numberN: contract.dataValues?.numberN,
        TS_HOST: process.env.TS_HOST,
        csvBasicArr: csvBasicArr,
        taxArr: taxArr,
        unitArr: unitArr
      }
    })
  )
}

console.log('cbPostCsvBasicFormat20')
const fileUpload = (_filePath, _filename, _uploadCsvData) => {
  logger.info(constantsDefine.logMessage.INF000 + 'fileUpload')
  const uploadPath = path.join(_filePath, '/')
  const filename = _filename
  const uploadData = _uploadCsvData
  const writeFile = () => {
    fs.writeFileSync(uploadPath + filename, uploadData, 'utf8')
  }
  try {
    console.log('cbPostCsvBasicFormat21')
    // ユーザディレクトリが存在すること確認
    if (!fs.existsSync(uploadPath)) {
      console.log('cbPostCsvBasicFormat21-1')
      // ユーザディレクトリが存在しない場合、ユーザディレクトリ作成
      fs.mkdirSync(uploadPath)
    }
    // CSVファイルを保存する
    writeFile()
    logger.info(constantsDefine.logMessage.INF001 + 'fileUpload')
    console.log('cbPostCsvBasicFormat22')
    return true
  } catch (error) {
    console.log('cbPostCsvBasicFormat21-2')
    return false
  }
}

router.get('/', helper.isAuthenticated, helper.isTenantRegistered, cbGetCsvBasicFormat)
router.post('/', helper.isAuthenticated, helper.isTenantRegistered, cbPostCsvBasicFormat)

module.exports = {
  router: router,
  cbGetCsvBasicFormat: cbGetCsvBasicFormat,
  cbPostCsvBasicFormat: cbPostCsvBasicFormat,
  fileUpload: fileUpload
}
