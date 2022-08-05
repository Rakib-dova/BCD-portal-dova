'use strict'

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('RequestApproval', 'isSaved')
    await queryInterface.addColumn('RequestApproval', 'version', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 1
    })
    await queryInterface.addColumn('RequestApproval', 'rejectedFlag', {
      type: Sequelize.DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    })
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('RequestApproval', 'isSaved', {
      type: Sequelize.DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    })
    await queryInterface.removeColumn('RequestApproval', 'version')
    await queryInterface.removeColumn('RequestApproval', 'rejectedFlag')
  }
}
