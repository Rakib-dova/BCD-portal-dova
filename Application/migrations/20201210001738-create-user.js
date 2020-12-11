'use strict';
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('Users', {
      userId: {
        allowNull: false,
        primaryKey: true,
        type: Sequelize.UUID
      },
      tenantId: {
        allowNull: false,
        type: Sequelize.UUID
      },
      userRole: {
        allowNull: false,
        type: Sequelize.UUID
      },
      appVersion: {
        allowNull: false,
        type: Sequelize.STRING
      },
      refreshToken: {
        type: Sequelize.STRING(840)
      },
      subRefreshToken: {
        type: Sequelize.STRING(840)
      },
      userStatus: {
        defaultValue: 0,
        allowNull: false,
        type: Sequelize.INTEGER
      },
      lastRefreshedAt: {
        type: Sequelize.DATE
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
    await queryInterface.dropTable('Users');
  }
};