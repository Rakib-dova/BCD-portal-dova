'use strict'
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('DigitaltradeUsers', {
      digitaltradeId: {
        allowNull: false,
        primaryKey: true,
        type: Sequelize.UUID
      },
      deleteFlag: {
        type: Sequelize.BOOLEAN,
        defaultValue: 'false'
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    })
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('DigitaltradeUsers')
  }
}
