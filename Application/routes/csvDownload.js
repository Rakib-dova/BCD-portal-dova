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
const csvDownloadController = require('../controllers/csvDownloadController.js')

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

  // 発行日開始日と終了日の算定(今日の日付の月 - 1)
  const today = new Date()
  const minissuedate = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate()).toISOString().split('T')[0]
  const maxissuedate = today.toISOString().split('T')[0]

  // ステータス項目の選択アイテム
  // tradeshiftステータス
  // ・送信済み/受信済み
  // ・受理済み/承認済み
  // ・無効
  // ・すべて
  // ・送信済み/受信済み
  // ・受理済み/承認済み
  // ・無効
  // ・入金額人済み/送金済み
  // ・却下済み
  // ・内容確認中
  // ・期日超過
  // ・提出済み/承認待ち
  // ・失敗
  // ・送金済み/決済済み
  // ・送信中
  // ・接続承認待ち
  // ・クリアランス中
  // ・切替え済み
  // ・完了
  // ・回収済み
  const status = [
    'すべて',
    '送信済み/受信済み',
    '無効',
    '受理済み/承認済み',
    '提出済み/承認待ち',
    '入金確認済み/送金済み',
    '却下済み',
    '内容確認中',
    '期日超過',
    '失敗',
    '送金済み/決済済み',
    '送信中',
    '接続承認待ち',
    'クリアランス中',
    '差替え済み',
    '完了',
    '回収済み'
  ]
  // 販売購入項目の選択アイテム
  const buyAndSell = ['すべて', '販売', '購入']

  // 請求書ダウンロード画面表示
  res.render('csvDownload', {
    title: '請求情報ダウンロード',
    minissuedate: minissuedate,
    maxissuedate: maxissuedate, // 発行日、作成日、支払期日の日付をyyyy-mm-dd表示を今日の日付に表示
    status: status,
    buyAndSell: buyAndSell
  })
  logger.info(constantsDefine.logMessage.INF001 + 'cbGetIndex')
}

const cbPostIndex = async (req, res, next) => {
  logger.info(`${constantsDefine.logMessage.INF000}${functionName}`)
  const qs = require('qs')

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

  const checkContractStatus = await helper.checkContractStatus(req.user.tenantId)
  if (checkContractStatus === null || checkContractStatus === 999) {
    return res.status(500).send(constantsDefine.statusConstants.SYSTEMERRORMESSAGE)
  }

  if (!validate.isStatusForCancel(contractStatus, deleteFlag)) {
    return res.status(400).send()
  }

  req.session.userContext = 'LoggedIn'
  req.session.userRole = user.dataValues?.userRole

  // 絞り込みの条件データチェック
  const findDocumentQuery = {}

  // 絞り込みの条件に請求書番号追加
  if (req.body.invoiceNumber || false) {
    findDocumentQuery.businessId = req.body.invoiceNumber
  }

  const stags = ['outbox', 'inbox', 'sales', 'purchases']
  const states = [
    'DELIVERED',
    'REJECTED_BY_SENDER',
    'ACCEPTED',
    'SENT',
    'PAID_CONFIRMED',
    'REJECTED_BY_RECEIVER',
    'DISPUTED_BY_RECEIVER',
    'OVERDUE',
    'FAILED_DELIVERY',
    'PAID_UNCONFIRMED',
    'IN_TRANSIT',
    'PENDING_NOT_A_CONTACT',
    'IN_CLEARANCE',
    'REPLACED',
    'CLOSED',
    'COLLECTED'
  ]

  // 絞り込みの条件に購入/販売追加
  switch (req.body.buyAndSell) {
    case 'すべて': {
      findDocumentQuery.stag = `${stags[2]}&stag=${stags[3]}`
      break
    }
    case '販売': {
      findDocumentQuery.stag = `${stags[2]}`
      break
    }
    case '購入': {
      findDocumentQuery.stag = `${stags[3]}`
      break
    }
  }

  // 絞り込みの条件にステータス追加
  switch (Array.isArray(req.body.status)) {
    case false: {
      switch (req.body.status) {
        case 'すべて': {
          findDocumentQuery.stag = `${stags[0]}&stag=${stags[1]}`
          findDocumentQuery.state = ''
          states.forEach((item, idx) => {
            if (idx === 0) {
              findDocumentQuery.state += item
            } else {
              findDocumentQuery.state += `&state=${item}`
            }
          })
          break
        }
        case '送信済み/受信済み': {
          findDocumentQuery.stag = `${stags[0]}&stag=${stags[1]}`
          findDocumentQuery.state = `${states[0]}`
          break
        }
        default: {
          switch (req.body.status) {
            case '無効': {
              findDocumentQuery.state = `${states[1]}`
              break
            }
            case '受理済み/承認済み': {
              findDocumentQuery.state = `${states[2]}`
              break
            }
            case '提出済み/承認待ち': {
              findDocumentQuery.state = `${states[3]}`
              break
            }
            case '入金確認済み/送金済み': {
              findDocumentQuery.state = `${states[4]}`
              break
            }
            case '却下済み': {
              findDocumentQuery.state = `${states[5]}`
              break
            }
            case '内容確認中': {
              findDocumentQuery.state = `${states[6]}`
              break
            }
            case '期日超過': {
              findDocumentQuery.state = `${states[7]}`
              break
            }
            case '失敗': {
              findDocumentQuery.state = `${states[8]}`
              break
            }
            case '送金済み/決済済み': {
              findDocumentQuery.state = `${states[9]}`
              break
            }
            case '送信中': {
              findDocumentQuery.state = `${states[10]}`
              break
            }
            case '接続承認待ち': {
              findDocumentQuery.state = `${states[11]}`
              break
            }
            case 'クリアランス中': {
              findDocumentQuery.state = `${states[12]}`
              break
            }
            case '差替え済み': {
              findDocumentQuery.state = `${states[13]}`
              break
            }
            case '完了': {
              findDocumentQuery.state = `${states[14]}`
              break
            }
            case '回収済み': {
              findDocumentQuery.state = `${states[15]}`
              break
            }
          }
          break
        }
      }
      break
    }
    case true: {
      findDocumentQuery.stag = `${stags[2]}&stag=${stags[3]}`
      findDocumentQuery.state = ''
      let outboxInboxFlag = false
      req.body.status.forEach((item, idx) => {
        if (idx !== 0) {
          findDocumentQuery.state += '&state='
        }
        switch (item) {
          case '送信済み/受信済み':
            outboxInboxFlag = true
            findDocumentQuery.state += `${states[0]}`
            break
          case '無効': {
            findDocumentQuery.state += `${states[1]}`
            break
          }
          case '受理済み/承認済み': {
            findDocumentQuery.state += `${states[2]}`
            break
          }
          case '提出済み/承認待ち': {
            findDocumentQuery.state += `${states[3]}`
            break
          }
          case '入金確認済み/送金済み': {
            findDocumentQuery.state += `${states[4]}`
            break
          }
          case '却下済み': {
            findDocumentQuery.state += `${states[5]}`
            break
          }
          case '内容確認中': {
            findDocumentQuery.state += `${states[6]}`
            break
          }
          case '期日超過': {
            findDocumentQuery.state += `${states[7]}`
            break
          }
          case '失敗': {
            findDocumentQuery.state += `${states[8]}`
            break
          }
          case '送金済み/決済済み': {
            findDocumentQuery.state += `${states[9]}`
            break
          }
          case '送信中': {
            findDocumentQuery.state += `${states[10]}`
            break
          }
          case '接続承認待ち': {
            findDocumentQuery.state += `${states[11]}`
            break
          }
          case 'クリアランス中': {
            findDocumentQuery.state += `${states[12]}`
            break
          }
          case '差替え済み': {
            findDocumentQuery.state += `${states[13]}`
            break
          }
          case '完了': {
            findDocumentQuery.state += `${states[14]}`
            break
          }
          case '回収済み': {
            findDocumentQuery.state += `${states[15]}`
            break
          }
        }
      })
      //
      if (outboxInboxFlag) {
        findDocumentQuery.stag = `${stags[0]}&stag=${stags[1]}`
      }
      break
    }
  }

  // 絞り込みの条件に発行日の開始日追加
  if (req.body.minIssuedate || false) {
    findDocumentQuery.minissuedate = req.body.minIssuedate
  }

  // 絞り込みの条件に発行日の終了日追加
  if (req.body.maxIssuedate || false) {
    findDocumentQuery.maxissuedate = req.body.maxIssuedate
  }

  const invoiceNumber = req.body.invoiceNumber
  const findDocuments = '/documents'

  // 企業情報がない場合、検索できるようにするための変数
  const noCompany = ['nocompany1', 'nocompany2']

  // 受信企業の条件のチェック
  let sentTo
  if (Array.isArray(req.body.sentTo)) {
    sentTo = req.body.sentTo
  } else {
    if (validate.isString(req.body.sentTo)) {
      sentTo = [req.body.sentTo]
    } else {
      // 企業情報がない場合、検索できるようにする。
      sentTo = [noCompany[0]]
    }
  }

  // 送信企業の条件のチェック
  let sentBy
  if (Array.isArray(req.body.sentBy)) {
    sentBy = req.body.sentBy
  } else {
    if (validate.isString(req.body.sentBy)) {
      sentBy = [req.body.sentBy]
    } else {
      // 企業情報がない場合、検索できるようにする。
      sentBy = [noCompany[1]]
    }
  }

  // 送信企業X受信企業ごとに検索
  let sentToIdx = 0
  let documentsResult
  let resultForQuery
  do {
    const company = sentTo[sentToIdx]
    let sentByIdx = 0
    if (company !== noCompany[0]) findDocumentQuery.sentTo = company
    do {
      const sentByCompany = sentBy[sentByIdx]
      if (sentByCompany !== noCompany[1]) findDocumentQuery.sentBy = sentByCompany
      if (company !== sentByCompany) {
        const sendQuery = qs.stringify(findDocumentQuery).replace(/%26/g, '&').replace(/%3D/g, '=')
        // 請求書を検索する
        let pageId = 0
        let numPages = 1

        do {
          resultForQuery = await apiManager.accessTradeshift(
            req.user.accessToken,
            req.user.refreshToken,
            'get',
            `${findDocuments}?${sendQuery}&limit=100&page=${pageId}`
          )
          numPages = resultForQuery.numPages ?? 1
          // 最初検索の場合結果オブジェクト作成
          if (pageId === 0 && !(documentsResult?.Document ?? false)) {
            documentsResult = {
              ...resultForQuery
            }
          } else {
            // 検索結果がある場合結果リストに追加
            resultForQuery.Document.forEach((item) => {
              // 結果リストの数をを増加
              documentsResult.itemCount++
              documentsResult.Document.push(item)
            })
          }
          pageId++
        } while (pageId < numPages)
      }
      sentByIdx++
    } while (sentByIdx < sentBy.length)
    sentToIdx++
  } while (sentToIdx < sentTo.length)

  let filename = ''
  let downloadFile = ''
  // resultForQuery（API呼出）エラー検査
  if (resultForQuery instanceof Error) {
    errorHandle(resultForQuery, res, req)
  } else {
    // 請求書検索結果、1件以上の場合ダウンロード、0件の場合ポップを表示
    if (documentsResult.itemCount === 0) {
      // 条件に合わせるデータがない場合、お知らせを表示する。
      req.flash('noti', '条件に合致する請求書が見つかりませんでした。')
      res.redirect(303, '/csvDownload')
    } else {
      const today = new Date().toISOString().split('T').join().replace(',', '_').replace(/:/g, '').replace('Z', '') // yyyy-mm-dd_HHMMSS.sss
      if (req.body.invoiceNumber || false) {
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
          const resultForDocumentId = await apiManager.accessTradeshift(
            req.user.accessToken,
            req.user.refreshToken,
            'get',
            `/documents/${documentId}`
          )
          // resultエラー検査
          if (resultForDocumentId instanceof Error) {
            errorHandle(resultForDocumentId, res, req)
          } else {
            // 取得した請求書をJSONに作成する
            const jsondata = dataToJson(resultForDocumentId)
            // JSONファイルをCSVに変更
            downloadFile = jsonToCsv(jsondata)
            // ファイル名：今日の日付_ユーザID.csv

            filename = encodeURIComponent(`${today}_${invoiceNumber}.csv`)
            res.set({ 'Content-Disposition': `attachment; filename=${filename}` })
            res.status(200).send(`${String.fromCharCode(0xfeff)}${downloadFile}`)
          }
        } else {
          // 条件に合わせるデータがない場合、お知らせを表示する。
          req.flash('noti', '条件に合致する請求書が見つかりませんでした。')
          res.redirect(303, '/csvDownload')
        }
      } else {
        const invoicesForDownload = await csvDownloadController.createInvoiceDataForDownload(
          req.user.accessToken,
          req.user.refreshToken,
          documentsResult.Document
        )

        // エラーを確認する
        if (invoicesForDownload instanceof Error) {
          errorHandle(invoicesForDownload, res, req)
        }

        filename = encodeURIComponent(`${today}_請求書.csv`)
        res.set({ 'Content-Disposition': `attachment; filename=${filename}` })
        res.status(200).send(`${String.fromCharCode(0xfeff)}${invoicesForDownload}`)
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
    if (data.AccountingCustomerParty.Party.PartyIdentification || false) {
      invoice.テナントID = data.AccountingCustomerParty.Party.PartyIdentification[0].ID.value
    }

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
    const taxName = (data.InvoiceLine[i].TaxTotal[0].TaxSubtotal[0]?.TaxCategory.TaxScheme.Name.value)
      .replace('JP ', '')
      .replace('消費税(軽減税率)', '軽減税率')
      .replace(' 10%', '')
      .replace(' 8%', '')
      .replace(' 0%', '')

    invoice['明細-税（消費税／軽減税率／不課税／免税／非課税）'] = taxName

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
      if (data.Delivery[0].ActualDeliveryDate?.value ?? false) {
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
router.post('/', helper.isAuthenticated, cbPostIndex)

module.exports = {
  router: router,
  cbGetIndex: cbGetIndex,
  cbPostIndex: cbPostIndex,
  errorHandle: errorHandle,
  dataToJson: dataToJson,
  jsonToCsv: jsonToCsv
}
