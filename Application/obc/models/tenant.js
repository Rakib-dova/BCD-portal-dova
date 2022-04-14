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
      Tenant.belongsTo(models.User, {
        foreignKey: 'userUuid',
        targetKey: 'uuid',
        onDelete: 'CASCADE'
      })
      Tenant.belongsTo(models.Format, {
        foreignKey: 'formatId',
        targetKey: 'id'
      })
    }
  }
  Tenant.init(
    {
      userUuid: {
        allowNull: false,
        primaryKey: true,
        type: DataTypes.UUID
      },
      tenantUuid: {
        allowNull: false,
        primaryKey: true,
        type: DataTypes.UUID
      },
      formatId: DataTypes.INTEGER
    },
    {
      sequelize,
      timestamps: false,
      modelName: 'Tenant'
    }
  )
  return Tenant
}
