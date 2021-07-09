// const logger = require('../lib/logger')

module.exports = {
  findOne: (postalNumber) => {
    const result = []
    try {
      tmpAddress = {
        '001': { 3530000: '埼玉県和光市白子1丁目' },
        '002': { 3530000: '埼玉県和光市白子2丁目' },
        '003': { 3530000: '埼玉県和光市白子3丁目' },
        '004': { 3530001: '埼玉県和光市黒子1丁目' },
        '005': { 3530002: '埼玉県和光市赤子' }
      }
      for (const pNumber in tmpAddress) {
        if (tmpAddress[pNumber][postalNumber]) {
          result.push(tmpAddress[pNumber][postalNumber])
        }
      }
      return result
    } catch (err) {
      console.log(err)
      return null
    }
  }
}
