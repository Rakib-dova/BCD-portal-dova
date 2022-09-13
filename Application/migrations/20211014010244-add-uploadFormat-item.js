'use strict'

// UploadFormatテーブルitemRowNo,dataStartRowNoカラム追加・削除
module.exports = {
  up: async (queryInterface, Sequelize) => {
    return [
      await queryInterface.addColumn('UploadFormat', 'itemRowNo', {
        allowNull: false,
        type: Sequelize.INTEGER,
        defaultValue: 0
      }),
      await queryInterface.addColumn('UploadFormat', 'dataStartRowNo', {
        allowNull: false,
        type: Sequelize.INTEGER,
        defaultValue: 0
      })
    ]
  },

  down: async (queryInterface, Sequelize) => {
    return [
      await queryInterface.removeColumn('UploadFormat', 'itemRowNo'),
      await queryInterface.removeColumn('UploadFormat', 'dataStartRowNo')
    ]
  }
}
