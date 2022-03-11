'use strict'
const fkName = 'FK__RequestAp__appro__37FA4C37'
module.exports = {
  up: async (queryInterface, Sequelize) => {
    return [await queryInterface.removeConstraint('RequestApproval', fkName)]
  },

  down: async (queryInterface, Sequelize) => {
    return [
      await queryInterface.addConstraint('RequestApproval', {
        fields: ['approveRouteId'],
        type: 'foreign key',
        name: fkName,
        references: {
          table: 'ApproveRoute',
          field: 'approveRouteId'
        },
        onDelete: 'cascade',
        onUpdate: 'cascade'
      })
    ]
  }
}
