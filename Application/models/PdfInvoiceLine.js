'use strict'
const { Model } = require('sequelize')
module.exports = (sequelize, DataTypes) => {
  class PdfInvoiceLine extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      PdfInvoiceLine.belongsTo(models.PdfInvoice, {
        foreignKey: 'invoiceId', // 子テーブルの外部キー指定
        targetKey: 'invoiceId', // 親テーブルのキー指定
        onDelete: 'cascade',
        onUpdate: 'cascade'
      })
    }
  }
  PdfInvoiceLine.init(
    {
      invoiceId: {
        type: DataTypes.UUID,
        primaryKey: true,
        allowNull: false,
        references: {
          model: { tableName: 'PdfInvoices' },
          key: 'invoiceId'
        }
      },
      lineIndex: {
        type: DataTypes.INTEGER,
        primaryKey: true
      },
      lineId: {
        type: DataTypes.STRING
      },
      lineDescription: {
        type: DataTypes.STRING
      },
      unit: {
        type: DataTypes.STRING
      },
      unitPrice: {
        type: DataTypes.INTEGER
      },
      quantity: {
        type: DataTypes.FLOAT
      },
      taxType: {
        type: DataTypes.STRING
      },
      discountDescription1: {
        type: DataTypes.STRING
      },
      discountAmount1: {
        type: DataTypes.FLOAT
      },
      discountUnit1: {
        type: DataTypes.STRING
      },
      discountDescription2: {
        type: DataTypes.STRING
      },
      discountAmount2: {
        type: DataTypes.FLOAT
      },
      discountUnit2: {
        type: DataTypes.STRING
      },
      discountDescription3: {
        type: DataTypes.STRING
      },
      discountAmount3: {
        type: DataTypes.FLOAT
      },
      discountUnit3: {
        type: DataTypes.STRING
      }
    },
    {
      sequelize,
      modelName: 'PdfInvoiceLine',
      timestamps: false
    }
  )
  return PdfInvoiceLine
}
