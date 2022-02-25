'use strict'
const { Model, UUIDV4 } = require('sequelize')
module.exports = (sequelize, DataTypes) => {
  class ApproveRequest extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      // https://qiita.com/NewGyu/items/83390aa17dce1ffb4cd3
      ApproveRequest.belongsTo(models.Contract, {
        foreignKey: 'contractId', // k1を指定
        targetKey: 'contractId' // k2を指定
      })
      ApproveRequest.belongsTo(models.ApproveRoute, {
        foreignKey: 'approveRouteId', // k1を指定
        targetKey: 'approveRouteId' // k2を指定
      })
      ApproveRequest.belongsTo(models.User, {
        foreignKey: 'userId', // k1を指定
        targetKey: 'userId' // k2を指定
      })
      ApproveRequest.belongsTo(models.ApproveStatus, {
        foreignKey: 'no', // k1を指定
        targetKey: 'no' // k2を指定
      })
    }
  }
  ApproveRequest.init(
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
        }
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
        type: DataTypes.INTEGER,
        references: {
          model: {
            tableName: 'ApproveStatus'
          },
          key: 'no'
        }
      },
      message: { type: DataTypes.STRING, allowNull: false },
      create: {
        type: DataTypes.DATE,
        allowNull: false,
        timestamps: true
      }
    },
    {
      sequelize,
      modelName: 'ApproveRequest',
      tableName: 'ApproveRequest',
      timestamps: true
    }
  )
  return ApproveRequest
}
