class TradeshiftDTO {
  constructor(accessToken, refreshToken, tenantId) {
    this.accessToken = accessToken
    this.refreshToken = refreshToken
    this.tenantId = tenantId
    this.apiManager = require('../controllers/apiManager').accessTradeshift
    this.init()
  }

  init() {
    this.method = 'get'
    this.uri = ''
    this.body = {}
    this.config = {
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${this.accessToken}`
      }
    }
  }

  /**
   *
   * @param {uuid} documentId 請求書のトレードシフトID
   * @param {boolean} includeDraftAttachments 請求書がドラフトの状態で添付ファイルがある場合、添付ファイルを表示するか
   * @returns {document} トレードシフトのドキュメント
   */
  async getDocument(documentId, includeDraftAttachments) {
    documentId = documentId ?? ''
    if (typeof includeDraftAttachments !== 'boolean') includeDraftAttachments = false

    const get = 'get'
    let uri = `/documents/${documentId}`

    if (includeDraftAttachments) uri = `${uri}?${this.getQuery('includeDraftAttachments', includeDraftAttachments)}`

    const result = await this.accessTradeshift(get, uri)

    return { ...result, documentId }
  }

  async findDocuments(documentId) {
    documentId = documentId ?? ''
    const get = 'get'
    const uri = `/documents?id=${documentId}&sentTo${this.tenantId}&type=invoice&_onlyIndex=true`
    return (await this.accessTradeshift(get, uri)).Document[0]
  }

  /**
   *
   * @param {Array} tag タグを持っているドキュメントを検索して、結果にドキュメントを含む。カスタムタグがある場合、使用する
   * @param {Array} withouttag タグを持っているドキュメントを検索して、結果にドキュメントを外す
   * @param {Array} type ドキュメントの種類、指定しない場合invoiceに指定される。
   * @param {int} page ページ番号
   * @param {int} limit 1ページあたり表示するドキュメントの数、指定ない場合10000に設定される。
   * @param {uuid} id ドキュメントのトレードシフトID
   * @param {string} businessId 請求書番号
   * @param {string} sentBy 送信企業（取引先）
   * @param {string} sentTo 受信企業（宛先）
   * @param {string} minissueDate 検索する発行日の最初日
   * @param {string} maxissuedate 検索する発行日の最終日
   * @param {Array} state ドキュメントの状況：受信済み、送信済み、
   * @returns {Array<object>} 検索結果
   * https://developers.tradeshift.com/docs/api#documents-documentを参照
   */
  async getDocuments(
    tag,
    withouttag,
    type,
    page,
    limit,
    id,
    businessId,
    sentBy,
    sentTo,
    minissueDate,
    maxissuedate,
    state,
    query,
    sales,
    stag
  ) {
    if (tag instanceof Array === false) tag = []
    if (withouttag instanceof Array === false) {
      withouttag = ['archived', 'AP_DOCUMENT=DRAFT', 'PARTNER=DOCUMENT_DRAFT', 'tsgo-document']
    }
    if (type instanceof Array === false) type = ['invoice']
    page = page ?? 0
    limit = limit ?? 10000
    id = id ?? ''
    businessId = businessId ?? ''
    sentBy = sentBy ?? ''
    sentTo = sentTo ?? ''
    minissueDate = minissueDate ?? ''
    maxissuedate = maxissuedate ?? ''
    if (state instanceof Array === false) state = []
    if (query instanceof Array === false) query = []
    if (typeof sales !== 'boolean') sales = sales ?? ''
    if (stag instanceof Array === false) stag = ['sales', 'purchases', 'draft']

    const get = 'get'
    let uri = `/documents?&_onlyIndex=true&${this.getQuery('page', page)}&${this.getQuery('limit', limit)}`

    if (tag.length > 0) uri = `${uri}&${this.getQuery('tag', tag)}`

    if (withouttag.length > 0) uri = `${uri}&${this.getQuery('withouttag', withouttag)}`

    if (id.length > 0) uri = `${uri}&${this.getQuery('id', id)}`

    if (businessId.length > 0) uri = `${uri}&${this.getQuery('businessId', id)}`

    if (sentBy.length > 0) uri = `${uri}&${this.getQuery('sentBy', sentBy)}`

    if (sentTo.length > 0) uri = `${uri}&${this.getQuery('sentTo', sentTo)}`

    if (minissueDate.length > 0 && minissueDate.match(/\d{1,4}-\d{1,2}-\d{1,2}/)) {
      uri = `${uri}&${this.getQuery('minissuedate', minissueDate)}`
    }

    if (maxissuedate.length > 0 && maxissuedate.match(/\d{1,4}-\d{1,2}-\d{1,2}/)) {
      uri = `${uri}&${this.getQuery('maxissuedate', maxissuedate)}`
    }

    if (state.length > 0) uri = `${uri}&${this.getQuery('state', state)}`

    if (typeof sales === 'boolean') uri = `${uri}&${this.getQuery('sales', sales)}`

    if (stag.length > 0) uri = `${uri}&${this.getQuery('stag', stag)}`

    uri = `${uri}&${this.getQuery('onlydeleted', false)}`
    uri = `${uri}&${this.getQuery('onlydrafts', false)}`
    uri = `${uri}&${this.getQuery('ascending', false)}`

    const response = await this.accessTradeshift(get, uri)

    return response
  }

  /**
   *
   * @param {uuid} sentByCompany 送信した企業のトレードシフトID
   * @param {string} invoiceId 請求書番号
   * @param {Array} issueDate 発行日の期限['yyyy-mm-dd', 'yyyy-mm-dd']
   * @param {string} contractEmail 取引先担当者のメールアドレス
   * @param {string} unKnownManager 社内に取引先担当者の情報の存在有無条件
   * @returns {Array<object>} 検索結果
   * https://developers.tradeshift.com/docs/api#documents-documentを参照
   */
  async getDocumentSearch(sentByCompany, invoiceId, issueDate, contractEmail, unKnownManager) {
    sentByCompany = sentByCompany ?? ''
    invoiceId = invoiceId ?? ''
    if (issueDate instanceof Array === false) issueDate = []
    contractEmail = contractEmail ?? ''
    unKnownManager = unKnownManager ?? ''

    const get = 'get'
    let uri = `/documents?sentTo=${this.tenantId}&type=invoice&limit=10000&_onlyIndex=true`
    const state = ['DELIVERED', 'ACCEPTED', 'PAID_UNCONFIRMED', 'PAID_CONFIRMED']
    const stag = ['purchases']

    if (sentByCompany.length > 0) uri = `${uri}&${this.getQuery('sentBy', sentByCompany)}`

    if (issueDate[0].length > 0) {
      uri = `${uri}&${this.getQuery('minissuedate', issueDate[0])}`
    }

    if (issueDate[1].length > 0) {
      uri = `${uri}&${this.getQuery('maxissuedate', issueDate[1])}`
    }

    if (contractEmail.length > 0 && unKnownManager.length > 0) uri = `${uri}&useAndOperatorForTags=true`

    if (contractEmail.length > 0) uri = `${uri}&tag=${contractEmail}`

    if (unKnownManager.length > 0) uri = `${uri}&tag=${encodeURIComponent(unKnownManager)}`

    uri = `${uri}&${this.getQuery('onlydeleted', false)}&${this.getQuery('onlydrafts', false)}&${this.getQuery(
      'ascending',
      false
    )}&${this.getQuery('state', state)}&${this.getQuery('stag', stag)}`
    const response = []
    const invoiceList = await this.accessTradeshift(get, uri)
    if (invoiceList instanceof Error) return invoiceList

    for (const document of invoiceList.Document) {
      if (document.TenantId === this.tenantId) {
        if (invoiceId.length > 0) {
          if (document.ID.indexOf(invoiceId) !== -1) response.push(document)
        } else {
          response.push(document)
        }
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

  /**
   * トレードシフトの請求書にタグを付ける。
   * @param {uuid} documentId 請求書のトレードシフトID
   * @param {string} tag 付けるタグの内容
   * @returns {tagsResult} タグ作成結果
   */
  async createTags(documentId, tag) {
    const put = 'put'
    const uri = `/documents/${documentId}/tags/${tag}`
    const tagsResult = await this.accessTradeshift(put, uri)
    return tagsResult
  }

  async getUserInformationByEmail(username) {
    this.method = 'post'
    this.uri = `/users?username=${encodeURIComponent(username)}`
    this.config.headers['Content-Type'] = 'application/json'

    const response = await this.run()

    if (response instanceof Error) {
      if (response.response.status === 404) {
        return username
      } else {
        return response
      }
    }

    return response
  }

  /**
   *
   * @param {object} userAccount
   * @returns
   */
  async registUser(userAccount) {
    this.method = 'put'
    this.uri = `/account/users/${userAccount.Id}`
    this.config.headers['Content-Type'] = 'application/json'
    this.body = userAccount

    const response = await this.run()

    if (response instanceof Error) {
      if (response.response.status === 403) {
        return response.response.data
      } else {
        return response
      }
    }

    return response
  }

  async inviteUser(userAccount) {
    this.method = 'put'
    this.uri = `/account/users/${userAccount.Id}/role`
    this.config.headers['Content-Type'] = 'application/x-www-form-urlencoded'
    this.body = userAccount.RoleId

    const response = await this.run()

    if (response instanceof Error) {
      if (response.response.status === 403) {
        return response.response.data
      } else {
        return response
      }
    }

    return response
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

  async run() {
    const result = await this.apiManager(
      this.accessToken,
      this.refreshToken,
      this.method,
      this.uri,
      this.body,
      this.config
    )
    this.init()
    return result
  }

  async accessTradeshift(method, uri, data) {
    return await this.apiManager(this.accessToken, this.refreshToken, method, uri)
  }

  setUserAccounts(UserAccounts) {
    this.UserAccounts = UserAccounts
  }
}

module.exports = TradeshiftDTO
