'use strict'
const express = require('express')
const router = express.Router()
const fs = require('fs')
const path = require('path')

const multer = require('multer')
const upload = multer({ storage: multer.memoryStorage() })
const helper = require('./helpers/middleware')
const errorHelper = require('./helpers/error')
const logger = require('../lib/logger')
const validation = require('../lib/pdfInvoiceCsvUpdateValidation')
const constantsDefine = require('../constants')

const uploadController = require('../controllers/pdfInvoiceUploadController.js')
const uploadDetailController = require('../controllers/pdfInvoiceUploadDetailController.js')

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
  const uploadFileData = req.file.buffer.toString('UTF-8')
  const userToken = {
    accessToken: req.user.accessToken,
    refreshToken: req.user.refreshToken
  }

  // メッセージを格納
  let message = constantsDefine.statusConstants.SUCCESS
  let isErr = false

  // DB登録
  const resultInvoice = await uploadController.insert({
    invoiceUploadId: uuidv4(),
    tenantId: req.user.tenantId,
    csvFileName: req.file.originalname,
    successCount: '-',
    failCount: '-',
    skipCount: '-'
  })

  if (!resultInvoice?.dataValues) {
    logger.info(`${constantsDefine.logMessage.DBINF001}${functionName}`)
  }

  // validateチェック
  const valResult = await validate(uploadFileData)

  if (valResult.size !== 0) {
    if (valResult[0] === 104) {
      message = constantsDefine.statusConstants.INVOICE_VALIDATE_FAILED

      // 結果一覧画面に遷移
      return res.redirect('/pdfInvoiceCsvUpload', message)
    }

    // validate結果登録
    const failCnt = await validateResultInsert(valResult, resultInvoice.invoiceUploadId, userToken, req, res)
    if (failCnt > 0) {
      isErr = true
    }
  }

  logger.info(constantsDefine.logMessage.INF001 + 'cbPostUpload')

  if (isErr) {
    // 結果一覧画面に遷移
    return res.redirect('pdfInvoiceCsvUpload/resultList', message)
  } else {
    // ドラフト一覧画面に遷移
    return res.redirect(200, 'pdfInvoices/list', message)
  }
}

const validate = async (uploadFileData) => {
  logger.info(constantsDefine.logMessage.INF000 + 'validate')

  let defaultCsvData = null
  let uploadList = []

  // ファイルから請求書一括作成の時エラー例外
  try {
    // テンプレートファイル
    const defaultCsvPath = path.resolve('./public/html/PDF請求書ドラフト一括作成フォーマット.csv')
    defaultCsvData = fs
      .readFileSync(defaultCsvPath, 'utf8')
      .split(/\r?\n|\r/)[0]
      .replace(/^\ufeff/, '')
    uploadList = uploadFileData.split(/\r?\n|\r/)

    // ヘッダチェック
    if (uploadList[0] !== defaultCsvData) {
      return { line: 0, invoiceId: '-', status: -1, errorData: 'ヘッダーが指定のものと異なります。' }
    }

    logger.info(uploadList)
  } catch (error) {
    logger.error({ stack: error.stack }, error.name)
    return [104]
  }

  // 請求書ごとにまとめる
  let targetNo = ''
  const uploadData = {}
  const tmps = []

  for (let i = 1; i < uploadList.length; i++) {
    const line = uploadList[i].split(',')
    if (line[0] !== targetNo) {
      targetNo = line[0]
    }
    tmps.push(line)

    // 次の請求書番号が異なる場合
    if (i + 1 === uploadList.length || line[0] !== uploadList[i + 1].split(',')[0]) {
      uploadData[targetNo] = tmps
    }
  }
  logger.info(constantsDefine.logMessage.INF000 + 'validate')
  return await validation.validate(uploadData, defaultCsvData)
}

const validateResultInsert = async (valResult, invoicesId, req, res, next) => {
  const functionName = 'validateResultInsert'
  logger.info(`${constantsDefine.logMessage.INF000}${functionName}`)

  let successCount = 0
  let failCount = 0
  let skipCount = 0
  await valResult.forEach((result, i) => {
    if (result.status === 0) {
      successCount++
    } else if (result.status === 1) {
      skipCount++
    } else {
      failCount++
    }
  })

  // カウント登録
  await uploadController.updateCount({
    invoiceUploadId: invoicesId,
    successCount: successCount,
    failCount: failCount,
    skipCount: skipCount,
    invoiceCount: successCount + failCount + skipCount
  })

  // 詳細登録
  await detailInsert(valResult, invoicesId)
  logger.info(`${constantsDefine.logMessage.INF001}${functionName}`)

  return failCount
}

const detailInsert = async (valResult, invoicesId) => {
  // 詳細登録
  await valResult.forEach((line, i) => {
    uploadDetailController.insert({
      invoiceUploadDetailId: uuidv4(),
      invoiceUploadId: invoicesId,
      lines: line.line,
      invoiceId: line.invoiceId,
      status: line.status,
      errorData: line.errorData
    })
  })
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
