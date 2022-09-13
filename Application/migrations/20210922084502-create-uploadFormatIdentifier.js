'use strict'

// UploadFormatIdentifierテーブル作成
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('UploadFormatIdentifier', {
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
      extensionType: {
        allowNull: false,
        type: Sequelize.STRING
      },
      uploadFormatExtension: {
        allowNull: false,
        type: Sequelize.STRING
      },
      defaultExtension: {
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
    await queryInterface.dropTable('UploadFormatIdentifier')
  }
}
