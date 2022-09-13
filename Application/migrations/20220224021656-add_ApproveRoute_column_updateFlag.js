'use strict'

// ApproveRouteテーブルupdateFlagカラム追加
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('ApproveRoute', 'updateFlag', {
      allowNull: false,
      type: Sequelize.BOOLEAN,
      defaultValue: 0
    })
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('ApproveRoute', 'updateFlag')
  }
}
