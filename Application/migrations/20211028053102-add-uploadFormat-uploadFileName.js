'use strict'

// UploadFormatテーブルuploadFileNameカラム追加
module.exports = {
  up: async (queryInterface, Sequelize) => {
    return queryInterface.addColumn('UploadFormat', 'uploadFileName', {
      allowNull: true,
      type: Sequelize.STRING
    })
  },

  down: async (queryInterface, Sequelize) => {
    return queryInterface.removeColumn('UploadFormat', 'uploadfileName')
  }
}
