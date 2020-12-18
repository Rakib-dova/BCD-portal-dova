'use strict';
const express = require('express');
const router = express.Router();
const passport = require('passport');
const helper = require('./helpers/middleware')

/* GET users listing. */
router.get('/', helper.isAuthenticated, helper.isTenantRegistered, helper.isUserRegistered, function (req, res) {

    req.session.userContext = "LoggedIn"
    res.render('portal', { title: 'ポータル' , state: req.query.state, customerId: req.user.userId, TS_HOST: process.env.TS_HOST });

});

module.exports = router;
