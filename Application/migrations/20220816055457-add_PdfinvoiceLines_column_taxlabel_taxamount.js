'use strict'

module.exports = {
  up: async (queryInterface, Sequelize) => {
    return [
      await queryInterface.addColumn('PdfInvoiceLines', 'taxLabel', {
        allowNull: true,
        type: Sequelize.STRING(100)
      }),
      await queryInterface.addColumn('PdfInvoiceLines', 'taxAmount', {
        type: Sequelize.FLOAT,
        defaultValue: 0
      })
    ]
  },

  down: async (queryInterface, Sequelize) => {
    return [
      await queryInterface.removeColumn('PdfInvoiceLines', 'taxLabel'),
      await queryInterface.removeColumn('PdfInvoiceLines', 'taxAmount')
    ]
  }
}
