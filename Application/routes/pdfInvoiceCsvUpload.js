'use strict'
const express = require('express')
const router = express.Router()
const fs = require('fs')
const path = require('path')

const db = require('../models')
const multer = require('multer')
const upload = multer({ storage: multer.memoryStorage() })
const helper = require('./helpers/middleware')
const errorHelper = require('./helpers/error')
const logger = require('../lib/logger')
const validation = require('../lib/pdfInvoiceCsvUpdateValidation')
const {
  convertCsvStringToMultiArray,
  convertToDataObject,
  pdfInvoiceMapper,
  invoiceHeaderArray
} = require('../lib/csv')
const constantsDefine = require('../constants')

const pdfInvoiceController = require('../controllers/pdfInvoiceController.js')
const uploadController = require('../controllers/pdfInvoiceUploadController.js')
const pdfInvoiceUploadDetailController = require('../controllers/pdfInvoiceUploadDetailController.js')
const pdfInvoice = require('../routes/pdfInvoice.js')

const { v4: uuidv4 } = require('uuid')

const pdfInvoiceCsvUploadIndex = async (req, res, next) => {
  if (!req.user) return next(errorHelper.create(500)) // UTのエラー対策
  logger.info(constantsDefine.logMessage.INF000 + 'pdfInvoiceCsvUploadIndex')

  res.render('pdfInvoiceCsvUpload', {
    title: 'PDF請求書ドラフト一括作成',
    engTitle: 'CSV UPLOAD for PDF'
  })

  logger.info(constantsDefine.logMessage.INF001 + 'pdfInvoiceCsvUploadIndex')
}

const pdfInvoiceCsvUpload = async (req, res, next) => {
  const functionName = 'pdfInvoiceCsvUpload'
  if (!req.user) return next(errorHelper.create(500)) // UTのエラー対策
  logger.info(`${constantsDefine.logMessage.INF000}${functionName}`)

  // csvファイル
  const uploadFileData = req.file.buffer.toString('UTF-8') // CSV文字列データ
  const defaultCsvData = fs.readFileSync(
    path.resolve('./public/html/PDF請求書ドラフト一括作成フォーマット.csv'),
    'utf8'
  ) // アップロードフォーマット文字列データ
  const csvMultiArray = convertCsvStringToMultiArray(uploadFileData) // CSV文字列データをCSV多次元配列データに変換

  // console.log('==  csvMultiArray  ======================\n', csvMultiArray)

  // ヘッダーバリデーション
  if (!validation.validateHeader(uploadFileData, defaultCsvData)) return next(errorHelper.create(500))

  const csvRowObjects = [] // CSVファイル行情報をデータオブジェクト(アップロードファイル行データ)に変換し、配列化させたもの
  csvMultiArray.forEach((row, index) => {
    console.log('==  row  ======================\n', row)
    if (index === 0) return

    csvRowObjects.push(convertToDataObject(row, invoiceHeaderArray, pdfInvoiceMapper))
  })

  console.log('==  csvRowObjects  ======================\n', csvRowObjects)

  // アカウント情報取得 (CSVデータ多次元配列をデータオブジェクトに変換するのに必要)
  const { senderInfo } = await pdfInvoice.getAccountAndSenderInfo(req)
  if (!senderInfo) return next(errorHelper.create(500)) // [WIP] エラーメッセージを返す実装に返る

  // DB保存&バリデーションするために、CSVデータ多次元配列をデータオブジェクトに変換
  const { pdfInvoices, pdfInvoiceLines } = convertCsvMultiArrayToPdfInvoiceObjects(
    csvRowObjects,
    senderInfo,
    req.user.tenantId
  )

  console.log('==  pdfInvoices  ======================\n', pdfInvoices)
  console.log('==  pdfInvoiceLines  ======================\n', pdfInvoiceLines)

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

  // DB保存
  try {
    await db.sequelize.transaction(async (t) => {
      await uploadController.createUploadHistoryAndRows(uploadHistory, csvRows, t) // アップロード履歴 & CSV行 レコード挿入
      await pdfInvoiceController.createInvoicesAndLines(validInvoices, validLines, t) // 請求書 & 明細 レコード挿入
    })
  } catch (error) {
    logger.info(error)
    return res.redirect('/pdfInvoiceCsvUpload')
  }

  if (uploadHistory.failCount > 0 || (uploadHistory.skipCount > 0 && uploadHistory.successCount === 0)) {
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
        invoiceUploadId: invoice.dataValues.invoiceUploadId
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
    resultArr: resultArr
  })
  logger.info(`${constantsDefine.logMessage.INF001}${functionName}`)
}

const pdfInvoiceCsvUploadResultDetail = async (req, res, next) => {
  const functionName = 'pdfInvoiceCsvUploadResultDetail'
  logger.info(`${constantsDefine.logMessage.INF000}${functionName}`)

  let resultStatusCode
  let invoiceUploadId

  if (req.params.invoiceUploadId === undefined) {
    resultStatusCode = 400
    return res.status(resultStatusCode).send()
  } else {
    invoiceUploadId = req.params.invoiceUploadId
  }

  const resultDetailArr = []

  try {
    const result = await pdfInvoiceUploadDetailController.findInvoiceDetail(invoiceUploadId)
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

const convertCsvMultiArrayToPdfInvoiceObjects = (csvArray, senderInfo, tenantId) => {
  const pdfInvoices = []
  const pdfInvoiceLines = []
  let curInvoiceIdx = 0

  csvArray.forEach((row) => {
    let pdfInvoice = pdfInvoices.find((invoice) => invoice.invoiceNo === row.invoiceNo)
    if (!pdfInvoice || (pdfInvoice && pdfInvoice.index !== curInvoiceIdx)) {
      pdfInvoice = {
        index: curInvoiceIdx, // 連続する請求書番号だけで同じ請求書扱いする為に一時的にプロパティを設ける
        sendTenantId: tenantId,
        invoiceId: uuidv4(),
        invoiceNo: row.invoiceNo,
        billingDate: new Date(row.billingDate),
        paymentDate: new Date(row.paymentDate),
        deliveryDate: new Date(row.deliveryDate),
        currency: 'JPY',
        recCompany: row.recCompany,
        recPost: row.recPost,
        recAddr1: row.recAddr1,
        recAddr2: row.recAddr2,
        recAddr3: row.recAddr3,
        sendCompany: senderInfo.sendCompany,
        sendPost: senderInfo.sendPost,
        sendAddr1: senderInfo.sendAddr1,
        sendAddr2: senderInfo.sendAddr2,
        sendAddr3: senderInfo.sendAddr3,
        bankName: row.bankName,
        branchName: row.branchName,
        accountType: row.accountType,
        accountName: row.accountName,
        accountNumber: row.accountNumber,
        note: row.note
      }

      curInvoiceIdx++
      pdfInvoices.push(pdfInvoice)
    }
    const invoiceId = pdfInvoice.invoiceId
    const lineIndex = pdfInvoiceLines.filter((line) => line.invoiceId === invoiceId).length

    const line = {
      invoiceId,
      lineIndex,
      lineId: row.lineId,
      lineDiscription: row.lineDiscription,
      unit: row.unit,
      unitPrice: row.unitPrice,
      quantity: row.quantity,
      taxType: row.taxType,
      invoiceNo: row.invoiceNo // CSV行テーブルレコード作成の為、一時的に設けるプロパティ
    }

    // 不要なプロパティを削除
    pdfInvoices.forEach((invoice) => {
      delete invoice.index
    })

    pdfInvoiceLines.push(line)
  })

  return { pdfInvoices, pdfInvoiceLines }
}

router.get('/', helper.bcdAuthenticate, pdfInvoiceCsvUploadIndex)
router.post('/upload', helper.bcdAuthenticate, upload.single('csvFile'), pdfInvoiceCsvUpload)
router.get('/resultList', helper.bcdAuthenticate, pdfInvoiceCsvUploadResult)
router.get('/resultList/detail/:invoiceUploadId', helper.bcdAuthenticate, pdfInvoiceCsvUploadResultDetail)

module.exports = {
  router,
  pdfInvoiceCsvUploadIndex,
  pdfInvoiceCsvUpload,
  pdfInvoiceCsvUploadResult,
  pdfInvoiceCsvUploadResultDetail
}