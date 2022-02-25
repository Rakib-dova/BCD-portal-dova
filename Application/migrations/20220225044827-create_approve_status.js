'use strict'

module.exports = {
  up: async (queryInterface, Sequelize) => {
    /**
     * Add altering commands here.
     *
     * Example:
     * await queryInterface.createTable('users', { id: Sequelize.INTEGER });
     */
    await queryInterface.createTable('ApproveStatus', {
      no: {
        allowNull: false,
        primaryKey: true,
        type: Sequelize.DataTypes.INTEGER
      },
      code: {
        allowNull: false,
        type: Sequelize.DataTypes.STRING(2)
      },
      name: {
        allowNull: false,
        type: Sequelize.DataTypes.STRING(255)
      }
    })
  },

  down: async (queryInterface, Sequelize) => {
    /**
     * Add reverting commands here.
     *
     * Example:
     * await queryInterface.dropTable('users');
     */
    await queryInterface.dropTable('ApproveStatus')
  }
}
