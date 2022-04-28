'use strict'
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('PdfImprints', {
      invoiceId: {
        primaryKey: true,
        references: {
          model: {
            tableName: 'PdfInvoices'
          },
          key: 'invoiceId',
          onUpdate: 'cascacde',
          onDelete: 'cascacde'
        },
        type: Sequelize.UUID
      },
      imprint: {
        type: Sequelize.STRING(512)
      }
    })
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('PdfImprints')
  }
}
