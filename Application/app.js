'use strict';
require('dotenv').config({ path: './config/.env' })

const debug = require('debug')('app4');
const express = require('express');
const path = require('path');

//var favicon = require('serve-favicon');
//var logger = require('morgan');
//var cookieParser = require('cookie-parser');
//var bodyParser = require('body-parser');

const appInsights = require('applicationinsights');
if(process.env.NODE_ENV == "production"){
    appInsights.setup();
    appInsights.start();
}

var server; 
var app = express();

//セキュリティ
const helmet = require('helmet');
app.use(helmet());
//セキュリティ helmet.jsの仕様を確認のこと
//https://github.com/helmetjs/helmet
app.use(
    helmet.contentSecurityPolicy({
      directives: {
        ...helmet.contentSecurityPolicy.getDefaultDirectives(),
        "img-src":["'self' https:"],
        "form-action": ["'self'"], //form-actionは自己ドメインに制限
        "style-src": ["'self' https:"], //style-srcは自己ドメインに制限
        "object-src": ["'self'"]
      },
    })
  );

//session
const session = require("express-session");
app.use(session({
    secret: 'bcd pentas',
    resave: false,
    saveUninitialized: false,
    rolling: true,
    name:"bcd.sid",
    cookie:{
        httpOnly: true,
        secure: false, //リバースプロキシやローバラから使えなくなるためfalseとしておく
        maxAge: 1000 * 60 * 30
    }
}));

//oauth2認証
const auth = require('./lib/auth')
app.use(auth.initialize());
app.use(auth.session());

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

// uncomment after placing your favicon in /public
//app.use(favicon(__dirname + '/public/favicon.ico'));
//app.use(logger('dev'));
//app.use(bodyParser.json());
//app.use(bodyParser.urlencoded({ extended: false }));
//app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', require('./routes/index'));
app.use('/portal', require('./routes/portal'));
app.use('/register', require('./routes/register'));
app.use('/auth', require('./routes/auth'));

// catch 404 and forward to error handler
app.use(function (req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
    app.use(function (err, req, res, next) {
        res.status(err.status || 500);
        res.render('error', {
            message: err.message,
            error: err
        });
    });
}

// production error handler
// no stacktraces leaked to user
app.use(function (err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
        message: err.message,
        error: {}
    });
});

app.set('port', process.env.PORT || 3000);

if(process.env.LOCALHOST_WITH_HTTPS == "true") {
    // https サーバ
    debug('Running localhost with HTTPS...');
    const fs = require('fs');
    var https = require('https');
    https.globalAgent.options.rejectUnauthorized = false;
    const options = {
        key: fs.readFileSync('./certs/server.key'),
        cert: fs.readFileSync('./certs/server.crt')
    };
    exports.listen = () => {
        server = https.createServer(options, app).listen(app.get('port'), () => {
            debug('Express server listening on port ' + server.address().port);
      });
    }
    exports.close = () => {
        server.close(() => {
            debug('Server stopped.');
        });
    }
} else {
    exports.listen = () => {
        server = app.listen(app.get('port'), () => {
            debug('Express server listening on port ' + server.address().port);
        });
    }
    exports.close = () => {
        server.close(() => {
            debug('Server stopped.');
        });
    }

}

this.listen();