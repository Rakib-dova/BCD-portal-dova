'use strict'
const express = require('express')
const router = express.Router()
const helper = require('./helpers/middleware')
const noticeHelper = require('./helpers/notice')
const errorHelper = require('./helpers/error')
const logger = require('../lib/logger')
const validate = require('../lib/validate')
const constantsDefine = require('../constants')
const userController = require('../controllers/userController.js')
const contractController = require('../controllers/contractController.js')
const uploadFormatController = require('../controllers/uploadFormatController')

const cbGetIndex = async (req, res, next) => {
  logger.info(constantsDefine.logMessage.INF000 + 'cbGetIndex')

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
  const checkContractStatus = await helper.checkContractStatus(req.user.tenantId)

  if (checkContractStatus === null || checkContractStatus === 999) return next(errorHelper.create(500))

  if (!validate.isStatusForCancel(contractStatus, deleteFlag)) return next(noticeHelper.create('cancelprocedure'))

  // サービスコントローラから画面表示データ取得
  const getDataForUploadFormat = await uploadFormatController.getDataForUploadFormat(req.params.uploadFormatId)

  // サービスコントローラでエラー発生したとき、500エラー処理
  if (getDataForUploadFormat instanceof Error) return next(errorHelper.create(500))

  const csvTax = constantsDefine.csvFormatDefine.csvTax
  const csvUnit = constantsDefine.csvFormatDefine.csvUnit

  res.render('uploadFormatEdit', {
    ...getDataForUploadFormat,
    csvTax: csvTax,
    csvUnit: csvUnit,
    uploadFormatId: req.params.uploadFormatId
  })

  logger.info(constantsDefine.logMessage.INF001 + 'cbGetIndex')
}

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
  const checkContractStatus = await helper.checkContractStatus(req.user.tenantId)

  if (checkContractStatus === null || checkContractStatus === 999) return next(errorHelper.create(500))

  if (!validate.isStatusForCancel(contractStatus, deleteFlag)) return next(noticeHelper.create('cancelprocedure'))

  // 確認画面から渡された内容確認(DBに格納処理)
  const uploadFormatId = req.params.uploadFormatId

  const resultChangeDataForUploadFormat = await uploadFormatController.changeDataForUploadFormat(
    uploadFormatId,
    req.body
  )
  // サービスコントローラでエラー発生したとき、500エラー処理
  if (resultChangeDataForUploadFormat instanceof Error) return next(errorHelper.create(500))

  switch (resultChangeDataForUploadFormat) {
    case 0:
      req.flash('info', 'フォーマットの変更が完了しました。')
      res.redirect('/uploadFormatList')
      break
    default:
      {
        const backURL = req.header('Referer') || '/'
        res.redirect(backURL)
      }
      break
  }

  logger.info(constantsDefine.logMessage.INF001 + 'cbPostIndex')
}

router.get('/:uploadFormatId', helper.isAuthenticated, cbGetIndex)
router.post('/:uploadFormatId', helper.isAuthenticated, cbPostIndex)

module.exports = {
  router: router,
  cbGetIndex: cbGetIndex,
  cbPostIndex: cbPostIndex
}
