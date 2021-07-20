'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('Cancellations', {
      cancelId: {
        allowNull: false,
        primaryKey: true,
        type: Sequelize.UUID
      },
      contractId: {
        allowNull: false,
        type: Sequelize.UUID
      },
      cancelData: {
        allowNull: false,
        type: Sequelize.STRING(4000)
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
    await queryInterface.dropTable('Cancellations')
  }
};
