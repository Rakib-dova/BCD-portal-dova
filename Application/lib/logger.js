const bunyan = require('bunyan');
const logger = bunyan.createLogger({name: 'portal'});

module.exports = logger;