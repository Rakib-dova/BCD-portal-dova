'use strict'

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('Invoices', 'invoiceCount', {
      allowNull: true,
      type: Sequelize.INTEGER
    })
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('Invoices', 'invoiceCount')
  }
}
