'use strict'
const { Model } = require('sequelize')
module.exports = (sequelize, DataTypes) => {
  class ApproveRoute extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      // https://qiita.com/NewGyu/items/83390aa17dce1ffb4cd3
      ApproveRoute.belongsTo(models.Contract, {
        foreignKey: 'contractId', // k1を指定
        targetKey: 'contractId', // k2を指定
        onDelete: 'cascade',
        onUpdate: 'cascade'
      })
      ApproveRoute.hasMany(models.ApproveUser, {
        foreignKey: 'approveRouteId' // k1
      })
    }
  }
  ApproveRoute.init(
    {
      approveRouteId: {
        type: DataTypes.UUID,
        primaryKey: true,
        allowNull: false
      },
      contractId: {
        allowNull: false,
        type: DataTypes.UUID
      },
      approveRouteName: {
        allowNull: false,
        type: DataTypes.STRING
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
      modelName: 'ApproveRoute',
      tableName: 'ApproveRoute'
    }
  )
  return ApproveRoute
}
