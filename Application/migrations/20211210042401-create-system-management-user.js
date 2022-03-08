'use strict'
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('SystemManagementUsers', {
      sysManagementUser: {
        allowNull: false,
        primaryKey: true,
        type: Sequelize.STRING(255)
      },
      hashPassword: {
        allowNull: false,
        type: Sequelize.STRING(255)
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    })
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('SystemManagementUsers')
  }
}
