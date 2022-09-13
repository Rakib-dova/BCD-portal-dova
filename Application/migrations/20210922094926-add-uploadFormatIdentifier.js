'use strict'

// UploadFormatIdentifierテーブルuploadFormatIdカラムforeign key指定・解除
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addConstraint('UploadFormatIdentifier', {
      fields: ['uploadFormatId'],
      type: 'foreign key',
      name: 'fk_uploadFormatIdentifier_uploadFormat',
      references: {
        table: 'UploadFormat',
        field: 'uploadFormatId'
      },
      onDelete: 'cascade',
      onUpdate: 'cascade'
    })
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeConstraint('UploadFormatIdentifier', 'fk_uploadFormatIdentifier_uploadFormat')
  }
}
