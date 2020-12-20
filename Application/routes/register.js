'use strict';
const express = require('express');
const router = express.Router();

const helper = require('./helpers/middleware')
// Require our controllers.
var userController = require('../controllers/userController.js'); 

const apihelper = require('../lib/apihelper');
const logger = require('../lib/logger')

router.get('/tenant', helper.isAuthenticated, async (req, res) => {

    if(req.session.userContext != "NotTenantRegistered") {
        return  res.render('error', { //TODO: エラーハンドリングをしっかりかく
            message: "エラー不正な操作が行われました（TODO:エラーメッセージ）",
            error: "エラー"
        });
    }

    const userdata = await apihelper.accessTradeshift(req.user.accessToken, req.user.refreshToken, "get", "/account/info/user")

    if(userdata.Memberships[0].Role.toLowerCase() != "a6a3edcd-00d9-427c-bf03-4ef0112ba16d") {
        return res.render('error', { //TODO: エラーハンドリングをしっかりかく
            message: "デジタルトレードのご利用にはアカウント管理者による利用登録が必要です。（TODO:画面デザイン）",
            error: "エラー"
        });
    }
    const companyName = userdata.CompanyName;
    const userName = userdata.LastName+" "+userdata.FirstName;
    const email = userdata.Username; //TradeshiftのAPIではUsernameにemailが入っている

    const companydata = await apihelper.accessTradeshift(req.user.accessToken, req.user.refreshToken, "get", "/account/info")

    //city,street,zipは空値の可能性がある
    //ただし全て空値か、全て値が入っているかの二択
    let city,street,zip;
    try {
        city = companydata.AddressLines.filter(item => (item.scheme == "city"))[0].value
        street = companydata.AddressLines.filter(item => (item.scheme == "street"))[0].value
        zip = companydata.AddressLines.filter(item => (item.scheme == "zip"))[0].value.replace(/-/g,"")//郵便番号はハイフンなし
    } catch {
        city = ""
        street = ""
        zip = ""
    }
    const address = city + " " + street

    res.render('registerTenant', { title: '利用登録', companyName: companyName, userName: userName, email: email, zip: zip, address: address, customerId: 'none' });

});

router.get('/user', helper.isAuthenticated, async (req, res) => {

    if(req.session.userContext != "NotUserRegistered") {
        return  res.render('error', { //TODO: エラーハンドリングをしっかりかく
            message: "エラー不正な操作が行われました（TODO:エラーメッセージ）",
            error: "エラー"
        });
    }

    res.render('registerUser', { title: '利用登録' });


});

router.post('/tenant', helper.isAuthenticated, async (req,res) => {

    if(req.session.userContext != "NotTenantRegistered") {
        return  res.render('error', { //TODO: エラーハンドリングをしっかりかく
            message: "エラー不正な操作が行われました（TODO:エラーメッセージ）",
            error: "エラー"
        });
    }

    //TODO: formのバリデーションチェック
    //console.log(req.body);
    
    //TODO: Subspere経由でSO系にformの内容を送信

    //TODO: DBにセッション内のuser情報を登録
    
    //ユーザ登録と同時にテナント登録も行われる
    const user = await userController.create(req.user.accessToken, req.user.refreshToken)

    if(user !== null) {
        //テナント＆ユーザ登録成功したら
        logger.info({tenant: req.user.companyId, user: req.user.userId}, 'Tenant Registration Succeeded')

        req.flash('info', '登録を受け付けました。「お客様番号」を記載したメールを受領後に、登録完了となります。');
        res.redirect('/portal');
    } else {
    //失敗したら
        res.render('error', { //TODO: エラーハンドリングをしっかりかく
            message: "エラー:TODO エラーメッセージ",
            error: "エラー"
        });
    }
});


router.post('/user', helper.isAuthenticated, async (req,res) => {

    if(req.session.userContext != "NotUserRegistered") {
        return  res.render('error', { //TODO: エラーハンドリングをしっかりかく
            message: "エラー不正な操作が行われました（TODO:エラーメッセージ）",
            error: "エラー"
        });
    }
    
    //TODO: Subspere経由でSO系にformの内容を送信

    //TODO: DBにセッション内のuser情報を登録
    let user;
    try {
    user = await userController.create(req.user.accessToken, req.user.refreshToken)
    } catch(error){
        res.render('error', { //TODO: エラーハンドリングをしっかりかく
            message: "エラー:TODO エラーメッセージ",
            error: "エラー"
        });
    }
    if(user !== null) {
        //ユーザ登録成功したら
        logger.info({tenant: req.user.companyId, user: req.user.userId}, 'User Registration Succeeded')

        res.redirect('/portal');
    } else {
    //失敗したら
        res.render('error', { //TODO: エラーハンドリングをしっかりかく
            message: "エラー:TODO エラーメッセージ",
            error: "エラー"
        });
    }
});

module.exports = router;
