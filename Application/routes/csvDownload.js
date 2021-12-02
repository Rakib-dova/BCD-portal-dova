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
    '宛先-テナントID': '',
    '宛先-会社名': '',
    '宛先-国/地域': '',
    '宛先-私書箱': '',
    '宛先-郵便番号': '',
    '宛先-都道府県': '',
    '宛先-市区町村・番地': '',
    '宛先-ビル、マンション名': '',
    '宛先-GLN（企業・事業所識別コード）': '',
    '差出人-テナントID': '',
    '差出人-会社名': '',
    '差出人-国/地域': '',
    '差出人-私書箱': '',
    '差出人-郵便番号': '',
    '差出人-都道府県': '',
    '差出人-市区町村・番地': '',
    '差出人-ビル、マンション名': '',
    '差出人-GLN（企業・事業所識別コード）': '',
    請求書番号: '',
    テナントID: '',
    支払期日: '',
    納品日: '',
    備考: '',
    支払方法: '',
    '支払い条件-割引率': '',
    '支払い条件-割増率': '',
    '支払い条件-決済開始日': '',
    '支払い条件-決済終了日': '',
    '支払い条件-ペナルティ開始日': '',
    '支払い条件-ペナルティ終了日': '',
    '支払い条件-説明': '',
    '銀行口座-銀行名': '',
    '銀行口座-支店名': '',
    '銀行口座-口座番号': '',
    '銀行口座-科目': '',
    '銀行口座-口座名義': '',
    '銀行口座-番地': '',
    '銀行口座-ビル名 / フロア等': '',
    '銀行口座-家屋番号': '',
    '銀行口座-市区町村': '',
    '銀行口座-都道府県': '',
    '銀行口座-郵便番号': '',
    '銀行口座-所在地': '',
    '銀行口座-国': '',
    'DirectDebit-銀行名': '',
    'DirectDebit-支店名': '',
    'DirectDebit-口座番号': '',
    'DirectDebit-科目': '',
    'DirectDebit-口座名義': '',
    'DirectDebit-番地': '',
    'DirectDebit-ビル名 / フロア等': '',
    'DirectDebit-家屋番号': '',
    'DirectDebit-市区町村': '',
    'DirectDebit-都道府県': '',
    'DirectDebit-郵便番号': '',
    'DirectDebit-所在地': '',
    'DirectDebit-国': '',
    'IBAN払い-銀行識別コード / SWIFTコード': '',
    'IBAN払い-IBAN': '',
    'IBAN払い-説明': '',
    '国際電信送金-ABAナンバー': '',
    '国際電信送金-SWIFTコード': '',
    '国際電信送金-IBAN': '',
    '国際電信送金-口座名義': '',
    '国際電信送金-番地': '',
    '国際電信送金-ビル名 / フロア等': '',
    '国際電信送金-家屋番号': '',
    '国際電信送金-市区町村': '',
    '国際電信送金-都道府県': '',
    '国際電信送金-郵便番号': '',
    '国際電信送金 - 所在地': '',
    '国際電信送金-国': '',
    '国際電信送金-説明': '',
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
  // 現金払い, 小切手払い, BankCardどちか一つ
  let paymentMeanIndex = false

  // DirectDebit
  let paymentMeanIndexDirectDebit = false

  // 銀行口座
  let paymentMeanIndexBank = false

  // IBAN
  let paymentMeanIndexIBAN = false

  // 国際
  let paymentMeanIndexSWIFTUS = false
  for (let i = 0; i < data.InvoiceLine.length; ++i) {
    const invoice = { ...InvoiceObject }

    // 必須項目チェック
    invoice.発行日 = data.IssueDate.value

    // 宛先情報
    if (data.AccountingCustomerParty.Party.PartyIdentification || false) {
      invoice['宛先-テナントID'] = data.AccountingCustomerParty.Party.PartyIdentification[0].ID.value
    }
    if (data.AccountingCustomerParty.Party.PartyName || false) {
      invoice['宛先-会社名'] = data.AccountingCustomerParty.Party.PartyName[0].Name.value
    }
    // 宛先住所情報
    if (data.AccountingCustomerParty.Party.PostalAddress || false) {
      invoice['宛先-国/地域'] = data.AccountingCustomerParty.Party.PostalAddress.Country?.IdentificationCode.value ?? ''
      invoice['宛先-私書箱'] = data.AccountingCustomerParty.Party.PostalAddress.Postbox?.value ?? ''
      invoice['宛先-郵便番号'] = data.AccountingCustomerParty.Party.PostalAddress.PostalZone?.value ?? ''
      invoice['宛先-都道府県'] = data.AccountingCustomerParty.Party.PostalAddress.CityName?.value ?? ''
      invoice['宛先-市区町村・番地'] = data.AccountingCustomerParty.Party.PostalAddress.StreetName?.value ?? ''
      invoice['宛先-ビル、マンション名'] =
        data.AccountingCustomerParty.Party.PostalAddress.AdditionalStreetName?.value ?? ''
    }
    // invoice['宛先-GLN（企業・事業所識別コード）'] = data.AccountingCustomerParty.Party.PartyIdentification[0].ID.value

    // 差出人情報
    if (data.AccountingSupplierParty.Party.PartyIdentification || false) {
      invoice['差出人-テナントID'] = data.AccountingSupplierParty.Party.PartyIdentification[0].ID.value
    }
    if (data.AccountingSupplierParty.Party.PartyName || false) {
      invoice['差出人-会社名'] = data.AccountingSupplierParty.Party.PartyName[0].Name.value
    }
    // 差出人住所情報
    if (data.AccountingSupplierParty.Party.PostalAddress || false) {
      invoice['差出人-国/地域'] =
        data.AccountingSupplierParty.Party.PostalAddress.Country?.IdentificationCode.value ?? ''
      invoice['差出人-私書箱'] = data.AccountingSupplierParty.Party.PostalAddress.Postbox?.value ?? ''
      invoice['差出人-郵便番号'] = data.AccountingSupplierParty.Party.PostalAddress.PostalZone?.value ?? ''
      invoice['差出人-都道府県'] = data.AccountingSupplierParty.Party.PostalAddress.CityName?.value ?? ''
      invoice['差出人-市区町村・番地'] = data.AccountingSupplierParty.Party.PostalAddress.StreetName?.value ?? ''
      invoice['差出人-ビル、マンション名'] =
        data.AccountingSupplierParty.Party.PostalAddress.AdditionalStreetName?.value ?? ''
    }
    // invoice['宛先-GLN（企業・事業所識別コード）'] = data.AccountingSupplierParty.Party.PartyIdentification[0].ID.value

    invoice.請求書番号 = data.ID.value

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
    // 支払条件チェック
    if (data.PaymentTerms) {
      invoice['支払い条件-割引率'] = data.PaymentTerms[0].SettlementDiscountPercent.value ?? ''
      invoice['支払い条件-割増率'] = data.PaymentTerms[0].PenaltySurchargePercent.value ?? ''
      invoice['支払い条件-決済開始日'] = data.PaymentTerms[0].SettlementPeriod.StartDate.value ?? ''
      invoice['支払い条件-決済終了日'] = data.PaymentTerms[0].SettlementPeriod.EndDate.value ?? ''
      invoice['支払い条件-ペナルティ開始日'] = data.PaymentTerms[0].PenaltyPeriod.StartDate.value ?? ''
      invoice['支払い条件-ペナルティ終了日'] = data.PaymentTerms[0].PenaltyPeriod.EndDate.value ?? ''
      invoice['支払い条件-説明'] = data.PaymentTerms[0].Note[0].value ?? ''
    }

    // 支払方法
    if (data.PaymentMeans) {
      const paymentMeans = data.PaymentMeans
      if (paymentMeans[0].PaymentDueDate?.value) {
        invoice.支払期日 = paymentMeans[0].PaymentDueDate.value
      }

      // 支払い方法と条件をcsvに記入
      paymentMeans.forEach((mean) => {
        if (!paymentMeanIndex) {
          // 現金払いの場合
          if (mean.PaymentMeansCode?.value === '10') {
            invoice.支払方法 = '現金払い '
            // 最初の支払い条件だけ記入して、次の情報は飛ばす。
            paymentMeanIndex = true
          }
          // 小切手払い
          if (mean.PaymentMeansCode?.value === '20') {
            invoice.支払方法 = '小切手払い '
            // 最初の支払い条件だけ記入して、次の情報は飛ばす。
            paymentMeanIndex = true
          }
          // BankCard
          if (mean.PaymentMeansCode?.value === '48') {
            invoice.支払方法 = 'BankCard '
            // 最初の支払い条件だけ記入して、次の情報は飛ばす。
            paymentMeanIndex = true
          }
        }

        // DirectDebit
        if (!paymentMeanIndexDirectDebit) {
          if (mean.PaymentMeansCode?.value === '49') {
            invoice['DirectDebit-銀行名'] =
              mean.PayeeFinancialAccount.FinancialInstitutionBranch.FinancialInstitution.Name.value ?? ''
            invoice['DirectDebit-口座番号'] = mean.PayeeFinancialAccount.ID.value ?? ''
            invoice['DirectDebit-国'] =
              mean.PayeeFinancialAccount.FinancialInstitutionBranch.Address.Country.IdentificationCode.value ?? ''
            invoice['DirectDebit-家屋番号'] =
              mean.PayeeFinancialAccount.FinancialInstitutionBranch.Address.BuildingNumber.value ?? ''
            invoice['DirectDebit-ビル名 / フロア等'] =
              mean.PayeeFinancialAccount.FinancialInstitutionBranch.Address.AdditionalStreetName.value ?? ''
            const accountType = mean.PayeeFinancialAccount.AccountTypeCode.value ?? ''
            switch (accountType) {
              case 'Current':
                invoice['DirectDebit-科目'] = '当座'
                break
              case 'General':
                invoice['DirectDebit-科目'] = '普通'
                break
              default:
                invoice['DirectDebit-科目'] = ''
                break
            }

            invoice['DirectDebit-郵便番号'] =
              mean.PayeeFinancialAccount.FinancialInstitutionBranch.Address.PostalZone.value ?? ''
            invoice['DirectDebit-市区町村'] =
              mean.PayeeFinancialAccount.FinancialInstitutionBranch.Address.CityName.value ?? ''
            invoice['DirectDebit-所在地'] =
              mean.PayeeFinancialAccount.FinancialInstitutionBranch?.Address?.AddressLine[0].Line.value ?? ''
            invoice['DirectDebit-支店名'] = mean.PayeeFinancialAccount.FinancialInstitutionBranch.Name.value ?? ''
            invoice['DirectDebit-番地'] =
              mean.PayeeFinancialAccount.FinancialInstitutionBranch.Address.StreetName.value ?? ''
            invoice['DirectDebit-口座名義'] = mean.PayeeFinancialAccount.Name.value ?? ''
            invoice['DirectDebit-都道府県'] =
              mean.PayeeFinancialAccount.FinancialInstitutionBranch?.Address.CountrySubentity.value ?? ''
            // 最初のDirectDebit情報だけ記入して、次の情報は飛ばす。
            paymentMeanIndexDirectDebit = true
          }
        }

        // 銀行口座
        if (!paymentMeanIndexBank) {
          if (mean.PaymentMeansCode?.value === '42') {
            invoice['銀行口座-銀行名'] =
              mean.PayeeFinancialAccount.FinancialInstitutionBranch.FinancialInstitution.Name.value ?? ''
            invoice['銀行口座-支店名'] = mean.PayeeFinancialAccount.FinancialInstitutionBranch.Name.value ?? ''
            invoice['銀行口座-口座番号'] = mean.PayeeFinancialAccount.ID.value ?? ''
            invoice['銀行口座-口座名義'] = mean.PayeeFinancialAccount.Name.value ?? ''
            const accountType = mean.PayeeFinancialAccount.AccountTypeCode.value ?? ''
            switch (accountType) {
              case 'Current':
                invoice['銀行口座-科目'] = '当座'
                break
              case 'General':
                invoice['銀行口座-科目'] = '普通'
                break
              default:
                invoice['銀行口座-科目'] = ''
                break
            }
            invoice['銀行口座-家屋番号'] =
              mean.PayeeFinancialAccount.FinancialInstitutionBranch.Address.BuildingNumber.value ?? ''
            invoice['銀行口座-市区町村'] =
              mean.PayeeFinancialAccount.FinancialInstitutionBranch.Address.CityName.value ?? ''
            invoice['銀行口座-都道府県'] =
              mean.PayeeFinancialAccount.FinancialInstitutionBranch.Address.CountrySubentity.value ?? ''
            invoice['銀行口座-郵便番号'] =
              mean.PayeeFinancialAccount.FinancialInstitutionBranch.Address.PostalZone.value ?? ''
            invoice['銀行口座-所在地'] =
              mean.PayeeFinancialAccount.FinancialInstitutionBranch.Address.AddressLine[0].Line.value ?? ''
            invoice['銀行口座-国'] =
              mean.PayeeFinancialAccount.FinancialInstitutionBranch.Address.Country.IdentificationCode.value ?? ''
            invoice['銀行口座-番地'] =
              mean.PayeeFinancialAccount.FinancialInstitutionBranch.Address.StreetName.value ?? ''
            invoice['銀行口座-ビル名 / フロア等'] =
              mean.PayeeFinancialAccount.FinancialInstitutionBranch.Address.AdditionalStreetName.value ?? ''
            // 最初の銀行口座情報だけ記入して、次の情報は飛ばす。
            paymentMeanIndexBank = true
          }
        }

        // IBAN
        if (!paymentMeanIndexIBAN) {
          if (mean.PaymentChannelCode?.value === 'IBAN') {
            invoice['IBAN払い-IBAN'] = mean.PayeeFinancialAccount.ID.value ?? ''
            invoice['IBAN払い-説明'] = mean.PayeeFinancialAccount.PaymentNote[0].value ?? ''
            invoice['IBAN払い-銀行識別コード / SWIFTコード'] =
              mean.PayeeFinancialAccount.FinancialInstitutionBranch.FinancialInstitution.ID.value ?? ''
            // 最初のIBAN払い情報だけ記入して、次の情報は飛ばす。
            paymentMeanIndexIBAN = true
          }
        }

        // 国際
        if (!paymentMeanIndexSWIFTUS) {
          if (mean.PaymentChannelCode?.value === 'SWIFTUS') {
            invoice['国際電信送金-ABAナンバー'] = mean.PayeeFinancialAccount.FinancialInstitutionBranch.ID.value ?? ''
            invoice['国際電信送金-SWIFTコード'] =
              mean.PayeeFinancialAccount.FinancialInstitutionBranch.FinancialInstitution.ID.value ?? ''
            invoice['国際電信送金-IBAN'] = mean.PayeeFinancialAccount.ID.value ?? ''
            invoice['国際電信送金-口座名義'] = mean.PayeeFinancialAccount.Name.value ?? ''
            invoice['国際電信送金-番地'] =
              mean.PayeeFinancialAccount.FinancialInstitutionBranch.Address.StreetName.value ?? ''
            invoice['国際電信送金-ビル名 / フロア等'] =
              mean.PayeeFinancialAccount.FinancialInstitutionBranch.Address.AdditionalStreetName.value ?? ''
            invoice['国際電信送金-家屋番号'] =
              mean.PayeeFinancialAccount.FinancialInstitutionBranch.Address.BuildingNumber.value ?? ''
            invoice['国際電信送金-市区町村'] =
              mean.PayeeFinancialAccount.FinancialInstitutionBranch.Address.CityName.value ?? ''
            invoice['国際電信送金-都道府県'] =
              mean.PayeeFinancialAccount.FinancialInstitutionBranch.Address.CountrySubentity.value ?? ''
            invoice['国際電信送金-郵便番号'] =
              mean.PayeeFinancialAccount.FinancialInstitutionBranch.Address.PostalZone.value ?? ''
            invoice['国際電信送金 - 所在地'] =
              mean.PayeeFinancialAccount.FinancialInstitutionBranch.Address.AddressLine[0].Line.value ?? ''
            invoice['国際電信送金-国'] =
              mean.PayeeFinancialAccount.FinancialInstitutionBranch?.Address.Country.IdentificationCode.value ?? ''
            invoice['国際電信送金-説明'] = mean.PayeeFinancialAccount.PaymentNote[0].value ?? ''
            // 最初の国際電信送金情報だけ記入して、次の情報は飛ばす。
            paymentMeanIndexSWIFTUS = true
          }
        }
      })
    }

    if (data.Delivery) {
      if (data.Delivery[0].ActualDeliveryDate?.value ?? false) {
        invoice.納品日 = data.Delivery[0].ActualDeliveryDate.value ?? ''
      }
    }

    if (data.AdditionalDocumentReference) {
      if (data.AdditionalDocumentReference[0].DocumentTypeCode.value === 'File ID') {
        invoice.備考 = data.AdditionalDocumentReference[0].ID.value ?? ''
      }
    }

    if (data.Note) {
      if (data.Note[0]?.value) {
        invoice.その他特記事項 = data.Note[0].value ?? ''
      }
    }

    if (data.InvoiceLine[i].DocumentReference) {
      invoice['明細-備考'] = data.InvoiceLine[i].DocumentReference[0].ID.value ?? ''
    }

    // 明細をjsonDataに入れる
    jsonData.push(invoice)
  }

  return jsonData
}

const jsonToCsv = (jsonData) => {
  const jsonArray = jsonData
  let csvString = ''
  const replacer = (key, value) => (value === null ? '' : value)
  const titles = Object.keys(jsonArray[0])
  csvString = jsonArray.map((row) => titles.map((fieldName) => JSON.stringify(row[fieldName], replacer)).join(','))
  csvString.unshift(titles.join(','))
  csvString = csvString.join('\r\n')
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
