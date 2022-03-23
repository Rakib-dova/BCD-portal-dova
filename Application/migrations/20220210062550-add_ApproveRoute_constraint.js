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
    /**
     * Add reverting commands here.
     *
     * Example:
     * await queryInterface.dropTable('users');
     */
    return [queryInterface.removeConstraint('ApproveRoute', 'fk_ApproveRoute_contracts')]
  }
}
