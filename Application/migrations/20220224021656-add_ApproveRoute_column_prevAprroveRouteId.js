'use strict'

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('ApproveRoute', 'prevAprroveRouteId', {
      allowNull: true,
      type: Sequelize.UUID
    })
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('ApproveRoute', 'prevAprroveRouteId')
  }
}
