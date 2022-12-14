'use strict'
const express = require('express')
const router = express.Router()
const helper = require('./helpers/middleware')
const errorHelper = require('./helpers/error')
const noticeHelper = require('./helpers/notice')
const userController = require('../controllers/userController.js')
const contractController = require('../controllers/contractController.js')
const validate = require('../lib/validate')
const { getBrowser } = require('../lib/utils')
const logger = require('../lib/logger')
const constants = require('../constants')
const Parser = require('rss-parser')
const parser = new Parser({
  headers: {
    Accept: 'text/html'
  }
})

/* 会員サイト開発により追加 */
// CSR対策
const csrf = require('csurf')
const csrfProtection = csrf({ cookie: false })
/* 会員サイト開発により追加 */

const cbGetIndex = async (req, res, next) => {
  if (!req.session || !req.user?.userId) {
    return next(errorHelper.create(500))
  }

  // portal遷移前にはuserは取得できることは確定
  const user = await userController.findOne(req.user.userId)
  // データベースエラーは、エラーオブジェクトが返る
  // portalではuser未登録の場合もエラーを上げる
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

  // アプリ効果測定用ログ出力
  const browser = getBrowser(req.headers['user-agent'])
  console.log('======= browser ==========: ', browser)
  let jsonLog
  // 1つ目のブラウザ検知
  if (!req.session.browserInfo) {
    req.session.browserInfo = { browsers: [browser] }
    jsonLog = {
      tenantId: req.user.tenantId,
      action: 'detectedBrowser',
      browser
    }
    logger.info(jsonLog)
  // 2つ目以降のブラウザ検知
  } else if (req.session.browserInfo && !req.session.browserInfo.browsers.includes(browser)) {
    req.session.browserInfo.browsers.push(browser)
    jsonLog = {
      tenantId: req.user.tenantId,
      action: 'detectedBrowser',
      browser
    }
    logger.info(jsonLog)
  }

  // お知らせ取得
  const newsDataArr = []
  let newsDataArrSize

  await parser
    .parseURL('https://support.ntt.com/informationRss/goods/rss/bconnection')
    .then((feed) => {
      newsDataArrSize = feed.items.length
      if (newsDataArrSize === 0) {
        newsDataArr.push({
          message: constants.portalMsg.NEWS_NONE
        })
      } else {
        let getlength = 3
        if (newsDataArrSize < 3) {
          getlength = newsDataArrSize
        }

        for (let i = 0; i < getlength; i++) {
          const day = new Date(feed.items[i].date)

          newsDataArr.push({
            date: day.getFullYear() + '年' + (day.getMonth() + 1) + '月' + day.getDate() + '日',
            title: feed.items[i].title,
            link: feed.items[i].link
          })
        }
      }
    })
    .catch((error) => {
      console.error('RSS 取得失敗', error)
      newsDataArrSize = 0
      newsDataArr.push({
        message: constants.portalMsg.NEWS_CONN_ERR
      })
    })

  // 工事・故障情報取得
  let constructDataArr = []

  await parser
    .parseURL('https://support.ntt.com/bconnection/maintenance/list/rss')
    .then((feed) => {
      if (feed.items.length === 0) {
        constructDataArr.push({
          message: constants.portalMsg.MAINTENANCE_NON
        })
      } else {
        const newsLimit = 3
        constructDataArr = feed.items.map((item) => {
          const day = new Date(item.date)
          return {
            date: `${day.getFullYear()}年${day.getMonth() + 1}月${day.getDate()}日`,
            title: item.title,
            link: item.link
          }
        })
        constructDataArr.length = newsLimit < feed.items.length ? newsLimit : feed.items.length
      }
    })
    .catch((error) => {
      console.error('RSS 取得失敗', error)
      constructDataArr.length = 0
      constructDataArr.push({
        message: constants.portalMsg.NEWS_CONN_ERR
      })
    })

  // ユーザ権限も画面に送る
  res.render('portal', {
    title: 'ポータル',
    tenantId: req.user.tenantId,
    userRole: req.session.userRole,
    numberN: contract.dataValues?.numberN,
    TS_HOST: process.env.TS_HOST,
    newsDataArr: newsDataArr,
    newsDataArrSize: newsDataArrSize,
    constructDataArr: constructDataArr,
    constructDataArrSize: constructDataArr[0].title ? constructDataArr.length : 0,
    memberSiteFlg: req.session.memberSiteCoopSession.memberSiteFlg /* 会員サイト開発により追加 */,
    csrfToken: req.csrfToken() /* 会員サイト開発により追加 */,
    contractPlan: req.contractPlan
  })
}

router.get(
  '/',
  helper.isAuthenticated,
  helper.isTenantRegistered,
  helper.isUserRegistered,
  helper.getContractPlan,
  csrfProtection,
  cbGetIndex
)

module.exports = {
  router: router,
  cbGetIndex: cbGetIndex
}
