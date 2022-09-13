'use strict'

// ApproveRouteテーブル作成・削除
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('ApproveRoute', {
      approveRouteId: {
        allowNull: false,
        primaryKey: true,
        type: Sequelize.UUID
      },
      contractId: {
        allowNull: false,
        type: Sequelize.UUID
      },
      approveRouteName: {
        allowNull: false,
        type: Sequelize.STRING(40)
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
    await queryInterface.dropTable('ApproveRoute')
  }
}
