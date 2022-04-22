'use strict'
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('pdfInfoTaxes', {
      invoiceId: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.STRING(50)
      },
      taxClass: {
        primaryKey: true,
        type: Sequelize.STRING(20)
      },
      taxRate: {
        allowNull: false,
        type: Sequelize.FLOAT(2)
      },
      taxTotal: {
        allowNull: false,
        type: Sequelize.FLOAT(14)
      }
    })
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('pdfInfoTaxes')
  }
}
