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
      requestUserId: {
        type: Sequelize.DataTypes.UUID,
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
      approveRouteName: {
        type: Sequelize.DataTypes.STRING(40),
        allowNull: false
      },
      approveUser1: {
        type: Sequelize.DataTypes.UUID,
        allowNull: true
      },
      approvalAt1: {
        type: Sequelize.DataTypes.DATE,
        allowNull: true
      },
      approveUser2: {
        type: Sequelize.DataTypes.UUID,
        allowNull: true
      },
      approvalAt2: {
        type: Sequelize.DataTypes.DATE,
        allowNull: true
      },
      approveUser3: {
        type: Sequelize.DataTypes.UUID,
        allowNull: true
      },
      approvalAt3: {
        type: Sequelize.DataTypes.DATE,
        allowNull: true
      },
      approveUser4: {
        type: Sequelize.DataTypes.UUID,
        allowNull: true
      },
      approvalAt4: {
        type: Sequelize.DataTypes.DATE,
        allowNull: true
      },
      approveUser5: {
        type: Sequelize.DataTypes.UUID,
        allowNull: true
      },
      approvalAt5: {
        type: Sequelize.DataTypes.DATE,
        allowNull: true
      },
      approveUser6: {
        type: Sequelize.DataTypes.UUID,
        allowNull: true
      },
      approvalAt6: {
        type: Sequelize.DataTypes.DATE,
        allowNull: true
      },
      approveUser7: {
        type: Sequelize.DataTypes.UUID,
        allowNull: true
      },
      approvalAt7: {
        type: Sequelize.DataTypes.DATE,
        allowNull: true
      },
      approveUser8: {
        type: Sequelize.DataTypes.UUID,
        allowNull: true
      },
      approvalAt8: {
        type: Sequelize.DataTypes.DATE,
        allowNull: true
      },
      approveUser9: {
        type: Sequelize.DataTypes.UUID,
        allowNull: true
      },
      approvalAt9: {
        type: Sequelize.DataTypes.DATE,
        allowNull: true
      },
      approveUser10: {
        type: Sequelize.DataTypes.UUID,
        allowNull: true
      },
      approvalAt10: {
        type: Sequelize.DataTypes.DATE,
        allowNull: true
      },
      approveUserLast: {
        type: Sequelize.DataTypes.UUID,
        allowNull: false
      },
      approvalAtLast: {
        type: Sequelize.DataTypes.DATE,
        allowNull: true
      },
      approveUserCount: {
        type: Sequelize.DataTypes.INTEGER,
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
