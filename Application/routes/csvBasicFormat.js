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
  logger.info(constantsDefine.logMessage.INF000 + 'cbGetCsvBasicFormat')

  // 認証情報取得処理
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
  let csvBasicArr = constantsDefine.csvFormatDefine.csvBasicArr
  let taxArr = constantsDefine.csvFormatDefine.taxArr
  let unitArr = constantsDefine.csvFormatDefine.unitArr

  // if (req.session.formData) {
  //   csvBasicArr = req.session.formData.csvBasicArr
  //   taxArr = req.session.formData.taxArr
  //   unitArr = req.session.formData.unitArr
  // }

  res.render('csvBasicFormat', {
    csvTax: csvTax,
    csvUnit: csvUnit,
    csvBasicArr: csvBasicArr,
    taxArr: taxArr,
    unitArr: unitArr,
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

  const uploadFormatId = uuidv4()

  // リクエストボディから連携用データを作成する
  // アップロードフォーマット基本情報
  const csvBasicArr = {
    uploadFormatId: uploadFormatId,
    uploadFormatItemName: req.body.uploadFormatItemName,
    dataFileName: dataFileName,
    uploadFormatNumber: req.body.uploadFormatNumber,
    defaultNumber: req.body.defaultNumber
  }

  // 明細-税 識別子
  const taxArr = {
    consumptionTax: req.body.keyConsumptionTax,
    reducedTax: req.body.keyReducedTax,
    freeTax: req.body.keyFreeTax,
    dutyFree: req.body.keyDutyFree,
    exemptTax: req.body.keyExemptTax
  }

  // 明細-単位 識別子
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

  // req.session.formData = {
  //   csvBasicArr: csvBasicArr,
  //   taxArr: taxArr,
  //   unitArr: unitArr
  // }
  
  // 画面送信
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
