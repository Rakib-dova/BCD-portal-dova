'use strict'
const { Model, UUIDV4 } = require('sequelize')
module.exports = (sequelize, DataTypes) => {
  class RequestApproval extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      // https://qiita.com/NewGyu/items/83390aa17dce1ffb4cd3
      RequestApproval.belongsTo(models.Contract, {
        foreignKey: 'contractId', // k1を指定
        targetKey: 'contractId' // k2を指定
      })
      RequestApproval.belongsTo(models.ApproveRoute, {
        foreignKey: 'approveRouteId', // k1を指定
        targetKey: 'approveRouteId' // k2を指定
      })
      RequestApproval.belongsTo(models.User, {
        foreignKey: 'requester', // k1を指定
        targetKey: 'userId' // k2を指定
      })
      RequestApproval.belongsTo(models.ApproveStatus, {
        foreignKey: 'status', // k1を指定
        targetKey: 'code' // k2を指定
      })
    }
  }
  RequestApproval.init(
    {
      requestId: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: UUIDV4
      },
      contractId: {
        type: DataTypes.UUID,
        references: {
          model: {
            tableName: 'Contracts'
          },
          key: 'contractId'
        }
      },
      approveRouteId: {
        type: DataTypes.UUID,
        references: {
          model: {
            tableName: 'ApproveRoute'
          },
          key: 'approveRouteId'
        },
        allowNull: true
      },
      invoiceId: { type: DataTypes.UUID, allowNull: false },
      requester: {
        type: DataTypes.UUID,
        references: {
          model: {
            tableName: 'Users'
          },
          key: 'userId'
        }
      },
      status: {
        type: DataTypes.STRING,
        references: {
          model: {
            tableName: 'ApproveStatus'
          },
          key: 'code'
        }
      },
      message: { type: DataTypes.STRING, allowNull: false },
      create: {
        type: DataTypes.DATE,
        allowNull: false,
        timestamps: true,
        defaultValue: new Date()
      },
      isSaved: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
      }
    },
    {
      sequelize,
      modelName: 'RequestApproval',
      tableName: 'RequestApproval',
      timestamps: false
    }
  )
  return RequestApproval
}
