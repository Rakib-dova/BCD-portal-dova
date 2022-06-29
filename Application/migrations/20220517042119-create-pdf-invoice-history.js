'use strict'
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('pdfInvoiceHistories', {
      historyId: {
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
        type: Sequelize.INTEGER
      },
      failCount: {
        type: Sequelize.INTEGER
      },
      skipCount: {
        type: Sequelize.INTEGER
      },
      invoiceCount: {
        allowNull: true,
        type: Sequelize.INTEGER
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
    await queryInterface.dropTable('pdfInvoiceHistories')
  }
}
