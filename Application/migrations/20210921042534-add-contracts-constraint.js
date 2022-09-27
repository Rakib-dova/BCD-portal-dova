'use strict'

// ContractsテーブルtenantIdカラムforeign key指定・解除
module.exports = {
  up: async (queryInterface, Sequelize) => {
    const addConstraint =
      'ALTER TABLE Contracts WITH NOCHECK ADD CONSTRAINT fk_contracts_tenants FOREIGN KEY(tenantId) REFERENCES Tenants(tenantId) ON UPDATE CASCADE ON DELETE CASCADE'
    return [await queryInterface.sequelize.query(addConstraint, {})]
  },

  down: async (queryInterface, Sequelize) => {
    return [await queryInterface.removeConstraint('Contracts', 'fk_contract_tenant')]
  }
}
