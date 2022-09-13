'use strict'

// InvoicesテーブルtenantIdカラムforeign key指定・解除
module.exports = {
  up: async (queryInterface, Sequelize) => {
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
    return [queryInterface.removeConstraint('Invoices', 'fk_invoices_tenants')]
  }
}
