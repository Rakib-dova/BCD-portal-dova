const logger = require('../lib/logger')
const Address = require('../models/index').Address

module.exports = {
  /**
   * 住所データ取得
   * @param {string} postalNumber 郵便番号
   * @returns {boolean} { statuscode: 200, value: [住所データ]}（正常）、{ statuscode: 500, value: []}（DBエラー、システムエラーなど）
   */
  findOne: async (postalNumber) => {
    const resultAddressList = {
      statuscode: 200,
      value: []
    }
    try {
      const addresses = await Address.findAll({ where: { postalCode: postalNumber } })
      addresses.forEach((address) => {
        const state = address.dataValues.state
        const city = address.dataValues.city
        const address1 = address.dataValues.address1 === null ? '' : address.dataValues.address1
        const address2 = address.dataValues.address2 === null ? '' : address.dataValues.address2
        resultAddressList.value.push({ address: ''.concat(state, city, address1, address2) })
      })
      return resultAddressList
    } catch (error) {
      logger.error({ postalNumber: postalNumber, stack: error.stack, status: 0 }, error.name)
      resultAddressList.statuscode = 500
      return resultAddressList
    }
  }
}
