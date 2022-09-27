'use strict'

// UploadFormatテーブル作成
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('UploadFormat', {
      uploadFormatId: {
        allowNull: false,
        primaryKey: true,
        type: Sequelize.UUID
      },
      contractId: {
        allowNull: false,
        type: Sequelize.UUID
      },
      setName: {
        allowNull: false,
        type: Sequelize.STRING
      },
      uploadType: {
        allowNull: false,
        type: Sequelize.STRING
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
    await queryInterface.dropTable('UploadFormat')
  }
}
