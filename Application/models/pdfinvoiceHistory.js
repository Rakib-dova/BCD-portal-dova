'use strict'
const { Model } = require('sequelize')
module.exports = (sequelize, DataTypes) => {
  class pdfInvoiceHistory extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      pdfInvoiceHistory.hasMany(models.pdfInvoiceHistoryDetail, {
        foreignKey: 'historyId',
        sourceKey: 'historyId'
      })
    }
  }
  pdfInvoiceHistory.init(
    {
      historyId: {
        type: DataTypes.UUID,
        primaryKey: true,
        allowNull: false
      },
      tenantId: {
        type: DataTypes.UUID,
        allowNull: false
      },
      csvFileName: {
        type: DataTypes.STRING,
        allowNull: false
      },
      successCount: DataTypes.INTEGER,
      failCount: DataTypes.INTEGER,
      skipCount: DataTypes.INTEGER,
      invoiceCount: DataTypes.INTEGER,
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        timestamps: true
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        timestamps: true
      }
    },
    {
      sequelize,
      modelName: 'pdfInvoiceHistory'
    }
  )
  return pdfInvoiceHistory
}
