'use strict';
const express = require('express');
const router = express.Router();

const helper = require('./helpers/middleware')
// Require our controllers.
var userController = require('../controllers/userController.js'); 

/* GET users listing. */
router.get('/delete', helper.isAuthenticated, helper.isTenantRegistered, helper.isUserRegistered, async (req, res) => {
    
    const deleted = await userController.delete(req.user.userId)
    //console.log(deleted)

    if(deleted == 1) {
        res.send('User delete success');
    } else {
        res.send('User delete failure');        
    }
});

module.exports = router;
