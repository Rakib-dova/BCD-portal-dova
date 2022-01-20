'use strict'

module.exports = {
  up: async (queryInterface, Sequelize) => {
    /**
     * Add altering commands here.
     *
     * Example:
     * await queryInterface.createTable('users', { id: Sequelize.INTEGER });
     */
    return await queryInterface.createTable('Journalize_invoice', {
      journalId: {
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
      invoiceId: {
        type: Sequelize.DataTypes.UUID,
        allowNull: false
      },
      lineNo: {
        type: Sequelize.DataTypes.INTEGER,
        allowNull: false
      },
      lineId: {
        type: Sequelize.DataTypes.STRING,
        allowNull: false
      },
      accountCode: {
        type: Sequelize.DataTypes.STRING(10),
        allowNull: true
      },
      subAccountCode: {
        type: Sequelize.DataTypes.STRING(10),
        allowNull: true
      },
      departmentCode: {
        type: Sequelize.DataTypes.STRING(10),
        allowNull: true
      },
      installmentAmount: {
        type: Sequelize.DataTypes.DECIMAL(13, 4),
        allowNull: true
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
    return await queryInterface.dropTable('Journalize_invoice')
  }
}
