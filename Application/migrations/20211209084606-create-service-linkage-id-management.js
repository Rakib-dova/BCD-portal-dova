'use strict'
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('ServiceLinkageIdManagements', {
      digitaltradeId: {
        allowNull: false,
        primaryKey: true,
        references: { model: 'DigitaltradeUsers', key: 'digitaltradeId' },
        type: Sequelize.UUID
      },
      serviceCategory: {
        allowNull: false,
        primaryKey: true,
        type: Sequelize.STRING(10)
      },
      serviceUserId: {
        allowNull: false,
        type: Sequelize.STRING(255)
      },
      serviceSubId: {
        type: Sequelize.STRING(255)
      },
      serviceUserInfo: {
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
    await queryInterface.dropTable('ServiceLinkageIdManagements')
  }
}
