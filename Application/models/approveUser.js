'use strict'
const { Model } = require('sequelize')
module.exports = (sequelize, DataTypes) => {
  class ApproveUser extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      // https://qiita.com/NewGyu/items/83390aa17dce1ffb4cd3
      ApproveUser.belongsTo(models.ApproveRoute, {
        foreignKey: 'approveRouteId', // k1を指定
        targetKey: 'approveRouteId', // k2を指定
        onDelete: 'cascade',
        onUpdate: 'cascade'
      })
    }
  }
  ApproveUser.init(
    {
      approveUserId: {
        type: DataTypes.UUID,
        primaryKey: true,
        allowNull: false
      },
      approveRouteId: {
        allowNull: false,
        type: DataTypes.UUID
      },
      approveUsers: {
        allowNull: false,
        type: DataTypes.UUID
      },
      prevApproveUser: {
        allowNull: false,
        type: DataTypes.UUID
      },
      nextApproveUser: {
        allowNull: false,
        type: DataTypes.UUID
      },
      lastApproveUserId: {
        allowNull: false,
        type: DataTypes.UUID
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
      modelName: 'ApproveUser',
      tableName: 'ApproveUser'
    }
  )
  return ApproveUser
}
