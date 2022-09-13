'use strict'

// ApproveRouteテーブルcontractIdカラムforeign key指定・解除
module.exports = {
  up: async (queryInterface, Sequelize) => {
    return [
      queryInterface.addConstraint('ApproveRoute', {
        fields: ['contractId'],
        type: 'foreign key',
        name: 'fk_ApproveRoute_contracts',
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
    return [queryInterface.removeConstraint('ApproveRoute', 'fk_ApproveRoute_contracts')]
  }
}
