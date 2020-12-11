'use strict';
const express = require('express');
const router = express.Router();
const passport = require('passport');

// Require our controllers.
var userController = require('../controllers/userController.js'); 

/* GET users listing. */
//router.get('/', userController.getUsers);


// /authにアクセスした時
router.get('/', passport.authenticate('tradeshift', { scope: 'openid offline' }));

// /auth/callbackにアクセスした時
router.get('/callback',    passport.authenticate('tradeshift', { failureRedirect: '/auth' }), async (req, res) => {
    //userControllersでuserIdを検索
    //req.user.userId="aaaaa"
    const user = await userController.findOne(req.user.userId)

    if(user === null) { //TODO:ユーザが見つからない場合null値になる
        res.redirect('/register'); //registerへリダイレクトさせる
    } else if (user.dataValues && user.dataValues.userId) { //TODO: userIdがUUIDかどうか
        res.redirect('/'); //indexへリダイレクトさせる
    } else {
        res.render('error', { //TODO: エラーハンドリングをしっかりかく
            message: "エラー",
            error: "エラー"
        });
    }
});





module.exports = router;
