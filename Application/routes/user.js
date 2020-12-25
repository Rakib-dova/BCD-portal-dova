'use strict';
const express = require('express');
const router = express.Router();
const logger = require('../lib/logger')
const helper = require('./helpers/middleware')
// Require our controllers.
var userController = require('../controllers/userController.js'); 

/* GET users listing. */
router.get('/delete', helper.isAuthenticated, helper.isTenantRegistered, helper.isUserRegistered, async (req, res, next) => {
    
    const deleted = await userController.delete(req.user.userId)
    //console.log(deleted)

    if(deleted == 1) {
        logger.info({tenant: req.user.companyId, user: req.user.userId}, 'User deleted successfully')
        res.send('User deleted successfully');
    } else {
        logger.warn({tenant: req.user.companyId, user: req.user.userId}, 'Failed to delete user')
        res.send('Failed to delete user');        
    }
});

module.exports = router;
