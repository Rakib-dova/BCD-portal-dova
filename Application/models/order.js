'use strict'
const { Model } = require('sequelize')
module.exports = (sequelize, DataTypes) => {
  class Order extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      Order.belongsTo(models.Contract, {
        foreignKey: 'contractId',
        targetKey: 'contractId'
      }),
      Order.belongsTo(models.Contract, {
        foreignKey: 'tenantId',
        targetKey: 'tenantId'
      })
    }
  }
  Order.init(
    {
      contractId: {
        type: DataTypes.UUID,
        primaryKey: true
      },
      tenantId: DataTypes.UUID,
      numberNForOrder: DataTypes.STRING,
      orderType: DataTypes.INTEGER,
      orderData: DataTypes.STRING(840),
      lastRefreshedAt: DataTypes.DATE
    },
    {
      sequelize,
      modelName: 'Order'
    }
  )
  return Order
}
