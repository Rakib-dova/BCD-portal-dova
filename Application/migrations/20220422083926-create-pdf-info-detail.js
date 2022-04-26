'use strict'
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('pdfInfoDetails', {
      invoiceId: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        references: {
          model: {
            tableName: 'pdfInfo'
          },
          key: 'invoiceId'
        },
        type: Sequelize.DataTypes.UUID
      },
      no: {
        primaryKey: true,
        type: Sequelize.STRING(2)
      },
      contents: {
        type: Sequelize.STRING(60)
      },
      quantity: {
        type: Sequelize.INTEGER(14)
      },
      unit: {
        type: Sequelize.STRING(10)
      },
      unitPrice: {
        type: Sequelize.INTEGER(14)
      },
      taxRate: {
        type: Sequelize.INTEGER(2)
      },
      subtotal: {
        type: Sequelize.INTEGER(14)
      }
    })
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('pdfInfoDetails')
  }
}
