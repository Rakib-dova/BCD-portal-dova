'use strict'

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addConstraint('UploadFormatDetail', {
      fields: ['uploadFormatId'],
      type: 'foreign key',
      name: 'fk_uploadFormatDetail_uploadFormat',
      references: {
        table: 'UploadFormat',
        field: 'uploadFormatId'
      },
      onDelete: 'cascade',
      onUpdate: 'cascade'
    })
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeConstraint('UploadFormatDetail', 'fk_uploadFormatDetail_uploadFormat')
  }
}
