'use strict'

const app = require('./app')

// logger(bunyan)の前にapplication insightsが起動されている必要がある
const logger = require('./lib/logger')

// https サーバ
const fs = require('fs')
const https = require('https')

let server

if (process.env.LOCALLY_HOSTED === 'true') {
  https.globalAgent.options.rejectUnauthorized = false
  const options = {
    key: fs.readFileSync('./certs/server.key'),
    cert: fs.readFileSync('./certs/server.crt')
  }
  const listen = () => {
    server = https.createServer(options, app).listen(app.get('port'), () => {
      logger.info('Express server listening on port ' + server.address().port)
    })
  }

  listen()
} else {
  const listen = () => {
    server = app.listen(app.get('port'), () => {
      logger.info('Express server listening on port ' + server.address().port)
    })
  }

  listen()
}
