'use strict'
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('PdfSealImps', {
      invoiceId: {
        primaryKey: true,
        allowNull: false,
        type: Sequelize.UUID,
        references: {
          model: {
            tableName: 'PdfInvoices'
          },
          key: 'invoiceId',
          onUpdate: 'cascacde',
          onDelete: 'cascacde'
        }
      },
      image: {
        type: Sequelize.BLOB
      }
    })
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('PdfSealImps')
  }
}
