'use strict'

const apiManager = require('../controllers/apiManager').accessTradeshift

/**
 * 企業検索API。
 * @param {object} token トークン情報
 * @param {string} companyName 企業名
 * @param {int} page ページ番号
 * @returns {object} 企業情報
 */
const getCompanies = async (token, companyName, page, limit = '1000') => {
  const response = await apiManager(
    token.accessToken,
    token.refreshToken,
    'get',
    `/network/companies?query=${encodeURIComponent(companyName)}&page=${page}&limit=${limit}`
  )

  return response
}

/**
 * 招待有無確認API。
 * @param {object} token トークン情報
 * @param {string} username メールアドレス
 * @param {string} type TradeshiftConnection or ExternalConnection
 * @returns {object} メールアドレス接続情報
 */
const getConnections = async (token, username, type) => {
  const response = await apiManager(
    token.accessToken,
    token.refreshToken,
    'get',
    `/network/connections?query=${encodeURIComponent(username)}&type=${type}`
  )

  return response
}

/**
 * ネットワーク接続更新API。
 * 未登録企業の登録とネットワーク接続追加を行う。
 * @param {object} token トークン情報
 * @param {uuid} connectionId 接続ID
 * @param {string} companyName 企業名
 * @param {string} username メールアドレス
 * @returns {object} 実行結果
 */
const updateNetworkConnection = async (token, connectionId, companyName, username) => {
  const body = {
    ConnectionId: connectionId,
    ConnectionType: 'ExternalConnection',
    CompanyName: companyName,
    Country: 'JP',
    Email: username,
    DispatchChannelID: 'EMAIL',
    Invitation: { Text: '', SendMail: true }
  }

  const response = await apiManager(
    token.accessToken,
    token.refreshToken,
    'put',
    `/network/connections/${connectionId}`,
    body
  )

  return response
}

/**
 * Network確認API。
 * @param {object} token トークン情報
 * @param {string} companyId テナントID
 * @returns {object} 企業接続情報
 */
const getConnectionForCompany = async (token, companyId) => {
  const response = await apiManager(
    token.accessToken,
    token.refreshToken,
    'get',
    `/network/connections/companies/${companyId}`
  )

  return response
}

/**
 * メールアドレス情報検索API。
 * @param {object} token トークン情報
 * @param {string} username メールアドレス
 * @returns {string} ユーザ情報
 */
const getUserInformationByEmail = async (token, username) => {
  const response = await apiManager(
    token.accessToken,
    token.refreshToken,
    'post',
    `/users?username=${encodeURIComponent(username)}`
  )

  return response
}

/**
 * ネットワーク接続追加API。
 * @param {object} token トークン情報
 * @param {string} companyId テナントID
 * @returns {object} 実行結果
 */
const addNetworkConnection = async (token, companyId) => {
  const response = await apiManager(token.accessToken, token.refreshToken, 'post', `/network/connect/${companyId}`)

  return response
}

module.exports = {
  getCompanies: getCompanies,
  getConnections: getConnections,
  updateNetworkConnection: updateNetworkConnection,
  getConnectionForCompany: getConnectionForCompany,
  getUserInformationByEmail: getUserInformationByEmail,
  addNetworkConnection: addNetworkConnection
}
