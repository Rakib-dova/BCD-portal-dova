'use strict'
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('Users', {
      uuid: {
        allowNull: false,
        primaryKey: true,
        type: Sequelize.UUID
      },
      previewRecipientUuid: {
        type: Sequelize.UUID
      },
      tosVersion: {
        type: Sequelize.INTEGER
      },
      lastInvoiceNo: {
        type: Sequelize.STRING(6)
      }
    })
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('Users')
  }
}
