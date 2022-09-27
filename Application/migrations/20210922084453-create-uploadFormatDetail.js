'use strict'

// UploadFormatDetailテーブル作成
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('UploadFormatDetail', {
      uploadFormatId: {
        allowNull: false,
        primaryKey: true,
        type: Sequelize.UUID
      },
      serialNumber: {
        allowNull: false,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      uploadFormatItemName: {
        allowNull: false,
        type: Sequelize.STRING
      },
      uploadFormatNumber: {
        allowNull: false,
        type: Sequelize.INTEGER
      },
      defaultItemName: {
        allowNull: false,
        type: Sequelize.STRING
      },
      defaultNumber: {
        allowNull: false,
        type: Sequelize.INTEGER
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
    await queryInterface.dropTable('UploadFormatDetail')
  }
}
