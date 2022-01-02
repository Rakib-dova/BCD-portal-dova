'use strict'
const express = require('express')
const router = express.Router()
const helper = require('./helpers/middleware')
const errorHelper = require('./helpers/error')
const noticeHelper = require('./helpers/notice')
const userController = require('../controllers/userController.js')
const contractController = require('../controllers/contractController.js')
const logger = require('../lib/logger')
const constantsDefine = require('../constants')
const validate = require('../lib/validate')
const apiManager = require('../controllers/apiManager')
const functionName = 'cbPostIndex'

const cbGetNetworkDownloadIndex = async (req, res, next) => {
  logger.info(constantsDefine.logMessage.INF000 + 'cbGetNetworkDownloadIndex')
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
  const checkContractStatus = await helper.checkContractStatus(req.user.tenantId)

  if (checkContractStatus === null || checkContractStatus === 999) {
    return next(errorHelper.create(500))
  }

  if (!validate.isStatusForCancel(contractStatus, deleteFlag)) {
    return next(noticeHelper.create('cancelprocedure'))
  }

  res.render('networkDownload', {
    title: 'ネットワーク接続状況ダウンロード'
  })
  logger.info(constantsDefine.logMessage.INF001 + 'cbGetNetworkDownloadIndex')
}

const cbPostNetworkDownloadIndex = async (req, res, next) => {
  logger.info(`${constantsDefine.logMessage.INF000}${functionName}`)
  // 認証情報取得処理
  if (!req.session || !req.user?.userId) {
    return res.status(500).send(constantsDefine.statusConstants.SYSTEMERRORMESSAGE)
  }

  // DBからuserデータ取得
  const user = await userController.findOne(req.user.userId)

  // データベースエラーは、エラーオブジェクトが返る
  // user未登録の場合もエラーを上げる
  if (user instanceof Error || user === null) {
    return res.status(500).send(constantsDefine.statusConstants.SYSTEMERRORMESSAGE)
  }
  // TX依頼後に改修、ユーザステイタスが0以外の場合、「404」エラーとする not 403
  if (user.dataValues?.userStatus !== 0) {
    return res.status(500).send(constantsDefine.statusConstants.SYSTEMERRORMESSAGE)
  }

  // DBから契約情報取得
  const contract = await contractController.findOne(req.user.tenantId)
  // データベースエラーは、エラーオブジェクトが返る
  // 契約情報未登録の場合もエラーを上げる
  if (contract instanceof Error || contract === null) {
    return res.status(500).send(constantsDefine.statusConstants.SYSTEMERRORMESSAGE)
  }

  const deleteFlag = contract.dataValues.deleteFlag
  const contractStatus = contract.dataValues.contractStatus

  const checkContractStatus = await helper.checkContractStatus(req.user.tenantId)
  if (checkContractStatus === null || checkContractStatus === 999) {
    return res.status(500).send(constantsDefine.statusConstants.SYSTEMERRORMESSAGE)
  }

  if (!validate.isStatusForCancel(contractStatus, deleteFlag)) {
    return res.status(400).send()
  }

  req.session.userContext = 'LoggedIn'
  req.session.userRole = user.dataValues?.userRole

  let pageId = 0
  let numPages = 1
  let resultForQuery
  const networkResultJsonData = []
  const networkObject = {
    テナントID: '',
    テナント名: '',
    メールアドレス: ''
  }
  let downloadCategory = 'connections'
  switch (req.body.downloadCategory) {
    case 'connections':
      downloadCategory = 'connections'
      break
    case 'pending':
      downloadCategory = 'pending'
      break
    case 'requests':
      downloadCategory = 'requests'
      break
  }

  do {
    resultForQuery = await apiManager.accessTradeshift(
      req.user.accessToken,
      req.user.refreshToken,
      'get',
      `/network/${downloadCategory}?limit=100&page=${pageId}`
    )
    numPages = resultForQuery.numPages ?? 1
    switch (req.body.downloadCategory) {
      case 'connections':
        downloadCategory = 'connections'
        break
      case 'pending':
        downloadCategory = 'pending'
        break
      case 'requests':
        downloadCategory = 'requests'
        break
    }
    if (resultForQuery instanceof Error) {
      errorHandle(resultForQuery, res, req)
    } else {
      let tenants
      switch (req.body.downloadCategory) {
        case 'connections':
        case 'pending':
          tenants = resultForQuery.Connection
          break
        case 'requests':
          tenants = resultForQuery.Items
          break
      }
      if (tenants.length === 0) {
        req.flash('noti', ['ネットワーク接続状況ダウンロード', '合致するテナント情報がありません'])
        res.redirect(303, '/networkDownload')
      } else {
        tenants.forEach((item) => {
          const network = { ...networkObject }
          switch (req.body.downloadCategory) {
            case 'connections':
              network['テナントID'] = item.CompanyAccountId
              network['テナント名'] = item.CompanyName
              network['メールアドレス'] = item.Email
              break
            case 'pending':
              network['テナントID'] = item.CompanyAccountId
              network['テナント名'] = item.CompanyName
              break
            case 'requests':
              network['テナントID'] = item.Connection.CompanyAccountId
              network['テナント名'] = item.Connection.CompanyName
              break
          }
          networkResultJsonData.push(network)
        })
      }
    }
    pageId++
  } while (pageId < numPages)
  // JSONファイルをCSVに変更
  if (networkResultJsonData.length !== 0) {
    const downloadFile = jsonToCsv(networkResultJsonData)
    // ファイル名：今日の日付_ユーザID.csv
    const today = new Date().toISOString().split('T').join().replace(',', '_').replace(/:/g, '').replace('Z', '') // yyyy-mm-dd_HHMMSS.sss
    const filename = encodeURIComponent(`${today}.csv`)
    res.set({ 'Content-Disposition': `attachment; filename=${filename}` })
    res.status(200).send(`${String.fromCharCode(0xfeff)}${downloadFile}`)
  }
  logger.info(`${constantsDefine.logMessage.INF001}${functionName}`)
}

const errorHandle = (resultForQuery, _res, _req) => {
  if (String(resultForQuery.response?.status).slice(0, 1) === '4') {
    // 400番エラーの場合
    logger.error(
      {
        tenant: _req.user.tenantId,
        user: _req.user.userId,
        downloadCategory: _req.body.downloadCategory,
        status: 2
      },
      resultForQuery.name
    )
    _req.flash('noti', ['ネットワーク接続状況ダウンロード', constantsDefine.statusConstants.CSVDOWNLOAD_APIERROR])
    _res.redirect(303, '/networkDownload')
  } else if (String(resultForQuery.response?.status).slice(0, 1) === '5') {
    // 500番エラーの場合
    logger.error(
      {
        tenant: _req.user.tenantId,
        user: _req.user.userId,
        downloadCategory: _req.body.downloadCategory,
        status: 2
      },
      resultForQuery.toString()
    )
    _req.flash('noti', ['ネットワーク接続状況ダウンロード', constantsDefine.statusConstants.CSVDOWNLOAD_SYSERROR])
    _res.redirect(303, '/networkDownload')
  }
}

const jsonToCsv = (jsonData) => {
  const jsonArray = jsonData

  let csvString = ''
  const replacer = (key, value) => (value === null ? '' : value)
  const titles = Object.keys(jsonArray[0])
  csvString = jsonArray.map((row) => titles.map((fieldName) => JSON.stringify(row[fieldName], replacer)).join(','))
  csvString.unshift(titles.join(','))
  csvString = csvString.join('\r\n')

  return csvString
}

router.get('/', helper.isAuthenticated, cbGetNetworkDownloadIndex)
router.post('/', helper.isAuthenticated, cbPostNetworkDownloadIndex)

module.exports = {
  router: router,
  cbGetNetworkDownloadIndex: cbGetNetworkDownloadIndex,
  cbPostNetworkDownloadIndex: cbPostNetworkDownloadIndex,
  errorHandle: errorHandle,
  jsonToCsv: jsonToCsv
}
