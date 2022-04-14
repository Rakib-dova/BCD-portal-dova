'use strict'

module.exports = {
  up: async (queryInterface, Sequelize) => {
    /**
     * Add altering commands here.
     *
     * Example:
     * await queryInterface.createTable('users', { id: Sequelize.INTEGER });
     */
    const addConstraint =
      'ALTER TABLE SubAccountCode WITH NOCHECK ADD CONSTRAINT fk_SubAccountCode_AccountCode FOREIGN KEY(accountCodeId) REFERENCES AccountCode(accountCodeId) ON UPDATE CASCADE ON DELETE CASCADE'
    return [await queryInterface.sequelize.query(addConstraint, {})]
  },

  down: async (queryInterface, Sequelize) => {
    /**
     * Add reverting commands here.
     *
     * Example:
     * await queryInterface.dropTable('users');
     */
    return [await queryInterface.removeConstraint('SubAccountCode', 'fk_SubAccountCode_AccountCode')]
  }
}
