'use strict'
if (process.env.LOCALLY_HOSTED === 'true') {
  require('dotenv').config({ path: './config/.env' })
}

const debug = require('debug')('app4')
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
    const getContextKey = (key) => {
      return appInsights.defaultClient.context.keys[key]
    }
    const setContextKey = (key, value) => {
      envelope.tags[key] = value
    }

    // custom context that I set on per-request basis
    const requestContext = appInsights.getCorrelationContext().requestContext
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
// const morgan = require('morgan');
const logger = require('./lib/logger')
// var cookieParser = require('cookie-parser');

let server
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
      // sha256はbulma-toastがinline styeを使用するためハッシュを指定(See common-page.js)
      // prettier-ignore
      'style-src': [
        "'self' 'unsafe-hashes' " +
          "'https://cdnjs.cloudflare.com' 'https://use.fontawesome.com' 'https://fonts.googleapis.com'" +
          "'sha256-UFSdfDBHU2GqtdoDHN2BFW+gCZ9hKcFKzgGr97RwY5o='" +
          "'sha256-E/nvqET/9zpctDshjbx7JreRM/gAx3JcoKF+f+rglGY='" +
          "'sha256-oZlOzimqeBC3337zzQaIzbHhSc7p/5AqrpTayBe83Hg='"
      ],
      'object-src': ["'self'"],
      'frame-ancestors': [`'self' https://${process.env.TS_HOST}`]
    }
  })
)

// session
const session = require('express-session')
app.use(
  session({
    secret: 'bcd pentas',
    resave: false,
    saveUninitialized: false,
    rolling: true,
    name: 'bcd.sid',
    cookie: {
      httpOnly: true,
      secure: false, // リバースプロキシやローバラから使えなくなるためfalseとしておく
      maxAge: 1000 * 60 * 30
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
    if (req.user?.userId) {
      const userId = req.user.userId

      const currentRequestContext = appInsights.getCorrelationContext().requestContext || {}

      const nextRequestContext = {
        ...currentRequestContext,
        userId
      }

      appInsights.getCorrelationContext().requestContext = nextRequestContext
    }
    next()
  })
}

app.use('/', require('./routes/index'))
app.use('/portal', require('./routes/portal'))
app.use('/portal-mock', require('./routes/portal-mock'))
app.use('/auth', require('./routes/auth'))

app.use('/tenant', require('./routes/tenant'))
app.use('/user', require('./routes/user'))

const errorHelper = require('./routes/helpers/error')

// catch 404 and forward to error handler
app.use((req, res, next) => {
  next(errorHelper.create(404))
})

// error handler
app.use(errorHelper.render)

app.set('port', process.env.PORT || 3000)

if (process.env.LOCALLY_HOSTED === 'true') {
  // https サーバ
  debug('Running localhost with HTTPS...')
  const fs = require('fs')
  const https = require('https')
  https.globalAgent.options.rejectUnauthorized = false
  const options = {
    key: fs.readFileSync('./certs/server.key'),
    cert: fs.readFileSync('./certs/server.crt')
  }
  exports.listen = () => {
    server = https.createServer(options, app).listen(app.get('port'), () => {
      logger.info('Express server listening on port ' + server.address().port)
    })
  }

  exports.close = () => {
    server.close(() => {
      logger.info('Server stopped.')
    })
  }
} else {
  exports.listen = () => {
    server = app.listen(app.get('port'), () => {
      logger.info('Express server listening on port ' + server.address().port)
    })
  }
  exports.close = () => {
    server.close(() => {
      logger.info('Server stopped.')
    })
  }
}

this.listen()
