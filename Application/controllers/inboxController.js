const apiManager = require('./apiManager')
const db = require('../models')
const AccountCode = db.AccountCode
const SubAccountCode = db.SubAccountCode
const JournalizeInvoice = db.JournalizeInvoice
const constantsDefine = require('../constants')
const logger = require('../lib/logger')
const { v4: uuidV4 } = require('uuid')
const validate = require('../lib/validate')
const accountCodeController = require('./accountCodeController')

const getInbox = async function (accessToken, refreshToken, pageId, tenantId) {
  const qs = require('qs')
  const processStatus = {
    PAID_CONFIRMED: 0, // 入金確認済み
    PAID_UNCONFIRMED: 1, // 送金済み
    ACCEPTED: 2, // 受理済み
    DELIVERED: 3 // 受信済み
  }
  const findDocuments = '/documents'
  const withouttag = ['archived', 'AP_DOCUMENT_Draft', 'PARTNER_DOCUMENT_DRAFT', 'tsgo-document']
  const state = ['DELIVERED', 'ACCEPTED', 'PAID_UNCONFIRMED', 'PAID_CONFIRMED']
  const type = 'invoice'
  const _onlyIndex = true
  const ascending = false
  const onlydeleted = false
  const onlydrafts = false
  const sentTo = tenantId
  const stag = ['sales', 'purchases', 'draft']
  const onePagePerItemCount = 20 // １ページあたり表示する項目の数
  const page = pageId - 1 // 現在ページ
  const query = qs
    .stringify({
      withouttag: withouttag,
      state: state,
      type: type,
      _onlyIndex: _onlyIndex,
      ascending: ascending,
      onlydeleted: onlydeleted,
      onlydrafts: onlydrafts,
      sentTo: sentTo,
      stag: stag,
      limit: onePagePerItemCount,
      page: page
    })
    .replace(/%26/g, '&')
    .replace(/%3D/g, '=')
    .replace(/%5B0%5D/g, '')
    .replace(/%5B1%5D/g, '')
    .replace(/%5B2%5D/g, '')
    .replace(/%5B3%5D/g, '')

  const documents = await apiManager.accessTradeshift(accessToken, refreshToken, 'get', `${findDocuments}?${query}`)

  // アクセストークンの有効期限が終わるの場合
  if (documents.Document === undefined) {
    return {
      previous: 0,
      next: 1,
      list: []
    }
  }

  // 文書をリスト化する
  const documentList = documents.Document.map((item, idx) => {
    const ammount = function () {
      if (item.ItemInfos[1] === undefined) return '-'
      return Math.floor(item.ItemInfos[1].value).toLocaleString('ja-JP')
    }

    return {
      no: idx + 1 + page * onePagePerItemCount,
      invoiceNo: item.ID,
      status: processStatus[`${item.UnifiedState}`] ?? '-',
      currency: item.ItemInfos[0].value ?? '-',
      ammount: ammount(),
      sentTo: item.SenderCompanyName ?? '-',
      sentBy: item.ReceiverCompanyName ?? '-',
      updated: item.LastEdit !== undefined ? item.LastEdit.substring(0, 10) : '-',
      expire: item.DueDate ?? '-',
      documentId: item.DocumentId
    }
  })

  const numPage = documents.numPages
  const currPage = documents.pageId

  // 更新日で整列(更新日がない場合、期限日で整列)
  const updated = documentList.sort((next, prev) => {
    let nextDate = null
    let prevDate = null
    if (next.udated === '-' || prev.updated === '-') {
      nextDate = new Date(next.expire)
      prevDate = new Date(prev.expire)
    }

    return nextDate > prevDate ? 1 : nextDate < prevDate ? -1 : 0
  })

  // 結果返却
  return {
    list: updated,
    numPages: numPage,
    currPage: currPage + 1
  }
}

const getInvoiceDetail = async function (accessTk, refreshTk, invoiceId, contractId) {
  const InvoiceDetail = require('../lib/invoiceDetail')
  const invoice = await apiManager.accessTradeshift(accessTk, refreshTk, 'get', `/documents/${invoiceId}`)
  const journalizeInvoice = await JournalizeInvoice.findAll({
    where: {
      invoiceId: invoiceId,
      contractId: contractId
    }
  })

  const displayInvoice = new InvoiceDetail(invoice, journalizeInvoice)

  return displayInvoice
}

const insert = async (contract, values) => {
  // journalize_invoiceテーブル
  // journalId(PK)
  // contractId(FK)
  // invoiceId -請求書番号（UUID)
  // lineNo-明細番号
  // lineId-項目ID
  // accountCode-勘定科目コード
  // subAccountCode-補助科目コード
  // installmentAmount-分割金額

  const contractId = contract.contractId

  try {
    // inovoiceIdチェック
    if (!validate.isUUID(values.invoiceId)) return -1

    // 勘定科目コード有無確認
    const accountCodeSearchResult = await AccountCode.findOne({
      where: {
        contractId: contractId,
        accountCode: values.accountCode
      }
    })
    if (accountCodeSearchResult === null) {
      return -2
    }

    // 補助科目勘コード有無確認
    if (values.subAccountCode !== '') {
      const accountCodeId = accountCodeSearchResult.accountCodeId
      const subAccountCodeSearch = await SubAccountCode.findOne({
        where: {
          subjectCode: values.subAccountCode,
          accountCodeId: accountCodeId
        }
      })
      if (subAccountCodeSearch === null) {
        return -3
      }
    }

    // 問題ない場合DBに保存する。
    const resultToInsertJournalizeInvoice = await JournalizeInvoice.create({
      ...values,
      journalId: uuidV4(),
      contractId
    })

    // DB保存失敗したらモデルAccountCodeインスタンスではない
    if (resultToInsertJournalizeInvoice instanceof JournalizeInvoice) {
      return 0
    } else {
      return -1
    }
  } catch (error) {
    // DBエラー発生したら処理
    logger.error({ contractId: contractId, stack: error.stack, status: 0 })
    return error
  }
}

const checkDataForJournalizeInvoice = async (contract, invoiceId) => {
  const contractId = contract.contractId

  try {
    const journalizeInvoice = await JournalizeInvoice.findAll({
      where: {
        invoiceId: invoiceId,
        contractId: contractId
      }
    })

    // データがない場合、新規登録と想定する。
    if (journalizeInvoice.length === 0) return 0

    // データがある場合
    return journalizeInvoice
  } catch (error) {
    logger.error(error)
    return -1
  }
}

const getCode = async (contractId, accountCode, accountCodeName, subAccountCode, subAccountCodeName) => {
  try {
    const result = await accountCodeController.searchAccountCode(contractId, accountCode, accountCodeName)
    console.log('result====', result)
    // 検索結果オブジェクトに作成して返す
    // return {
    //   accountCode: result.accountCode,
    //   accountCodeName: result.accountCodeName,
    //   subAccountCode: '',
    //   subAccountCodeName: ''
    // }
    return result
  } catch (error) {
    logger.error({
      contractId: contractId,
      accountCode: accountCode,
      subAccountCode: subAccountCode,
      stack: error.stack,
      status: 0
    })
    return error
  }
}

module.exports = {
  getInbox: getInbox,
  getInvoiceDetail: getInvoiceDetail,
  insert: insert,
  checkDataForJournalizeInvoice: checkDataForJournalizeInvoice,
  getCode: getCode
}
