const bunyan = require('bunyan')
const logger = bunyan.createLogger({ name: 'portalLog', level: 'trace' })

module.exports = logger
