'use strict'

// InvoiceDetailテーブルinvoicesIdカラムforeign key指定・解除
module.exports = {
  up: async (queryInterface, Sequelize) => {
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
    return [await queryInterface.removeConstraint('InvoiceDetail', 'fk_invoiceDetail_invoices')]
  }
}
