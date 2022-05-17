'use strict'
const { Model } = require('sequelize')
module.exports = (sequelize, DataTypes) => {
  class PdfInvoiceUploadDetail extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      PdfInvoiceUploadDetail.belongsTo(models.PdfInvoiceUpload, {
        foreignKey: 'invoiceUploadId', // k1を指定
        targetKey: 'invoiceUploadId', // k2を指定
        onDelete: 'casecade',
        onUpdate: 'casecade'
      })
    }
  }
  PdfInvoiceUploadDetail.init(
    {
      invoiceUploadDetailId: {
        type: DataTypes.UUID,
        primaryKey: true,
        unique: true,
        allowNull: false
      },
      invoiceUploadId: {
        type: DataTypes.UUID,
        foreignKey: true,
        allowNull: false
      },
      lines: DataTypes.INTEGER,
      invoiceId: {
        type: DataTypes.STRING,
        allowNull: false
      },
      status: DataTypes.STRING,
      errorData: {
        type: DataTypes.STRING(4000),
        allowNull: true
      },
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
      modelName: 'PdfInvoiceUploadDetail',
      tableName: 'PdfInvoiceUploadDetail'
    }
  )
  return PdfInvoiceUploadDetail
}
