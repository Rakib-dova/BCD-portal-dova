'use strict'

const tradeshiftApi = () => {
  return require('./ts-api')
}

const bugyoApi = () => {
  return require('./obc-api')
}

module.exports = { tradeshiftApi, bugyoApi }
