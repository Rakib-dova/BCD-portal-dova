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
      approveRouteName: {
        type: DataTypes.STRING,
        allowNull: false
      },
      approveUser1: { type: DataTypes.UUID, allowNull: true },
      approvalDate1: {
        type: DataTypes.DATE,
        allowNull: true,
        timestamps: true
      },
      approveUser2: { type: DataTypes.UUID, allowNull: true },
      approvalDate2: {
        type: DataTypes.DATE,
        allowNull: true,
        timestamps: true
      },
      approveUser3: { type: DataTypes.UUID, allowNull: true },
      approvalDate3: {
        type: DataTypes.DATE,
        allowNull: true,
        timestamps: true
      },
      approveUser4: { type: DataTypes.UUID, allowNull: true },
      approvalDate4: {
        type: DataTypes.DATE,
        allowNull: true,
        timestamps: true
      },
      approveUser5: { type: DataTypes.UUID, allowNull: true },
      approvalDate5: {
        type: DataTypes.DATE,
        allowNull: true,
        timestamps: true
      },
      approveUser6: { type: DataTypes.UUID, allowNull: true },
      approvalDate6: {
        type: DataTypes.DATE,
        allowNull: true,
        timestamps: true
      },
      approveUser7: { type: DataTypes.UUID, allowNull: true },
      approvalDate7: {
        type: DataTypes.DATE,
        allowNull: true,
        timestamps: true
      },
      approveUser8: { type: DataTypes.UUID, allowNull: true },
      approvalDate8: {
        type: DataTypes.DATE,
        allowNull: true,
        timestamps: true
      },
      approveUser9: { type: DataTypes.UUID, allowNull: true },
      approvalDate9: {
        type: DataTypes.DATE,
        allowNull: true,
        timestamps: true
      },
      approveUser10: { type: DataTypes.UUID, allowNull: true },
      approvalDate10: {
        type: DataTypes.DATE,
        allowNull: true,
        timestamps: true
      },
      approveUserLast: { type: DataTypes.UUID, allowNull: false },
      approvalDateLast: {
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
