'use strict'
const express = require('express')
const router = express.Router()
const helper = require('./helpers/middleware')
const errorHelper = require('./helpers/error')
const noticeHelper = require('./helpers/notice')
const userController = require('../controllers/userController.js')
const contractController = require('../controllers/contractController.js')
const logger = require('../lib/logger')
const validate = require('../lib/validate')
const constantsDefine = require('../constants')
const invoiceController = require('../controllers/invoiceController')
const invoiceDetailController = require('../controllers/invoiceDetailController')

const bodyParser = require('body-parser')
router.use(
  bodyParser.json({
    type: 'application/json',
    limit: '100KB'
  })
)

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

  if (!validate.isStatusForCancel(contractStatus, deleteFlag)) {
    return next(noticeHelper.create('cancelprocedure'))
  }
  // ユーザ権限も画面に送る
  const testData = [
    { item: 'AAA', value: 'aaa' },
    { item: 'BBB', value: 'bbb' },
    { item: 'CCC', value: 'ccc' },
    { item: 'DDD', value: 'ddd' },
    { item: 'EEE', value: 'eee' },
    { item: 'FFF', value: 'fff' },
    { item: 'GGG', value: 'ggg' },
    { item: 'HHH', value: 'hhh' },
    { item: 'III', value: 'iii' },
    { item: 'JJJ', value: 'jjj' },
    { item: 'KKK', value: 'kkk' },
    { item: 'LLL', value: 'lll' },
    { item: 'MMM', value: 'mmm' },
    { item: 'NNN', value: 'nnn' },
    { item: 'OOO', value: 'ooo' },
    { item: 'PPP', value: 'ppp' },
    { item: 'QQQ', value: 'qqq' },
    { item: 'RRR', value: 'rrr' },
    { item: 'SSS', value: 'sss' }
  ]
  res.render('uploadFormat', {
    testData: testData
  })
  logger.info(constantsDefine.logMessage.INF001 + 'cbGetIndex')
}

const cbPostIndex = async (req, res, next) => {
  logger.info(constantsDefine.logMessage.INF000 + 'cbPostIndex')
  // let resultStatusCode
  // let invoicesId
  // if (!req.session || !req.user?.userId) {
  //   resultStatusCode = 403
  //   return res.status(resultStatusCode).send()
  // }

  // if (req.body.invoicsesId === undefined) {
  //   resultStatusCode = 400
  //   return res.status(resultStatusCode).send()
  // } else {
  //   invoicesId = req.body.invoicsesId
  // }

  // if (!validate.isUUID(invoicesId)) {
  //   resultStatusCode = 400
  //   return res.status(resultStatusCode).send()
  // }

  // // DBからuserデータ取得
  // const user = await userController.findOne(req.user.userId)
  // // データベースエラーは、エラーオブジェクトが返る
  // // user未登録の場合もエラーを上げる
  // if (user instanceof Error || user === null) return next(errorHelper.create(500))

  // // TX依頼後に改修、ユーザステイタスが0以外の場合、「404」エラーとする not 403
  // if (user.dataValues?.userStatus !== 0) return next(errorHelper.create(404))

  // // DBから契約情報取得
  // const contract = await contractController.findOne(req.user.tenantId)
  // // データベースエラーは、エラーオブジェクトが返る
  // // 契約情報未登録の場合もエラーを上げる
  // if (contract instanceof Error || contract === null) return next(errorHelper.create(500))

  // // ユーザ権限を取得
  // req.session.userRole = user.dataValues?.userRole
  // const deleteFlag = contract.dataValues.deleteFlag
  // const contractStatus = contract.dataValues.contractStatus

  // if (!validate.isStatusForCancel(contractStatus, deleteFlag)) {
  //   return next(noticeHelper.create('cancelprocedure'))
  // }

  // const csvuploadResultDetailsArr = []

  // // データを取得し、格納
  // try {
  //   const result = await invoiceDetailController.findInvoiceDetail(invoicesId)
  //   resultStatusCode = 200
  //   result.map((currVal) => {
  //     const invoiceDetail = currVal
  //     let status = ''

  //     switch (invoiceDetail.dataValues.status) {
  //       case '1':
  //         status = 'スキップ'
  //         break
  //       case '0':
  //         status = '成功'
  //         break
  //       default:
  //         status = '失敗'
  //         break
  //     }

  //     csvuploadResultDetailsArr.push({
  //       lines: invoiceDetail.dataValues.lines,
  //       invoiceId: invoiceDetail.dataValues.invoiceId,
  //       status: status,
  //       errorData: invoiceDetail.dataValues.errorData
  //     })
  //     return ''
  //   })
  // } catch (error) {
  //   resultStatusCode = 500
  //   logger.error({ page: 'csvuploadResult', msg: '請求書を取得失敗しました。' })
  //   logger.error(error)
  // }

  // データ送信
  // return res.status(resultStatusCode).send(csvuploadResultDetailsArr)
  const testData = [
    {item:'AAA', value:'aaa'},
    {item:'AAA', value:'aaa'},
    {item:'AAA', value:'aaa'},
    {item:'AAA', value:'aaa'},
    {item:'AAA', value:'aaa'},
    {item:'AAA', value:'aaa'},
    {item:'AAA', value:'aaa'},
    {item:'AAA', value:'aaa'},
    {item:'AAA', value:'aaa'},
    {item:'AAA', value:'aaa'},
    {item:'AAA', value:'aaa'},
    {item:'AAA', value:'aaa'},
    {item:'AAA', value:'aaa'},
    {item:'AAA', value:'aaa'},
    {item:'AAA', value:'aaa'},
    {item:'AAA', value:'aaa'},
    {item:'AAA', value:'aaa'},
    {item:'AAA', value:'aaa'},
    {item:'AAA', value:'aaa'},
  ]
  res.render('uploadFormat', {
    testData: testData
  })
}

router.get('/', cbGetIndex)
router.post('/', cbPostIndex)

module.exports = {
  router: router,
  cbGetIndex: cbGetIndex,
  cbPostIndex: cbPostIndex
}
