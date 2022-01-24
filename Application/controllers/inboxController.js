const apiManager = require('./apiManager')
const db = require('../models')
const JournalizeInvoice = db.JournalizeInvoice
const AccountCode = db.AccountCode
const SubAccountCode = db.SubAccountCode
const Op = db.Sequelize.Op
const logger = require('../lib/logger')

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
  console.log(JournalizeInvoice)
  const journalizeInvoice = await JournalizeInvoice.findAll({
    where: {
      invoiceId: invoiceId,
      contractId: contractId
    }
  })

  const displayInvoice = new InvoiceDetail(invoice, journalizeInvoice)

  return displayInvoice
}

const getCode = async (contractId, accountCode, accountCodeName, subAccountCode, subAccountCodeName) => {
  const whereIsAccountCode = { contractId: contractId }
  const whereIsSubAccountCode = {}

  if (accountCode.length !== 0) {
    whereIsAccountCode.accountCode = {
      [Op.like]: `%${accountCode}%`
    }
  }
  if (accountCodeName.length !== 0) {
    whereIsAccountCode.accountCodeName = {
      [Op.like]: `%${accountCodeName}%`
    }
  }
  if (subAccountCode.length !== 0) {
    whereIsSubAccountCode.subjectCode = {
      [Op.like]: `%${subAccountCode}%`
    }
  }
  if (subAccountCodeName.length !== 0) {
    whereIsSubAccountCode.subjectName = {
      [Op.like]: `%${subAccountCodeName}%`
    }
  }

  try {
    // 契約番号と補助科目IDでデータを取得（OUTER JOIN）
    const targetAccountCode = await AccountCode.findAll({
      where: {
        ...whereIsAccountCode
      }
    })
    const targetAccountCodeSubAccountCodeJoin = await AccountCode.findAll({
      raw: true,
      include: [
        {
          model: SubAccountCode,
          attributes: ['subAccountCodeId', 'accountCodeId', 'subjectCode', 'subjectName'],
          where: {
            ...whereIsSubAccountCode
          }
        }
      ],
      where: {
        ...whereIsAccountCode
      }
    })

    const result = targetAccountCode.concat(targetAccountCodeSubAccountCodeJoin)
    result.sort((a, b) => {
      if (a.accountCode > b.accountCode) return 1
      else if (a.accountCode < b.accountCode) return -1
      else {
        if (a['SubAccountCodes.subjectCode'] > b['SubAccountCodes.subjectCode']) return 1
        else if (a['SubAccountCodes.subjectCode'] < b['SubAccountCodes.subjectCode']) return -1
        else return 0
      }
    })
    // 検索結果出力
    return result
  } catch (error) {
    logger.error({ contractId: contractId, stack: error.stack, status: 0 })
    return error
  }
}
module.exports = {
  getInbox: getInbox,
  getInvoiceDetail: getInvoiceDetail,
  getCode: getCode
}
