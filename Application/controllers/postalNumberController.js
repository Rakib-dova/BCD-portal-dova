const { Connection, Request } = require('tedious')
const logger = require('../lib/logger')
const DB_NAME =  process.env.DB_NAME
const DB_USER =  process.env.DB_USER
const DB_PASS =  process.env.DB_PASS
const DB_HOST =  process.env.DB_HOST
const config = {
  authentication: {
    options: { userName: DB_USER, password: DB_PASS },
    type: 'default'
  },
  server: DB_HOST,
  options: { database: DB_NAME, encrypt: DB_HOST !== 'localhost', validateBulkLoadParameters: false, rowCollectionOnRequestCompletion: true }
} 

module.exports = {
  findOne:function (postalNumber) {
    return new Promise((resolve, reject) => {      
      const connection = new Connection(config)
      const result = []
     
      connection.on('connect', async (err) => {
        if (err) {
          logger.error(err)
          reject({ statuscode: 501, value: 'failed connected'})
        } else {
          logger.info('success connect')
          execStatement()
        }
      })
      
      connection.connect()
     
      function execStatement() {
        const request = new Request(`SELECT CONCAT(state, city, address1, address2) address FROM Addresses WHERE postalCode = '${postalNumber}'`, (err, rowCount, rows) => {
          if (err) {
            logger.error(err)
            reject({ statuscode: 502, value: 'statement error'})
          } else if (rowCount > 0) {
            rows.forEach((row) => {
              result.push({'address': row[0].value})
            })
          }
          resolve({statuscode: 200, value: result})
        })
        
        request.on('requestCompleted', function() {
         connection.close()
        })
        
        connection.execSql(request) 
     }      
    })
  }
}
