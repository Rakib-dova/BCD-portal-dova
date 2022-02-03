'use strict'
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('Errors', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      userUuid: {
        allowNull: false,
        type: Sequelize.UUID
      },
      invoiceNo: {
        allowNull: false,
        type: Sequelize.STRING(6)
      },
      message: {
        type: Sequelize.STRING(1000)
      }
    })
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('Errors')
  }
}
