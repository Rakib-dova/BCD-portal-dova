'use strict'

// ContractsテーブルserviceTypeカラム追加
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('Contracts', 'serviceType', {
      type: Sequelize.STRING(3),
      allowNull: false,
      defaultValue: '010'
    })
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('Contracts', 'serviceType')
  }
}
