'use strict'

// DepartmentCodeテーブル作成・削除
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('DepartmentCode', {
      departmentCodeId: {
        allowNull: false,
        primaryKey: true,
        type: Sequelize.UUID
      },
      contractId: {
        allowNull: false,
        type: Sequelize.UUID
      },
      departmentCodeName: {
        allowNull: false,
        type: Sequelize.STRING(40)
      },
      departmentCode: {
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
    await queryInterface.dropTable('DepartmentCode')
  }
}
