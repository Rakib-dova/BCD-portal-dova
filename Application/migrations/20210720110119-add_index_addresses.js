'use strict'

// AddressesテーブルIdex追加・削除
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addIndex('Addresses', ['postalCode'], {
      name: 'addresses_postalCode_index'
    })
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeIndex('Addresses', 'addresses_postalCode_index')
  }
}
