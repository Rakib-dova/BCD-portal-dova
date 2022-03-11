'use strict'

module.exports = {
  up: async (queryInterface, Sequelize) => {
    return [
      await queryInterface.addColumn('Approval', 'rejectedUser', {
        allowNull: true,
        type: Sequelize.UUID
      }),
      await queryInterface.addColumn('Approval', 'rejectedAt', {
        allowNull: true,
        type: Sequelize.DATE
      }),
      await queryInterface.addColumn('Approval', 'rejectedMessage', {
        allowNull: true,
        type: Sequelize.STRING(1500)
      })
    ]
  },

  down: async (queryInterface, Sequelize) => {
    return [
      await queryInterface.removeColumn('Approval', 'rejectedUser'),
      await queryInterface.removeColumn('Approval', 'rejectedAt'),
      await queryInterface.removeColumn('Approval', 'rejectedMessage')
    ]
  }
}
