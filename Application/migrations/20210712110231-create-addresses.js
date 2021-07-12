'use strict'
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('Addresses', {
      addressKey: {
        allowNull: false,
        primaryKey: true,
        type: Sequelize.UUID
      },
      state: {
        type: Sequelize.STRING
      },
      city: {
        type: Sequelize.STRING
      },
      address1: {
        type: Sequelize.STRING
      },
      address2: {
        type: Sequelize.STRING
      },
      postalCode: {
        type: Sequelize.UUID
      }
    })
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('Addresses')
  }
}