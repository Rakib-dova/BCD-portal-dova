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
      queryInterface.addConstraint('ApproveUser', {
        fields: ['approveRouteId'],
        type: 'foreign key',
        name: 'fk_ApproveUser_approveRoute',
        references: {
          table: 'ApproveRoute',
          field: 'approveRouteId'
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
    return [queryInterface.removeConstraint('ApproveUser', 'fk_ApproveUser_approveRoute')]
  }
}
