'use strict'
const express = require('express')
const router = express.Router()
const helper = require('./helpers/middleware')

const errorHelper = require('./helpers/error')
const noticeHelper = require('./helpers/notice')

const userController = require('../controllers/userController.js')
const contractController = require('../controllers/contractController.js')
const validate = require('../lib/validate')
const constants = require('../constants')
const inboxController = require('../controllers/inboxController')
const approvalInboxController = require('../controllers/approvalInboxController')
const db = require('../models')
const requestApproval = db.RequestApproval
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

  // お知らせ取得
  const newsDataArr = []
  let newsDataArrSize

  await parser
    .parseURL('https://support.ntt.com/informationRss/goods/rss/bconnection')
    .then((feed) => {
      newsDataArrSize = feed.items.length
      // TODO: RSS不具合が解消後、コメントアウトを復活
      if (newsDataArrSize === 0) {
        // newsDataArr.push({
        //   message: constants.portalMsg.NEWS_NONE
        // })
        newsDataArr.push({
          date: '2022年7月6日',
          title: 'BConnectionデジタルトレードアプリケーション　申込フォーム/契約情報変更画面の不具合事象について',
          link: 'https://support.ntt.com/bconnection/information/detail/pid2500001mth'
        })
      } else {
        // TODO: RSS不具合が解消後、2→3へ
        let getlength = 2
        if (newsDataArrSize < 2) {
          getlength = newsDataArrSize
        }

        // RSS不具合の暫定対処
        newsDataArr.push({
          date: '2022年7月6日',
          title: 'BConnectionデジタルトレードアプリケーション　申込フォーム/契約情報変更画面の不具合事象について',
          link: 'https://support.ntt.com/bconnection/information/detail/pid2500001mth'
        })

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

  // 通知件数取得処理(支払依頼件数)
  let requestNoticeCnt = 0
  const accessToken = req.user.accessToken
  const refreshToken = req.user.refreshToken
  const tradeshiftDTO = new (require('../DTO/TradeshiftDTO'))(accessToken, refreshToken, user.tenantId)

  const workflow = await inboxController.getWorkflow(user.userId, contract.contractId, tradeshiftDTO)
  for (let i = 0; i < workflow.length; i++) {
    const requestApproval = await approvalInboxController.getRequestApproval(
      accessToken,
      refreshToken,
      contract.contractId,
      workflow[i].documentId,
      user.tenantId
    )
    const requestId = requestApproval.requestId
    const result = await approvalInboxController.hasPowerOfEditing(contract.contractId, user.userId, requestId)
    if (result === true) {
      switch (workflow[i].workflowStatus) {
        case '支払依頼中':
        case '一次承認済み':
        case '二次承認済み':
        case '三次承認済み':
        case '四次承認済み':
        case '五次承認済み':
        case '六次承認済み':
        case '七次承認済み':
        case '八次承認済み':
        case '九次承認済み':
        case '十次承認済み':
          ++requestNoticeCnt
          break
      }
    }
  }

  // 請求書の承認依頼検索(差し戻し件数)
  let rejectedNoticeCnt = 0
  const requestApprovals = await requestApproval.findAll()
  for (let i = 0; i < requestApprovals.length; i++) {
    if (requestApprovals[i].dataValues.requester === user.userId) {
      if (requestApprovals[i].dataValues.status === '90') {
        ++rejectedNoticeCnt
      }
    }
  }

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
    rejectedNoticeCnt: rejectedNoticeCnt,
    requestNoticeCnt: requestNoticeCnt
  })
}

router.get('/', helper.isAuthenticated, helper.isTenantRegistered, helper.isUserRegistered, csrfProtection, cbGetIndex)

module.exports = {
  router: router,
  cbGetIndex: cbGetIndex
}
