'use strict'
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('Messages', {
      code: {
        allowNull: false,
        primaryKey: true,
        type: Sequelize.STRING(6)
      },
      message: {
        allowNull: false,
        type: Sequelize.STRING(2000)
      }
    })
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('Messages', { schema: 'obc' })
  }
}
