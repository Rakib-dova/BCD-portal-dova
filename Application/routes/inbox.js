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
const notiTitle = '仕分け情報設定'

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
  const invoiceId = req.params.invoiceId
  let result
  try {
    result = await inboxController.getInvoiceDetail(accessToken, refreshToken, invoiceId, contract.contractId)
  } catch (error) {
    logger.error({ stack: error.stack, status: 1 })
    req.flash('noti', [notiTitle, 'システムエラーが発生しました。'])
    return res.redirect('/inboxList/1')
  }

  // 受領した請求書一覧レンダリング
  // オプション欄
  const optionLine1 = []
  if (result.options.issueDate) {
    optionLine1.push({ columnName: '請求日', columnData: result.options.issueDate })
  }
  if (result.options.taxPointDate) {
    optionLine1.push({ columnName: '課税日', columnData: result.options.taxPointDate })
  }
  if (result.options.bookingNumber) {
    optionLine1.push({ columnName: '予約番号', columnData: result.options.bookingNumber })
  }
  if (result.options.documentCurrencyCode) {
    optionLine1.push({ columnName: '通貨', columnData: result.options.documentCurrencyCode })
  }

  const optionLine2 = []
  if (result.options.paymentDueDate) {
    optionLine2.push({ columnName: '支払期日', columnData: result.options.paymentDueDate })
  }
  if (result.options.orderRef) {
    if (result.options.orderRef.no) {
      optionLine2.push({ columnName: '注文書番号', columnData: result.options.orderRef.no })
    }
    if (result.options.orderRef.issueDate) {
      optionLine2.push({ columnName: '注文書発行日', columnData: result.options.orderRef.issueDate })
    }
  }
  if (result.options.invoiceDocRef) {
    optionLine2.push({ columnName: '参考情報', columnData: result.options.invoiceDocRef })
  }

  const optionLine3 = []
  if (result.options.actualDeliveryDate) {
    optionLine3.push({ columnName: '納品日', columnData: result.options.actualDeliveryDate })
  }
  if (result.options.promisedDeliveryPeriod && result.options.promisedDeliveryPeriod.startDate) {
    optionLine3.push({ columnName: '納品開始日', columnData: result.options.promisedDeliveryPeriod.startDate })
  }

  if (result.options.contractDocumentRef) {
    optionLine3.push({ columnName: '契約書番号', columnData: result.options.contractDocumentRef })
  }

  if (result.options.accountingCost) {
    optionLine3.push({ columnName: '部門', columnData: result.options.accountingCost })
  }

  const optionLine4 = []
  if (result.options.promisedDeliveryPeriod && result.options.promisedDeliveryPeriod.endDate) {
    optionLine4.push({ columnName: '納品終了日', columnData: result.options.promisedDeliveryPeriod.endDate })
  }
  if (result.options.deliveryTerms) {
    optionLine4.push({ columnName: '納期', columnData: result.options.deliveryTerms })
  }
  if (result.options.customerAssAccId) {
    optionLine4.push({ columnName: 'ID', columnData: result.options.customerAssAccId })
  }
  if (result.options.boldId) {
    optionLine4.push({ columnName: '輸送情報', columnData: result.options.boldId })
  }

  const optionLine5 = []
  if (result.options.despatch) {
    optionLine5.push({ columnName: '販売者の手数料番号', columnData: result.options.despatch })
  }
  if (result.options.physicalLocation) {
    optionLine5.push({ columnName: 'DUNSナンバー', columnData: result.options.physicalLocation })
  }
  if (result.options.contactEmail) {
    optionLine5.push({ columnName: '取引先担当者(アドレス)', columnData: result.options.contactEmail })
  }

  const optionLine6 = []
  if (result.options.interimHours) {
    optionLine6.push({ columnName: '暫定時間', columnData: result.options.interimHours })
  }

  if (result.options.clearanceClave) {
    optionLine6.push({ columnName: '通関識別情報', columnData: result.options.clearanceClave })
  }

  if (result.options.tsClearance) {
    optionLine6.push({ columnName: 'Tradeshiftクリアランス', columnData: result.options.tsClearance })
  }

  const optionLine7 = {}
  if (result.options.fileId) {
    optionLine7.columnName = '備考'
    optionLine7.columnData = result.options.fileId
  }

  const optionLine8 = {}
  if (result.options.note) {
    optionLine8.columnName = 'その他特記事項'
    optionLine8.columnData = result.options.note
  }

  res.render('inbox', {
    ...result,
    optionLine1: optionLine1,
    optionLine2: optionLine2,
    optionLine3: optionLine3,
    optionLine4: optionLine4,
    optionLine5: optionLine5,
    optionLine6: optionLine6,
    optionLine7: optionLine7,
    optionLine8: optionLine8,
    invoiceId: invoiceId
  })

  logger.info(constantsDefine.logMessage.INF001 + 'cbGetIndex')
}

const cbPostIndex = async (req, res, next) => {
  logger.info(constantsDefine.logMessage.INF000 + 'cbPostIndex')
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

  try {
    const invoiceId = req.params.invoiceId
    const checkDataForJournalizeInvoice = inboxController.checkDataForJournalizeInvoice
    // 明細数確認
    const line = Object.keys(req.body)
    const lineCount = []
    line.forEach((value) => {
      lineCount.push(value.substring(6, value.indexOf('_')))
    })

    let setCount
    let accountCode
    let subAccountCode
    let installmentAmount
    let lineNo
    let lineId
    let result
    for (let i = 1; i <= new Set(lineCount).size; i++) {
      setCount = lineCount.filter((element) => `${i}` === element).length / 3
      if (Number.isInteger(setCount)) {
        for (let j = 1; j <= setCount; j++) {
          accountCode = req.body[`lineNo${i}_lineAccountCode${j}_accountCode`]
          subAccountCode = req.body[`lineNo${i}_lineAccountCode${j}_subAccountCode`]
          installmentAmount = req.body[`lineNo${i}_lineAccountCode${j}_input_amount`]

          if ((accountCode !== '' || subAccountCode !== '') && installmentAmount !== '') {
            lineNo = i
            // 明細IDを取得
            if (req.body.lineId.length > 1) {
              lineId = req.body.lineId[i - 1]
            } else {
              lineId = req.body.lineId
            }

            if (checkDataForJournalizeInvoice === 0) {
              // DBに保存
              result = inboxController.insert(contract, {
                invoiceId,
                lineId,
                lineNo,
                accountCode,
                subAccountCode,
                installmentAmount
              })
              console.log(result)
            }
          }
        }
      } else {
        console.log('エラー')
      }
    }
    logger.info(constantsDefine.logMessage.INF001 + 'cbPostIndex')
  } catch (error) {
    logger.error({ tenantId: req.user.tenantId, stack: error.stack, status: 0 })
    logger.info(constantsDefine.logMessage.INF001 + 'cbPostIndex')
    return next(errorHelper.create(500))
  }
}

router.get('/:invoiceId', helper.isAuthenticated, cbGetIndex)
router.post('/:invoiceId', helper.isAuthenticated, cbPostIndex)

module.exports = {
  router: router,
  cbGetIndex: cbGetIndex
}
