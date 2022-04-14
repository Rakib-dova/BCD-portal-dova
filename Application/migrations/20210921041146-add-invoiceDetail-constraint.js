'use strict'

module.exports = {
  up: async (queryInterface, Sequelize) => {
    /**
     * Add altering commands here.
     *
     * Example:
     * await queryInterface.createTable('users', { id: Sequelize.INTEGER });
     */
    return [
      await queryInterface.addConstraint('InvoiceDetail', {
        fields: ['invoicesId'],
        type: 'foreign key',
        name: 'fk_invoiceDetail_invoices',
        references: {
          table: 'Invoices',
          field: 'invoicesId'
        },
        onDelete: 'cascade',
        onUpdate: 'cascade'
      })
    ]
  },

  down: async (queryInterface, Sequelize) => {
    /**
     * Add reverting commands here.
     *
     * Example:
     * await queryInterface.dropTable('users');
     */
    return [await queryInterface.removeConstraint('InvoiceDetail', 'fk_invoiceDetail_invoices')]
  }
}
