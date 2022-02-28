'use strict'

module.exports = {
  up: async (queryInterface, Sequelize) => {
    /**
     * Add altering commands here.
     *
     * Example:
     * await queryInterface.createTable('users', { id: Sequelize.INTEGER });
     */
    return await queryInterface.createTable('RequestApproval', {
      requestId: {
        primaryKey: true,
        type: Sequelize.DataTypes.UUID,
        allowNull: false
      },
      contractId: {
        type: Sequelize.DataTypes.UUID,
        references: {
          model: {
            tableName: 'Contracts'
          },
          key: 'contractId'
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
      invoiceId: {
        type: Sequelize.DataTypes.UUID,
        allowNull: false
      },
      requester: {
        type: Sequelize.DataTypes.UUID,
        references: {
          model: {
            tableName: 'Users'
          },
          key: 'userId'
        },
        allowNull: false
      },
      status: {
        type: Sequelize.DataTypes.STRING(2),
        references: {
          model: {
            tableName: 'ApproveStatus'
          },
          key: 'code'
        },
        allowNull: false
      },
      message: {
        type: Sequelize.DataTypes.STRING(1500),
        allowNull: false
      },
      create: {
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
    return await queryInterface.dropTable('RequestApproval')
  }
}
