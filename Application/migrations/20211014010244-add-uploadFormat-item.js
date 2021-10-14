'use strict'

module.exports = {
  up: async (queryInterface, Sequelize) => {
    /**
     * Add altering commands here.
     *
     * Example:
     * await queryInterface.createTable('users', { id: Sequelize.INTEGER });
     */
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
    /**
     * Add reverting commands here.
     *
     * Example:
     * await queryInterface.dropTable('users');
     */
    return [
      await queryInterface.removeColumn('UploadFormat', 'itemRowNo'),
      await queryInterface.removeColumn('UploadFormat', 'dataStartRowNo')
    ]
  }
}
