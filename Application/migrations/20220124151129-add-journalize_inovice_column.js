'use strict'

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('Journalize_invoice', 'journalNo', {
      allowNull: false,
      type: Sequelize.STRING
    })
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('Journalize_invoice', 'journalNo')
  }
}
