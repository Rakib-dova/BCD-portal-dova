'use strict'
if (process.env.LOCALLY_HOSTED === 'true') {
  require('dotenv').config({ path: './config/.env' })
}

require('./lib/setenv').config(process.env)

const express = require('express')
const path = require('path')
const bodyParser = require('body-parser')

// logger(bunyan)の前にapplication insightsを読み込む必要がある。un-used-valueだが必須。
const appInsights = require('applicationinsights')

if (process.env.LOCALLY_HOSTED !== 'true') {
  // console出力は全て収集
  appInsights.setup().setAutoCollectConsole(true, true)
  appInsights.start()

  // テレメンタリに送る前の前処理を追加
  appInsights.defaultClient.addTelemetryProcessor((envelope, context) => {
    const requestContext = context.correlationContext?.requestContext
    if (!requestContext) return true

    const getContextKey = (key) => {
      return appInsights.defaultClient.context.keys[key]
    }
    const setContextKey = (key, value) => {
      envelope.tags[key] = value
    }

    // custom context that I set on per-request basis
    const data = envelope.data.baseData

    // userIdをセット
    for (const [key, value] of Object.entries(requestContext)) {
      switch (key) {
        case 'userId':
          setContextKey(
            getContextKey('userId'), // ai.user.id
            value
          )
          break
        default:
          /**
           * if it's a custom property that doesn't belong in the
           * `ContextTagKeys` contract, such as browser information, add
           * it as a custom property on the `envelope.data.baseData` object
           */
          data.properties[key] = value
      }
    }

    return true
  })
}

const app = express()

// セキュリティ
const helmet = require('helmet')
app.use(
  helmet({
    frameguard: false
  })
)
app.use(helmet.frameguard({ action: 'sameorigin' }))
// セキュリティ helmet.jsの仕様を確認のこと
// https://github.com/helmetjs/helmet
app.use(
  helmet.contentSecurityPolicy({
    directives: {
      ...helmet.contentSecurityPolicy.getDefaultDirectives(),
      'img-src': ["'self'", 'https: data:'], // eslint-disable-line
      'form-action': ["'self'"], // form-actionは自己ドメインに制限
      // bulma-toast、fontawasom、googlefontsを使うためstyle-srcを一部許可
      // prettier-ignore
      'style-src': [
        "'self' https://use.fontawesome.com https://fonts.googleapis.com"
      ],
      'script-src': ["'self'"],
      'object-src': ["'self'"],
      'frame-ancestors': [`'self' https://${process.env.TS_HOST}`]
    }
  })
)

// cookieはSSL必須のsecure: true, sameSite: noneに設定しているため以下の設定が必要
app.set('trust proxy', 2)
/**
 * Azure Web App for containerではLBの終端でhttp通信となるため、上記trust proxy設定が必要となる
 * LBとコンテナの入力2ホップをtrust proxyとして設定
 * https://stackoverflow.com/questions/63831794/how-to-pass-samesite-none-from-dockerized-node-app-running-on-azure-appservice
 */

// session
const session = require('express-session')

const redis = require('redis')
const RedisStore = require('connect-redis')(session)

const redisOptions =
  process.env.LOCALLY_HOSTED !== 'true'
    ? {
        host: process.env.REDIS_HOST,
        port: process.env.REDIS_PORT,
        password: process.env.REDIS_PASS,
        tls: { servername: process.env.REDIS_HOST }
      }
    : {
        host: process.env.REDIS_HOST,
        port: process.env.REDIS_PORT,
        password: process.env.REDIS_PASS
      }

const redisClient = redis.createClient(redisOptions)

app.use(
  session({
    secret: 'bcd pentas',
    resave: false,
    saveUninitialized: false,
    store: new RedisStore({
      ttl: process.env.REDIS_TTL,
      client: redisClient
    }),
    rolling: true,
    name: '__Host-bcd.sid',
    cookie: {
      httpOnly: true,
      secure: true, // trueの場合、リバースプロキシやローバラがhttp通信では使えなくなる可能性あり？
      maxAge: 1000 * 60 * 30,
      sameSite: 'none' // secureがfalseの場合、機能しない
      // トレードシフトアプリはiframe経由でcookieを読み込むため、sameSiteをnoneに設定する必要がある
    }
  })
)

// oauth2認証
const auth = require('./lib/auth')
app.use(auth.initialize())
app.use(auth.session())

// message flash
const flash = require('express-flash')
app.use(flash())

// view engine setup
app.set('views', [path.join(__dirname, 'views'), path.join(__dirname, 'obc/views')])
app.set('view engine', 'pug')

// body-parser
// 支払依頼の承認する時の仕訳情報とメッセージのパラメータの最大数：8401個 -> 50000個 (仕訳情報最大値2000個登録のため)
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb', parameterLimit: 50000 }))

/**  会員サイト開発 20220228 */
const cookieParser = require('cookie-parser')
app.use(cookieParser())
/**  会員サイト開発 20220228 */

app.use(express.static(path.join(__dirname, 'public')))

// セッションにuserIdがあればappInsightに送信
if (process.env.LOCALLY_HOSTED !== 'true') {
  app.use((req, res, next) => {
    const userId = req.user?.userId || null

    const currentRequestContext = appInsights.getCorrelationContext().requestContext || {}

    const nextRequestContext = {
      ...currentRequestContext,
      userId
    }

    appInsights.getCorrelationContext().requestContext = nextRequestContext

    next()
  })
}

// クローラーにページをインデックスしないよう指示
app.use(function (req, res, next) {
  res.header('X-Robots-Tag', 'noindex')
  res.header('X-XSS-Protection', '1; mode=block')
  res.header('Cache-Control', 'no-store')
  next()
})

/**
 * 一時保存機能
 * 支払依頼のユーザーが入力して承認ルート未設定や
 * 未保存ですぐ依頼の時、画面の入力した内容保存する
 * ミドルウェア
 */
app.use(function (req, res, next) {
  const url = req.url

  if (
    url.match('/requestApproval/') === null &&
    url.match('/approvalInbox/') === null &&
    url.match('/favicon.ico') === null &&
    url.match('/inbox/getCode') === null &&
    url.match('/inbox/department') === null
  ) {
    delete req.session.requestApproval
  }
  next()
})

app.use('/', require('./routes/index').router)
app.use('/portal', require('./routes/portal').router)
app.use('/auth', require('./routes/auth').router)

app.use('/tenant', require('./routes/tenant').router)
app.use('/user', require('./routes/user').router)

// 住所検索
app.use('/searchAddress', require('./routes/searchAddressApi').router)
// 企業検索
app.use('/searchCompanies', require('./routes/searchCompaniesApi').router)
// 承認者検索
app.use('/searchApprover', require('./routes/searchApprover').router)

// 請求書一括アップロード
// csvupload
app.use('/csvupload', require('./routes/csvupload').router)

// csvuploadResult
app.use('/csvuploadResult', require('./routes/csvuploadResult').router)

// 基本情報設定画面 設定
app.use('/csvBasicFormat', require('./routes/csvBasicFormat').router)

// アップロードフォーマット設定
app.use('/uploadFormat', require('./routes/uploadFormat').router)

// アップロードフォーマット一覧
app.use('/uploadFormatList', require('./routes/uploadFormatList').router)

// アップロードフォーマット確認・変更
app.use('/uploadFormatEdit', require('./routes/uploadFormatEdit').router)

// 請求情報ダウンロード
// 請求情報
app.use('/csvDownload', require('./routes/csvDownload').router)

// 仕訳情報
app.use('/journalDownload', require('./routes/journalDownload').router)

// 仕訳情報設定
// ------------勘定科目
// 勘定科目一覧
app.use('/accountCodeList', require('./routes/accountCodeList').router)

// 勘定科目設定
app.use('/registAccountCode', require('./routes/registAccountCode').router)

// 勘定科目削除
app.use('/deleteAccountCode', require('./routes/deleteAccountCode').router)

// 勘定科目確認・変更
app.use('/accountCodeEdit', require('./routes/accountCodeEdit').router)

// 勘定科目一括作成
app.use('/uploadAccount', require('./routes/accountCodeUpload').router)

// ------------補助科目
// 補助科目一覧
app.use('/subAccountCodeList', require('./routes/subAccountCodeList').router)

// 補助科目一括作成
app.use('/uploadSubAccount', require('./routes/subAccountCodeUpload').router)

// 補助科目設定
app.use('/registSubAccountCode', require('./routes/registSubAccountCode').router)

// 補助科目削除
app.use('/deleteSubAccountCode', require('./routes/deleteSubAccountCode').router)

// 補助科目確認・変更
app.use('/subAccountCodeEdit', require('./routes/subAccountCodeEdit').router)

// ------------部門データ
// 部門データ一覧
app.use('/departmentCodeList', require('./routes/departmentCodeList').router)

// 部門データ設定
app.use('/registDepartmentCode', require('./routes/registDepartmentCode').router)

// 部門データ一括作成
app.use('/uploadDepartment', require('./routes/departmentCodeUpload').router)

// 部門データ削除
app.use('/deleteDepartmentCode', require('./routes/deleteDepartmentCode').router)

// 部門データ確認・変更
app.use('/departmentCodeEdit', require('./routes/departmentCodeEdit').router)

// ------------受領した請求書
// 受領した請求書一覧
app.use('/inboxList', require('./routes/inboxList').router)

// 受領した請求書
app.use('/inbox', require('./routes/inbox').router)
// 支払依頼の請求書
app.use('/approvalInbox', require('./routes/approvalInbox').router)

// 支払依頼画面
app.use('/requestApproval', require('./routes/requestApproval').router)

// 支払依頼差し戻し
app.use('/rejectApproval', require('./routes/rejectApproval').router)

// ------------承認ルート
// 承認ルート登録
app.use('/registApproveRoute', require('./routes/registApproveRoute').router)
// 承認ルート一覧
app.use('/approveRouteList', require('./routes/approveRouteList').router)
// 承認ルート削除
app.use('/deleteApproveRoute', require('./routes/deleteApproveRoute').router)
// 承認ルート確認
app.use('/approveRouteEdit', require('./routes/approveRouteEdit').router)

// ------------設定
// ご契約内容
app.use('/contractDetail', require('./routes/contractDetail').router)

// 無料契約者情報の修正
app.use('/change', require('./routes/change').router)

// 無料契約情報解約
app.use('/cancellation', require('./routes/cancellation').router)

// 有料契約情報解約
app.use('/contractCancellation', require('./routes/contractCancellation').router)

// ユーザー一括登録
app.use('/uploadUsers', require('./routes/uploadUsers').router)

// ------------オプションサービス申込
// 有料サービス利用登録
app.use('/paidServiceRegister', require('./routes/paidServiceRegister').router)

// 請求書ダウンロード
app.use('/csvDownload', require('./routes/csvDownload').router)

/* PoC PDF出力機能 */
app.use('/pdfInvoices', require('./routes/pdfInvoice').router)

/* PoC PDF請求書ドラフト一括作成 */
app.use('/pdfInvoiceCsvUpload', require('./routes/pdfInvoiceCsvUpload').router)

/**  会員サイト開発 20220228 */
// アプリ一覧からの遷移受付けエンドポイント
app.use('/memberCooperation', require('./memberSite/routes/memberCooperationRouter').router)
app.use('/idLinking', require('./memberSite/routes/idLinkingRouter').router)
/**  会員サイト開発 20220228 */

// 奉行クラウド連携
app.use('/bugyo', require('./obc/obc'))

// API専用
app.use('/api', require('./routes/api').router)

// notice
const noticeHelper = require('./routes/helpers/notice')

const errorHelper = require('./routes/helpers/error')

// catch 404 and forward to error handler
app.use((req, res, next) => {
  next(errorHelper.create(404))
})

// error handler
app.use(noticeHelper.render)
app.use(errorHelper.render)

app.set('port', process.env.PORT || 3000)

module.exports = app
