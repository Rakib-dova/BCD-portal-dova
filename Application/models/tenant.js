'use strict'
const { Model } = require('sequelize')
module.exports = (sequelize, DataTypes) => {
  class Tenant extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      Tenant.hasMany(models.User, {
        foreignKey: 'tenantId' // k1
      })
    }
  }
  Tenant.init(
    {
      tenantId: {
        type: DataTypes.UUID,
        primaryKey: true
      },
      registeredBy: {
        type: DataTypes.UUID
      },
      customerId: DataTypes.STRING
    },
    {
      sequelize,
      modelName: 'Tenant'
    }
  )
  return Tenant
}
