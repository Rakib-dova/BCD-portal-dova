'use strict'
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable(
      'Terms',
      {
        version: {
          allowNull: false,
          autoIncrement: true,
          primaryKey: true,
          type: Sequelize.INTEGER
        },
        content: {
          allowNull: false,
          type: Sequelize.STRING(4000)
        },
        effectiveAt: {
          allowNull: false,
          type: Sequelize.DATE
        }
      },
      {
        schema: 'obc'
      }
    )
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('Terms', { schema: 'obc' })
  }
}
