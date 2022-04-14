'use strict'

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addConstraint('UploadFormat', {
      fields: ['contractId'],
      type: 'foreign key',
      name: 'fk_uploadFormat_contracts',
      references: {
        table: 'Contracts',
        field: 'contractId'
      },
      onDelete: 'cascade',
      onUpdate: 'cascade'
    })
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeConstraint('UploadFormat', 'fk_uploadFormat_contracts')
  }
}
