'use strict'

module.exports = {
  up: async (queryInterface, Sequelize) => {
    /**
     * Add altering commands here.
     *
     * Example:
     * await queryInterface.createTable('users', { id: Sequelize.INTEGER });
     */
    await queryInterface.addConstraint('Tenants', {
      fields: ['formatId'],
      type: 'foreign key',
      name: 'tenants_format_id_formats_fk',
      references: {
        table: 'Formats',
        field: 'id'
      },
      onDelete: 'no action'
    })
  },

  down: async (queryInterface, Sequelize) => {
    /**
     * Add reverting commands here.
     *
     * Example:
     * await queryInterface.dropTable('users');
     */
    await queryInterface.removeConstraint('Tenants', 'tenants_format_id_formats_fk')
  }
}
