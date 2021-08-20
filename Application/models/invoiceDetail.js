'use strict'
const { Model } = require('sequelize')
module.exports = (sequelize, DataTypes) => {
  class InvoiceDetail extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      // https://qiita.com/NewGyu/items/83390aa17dce1ffb4cd3
      InvoiceDetail.belongsTo(models.Invoice, {
        foreignKey: 'invoicesId', // k1を指定
        targetKey: 'invoicesId', // k2を指定
        onDelete: 'casecade'
      })
    }
  }
  InvoiceDetail.init(
    {
      invoiceDetailId: {
        type: DataTypes.UUID,
        primaryKey: true,
        unique: true,
        allowNull: false
      },
      invoicesId: {
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
      modelName: 'InvoiceDetail',
      tableName: 'InvoiceDetail'
    }
  )
  return InvoiceDetail
}
