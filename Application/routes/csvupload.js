'use strict'
const express = require('express')
const fs = require('fs')
const path = require('path')
const router = express.Router()
const helper = require('./helpers/middleware')
const errorHelper = require('./helpers/error')
const noticeHelper = require('./helpers/notice')
const userController = require('../controllers/userController.js')
const contractController = require('../controllers/contractController.js')
const uploadFormatController = require('../controllers/uploadFormatController.js')
const uploadFormatDetailController = require('../controllers/uploadFormatDetailController.js')
const uploadFormatIdentifierController = require('../controllers/uploadFormatIdentifierController.js')
const logger = require('../lib/logger')
const validate = require('../lib/validate')
const apiManager = require('../controllers/apiManager')
const filePath = process.env.INVOICE_UPLOAD_PATH
const constantsDefine = require('../constants')
const { v4: uuidv4 } = require('uuid')

const bodyParser = require('body-parser')
router.use(
  bodyParser.json({
    type: 'application/json',
    limit: '6826KB'
  })
)
const BconCsv = require('../lib/bconCsv')
const BconCsvNoHeader = require('../lib/bconCsvNoHeader')

const cbGetIndex = async (req, res, next) => {
  logger.info(constantsDefine.logMessage.INF000 + 'cbGetIndex')
  // 認証情報取得処理
  if (!req.session || !req.user?.userId) {
    return next(errorHelper.create(500))
  }

  // DBからuserデータ取得
  const user = await userController.findOne(req.user.userId)
  // データベースエラーは、エラーオブジェクトが返る
  // user未登録の場合もエラーを上げる
  if (user instanceof Error || user === null) return next(errorHelper.create(500))

  // TX依頼後に改修、ユーザステイタスが0以外の場合、「404」エラーとする not 403
  if (user.dataValues?.userStatus !== 0) return next(errorHelper.create(404))

  // DBから契約情報取得
  const contract = await contractController.findOne(req.user.tenantId)
  // データベースエラーは、エラーオブジェクトが返る
  // 契約情報未登録の場合もエラーを上げる
  if (contract instanceof Error || contract === null) return next(errorHelper.create(500))

  req.session.userContext = 'LoggedIn'

  // ユーザ権限を取得
  req.session.userRole = user.dataValues?.userRole
  const deleteFlag = contract.dataValues.deleteFlag
  const contractStatus = contract.dataValues.contractStatus
  const checkContractStatus = helper.checkContractStatus

  if (checkContractStatus === null || checkContractStatus === 999) {
    return next(errorHelper.create(500))
  }

  if (!validate.isStatusForCancel(contractStatus, deleteFlag)) {
    return next(noticeHelper.create('cancelprocedure'))
  }

  // フォーマット種別配列
  const formatkindsArr = await uploadFormatController.findByContractId(contract.dataValues.contractId)

  // ユーザ権限も画面に送る
  res.render('csvupload', {
    formatkindsArr: formatkindsArr
  })
  logger.info(constantsDefine.logMessage.INF001 + 'cbGetIndex')
}

const cbPostUpload = async (req, res, next) => {
  const functionName = 'cbPostUpload'
  logger.info(`${constantsDefine.logMessage.INF000}${functionName}`)
  const invoiceController = require('../controllers/invoiceController')
  if (!req.session || !req.user?.userId) {
    setErrorLog(req, 500)
    return res.status(500).send(constantsDefine.statusConstants.SYSTEMERRORMESSAGE)
  }

  const user = await userController.findOne(req.user.userId)

  if (user instanceof Error || user === null) {
    setErrorLog(req, 500)
    return res.status(500).send(constantsDefine.statusConstants.SYSTEMERRORMESSAGE)
  }
  if (user.dataValues?.userStatus !== 0) {
    setErrorLog(req, 500)
    return res.status(500).send(constantsDefine.statusConstants.SYSTEMERRORMESSAGE)
  }

  // DBから契約情報取得
  const contract = await contractController.findOne(req.user.tenantId)
  // データベースエラーは、エラーオブジェクトが返る
  // 契約情報未登録の場合もエラーを上げる
  if (contract instanceof Error || contract === null) {
    setErrorLog(req, 500)
    return res.status(500).send(constantsDefine.statusConstants.SYSTEMERRORMESSAGE)
  }

  const deleteFlag = contract.dataValues.deleteFlag
  const contractStatus = contract.dataValues.contractStatus

  const checkContractStatus = helper.checkContractStatus
  if (checkContractStatus === null || checkContractStatus === 999) {
    setErrorLog(req, 500)
    return res.status(500).send(constantsDefine.statusConstants.SYSTEMERRORMESSAGE)
  }

  if (!validate.isStatusForCancel(contractStatus, deleteFlag)) {
    return res.status(400).send()
  }

  req.session.userContext = 'LoggedIn'
  req.session.userRole = user.dataValues?.userRole

  // CSVfile 読み込む
  const filename = req.user.tenantId + '_' + req.user.email + '_' + getTimeStamp() + '.csv'
  const uploadCsvData = Buffer.from(decodeURIComponent(req.body.fileData), 'base64').toString('utf8')
  const userToken = {
    accessToken: req.user.accessToken,
    refreshToken: req.user.refreshToken
  }

  // エラーメッセージを格納
  let errorText = null
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

  if (errorText === null) return res.status(200).send(constantsDefine.statusConstants.SUCCESS)

  return res.status(200).send(errorText)
}

// csvアップロード
const cbUploadCsv = (_filePath, _filename, _uploadCsvData) => {
  logger.info(constantsDefine.logMessage.INF000 + 'cbPostUploadCsv')
  const uploadPath = path.join(_filePath, '/')
  const filename = _filename
  const uploadData = _uploadCsvData
  const writeFile = () => {
    fs.writeFileSync(uploadPath + filename, uploadData, 'utf8')
  }
  try {
    // ユーザディレクトリが存在すること確認
    if (fs.existsSync(uploadPath)) {
      // ユーザディレクトリが存在している場合、CSVファイルを保存する
      writeFile()
      logger.info(constantsDefine.logMessage.INF001 + 'cbPostUploadCsv')
      return true
    } else {
      // ユーザディレクトリが存在しない場合、ユーザディレクトリ作成
      fs.mkdirSync(uploadPath)
      writeFile()
      logger.info(constantsDefine.logMessage.INF001 + 'cbPostUploadCsv')
      return true
    }
  } catch (error) {
    return false
  }
}

// CSVファイル削除機能
const cbRemoveCsv = (_deleteDataPath, _filename) => {
  logger.info(constantsDefine.logMessage.INF000 + 'cbRemoveCsv')
  const deleteFile = path.join(_deleteDataPath, '/' + _filename)

  if (fs.existsSync(deleteFile)) {
    try {
      fs.unlinkSync(deleteFile)
      logger.info(constantsDefine.logMessage.INF001 + 'cbRemoveCsv')
      return true
    } catch (error) {
      logger.info(constantsDefine.logMessage.INF001 + 'cbRemoveCsv')
      return false
    }
  } else {
    // 削除対象がない場合、サーバーエラー画面表示
    logger.info(constantsDefine.logMessage.INF001 + 'cbRemoveCsv')
    return false
  }
}

const cbExtractInvoice = async (_extractDir, _filename, _user, _invoices, _req, _res) => {
  logger.info(constantsDefine.logMessage.INF000 + 'cbExtractInvoice')
  const invoiceController = require('../controllers/invoiceController')
  const invoiceDetailController = require('../controllers/invoiceDetailController')
  const extractFullpathFile = path.join(_extractDir, '/') + _filename
  const uploadFormatId = _req.body.uploadFormatId
  let formatFlag = false
  let itemRowNumber = 1
  let dataRowNumber = 2
  let uploadFormatDetail = []
  let uploadFormatIdentifier = []
  let uploadData = null

  // ユーザーがアップロードしたフォーマットでCSVをアップロードする時
  if (uploadFormatId !== null && uploadFormatId.length !== 0) {
    formatFlag = true

    uploadFormatDetail = await uploadFormatDetailController.findByUploadFormatId(uploadFormatId)

    // DBエラー（uploadFormatDetail）の場合
    if (uploadFormatDetail instanceof Error || uploadFormatDetail === null) {
      setErrorLog(_req, 500)
      return _res.status(500).send(constantsDefine.statusConstants.SYSTEMERRORMESSAGE)
    }

    if (uploadFormatDetail.length === 0) {
      uploadFormatDetail = []
    }

    uploadFormatIdentifier = await uploadFormatIdentifierController.findByUploadFormatId(uploadFormatId)

    // DBエラー（uploadFormatIdentifier）の場合
    if (uploadFormatIdentifier instanceof Error || uploadFormatIdentifier === null) {
      setErrorLog(_req, 500)
      return _res.status(500).send(constantsDefine.statusConstants.SYSTEMERRORMESSAGE)
    }

    if (uploadFormatIdentifier.length === 0) {
      uploadFormatIdentifier = []
    }

    const uploadFormat = await uploadFormatController.findUploadFormat(uploadFormatId)

    // DBエラー（uploadFormat）の場合
    if (uploadFormat instanceof Error || uploadFormat === null) {
      setErrorLog(_req, 500)
      return _res.status(500).send(constantsDefine.statusConstants.SYSTEMERRORMESSAGE)
    }

    // ヘッダ確認用データ
    uploadData = uploadFormat.uploadData

    // ここにヘッダー行目のチェック追加
    itemRowNumber = uploadFormat.dataValues.itemRowNo
    dataRowNumber = uploadFormat.dataValues.dataStartRowNo
  }
  let csvObj = null

  // ファイルから請求書一括作成の時エラー例外
  try {
    // ヘッダがない場合
    if (itemRowNumber === 0) {
      csvObj = new BconCsvNoHeader(
        extractFullpathFile,
        formatFlag,
        uploadFormatDetail,
        uploadFormatIdentifier,
        itemRowNumber
      )
    } else {
      const defaultCsvPath = path.resolve('./public/html/請求書一括作成フォーマット.csv')
      uploadData = uploadData ?? fs.readFileSync(defaultCsvPath)
      csvObj = new BconCsv(extractFullpathFile, formatFlag, uploadFormatDetail, uploadFormatIdentifier, uploadData)
    }
  } catch (error) {
    logger.error({ stack: error.stack }, error.name)
    return 104
  }

  const invoiceList = csvObj.getInvoiceList()
  const invoiceCnt = invoiceList.length
  const setHeaders = {}
  setHeaders.Accepts = 'application/json'
  setHeaders.Authorization = `Bearer ${_user.accessToken}`
  setHeaders['Content-Type'] = 'application/json'

  // 明細表示フラグ
  let meisaiFlag = 0
  // 結果表示フラグ
  let resultFlag = 0
  if (validate.isUndefined(_invoices)) {
    return 101
  }

  // トレードシフトからドキュメントを取得
  let documentsList
  const documentIds = []
  let numPages
  let currPage
  let documentsURL = '/documents?stag=draft&stag=outbox&limit=10000'
  try {
    do {
      if (Object.prototype.toString.call(currPage) !== '[object Undefined]') {
        currPage++
        documentsURL = `/documents?stag=draft&stag=outbox&limit=10000&page=${currPage}`
      }
      documentsList = await apiManager.accessTradeshift(_user.accessToken, _user.refreshToken, 'get', documentsURL)
      documentsList.Document.forEach((document) => {
        documentIds.push(document.ID)
      })
      numPages = documentsList.numPages
      currPage = documentsList.pageId
    } while (currPage < numPages)
  } catch (err) {
    if (documentsList instanceof Error) {
      // apiエラーの場合
      logger.error(
        {
          tenant: _req.user.tenantId,
          user: _req.user.userId,
          csvfile: extractFullpathFile,
          status: 2
        },
        documentsList.toString()
      )
      return 104
    } else {
      logger.error(err)
      return 104
    }
  }
  if (invoiceCnt > 100) {
    logger.error(constantsDefine.logMessage.ERR001 + 'invoiceToomuch Error')
    await invoiceController.updateCount({
      invoicesId: _invoices.invoicesId,
      successCount: '-',
      failCount: '-',
      skipCount: '-',
      invoiceCount: '0'
    })
    return 101
  }

  let idx = 0
  let successCount = 0
  let failCount = 0
  let skipCount = 0
  let uploadInvoiceCnt = 0
  let headerErrorFlag = 0

  while (invoiceList[idx]) {
    // 明細check
    const meisaiLength = invoiceList[idx].INVOICE.getDocument().InvoiceLine.length

    meisaiFlag = 0

    if (meisaiLength > 200) {
      logger.error(
        constantsDefine.logMessage.ERR001 + invoiceList[idx].INVOICE.getDocument().ID.value + ' - specificToomuch Error'
      )
      failCount += meisaiLength
      meisaiFlag = 1
      resultFlag = 1
      const invoiceLines = invoiceList[idx].INVOICE.getDocument().InvoiceLine
      const invoiceId = invoiceList[idx].invoiceId
      const status = -1
      const errorData = '明細数の上限を超えています。'
      const lines = invoiceList[idx].lines
      invoiceLines.map((ele, idx) => {
        invoiceDetailController.insert({
          invoiceDetailId: uuidv4(),
          invoicesId: _invoices.invoicesId,
          invoiceId: invoiceId,
          lines: lines + idx,
          status: status,
          errorData: errorData
        })
        return ''
      })
    } else {
      // アップロードするドキュメントが重複のチェック
      const docNo = invoiceList[idx].INVOICE.getDocument().ID.value
      documentIds.forEach((id) => {
        if (docNo === id && invoiceList[idx].status !== -1) {
          invoiceList[idx].status = 2
        }
      })

      let apiResult
      switch (invoiceList[idx].status) {
        case 0:
          apiResult = await apiManager.accessTradeshift(
            _user.accessToken,
            _user.refreshToken,
            'put',
            '/documents/' +
              invoiceList[idx].INVOICE.getDocumentId() +
              '?draft=true&documentProfileId=tradeshift.invoice.1.0',
            JSON.stringify(invoiceList[idx].INVOICE.getDocument()),
            {
              headers: setHeaders
            }
          )

          if (!(apiResult instanceof Error)) {
            successCount += invoiceList[idx].successCount
            uploadInvoiceCnt++
          } else {
            // apiエラーの場合、すべて失敗にカウントする
            meisaiFlag = 4
            resultFlag = 4
            failCount += invoiceList[idx].successCount
            invoiceList[idx].status = -1
            if (String(apiResult.response?.status).slice(0, 1) === '4') {
              // 400番エラーの場合
              invoiceList[idx].errorData = constantsDefine.invoiceErrMsg.APIERROR

              logger.error(
                {
                  tenant: _req.user.tenantId,
                  user: _req.user.userId,
                  csvfile: extractFullpathFile,
                  invoiceID: invoiceList[idx].invoiceId,
                  status: 2
                },
                apiResult.toString()
              )
            } else if (String(apiResult.response?.status).slice(0, 1) === '5') {
              // 500番エラーの場合
              invoiceList[idx].errorData = constantsDefine.invoiceErrMsg.SYSERROR

              logger.error(
                {
                  tenant: _req.user.tenantId,
                  user: _req.user.userId,
                  csvfile: extractFullpathFile,
                  invoiceID: invoiceList[idx].invoiceId,
                  status: 2
                },
                apiResult.toString()
              )
            }
          }

          break
        // 請求書の重複
        case 1:
          meisaiFlag = 2
          resultFlag = 2
          invoiceList[idx].errorData = constantsDefine.invoiceErrMsg.SKIP
          skipCount += invoiceList[idx].skipCount
          break
        // アップロードの重複
        case 2:
          meisaiFlag = 2
          resultFlag = 2
          invoiceList[idx].errorData = constantsDefine.invoiceErrMsg.SKIP
          skipCount += meisaiLength
          invoiceList[idx].status = 1
          break
        case -1:
          meisaiFlag = 3
          resultFlag = 3
          failCount += invoiceList[idx].failCount
          break
      }

      const invoiceLines = invoiceList[idx].INVOICE.getDocument().InvoiceLine
      const invoiceId = invoiceList[idx].invoiceId
      const status = invoiceList[idx].status
      const errorData = invoiceList[idx].error
      const lines = invoiceList[idx].lines
      let messageIdx = 0

      // ヘッダ行目チェック
      if (itemRowNumber === 1) {
        if (invoiceList[idx].lines !== 0) {
          messageIdx = invoiceList[idx].lines - 1
        } else {
          messageIdx = invoiceList[idx].lines
          headerErrorFlag = 1
        }
      } else {
        if (errorData[0].errorData === constantsDefine.invoiceErrMsg.HEADERERR000) {
          messageIdx = 0
          headerErrorFlag = 1
        } else {
          messageIdx = 0
        }
      }

      if (meisaiFlag === 2) {
        const errorDataSkip = invoiceList[idx].errorData
        invoiceLines.map((ele, idx) => {
          invoiceDetailController.insert({
            invoiceDetailId: uuidv4(),
            invoicesId: _invoices.invoicesId,
            invoiceId: invoiceId,
            lines: lines + idx,
            status: status,
            errorData: errorDataSkip
          })
          return ''
        })
      } else if (meisaiFlag === 4) {
        const errorDataErr = invoiceList[idx].errorData
        invoiceLines.map((ele, idx) => {
          invoiceDetailController.insert({
            invoiceDetailId: uuidv4(),
            invoicesId: _invoices.invoicesId,
            invoiceId: invoiceId,
            lines: lines + idx,
            status: status,
            errorData: errorDataErr
          })
          return ''
        })
      } else {
        invoiceLines.map((ele, idx) => {
          let errorLines = 0
          if (headerErrorFlag !== 1) {
            if (formatFlag && dataRowNumber !== 2) {
              errorLines = dataRowNumber + idx
            } else {
              errorLines = lines + idx
            }
          }
          invoiceDetailController.insert({
            invoiceDetailId: uuidv4(),
            invoicesId: _invoices.invoicesId,
            invoiceId: invoiceId,
            lines: errorLines,
            status: status,
            errorData: errorData[messageIdx + idx].errorData
          })
          return ''
        })
      }
    }
    idx++
  }
  if (headerErrorFlag === 1) {
    await invoiceController.updateCount({
      invoicesId: _invoices.invoicesId,
      successCount: '-',
      failCount: '-',
      skipCount: '-',
      invoiceCount: '0'
    })
  } else {
    await invoiceController.updateCount({
      invoicesId: _invoices.invoicesId,
      successCount: successCount,
      failCount: failCount,
      skipCount: skipCount,
      invoiceCount: uploadInvoiceCnt
    })
  }

  logger.info(constantsDefine.logMessage.INF001 + 'cbExtractInvoice')

  switch (resultFlag) {
    case 1:
      return 102
    case 2:
      return 103
    case 3:
      return 104
    case 4:
      return 104
    default:
      return 0
  }
}

const getTimeStamp = () => {
  logger.info(constantsDefine.logMessage.INF000 + 'getTimeStamp')
  const now = new Date()
  const stamp =
    now.getFullYear() +
    (now.getMonth() + 1 < 10 ? '0' + (now.getMonth() + 1) : now.getMonth() + 1) +
    (now.getDate() < 10 ? '0' + now.getDate() : now.getDate()) +
    (now.getHours() < 10 ? '0' + now.getHours() : now.getHours()) +
    (now.getMinutes() < 10 ? '0' + now.getMinutes() : now.getMinutes()) +
    (now.getSeconds() < 10 ? '0' + now.getSeconds() : now.getSeconds()) +
    (now.getMilliseconds() < 10 ? '0' + now.getMilliseconds() : now.getMilliseconds())
  logger.info(constantsDefine.logMessage.INF001 + 'getTimeStamp')
  return stamp
}

// 会社のネットワーク情報を取得
const getNetwork = async (_req) => {
  const connections = []
  let numPages
  let currPage
  let documentsURL = '/network?limit=100'
  do {
    if (Object.prototype.toString.call(currPage) !== '[object Undefined]') {
      currPage++
      documentsURL = `/network?limit=100&page=${currPage}`
    }
    let result
    try {
      result = await apiManager.accessTradeshift(_req.user.accessToken, _req.user.refreshToken, 'get', documentsURL)
      result.Connections.Connection.forEach((connection) => {
        if (
          Object.prototype.toString.call(connection.State) !== '[object Undefined]' &&
          connection.State === 'ACCEPTED'
        ) {
          connections.push(connection.CompanyAccountId)
        }
      })
    } catch (err) {
      if (result instanceof Error) {
        // apiエラーの場合
        logger.error(
          {
            tenant: _req.user.tenantId,
            user: _req.user.userId,
            status: 2
          },
          result.toString()
        )
        return
      } else {
        logger.error(err)
        return
      }
    }

    numPages = result.numPages
    currPage = result.pageId
  } while (currPage < numPages)

  return connections
}

const setErrorLog = async (req, errorCode) => {
  const err = errorHelper.create(errorCode)
  const errorStatus = err.status

  // output log
  // ログには生のエラー情報を吐く
  const logMessage = { status: errorStatus, path: req.path }

  // ログインしていればユーザID、テナントIDを吐く
  if (req.user?.userId && req.user?.tenantId) {
    logMessage.tenant = req.user.tenantId
    logMessage.user = req.user.userId
  }

  logMessage.stack = err.stack

  logger.error(logMessage, err.name)
}

router.get('/', helper.isAuthenticated, cbGetIndex)
router.post('/', helper.isAuthenticated, cbPostUpload)

module.exports = {
  router: router,
  cbGetIndex: cbGetIndex,
  cbPostUpload: cbPostUpload,
  cbUploadCsv: cbUploadCsv,
  cbRemoveCsv: cbRemoveCsv,
  cbExtractInvoice: cbExtractInvoice,
  getTimeStamp: getTimeStamp,
  getNetwork: getNetwork
}
