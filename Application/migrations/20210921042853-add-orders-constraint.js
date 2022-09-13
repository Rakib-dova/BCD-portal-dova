'use strict'

// OrdersテーブルcontractIdカラムforeign key指定・解除
module.exports = {
  up: async (queryInterface, Sequelize) => {
    return [
      queryInterface.addConstraint('Orders', {
        fields: ['contractId'],
        type: 'foreign key',
        name: 'fk_orders_contracts',
        references: {
          table: 'Contracts',
          field: 'contractId'
        },
        onDelete: 'cascade',
        onUpdate: 'cascade'
      })
    ]
  },

  down: async (queryInterface, Sequelize) => {
    return [queryInterface.removeConstraint('Orders', 'fk_orders_contracts')]
  }
}
