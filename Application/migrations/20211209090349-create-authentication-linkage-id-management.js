'use strict'
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('AuthenticationLinkageIdManagements', {
      digitaltradeId: {
        allowNull: false,
        primaryKey: true,
        references: { model: 'DigitaltradeUsers', key: 'digitaltradeId' },
        type: Sequelize.UUID
      },
      authenticationServiceCategory: {
        allowNull: false,
        primaryKey: true,
        type: Sequelize.STRING(10)
      },
      authenticationServiceUserId: {
        allowNull: false,
        type: Sequelize.STRING(255)
      },
      authenticationServiceLoginId: {
        type: Sequelize.STRING(255)
      },
      authenticationServiceUserInfo: {
        type: Sequelize.STRING(4000)
      },
      deleteFlag: {
        type: Sequelize.BOOLEAN,
        defaultValue: 'false'
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    })
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('AuthenticationLinkageIdManagements')
  }
}
