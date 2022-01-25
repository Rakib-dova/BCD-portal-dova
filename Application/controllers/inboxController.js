const apiManager = require('./apiManager')
const db = require('../models')
const AccountCode = db.AccountCode
const SubAccountCode = db.SubAccountCode
const JournalizeInvoice = db.JournalizeInvoice
const logger = require('../lib/logger')
const Op = db.Sequelize.Op

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
    },
    order: [
      ['lineNo', 'ASC'],
      ['journalNo', 'ASC']
    ]
  })

  const displayInvoice = new InvoiceDetail(invoice, journalizeInvoice)

  return displayInvoice
}

const getCode = async (contractId, accountCode, accountCodeName, subAccountCode, subAccountCodeName) => {
  const whereIsAccountCode = { contractId: contractId }
  const whereIsSubAccountCode = {}

  accountCode = accountCode ?? ''
  accountCodeName = accountCodeName ?? ''
  subAccountCode = subAccountCode ?? ''
  subAccountCodeName = subAccountCodeName ?? ''

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

// 仕訳情報設定（登録、変更、削除）
const insertAndUpdateJournalizeInvoice = async (contractId, invoiceId, data) => {
  // 明細ID取得
  let lines = []
  if (data.lineId instanceof Array === true) {
    lines = data.lineNo
  } else {
    lines.push(data.lineNo)
  }

  let lineId = []
  if (data.lineNo instanceof Array === true) {
    lineId = data.lineId
  } else {
    lineId.push(data.lineId)
  }

  delete data.lineNo
  const lineJournals = []
  let accountLines = 1
  const result = {
    status: 0
  }

  // 明細の仕訳設定情報を配列に作成
  try {
    lines.forEach((idx) => {
      lineJournals.push([])
      while (accountLines < 11) {
        if (
          data[`lineNo${idx}_lineAccountCode${accountLines}_accountCode`] !== undefined &&
          data[`lineNo${idx}_lineAccountCode${accountLines}_subAccountCode`] !== undefined &&
          data[`lineNo${idx}_lineAccountCode${accountLines}_input_amount`] !== undefined &&
          data[`lineNo${idx}_lineAccountCode${accountLines}_accountCode`].length !== 0 &&
          data[`lineNo${idx}_lineAccountCode${accountLines}_input_amount`].length !== 0
        ) {
          lineJournals[idx - 1].push({
            data: {
              invoiceId: invoiceId,
              contractId: contractId,
              lineNo: ~~idx,
              lineId: lineId[~~idx - 1],
              journalNo: `lineAccountCode${accountLines}`,
              accountCode: data[`lineNo${idx}_lineAccountCode${accountLines}_accountCode`],
              subAccountCode: data[`lineNo${idx}_lineAccountCode${accountLines}_subAccountCode`],
              installmentAmount: ~~data[`lineNo${idx}_lineAccountCode${accountLines}_input_amount`].replace(/,/g, '')
            }
          })
        } else {
          lineJournals[idx - 1].push({
            data: null
          })
        }
        accountLines++
      }
      accountLines = 1
    })

    console.log(lineJournals)
    // DBから仕訳情報設定確認
    const resultSearchJournals = await JournalizeInvoice.findAll({
      where: {
        contractId: contractId,
        invoiceId: invoiceId
      },
      order: [
        ['lineNo', 'ASC'],
        ['lineId', 'ASC']
      ]
    })

    // 登録前、勘定科目コード検証
    let checkAccountCodeF = false
    for (let lines = 0; lines < lineJournals.length; lines++) {
      for (let idx = 0; idx < 10; idx++) {
        const item = lineJournals[lines][idx]
        if (lineJournals[lines][idx].data !== null) {
          result.accountCode = item.data.accountCode
          result.lineId = item.data.lineId
          const accInstance = await AccountCode.findOne({
            where: {
              contractId: contractId,
              accountCode: item.data.accountCode
            }
          })
          if (accInstance instanceof AccountCode === false) checkAccountCodeF = true
        }
      }
    }
    if (checkAccountCodeF) {
      result.status = -1
      return result
    }

    // 登録前、補助科目コード検証
    let checkSubAccountF = false
    for (let lines = 0; lines < lineJournals.length; lines++) {
      for (let idx = 0; idx < 10; idx++) {
        const item = lineJournals[lines][idx]
        if (item.data === null) continue
        if (item.data.subAccountCode.length === 0) continue
        let checkSubAccount = null
        if (item.data.accountCode.length !== 0 && item.data.subAccountCode.length !== 0) {
          result.lineId = item.data.lineId
          result.subAccountCode = item.data.subAccountCode
          delete result.accountCode
          checkSubAccount = await AccountCode.findAll({
            raw: true,
            include: [
              {
                model: SubAccountCode,
                attributes: ['subAccountCodeId', 'accountCodeId', 'subjectCode', 'subjectName'],
                where: {
                  subjectCode: item.data.subAccountCode
                }
              }
            ],
            where: {
              contractId: contractId,
              accountCode: item.data.accountCode
            }
          })
        }
        if (checkSubAccount.length === 0) checkSubAccountF = true
      }
    }
    if (checkSubAccountF) {
      result.status = -2
      return result
    }

    // DBに保存データがない場合
    if (resultSearchJournals.length === 0) {
      lineJournals.forEach(async (accountLines) => {
        accountLines.forEach(async (item) => {
          if (item.data === null) return null
          const savedJournalItem = JournalizeInvoice.build({
            ...item.data
          })
          await savedJournalItem.save()
        })
      })
      return result
    }

    // DBにデータが保存している場合
    for (let idx = 0; idx < lines.length; idx++) {
      for (let journalNo = 0; journalNo < 10; journalNo++) {
        const target = lineJournals[idx][journalNo]
        if (target.data !== null) {
          resultSearchJournals.forEach((item) => {
            if (~~target.data.lineNo === ~~item.lineNo && target.data.journalNo === item.journalNo) {
              target.dbInstance = item
              item.set({
                ...target.data
              })
            }
          })
          if (target.dbInstance === undefined) {
            target.dbInstance = JournalizeInvoice.build({
              ...target.data
            })
          }
        } else {
          resultSearchJournals.forEach((item) => {
            if (~~item.lineNo === idx + 1 && item.journalNo === `lineAccountCode${journalNo + 1}`) {
              target.dbInstance = item
            }
          })
        }
      }
    }
    // 変更内容DBに保存
    lineJournals.forEach(async (accountLines) => {
      accountLines.forEach(async (item) => {
        if (item.data !== null && item.dbInstance instanceof JournalizeInvoice) {
          await item.dbInstance.save()
        } else if (item.data == null && item.dbInstance instanceof JournalizeInvoice) {
          await item.dbInstance.destroy()
        }
      })
    })
    return result
  } catch (error) {
    logger.error({ contractId: contractId, stack: error.stack, status: 0 })
    return { error }
  }
}

module.exports = {
  getInbox: getInbox,
  getInvoiceDetail: getInvoiceDetail,
  getCode: getCode,
  insertAndUpdateJournalizeInvoice: insertAndUpdateJournalizeInvoice
}
