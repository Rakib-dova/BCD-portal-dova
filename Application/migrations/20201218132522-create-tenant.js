'use strict';
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('Tenants', {
      tenantId: {
        allowNull: false,
        type: Sequelize.UUID,
        primaryKey: true
      },
      registeredBy: {
        allowNull: false,
        type: Sequelize.UUID
      },
      customerId: {
        type: Sequelize.STRING
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('Tenants');
  }
};