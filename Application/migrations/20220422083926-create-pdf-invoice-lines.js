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
      lineDescription: {
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
      },
      discountDescription1: {
        type: Sequelize.STRING(100)
      },
      discountAmount1: {
        type: Sequelize.DECIMAL(12, 0)
      },
      discountUnit1: {
        type: Sequelize.STRING(10)
      },
      discountDescription2: {
        type: Sequelize.STRING(100)
      },
      discountAmount2: {
        type: Sequelize.DECIMAL(12, 0)
      },
      discountUnit2: {
        type: Sequelize.STRING(10)
      },
      discountDescription3: {
        type: Sequelize.STRING(100)
      },
      discountAmount3: {
        type: Sequelize.DECIMAL(12, 0)
      },
      discountUnit3: {
        type: Sequelize.STRING(10)
      }
    })
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('PdfInvoiceLines')
  }
}
