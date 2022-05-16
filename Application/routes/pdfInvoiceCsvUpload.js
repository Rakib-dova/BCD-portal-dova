'use strict'
const express = require('express')
const router = express.Router()
const axios = require('axios')
const multer = require('multer')
const upload = multer({ storage: multer.memoryStorage() })
const { v4: uuidV4 } = require('uuid')
const helper = require('./helpers/middleware')
const errorHelper = require('./helpers/error')
const logger = require('../lib/logger')
const constantsDefine = require('../constants')
const csvupload = require('../routes/csvupload')

const apiManager = require('../controllers/apiManager')
const pdfInvoiceController = require('../controllers/pdfInvoiceController.js')
const { generatePdf, renderInvoiceHTML } = require('../lib/pdfGenerator')
const FileType = require('file-type')

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
  if (!req.user) return next(errorHelper.create(500)) // UTのエラー対策
  logger.info(constantsDefine.logMessage.INF000 + 'pdfInvoiceCsvUpload')

  // CSVfile 読み込む
  const filename = req.user.tenantId + '_' + req.user.email + '_' + csvupload.getTimeStamp() + '.csv'
  const uploadCsvData = Buffer.from(decodeURIComponent(req.body.fileData), 'base64').toString('utf8')
  const userToken = {
    accessToken: req.user.accessToken,
    refreshToken: req.user.refreshToken
  }

  // エラーメッセージを格納
  let errorText = constantsDefine.statusConstants.SUCCESS
  // ネットワークテナントID取得時エラー確認
  let getNetworkErrFlag = false

  // csvアップロード
  if (cbUploadCsv(filePath, filename, uploadCsvData) === false) {
    setErrorLog(req, 500)
    return res.status(500).send(constantsDefine.statusConstants.SYSTEMERRORMESSAGE)
  }

  const resultInvoice = await invoiceController.insert({
    invoicesId: uuidv4(),
    tenantId: req.user.tenantId,
    csvFileName: req.body.filename,
    successCount: '-',
    failCount: '-',
    skipCount: '-'
  })

  if (!resultInvoice?.dataValues) {
    logger.info(`${constantsDefine.logMessage.DBINF001}${functionName}`)
  }

  // ネットワークが紐づいているテナントid検索
  BconCsv.prototype.companyNetworkConnectionList = await getNetwork(req)

  // ネットワークが紐づいているテナントid確認
  if (validate.isUndefined(BconCsv.prototype.companyNetworkConnectionList)) {
    getNetworkErrFlag = false
    errorText = constantsDefine.statusConstants.INVOICE_VALIDATE_FAILED
  } else {
    getNetworkErrFlag = true
    // ヘッダがない場合
    BconCsvNoHeader.prototype.companyNetworkConnectionList = BconCsv.prototype.companyNetworkConnectionList
  }

  if (getNetworkErrFlag) {
    // csvからデータ抽出
    switch (await cbExtractInvoice(filePath, filename, userToken, resultInvoice?.dataValues, req, res)) {
      case 101:
        errorText = constantsDefine.statusConstants.INVOICE_FAILED
        break
      case 102:
        errorText = constantsDefine.statusConstants.OVER_SPECIFICATION
        break
      case 103:
        errorText = constantsDefine.statusConstants.OVERLAPPED_INVOICE
        break
      case 104:
        errorText = constantsDefine.statusConstants.INVOICE_VALIDATE_FAILED
        break
      default:
        break
    }
  }
  // csv削除
  if (cbRemoveCsv(filePath, filename) === false) {
    setErrorLog(req, 500)
    return res.status(500).send(constantsDefine.statusConstants.SYSTEMERRORMESSAGE)
  }

  logger.info(constantsDefine.logMessage.INF001 + 'cbPostUpload')

  return res.status(200).send(errorText)
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
router.get('/upload', helper.bcdAuthenticate, pdfInvoiceCsvUpload)
router.get('/result', helper.bcdAuthenticate, pdfInvoiceCsvUploadResult)

module.exports = {
  router,
  pdfInvoiceCsvUploadIndex,
  pdfInvoiceCsvUpload,
  pdfInvoiceCsvUploadResult
}
