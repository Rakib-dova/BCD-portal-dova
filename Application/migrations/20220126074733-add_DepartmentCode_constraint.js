'use strict'

// DepartmentCodeテーブルcontractIdカラムforeign key指定・解除
module.exports = {
  up: async (queryInterface, Sequelize) => {
    return [
      queryInterface.addConstraint('DepartmentCode', {
        fields: ['contractId'],
        type: 'foreign key',
        name: 'fk_DepartmentCode_contracts',
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
    return [queryInterface.removeConstraint('DepartmentCode', 'fk_DepartmentCode_contracts')]
  }
}
