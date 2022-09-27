'use strict'

// ApproveUserテーブルapproveRouteIdカラムforeign key指定・解除
module.exports = {
  up: async (queryInterface, Sequelize) => {
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
    return [queryInterface.removeConstraint('ApproveUser', 'fk_ApproveUser_approveRoute')]
  }
}
