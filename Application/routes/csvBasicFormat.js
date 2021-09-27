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
  if (req.session?.userContext !== 'LoggedIn') {
    return next(errorHelper.create(400))
  }

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

  if (checkContractStatus === null || checkContractStatus === 999) {
    return next(errorHelper.create(500))
  }

  if (!validate.isStatusForCancel(contractStatus, deleteFlag)) {
    return next(noticeHelper.create('cancelprocedure'))
  }

  const csvTax = [
    { name: '消費税', id: 'keyConsumptionTax' },
    { name: '軽減税率', id: 'keyReducedTax' },
    { name: '不課税', id: 'keyFreeTax' },
    { name: '免税', id: 'keyDutyFree' },
    { name: '非課税', id: 'keyExemptTax' }
  ]

  const csvUnit = [
    { name: '人月', id: 'keyManMonth' },
    { name: 'ボトル', id: 'keyBottle' },
    { name: 'コスト', id: 'keyCost' },
    { name: 'コンテナ', id: 'keyContainer' },
    { name: 'センチリットル', id: 'keyCentilitre' },
    { name: '平方センチメートル', id: 'keySquareCentimeter' },
    { name: '立方センチメートル', id: 'keyCubicCentimeter' },
    { name: 'センチメートル', id: 'keyCentimeter' },
    { name: 'ケース', id: 'keyCase' },
    { name: 'カートン', id: 'keyCarton' },
    { name: '日', id: 'keyDay' },
    { name: 'デシリットル', id: 'keyDeciliter' },
    { name: 'デシメートル', id: 'keyDecimeter' },
    { name: 'グロス・キログラム', id: 'keyGrossKilogram' },
    { name: '個', id: 'keyPieces' },
    { name: 'フィート', id: 'keyFeet' },
    { name: 'ガロン', id: 'keyGallon' },
    { name: 'グラム', id: 'keyGram' },
    { name: '総トン', id: 'keyGrossTonnage' },
    { name: '時間', id: 'keyHour' },
    { name: 'キログラム', id: 'keyKilogram' },
    { name: 'キロメートル', id: 'keyKilometers' },
    { name: 'キロワット時', id: 'keyKilowattHour' },
    { name: 'ポンド', id: 'keyPound' },
    { name: 'リットル', id: 'keyLiter' },
    { name: 'ミリグラム', id: 'keyMilligram' },
    { name: 'ミリリットル', id: 'keyMilliliter' },
    { name: 'ミリメートル', id: 'keyMillimeter' },
    { name: '月', id: 'keyMonth' },
    { name: '平方メートル', id: 'keySquareMeter' },
    { name: '立方メートル', id: 'keyCubicMeter' },
    { name: 'メーター', id: 'keyMeter' },
    { name: '純トン', id: 'keyNetTonnage' },
    { name: '包', id: 'keyPackage' },
    { name: '巻', id: 'keyRoll' },
    { name: '式', id: 'keyFormula' },
    { name: 'トン', id: 'keyTonnage' },
    { name: 'その他', id: 'keyOthers' }
  ]

  res.render('csvBasicFormat', { 
    csvTax: csvTax, 
    csvUnit: csvUnit,
    TS_HOST: process.env.TS_HOST 
  })
  logger.info(constantsDefine.logMessage.INF001 + 'cbGetFormtuploadIndex')
}

const cbPostCsvBasicFormat = async (req, res, next) => {
  logger.info(constantsDefine.logMessage.INF000 + 'cbPostCsvBasicFormat')

  // DBから契約情報取得
  const contract = await contractController.findOne(req.user.tenantId)
  // データベースエラーは、エラーオブジェクトが返る
  // 契約情報未登録の場合もエラーを上げる
  if (contract instanceof Error || contract === null) return next(errorHelper.create(500))

  const uploadCsvData = Buffer.from(decodeURIComponent(req.body.hiddenFileData), 'base64').toString('utf8')

  const filePath = process.env.INVOICE_UPLOAD_PATH

  // csvファイルアップロード
  if (fileUpload(filePath, req.body.dataFileName, uploadCsvData) === false) {
    return next(errorHelper.create(500))
  }

  const uploadFormatId = uuidv4()

  // リクエストボディから連携用データを作成する
  // アップロードフォーマット基本情報
  const csvBasicArr = {
    uploadFormatId: uploadFormatId,
    uploadFormatItemName: req.body.uploadFormatItemName,
    dataFileName: req.body.dataFileName,
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

  // 画面送信
  res.redirect(307, url.format({
    pathname:'/uploadFormat',
    body: {
      tenantId: req.user.tenantId,
      userRole: req.session.userRole,
      numberN: contract.dataValues?.numberN,
      TS_HOST: process.env.TS_HOST,
      csvBasicArr: csvBasicArr,
      taxArr: taxArr,
      unitArr: unitArr
    }
  }))
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
    if (fs.existsSync(uploadPath)) {
      // ユーザディレクトリが存在している場合、CSVファイルを保存する
      writeFile()
      logger.info(constantsDefine.logMessage.INF001 + 'fileUpload')
      return true
    } else {
      // ユーザディレクトリが存在しない場合、ユーザディレクトリ作成
      fs.mkdirSync(uploadPath)
      writeFile()
      logger.info(constantsDefine.logMessage.INF001 + 'fileUpload')
      return true
    }
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
