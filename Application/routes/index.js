﻿'use strict';
const express = require('express');
const router = express.Router();

/* GET home page. */
router.get('/', function (req, res) {
    console.log(req.user.userId)
    res.render('index', { title: 'ポータル' , state: req.query.state, customerId: req.user.userId });
});

module.exports = router;
