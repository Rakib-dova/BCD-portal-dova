'use strict';
//https://qiita.com/shimon_haga/items/e22115c130c6917bd365
module.exports = {
  up: async (queryInterface, Sequelize) => {
      await queryInterface.addConstraint('Users', {
        fields: ['tenantId'],
        type: 'foreign key',
        name: 'fk_tenants_users',
        references: {
          table: 'Tenants',
          field: 'tenantId'
        }
      })
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeConstraint('Users', 'fk_tenants_users')
  }
};
