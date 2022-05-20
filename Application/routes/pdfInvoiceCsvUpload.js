'use strict'
const express = require('express')
const router = express.Router()
const fs = require('fs')
const path = require('path')

const axios = require('axios')
const multer = require('multer')
const upload = multer({ storage: multer.memoryStorage() })
const { v4: uuidV4 } = require('uuid')
const helper = require('./helpers/middleware')
const errorHelper = require('./helpers/error')
const logger = require('../lib/logger')
const validation = require('../lib/pdfInvoiceCsvUpdateValidation')
const constantsDefine = require('../constants')
const csvupload = require('../routes/csvupload')

const apiManager = require('../controllers/apiManager')
const csvUploadController = require('../controllers/pdfInvoiceCsvUploadController.js')
const { generatePdf, renderInvoiceHTML } = require('../lib/pdfGenerator')
const FileType = require('file-type')

const filePath = process.env.INVOICE_UPLOAD_PATH
const { v4: uuidv4 } = require('uuid')
const { TRUE } = require('node-sass')
const { join } = require('path')

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
  const uploadFileData = req.file.buffer.toString('UTF-8')
  const userToken = {
    accessToken: req.user.accessToken,
    refreshToken: req.user.refreshToken
  }

  // メッセージを格納
  let message = constantsDefine.statusConstants.SUCCESS
  let isErr = false

  // DB登録
  // const resultInvoice = await csvUploadController.insert({
  //   invoicesId: uuidv4(),
  //   tenantId: req.user.tenantId,
  //   csvFileName: req.body.filename,
  //   successCount: '-',
  //   failCount: '-',
  //   skipCount: '-'
  // })

  // if (!resultInvoice?.dataValues) {
  //   logger.info(`${constantsDefine.logMessage.DBINF001}${functionName}`)
  // }

  switch (await uploadPDFInvoice(uploadFileData, userToken, req, res)) {
    case 101:
      isErr = true
      message = constantsDefine.statusConstants.INVOICE_FAILED
      break
    case 102:
      isErr = true
      message = constantsDefine.statusConstants.OVER_SPECIFICATION
      break
    case 103:
      isErr = true
      message = constantsDefine.statusConstants.OVERLAPPED_INVOICE
      break
    case 104:
      isErr = true
      message = constantsDefine.statusConstants.INVOICE_VALIDATE_FAILED
      break
    default:
      break
  }

  logger.info(constantsDefine.logMessage.INF001 + 'cbPostUpload')

  if (isErr) {
    // 結果一覧画面に遷移
    // return res.redirect('pdfInvoiceCsvUpload/resultList', message)
  } else {
    // ドラフト一覧画面に遷移
    return res.redirect('pdfInvoices/list', message)
  }
}

const uploadPDFInvoice = async (uploadFileData, _user, _req, _res) => {
  logger.info(constantsDefine.logMessage.INF000 + 'uploadPDFInvoice')

  let uploadData = null
  let defaultCsvData = null

  // ファイルから請求書一括作成の時エラー例外
  try {
    // テンプレートファイル
    const defaultCsvPath = path.resolve('./public/html/PDF請求書ドラフト一括作成フォーマット.csv')
    defaultCsvData = fs.readFileSync(defaultCsvPath, 'utf8')

    const uploadList = uploadFileData.split(/ \n|\r/)
    logger.info(uploadList)

    const result = validation.validate(uploadList, defaultCsvData)

    logger.info('==================')
    logger.info(result)

    // アップロードデータの配列
    // uploadList = setRows(uploadData)
  } catch (error) {
    logger.error({ stack: error.stack }, error.name)
    return 104
  }

  return 100
}

const pdfInvoiceCsvUploadResult = async (req, res, next) => {
  if (!req.user) return next(errorHelper.create(500)) // UTのエラー対策
  logger.info(constantsDefine.logMessage.INF000 + 'pdfInvoiceCsvUploadResult')

  const csvuploadResultArr = []
  // const result = await invoiceController.findforTenant(req.user.tenantId)

  try {
    // const timeStamp = (date) => {
    //   const now = new Date(date)
    //   const year = now.getFullYear()
    //   const month = now.getMonth() + 1 < 10 ? '0' + (now.getMonth() + 1) : now.getMonth() + 1
    //   const day = now.getDate() < 10 ? '0' + now.getDate() : now.getDate()
    //   const hour = now.getHours() < 10 ? '0' + now.getHours() : now.getHours()
    //   const min = now.getMinutes() < 10 ? '0' + now.getMinutes() : now.getMinutes()
    //   const sec = now.getSeconds() < 10 ? '0' + now.getSeconds() : now.getSeconds()
    //   const stamp = `${year}/${month}/${day} ${hour}:${min}:${sec}`
    //   return stamp
    // }
    // result.map((currVal, index) => {
    //   const invoice = currVal
    //   const invoiceAll =
    //     ~~invoice.dataValues.successCount + ~~invoice.dataValues.skipCount + ~~invoice.dataValues.failCount
    //   let status = false
    //   if (~~invoice.dataValues.failCount === 0 && invoice.dataValues.failCount !== '-' && invoiceAll !== 0) {
    //     status = true
    //   }
    //   csvuploadResultArr.push({
    //     index: index + 1,
    //     date: timeStamp(invoice.dataValues.updatedAt),
    //     filename: invoice.dataValues.csvFileName,
    //     invoicesAll: invoiceAll,
    //     invoicesCount: invoice.dataValues.invoiceCount,
    //     invoicesSuccess: invoice.dataValues.successCount,
    //     invoicesSkip: invoice.dataValues.skipCount,
    //     invoicesFail: invoice.dataValues.failCount,
    //     status: status,
    //     invoiceId: invoice.dataValues.invoicesId
    //   })
    //   return ''
    // })
  } catch (error) {
    logger.error({ page: 'csvuploadResult', msg: '請求書を取得失敗しました。' })
    logger.error(error)
  }

  res.render('pdfInvoiceCsvUploadResult', {
    title: '取込結果一覧',
    engTitle: 'Result LIST',
    csvuploadResultArr: csvuploadResultArr
  })

  logger.info(constantsDefine.logMessage.INF001 + 'pdfInvoiceCsvUpload')
}

router.get('/', helper.bcdAuthenticate, pdfInvoiceCsvUploadIndex)
router.post('/upload', helper.bcdAuthenticate, upload.single('csvFile'), pdfInvoiceCsvUpload)
router.get('/resultList', helper.bcdAuthenticate, pdfInvoiceCsvUploadResult)

module.exports = {
  router,
  pdfInvoiceCsvUploadIndex,
  pdfInvoiceCsvUpload,
  pdfInvoiceCsvUploadResult
}
