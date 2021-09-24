'use strict'

const express = require('express')
const router = express.Router()
const helper = require('./helpers/middleware')
const validate = require('../lib/validate')

const errorHelper = require('./helpers/error')
const noticeHelper = require('./helpers/notice')
const userController = require('../controllers/userController.js')
const contractController = require('../controllers/contractController.js')
const logger = require('../lib/logger')
const constantsDefine = require('../constants')

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

  if (!validate.isTenantManager(user.dataValues?.userRole, deleteFlag)) {
    return next(noticeHelper.create('generaluser'))
  }

  if (!validate.isStatusForRegister(contractStatus, deleteFlag)) {
    return next(noticeHelper.create('registerprocedure'))
  }

  if (!validate.isStatusForSimpleChange(contractStatus, deleteFlag)) {
    return next(noticeHelper.create('changeprocedure'))
  }

  // ユーザ権限も画面に送る
  res.render('csvBasicFormat', {
    tenantId: req.user.tenantId,
    userRole: req.session.userRole,
    numberN: contract.dataValues?.numberN,
    TS_HOST: process.env.TS_HOST
  })
  logger.info(constantsDefine.logMessage.INF001 + 'cbGetFormtuploadIndex')
}

const cbPostCsvBasicFormat = async (req, res, next) => {
  logger.info(constantsDefine.logMessage.INF000 + 'cbPostChangeIndex')

  // DBから契約情報取得
  const contract = await contractController.findOne(req.user.tenantId)
  // データベースエラーは、エラーオブジェクトが返る
  // 契約情報未登録の場合もエラーを上げる
  if (contract instanceof Error || contract === null) return next(errorHelper.create(500))

  // リクエストボディから連携用データを作成する
  // アップロードフォーマット基本情報
  const csvBasicArr = {
    uploadFormatId: req.body.uploadFormatId,
    serialNumber: req.body.serialNumber,
    uploadFormatItemName: req.body.uploadFormatItemName,
    uploadFormatNumber: req.body.uploadFormatNumber,
    defaultNumber: req.body.defaultNumber
  }

  // 明細-税 識別子
  const taxArr = {
    consumptionTax: req.body.consumptionTax,
    reducedTax: req.body.reducedTax,
    freeTax: req.body.freeTax,
    dutyFree: req.body.dutyFree,
    exemptTax: req.body.exemptTax
  }

  // 明細-単位 識別子
  const unitArr = {
    manMonth: req.body.manMonth,
    BO: req.body.BO,
    C5: req.body.C5,
    CH: req.body.CH,
    CLT: req.body.CLT,
    CMK: req.body.CMK,
    CMQ: req.body.CMQ,
    CMT: req.body.CMT,
    CS: req.body.CS,
    CT: req.body.CT,
    DAY: req.body.DAY,
    DLT: req.body.DLT,
    DMT: req.body.DMT,
    E4: req.body.E4,
    EA: req.body.EA,
    FOT: req.body.FOT,
    GLL: req.body.GLL,
    GRM: req.body.GRM,
    GT: req.body.GT,
    HUR: req.body.HUR,
    KGM: req.body.KGM,
    KTM: req.body.KTM,
    KWH: req.body.KWH,
    LBR: req.body.LBR,
    LTR: req.body.LTR,
    MGM: req.body.MGM,
    MLT: req.body.MLT,
    MMT: req.body.MMT,
    MON: req.body.MON,
    MTK: req.body.MTK,
    MTQ: req.body.MTQ,
    MTR: req.body.MTR,
    NT: req.body.NT,
    PK: req.body.PK,
    RO: req.body.RO,
    SET: req.body.SET,
    TNE: req.body.TNE,
    ZZ: req.body.ZZ
  }

  logger.info(constantsDefine.logMessage.INF001 + 'cbPostCsvBasicFormat')

  // 画面送信
  res.render('uploadFormat', {
    tenantId: req.user.tenantId,
    userRole: req.session.userRole,
    numberN: contract.dataValues?.numberN,
    TS_HOST: process.env.TS_HOST,
    csvBasicArr: csvBasicArr,
    taxArr: taxArr,
    unitArr: unitArr
  })
}

router.get('/', helper.isAuthenticated, cbGetCsvBasicFormat)
router.post('/', helper.isAuthenticated, cbPostCsvBasicFormat)

module.exports = {
  router: router,
  cbGetChangeIndex: cbGetCsvBasicFormat,
  cbPostCsvBasicFormat: cbPostCsvBasicFormat
}
