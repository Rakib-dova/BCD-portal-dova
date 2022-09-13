'use stric'
const apiManager = require('./apiManager')

/**
 * 複数の請求書を1つのCSVファイルにまとめる関数
 * @param {string} accessToken アクセストークン
 * @param {string} refreshToken リフレッシュトークン
 * @param {object} documents 請求書情報
 * @returns {object[]} 請求書情報（正常）、Error（DBエラー、システムエラーなど）
 */
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
