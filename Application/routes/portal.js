'use strict';
const express = require('express');
const router = express.Router();

/* GET users listing. */
router.get('/', function (req, res) {
    res.render('portal', { title: 'ポータル' , state: req.query.state, customerId: 'xxxxxxxx' });
});

module.exports = router;
