'use strict'

module.exports = {
  up: async (queryInterface, Sequelize) => {
    /**
     * Add altering commands here.
     *
     * Example:
     * await queryInterface.createTable('users', { id: Sequelize.INTEGER });
     */
    await queryInterface.createTable('SubAccountCode', {
      subAccountCodeId: {
        allowNull: false,
        primaryKey: true,
        type: Sequelize.UUID
      },
      accountCodeId: {
        allowNull: false,
        type: Sequelize.UUID
      },
      subjectName: {
        allowNull: false,
        type: Sequelize.STRING(40)
      },
      subjectCode: {
        allowNull: false,
        type: Sequelize.STRING(10)
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
    await queryInterface.dropTable('SubAccountCode')
  }
}
