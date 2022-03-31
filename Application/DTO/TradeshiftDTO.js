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
   *
   * @param {uuid} sentByCompany 送信した企業のトレードシフトID
   * @param {string} invoiceId 請求書番号
   * @param {Array} issueDate 発行日の期限['yyyy-mm-dd', 'yyyy-mm-dd']
   * @param {string} contractEmail 取引先担当者のメールアドレス
   * @returns {Array<object>} 検索結果
   * https://developers.tradeshift.com/docs/api#documents-documentを参照
   */
  async getDocumentSearch(sentByCompany, invoiceId, issueDate, contractEmail) {
    sentByCompany = sentByCompany ?? ''
    invoiceId = invoiceId ?? ''
    if (issueDate instanceof Array === false) issueDate = []
    contractEmail = contractEmail ?? ''

    const get = 'get'
    let uri = `/documents?sentTo=${this.tenantId}&type=invoice&limit=10000&_onlyIndex=true`
    const state = ['DELIVERED', 'ACCEPTED', 'PAID_UNCONFIRMED', 'PAID_CONFIRMED']

    if (sentByCompany.length > 0) uri = `${uri}&${this.getQuery('sentBy', sentByCompany)}`

    if (invoiceId.length > 0) uri = `${uri}&${this.getQuery('businessId', invoiceId)}`

    if (issueDate[0].length > 0) {
      uri = `${uri}&${this.getQuery('minissuedate', issueDate[0])}`
    }

    if (issueDate[1].length > 0) {
      uri = `${uri}&${this.getQuery('minissuedate', issueDate[1])}`
    }

    uri = `${uri}&${this.getQuery('onlydeleted', false)}&${this.getQuery('onlydrafts', false)}&${this.getQuery(
      'ascending',
      false
    )}&${this.getQuery('state', state)}`

    const response = []
    for (const document of (await this.accessTradeshift(get, uri)).Document) {
      if (document.TenantId === this.tenantId) {
        response.push(document)
      }
    }

    return response
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
    const noneUserAccount = { Id: '', CompanyName: '', Username: '', FirstName: '未設定', LastName: '' }
    const userAccount = (await this.accessTradeshift(get, uri)).UserAccounts[0] ?? { ...noneUserAccount }
    return this.UserAccounts.setUserAccounts(userAccount)
  }

  /**
   * トレードシフトからユーザー情報を取得
   * @param {uuid} userId トレードシフトのユーザー識別番号
   * @returns {VO/UserAccounts} UserAccountsのユーザー情報
   */
  async getUserById(userId) {
    const get = 'get'
    const uri = `/account/users/${userId}`
    const userAccount = await this.accessTradeshift(get, uri)
    return this.UserAccounts.setUserAccounts(userAccount)
  }

  /**
   * 当該テナントのユーザー情報を取得
   * @returns Array<VO/UserAccounts> ユーザー情報リスト
   */
  async findUserAll() {
    const qs = require('qs')
    const get = 'get'
    const query = { limit: 25, page: 0, numPages: 1 }
    const uri = `/account/${this.tenantId}/users?${qs.stringify(query)}`
    const userAccounts = []
    do {
      const findUsers = await this.accessTradeshift(get, uri)
      if (findUsers instanceof Error && findUsers.response.status === 401) {
        return -1
      }
      query.page++
      query.numPages = findUsers.numPages
      findUsers.UserAccounts.forEach((user) => {
        userAccounts.push(this.UserAccounts.setUserAccounts(user))
      })
    } while (query.page < query.numPages)

    return userAccounts
  }

  getQuery(key, values) {
    const qs = require('qs')
    const queryObj = {}
    queryObj[key] = values
    const query = qs
      .stringify(queryObj)
      .replace(/%26/g, '&')
      .replace(/%3D/g, '=')
      .replace(/%5B0%5D/g, '')
      .replace(/%5B1%5D/g, '')
      .replace(/%5B2%5D/g, '')
      .replace(/%5B3%5D/g, '')
    return query
  }

  async accessTradeshift(method, uri) {
    return await this.apiManager(this.accessToken, this.refreshToken, method, uri)
  }

  setUserAccounts(UserAccounts) {
    this.UserAccounts = UserAccounts
  }
}

module.exports = TradeshiftDTO
