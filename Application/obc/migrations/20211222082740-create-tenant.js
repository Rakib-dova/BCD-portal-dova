'use strict'
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable(
      'Tenants',
      {
        userUuid: {
          allowNull: false,
          primaryKey: true,
          type: Sequelize.UUID
        },
        tenantUuid: {
          allowNull: false,
          primaryKey: true,
          type: Sequelize.UUID
        },
        formatId: {
          allowNull: false,
          type: Sequelize.INTEGER
        }
      },
      {
        schema: 'obc'
      }
    )
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('Tenants', { schema: 'obc' })
  }
}
