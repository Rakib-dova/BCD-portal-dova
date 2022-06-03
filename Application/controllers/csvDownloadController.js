'use stric'
const apiManager = require('./apiManager')

// 複数の請求書を1つのCSVファイルにまとめる関数
const createInvoiceDataForDownload = async (accessToken, refreshToken, documents) => {
  const invoices = []
  const invoice = await apiManager.accessTradeshift(
    accessToken,
    refreshToken,
    'get',
    `/documents/${documents.DocumentId}`
  )

  // エラーを確認する
  if (invoice instanceof Error) {
    return invoice
  } else {
    invoices.push(invoice)
  }

  // 複数の請求書の文書をCSVファイルに作成して、返却
  return invoices
}
module.exports = {
  createInvoiceDataForDownload: createInvoiceDataForDownload
}
