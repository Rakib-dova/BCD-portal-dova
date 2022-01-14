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
const routerName = 'subAccountCodeUpload'

const cbGetIndex = async (req, res, next) => {
  logger.info(constantsDefine.logMessage.INF000 + routerName + '.cbGetIndex')
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

  const procedureContents = {
    procedureTitle: '(手順)',
    procedureComment1: '1. 下記リンクをクリックし、アップロード用のCSVファイルをダウンロード',
    procedureComment2: '2. CSVファイルに勘定科目を記入',
    procedureComment2A: 'A列：勘定科目コード 英・数字のみ（10桁）',
    procedureComment2B: 'B列：補助科目コード 英・数字のみ（10桁）、C列：補助科目名 文字列（40桁）',
    procedureComment2C: '※1ファイルで作成できる勘定科目の数は200まで',
    procedureComment3: '3.「ファイル選択」ボタンをクリックし、記入したCSVファイルを選択',
    procedureComment4: '4.「アップロード開始」ボタンをクリック'
  }

  // アップロードフォーマットデータを画面に渡す。
  res.render('subAccountUpload', {
    uploadCommonLayoutTitle: '補助科目一括作成',
    uploadCommonLayoutEngTitle: 'BULK UPLOAD SUBACCOUNT CODE',
    fileInputName: 'bulkSubAccountCode',
    cautionForSelectedFile: 'ファイル選択してください。',
    listLocation: '/subAccountCodeList',
    listLoacationName: '補助科目一覧→',
    accountCodeUpload: '/uploadAccount',
    procedureContents: procedureContents,
    formatFileLocation: '../html/補助科目一括作成フォーマット.csv',
    formatFileLinkText: 'アップロード用CSVファイルダウンロード'
  })
  logger.info(constantsDefine.logMessage.INF001 + 'cbGetIndex')
}

router.get('/', helper.isAuthenticated, cbGetIndex)

module.exports = {
  router: router,
  cbGetIndex: cbGetIndex
}
