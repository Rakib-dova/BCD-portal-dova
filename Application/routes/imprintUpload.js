'use strict'
const express = require('express')
const csrf = require('csurf')

const multer = require('multer')
const upload = multer({ storage: multer.memoryStorage() })

const helper = require('./helpers/middleware')
const errorHelper = require('./helpers/error')
const logger = require('../lib/logger')
const constants = require('../constants')
const storageCommon = require('../lib/storageCommon')

const router = express.Router()
const csrfProtection = csrf({ cookie: false })
const logMessage = constants.logMessage

/**
 * 印影登録画面の表示
 * @param {object} req リクエスト
 * @param {object} res レスポンス
 * @param {function} next 次の処理
 * @returns
 */
const showImprintUpload = async (req, res, next) => {
  logger.info(logMessage.INF000 + 'showImprintUpload')

  // 印影をストレージからテナントIDをキーに取得
  const sealImp = await storageCommon.getSealImp(req.user.tenantId)

  // 画面表示
  res.render('imprintUpload', {
    sealImp: sealImp ? `data:image/png;base64,${sealImp.toString('base64')}` : null,
    csrfToken: req.csrfToken()
  })
  logger.info(logMessage.INF001 + 'showImprintUpload')
}

/**
 * 印影の登録
 * @param {object} req リクエスト
 * @param {object} res レスポンス
 * @param {function} next 次の処理
 * @returns
 */
const uploadImprint = async (req, res, next) => {
  logger.info(logMessage.INF000 + 'uploadImprint')

  // 印影登録
  try {
    await storageCommon.upload(req.user.tenantId, req.file.buffer)
  } catch (error) {
    console.log(error)
    return next(errorHelper.create(500))
  }

  res.redirect('/imprintUpload')
  logger.info(logMessage.INF001 + 'uploadImprint')
}

/**
 * 印影の削除
 * @param {object} req リクエスト
 * @param {object} res レスポンス
 * @param {function} next 次の処理
 * @returns
 */
const deleteImprint = async (req, res, next) => {
  logger.info(logMessage.INF000 + 'deleteImprint')

  // 印影削除
  try {
    await storageCommon.deleteSealImp(req.user.tenantId)
  } catch (error) {
    console.log(error)
    return next(errorHelper.create(500))
  }

  res.redirect('/imprintUpload')
  logger.info(logMessage.INF001 + 'deleteImprint')
}

router.get('/', csrfProtection, helper.bcdAuthenticate, showImprintUpload)
router.post('/upload', csrfProtection, helper.bcdAuthenticate, upload.single('csvFile'), uploadImprint)
router.post('/delete', csrfProtection, helper.bcdAuthenticate, deleteImprint)

module.exports = {
  router: router,
  showImprintUpload,
  uploadImprint,
  deleteImprint
}
