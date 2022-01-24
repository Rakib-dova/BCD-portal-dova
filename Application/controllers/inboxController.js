const apiManager = require('./apiManager')
const db = require('../models')
const AccountCode = db.AccountCode
const SubAccountCode = db.SubAccountCode
const JournalizeInvoice = db.JournalizeInvoice
const logger = require('../lib/logger')
const { v4: uuidV4 } = require('uuid')
const validate = require('../lib/validate')
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
      ['lineId', 'ASC']
    ]
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

const insertAndUpdateJournalizeInvoice = async (contractId, invoiceId, data) => {
  const lines = data.lineId
  delete data.lineId
  const lineJournals = []
  let accountLines = 1
  const result = {
    status: 0
  }
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
              lineId: `lineAccountCode${accountLines}`,
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
    await lineJournals.forEach(async (accountLines) => {
      await accountLines.forEach(async (item) => {
        if (item.data !== null) {
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
      })
    })
    if (checkAccountCodeF) {
      result.status = -2
      return result
    }

    // 登録前、補助科目コード検証
    let checkSubAccountF = false
    await lineJournals.forEach(async (accountLines) => {
      await accountLines.forEach(async (item) => {
        if (item.data === null) return
        if (item.data.accountCode.length !== 0 && item.data.subAccountCode.length !== 0) {
          result.lineId = item.data.lineId
          result.subAccountCode = item.data.subAccountCode
          delete result.accountCode
          if ((await getCode(item.data.contractId, item.data.accountCode, item.data.subAccountCode).length) === 0) {
            checkSubAccountF = true
          }
        }
      })
    })
    if (checkSubAccountF) {
      result.status = -3
    }

    // DBに保存データがない場合
    if (resultSearchJournals.length === 0) {
      lineJournals.forEach(async (accountLines) => {
        accountLines.forEach(async (item) => {
          if (item === null) return null
          const savedJournalItem = JournalizeInvoice.build({
            ...item.data
          })
          await savedJournalItem.save()
        })
      })
    }

    // DBにデータが保存している場合
    for (let idx = 0; idx < lines.length; idx++) {
      for (let lineId = 0; lineId < 10; lineId++) {
        const target = lineJournals[idx][lineId]
        if (target.data !== null) {
          resultSearchJournals.forEach((item) => {
            if (~~target.data.lineNo === ~~item.lineNo && target.data.lineId === item.lineId) {
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
            if (item.lineNo === idx + 1 && item.lineId === `lineAccountCode${lineId + 1}`) {
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
  insert: insert,
  getCode: getCode,
  insertAndUpdateJournalizeInvoice: insertAndUpdateJournalizeInvoice
}
