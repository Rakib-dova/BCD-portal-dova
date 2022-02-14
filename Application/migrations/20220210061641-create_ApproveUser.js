'use strict'

module.exports = {
  up: async (queryInterface, Sequelize) => {
    /**
     * Add altering commands here.
     *
     * Example:
     * await queryInterface.createTable('users', { id: Sequelize.INTEGER });
     */
    await queryInterface.createTable('ApproveUser', {
      approveUserId: {
        allowNull: false,
        primaryKey: true,
        type: Sequelize.UUID
      },
      approveRouteId: {
        allowNull: false,
        type: Sequelize.UUID
      },
      approveUsers: {
        allowNull: false,
        type: Sequelize.UUID
      },
      prevApproveUser: {
        allowNull: true,
        type: Sequelize.UUID
      },
      nextApproveUser: {
        allowNull: true,
        type: Sequelize.UUID
      },
      lastApproveUserId: {
        allowNull: false,
        type: Sequelize.UUID
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
    /**
     * Add reverting commands here.
     *
     * Example:
     * await queryInterface.dropTable('users');
     */
    await queryInterface.dropTable('ApproveUser')
  }
}
