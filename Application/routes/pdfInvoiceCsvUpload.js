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
const pdfInvoiceController = require('../controllers/pdfInvoiceController.js')
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
  const uploadFileData = req.file.buffer.toString('UTF-8')
  const uploadLines = uploadFileData.split(/\r?\n|\r/)

  // 空データの登録
  const resultInvoice = await uploadController.create({
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

  // ヘッダーチェック
  const headerResult = await validateHeader(uploadLines)
  if (headerResult.size !== 0) {
    if (headerResult[0] === 104) {
      return res.redirect('/pdfInvoiceCsvUpload')
    } else {
      return res.redirect('/pdfInvoiceCsvUpload')
    }
  }
  // アップロードデータ作成
  const uploadData = await createUploadData(uploadLines)

  // バリデーションチェック
  const valResults = validation.validate(uploadData)
  // 請求書情報カウント
  let successCount = 0
  let failCount = 0
  let skipCount = 0
  await valResults.forEach((result, i) => {
    if (result.status === 0) {
      successCount++
    } else if (result.status === 1) {
      skipCount++
    } else {
      failCount++
    }
  })

  // バリデーションチェック結果登録
  const failCnt = await validateResultInsert(
    valResults,
    resultInvoice.invoiceUploadId,
    successCount,
    skipCount,
    failCount
  )
  if (failCnt > 0) {
    logger.info(`${constantsDefine.logMessage.INF001}${functionName}`)
    // バリデーションエラー：結果一覧画面に遷移

    return res.redirect('/pdfInvoiceCsvUpload/resultList')
  }

  // 明細書作成
  const isErr = await createInvoice(uploadData, req, next)

  logger.info(`${constantsDefine.logMessage.INF001}${functionName}`)
  if (isErr) {
    // エラー：リダイレクト
    return res.status(200).send(constantsDefine.statusConstants.INVOICE_VALIDATE_FAILED)
  }
  // ドラフト一覧画面に遷移
  return res.status(200).send(constantsDefine.statusConstants.SUCCESS)
}

const createInvoice = async (uploadData, req, next) => {
  const functionName = 'createInvoice'
  logger.info(`${constantsDefine.logMessage.INF000}${functionName}`)
  let errFlg = false

  // アカウント情報取得
  const { accountInfo, senderInfo } = await pdfInvoice.getAccountAndSenderInfo(req)

  if (!accountInfo || !senderInfo) return next(errorHelper.create(500))

  for (const key in uploadData) {
    const uploadLines = uploadData[key]

    const invoiceId = uuidv4()

    // 請求書情報
    const invoice = await validation.createInvoiceObj(uploadLines[0])
    invoice.invoiceId = invoiceId
    invoice.sendTenantId = req.user.tenantId
    invoice.sendCompany = senderInfo.sendCompany
    invoice.sendPost = senderInfo.sendPost
    invoice.sendAddr1 = senderInfo.sendAddr1
    invoice.sendAddr2 = senderInfo.sendAddr2
    invoice.sendAddr3 = senderInfo.sendAddr3
    invoice.currency = 'JPY'

    // 明細情報
    const lines = []
    uploadLines.forEach((uploadline, i) => {
      const line = validation.createInvoiceObj(uploadline)
      line.invoiceId = invoiceId
      line.lineIndex = i
      lines.push(line)
    })

    try {
      const createdInvoice = await pdfInvoiceController.createInvoice(invoice, lines, null)
      if (!createdInvoice || createdInvoice < 1) {
        errFlg = true
      }
    } catch (error) {
      logger.error({ stack: error.stack }, error.name)
      errFlg = true
    }
  }
  logger.info(`${constantsDefine.logMessage.INF001}${functionName}`)
  return errFlg
}

const validateHeader = async (uploadLines) => {
  const functionName = 'validateHeader'
  logger.info(`${constantsDefine.logMessage.INF000}${functionName}`)

  // ファイルから請求書一括作成の時エラー例外
  try {
    // テンプレートファイル
    const defaultCsvPath = path.resolve('./public/html/PDF請求書ドラフト一括作成フォーマット.csv')
    const defaultCsvData = fs
      .readFileSync(defaultCsvPath, 'utf8')
      .split(/\r?\n|\r/)[0]
      .replace(/^\ufeff/, '')

    // ヘッダチェック
    if (uploadLines[0] !== defaultCsvData) {
      return [{ line: 0, invoiceId: '-', status: -1, errorData: 'ヘッダーが指定のものと異なります。' }]
    }
  } catch (error) {
    logger.error({ stack: error.stack }, error.name)
    return [104]
  }
  logger.info(`${constantsDefine.logMessage.INF001}${functionName}`)
  return null
}

const createUploadData = async (uploadLines) => {
  const functionName = 'createUploadData'
  logger.info(`${constantsDefine.logMessage.INF000}${functionName}`)

  // 請求書ごとにまとめる
  let targetNo = ''
  const uploadData = {}
  let tmps = []

  for (let i = 1; i < uploadLines.length; i++) {
    const line = uploadLines[i].split(',')
    if (line[0] !== targetNo) {
      targetNo = line[0]
    }
    tmps.push(line)

    // 次の請求書番号が異なる場合
    if (i + 1 === uploadLines.length || line[0] !== uploadLines[i + 1].split(',')[0]) {
      uploadData[targetNo] = tmps
      tmps = []
    }
  }
  logger.info(`${constantsDefine.logMessage.INF001}${functionName}`)
  return uploadData
}

const validateResultInsert = async (valResults, invoicesId, successCount, skipCount, failCount) => {
  const functionName = 'validateResultInsert'
  logger.info(`${constantsDefine.logMessage.INF000}${functionName}`)

  // カウント登録
  await uploadController.updateCount({
    invoiceUploadId: invoicesId,
    successCount: successCount,
    failCount: failCount,
    skipCount: skipCount,
    invoiceCount: successCount
  })

  // 詳細登録
  await valResults.forEach((result, i) => {
    uploadDetailController.create({
      invoiceUploadDetailId: uuidv4(),
      invoiceUploadId: invoicesId,
      lines: result.line,
      invoiceId: result.invoiceId,
      status: result.status,
      errorData: result.errorData
    })
  })

  logger.info(`${constantsDefine.logMessage.INF001}${functionName}`)
  return failCount
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
    result.map((currVal, index) => {
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
      return ''
    })

    logger.info(resultArr)
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
        invoiceId: invoiceDetail.dataValues.invoiceId,
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

router.get('/', helper.bcdAuthenticate, pdfInvoiceCsvUploadIndex)
router.post('/upload', helper.bcdAuthenticate, upload.single('csvFile'), pdfInvoiceCsvUpload)
router.get('/resultList', helper.bcdAuthenticate, pdfInvoiceCsvUploadResult)
router.get('/resultList/detail/:invoiceUploadId', helper.bcdAuthenticate, pdfInvoiceCsvUploadResultDetail)

module.exports = {
  router,
  pdfInvoiceCsvUploadIndex,
  pdfInvoiceCsvUpload,
  pdfInvoiceCsvUploadResult
}
