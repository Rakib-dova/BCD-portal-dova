'use strict'
const express = require('express')
const fs = require('fs')
const path = require('path')
const { v4: uuidv4 } = require('uuid')

const ts = require('../controllers/apihelper').tradeshiftApi()
const BillIssue = require('./helpers/billIssue')
const Documents = require('./helpers/documents')
const Formats = require('./helpers/formats')
const { handler, api, currentTenantId } = require('./helpers/util')

// CSRF対策
const csrf = require('csurf')
const csrfProtection = csrf({ cookie: false })

const middleware = require('./helpers/middleware')

const renderData = async (req, modeName, format) => {
  const connections = await ts.findConnections(req)
  const defaultRecipient = await Formats.recipient(req)
  return {
    csrfToken: req.csrfToken(),
    modeName: modeName,
    formatId: format?.id ?? '',
    formatName: format?.name,
    items: Formats.items(format),
    builtin: format?.id == 0,
    connections: connections.Connections.Connection.map((item) => {
      return {
        id: item.CompanyAccountId,
        name: item.CompanyName,
        selected: item.CompanyAccountId === defaultRecipient
      }
    })
  }
}

/**
 * 初期表示 (新規)
 */
const displayNew = async (req, res, next) => {
  await res.render('invoice_format.hbs', await renderData(req, '新規作成'))
}

/**
 * 初期表示 (編集)
 */
const displayEdit = async (req, res, next) => {
  const format = await Formats.get(req, req.params.formatId)
  await res.render('invoice_format.hbs', await renderData(req, '編集', format))
}

const previewData = (items) => {
  const data = JSON.parse(
    fs.readFileSync(path.join(__dirname, '../../public/obc/assets/invoice_preview.json'), 'utf-8')
  )
  const convert = BillIssue.converter((key) => items.includes(key))
  return convert(BillIssue.build(data).shift())
}

/**
 * プレビュー
 */
const preview = async (req, res, next) => {
  const request = req.body

  // プレビュー用宛先を保存
  await Formats.saveRecipient(req, request.recipient)

  // プレビュー用請求書を作成または更新
  const data = previewData([request.items ?? []].flat())
  const document = Documents.create(data, currentTenantId(req), request.recipient)
  const documents = await ts.findDraftDocuments(req, document.ID.value)
  const documentId = documents.Document.shift()?.DocumentId || uuidv4()
  await ts.updateDocument(req, documentId, document)

  const content = await ts.getDocumentPdf(req, documentId)
  res.set('Content-Type', 'application/pdf')
  res.send(content)

  // プレビュー用請求書を削除
  ts.deleteDocument(req, documentId)
}

/**
 * Tradeshiftのユーザー情報からフルネームを取り出す
 */
const formatUsername = (user) => {
  if (user.FirstName && user.LastName) {
    return `${user.LastName} ${user.FirstName}`
  }
  return user.LastName ?? user.FirstName ?? user.Username
}

/**
 * 保存処理
 */
const save = async (req, res, next) => {
  const request = req.body

  const user = await ts.getUser(req)
  const username = formatUsername(user)

  // フォーマットを保存
  const formatId = await Formats.save(req, {
    id: req.params.formatId,
    name: request.name,
    user: username,
    items: request.items
  })
  res.send({ status: 'ok', formatId: formatId, message: '請求書フォーマットを保存しました。' })
}

const router = express.Router()
router.get('/', ...middleware, csrfProtection, handler(displayNew))
router.get('/:formatId', ...middleware, csrfProtection, handler(displayEdit))
router.post('/preview', ...middleware, csrfProtection, handler(preview))
router.post('/', ...api([...middleware, csrfProtection], save, '請求書フォーマットの保存に失敗しました。'))
router.post('/:formatId', ...api([...middleware, csrfProtection], save, '請求書フォーマットの保存に失敗しました。'))

module.exports = router
