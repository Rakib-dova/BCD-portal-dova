'use strict'
const axios = require('axios')
const chalk = require('chalk')

const api = {}

const getClient = (ctx) => {
  const token = ctx && ctx.user && ctx.user.accessToken

  if (!token) {
    throw new Error('Missing authentication - unable to make an API request.')
  }

  const instance = axios.create({
    baseURL: `https://${process.env.TS_API_HOST}/tradeshift/rest/external`,
    headers: {
      Authorization: `Bearer ${token}`
    }
  })

  // log requests to tradeshift api
  instance.interceptors.request.use((config) => {
    console.log(`${chalk.cyan('Tradeshift API')}: ${config.method.toUpperCase()} ${config.baseURL}${config.url}`)
    return config
  })

  // just pass back `data` for simplicity
  instance.interceptors.response.use(
    function (response) {
      return response.status === 200 ? response.data : response
    },
    function (error) {
      console.log(`${error}`)
      throw error
    }
  )

  return instance
}

api.baseUrl = () => 'https://' + process.env.TS_API_HOST.replace('api-', '')

/** Accounts */
// Get Account Info
api.getAccount = async (ctx) => getClient(ctx).get('/account/info')

/** Users */
// Get User Info
api.getUser = async (ctx) => getClient(ctx).get('/account/info/user')

/** Documents */
// Find Documents
api.findDraftDocuments = async (ctx, query) =>
  getClient(ctx).get('/documents', {
    params: {
      onlydrafts: true,
      type: 'invoice',
      query: query
    }
  })
api.findDocuments = async (ctx, { query, onlydrafts, limit, page } = {}) =>
  getClient(ctx).get('/documents?stag=draft&stag=outbox', {
    params: {
      type: 'invoice',
      query,
      onlydrafts,
      limit,
      page
    }
  })

// Find Document
api.getDocument = async (ctx, documentId) => getClient(ctx).get('/documents/' + documentId)

api.getDocumentXml = async (ctx, documentId) =>
  getClient(ctx).get('/documents/' + documentId, {
    headers: {
      accept: 'application/xml'
    }
  })

api.getDocumentPdf = async (ctx, documentId) =>
  getClient(ctx).get('/documents/' + documentId, {
    headers: {
      accept: 'application/pdf'
    },
    encoding: null,
    responseType: 'arraybuffer'
  })
// Update Document
api.updateDocument = async (ctx, documentId, body) =>
  getClient(ctx).put('/documents/' + documentId, body, {
    params: {
      documentProfileId: 'ubl.invoice.2.1.jp',
      draft: 'true'
    }
  })
// Delete Document
api.deleteDocument = async (ctx, documentId) => getClient(ctx).delete('/documents/' + documentId)
// Send Document
api.sendDocument = async (ctx, documentId, dispatchId) =>
  getClient(ctx).put(
    `/documents/${documentId}/dispatches/${dispatchId}`,
    {},
    {
      headers: {
        'Content-Type': 'application/json'
      }
    }
  )

// Attachements
api.getAttachments = async (ctx, documentId) => getClient(ctx).get(`/documents/${documentId}/attachments`)

// Update Document Attachment
api.updateAttachment = async (ctx, documentId, filename, fileType, body) =>
  getClient(ctx).put(`/documents/${documentId}/attachments/${encodeURIComponent(filename)}/content`, body, {
    headers: {
      'Content-Type': fileType
    }
  })

api.removeAttachment = async (ctx, documentId, filename) =>
  getClient(ctx).delete(`/documents/${documentId}/attachments/${encodeURIComponent(filename)}/content`)

/** Network */
api.findConnections = async (ctx, { query, limit, page } = {}) =>
  getClient(ctx).get('/network', {
    params: {
      query: query,
      limit: limit,
      page: page
    }
  })

api.getCompany = async (ctx, companyId) => getClient(ctx).get('/network/connections/companies/' + companyId)

module.exports = api
