const bunyan = require('bunyan');
const logger = bunyan.createLogger({name: 'portalLog'});

module.exports = logger;