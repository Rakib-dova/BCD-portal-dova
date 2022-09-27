'use strict'

// Contractsテーブル作成・削除
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('Contracts', {
      contractId: {
        allowNull: false,
        primaryKey: true,
        type: Sequelize.UUID
      },
      tenantId: {
        allowNull: false,
        type: Sequelize.UUID
      },
      numberN: {
        type: Sequelize.STRING
      },
      contractStatus: {
        allowNull: false,
        type: Sequelize.STRING
      },
      deleteFlag: {
        allowNull: false,
        type: Sequelize.BOOLEAN,
        defaultValue: 0
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
    await queryInterface.dropTable('Contracts')
  }
}
