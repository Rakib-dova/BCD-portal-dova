'use strict'
const { Model } = require('sequelize')
module.exports = (sequelize, DataTypes) => {
  class pdfInvoiceHistoryDetail extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      pdfInvoiceHistoryDetail.belongsTo(models.pdfInvoiceHistory, {
        foreignKey: 'historyId', // k1を指定
        targetKey: 'historyId', // k2を指定
        onDelete: 'casecade',
        onUpdate: 'casecade'
      })
    }
  }
  pdfInvoiceHistoryDetail.init(
    {
      // 以下、修正予定のため残しています
      // historyId: {
      //   type: DataTypes.UUID,
      //   primaryKey: true,
      //   allowNull: false,
      //   references: {
      //     model: { tableName: 'PdfInvoices' },
      //     key: 'invoiceId'
      //   }
      // },
      // rowIndex: {
      //   type: DataTypes.INTEGER,
      //   primaryKey: true
      // },
      historyDetailId: {
        type: DataTypes.UUID,
        primaryKey: true,
        unique: true,
        allowNull: false
      },
      historyId: {
        type: DataTypes.UUID,
        foreignKey: true,
        allowNull: false
      },
      lines: DataTypes.INTEGER,
      invoiceNo: {
        type: DataTypes.STRING,
        allowNull: false
      },
      status: DataTypes.INTEGER,
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
      modelName: 'pdfInvoiceHistoryDetail'
    }
  )
  return pdfInvoiceHistoryDetail
}
