<<<<<<< HEAD
'use strict';
=======
'use strict'
>>>>>>> origin/ST#738_pyo_PB#581

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('Contracts', {
      contractId: {
        allowNull: false,
        primaryKey: true,
        type: Sequelize.UUID
      },
      tenantId: {
        allowNull: false,
        type: Sequelize.UUID
      },
      numberN: {
<<<<<<< HEAD
        type: Sequelize.STRING(255)
      },
      lastRefreshedAt: {
        type: Sequelize.DATE
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      terminatedAt: {
=======
        type: Sequelize.STRING
      },
      contractStatus: {
        allowNull: false,
        type: Sequelize.STRING
      },
      deleteFlag: {
        allowNull: false,
        type: Sequelize.BOOLEAN,
        defaultValue: 0
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
>>>>>>> origin/ST#738_pyo_PB#581
        allowNull: false,
        type: Sequelize.DATE
      }
    })
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('Contracts')
  }
<<<<<<< HEAD
};
=======
}
>>>>>>> origin/ST#738_pyo_PB#581
