'use strict'
const express = require('express')
const router = express.Router()
const fs = require('fs')
const encoding = require('encoding-japanese')
const path = require('path')

const db = require('../models')
const multer = require('multer')
const upload = multer({ storage: multer.memoryStorage() })
const csrf = require('csurf')
const csrfProtection = csrf({ cookie: false })

const helper = require('./helpers/middleware')
const errorHelper = require('./helpers/error')
const logger = require('../lib/logger')
const validation = require('../lib/pdfInvoiceCsvUploadValidation')
const csv = require('../lib/csv')
const pdfInvoiceMapper = csv.pdfInvoiceMapper
const invoiceHeaderArray = csv.invoiceHeaderArray
const constantsDefine = require('../constants')

const pdfInvoiceController = require('../controllers/pdfInvoiceController.js')
const uploadController = require('../controllers/pdfInvoiceHistoryController.js')
const pdfInvoiceHistoryDetailController = require('../controllers/pdfInvoiceHistoryDetailController.js')
const pdfInvoice = require('../routes/pdfInvoice.js')

const pdfInvoiceCsvUploadIndex = async (req, res, next) => {
  if (!req.user) return next(errorHelper.create(500)) // UTのエラー対策
  logger.info(constantsDefine.logMessage.INF000 + 'pdfInvoiceCsvUploadIndex')

  res.render('pdfInvoiceCsvUpload', {
    title: 'PDF請求書ドラフト一括作成',
    engTitle: 'CSV UPLOAD for PDF',
    csrfToken: req.csrfToken()
  })

  logger.info(constantsDefine.logMessage.INF001 + 'pdfInvoiceCsvUploadIndex')
}

const pdfInvoiceCsvUpload = async (req, res, next) => {
  const functionName = 'pdfInvoiceCsvUpload'
  if (!req.user) return next(errorHelper.create(500)) // UTのエラー対策
  logger.info(`${constantsDefine.logMessage.INF000}${functionName}`)

  // アップロードファイルが存在しない
  if (!req.file?.buffer) {
    return res.status(400).send(
      JSON.stringify({
        message: 'システムエラーです。（後程、接続してください）'
      })
    )
  }
  // 文字コードチェック
  if (!encoding.detect(req.file.buffer, 'UTF8')) {
    return res.status(400).send(
      JSON.stringify({
        message: '文字コードはUTF-8 BOM付で作成してください。CSVファイルの内容を確認の上、再度実行をお願いします。'
      })
    )
  }
  // CSV内容チェック
  if (req.file.buffer.equals(Buffer.from(new Uint8Array([0xef, 0xbb, 0xbf])))) {
    return res.status(400).send(
      JSON.stringify({
        message: 'CSVファイルのデータに不備があります。CSVファイルの内容を確認の上、再度実行をお願いします。'
      })
    )
  }

  // csvファイル
  let uploadFileData
  let defaultCsvData
  try {
    uploadFileData = req.file.buffer.toString('UTF-8') // CSV文字列データ
    defaultCsvData = fs.readFileSync(path.resolve('./public/html/PDF請求書ドラフト一括作成フォーマット.csv'), 'utf8') // アップロードフォーマット文字列データ
  } catch (error) {
    logger.info(error)
    return res.status(500).send(JSON.stringify({ message: 'システムエラーです。（後程、接続してください）' }))
  }

  const csvMultiArray = csv.convertCsvStringToMultiArray(uploadFileData) // CSV文字列データをCSV多次元配列データに変換
  if (!csvMultiArray)
    return res.status(400).send(
      JSON.stringify({
        message: 'CSVファイルのデータに不備があります。CSVファイルの内容を確認の上、再度実行をお願いします。'
      })
    )

  // ヘッダーバリデーション
  if (!validation.validateHeader(uploadFileData, defaultCsvData))
    return res.status(400).send(
      JSON.stringify({
        message: 'ヘッダーが指定のものと異なります。CSVファイルの内容を確認の上、再度実行をお願いします。'
      })
    )

  const csvRowObjects = [] // CSVファイル行情報をデータオブジェクト(アップロードファイル行データ)に変換し、配列化させたもの

  try {
    csvMultiArray.forEach((row, index) => {
      if (index === 0) return

      csvRowObjects.push(csv.convertToDataObject(row, invoiceHeaderArray, pdfInvoiceMapper))
    })
  } catch (error) {
    return res.status(400).send(
      JSON.stringify({
        message: 'CSVファイルのデータに不備があります。CSVファイルの内容を確認の上、再度実行をお願いします。'
      })
    )
  }

  if (csvRowObjects.length === 0)
    return res.status(400).send(
      JSON.stringify({
        message: 'CSVファイルのデータが存在しません。CSVファイルの内容を確認の上、再度実行をお願いします。'
      })
    )
  console.log('==  csvRowObjects  ======================\n', csvRowObjects)

  // CSV行データオブジェクトに空情報(null)が含まれている場合
  if (csvRowObjects.filter((row) => !row).length)
    return res.status(400).send(
      JSON.stringify({
        message: 'CSVファイルのデータに不備があります。CSVファイルの内容を確認の上、再度実行をお願いします。'
      })
    )

  // アカウント情報取得 (CSVデータ多次元配列をデータオブジェクトに変換するのに必要)
  const { senderInfo } = await pdfInvoice.getAccountAndSenderInfo(req)

  if (!senderInfo)
    return res.status(500).send(JSON.stringify({ message: 'APIエラーです、時間を空けて再度実行をお願いいたします。' }))

  // DB保存&バリデーションするために、CSV行データオブジェクト配列をDBモデルに変換
  const { pdfInvoices, pdfInvoiceLines } = csv.convertCsvDataArrayToPdfInvoiceModels(
    csvRowObjects,
    senderInfo,
    req.user.tenantId
  )
  console.log('==  pdfInvoices  ======================\n', pdfInvoices)
  console.log('==  pdfInvoiceLines  ======================\n', pdfInvoiceLines)
  if (!pdfInvoices || !pdfInvoiceLines)
    return res.status(500).send(
      JSON.stringify({
        message: 'CSVファイルのデータに不備があります。CSVファイルの内容を確認の上、再度実行をお願いします。'
      })
    )

  if (pdfInvoices.length > 200)
    return res.status(400).send(
      JSON.stringify({
        message: '作成できる請求書数は200までです。CSVファイルの内容を確認の上、再度実行をお願いします。'
      })
    )
  if (pdfInvoiceLines.length > 20)
    return res.status(400).send(
      JSON.stringify({
        message: '一つの請求書で作成できる明細数は20までです。CSVファイルの内容を確認の上、再度実行をお願いします。'
      })
    )

  // バリデーション
  const { validInvoices, validLines, uploadHistory, csvRows } = await validation.validate(
    pdfInvoices,
    pdfInvoiceLines,
    req.user.tenantId,
    req.file.originalname
  )
  console.log('==  validInvoices  ======================\n', validInvoices)
  console.log('==  validLines  ======================\n', validLines)
  console.log('==  uploadHistory  ======================\n', uploadHistory)
  console.log('==  csvRows  ======================\n', csvRows)

  if (!validInvoices || !validLines || !uploadHistory || !csvRows)
    return res.status(500).send(
      JSON.stringify({
        message: 'CSVファイルのデータに不備があります。CSVファイルの内容を確認の上、再度実行をお願いします。'
      })
    )

  // DB保存
  try {
    await db.sequelize.transaction(async (t) => {
      await Promise.all([
        uploadController.createUploadHistoryAndRows(uploadHistory, csvRows, t), // アップロード履歴 & CSV行 レコード挿入
        pdfInvoiceController.createInvoicesAndLines(validInvoices, validLines, t) // 請求書 & 明細 レコード挿入
      ])
    })
  } catch (error) {
    logger.info(error)
    return res.status(500).send(JSON.stringify({ message: 'システムエラーです。（後程、接続してください）' }))
  }

  if (uploadHistory?.failCount > 0 || (uploadHistory?.skipCount > 0 && uploadHistory?.successCount === 0)) {
    return res.redirect('/pdfInvoiceCsvUpload/resultList')
  } else {
    return res.redirect('/pdfInvoices/list')
  }
}

const pdfInvoiceCsvUploadResult = async (req, res, next) => {
  if (!req.user) return next(errorHelper.create(500)) // UTのエラー対策
  const functionName = 'pdfInvoiceCsvUploadResult'
  logger.info(`${constantsDefine.logMessage.INF000}${functionName}`)

  const resultArr = []
  const result = await uploadController.findforTenant(req.user.tenantId)

  try {
    const timeStamp = (date) => {
      const now = new Date(date)
      const year = now.getFullYear()
      const month = now.getMonth() + 1 < 10 ? '0' + (now.getMonth() + 1) : now.getMonth() + 1
      const day = now.getDate() < 10 ? '0' + now.getDate() : now.getDate()
      const hour = now.getHours() < 10 ? '0' + now.getHours() : now.getHours()
      const min = now.getMinutes() < 10 ? '0' + now.getMinutes() : now.getMinutes()
      const sec = now.getSeconds() < 10 ? '0' + now.getSeconds() : now.getSeconds()
      const stamp = `${year}/${month}/${day} ${hour}:${min}:${sec}`
      return stamp
    }
    result.forEach((currVal, index) => {
      const invoice = currVal
      const invoiceAll =
        ~~invoice.dataValues.successCount + ~~invoice.dataValues.skipCount + ~~invoice.dataValues.failCount
      let status = false
      if (~~invoice.dataValues.failCount === 0 && invoice.dataValues.failCount !== '-' && invoiceAll !== 0) {
        status = true
      }
      resultArr.push({
        index: index + 1,
        date: timeStamp(invoice.dataValues.updatedAt),
        filename: invoice.dataValues.csvFileName,
        invoicesAll: invoiceAll,
        invoicesCount: invoice.dataValues.invoiceCount,
        invoicesSuccess: invoice.dataValues.successCount,
        invoicesSkip: invoice.dataValues.skipCount,
        invoicesFail: invoice.dataValues.failCount,
        status: status,
        historyId: invoice.dataValues.historyId
      })
    })

    console.log('==  resultArr  ======================\n', resultArr)
  } catch (error) {
    logger.error({ page: functionName, msg: '請求書を取得失敗しました。' })
    logger.error(error)
  }

  res.render('pdfInvoiceCsvUploadResult', {
    title: '取込結果一覧',
    engTitle: 'Result LIST',
    resultArr: resultArr,
    csrfToken: req.csrfToken()
  })
  logger.info(`${constantsDefine.logMessage.INF001}${functionName}`)
}

const pdfInvoiceCsvUploadResultDetail = async (req, res, next) => {
  const functionName = 'pdfInvoiceCsvUploadResultDetail'
  logger.info(`${constantsDefine.logMessage.INF000}${functionName}`)

  let resultStatusCode
  let historyId

  if (req.params.historyId === undefined) {
    resultStatusCode = 400
    return res.status(resultStatusCode).send()
  } else {
    historyId = req.params.historyId
  }

  const resultDetailArr = []

  try {
    const result = await pdfInvoiceHistoryDetailController.findInvoiceDetail(historyId)
    resultStatusCode = 200

    result.map((currVal) => {
      const invoiceDetail = currVal
      let status = ''

      switch (invoiceDetail.dataValues.status) {
        case 1:
          status = 'スキップ'
          break
        case 0:
          status = '成功'
          break
        default:
          status = '失敗'
          break
      }

      resultDetailArr.push({
        lines: invoiceDetail.dataValues.lines,
        invoiceNo: invoiceDetail.dataValues.invoiceNo,
        status: status,
        errorData: invoiceDetail.dataValues.errorData
      })
      return ''
    })
  } catch (error) {
    resultStatusCode = 500
    logger.error({ page: 'csvuploadResult', msg: '請求書の取得に失敗しました。' })
    logger.error(error)
  }

  logger.info(`${constantsDefine.logMessage.INF001}${functionName}`)
  // データ送信
  return res.status(resultStatusCode).send(JSON.stringify(resultDetailArr))
}

router.get('/', csrfProtection, helper.bcdAuthenticate, pdfInvoiceCsvUploadIndex)
router.post('/upload', csrfProtection, helper.bcdAuthenticate, upload.single('csvFile'), pdfInvoiceCsvUpload)
router.get('/resultList', csrfProtection, helper.bcdAuthenticate, pdfInvoiceCsvUploadResult)
router.get('/resultList/detail/:historyId', csrfProtection, helper.bcdAuthenticate, pdfInvoiceCsvUploadResultDetail)

module.exports = {
  router,
  pdfInvoiceCsvUploadIndex,
  pdfInvoiceCsvUpload,
  pdfInvoiceCsvUploadResult,
  pdfInvoiceCsvUploadResultDetail
}
