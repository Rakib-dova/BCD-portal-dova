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
          // if it's a custom property that doesn't belong in the
          // `ContextTagKeys` contract, such as browser information, add
          // it as a custom property on the `envelope.data.baseData` object
          data.properties[key] = value
      }
    }

    return true
  })
}

// var favicon = require('serve-favicon');

const app = express()

// セキュリティ
const helmet = require('helmet')
app.use(
  helmet({
    frameguard: false
  })
)
// セキュリティ helmet.jsの仕様を確認のこと
// https://github.com/helmetjs/helmet
app.use(
  helmet.contentSecurityPolicy({
    directives: {
      ...helmet.contentSecurityPolicy.getDefaultDirectives(),
      'img-src': ["'self'"],
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
// Azure Web App for containerではLBの終端でhttp通信となるため、上記trust proxy設定が必要となる
// LBとコンテナの入力2ホップをtrust proxyとして設定
// https://stackoverflow.com/questions/63831794/how-to-pass-samesite-none-from-dockerized-node-app-running-on-azure-appservice

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
    name: 'bcd.sid',
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
app.set('views', path.join(__dirname, 'views'))
app.set('view engine', 'pug')

// body-parser
app.use(bodyParser.urlencoded({ extended: false }))

// uncomment after placing your favicon in /public
// app.use(favicon(__dirname + '/public/favicon.ico'));

// app.use(bodyParser.json());
// app.use(bodyParser.urlencoded({ extended: false }));
// app.use(cookieParser());
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

// 仕訳情報設定
// 勘定科目一覧
app.use('/accountCodeList', require('./routes/accountCodeList').router)
// 勘定科目設定
app.use('/registAccountCode', require('./routes/registAccountCode').router)
// 勘定科目確認・変更
app.use('/accountCodeEdit', require('./routes/accountCodeEdit').router)
// 勘定科目一括作成
app.use('/uploadAccount', require('./routes/accountCodeUpload').router)
// 補助科目設定
app.use('/registSubAccountCode', require('./routes/registSubAccountCode').router)

// 設定
// cancellation
app.use('/cancellation', require('./routes/cancellation').router)

// 契約者情報の修正
app.use('/change', require('./routes/change').router)

// 請求書ダウンロード
app.use('/csvDownload', require('./routes/csvDownload').router)

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
