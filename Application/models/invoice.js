'use strict'
const { Model } = require('sequelize')
module.exports = (sequelize, DataTypes) => {
  class Invoice extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      // https://qiita.com/NewGyu/items/83390aa17dce1ffb4cd3
      Invoice.belongsTo(models.Tenant, {
        foreignKey: 'tenantId', // k1を指定
        targetKey: 'tenantId', // k2を指定
        onDelete: 'cascade'
      })
    }
  }
  Invoice.init(
    {
      invoicesId: {
        type: DataTypes.UUID,
        primaryKey: true,
        allowNull: false
      },
      tenantId: {
        type: DataTypes.UUID
      },
      csvFileName: {
        type: DataTypes.STRING,
        allowNull: false
      },
      successCount: DataTypes.INTEGER,
      failCount: DataTypes.INTEGER,
      skipCount: DataTypes.INTEGER,
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
      modelName: 'Invoice'
    }
  )
  return Invoice
}
