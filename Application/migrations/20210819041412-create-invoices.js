'use strict'

// Invoicesテーブル追加・削除
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('Invoices', {
      invoicesId: {
        allowNull: false,
        primaryKey: true,
        type: Sequelize.UUID
      },
      tenantId: {
        allowNull: false,
        type: Sequelize.UUID
      },
      csvFileName: {
        allowNull: false,
        type: Sequelize.STRING
      },
      successCount: {
        type: Sequelize.STRING
      },
      failCount: {
        type: Sequelize.STRING
      },
      skipCount: {
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
    })
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('Invoices')
  }
}
