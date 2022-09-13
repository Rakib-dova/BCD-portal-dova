'use strict'

// ApproveRouteテーブルdeleteFlagカラム追加
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('ApproveRoute', 'deleteFlag', {
      allowNull: false,
      type: Sequelize.BOOLEAN,
      defaultValue: 0
    })
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('ApproveRoute', 'deleteFlag')
  }
}
