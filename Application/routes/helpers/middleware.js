'use strict';
const e = require('express');
const express = require('express');
const router = express.Router();
// Require our controllers.
const userController = require('../../controllers/userController'); 

exports.isAuthenticated = async (req, res, next) => {

    //if(req.isAuthenticated()) {
    if(req.user && req.user.userId) {
        //セッションにユーザ情報が格納されている

        //セッション情報に前のアカウント情報が残っているが、新しいアカウントでTradeshiftにログインした場合を判定する

        next()
    } else {
        //authに飛ばす
        //POST->GETの可能性もあるためHTTP1.1に従い303を使う
        //https://developer.mozilla.org/ja/docs/Web/HTTP/Status/303
        res.redirect(303, '/auth')
    }

}

exports.isTenantRegistered = async (req, res, next) => {

    //isAuthed? noならreturnしてredirect（後続の処理は行わない）
    if(!req.user || !req.user.userId) return res.redirect(303, '/auth')

    //isRegistered? テナントがアカウント管理者によって登録されているか
    const user = await userController.findByTenantId(req.user.companyId)

    if(user === null) { //ユーザが見つからない場合null値になる
        //ユーザがDBに登録されていない
        req.session.userContext="NotTenantRegistered"

        res.redirect(303, '/register/tenant'); //registerへリダイレクトさせる

    } else if (user.dataValues && user.dataValues.userId) { //TODO: userIdがUUIDかどうか
        //ユーザがDBに登録されている

        //TODO: ユーザの名前、メールアドレスがセッション内の情報と一致するか
        //TODO: 一致しなければ再度DBに登録しなおす？または利用規約ふみなおさせる？

        next(); //register以外のページであれば続行

    } else {
        res.render('error', { //TODO: エラーハンドリングをしっかりかく
            message: "エラー:TODO エラーメッセージ",
            error: "エラー"
        });
    }
}

exports.isUserRegistered = async (req, res, next) => {

    if(!req.user || !req.user.userId) return res.redirect(303, '/auth')

    //isRegistered? テナントがアカウント管理者によって登録されているか
    const user = await userController.findOne(req.user.userId)

    if(user === null) { //ユーザが見つからない場合null値になる
        //ユーザがDBに登録されていない
        req.session.userContext="NotUserRegistered"

        res.redirect(303, '/register/user'); //registerへリダイレクトさせる

    } else if (user.dataValues && user.dataValues.userId) { //TODO: userIdがUUIDかどうか
        //ユーザがDBに登録されている

        //TODO: ユーザの名前、メールアドレスがセッション内の情報と一致するか
        //TODO: 一致しなければ再度DBに登録しなおす？または利用規約ふみなおさせる？

        next(); //register以外のページであれば続行

    } else {
        res.render('error', { //TODO: エラーハンドリングをしっかりかく
            message: "エラー:TODO エラーメッセージ",
            error: "エラー"
        });
    }
}


exports.isNotTenantRegistered = async (req, res, next) => {

    if(!req.user || !req.user.userId) return res.redirect(303, '/auth')

    //isRegistered? テナントが登録されているか
    const user = await userController.findByTenantId(req.user.companyId)

    if(user === null) { //ユーザが見つからない場合null値になる
 
        next(); //registerページであれば続行

    } else if (user.dataValues && user.dataValues.userId) { //TODO: userIdがUUIDかどうか
        //ユーザがDBに登録されている

        //TODO: ユーザの名前、メールアドレスがセッション内の情報と一致するか
        //TODO: 一致しなければ再度DBに登録しなおす？または利用規約ふみなおさせる？

        res.redirect(303, '/portal'); //registerページであればportalへリダイレクトさせる

    } else {
        res.render('error', { //TODO: エラーハンドリングをしっかりかく
            message: "エラー:TODO エラーメッセージ",
            error: "エラー"
        });
    }
}