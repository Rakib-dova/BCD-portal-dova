'use strict';
var express = require('express');
var router = express.Router();

/* GET users listing. */
router.get('/', function (req, res) {
    res.render('register', { title: '利用登録', customerId: 'none' });
});

module.exports = router;
