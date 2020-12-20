'use strict';
const express = require('express');
const router = express.Router();
const passport = require('passport');
const logger = require('../lib/logger')

// Require our controllers.
var userController = require('../controllers/userController.js'); 

// /authにアクセスした時
router.get('/', passport.authenticate('tradeshift', { scope: 'openid offline' }));

// /auth/callbackにアクセスした時
router.get('/callback', passport.authenticate('tradeshift', { failureRedirect: '/auth/failuer' }), async (req, res) => {

    logger.info({tenant: req.user.companyId, user: req.user.userId}, 'Tradeshift Authentication Succeeded')

    //ユーザの登録が見つかったら更新
    await userController.findAndUpdate(req.user.userId, req.user.accessToken, req.user.refreshToken)

    //ユーザが見つかっても見つからなくてもindexにリダイレクトさせる
    res.redirect('/'); //indexへリダイレクトさせる

/*
    if(user === null) { //ユーザが見つからない場合null値になる

        res.redirect('/register'); //registerへリダイレクトさせる
        
    } else if (user.dataValues && user.dataValues.userId) { //TODO: userIdがUUIDかどうか
    
        res.redirect('/'); //indexへリダイレクトさせる
    
    } else {
    
        res.render('error', { //TODO: エラーハンドリングをしっかりかく
            message: "エラー:TODO エラーメッセージ",
            error: "エラー"
        });
    
    }
*/
});

router.get('/failure', (req, res) => {

    res.render('error', { //TODO: エラーハンドリングをしっかりかく
        message: "エラー:TODO エラーメッセージ",
        error: "エラー"
    });

})





module.exports = router;
