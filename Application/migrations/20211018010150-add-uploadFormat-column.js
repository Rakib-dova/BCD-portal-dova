'use strict'

// UploadFormatテーブルuploadDataカラム追加・削除
module.exports = {
  up: async (queryInterface, Sequelize) => {
    return queryInterface.addColumn('UploadFormat', 'uploadData', {
      allowNull: true,
      type: Sequelize.STRING(4000).BINARY
    })
  },

  down: async (queryInterface, Sequelize) => {
    return queryInterface.removeColumn('UploadFormat', 'uploadData')
  }
}
