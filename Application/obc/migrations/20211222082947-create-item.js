'use strict'
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable(
      'Items',
      {
        id: {
          allowNull: false,
          autoIncrement: true,
          primaryKey: true,
          type: Sequelize.INTEGER
        },
        formatId: {
          allowNull: false,
          type: Sequelize.INTEGER
        },
        key: {
          allowNull: false,
          type: Sequelize.STRING
        }
      },
      {
        schema: 'obc'
      }
    )
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('Items', { schema: 'obc' })
  }
}
