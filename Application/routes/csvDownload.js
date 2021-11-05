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
  const checkContractStatus = await helper.checkContractStatus(req, res, next)

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

  // 認証情報取得処理
  if (!req.session || !req.user?.userId) {
    return res.status(500).send(constantsDefine.statusConstants.SYSTEMERRORMESSAGE)
  }

  // DBからuserデータ取得
  const user = await userController.findOne(req.user.userId)

  // データベースエラーは、エラーオブジェクトが返る
  // user未登録の場合もエラーを上げる
  if (user instanceof Error || user === null) {
    return res.status(500).send(constantsDefine.statusConstants.SYSTEMERRORMESSAGE)
  }
  // TX依頼後に改修、ユーザステイタスが0以外の場合、「404」エラーとする not 403
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

  // 請求書ダウンロード画面から請求書番号を取得
  const invoiceNumber = req.body.invoiceNumber

  // 請求書を検索する
  const documentsResult = await apiManager.accessTradeshift(
    req.user.accessToken,
    req.user.refreshToken,
    'get',
    '/documents?businessId=' + invoiceNumber
  )

  console.log(documentsResult)

  // documentsResultエラー検査
  if (documentsResult instanceof Error) {
    errorHandle(documentsResult, res, req)
  } else {
    // 請求書検索結果、1件以上の場合ダウンロード、0件の場合ポップを表示
    if (documentsResult.itemCount === 0) {
      // 条件に合わせるデータがない場合、お知らせを表示する。
      req.flash('noti', '条件に合致する請求書が見つかりませんでした。')
      res.redirect(303, '/csvDownload')
    } else {
      // documentIdの初期化
      let documentId = ''
      // 請求書番号で検索した結果の配列を取得
      const documents = documentsResult.Document

      // 取得した配列から請求書番号（UUID）を取得
      documents.map((doc) => {
        if (doc.ID === invoiceNumber) {
          documentId = doc.DocumentId
        }
        return 0
      })

      // 請求書番号（UUID）を取得した場合
      if (documentId !== '') {
        // 請求書番号（UUID）で請求書情報取得（とれシフAPI呼出）
        const result = await apiManager.accessTradeshift(
          req.user.accessToken,
          req.user.refreshToken,
          'get',
          `/documents/${documentId}`
        )

        console.log(result)

        // resultエラー検査
        if (result instanceof Error) {
          errorHandle(result, res, req)
        } else {
          // 取得した請求書をJSONに作成する
          const jsondata = dataToJson(result)
          // JSONファイルをCSVに変更
          const downloadFile = jsonToCsv(jsondata)
          // ファイル名：今日の日付_ユーザID.csv
          const today = new Date().toISOString().split('T').join().replace(',', '_').replace(/:/g, '').replace('Z', '') // yyyy-mm-dd_HHMMSS.sss
          const filename = encodeURIComponent(`${today}_${invoiceNumber}.csv`)

          res.set({ 'Content-Disposition': `attachment; filename=${filename}` })
          res.status(200).send(`${String.fromCharCode(0xfeff)}` + downloadFile)
        }
      } else {
        // 条件に合わせるデータがない場合、お知らせを表示する。
        req.flash('noti', '条件に合致する請求書が見つかりませんでした。')
        res.redirect(303, '/csvDownload')
      }
    }
  }

  logger.info(constantsDefine.logMessage.INF001 + 'cbPostIndex')
}

const errorHandle = (documentsResult, _res, _req) => {
  if (String(documentsResult.response?.status).slice(0, 1) === '4') {
    // 400番エラーの場合
    logger.error(
      {
        tenant: _req.user.tenantId,
        user: _req.user.userId,
        invoiceNumber: _req.body.invoiceNumber,
        status: 2
      },
      documentsResult.name
    )
    _req.flash('noti', constantsDefine.statusConstants.CSVDOWNLOAD_APIERROR)
    _res.redirect(303, '/csvDownload')
  } else if (String(documentsResult.response?.status).slice(0, 1) === '5') {
    // 500番エラーの場合
    logger.error(
      {
        tenant: _req.user.tenantId,
        user: _req.user.userId,
        invoiceNumber: _req.body.invoiceNumber,
        status: 2
      },
      documentsResult.toString()
    )
    _req.flash('noti', constantsDefine.statusConstants.CSVDOWNLOAD_SYSERROR)
    _res.redirect(303, '/csvDownload')
  }
}

const dataToJson = (data) => {
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

    // 必須項目チェック
    invoice.発行日 = data.IssueDate.value
    invoice.請求書番号 = data.ID.value
    invoice.テナントID = data.AccountingCustomerParty.Party.PartyIdentification[0].ID.value

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
    const taxCategory = data.TaxTotal[0].TaxSubtotal[i].TaxCategory.ID.value

    if (taxCategory === 'O') {
      invoice['明細-税（消費税／軽減税率／不課税／免税／非課税）'] = '不課税'
    } else if (taxCategory === 'E') {
      invoice['明細-税（消費税／軽減税率／不課税／免税／非課税）'] = '免税'
    } else if (taxCategory === 'S') {
      invoice['明細-税（消費税／軽減税率／不課税／免税／非課税）'] = '消費税'
    } else if (taxCategory === 'AA') {
      invoice['明細-税（消費税／軽減税率／不課税／免税／非課税）'] = '軽減税率'
    } else {
      invoice['明細-税（消費税／軽減税率／不課税／免税／非課税）'] = '非課税'
    }

    // 任意項目チェック
    if (data.PaymentMeans) {
      if (data.PaymentMeans[0].PaymentDueDate?.value) {
        invoice.支払期日 = data.PaymentMeans[0].PaymentDueDate.value
      }
      if (data.PaymentMeans[0]?.PayeeFinancialAccount?.FinancialInstitutionBranch) {
        invoice.銀行名 =
          data.PaymentMeans[0]?.PayeeFinancialAccount?.FinancialInstitutionBranch.FinancialInstitution.Name.value
      }
      if (data.PaymentMeans[0]?.PayeeFinancialAccount?.FinancialInstitutionBranch) {
        invoice.支店名 = data.PaymentMeans[0].PayeeFinancialAccount.FinancialInstitutionBranch.Name.value
      }

      if (data.PaymentMeans[0]?.PayeeFinancialAccount?.AccountTypeCode.value) {
        const accountType = data.PaymentMeans[0].PayeeFinancialAccount.AccountTypeCode.value
        switch (accountType) {
          case 'Current':
            invoice.科目 = '当座'
            break
          case 'General':
            invoice.科目 = '普通'
            break
        }
      }

      if (data.PaymentMeans[0]?.PayeeFinancialAccount?.ID.value) {
        invoice.口座番号 = data.PaymentMeans[0].PayeeFinancialAccount.ID.value
      }

      if (data.PaymentMeans[0]?.PayeeFinancialAccount?.Name.value) {
        invoice.口座名義 = data.PaymentMeans[0].PayeeFinancialAccount.Name.value
      }
    }

    if (data.Delivery) {
      if (data.Delivery[0].ActualDeliveryDate.value) {
        invoice.納品日 = data.Delivery[0].ActualDeliveryDate?.value
      }
    }

    if (data.AdditionalDocumentReference) {
      if (data.AdditionalDocumentReference[0].DocumentTypeCode.value === 'File ID') {
        invoice.備考 = data.AdditionalDocumentReference[0].ID.value
      }
    }

    if (data.Note) {
      if (data.Note[0]?.value) {
        invoice.その他特記事項 = data.Note[0].value
      }
    }

    if (data.InvoiceLine[i].DocumentReference) {
      invoice['明細-備考'] = data.InvoiceLine[i].DocumentReference[0].ID.value
    }

    // 明細をjsonDataに入れる
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
    csvString += index !== jsonArray.length - 1 ? `${row}\r\n` : `${row}`
  })

  return csvString
}

router.get('/', helper.isAuthenticated, cbGetIndex)
router.post('/downloadInvoice', helper.isAuthenticated, cbPostIndex)

module.exports = {
  router: router,
  cbGetIndex: cbGetIndex,
  cbPostIndex: cbPostIndex,
  errorHandle: errorHandle,
  dataToJson: dataToJson,
  jsonToCsv: jsonToCsv
}
