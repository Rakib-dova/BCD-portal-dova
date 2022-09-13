'use strict'

// InvoiceDetailテーブル追加・削除
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('InvoiceDetail', {
      invoiceDetailId: {
        allowNull: false,
        primaryKey: true,
        type: Sequelize.UUID
      },
      invoicesId: {
        allowNull: false,
        type: Sequelize.UUID
      },
      lines: {
        allowNull: false,
        type: Sequelize.INTEGER
      },
      invoiceId: {
        allowNull: false,
        type: Sequelize.STRING
      },
      status: {
        allowNull: false,
        type: Sequelize.STRING
      },
      errorData: {
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
    await queryInterface.dropTable('InvoiceDetail')
  }
}
