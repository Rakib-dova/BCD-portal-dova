'use stric'
const apiManager = require('./apiManager')
const db = require('../models')
const logger = require('../lib/logger')
const JournalizeInvoice = db.JournalizeInvoice

// 複数の請求書を1つのCSVファイルにまとめる関数
const createInvoiceDataForDownload = async (accessToken, refreshToken, documents, contractId) => {
  const dataToJson = require('../routes/journalDownload').dataToJson
  const jsonToCsv = require('../routes/journalDownload').jsonToCsv
  const invoices = []

  // 検索した複数の請求書の文書データを取得
  for (let idx = 0; idx < documents.length; idx++) {
    const invoice = await apiManager.accessTradeshift(
      accessToken,
      refreshToken,
      'get',
      `/documents/${documents[idx].DocumentId}`
    )

    try {
      const journalizeInvoice = await JournalizeInvoice.findAll({
        where: {
          invoiceId: documents[idx].DocumentId,
          contractId: contractId
        },
        order: [
          ['lineNo', 'ASC'],
          ['journalNo', 'ASC']
        ]
      })

      if (journalizeInvoice.length !== 0) {
        journalizeInvoice.sort((next, prev) => {
          const nextJournalNo = next.journalNo.split('lineAccountCode')[1]
          const prevJournalNo = prev.journalNo.split('lineAccountCode')[1]

          return nextJournalNo - prevJournalNo
        })

        // エラーを確認する
        if (invoice instanceof Error) {
          return invoice
        } else {
          if (journalizeInvoice.length !== 0) invoices.push({ invoice, journalizeInvoice })
        }
      }
    } catch (error) {
      logger.error({ DocumentId: documents[idx].DocumentId, stack: error.stack, status: 0 })
      return error
    }
  }

  // CSVファイルをまとめる変数
  let fileData = ''
  // 取得した文書データをCSVファイルにまとめる
  for (let idx = 0; idx < invoices.length; idx++) {
    const invoice = await invoices[idx].invoice
    const journalizeInvoice = await invoices[idx].journalizeInvoice
    // 最初の請求書の場合
    if (idx === 0) {
      fileData += jsonToCsv(dataToJson(invoice, journalizeInvoice))
      fileData += String.fromCharCode(0x0a) // 改行の追加
      // 最初以外の請求書の場合
    } else {
      const rows = jsonToCsv(dataToJson(invoice, journalizeInvoice)).split(/\r?\n|\r/)
      for (let row = 0; row < rows.length; row++) {
        // ヘッダ除外したもののみ追加
        if (row !== 0) {
          fileData += rows[row]
          fileData += String.fromCharCode(0x0a) // 改行の追加
        }
      }
    }
  }
  // 複数の請求書の文書をCSVファイルに作成して、返却
  return fileData
}

// 自分自身の企業をaccountAPIで取得
const getSentToCompany = async (accessToken, refreshToken) => {
  const result = await apiManager.accessTradeshift(accessToken, refreshToken, 'get', '/account')

  return [result.CompanyAccountId]
}

module.exports = {
  createInvoiceDataForDownload: createInvoiceDataForDownload,
  getSentToCompany: getSentToCompany
}
