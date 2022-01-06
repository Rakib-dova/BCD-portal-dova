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
const inboxController = require('../controllers/inboxController')

const cbGetIndex = async (req, res, next) => {
  logger.info(constantsDefine.logMessage.INF000 + 'cbGetIndex')
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

  // ページ取得
  const accessToken = req.user.accessToken
  const refreshToken = req.user.refreshToken
  const pageId = ~~req.params.page
  const tenantId = user.tenantId
  // const result = await inboxController.getInbox(accessToken, refreshToken, pageId, tenantId)

  // 受領した請求書一覧レンダリング
  // オプション欄
  const optionLine1 = [
    { columnName: '請求日', columnData: '22/01/04' },
    { columnName: '課税日', columnData: '22/01/05' },
    { columnName: '予約番号', columnData: 'ABC1204531' },
    { columnName: '通貨', columnData: '円' }
  ]
  const optionLine2 = [
    { columnName: '支払期日', columnData: '22/01/9' },
    { columnName: '注文書番号', columnData: '注文書番号' },
    { columnName: '注文書発行日', columnData: '22/01/05' },
    { columnName: '参考情報', columnData: '参考情報' }
  ]
  const optionLine3 = [
    { columnName: '契約書番号', columnData: 'PB147500102' },
    { columnName: '部門', columnData: '部門' },
    { columnName: '納品日', columnData: '22/01/05' },
    { columnName: '納品開始日', columnData: '22/01/05' }
  ]
  const optionLine4 = [
    { columnName: '納品終了日', columnData: '22/01/9' },
    { columnName: 'ID', columnData: 'ID' },
    { columnName: '納期', columnData: '納期' },
    { columnName: '輸送情報', columnData: '輸送情報' }
  ]
  const optionLine5 = [
    { columnName: '販売者の手数料番号', columnData: '販売者の手数料番号' },
    { columnName: 'DUNSナンバー', columnData: 'DUNSナンバー' },
    { columnName: '取引先担当者(アドレス)', columnData: '取引先担当者(アドレス)' }
  ]
  const optionLine6 = [
    { columnName: '暫定時間', columnData: '22/01/04' },
    { columnName: '通関識別情報', columnData: '通関識別情報' },
    { columnName: 'Tradeshiftクリアランス', columnData: 'Tradeshiftクリアランス' }
  ]
  const optionLine7 = { columnName: '備考', columnData: '備考' }
  const optionLine8 = { columnName: 'その他特記事項', columnData: 'その他特記事項' }
  res.render('inbox', {
    optionLine1: optionLine1,
    optionLine2: optionLine2,
    optionLine3: optionLine3,
    optionLine4: optionLine4,
    optionLine5: optionLine5,
    optionLine6: optionLine6,
    optionLine7: optionLine7,
    optionLine8: optionLine8
  })

  logger.info(constantsDefine.logMessage.INF001 + 'cbGetIndex')
}

router.get('/:invoiceId', helper.isAuthenticated, cbGetIndex)

module.exports = {
  router: router,
  cbGetIndex: cbGetIndex
}
