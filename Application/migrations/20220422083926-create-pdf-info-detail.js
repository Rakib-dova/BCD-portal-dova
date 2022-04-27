'use strict'
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('PdfInfoDetails', {
      invoiceId: {
        primaryKey: true,
        references: {
          model: {
            tableName: 'PdfInfos'
          },
          key: 'invoiceId',
          onUpdate: 'cascacde',
          onDelete: 'cascacde'
        },
        type: Sequelize.UUID
      },
      no: {
        primaryKey: true,
        type: Sequelize.STRING(2)
      },
      contents: {
        type: Sequelize.STRING(60)
      },
      quantity: {
        type: Sequelize.INTEGER
      },
      unit: {
        type: Sequelize.STRING(10)
      },
      unitPrice: {
        type: Sequelize.INTEGER
      },
      taxRate: {
        type: Sequelize.INTEGER
      },
      subtotal: {
        type: Sequelize.INTEGER
      }
    })
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('PdfInfoDetails')
  }
}
