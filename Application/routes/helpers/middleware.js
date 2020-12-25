'use strict';
const e = require('express');
const express = require('express');
const router = express.Router();
// Require our controllers.
const userController = require('../../controllers/userController');
const tenantController = require('../../controllers/tenantController'); 

const errorHelper = require('./error');

exports.isAuthenticated = async (req, res, next) => {

    //if(req.isAuthenticated()) {
    if(req.user?.userId) {

        //Auth Idでアクセスログを追跡する
        if(process.env.LOCALLY_HOSTED != "true") {
            const appInsights = require('../../lib/appinsights')
            appInsights.defaultClient.context.tags[appInsights.defaultClient.context.keys.userAuthUserId]=req.user.userId
        }

        //TODO: セッションにユーザ情報が格納されている
        //TODO: セッション情報に前のアカウント情報が残っているが、新しいアカウントでTradeshiftにログインした場合を判定する

        next()
    } else {
        //authに飛ばす HTTP1.1仕様に従い303を使う
        //https://developer.mozilla.org/ja/docs/Web/HTTP/Status/303
        res.redirect(303, '/auth')
    }

}

exports.isTenantRegistered = async (req, res, next) => {

    //isAuthed? noならreturnしてredirect（後続の処理は行わない）
    if(!req.user?.userId || !req.user?.companyId) return res.redirect(303, '/auth')

    //isRegistered? テナントがアカウント管理者によって登録されているか
    const tenant = await tenantController.findOne(req.user.companyId)

    if(tenant === null) { //ユーザが見つからない場合null値になる
        //ユーザがDBに登録されていない
        req.session.userContext="NotTenantRegistered"

        res.redirect(303, '/register/tenant'); //registerへリダイレクトさせる

    } else if (tenant.dataValues?.tenantId) {
        
        //TODO: userIdがUUIDかどうか
        //ユーザがDBに登録されている

        //TODO: ユーザの名前、メールアドレスがセッション内の情報と一致するか
        //TODO: 一致しなければ再度DBに登録しなおす？または利用規約ふみなおさせる？

        next(); //register以外のページであれば続行

    } else {
        
        next(errorHelper.create(500)) //エラーはnextに渡す
    }
}

exports.isUserRegistered = async (req, res, next) => {

    if(!req.user?.userId) return res.redirect(303, '/auth')

    //isRegistered? テナントがアカウント管理者によって登録されているか
    const user = await userController.findOne(req.user.userId)

    if(user === null) { //ユーザが見つからない場合null値になる
        //ユーザがDBに登録されていない
        req.session.userContext="NotUserRegistered"

        res.redirect(303, '/register/user'); //registerへリダイレクトさせる

    } else if (user.dataValues?.userId) { //TODO: userIdがUUIDかどうか
        //ユーザがDBに登録されている

        //TODO: ユーザの名前、メールアドレスがセッション内の情報と一致するか
        //TODO: 一致しなければ再度DBに登録しなおす？または利用規約ふみなおさせる？

        next(); //register以外のページであれば続行

    } else {

        next(errorHelper.create(500)) //エラーはnextに渡す
    }
}


exports.isNotTenantRegistered = async (req, res, next) => {

    if(!req.user?.userId || !req.user?.companyId) return res.redirect(303, '/auth')

    //isRegistered? テナントが登録されているか
    //tenantControllerでfindOneにするべき？
    const user = await userController.findByTenantId(req.user.companyId)

    if(user === null) { //ユーザが見つからない場合null値になる
 
        next(); //registerページであれば続行

    } else if (user.dataValues?.userId) {
        //TODO: userIdがUUIDかどうか
        //ユーザがDBに登録されている

        //TODO: ユーザの名前、メールアドレスがセッション内の情報と一致するか
        //TODO: 一致しなければ再度DBに登録しなおす？または利用規約ふみなおさせる？

        res.redirect(303, '/portal'); //registerページであればportalへリダイレクトさせる

    } else {

        next(errorHelper.create(500)) //エラーはnextに渡す
    }
}