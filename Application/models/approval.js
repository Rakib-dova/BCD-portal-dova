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
      // approvalStatus ForeignKey
      Approval.belongsTo(models.ApprovalStatus, {
        foreignKey: 'approvalStatus',
        targetKey: 'code'
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
      requestUserId: {
        type: DataTypes.UUID
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
      approveRouteName: {
        type: DataTypes.STRING,
        allowNull: false
      },
      approveUser1: { type: DataTypes.UUID, allowNull: true },
      approvalAt1: {
        type: DataTypes.DATE,
        allowNull: true,
        timestamps: true
      },
      approveUser2: { type: DataTypes.UUID, allowNull: true },
      approvalAt2: {
        type: DataTypes.DATE,
        allowNull: true,
        timestamps: true
      },
      approveUser3: { type: DataTypes.UUID, allowNull: true },
      approvalAt3: {
        type: DataTypes.DATE,
        allowNull: true,
        timestamps: true
      },
      approveUser4: { type: DataTypes.UUID, allowNull: true },
      approvalAt4: {
        type: DataTypes.DATE,
        allowNull: true,
        timestamps: true
      },
      approveUser5: { type: DataTypes.UUID, allowNull: true },
      approvalAt5: {
        type: DataTypes.DATE,
        allowNull: true,
        timestamps: true
      },
      approveUser6: { type: DataTypes.UUID, allowNull: true },
      approvalAt6: {
        type: DataTypes.DATE,
        allowNull: true,
        timestamps: true
      },
      approveUser7: { type: DataTypes.UUID, allowNull: true },
      approvalAt7: {
        type: DataTypes.DATE,
        allowNull: true,
        timestamps: true
      },
      approveUser8: { type: DataTypes.UUID, allowNull: true },
      approvalAt8: {
        type: DataTypes.DATE,
        allowNull: true,
        timestamps: true
      },
      approveUser9: { type: DataTypes.UUID, allowNull: true },
      approvalAt9: {
        type: DataTypes.DATE,
        allowNull: true,
        timestamps: true
      },
      approveUser10: { type: DataTypes.UUID, allowNull: true },
      approvalAt10: {
        type: DataTypes.DATE,
        allowNull: true,
        timestamps: true
      },
      approveUserLast: { type: DataTypes.UUID, allowNull: false },
      approvalAtLast: {
        type: DataTypes.DATE,
        allowNull: true,
        timestamps: true
      },
      approveUserCount: { type: DataTypes.INTEGER, allowNull: false },
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
