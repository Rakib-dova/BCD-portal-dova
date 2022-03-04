'use strict'

module.exports = {
  up: async (queryInterface, Sequelize) => {
    /**
     * Add altering commands here.
     *
     * Example:
     * await queryInterface.createTable('users', { id: Sequelize.INTEGER });
     */
    return await queryInterface.createTable('Approval', {
      approvalId: {
        primaryKey: true,
        type: Sequelize.DataTypes.UUID,
        allowNull: false
      },
      requestId: {
        type: Sequelize.DataTypes.UUID,
        references: {
          model: {
            tableName: 'RequestApproval'
          },
          key: 'requestId'
        },
        allowNull: false
      },
      approveUserId: {
        type: Sequelize.DataTypes.UUID,
        references: {
          model: {
            tableName: 'ApproveUser'
          },
          key: 'approveUserId'
        },
        allowNull: false
      },
      approveRouteId: {
        type: Sequelize.DataTypes.UUID,
        references: {
          model: {
            tableName: 'ApproveRoute'
          },
          key: 'approveRouteId'
        },
        allowNull: false
      },
      approvalStatus: {
        type: Sequelize.DataTypes.STRING(2),
        references: {
          model: {
            tableName: 'ApprovalStatus'
          },
          key: 'code'
        },
        allowNull: false
      },
      message: {
        type: Sequelize.DataTypes.STRING(1500),
        allowNull: false
      },
      approvedAt: {
        type: Sequelize.DataTypes.DATE,
        allowNull: false
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
    return await queryInterface.dropTable('Approval')
  }
}
