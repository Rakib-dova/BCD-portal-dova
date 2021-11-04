'use strict'
const express = require('express')
const router = express.Router()
const helper = require('./helpers/middleware')
const errorHelper = require('./helpers/error')
const noticeHelper = require('./helpers/notice')
const userController = require('../controllers/userController.js')
const contractController = require('../controllers/contractController.js')
const logger = require('../lib/logger')
const constantsDefine = require('../constants')
const validate = require('../lib/validate')
const apiManager = require('../controllers/apiManager')
const functionName = 'cbPostIndex'
const bconCsvUnitDefault = require('../lib/bconCsvUnitcode')
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
  // const checkContractStatus = 1
  const checkContractStatus = helper.checkContractStatus(req, res, next)

  if (checkContractStatus === null || checkContractStatus === 999) {
    return next(errorHelper.create(500))
  }

  if (!validate.isStatusForCancel(contractStatus, deleteFlag)) {
    return next(noticeHelper.create('cancelprocedure'))
  }

  // 発行日、作成日、支払期日の日付の表示のため、今日の日付を取得
  const today = new Date().toISOString().split('T')[0]
  // ステータス項目の選択アイテム
  const status = ['', 'draft', 'accept', 'inbox', 'outbox', 'sales', 'purchases', 'deleted']
  // 販売購入項目の選択アイテム
  const buyAndSell = ['', '販売', '購入']

  // 請求書ダウンロード画面表示
  res.render('csvDownload', {
    title: '請求書ダウンロード',
    today: today, // 発行日、作成日、支払期日の日付をyyyy-mm-dd表示を今日の日付に表示
    status: status,
    buyAndSell: buyAndSell
  })
  logger.info(constantsDefine.logMessage.INF001 + 'cbGetIndex')
}

const cbPostIndex = async (req, res, next) => {
  logger.info(`${constantsDefine.logMessage.INF000}${functionName}`)
  if (!req.session || !req.user?.userId) {
    return res.status(500).send(constantsDefine.statusConstants.SYSTEMERRORMESSAGE)
  }

  const user = await userController.findOne(req.user.userId)

  if (user instanceof Error || user === null) {
    return res.status(500).send(constantsDefine.statusConstants.SYSTEMERRORMESSAGE)
  }
  if (user.dataValues?.userStatus !== 0) {
    return res.status(500).send(constantsDefine.statusConstants.SYSTEMERRORMESSAGE)
  }

  // DBから契約情報取得
  const contract = await contractController.findOne(req.user.tenantId)
  // データベースエラーは、エラーオブジェクトが返る
  // 契約情報未登録の場合もエラーを上げる
  if (contract instanceof Error || contract === null) {
    return res.status(500).send(constantsDefine.statusConstants.SYSTEMERRORMESSAGE)
  }

  const deleteFlag = contract.dataValues.deleteFlag
  const contractStatus = contract.dataValues.contractStatus

  const checkContractStatus = helper.checkContractStatus(req, res, next)
  if (checkContractStatus === null || checkContractStatus === 999) {
    return res.status(500).send(constantsDefine.statusConstants.SYSTEMERRORMESSAGE)
  }

  if (!validate.isStatusForCancel(contractStatus, deleteFlag)) {
    return res.status(400).send()
  }

  req.session.userContext = 'LoggedIn'
  req.session.userRole = user.dataValues?.userRole

  logger.info(`画面から受けたデータ：${JSON.stringify(req.body)}`)

  // 請求書を検索する
  const documentsResult = await apiManager.accessTradeshift(
    req.user.accessToken,
    req.user.refreshToken,
    'get',
    '/documents'
  )
  const documents = documentsResult.Document
  const invoiceNumber = req.body.invoiceNumber
  let documentID = ''

  // 検索結果から請求書番号でdocumentIDを取得
  documents.map((doc) => {
    if (doc.ID === invoiceNumber) {
      documentID = doc.DocumentId
    }
    return 0
  })

  // 取得したdocumentIDで請求書を取得
  const result = await apiManager.accessTradeshift(
    req.user.accessToken,
    req.user.refreshToken,
    'get',
    `/documents/${documentID}`
  )

  // 取得した請求書をJSONに作成する
  const jsondata = dataTojson(result)

  // JSONファイルをCSVに変更
  const downloadFile = jsonToCsv(jsondata)

  // ファイル名：今日の日付_ユーザID.csv
  const today = new Date().toISOString().split('T').join().replace(',', '_').replace(/:/g, '').replace('Z', '') // yyyy-mm-dd_HHMMSS.sss
  const filename = encodeURIComponent(`${today}_${req.user.userId}.csv`)
  res.set({ 'Content-Disposition': `attachment; filename=${filename}` })
  res.status(200).send(`${String.fromCharCode(0xfeff)}` + downloadFile)
  logger.info('download')
  logger.info(constantsDefine.logMessage.INF001 + 'cbPostIndex')
}

const dataTojson = (data) => {
  const jsonData = []
  const InvoiceObject = {
    発行日: '',
    請求書番号: '',
    テナントID: '',
    支払期日: '',
    納品日: '',
    備考: '',
    銀行名: '',
    支店名: '',
    科目: '',
    口座番号: '',
    口座名義: '',
    その他特記事項: '',
    '明細-項目ID': '',
    '明細-内容': '',
    '明細-数量': '',
    '明細-単位': '',
    '明細-単価': '',
    '明細-税（消費税／軽減税率／不課税／免税／非課税）': '',
    '明細-備考': ''
  }
  const unitCodeKeys = Object.keys(bconCsvUnitDefault)

  for (let i = 0; i < data.InvoiceLine.length; ++i) {
    const invoice = { ...InvoiceObject }
    invoice.発行日 = data.IssueDate.value
    invoice.請求書番号 = data.ID.value
    invoice.テナントID = data.AccountingCustomerParty.Party.PartyIdentification[0].ID.value
    invoice.支払期日 = data.PaymentMeans[0].PaymentDueDate.value
    invoice.納品日 = data.Delivery[0].ActualDeliveryDate.value
    invoice.備考 = data.AdditionalDocumentReference[0].ID.value
    invoice.銀行名 =
      data.PaymentMeans[0].PayeeFinancialAccount.FinancialInstitutionBranch.FinancialInstitution.Name.value
    invoice.支店名 = data.PaymentMeans[0].PayeeFinancialAccount.FinancialInstitutionBranch.Name.value
    const accountType = data.PaymentMeans[0].PayeeFinancialAccount.AccountTypeCode.value
    switch (accountType) {
      case 'Current':
        invoice.科目 = '当座'
        break
      case 'General':
        invoice.科目 = '普通'
        break
    }
    invoice.口座番号 = data.PaymentMeans[0].PayeeFinancialAccount.ID.value
    invoice.口座名義 = data.PaymentMeans[0].PayeeFinancialAccount.Name.value
    invoice.その他特記事項 = data.Note[0].value
    invoice['明細-項目ID'] = data.InvoiceLine[i].ID.value
    invoice['明細-内容'] = data.InvoiceLine[i].Item.Description[0].value
    invoice['明細-数量'] = data.InvoiceLine[i].InvoicedQuantity.value
    const unitcode = data.InvoiceLine[i].InvoicedQuantity.unitCode
    unitCodeKeys.map((key) => {
      if (bconCsvUnitDefault[key] === unitcode) {
        invoice['明細-単位'] = key
      }
      return ''
    })
    invoice['明細-単価'] = data.InvoiceLine[i].LineExtensionAmount.value
    const taxValue = data.TaxTotal[0].TaxSubtotal[0].TaxCategory.TaxScheme.Name.value
    switch (taxValue) {
      case 'JP 不課税 0%':
        invoice['明細-税（消費税／軽減税率／不課税／免税／非課税）'] = '不課税'
        break
      case 'JP 免税 0%':
        invoice['明細-税（消費税／軽減税率／不課税／免税／非課税）'] = '免税'
        break
      case 'JP 消費税 10%':
        invoice['明細-税（消費税／軽減税率／不課税／免税／非課税）'] = '消費税'
        break
      case 'JP 消費税(軽減税率) 8%':
        invoice['明細-税（消費税／軽減税率／不課税／免税／非課税）'] = '軽減税率'
        break
      case 'JP 非課税 0%':
        invoice['明細-税（消費税／軽減税率／不課税／免税／非課税）'] = '非課税'
        break
    }
    invoice['明細-備考'] = data.InvoiceLine[i].DocumentReference[0].ID.value
    jsonData.push(invoice)
  }

  return jsonData
}

const jsonToCsv = (jsonData) => {
  const jsonArray = jsonData

  let csvString = ''
  const titles = Object.keys(jsonArray[0])

  titles.forEach((title, index) => {
    csvString += index !== titles.length - 1 ? `${title},` : `${title}\r\n`
  })

  jsonArray.forEach((content, index) => {
    let row = ''
    for (const title in content) {
      row += row === '' ? `${content[title]}` : `,${content[title]}`
    }
    csvString += index !== jsonArray.lent - 1 ? `${row}\r\n` : `${row}`
  })

  return csvString
}

router.get('/', helper.isAuthenticated, cbGetIndex)
router.post('/downloadInvoice', helper.isAuthenticated, cbPostIndex)

module.exports = {
  router: router,
  cbGetIndex: cbGetIndex,
  cbPostIndex: cbPostIndex
}
