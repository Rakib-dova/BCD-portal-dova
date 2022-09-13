'use strict'

// ApprovalStatusテーブル作成・削除
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('ApprovalStatus', {
      code: {
        allowNull: false,
        primaryKey: true,
        type: Sequelize.DataTypes.STRING(2)
      },
      name: {
        allowNull: false,
        type: Sequelize.DataTypes.STRING(255)
      }
    })
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('ApprovalStatus')
  }
}
