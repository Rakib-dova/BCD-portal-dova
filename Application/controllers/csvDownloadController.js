'use stric'
const apiManager = require('./apiManager')

const createInvoiceDataForDownload = async (accessToken, refreshToken, documents) => {
  const dataToJson = require('../routes/csvDownload').dataToJson
  const jsonToCsv = require('../routes/csvDownload').jsonToCsv
  const invoices = []

  documents.forEach(async (item) => {
    const invoice = apiManager.accessTradeshift(accessToken, refreshToken, 'get', `/documents/${item.DocumentId}`)
    invoices.push(invoice)
  })
  let fileData = ''
  for (let idx = 0; idx < invoices.length; idx++) {
    const invoice = await invoices[idx]

    if (idx === 0) {
      fileData += jsonToCsv(dataToJson(invoice))
      fileData += String.fromCharCode(0x0a)
    } else {
      const rows = jsonToCsv(dataToJson(invoice)).split(/\r?\n|\r/)
      for (let row = 0; row < rows.length; row++) {
        if (row !== 0) {
          fileData += rows[row]
        }
      }
      fileData += String.fromCharCode(0x0a)
    }
  }

  return fileData
}
module.exports = {
  createInvoiceDataForDownload: createInvoiceDataForDownload
}
