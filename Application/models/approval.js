'use strict'
const { Model, UUIDV4 } = require('sequelize')
module.exports = (sequelize, DataTypes) => {
  class Approval extends Model {
    static associate(models) {
      // define association here
      // requestId ForeignKey
      Approval.belongsTo(models.RequestApproval, {
        foreignKey: 'requestId',
        targetKey: 'requestId'
      })
      // approveUserId ForeignKey
      Approval.belongsTo(models.ApproveUser, {
        foreignKey: 'approveUserId',
        targetKey: 'approveUserId'
      })
      // approvalStatus ForeignKey
      Approval.belongsTo(models.ApprovalStatus, {
        foreignKey: 'approvalStatus',
        targetKey: 'code'
      })
      // prevApproveUserId ForeignKey
      Approval.belongsTo(models.ApproveUser, {
        foreignKey: 'prevApproveUserId',
        targetKey: 'prevApproveUser'
      })
      // nextApproveUserId ForeignKey
      Approval.belongsTo(models.ApproveUser, {
        foreignKey: 'nextApproveUserId',
        targetKey: 'nextApproveUser'
      })
    }
  }
  Approval.init(
    {
      approvalId: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: UUIDV4
      },
      requestId: {
        type: DataTypes.UUID,
        references: {
          model: {
            tableName: 'RequestApproval'
          },
          key: 'requestId'
        }
      },
      approveUserId: {
        type: DataTypes.UUID,
        references: {
          model: {
            tableName: 'ApproveUser'
          },
          key: 'approveUserId'
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
      approvalStatus: {
        type: DataTypes.STRING,
        references: {
          model: {
            tableName: 'ApprovalStatus'
          },
          key: 'code'
        }
      },
      message: { type: DataTypes.STRING, allowNull: false },
      approvedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        timestamps: true,
        defaultValue: new Date()
      }
    },
    {
      sequelize,
      modelName: 'Approval',
      tableName: 'Approval',
      timestamps: false
    }
  )
  return Approval
}
