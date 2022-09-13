'use strict'

// Journalize_invoiceテーブルinstallmentAmountカラムデータタイプ変更
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.changeColumn('Journalize_invoice', 'installmentAmount', {
      type: Sequelize.DataTypes.DECIMAL(13, 0),
      allowNull: true
    })
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.changeColumn('Journalize_invoice', 'installmentAmount', {
      type: Sequelize.DataTypes.DECIMAL(17, 4),
      allowNull: true
    })
  }
}
