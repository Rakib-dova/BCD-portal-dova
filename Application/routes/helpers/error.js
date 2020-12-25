'use strict';
const e = require('express');
const express = require('express');
const router = express.Router();
// Require our controllers.

exports.create = (status) => {

    let e;
    switch(status) {
        case 500:
            e = new Error('サーバ内部でエラーが発生しました。'); e.name = 'Internal Server Error'; e.status = 500
            break;
        case 400:
            e = new Error('不正なリクエストが実行されました。'); e.name = 'Bad Request'; e.status = 400
            break;
    }
    return e;
}