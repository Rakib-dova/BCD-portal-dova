'use strict'

// AccountCodeテーブルcontractIdカラムforeign key指定・解除
module.exports = {
  up: async (queryInterface, Sequelize) => {
    return [
      queryInterface.addConstraint('AccountCode', {
        fields: ['contractId'],
        type: 'foreign key',
        name: 'fk_accountCode_contracts',
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
    return [queryInterface.removeConstraint('AccountCode', 'fk_accountCode_contracts')]
  }
}
