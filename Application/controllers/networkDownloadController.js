'use stric'
const apiManager = require('./apiManager')

// 複数の請求書を1つのCSVファイルにまとめる関数
const createNetworkeDataForDownload = async (accessToken, refreshToken, documents) => {
  const dataToJson = require('../routes/csvDownload').dataToJson
  const jsonToCsv = require('../routes/csvDownload').jsonToCsv
  const invoices = []

  // 検索した複数の請求書の文書データを取得
  for (let idx = 0; idx < documents.length; idx++) {
    const invoice = await apiManager.accessTradeshift(
      accessToken,
      refreshToken,
      'get',
      `/documents/${documents[idx].DocumentId}`
    )
    // エラーを確認する
    if (invoice instanceof Error) {
      return invoice
    } else {
      invoices.push(invoice)
    }
  }

  // CSVファイルをまとめる変数
  let fileData = ''
  // 取得した文書データをCSVファイルにまとめる
  for (let idx = 0; idx < invoices.length; idx++) {
    const invoice = await invoices[idx]
    // 最初の請求書の場合
    if (idx === 0) {
      fileData += jsonToCsv(dataToJson(invoice))
      fileData += String.fromCharCode(0x0a) // 改行の追加
      // 最初以外の請求書の場合
    } else {
      const rows = jsonToCsv(dataToJson(invoice)).split(/\r?\n|\r/)
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
module.exports = {
  createNetworkeDataForDownload: createNetworkeDataForDownload
}
