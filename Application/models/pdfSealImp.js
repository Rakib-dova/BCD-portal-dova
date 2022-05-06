'use strict'
const { Model } = require('sequelize')
module.exports = (sequelize, DataTypes) => {
  class PdfSealImp extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of DataTypes lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      PdfSealImp.belongsTo(models.PdfInvoice, {
        foreignKey: 'invoiceId',
        targetKey: 'invoiceId',
        onDelete: 'cascade',
        onUpdate: 'cascade'
      })
    }
  }
  PdfSealImp.init(
    {
      invoiceId: {
        primaryKey: true,
        allowNull: false,
        type: DataTypes.UUID,
        references: {
          model: { tableName: 'PdfInvoices' },
          key: 'invoiceId'
        }
      },
      image: {
        type: DataTypes.BLOB
      }
    },
    {
      sequelize,
      modelName: 'PdfSealImp',
      timestamps: false
    }
  )
  return PdfSealImp
}
