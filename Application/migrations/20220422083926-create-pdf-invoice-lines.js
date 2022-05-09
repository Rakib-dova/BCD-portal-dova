'use strict'
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('PdfInvoiceLines', {
      invoiceId: {
        type: Sequelize.UUID,
        primaryKey: true,
        references: {
          model: { tableName: 'PdfInvoices' },
          key: 'invoiceId'
        },
        onUpdate: 'cascade',
        onDelete: 'cascade'
      },
      lineIndex: {
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      lineId: {
        type: Sequelize.STRING(8)
      },
      lineDiscription: {
        type: Sequelize.STRING(60)
      },
      unit: {
        type: Sequelize.STRING(10)
      },
      unitPrice: {
        type: Sequelize.FLOAT
      },
      quantity: {
        type: Sequelize.INTEGER
      },
      taxType: {
        type: Sequelize.STRING(8)
      }
    })
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('PdfInvoiceLines')
  }
}
