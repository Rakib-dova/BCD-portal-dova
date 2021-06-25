'use strict'
const { Model } = require('sequelize')
module.exports = (sequelize, DataTypes) => {
  class Contract extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      Contract.belongsTo(models.Tenant, {
        foreignKey: 'tenantId', // k1を指定
        targetKey: 'tenantId' // k2を指定
      })
    }
  }
  Contract.init(
    {
      contractId: {
        type: DataTypes.UUID,
        primaryKey: true
      },
      tenantId: DataTypes.UUID,
      numberN: DataTypes.STRING,
      lastRefreshedAt: DataTypes.DATE,
      createdAt: DataTypes.DATE,
      updatedAt: DataTypes.DATE,
      terminatedAt: DataTypes.DATE
    },
    {
      sequelize,
      modelName: 'Contract'
    }
  )
  return Contract
}
