'use strict'

// SubAccountCodeテーブル作成・削除
module.exports = {
  up: async (queryInterface, Sequelize) => {
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
    await queryInterface.dropTable('SubAccountCode')
  }
}
