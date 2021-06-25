'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('Orders', {
      contractId: {
        allowNull: false,
        primaryKey: true,
        type: Sequelize.UUID
      },
      tenantId: {
        allowNull: false,
        type: Sequelize.UUID
      },
      numberNForOrder: {
        type: Sequelize.STRING(255)
      },
      orderType: {
        type: Sequelize.INTEGER
      },
      orderData: {
        type: Sequelize.STRING(255)
      },
      lastRefreshedAt: {
        type: Sequelize.DATE
      }
    })
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('Orders')
  }
};
