'use strict'
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('AuthenticationHistories', {
      digitaltradeId: {
        allowNull: false,
        type: Sequelize.UUID
      },
      authenticationLinkageId: {
        type: Sequelize.STRING(255)
      },
      authenticationLoginId: {
        type: Sequelize.STRING(255)
      },
      authenticationServiceCategory: {
        type: Sequelize.STRING(10)
      },
      serviceLinkageId: {
        type: Sequelize.STRING(255)
      },
      serviceLinkageSubId: {
        type: Sequelize.STRING(255)
      },
      serviceLinkageCategory: {
        type: Sequelize.STRING(10)
      },
      historyCategory: {
        type: Sequelize.STRING(10)
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
    await queryInterface.dropTable('AuthenticationHistories')
  }
}
