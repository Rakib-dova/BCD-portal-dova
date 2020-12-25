'use strict';
if(process.env.LOCALLY_HOSTED == "true") {
    require('dotenv').config({ path: './config/.env' })
}

const debug = require('debug')('app4');
const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');

const appInsights = process.env.LOCALLY_HOSTED != "true" ? require('./lib/appinsights') : {};

//var favicon = require('serve-favicon');
//const morgan = require('morgan');
const logger = require('./lib/logger')
//var cookieParser = require('cookie-parser');

var server; 
var app = express();

//セキュリティ
const helmet = require('helmet');
app.use(helmet({
        frameguard: false
}));
//セキュリティ helmet.jsの仕様を確認のこと
//https://github.com/helmetjs/helmet
app.use(
    helmet.contentSecurityPolicy({
      directives: {
        ...helmet.contentSecurityPolicy.getDefaultDirectives(),
        "img-src":["'self'"],
        "form-action": ["'self'"], //form-actionは自己ドメインに制限
        //bulma-toast、fontawasom、googlefontsを使うためstyle-srcを一部許可
        //sha256はbulma-toastがinline styeを使用するためハッシュを指定(See common-page.js)
        "style-src": ["'self' 'unsafe-hashes' \
            'sha256-UFSdfDBHU2GqtdoDHN2BFW+gCZ9hKcFKzgGr97RwY5o=' \
            'sha256-E/nvqET/9zpctDshjbx7JreRM/gAx3JcoKF+f+rglGY=' \
            'sha256-oZlOzimqeBC3337zzQaIzbHhSc7p/5AqrpTayBe83Hg=' \
            https://cdnjs.cloudflare.com \
            https://use.fontawesome.com \
            https://fonts.googleapis.com"],
        "object-src": ["'self'"],
        "frame-ancestors": [`'self' https://${process.env.TS_HOST}`]
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

//message flash
const flash = require('express-flash');
app.use(flash());

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

//body-parser
app.use(bodyParser.urlencoded({ extended: false }))

// uncomment after placing your favicon in /public
//app.use(favicon(__dirname + '/public/favicon.ico'));
/*
if(process.env.LOCALLY_HOSTED != "true") {
    morgan.token('id', function getId(req){
        if(req.user?.userId) return req.user.userId
    });
    app.use(morgan(':id [:date[web]] :remote-addr - ":method :url HTTP/:http-version" \
    :status :res[content-length] :response-time ms - :res[content-length] ":referrer" ":user-agent"'));
}*/

//app.use(bodyParser.json());
//app.use(bodyParser.urlencoded({ extended: false }));
//app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', require('./routes/index'));
app.use('/portal', require('./routes/portal'));
app.use('/portal-mock', require('./routes/portal-mock'));
app.use('/register', require('./routes/register'));
app.use('/auth', require('./routes/auth'));

app.use('/user', require('./routes/user'));

// catch 404 and forward to error handler
app.use(function (req, res, next) {
    var err = new Error('お探しのページは見つかりませんでした。');
    err.name = "Not Found"
    err.status = 404;
    next(err);
});

// error handlers

// error handler
app.use( (err, req, res, next) => {

    err.status = (!err.status) ? 500 : err.status

    if(req.user?.userId && req.user?.companyId) {
        if(err.status>=500) logger.error({tenant: req.user.companyId, user: req.user.userId}, err, err.status+" "+err.name);
        else logger.warn({tenant: req.user.companyId, user: req.user.userId}, err.status+" "+err.name);

    } else {
        if(err.status>=500) logger.error(err, err.status+" "+err.name);
        else logger.warn(err.status+" "+err.name);

    }
    
    res.status(err.status);
    res.render('error', {
        title: err.name,
        message: err.message,
        status: err.status,
        error: process.env.LOCALLY_HOSTED == "true" ? err : {}
    });
});

app.set('port', process.env.PORT || 3000);

if(process.env.LOCALLY_HOSTED == "true") {
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
            logger.info('Express server listening on port ' + server.address().port);
      });
    }
    exports.close = () => {
        server.close(() => {
            logger.info('Server stopped.');
        });
    }
} else {
    exports.listen = () => {
        server = app.listen(app.get('port'), () => {
            logger.info('Express server listening on port ' + server.address().port);
        });
    }
    exports.close = () => {
        server.close(() => {
            logger.info('Server stopped.');
        });
    }

}

this.listen();