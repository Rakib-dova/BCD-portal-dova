'use strict'
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable(
      'Formats',
      {
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
        name: {
          allowNull: false,
          type: Sequelize.STRING
        },
        createdAt: {
          allowNull: false,
          type: Sequelize.DATE
        },
        createdUser: {
          allowNull: false,
          type: Sequelize.STRING
        },
        updatedAt: {
          allowNull: false,
          type: Sequelize.DATE
        },
        updatedUser: {
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
    await queryInterface.dropTable('Formats', { schema: 'obc' })
  }
}
