'use strict'
const express = require('express')
const router = express.Router()
const helper = require('./helpers/middleware')
const errorHelper = require('./helpers/error')
const noticeHelper = require('./helpers/notice')
const userController = require('../controllers/userController.js')
const contractController = require('../controllers/contractController.js')
const logger = require('../lib/logger')
const validate = require('../lib/validate')
const constantsDefine = require('../constants')
const upload = require('multer')({ dest: process.env.INVOICE_UPLOAD_PATH })
const uploadUsersController = require('../controllers/uploadUsersController')

const cbPostIndex = async (req, res, next) => {
  logger.info(constantsDefine.logMessage.INF000 + 'uploadUsers.cbPostIndex')
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

  // DBから契約情報取得
  const contract = await contractController.findOne(req.user.tenantId)
  // データベースエラーは、エラーオブジェクトが返る
  // 契約情報未登録の場合もエラーを上げる
  if (contract instanceof Error || contract === null) return next(errorHelper.create(500))

  req.session.userContext = 'LoggedIn'

  // ユーザ権限を取得
  req.session.userRole = user.dataValues?.userRole
  const deleteFlag = contract.dataValues.deleteFlag
  const contractStatus = contract.dataValues.contractStatus
  const checkContractStatus = await helper.checkContractStatus(req.user.tenantId)

  if (checkContractStatus === null || checkContractStatus === 999) {
    return next(errorHelper.create(500))
  }

  if (!validate.isStatusForCancel(contractStatus, deleteFlag)) {
    return next(noticeHelper.create('cancelprocedure'))
  }

  // req.file.userId設定
  req.file.userId = req.user.userId
  const status = await uploadUsersController.upload(req.user, contract, req.file)

  if (status instanceof Error) {
    req.flash('noti', ['取込に失敗しました。', constantsDefine.codeErrMsg.SYSERR000, 'SYSERR'])
    logger.info(constantsDefine.logMessage.INF001 + 'uploadUsers.cbPostIndex')
    return res.redirect('/uploadUsers')
  }

  let resultMessage = null
  let flashParams = null
  // エラーメッセージが有無確認
  if (validate.isArray(status)) {
    resultMessage = '下記表に記載されている内容を修正して、再アップロードして下さい。'
    flashParams = ['errnoti', ['取込に失敗しました。', resultMessage, 'SYSERR']]
  } else {
    switch (status) {
      // 正常
      case 0:
        resultMessage = '勘定科目取込が完了しました。'
        flashParams = ['info', resultMessage]
        break
      // ヘッダー不一致
      case -1:
        resultMessage = constantsDefine.codeErrMsg.CODEHEADERERR000
        flashParams = ['noti', ['取込に失敗しました。', resultMessage, 'SYSERR']]
        break
    }
  }
  logger.info(constantsDefine.logMessage.INF001 + 'uploadUsers.cbPostIndex')
  req.flash(flashParams[0], flashParams[1])
  res.redirect('/uploadUsers')
}

// router.get('/', helper.isAuthenticated, cbGetIndex)
router.post('/', helper.isAuthenticated, upload.single('userNameFileUpload'), cbPostIndex)

module.exports = {
  router: router,
  // cbGetIndex: cbGetIndex,
  cbPostIndex: cbPostIndex
}