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
      'ALTER TABLE Cancellations WITH NOCHECK ADD CONSTRAINT fk_Cancellations_ContractId FOREIGN KEY(contractId) REFERENCES Contracts(contractId) ON UPDATE CASCADE ON DELETE CASCADE'
    return [await queryInterface.sequelize.query(addConstraint, {})]
  },

  down: async (queryInterface, Sequelize) => {
    /**
     * Add reverting commands here.
     *
     * Example:
     * await queryInterface.dropTable('users');
     */
    return [await queryInterface.removeConstraint('Cancellations', 'fk_Cancellations_ContractId')]
  }
}
