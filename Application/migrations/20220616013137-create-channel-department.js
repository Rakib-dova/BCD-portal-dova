'use strict'
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('ChannelDepartment', {
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
    await queryInterface.dropTable('ChannelDepartment')
  }
}
