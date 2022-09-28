'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('PdfInvoiceLines', 'discounts', {
      type: Sequelize.INTEGER,
      defaultValue: 0
    })
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('PdfInvoiceLines', 'discounts')
  }
}
