class TradeshiftDTO {
  constructor(accessToken, refreshToken, tenantId) {
    this.accessToken = accessToken
    this.refreshToken = refreshToken
    this.tenantId = tenantId
    this.apiManager = require('../controllers/apiManager').accessTradeshift
  }

  async getDocument(documentId) {
    documentId = documentId ?? ''
    const get = 'get'
    const uri = `/documents${documentId}`
    return await this.accessTradeshift(get, uri)
  }

  async findDocuments(documentId) {
    documentId = documentId ?? ''
    const get = 'get'
    const uri = `/documents?id=${documentId}&sentTo${this.tenantId}&type=invoice&_onlyIndex=true`
    return (await this.accessTradeshift(get, uri)).Document[0]
  }

  async accessTradeshift(method, uri) {
    return await this.apiManager(this.accessToken, this.refreshToken, method, uri)
  }
}

module.exports = TradeshiftDTO
