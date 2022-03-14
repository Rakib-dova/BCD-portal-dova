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

  /**
   * トレードシフトのユーザーを検索する。
   * @param {uuid} userId Usersテーブルに保存されるuserId
   * @returns {VO/UserAccounts} UserAccountsのユーザー情報
   * {
   *   id: userId,
   *   compnayName: userの会社名,
   *   email: userのemail,
   *   firstName: 名,
   *   lastName: 苗字
   * }
   */
  async findUser(userId) {
    const get = 'get'
    const uri = `/account/${this.tenantId}/users?id=${userId}`
    return this.UserAccounts.setUserAccounts((await this.accessTradeshift(get, uri)).UserAccounts[0])
  }

  async accessTradeshift(method, uri) {
    return await this.apiManager(this.accessToken, this.refreshToken, method, uri)
  }

  setUserAccounts(UserAccounts) {
    this.UserAccounts = UserAccounts
  }
}

module.exports = TradeshiftDTO
