'use strict'
const express = require('express')
const DOMParser = require('dom-parser')
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
      req.flash('noti', ['請求書ダウンロード', '条件に合致する請求書が見つかりませんでした。'])
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
          req.flash('noti', ['請求書ダウンロード', '条件に合致する請求書が見つかりませんでした。'])
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
    _req.flash('noti', ['請求書ダウンロード', constantsDefine.statusConstants.CSVDOWNLOAD_APIERROR])
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
    _req.flash('noti', ['請求書ダウンロード', constantsDefine.statusConstants.CSVDOWNLOAD_SYSERROR])
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
    支払期日: '',
    納品日: '',
    納品開始日: '',
    納品終了日: '',
    備考: '',
    注文書番号: '',
    注文書発行日: '',
    参考情報: '',
    契約書番号: '',
    部門: '',
    '取引先担当者（アドレス）': '',
    輸送情報: '',
    Tradeshiftクリアランス: '',
    通関識別情報: '',
    ID: '',
    課税日: '',
    販売者の手数料番号: '',
    DUNSナンバー: '',
    暫定時間: '',
    予約番号: '',
    為替レート: '',
    '為替レート-通貨': '',
    '為替レート-日付': '',
    為替レート換算後の税金総額: '',
    '為替レート-Convertd Document Total(incl taxes)': '',
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
    '支払方法-予備': '',
    その他特記事項: '',
    '明細-項目ID': '',
    '明細-内容': '',
    '明細-数量': '',
    '明細-単位': '',
    '明細-単価': '',
    '明細-税（消費税／軽減税率／不課税／免税／非課税）': '',
    '明細-小計 (税抜)': '',
    '明細-割引1-内容': '',
    '明細-割引1-値': '',
    '明細-割引1-単位': '',
    '明細-割引1-単価': '',
    '明細-割引2-内容': '',
    '明細-割引2-値': '',
    '明細-割引2-単位': '',
    '明細-割引2-単価': '',
    '明細-割引3-内容': '',
    '明細-割引3-値': '',
    '明細-割引3-単位': '',
    '明細-割引3-単価': '',
    '明細-割引4以降': '',
    '明細-追加料金1-内容': '',
    '明細-追加料金1-値': '',
    '明細-追加料金1-単位': '',
    '明細-追加料金1-単価': '',
    '明細-追加料金2-内容': '',
    '明細-追加料金2-値': '',
    '明細-追加料金2-単位': '',
    '明細-追加料金2-単価': '',
    '明細-追加料金3-内容': '',
    '明細-追加料金3-値': '',
    '明細-追加料金3-単位': '',
    '明細-追加料金3-単価': '',
    '明細-追加料金4以降': '',
    '明細-輸送情報': '',
    '明細-備考': '',
    '明細-シリアルナンバー': '',
    '明細-商品分類コード: ECCN': '',
    '明細-発注者品番': '',
    '明細-注文明細番号': '',
    '明細-EAN/GTIN': '',
    '明細-ロケーションID': '',
    '明細-貨物注文番号': '',
    '明細-納品日': '',
    '明細-HSN/SAC区分': '',
    '明細-HSN/SACの値': '',
    '明細-非課税/免税の理由': '',
    '明細-注文書番号': '',
    '明細-詳細': '',
    '明細-メーカー名': '',
    '明細-原産国': '',
    '明細-納期': '',
    '明細-配送先-私書箱': '',
    '明細-配送先-市区町村番地': '',
    '明細-配送先-マンション名': '',
    '明細-配送先-都道府県': '',
    '明細-配送先-郵便番号': '',
    '明細-配送先-国': '',
    '割引1-項目ID': '',
    '割引1-内容': '',
    '割引1-数量': '',
    '割引1-単位': '',
    '割引1-税（消費税／軽減税率／不課税／免税／非課税）': '',
    '割引1-小計（税抜）': '',
    '割引2-項目ID': '',
    '割引2-内容': '',
    '割引2-数量': '',
    '割引2-単位': '',
    '割引2-税（消費税／軽減税率／不課税／免税／非課税）': '',
    '割引2-小計（税抜）': '',
    '割引3-項目ID': '',
    '割引3-内容': '',
    '割引3-数量': '',
    '割引3-単位': '',
    '割引3-税（消費税／軽減税率／不課税／免税／非課税）': '',
    '割引3-小計（税抜）': '',
    割引4以降: '',
    '追加料金1-項目ID': '',
    '追加料金1-内容': '',
    '追加料金1-数量': '',
    '追加料金1-単位': '',
    '追加料金1-税（消費税／軽減税率／不課税／免税／非課税）': '',
    '追加料金1-小計（税抜）': '',
    '追加料金2-項目ID': '',
    '追加料金2-内容': '',
    '追加料金2-数量': '',
    '追加料金2-単位': '',
    '追加料金2-税（消費税／軽減税率／不課税／免税／非課税）': '',
    '追加料金2-小計（税抜）': '',
    '追加料金3-項目ID': '',
    '追加料金3-内容': '',
    '追加料金3-数量': '',
    '追加料金3-単位': '',
    '追加料金3-税（消費税／軽減税率／不課税／免税／非課税）': '',
    '追加料金3-小計（税抜）': '',
    追加料金4以降: '',
    '固定税-項目ID': '',
    '固定税-税': ''
  }

  const unitCodeKeys = Object.keys(bconCsvUnitDefault)

  for (let i = 0; i < data.InvoiceLine.length; ++i) {
    const invoice = { ...InvoiceObject }
    // 必須項目チェック
    invoice.発行日 = data.IssueDate.value

    /// 宛先テナントID及びGLN等の情報
    if (data.AccountingCustomerParty.Party.PartyIdentification || false) {
      const partyIdentificationData = []
      data.AccountingCustomerParty.Party.PartyIdentification.forEach((item) => {
        switch (item.ID.schemeID) {
          case 'TS:ID':
            invoice['宛先-テナントID'] = item.ID.value
            break
          case 'TS:REGNO':
            partyIdentificationData.push(`${item.ID.schemeName}:${item.ID.value}`)
            break
          case 'GLN':
            partyIdentificationData.push(`${item.ID.schemeID}:${item.ID.value}`)
            break
          case 'JP:CT':
            partyIdentificationData.push(`法人番号:${item.ID.value}`)
            break
        }
      })
      if (partyIdentificationData.length > 1) {
        invoice['宛先-GLN（企業・事業所識別コード）'] = `{${partyIdentificationData.toString()}}`
      } else {
        invoice['宛先-GLN（企業・事業所識別コード）'] = partyIdentificationData.toString()
      }
    }
    // 宛先会社名情報
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

    // 差出人テナントID及びGLN等の情報
    if (data.AccountingSupplierParty.Party.PartyIdentification || false) {
      const partyIdentificationData = []
      data.AccountingSupplierParty.Party.PartyIdentification.forEach((item) => {
        switch (item.ID.schemeID) {
          case 'TS:ID':
            invoice['差出人-テナントID'] = item.ID.value
            break
          case 'TS:REGNO':
            partyIdentificationData.push(`${item.ID.schemeName}:${item.ID.value}`)
            break
          case 'GLN':
            partyIdentificationData.push(`${item.ID.schemeID}:${item.ID.value}`)
            break
          case 'JP:CT':
            partyIdentificationData.push(`法人番号:${item.ID.value}`)
            break
        }
      })
      if (partyIdentificationData.length > 1) {
        invoice['差出人-GLN（企業・事業所識別コード）'] = `{${partyIdentificationData.toString()}}`
      } else {
        invoice['差出人-GLN（企業・事業所識別コード）'] = partyIdentificationData.toString()
      }
    }
    // 差出人会社名情報
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

    invoice.請求書番号 = data.ID.value

    // 任意項目チェック
    // 支払条件チェック
    if (data.PaymentTerms) {
      let paymentTermsMultiIndex = false
      let paymentTermsIndex = 2
      const paymentTerms = data.PaymentTerms
      paymentTerms.forEach((terms) => {
        const settlementDiscountPercent = terms.SettlementDiscountPercent?.value ?? ''
        const penaltySurchargePercent = terms.PenaltySurchargePercent?.value ?? ''
        const settleStartDate = terms.SettlementPeriod?.StartDate?.value ?? ''
        const settleEndDate = terms.SettlementPeriod?.EndDate?.value ?? ''
        const penaltyStartDate = terms.PenaltyPeriod?.StartDate?.value ?? ''
        const penaltyEndDate = terms.PenaltyPeriod?.EndDate?.value ?? ''
        const note = terms.Note[0]?.value ?? ''
        if (!paymentTermsMultiIndex) {
          invoice['支払い条件-割引率'] = settlementDiscountPercent
          invoice['支払い条件-割増率'] = penaltySurchargePercent
          invoice['支払い条件-決済開始日'] = settleStartDate
          invoice['支払い条件-決済終了日'] = settleEndDate
          invoice['支払い条件-ペナルティ開始日'] = penaltyStartDate
          invoice['支払い条件-ペナルティ終了日'] = penaltyEndDate
          invoice['支払い条件-説明'] = note
          paymentTermsMultiIndex = true
        } else {
          invoice['支払方法-予備'] += invoice['支払方法-予備']
            ? `,支払い条件-割引率${paymentTermsIndex}:${settlementDiscountPercent}`
            : `支払い条件-割引率${paymentTermsIndex}:${settlementDiscountPercent}`
          invoice['支払方法-予備'] += `,支払い条件-割増率${paymentTermsIndex}:${penaltySurchargePercent}`
          invoice['支払方法-予備'] += `,支払い条件-決済開始日${paymentTermsIndex}:${settleStartDate}`
          invoice['支払方法-予備'] += `,支払い条件-決済終了日${paymentTermsIndex}:${settleEndDate}`
          invoice['支払方法-予備'] += `,支払い条件-ペナルティ開始日${paymentTermsIndex}:${penaltyStartDate}`
          invoice['支払方法-予備'] += `,支払い条件-ペナルティ終了日${paymentTermsIndex}:${penaltyEndDate}`
          invoice['支払方法-予備'] += `,支払い条件-説明${paymentTermsIndex}:${note}`
          paymentTermsIndex += 1
        }
      })
    }

    // 支払方法
    if (data.PaymentMeans) {
      const paymentMeans = data.PaymentMeans
      if (paymentMeans[0].PaymentDueDate?.value) {
        invoice.支払期日 = paymentMeans[0].PaymentDueDate.value
      }

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

      // 複数払い表示のためのIndex
      let paymentWayIndex = 2
      // 複数directDebit表示のためのIndex
      let directDebitPaymentMeanIndex = 2
      // 複数銀行口座表示のためのIndex
      let bankAccountPaymentMeanIndex = 2
      // 複数IBAN表示のためのIndex
      let ibanPaymentMeanIndex = 2
      // 複数国際表示のためのIndex
      let internationalPaymentMeanIndex = 2

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
        } else {
          // 複数の現金払いの場合
          if (mean.PaymentMeansCode?.value === '10') {
            invoice['支払方法-予備'] += invoice['支払方法-予備']
              ? `,支払方法${paymentWayIndex}:現金払い`
              : `支払方法${paymentWayIndex}:現金払い`
          }
          // 小切手払い
          if (mean.PaymentMeansCode?.value === '20') {
            invoice['支払方法-予備'] += invoice['支払方法-予備']
              ? `,支払方法${paymentWayIndex}:小切手払い`
              : `支払方法${paymentWayIndex}:小切手払い`
          }
          // BankCard
          if (mean.PaymentMeansCode?.value === '48') {
            invoice['支払方法-予備'] += invoice['支払方法-予備']
              ? `,支払方法${paymentWayIndex}:BankCard`
              : `支払方法${paymentWayIndex}:BankCard`
          }
          paymentWayIndex += 1
        }

        // DirectDebit
        if (mean.PaymentMeansCode?.value === '49') {
          if (!paymentMeanIndexDirectDebit) {
            invoice['DirectDebit-銀行名'] =
              mean.PayeeFinancialAccount.FinancialInstitutionBranch?.FinancialInstitution?.Name?.value ?? ''
            invoice['DirectDebit-口座番号'] = mean.PayeeFinancialAccount?.ID?.value ?? ''
            invoice['DirectDebit-国'] =
              mean.PayeeFinancialAccount.FinancialInstitutionBranch?.Address?.Country?.IdentificationCode?.value ?? ''
            invoice['DirectDebit-家屋番号'] =
              mean.PayeeFinancialAccount.FinancialInstitutionBranch?.Address?.BuildingNumber?.value ?? ''
            invoice['DirectDebit-ビル名 / フロア等'] =
              mean.PayeeFinancialAccount.FinancialInstitutionBranch?.Address?.AdditionalStreetName?.value ?? ''
            const accountType = mean.PayeeFinancialAccount?.AccountTypeCode?.value ?? ''
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
              mean.PayeeFinancialAccount.FinancialInstitutionBranch?.Address?.PostalZone?.value ?? ''
            invoice['DirectDebit-市区町村'] =
              mean.PayeeFinancialAccount.FinancialInstitutionBranch?.Address?.CityName?.value ?? ''
            invoice['DirectDebit-所在地'] =
              mean.PayeeFinancialAccount.FinancialInstitutionBranch?.Address?.AddressLine[0]?.Line?.value ?? ''
            invoice['DirectDebit-支店名'] = mean.PayeeFinancialAccount.FinancialInstitutionBranch?.Name?.value ?? ''
            invoice['DirectDebit-番地'] =
              mean.PayeeFinancialAccount.FinancialInstitutionBranch?.Address?.StreetName?.value ?? ''
            invoice['DirectDebit-口座名義'] = mean.PayeeFinancialAccount?.Name?.value ?? ''
            invoice['DirectDebit-都道府県'] =
              mean.PayeeFinancialAccount.FinancialInstitutionBranch?.Address?.CountrySubentity?.value ?? ''
            // 最初のDirectDebit情報だけ記入して、次の情報は飛ばす。
            paymentMeanIndexDirectDebit = true
          } else {
            // 複数目のDirectDebit情報取得
            const bankName =
              mean.PayeeFinancialAccount?.FinancialInstitutionBranch?.FinancialInstitution?.Name.value ?? ''
            const accountNumber = mean.PayeeFinancialAccount?.ID?.value ?? ''
            const country =
              mean.PayeeFinancialAccount?.FinancialInstitutionBranch?.Address?.Country?.IdentificationCode?.value ?? ''
            const buildingNumber =
              mean.PayeeFinancialAccount?.FinancialInstitutionBranch?.Address?.BuildingNumber?.value ?? ''
            const additionalStreetName =
              mean.PayeeFinancialAccount?.FinancialInstitutionBranch?.Address?.AdditionalStreetName?.value ?? ''
            const accountType = mean.PayeeFinancialAccount?.AccountTypeCode?.value ?? ''
            const postalZone = mean.PayeeFinancialAccount?.FinancialInstitutionBranch?.Address?.PostalZone?.value ?? ''
            const cityName = mean.PayeeFinancialAccount?.FinancialInstitutionBranch?.Address?.CityName?.value ?? ''
            const addressLine =
              mean.PayeeFinancialAccount?.FinancialInstitutionBranch?.Address?.AddressLine[0]?.Line?.value ?? ''
            const institutionBranchName = mean.PayeeFinancialAccount?.FinancialInstitutionBranch?.Name?.value ?? ''
            const streetName = mean.PayeeFinancialAccount?.FinancialInstitutionBranch?.Address?.StreetName?.value ?? ''
            const accountName = mean.PayeeFinancialAccount?.Name?.value ?? ''
            const countrySubentity =
              mean.PayeeFinancialAccount?.FinancialInstitutionBranch?.Address?.CountrySubentity?.value ?? ''

            // 支払方法-予備に入れる
            invoice['支払方法-予備'] += invoice['支払方法-予備']
              ? `,DirectDebit-銀行名${directDebitPaymentMeanIndex}:${bankName}`
              : `DirectDebit-銀行名${directDebitPaymentMeanIndex}:${bankName}`
            invoice['支払方法-予備'] += `,DirectDebit-口座番号${directDebitPaymentMeanIndex}:${accountNumber}`
            invoice['支払方法-予備'] += `,DirectDebit-国${directDebitPaymentMeanIndex}:${country}`
            invoice['支払方法-予備'] += `,DirectDebit-家屋番号${directDebitPaymentMeanIndex}:${buildingNumber}`
            invoice[
              '支払方法-予備'
            ] += `,DirectDebit-ビル名 / フロア等${directDebitPaymentMeanIndex}:${additionalStreetName}`

            switch (accountType) {
              case 'Current':
                invoice['支払方法-予備'] += `,DirectDebit-科目${directDebitPaymentMeanIndex}:当座`
                break
              case 'General':
                invoice['支払方法-予備'] += `,DirectDebit-科目${directDebitPaymentMeanIndex}:普通`
                break
              default:
                break
            }

            invoice['支払方法-予備'] += `,DirectDebit-郵便番号${directDebitPaymentMeanIndex}:${postalZone}`
            invoice['支払方法-予備'] += `,DirectDebit-市区町村${directDebitPaymentMeanIndex}:${cityName}`
            invoice['支払方法-予備'] += `,DirectDebit-所在地${directDebitPaymentMeanIndex}:${addressLine}`
            invoice['支払方法-予備'] += `,DirectDebit-支店名${directDebitPaymentMeanIndex}:${institutionBranchName}`
            invoice['支払方法-予備'] += `,DirectDebit-番地${directDebitPaymentMeanIndex}:${streetName}`
            invoice['支払方法-予備'] += `,DirectDebit-口座名義${directDebitPaymentMeanIndex}:${accountName}`
            invoice['支払方法-予備'] += `,DirectDebit-都道府県${directDebitPaymentMeanIndex}:${countrySubentity}`

            directDebitPaymentMeanIndex += 1
          }
        }

        // 銀行口座
        if (mean.PaymentMeansCode?.value === '42') {
          if (!paymentMeanIndexBank) {
            invoice['銀行口座-銀行名'] =
              mean.PayeeFinancialAccount?.FinancialInstitutionBranch?.FinancialInstitution?.Name?.value ?? ''
            invoice['銀行口座-支店名'] = mean.PayeeFinancialAccount?.FinancialInstitutionBranch?.Name?.value ?? ''
            invoice['銀行口座-口座番号'] = mean.PayeeFinancialAccount?.ID?.value ?? ''
            invoice['銀行口座-口座名義'] = mean.PayeeFinancialAccount?.Name?.value ?? ''
            const accountType = mean.PayeeFinancialAccount?.AccountTypeCode?.value ?? ''
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
              mean.PayeeFinancialAccount.FinancialInstitutionBranch?.Address?.BuildingNumber?.value ?? ''
            invoice['銀行口座-市区町村'] =
              mean.PayeeFinancialAccount.FinancialInstitutionBranch?.Address?.CityName?.value ?? ''
            invoice['銀行口座-都道府県'] =
              mean.PayeeFinancialAccount.FinancialInstitutionBranch?.Address?.CountrySubentity?.value ?? ''
            invoice['銀行口座-郵便番号'] =
              mean.PayeeFinancialAccount.FinancialInstitutionBranch?.Address?.PostalZone?.value ?? ''
            invoice['銀行口座-所在地'] =
              mean.PayeeFinancialAccount.FinancialInstitutionBranch?.Address?.AddressLine[0]?.Line.value ?? ''
            invoice['銀行口座-国'] =
              mean.PayeeFinancialAccount.FinancialInstitutionBranch?.Address?.Country?.IdentificationCode?.value ?? ''
            invoice['銀行口座-番地'] =
              mean.PayeeFinancialAccount.FinancialInstitutionBranch?.Address?.StreetName?.value ?? ''
            invoice['銀行口座-ビル名 / フロア等'] =
              mean.PayeeFinancialAccount.FinancialInstitutionBranch?.Address?.AdditionalStreetName?.value ?? ''
            // 最初の銀行口座情報だけ記入して、次の情報は飛ばす。
            paymentMeanIndexBank = true
          } else {
            // 銀行名
            const accountBankName =
              mean.PayeeFinancialAccount?.FinancialInstitutionBranch?.FinancialInstitution?.Name?.value ?? ''
            const branchName = mean.PayeeFinancialAccount?.FinancialInstitutionBranch?.Name?.value ?? ''
            const bankAccountNumber = mean.PayeeFinancialAccount?.ID?.value ?? ''
            // 口座名義
            const bankAccountName = mean.PayeeFinancialAccount?.Name?.value ?? ''
            const accountType = mean.PayeeFinancialAccount?.AccountTypeCode?.value ?? ''
            const bankBuildingNumber =
              mean.PayeeFinancialAccount?.FinancialInstitutionBranch.Address?.BuildingNumber.value ?? ''
            const bankCityName = mean.PayeeFinancialAccount?.FinancialInstitutionBranch?.Address?.CityName?.value ?? ''
            const bankCountrySubentity =
              mean.PayeeFinancialAccount?.FinancialInstitutionBranch?.Address?.CountrySubentity?.value ?? ''
            const bankPostalZone =
              mean.PayeeFinancialAccount?.FinancialInstitutionBranch.Address?.PostalZone?.value ?? ''
            const bankAddressLine =
              mean.PayeeFinancialAccount?.FinancialInstitutionBranch?.Address?.AddressLine[0]?.Line?.value ?? ''
            const bankCountry =
              mean.PayeeFinancialAccount?.FinancialInstitutionBranch?.Address?.Country?.IdentificationCode?.value ?? ''
            const bankStreetName =
              mean.PayeeFinancialAccount?.FinancialInstitutionBranch?.Address?.StreetName?.value ?? ''
            const bankAdditionalStreetName =
              mean.PayeeFinancialAccount?.FinancialInstitutionBranch?.Address?.AdditionalStreetName?.value ?? ''
            invoice['支払方法-予備'] += invoice['支払方法-予備']
              ? `,銀行口座-銀行名${bankAccountPaymentMeanIndex}:${accountBankName}`
              : `銀行口座-銀行名${bankAccountPaymentMeanIndex}:${accountBankName}`
            invoice['支払方法-予備'] += `,銀行口座-支店名${bankAccountPaymentMeanIndex}:${branchName}`
            invoice['支払方法-予備'] += `,銀行口座-口座番号${bankAccountPaymentMeanIndex}:${bankAccountNumber}`
            invoice['支払方法-予備'] += `,銀行口座-口座名義${bankAccountPaymentMeanIndex}:${bankAccountName}`

            switch (accountType) {
              case 'Current':
                invoice['支払方法-予備'] += `,銀行口座-科目${bankAccountPaymentMeanIndex}:当座`
                break
              case 'General':
                invoice['支払方法-予備'] += `,銀行口座-科目${bankAccountPaymentMeanIndex}:普通`
                break
              default:
                break
            }
            invoice['支払方法-予備'] += `,銀行口座-家屋番号${bankAccountPaymentMeanIndex}:${bankBuildingNumber}`
            invoice['支払方法-予備'] += `,銀行口座-市区町村${bankAccountPaymentMeanIndex}:${bankCityName}`
            invoice['支払方法-予備'] += `,銀行口座-都道府県${bankAccountPaymentMeanIndex}:${bankCountrySubentity}`
            invoice['支払方法-予備'] += `,銀行口座-郵便番号${bankAccountPaymentMeanIndex}:${bankPostalZone}`
            invoice['支払方法-予備'] += `,銀行口座-所在地${bankAccountPaymentMeanIndex}:${bankCountry}`
            invoice['支払方法-予備'] += `,銀行口座-国${bankAccountPaymentMeanIndex}:${bankAddressLine}`
            invoice['支払方法-予備'] += `,銀行口座-番地${bankAccountPaymentMeanIndex}:${bankStreetName}`
            invoice[
              '支払方法-予備'
            ] += `,銀行口座-ビル名 / フロア等${bankAccountPaymentMeanIndex}:${bankAdditionalStreetName}`

            bankAccountPaymentMeanIndex += 1
          }
        }

        // IBAN
        if (mean.PaymentChannelCode?.value === 'IBAN') {
          if (!paymentMeanIndexIBAN) {
            invoice['IBAN払い-IBAN'] = mean.PayeeFinancialAccount?.ID?.value ?? ''
            invoice['IBAN払い-説明'] = mean.PayeeFinancialAccount?.PaymentNote[0]?.value ?? ''
            invoice['IBAN払い-銀行識別コード / SWIFTコード'] =
              mean.PayeeFinancialAccount?.FinancialInstitutionBranch?.FinancialInstitution?.ID.value ?? ''
            // 最初のIBAN払い情報だけ記入して、次の情報は飛ばす。
            paymentMeanIndexIBAN = true
          } else {
            const iban = mean.PayeeFinancialAccount?.ID?.value ?? ''
            const ibanPaymentNote = mean.PayeeFinancialAccount?.PaymentNote[0]?.value ?? ''
            const ibanFinancialInstitutionId =
              mean.PayeeFinancialAccount?.FinancialInstitutionBranch?.FinancialInstitution?.ID?.value ?? ''
            invoice['支払方法-予備'] += invoice['支払方法-予備']
              ? `,IBAN払い-IBAN${ibanPaymentMeanIndex}:${iban}`
              : `IBAN払い-IBAN${ibanPaymentMeanIndex}:${iban}`
            invoice['支払方法-予備'] += `,IBAN払い-説明${ibanPaymentMeanIndex}:${ibanPaymentNote}`
            invoice[
              '支払方法-予備'
            ] += `,IBAN払い-銀行識別コード / SWIFTコード${ibanPaymentMeanIndex}:${ibanFinancialInstitutionId}`
            ibanPaymentMeanIndex += 1
          }
        }

        // 国際
        if (mean.PaymentChannelCode?.value === 'SWIFTUS') {
          if (!paymentMeanIndexSWIFTUS) {
            invoice['国際電信送金-ABAナンバー'] =
              mean.PayeeFinancialAccount?.FinancialInstitutionBranch?.ID?.value ?? ''
            invoice['国際電信送金-SWIFTコード'] =
              mean.PayeeFinancialAccount?.FinancialInstitutionBranch?.FinancialInstitution?.ID?.value ?? ''
            invoice['国際電信送金-IBAN'] = mean.PayeeFinancialAccount?.ID?.value ?? ''
            invoice['国際電信送金-口座名義'] = mean.PayeeFinancialAccount?.Name?.value ?? ''
            invoice['国際電信送金-番地'] =
              mean.PayeeFinancialAccount?.FinancialInstitutionBranch?.Address?.StreetName?.value ?? ''
            invoice['国際電信送金-ビル名 / フロア等'] =
              mean.PayeeFinancialAccount?.FinancialInstitutionBranch?.Address?.AdditionalStreetName?.value ?? ''
            invoice['国際電信送金-家屋番号'] =
              mean.PayeeFinancialAccount?.FinancialInstitutionBranch?.Address?.BuildingNumber?.value ?? ''
            invoice['国際電信送金-市区町村'] =
              mean.PayeeFinancialAccount?.FinancialInstitutionBranch?.Address?.CityName?.value ?? ''
            invoice['国際電信送金-都道府県'] =
              mean.PayeeFinancialAccount?.FinancialInstitutionBranch?.Address?.CountrySubentity?.value ?? ''
            invoice['国際電信送金-郵便番号'] =
              mean.PayeeFinancialAccount?.FinancialInstitutionBranch?.Address?.PostalZone?.value ?? ''
            invoice['国際電信送金 - 所在地'] =
              mean.PayeeFinancialAccount?.FinancialInstitutionBranch?.Address?.AddressLine[0]?.Line?.value ?? ''
            invoice['国際電信送金-国'] =
              mean.PayeeFinancialAccount?.FinancialInstitutionBranch?.Address?.Country?.IdentificationCode?.value ?? ''
            invoice['国際電信送金-説明'] = mean.PayeeFinancialAccount?.PaymentNote[0]?.value ?? ''
            // 最初の国際電信送金情報だけ記入して、次の情報は飛ばす。
            paymentMeanIndexSWIFTUS = true
          } else {
            const abaNumber = mean.PayeeFinancialAccount?.FinancialInstitutionBranch?.ID?.value ?? ''
            const swiftCode =
              mean.PayeeFinancialAccount?.FinancialInstitutionBranch?.FinancialInstitution?.ID.value ?? ''
            const internationalIban = mean.PayeeFinancialAccount?.ID?.value ?? ''
            const internationalBankAccountName = mean.PayeeFinancialAccount?.Name?.value ?? ''
            const internationalStreetName =
              mean.PayeeFinancialAccount?.FinancialInstitutionBranch?.Address?.StreetName?.value ?? ''
            const internationalAdditionalStreetName =
              mean.PayeeFinancialAccount?.FinancialInstitutionBranch?.Address?.AdditionalStreetName?.value ?? ''
            const internationalBuildingNumber =
              mean.PayeeFinancialAccount?.FinancialInstitutionBranch?.Address?.BuildingNumber?.value ?? ''
            const internationalCityName =
              mean.PayeeFinancialAccount?.FinancialInstitutionBranch?.Address?.CityName?.value ?? ''
            const internationalCountrySubentity =
              mean.PayeeFinancialAccount?.FinancialInstitutionBranch?.Address?.CountrySubentity?.value ?? ''
            const internationalPostalZone =
              mean.PayeeFinancialAccount?.FinancialInstitutionBranch?.Address?.PostalZone?.value ?? ''
            const internationalAddressLine =
              mean.PayeeFinancialAccount?.FinancialInstitutionBranch?.Address?.AddressLine[0]?.Line?.value ?? ''
            const internationalCountry =
              mean.PayeeFinancialAccount?.FinancialInstitutionBranch?.Address?.Country?.IdentificationCode?.value ?? ''
            const internationalPaymentNote = mean.PayeeFinancialAccount?.PaymentNote[0]?.value ?? ''

            invoice['支払方法-予備'] += invoice['支払方法-予備']
              ? `,国際電信送金-ABAナンバー${internationalPaymentMeanIndex}:${abaNumber}`
              : `国際電信送金-ABAナンバー${internationalPaymentMeanIndex}:${abaNumber}`
            invoice['支払方法-予備'] += `,国際電信送金-SWIFTコード${internationalPaymentMeanIndex}:${swiftCode}`
            invoice['支払方法-予備'] += `,国際電信送金-IBAN${internationalPaymentMeanIndex}:${internationalIban}`
            invoice[
              '支払方法-予備'
            ] += `,国際電信送金-口座名義${internationalPaymentMeanIndex}:${internationalBankAccountName}`
            invoice['支払方法-予備'] += `,国際電信送金-番地${internationalPaymentMeanIndex}:${internationalStreetName}`
            invoice[
              '国際電信送金-ビル名 / フロア等'
            ] += `,国際電信送金-ビル名 / フロア等${internationalPaymentMeanIndex}:${internationalAdditionalStreetName}`
            invoice[
              '支払方法-予備'
            ] += `,国際電信送金-家屋番号${internationalPaymentMeanIndex}:${internationalBuildingNumber}`
            invoice[
              '支払方法-予備'
            ] += `,国際電信送金-市区町村${internationalPaymentMeanIndex}:${internationalCityName}`
            invoice[
              '支払方法-予備'
            ] += `,国際電信送金-都道府県${internationalPaymentMeanIndex}:${internationalCountrySubentity}`
            invoice[
              '支払方法-予備'
            ] += `,国際電信送金-郵便番号${internationalPaymentMeanIndex}:${internationalPostalZone}`
            invoice[
              '支払方法-予備'
            ] += `,国際電信送金-所在地${internationalPaymentMeanIndex}:${internationalAddressLine}`
            invoice['支払方法-予備'] += `,国際電信送金-国${internationalPaymentMeanIndex}:${internationalCountry}`
            invoice['支払方法-予備'] += `,国際電信送金-説明${internationalPaymentMeanIndex}:${internationalPaymentNote}`
            internationalPaymentMeanIndex += 1
          }
        }
      })
    }

    if (data.Delivery) {
      // 納品日
      if (data.Delivery[0].ActualDeliveryDate?.value ?? false) {
        invoice.納品日 = data.Delivery[0].ActualDeliveryDate?.value
      }

      // PromisedDeliveryPeriod（納品開始日、納品終了日）
      // 納品開始日
      if (data.Delivery[0].PromisedDeliveryPeriod?.StartDate?.value ?? false) {
        invoice.納品開始日 = data.Delivery[0].PromisedDeliveryPeriod?.StartDate?.value
      }

      // 納品終了日
      if (data.Delivery[0].PromisedDeliveryPeriod?.EndDate?.value ?? false) {
        invoice.納品終了日 = data.Delivery[0].PromisedDeliveryPeriod?.EndDate?.value
      }

      // 販売者の手数料番号
      if (data.Delivery[0].Despatch?.ID?.value ?? false) {
        invoice.販売者の手数料番号 = data.Delivery[0].Despatch?.ID?.value
      }
    }

    // 注文書
    if (data.OrderReference) {
      // 注文書番号
      if (data.OrderReference?.ID?.value ?? false) {
        invoice.注文書番号 = data.OrderReference?.ID?.value
      }

      // 注文書発行日
      if (data.OrderReference?.IssueDate?.value ?? false) {
        invoice.注文書発行日 = data.OrderReference?.IssueDate?.value
      }
    }

    // 参考情報
    if (data.BillingReference) {
      if (data.BillingReference[0]?.InvoiceDocumentReference?.ID?.value ?? false) {
        invoice.参考情報 = data.BillingReference[0]?.InvoiceDocumentReference?.ID?.value
      }
    }

    // 契約書番号
    if (data.ContractDocumentReference) {
      if (data.ContractDocumentReference[0]?.ID?.value ?? false) {
        invoice.契約書番号 = data.ContractDocumentReference[0]?.ID?.value
      }
    }

    // 部門
    if (data.AccountingCost) {
      if (data.AccountingCost?.value ?? false) {
        invoice.部門 = data.AccountingCost?.value
      }
    }

    if (data.AccountingCustomerParty) {
      // 取引先担当者（アドレス）
      if (data.AccountingCustomerParty.Party?.Contact?.ID?.value ?? false) {
        invoice['取引先担当者（アドレス）'] = data.AccountingCustomerParty.Party.Contact?.ID?.value
      }

      // ID
      if (data.AccountingCustomerParty.CustomerAssignedAccountID?.value ?? false) {
        invoice.ID = data.AccountingCustomerParty.CustomerAssignedAccountID?.value
      }
    }

    if (data.AdditionalDocumentReference) {
      for (let j = 0; j < data.AdditionalDocumentReference.length; j++) {
        if (data.AdditionalDocumentReference[j]?.DocumentTypeCode?.value === 'File ID') {
          // 備考
          invoice.備考 = data.AdditionalDocumentReference[j].ID.value
        } else if (data.AdditionalDocumentReference[j].DocumentTypeCode.value === 'BOL ID') {
          // 輸送情報
          invoice.輸送情報 = data.AdditionalDocumentReference[j].ID.value
        } else if (data.AdditionalDocumentReference[j].DocumentTypeCode.value === 'Interim Hours') {
          // 暫定時間
          invoice.暫定時間 = data.AdditionalDocumentReference[j].ID.value
        } else if (data.AdditionalDocumentReference[j].DocumentTypeCode.value === 'Clearance Clave') {
          // 通関識別情報
          invoice.通関識別情報 = data.AdditionalDocumentReference[j].ID.value
        } else if (data.AdditionalDocumentReference[j].DocumentTypeCode.value === 'TS Clearance') {
          // Tradeshiftクリアランス
          invoice.Tradeshiftクリアランス = data.AdditionalDocumentReference[j].ID.value
        } else if (data.AdditionalDocumentReference[j].DocumentTypeCode.value === 'BookingNumber') {
          // 予約番号
          invoice.予約番号 = data.AdditionalDocumentReference[j].ID.value
        }
      }
    }

    // 課税日
    if (data.TaxPointDate) {
      invoice.課税日 = data.TaxPointDate?.value
    }

    if (data.AccountingSupplierParty) {
      // DUNSナンバー
      if (data.AccountingSupplierParty.Party?.PhysicalLocation?.ID?.value ?? false) {
        invoice.DUNSナンバー = data.AccountingSupplierParty.Party?.PhysicalLocation?.ID?.value
      }
    }

    // 為替レート
    if (data.TaxExchangeRate) {
      // 為替レート
      if (data.TaxExchangeRate?.CalculationRate?.value ?? false) {
        invoice.為替レート = data.TaxExchangeRate?.CalculationRate?.value
      }

      // 為替レート-通貨
      if (data.TaxExchangeRate?.TargetCurrencyCode?.value ?? false) {
        invoice['為替レート-通貨'] = data.TaxExchangeRate?.TargetCurrencyCode?.value
      }

      // 為替レート-日付
      if (data.TaxExchangeRate?.Date?.value ?? false) {
        invoice['為替レート-日付'] = data.TaxExchangeRate?.Date?.value
      }
    }

    // 為替レート換算後の税金総額
    if (data.TaxTotal) {
      if (data.TaxTotal[0]?.TaxSubtotal[0]?.TransactionCurrencyTaxAmount?.value ?? false) {
        invoice.為替レート換算後の税金総額 = data.TaxTotal[0]?.TaxSubtotal[0]?.TransactionCurrencyTaxAmount?.value
      }
    }

    // 為替レート-Convertd Document Total(incl taxes)
    if (data.UBLExtensions) {
      if (data.UBLExtensions?.UBLExtension[0]?.ExtensionContent?.value ?? false) {
        const dom = new DOMParser().parseFromString(
          data.UBLExtensions?.UBLExtension[0]?.ExtensionContent?.value,
          'text/xml'
        )
        const xmlValue = dom.getElementsByTagName('ts')[0]?.childNodes[0]?.text

        invoice['為替レート-Convertd Document Total(incl taxes)'] = xmlValue
      }
    }

    if (data.Note) {
      if (data.Note[0]?.value) {
        invoice.その他特記事項 = data.Note[0].value
      }
    }

    // 割引の個数（１～３）
    let discountNumberingForTotal = 1
    // 追加料金の個数（１～３）
    let addAmountNumberingForTotal = 1

    if (data.AllowanceCharge) {
      for (let a = 0; a < data.AllowanceCharge?.length; a++) {
        if (data.AllowanceCharge[a]?.ChargeIndicator?.value === false) {
          // 割引
          if (discountNumberingForTotal === 1) {
            // 割引1-項目ID
            invoice['割引1-項目ID'] = '割引'

            // 割引1-内容
            invoice['割引1-内容'] = data.AllowanceCharge[a]?.AllowanceChargeReason?.value

            // 割引1-単位
            if (data.AllowanceCharge[a]?.MultiplierFactorNumeric?.value === 1) {
              invoice['割引1-単位'] = 'JPY'
            } else {
              invoice['割引1-単位'] = '%'

              // 割引1-数量
              invoice['割引1-数量'] = data.AllowanceCharge[a]?.MultiplierFactorNumeric?.value * 100
            }

            if (data.AllowanceCharge[a]?.TaxCategory) {
              const taxName = (data.AllowanceCharge[a]?.TaxCategory[0]?.TaxScheme?.Name?.value)
                .replace('JP ', '')
                .replace('消費税(軽減税率)', '軽減税率')
                .replace(' 10%', '')
                .replace(' 8%', '')
                .replace(' 0%', '')

              // 割引1-税（消費税／軽減税率／不課税／免税／非課税）
              invoice['割引1-税（消費税／軽減税率／不課税／免税／非課税）'] = taxName
            }

            // 割引1-小計（税抜）
            invoice['割引1-小計（税抜）'] = '-' + data.AllowanceCharge[a]?.Amount?.value
          } else if (discountNumberingForTotal === 2) {
            // 割引2-項目ID
            invoice['割引2-項目ID'] = '割引'

            // 割引2-内容
            invoice['割引2-内容'] = data.AllowanceCharge[a]?.AllowanceChargeReason?.value

            // 割引2-単位
            if (data.AllowanceCharge[a]?.MultiplierFactorNumeric?.value === 1) {
              invoice['割引2-単位'] = 'JPY'
            } else {
              invoice['割引2-単位'] = '%'

              // 割引2-数量
              invoice['割引2-数量'] = data.AllowanceCharge[a]?.MultiplierFactorNumeric?.value * 100
            }

            if (data.AllowanceCharge[a]?.TaxCategory) {
              const taxName = (data.AllowanceCharge[a]?.TaxCategory[0]?.TaxScheme?.Name?.value)
                .replace('JP ', '')
                .replace('消費税(軽減税率)', '軽減税率')
                .replace(' 10%', '')
                .replace(' 8%', '')
                .replace(' 0%', '')

              // 割引2-税（消費税／軽減税率／不課税／免税／非課税）
              invoice['割引2-税（消費税／軽減税率／不課税／免税／非課税）'] = taxName
            }

            // 割引2-小計（税抜）
            invoice['割引2-小計（税抜）'] = '-' + data.AllowanceCharge[a]?.Amount?.value
          } else if (discountNumberingForTotal === 3) {
            // 割引3-項目ID
            invoice['割引3-項目ID'] = '割引'

            // 割引3-内容
            invoice['割引3-内容'] = data.AllowanceCharge[a]?.AllowanceChargeReason?.value

            // 割引3-単位
            if (data.AllowanceCharge[a]?.MultiplierFactorNumeric?.value === 1) {
              invoice['割引3-単位'] = 'JPY'
            } else {
              invoice['割引3-単位'] = '%'

              // 割引3-数量
              invoice['割引3-数量'] = data.AllowanceCharge[a]?.MultiplierFactorNumeric?.value * 100
            }

            if (data.AllowanceCharge[a]?.TaxCategory) {
              const taxName = (data.AllowanceCharge[a]?.TaxCategory[0]?.TaxScheme?.Name?.value)
                .replace('JP ', '')
                .replace('消費税(軽減税率)', '軽減税率')
                .replace(' 10%', '')
                .replace(' 8%', '')
                .replace(' 0%', '')

              // 割引3-税（消費税／軽減税率／不課税／免税／非課税）
              invoice['割引3-税（消費税／軽減税率／不課税／免税／非課税）'] = taxName
            }

            // 割引3-小計（税抜）
            invoice['割引3-小計（税抜）'] = '-' + data.AllowanceCharge[a]?.Amount?.value
          } else {
            // 項目ID
            const title = '割引'
            // 内容
            const allowanceChargeReason = data.AllowanceCharge[a]?.AllowanceChargeReason?.value
            // 数量
            let unitMeasure
            // 単位
            let unit
            // 税（消費税／軽減税率／不課税／免税／非課税）
            let taxValue
            // 小計（税抜）
            const amount = '-' + data.AllowanceCharge[a]?.Amount?.value

            // 単位
            if (data.AllowanceCharge[a]?.MultiplierFactorNumeric?.value === 1) {
              unit = 'JPY'
              unitMeasure = ''
            } else {
              unit = '%'
              unitMeasure = data.AllowanceCharge[a]?.MultiplierFactorNumeric?.value * 100
            }

            if (data.AllowanceCharge[a]?.TaxCategory) {
              const taxName = (data.AllowanceCharge[a]?.TaxCategory[0]?.TaxScheme?.Name?.value)
                .replace('JP ', '')
                .replace('消費税(軽減税率)', '軽減税率')
                .replace(' 10%', '')
                .replace(' 8%', '')
                .replace(' 0%', '')

              // 税
              taxValue = taxName
            }

            invoice['割引4以降'] += invoice['割引4以降']
              ? `, {'割引${discountNumberingForTotal}-項目ID:'${title}', '割引${discountNumberingForTotal}-内容':'${allowanceChargeReason}', '割引${discountNumberingForTotal}-数量':'${unitMeasure}', '割引${discountNumberingForTotal}-単位':'${unit}', '割引${discountNumberingForTotal}-税（消費税／軽減税率／不課税／免税／非課税）':'${taxValue}', '割引${discountNumberingForTotal}-小計（税抜）':'${amount}'}`
              : `{{'割引${discountNumberingForTotal}-項目ID:'${title}', '割引${discountNumberingForTotal}-内容':'${allowanceChargeReason}', '割引${discountNumberingForTotal}-数量':'${unitMeasure}', '割引${discountNumberingForTotal}-単位:'${unit}', '割引${discountNumberingForTotal}-税（消費税／軽減税率／不課税／免税／非課税）':'${taxValue}', '割引${discountNumberingForTotal}-小計（税抜）':'${amount}'}`
          }

          discountNumberingForTotal++
        } else {
          // 追加料金
          if (addAmountNumberingForTotal === 1) {
            // 追加料金1-項目ID
            invoice['追加料金1-項目ID'] = '追加料金'

            // 追加料金1-内容
            invoice['追加料金1-内容'] = data.AllowanceCharge[a]?.AllowanceChargeReason?.value

            // 追加料金1-単位
            if (data.AllowanceCharge[a]?.MultiplierFactorNumeric?.value === 1) {
              invoice['追加料金1-単位'] = 'JPY'
            } else {
              invoice['追加料金1-単位'] = '%'

              // 追加料金1-数量
              invoice['追加料金1-数量'] = data.AllowanceCharge[a]?.MultiplierFactorNumeric?.value * 100
            }

            if (data.AllowanceCharge[a]?.TaxCategory) {
              const taxName = (data.AllowanceCharge[a]?.TaxCategory[0]?.TaxScheme?.Name?.value)
                .replace('JP ', '')
                .replace('消費税(軽減税率)', '軽減税率')
                .replace(' 10%', '')
                .replace(' 8%', '')
                .replace(' 0%', '')

              // 追加料金1-税（消費税／軽減税率／不課税／免税／非課税）
              invoice['追加料金1-税（消費税／軽減税率／不課税／免税／非課税）'] = taxName
            }

            // 追加料金1-小計（税抜）
            invoice['追加料金1-小計（税抜）'] = data.AllowanceCharge[a]?.Amount?.value
          } else if (addAmountNumberingForTotal === 2) {
            // 追加料金2-項目ID
            invoice['追加料金2-項目ID'] = '追加料金'

            // 追加料金2-内容
            invoice['追加料金2-内容'] = data.AllowanceCharge[a]?.AllowanceChargeReason?.value

            // 追加料金2-単位
            if (data.AllowanceCharge[a]?.MultiplierFactorNumeric?.value === 1) {
              invoice['追加料金2-単位'] = 'JPY'
            } else {
              invoice['追加料金2-単位'] = '%'

              // 追加料金2-数量
              invoice['追加料金2-数量'] = data.AllowanceCharge[a]?.MultiplierFactorNumeric?.value * 100
            }

            if (data.AllowanceCharge[a]?.TaxCategory) {
              const taxName = (data.AllowanceCharge[a]?.TaxCategory[0]?.TaxScheme?.Name?.value)
                .replace('JP ', '')
                .replace('消費税(軽減税率)', '軽減税率')
                .replace(' 10%', '')
                .replace(' 8%', '')
                .replace(' 0%', '')

              // 追加料金2-税（消費税／軽減税率／不課税／免税／非課税）
              invoice['追加料金2-税（消費税／軽減税率／不課税／免税／非課税）'] = taxName
            }

            // 追加料金2-小計（税抜）
            invoice['追加料金2-小計（税抜）'] = data.AllowanceCharge[a]?.Amount?.value
          } else if (addAmountNumberingForTotal === 3) {
            // 追加料金3-項目ID
            invoice['追加料金3-項目ID'] = '追加料金'

            // 追加料金3-内容
            invoice['追加料金3-内容'] = data.AllowanceCharge[a]?.AllowanceChargeReason?.value

            // 追加料金3-単位
            if (data.AllowanceCharge[a]?.MultiplierFactorNumeric?.value === 1) {
              invoice['追加料金3-単位'] = 'JPY'
            } else {
              invoice['追加料金3-単位'] = '%'

              // 追加料金3-数量
              invoice['追加料金3-数量'] = data.AllowanceCharge[a]?.MultiplierFactorNumeric?.value * 100
            }

            if (data.AllowanceCharge[a]?.TaxCategory) {
              const taxName = (data.AllowanceCharge[a]?.TaxCategory[0]?.TaxScheme?.Name?.value)
                .replace('JP ', '')
                .replace('消費税(軽減税率)', '軽減税率')
                .replace(' 10%', '')
                .replace(' 8%', '')
                .replace(' 0%', '')

              // 追加料金3-税（消費税／軽減税率／不課税／免税／非課税）
              invoice['追加料金3-税（消費税／軽減税率／不課税／免税／非課税）'] = taxName
            }

            // 追加料金3-小計（税抜）
            invoice['追加料金3-小計（税抜）'] = data.AllowanceCharge[a]?.Amount?.value
          } else {
            // 項目ID
            const title = '追加料金'
            // 内容
            const allowanceChargeReason = data.AllowanceCharge[a]?.AllowanceChargeReason?.value
            // 数量
            let unitMeasure
            // 単位
            let unit
            // 税（消費税／軽減税率／不課税／免税／非課税）
            let taxValue
            // 小計（税抜）
            const amount = '-' + data.AllowanceCharge[a]?.Amount?.value

            // 単位
            if (data.AllowanceCharge[a]?.MultiplierFactorNumeric?.value === 1) {
              unit = 'JPY'
              unitMeasure = ''
            } else {
              unit = '%'
              unitMeasure = data.AllowanceCharge[a]?.MultiplierFactorNumeric?.value * 100
            }

            if (data.AllowanceCharge[a]?.TaxCategory) {
              const taxName = (data.AllowanceCharge[a]?.TaxCategory[0]?.TaxScheme?.Name?.value)
                .replace('JP ', '')
                .replace('消費税(軽減税率)', '軽減税率')
                .replace(' 10%', '')
                .replace(' 8%', '')
                .replace(' 0%', '')

              // 税
              taxValue = taxName
            }

            invoice['追加料金4以降'] += invoice['追加料金4以降']
              ? `, {'追加料金${addAmountNumberingForTotal}-項目ID:'${title}', '追加料金${addAmountNumberingForTotal}-内容':'${allowanceChargeReason}', '追加料金${addAmountNumberingForTotal}-数量':'${unitMeasure}', '追加料金${addAmountNumberingForTotal}-単位':'${unit}', '追加料金${addAmountNumberingForTotal}-税（消費税／軽減税率／不課税／免税／非課税）':'${taxValue}', '追加料金${addAmountNumberingForTotal}-小計（税抜）':'${amount}'}`
              : `{{'追加料金${addAmountNumberingForTotal}-項目ID:'${title}', '追加料金${addAmountNumberingForTotal}-内容':'${allowanceChargeReason}', '追加料金${addAmountNumberingForTotal}-数量':'${unitMeasure}', '追加料金${addAmountNumberingForTotal}-単位:'${unit}', '追加料金${addAmountNumberingForTotal}-税（消費税／軽減税率／不課税／免税／非課税）':'${taxValue}', '追加料金${addAmountNumberingForTotal}-小計（税抜）':'${amount}'}`
          }

          addAmountNumberingForTotal++
        }
      }
      invoice['割引4以降'] += invoice['割引4以降'] ? '}' : ''
      invoice['追加料金4以降'] += invoice['追加料金4以降'] ? '}' : ''
    }

    // InvoiceLine
    invoice['明細-項目ID'] = data.InvoiceLine[i].ID.value

    invoice['明細-数量'] = data.InvoiceLine[i].InvoicedQuantity.value
    const unitcode = data.InvoiceLine[i].InvoicedQuantity.unitCode
    unitCodeKeys.map((key) => {
      if (bconCsvUnitDefault[key] === unitcode) {
        invoice['明細-単位'] = key
      }
      return ''
    })
    invoice['明細-小計 (税抜)'] = data.InvoiceLine[i].LineExtensionAmount?.value

    if (data.InvoiceLine[i].OrderLineReference) {
      // 明細-注文書番号
      invoice['明細-注文書番号'] = data.InvoiceLine[i].OrderLineReference[0]?.OrderReference?.ID?.value
      // 明細-注文明細番号
      invoice['明細-注文明細番号'] = data.InvoiceLine[i].OrderLineReference[0]?.LineID?.value
    }

    if (data.InvoiceLine[i]?.TaxTotal) {
      const taxName = (data.InvoiceLine[i].TaxTotal[0]?.TaxSubtotal[0]?.TaxCategory?.TaxScheme?.Name?.value)
        .replace('JP ', '')
        .replace('消費税(軽減税率)', '軽減税率')
        .replace(' 10%', '')
        .replace(' 8%', '')
        .replace(' 0%', '')

      // 固定税
      if (taxName === '固定税') {
        if (data.TaxTotal) {
          invoice['固定税-項目ID'] = '税額(文書合計)'
          invoice['固定税-税'] = data.TaxTotal.TaxAmount?.value
        }
      }

      // 明細-税（消費税／軽減税率／不課税／免税／非課税）
      invoice['明細-税（消費税／軽減税率／不課税／免税／非課税）'] = taxName

      // 明細-非課税/免税の理由
      invoice['明細-非課税/免税の理由'] =
        data.InvoiceLine[i].TaxTotal[0]?.TaxSubtotal[0]?.TaxCategory?.TaxExemptionReason?.value
    }

    // 割引の個数（１～３）
    let discountNumbering = 1
    // 追加料金の個数（１～３）
    let addAmountNumbering = 1

    if (data.InvoiceLine[i]?.AllowanceCharge) {
      for (let m = 0; m < data.InvoiceLine[i]?.AllowanceCharge?.length; m++) {
        if (data.InvoiceLine[i]?.AllowanceCharge[m]?.ChargeIndicator?.value === false) {
          // 割引
          if (discountNumbering === 1) {
            // 明細-割引1-内容
            invoice['明細-割引1-内容'] = data.InvoiceLine[i]?.AllowanceCharge[m]?.AllowanceChargeReason?.value

            // 明細-割引1-単位
            if (data.InvoiceLine[i]?.AllowanceCharge[m]?.MultiplierFactorNumeric?.value === 1) {
              invoice['明細-割引1-単位'] = 'JPY'
            } else {
              invoice['明細-割引1-単位'] = '%'

              // 明細-割引1-値
              invoice['明細-割引1-値'] = data.InvoiceLine[i]?.AllowanceCharge[m]?.MultiplierFactorNumeric?.value * 100
            }

            // 明細-割引1-単価
            invoice['明細-割引1-単価'] = '-' + data.InvoiceLine[i]?.AllowanceCharge[m]?.Amount?.value
          } else if (discountNumbering === 2) {
            // 明細-割引2-内容
            invoice['明細-割引2-内容'] = data.InvoiceLine[i]?.AllowanceCharge[m]?.AllowanceChargeReason?.value

            // 明細-割引2-単位
            if (data.InvoiceLine[i]?.AllowanceCharge[m]?.MultiplierFactorNumeric?.value === 1) {
              invoice['明細-割引2-単位'] = 'JPY'
            } else {
              invoice['明細-割引2-単位'] = '%'

              // 明細-割引2-値
              invoice['明細-割引2-値'] = data.InvoiceLine[i]?.AllowanceCharge[m]?.MultiplierFactorNumeric?.value * 100
            }

            // 明細-割引2-単価
            invoice['明細-割引2-単価'] = '-' + data.InvoiceLine[i]?.AllowanceCharge[m]?.Amount?.value
          } else if (discountNumbering === 3) {
            // 明細-割引3-内容
            invoice['明細-割引3-内容'] = data.InvoiceLine[i]?.AllowanceCharge[m]?.AllowanceChargeReason?.value

            // 明細-割引3-単位
            if (data.InvoiceLine[i]?.AllowanceCharge[m]?.MultiplierFactorNumeric?.value === 1) {
              invoice['明細-割引3-単位'] = 'JPY'
            } else {
              invoice['明細-割引3-単位'] = '%'

              // 明細-割引3-値
              invoice['明細-割引3-値'] = data.InvoiceLine[i]?.AllowanceCharge[m]?.MultiplierFactorNumeric?.value * 100
            }

            // 明細-割引3-単価
            invoice['明細-割引3-単価'] = '-' + data.InvoiceLine[i]?.AllowanceCharge[m]?.Amount?.value
          } else {
            // 内容
            const allowanceChargeReason = data.InvoiceLine[i]?.AllowanceCharge[m]?.AllowanceChargeReason?.value
            // 単価
            let unit
            let value = ''

            if (data.InvoiceLine[i]?.AllowanceCharge[m]?.MultiplierFactorNumeric?.value === 1) {
              unit = 'JPY'
            } else {
              unit = '%'
              value = data.InvoiceLine[i]?.AllowanceCharge[m]?.MultiplierFactorNumeric?.value * 100
            }

            const amount = '-' + data.InvoiceLine[i]?.AllowanceCharge[m]?.Amount?.value

            invoice['明細-割引4以降'] += invoice['明細-割引4以降']
              ? `, {'明細-割引${discountNumbering}-内容':'${allowanceChargeReason}', '明細-割引${discountNumbering}-値':'${value}', '明細-割引${discountNumbering}-単位':'${unit}', '明細-割引${discountNumbering}-単価':'${amount}'}`
              : `{{'明細-割引${discountNumbering}-内容':'${allowanceChargeReason}', '明細-割引${discountNumbering}-値':'${value}', '明細-割引${discountNumbering}-単位':'${unit}', '明細-割引${discountNumbering}-単価':'${amount}'}`
          }

          discountNumbering++
        } else {
          // 追加料金
          if (addAmountNumbering === 1) {
            // 明細-追加料金1-内容
            invoice['明細-追加料金1-内容'] = data.InvoiceLine[i]?.AllowanceCharge[m]?.AllowanceChargeReason?.value

            // 明細-追加料金1-単位
            if (data.InvoiceLine[i]?.AllowanceCharge[m]?.MultiplierFactorNumeric?.value === 1) {
              invoice['明細-追加料金1-単位'] = 'JPY'
            } else {
              invoice['明細-追加料金1-単位'] = '%'

              // 明細-追加料金1-値
              invoice['明細-追加料金1-値'] =
                data.InvoiceLine[i]?.AllowanceCharge[m]?.MultiplierFactorNumeric?.value * 100
            }

            // 明細-追加料金1-単価
            invoice['明細-追加料金1-単価'] = data.InvoiceLine[i]?.AllowanceCharge[m]?.Amount?.value
          } else if (addAmountNumbering === 2) {
            // 明細-追加料金2-内容
            invoice['明細-追加料金2-内容'] = data.InvoiceLine[i]?.AllowanceCharge[m]?.AllowanceChargeReason?.value

            // 明細-追加料金2-単位
            if (data.InvoiceLine[i]?.AllowanceCharge[m]?.MultiplierFactorNumeric?.value === 1) {
              invoice['明細-追加料金2-単位'] = 'JPY'
            } else {
              invoice['明細-追加料金2-単位'] = '%'

              // 明細-追加料金2-値
              invoice['明細-追加料金2-値'] =
                data.InvoiceLine[i]?.AllowanceCharge[m]?.MultiplierFactorNumeric?.value * 100
            }

            // 明細-追加料金2-単価
            invoice['明細-追加料金2-単価'] = data.InvoiceLine[i]?.AllowanceCharge[m]?.Amount?.value
          } else if (addAmountNumbering === 3) {
            // 明細-追加料金3-内容
            invoice['明細-追加料金3-内容'] = data.InvoiceLine[i]?.AllowanceCharge[m]?.AllowanceChargeReason?.value

            // 明細-追加料金3-単位
            if (data.InvoiceLine[i]?.AllowanceCharge[m]?.MultiplierFactorNumeric?.value === 1) {
              invoice['明細-追加料金3-単位'] = 'JPY'
            } else {
              invoice['明細-追加料金3-単位'] = '%'

              // 明細-追加料金3-値
              invoice['明細-追加料金3-値'] =
                data.InvoiceLine[i]?.AllowanceCharge[m]?.MultiplierFactorNumeric?.value * 100
            }

            // 明細-追加料金3-単価
            invoice['明細-追加料金3-単価'] = data.InvoiceLine[i]?.AllowanceCharge[m]?.Amount?.value
          } else {
            // 内容
            const allowanceChargeReason = data.InvoiceLine[i]?.AllowanceCharge[m]?.AllowanceChargeReason?.value
            // 単価
            let unit
            let value = ''

            if (data.InvoiceLine[i]?.AllowanceCharge[m]?.MultiplierFactorNumeric?.value === 1) {
              unit = 'JPY'
            } else {
              unit = '%'
              value = data.InvoiceLine[i]?.AllowanceCharge[m]?.MultiplierFactorNumeric?.value * 100
            }

            const amount = data.InvoiceLine[i]?.AllowanceCharge[m]?.Amount?.value

            invoice['明細-追加料金4以降'] += invoice['明細-追加料金4以降']
              ? `, {'明細-追加料金${addAmountNumbering}-内容':'${allowanceChargeReason}', '明細-追加料金${addAmountNumbering}-値':'${value}', '明細-追加料金${addAmountNumbering}-単位':'${unit}', '明細-追加料金${addAmountNumbering}-単価':'${amount}'}`
              : `{{'明細-追加料金${addAmountNumbering}-内容':'${allowanceChargeReason}', '明細-追加料金${addAmountNumbering}-値':'${value}', '明細-追加料金${addAmountNumbering}-単位':'${unit}', '明細-追加料金${addAmountNumbering}-単価':'${amount}'}`
          }

          addAmountNumbering++
        }
      }
      invoice['明細-割引4以降'] += invoice['明細-割引4以降'] ? '}' : ''
      invoice['明細-追加料金4以降'] += invoice['明細-追加料金4以降'] ? '}' : ''
    }

    if (data.InvoiceLine[i]?.DocumentReference) {
      for (let k = 0; k < data.InvoiceLine[i]?.DocumentReference?.length; k++) {
        if (data.InvoiceLine[i]?.DocumentReference[k]?.DocumentTypeCode?.value === 'File ID') {
          // 明細-備考
          invoice['明細-備考'] = data.InvoiceLine[i].DocumentReference[k].ID.value
        } else if (data.InvoiceLine[i]?.DocumentReference[k]?.DocumentTypeCode?.value === 'BOL ID') {
          // 明細-輸送情報
          invoice['明細-輸送情報'] = data.InvoiceLine[i].DocumentReference[k].ID.value
        } else if (data.InvoiceLine[i]?.DocumentReference[k]?.DocumentTypeCode?.value === 'LinePrice') {
          // 明細-単価
          invoice['明細-単価'] = data.InvoiceLine[i].DocumentReference[k].ID.value
        }
      }
    }

    // 明細-単価（割引や追加料金などがない場合）
    if (invoice['明細-単価'] === '') {
      if (data.InvoiceLine[i]?.Price) {
        invoice['明細-単価'] = data.InvoiceLine[i].Price.PriceAmount?.value
      }
    }

    if (data.InvoiceLine[i]?.Item) {
      if (data.InvoiceLine[i]?.Item?.Description) {
        // 明細-内容
        invoice['明細-内容'] = data.InvoiceLine[i].Item.Description[0].value
      }

      if (data.InvoiceLine[i]?.Item?.ModelName) {
        // 明細-詳細
        invoice['明細-詳細'] = data.InvoiceLine[i].Item.ModelName[0].value
      }

      if (data.InvoiceLine[i]?.Item?.BuyersItemIdentification) {
        // 明細-発注者品番
        invoice['明細-発注者品番'] = data.InvoiceLine[i].Item.BuyersItemIdentification?.ID?.value
      }

      if (data.InvoiceLine[i]?.Item?.StandardItemIdentification) {
        // 明細-EAN/GTIN
        invoice['明細-EAN/GTIN'] = data.InvoiceLine[i].Item.StandardItemIdentification?.ID?.value
      }

      // HSN/SAC
      if (data.InvoiceLine[i]?.Item?.AdditionalItemIdentification) {
        // 明細-HSN/SAC区分
        invoice['明細-HSN/SAC区分'] = data.InvoiceLine[i].Item.AdditionalItemIdentification[0]?.ID?.schemeID
        // 明細-HSN/SACの値
        invoice['明細-HSN/SACの値'] = data.InvoiceLine[i].Item.AdditionalItemIdentification[0]?.ID?.value
      }

      if (data.InvoiceLine[i]?.Item?.OriginCountry) {
        // 明細-原産国
        invoice['明細-原産国'] = data.InvoiceLine[i].Item.OriginCountry?.Name?.value
      }

      if (data.InvoiceLine[i]?.Item?.CommodityClassification) {
        // 明細-商品分類コード: ECCN
        invoice['明細-商品分類コード: ECCN'] =
          data.InvoiceLine[i].Item.CommodityClassification[0]?.ItemClassificationCode?.value
      }

      if (data.InvoiceLine[i]?.Item?.ManufacturerParty) {
        // 明細-メーカー名
        invoice['明細-メーカー名'] = data.InvoiceLine[i].Item.ManufacturerParty[0]?.PartyName[0]?.Name?.value
      }

      if (data.InvoiceLine[i]?.Item?.ItemInstance) {
        // 明細-シリアルナンバー
        invoice['明細-シリアルナンバー'] = data.InvoiceLine[i].Item.ItemInstance[0]?.SerialID?.value
      }
    }

    if (data.InvoiceLine[i]?.DeliveryTerms) {
      // 明細-納期
      invoice['明細-納期'] = data.InvoiceLine[i].DeliveryTerms.ID?.value
    }

    if (data.InvoiceLine[i]?.Delivery) {
      if (data.InvoiceLine[i]?.Delivery[0].DeliveryLocation) {
        if (data.InvoiceLine[i]?.Delivery[0].DeliveryLocation.ID) {
          // 明細-ロケーションID
          invoice['明細-ロケーションID'] = data.InvoiceLine[i]?.Delivery[0].DeliveryLocation.ID.value
        }

        if (data.InvoiceLine[i]?.Delivery[0].DeliveryLocation.Address) {
          // 明細-配送先-私書箱
          invoice['明細-配送先-私書箱'] = data.InvoiceLine[i]?.Delivery[0].DeliveryLocation.Address.Postbox?.value

          // 明細-配送先-市区町村番地
          invoice['明細-配送先-市区町村番地'] =
            data.InvoiceLine[i]?.Delivery[0].DeliveryLocation.Address.StreetName?.value

          // 明細-配送先-マンション名
          invoice['明細-配送先-マンション名'] =
            data.InvoiceLine[i]?.Delivery[0].DeliveryLocation.Address.AdditionalStreetName?.value

          // 明細-配送先-都道府県
          invoice['明細-配送先-都道府県'] = data.InvoiceLine[i]?.Delivery[0].DeliveryLocation.Address.CityName?.value

          // 明細-配送先-郵便番号
          invoice['明細-配送先-郵便番号'] = data.InvoiceLine[i]?.Delivery[0].DeliveryLocation.Address.PostalZone?.value

          // 明細-配送先-国
          invoice['明細-配送先-国'] =
            data.InvoiceLine[i]?.Delivery[0].DeliveryLocation.Address.Country?.IdentificationCode?.value
        }
      }

      if (data.InvoiceLine[i]?.Delivery[0].TrackingID) {
        // 明細-貨物注文番号
        invoice['明細-貨物注文番号'] = data.InvoiceLine[i]?.Delivery[0].TrackingID.value
      }

      if (data.InvoiceLine[i]?.Delivery[0].ActualDeliveryDate) {
        // 明細-納品日
        invoice['明細-納品日'] = data.InvoiceLine[i]?.Delivery[0].ActualDeliveryDate.value
      }
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
