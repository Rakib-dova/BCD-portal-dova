'use strict'

// AccountCodeテーブル削除・削除
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('AccountCode', {
      accountCodeId: {
        allowNull: false,
        primaryKey: true,
        type: Sequelize.UUID
      },
      contractId: {
        allowNull: false,
        type: Sequelize.UUID
      },
      accountCodeName: {
        allowNull: false,
        type: Sequelize.STRING(40)
      },
      accountCode: {
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
    await queryInterface.dropTable('AccountCode')
  }
}
