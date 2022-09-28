'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('PdfInvoices', 'discounts', {
      type: Sequelize.INTEGER,
      defaultValue: 0
    })
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('PdfInvoices', 'discounts')
  }
}
