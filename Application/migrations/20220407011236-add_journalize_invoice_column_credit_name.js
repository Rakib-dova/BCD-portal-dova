'use strict'

module.exports = {
  up: async (queryInterface, Sequelize) => {
    return [
      await queryInterface.addColumn('Journalize_invoice', 'accountName', {
        allowNull: true,
        type: Sequelize.STRING(40)
      }),
      await queryInterface.addColumn('Journalize_invoice', 'subAccountName', {
        allowNull: true,
        type: Sequelize.STRING(40)
      }),
      await queryInterface.addColumn('Journalize_invoice', 'departmentName', {
        allowNull: true,
        type: Sequelize.STRING(40)
      }),
      await queryInterface.addColumn('Journalize_invoice', 'creditAccountName', {
        allowNull: true,
        type: Sequelize.STRING(40)
      }),
      await queryInterface.addColumn('Journalize_invoice', 'creditAccountCode', {
        allowNull: true,
        type: Sequelize.STRING(10)
      }),
      await queryInterface.addColumn('Journalize_invoice', 'creditSubAccountName', {
        allowNull: true,
        type: Sequelize.STRING(40)
      }),
      await queryInterface.addColumn('Journalize_invoice', 'creditSubAccountCode', {
        allowNull: true,
        type: Sequelize.STRING(10)
      }),
      await queryInterface.addColumn('Journalize_invoice', 'creditDepartmentName', {
        allowNull: true,
        type: Sequelize.STRING(40)
      }),
      await queryInterface.addColumn('Journalize_invoice', 'creditDepartmentCode', {
        allowNull: true,
        type: Sequelize.STRING(10)
      })
    ]
  },

  down: async (queryInterface, Sequelize) => {
    return [
      await queryInterface.removeColumn('Journalize_invoice', 'accountName'),
      await queryInterface.removeColumn('Journalize_invoice', 'subAccountName'),
      await queryInterface.removeColumn('Journalize_invoice', 'departmentName'),
      await queryInterface.removeColumn('Journalize_invoice', 'creditAccountName'),
      await queryInterface.removeColumn('Journalize_invoice', 'creditAccountCode'),
      await queryInterface.removeColumn('Journalize_invoice', 'creditSubAccountName'),
      await queryInterface.removeColumn('Journalize_invoice', 'creditSubAccountCode'),
      await queryInterface.removeColumn('Journalize_invoice', 'creditDepartmentName'),
      await queryInterface.removeColumn('Journalize_invoice', 'creditDepartmentCode')
    ]
  }
}
