'use strict'
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('pdfInvoiceHistoryDetails', {
      historyDetailId: {
        allowNull: false,
        primaryKey: true,
        type: Sequelize.UUID
      },
      historyId: {
        allowNull: false,
        type: Sequelize.UUID,
        references: {
          model: { tableName: 'pdfInvoiceHistories' },
          key: 'historyId'
        },
        onUpdate: 'cascade',
        onDelete: 'cascade'
      },
      lines: {
        allowNull: false,
        type: Sequelize.INTEGER
      },
      invoiceNo: {
        allowNull: false,
        type: Sequelize.STRING
      },
      status: {
        allowNull: false,
        type: Sequelize.INTEGER
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
    await queryInterface.dropTable('pdfInvoiceHistoryDetails')
  }
}
