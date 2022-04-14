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
      queryInterface.addConstraint('Invoices', {
        fields: ['tenantId'],
        type: 'foreign key',
        name: 'fk_invoices_tenants',
        references: {
          table: 'Tenants',
          field: 'tenantId'
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
    return [queryInterface.removeConstraint('Invoices', 'fk_invoices_tenants')]
  }
}
