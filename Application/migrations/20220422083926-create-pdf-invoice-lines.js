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
        type: Sequelize.STRING(5)
      },
      lineDiscription: {
        type: Sequelize.STRING(100)
      },
      unit: {
        type: Sequelize.STRING(10)
      },
      unitPrice: {
        type: Sequelize.DECIMAL(12, 0)
      },
      quantity: {
        type: Sequelize.DECIMAL(15, 3)
      },
      taxType: {
        type: Sequelize.STRING(12)
      }
    })
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('PdfInvoiceLines')
  }
}
