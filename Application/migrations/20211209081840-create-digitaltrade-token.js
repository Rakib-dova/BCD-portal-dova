'use strict'
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('DigitaltradeTokens', {
      dtToken: {
        allowNull: false,
        primaryKey: true,
        type: Sequelize.STRING(255)
      },
      digitaltradeId: {
        allowNull: false,
        references: { model: 'DigitaltradeUsers', key: 'digitaltradeId' },
        type: Sequelize.UUID
      },
      fingerprint: {
        allowNull: false,
        type: Sequelize.STRING(255)
      },
      tokenCategory: {
        allowNull: false,
        type: Sequelize.STRING(10)
      },
      tokenFlg: {
        allowNull: false,
        type: Sequelize.BOOLEAN,
        defaultValue: 'false'
      },
      expireDate: {
        allowNull: false,
        type: Sequelize.DATE
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
    await queryInterface.dropTable('DigitaltradeTokens')
  }
}
