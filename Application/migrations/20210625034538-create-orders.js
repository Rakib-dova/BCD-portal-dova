<<<<<<< HEAD
'use strict';
=======
'use strict'
>>>>>>> origin/ST#738_pyo_PB#581

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('Orders', {
      contractId: {
        allowNull: false,
        primaryKey: true,
        type: Sequelize.UUID
      },
      tenantId: {
        allowNull: false,
        type: Sequelize.UUID
      },
<<<<<<< HEAD
      numberNForOrder: {
        type: Sequelize.STRING(255)
      },
      orderType: {
        type: Sequelize.INTEGER
      },
      orderData: {
        type: Sequelize.STRING(255)
      },
      lastRefreshedAt: {
=======
      orderType: {
        type: Sequelize.STRING
      },
      orderData: {
        type: Sequelize.STRING(4000)
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
>>>>>>> origin/ST#738_pyo_PB#581
        type: Sequelize.DATE
      }
    })
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('Orders')
  }
<<<<<<< HEAD
};
=======
}
>>>>>>> origin/ST#738_pyo_PB#581
