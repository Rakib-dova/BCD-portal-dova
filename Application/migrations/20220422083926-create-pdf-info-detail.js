'use strict'
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('pdfInfoDetails', {
      invoiceId: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.String(50)
      },
      no: {
        type: Sequelize.STRING(2)
      },
      contents: {
        type: Sequelize.STRING(60)
      },
      unit: {
        type: Sequelize.STRING(10)
      },
      unitPrice: {
        type: Sequelize.FLOAT(14)
      },
      taxRate: {
        type: Sequelize.INTEGER(2)
      },
      subtotal: {
        type: Sequelize.FLOAT(14)
      }
    })
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('pdfInfoDetails')
  }
}
