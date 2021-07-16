'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('Contracts', 'contractedAt', {
      allowNull: true,
      type: Sequelize.DATE
    }),
    await queryInterface.addColumn('Contracts', 'canceledAt', {
      allowNull: true,
      type: Sequelize.DATE
    })
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('Contracts', 'contractedAt'),
    await queryInterface.removeColumn('Contracts', 'canceledAt')
  }
};
