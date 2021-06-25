'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('Tenants', 'contractStatus',
	{
		type: Sequelize.INTEGER,
		allowNull: true
	})
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('Tenants', 'contractStatus')
  }
};
