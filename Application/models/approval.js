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
      Approval.belongsTo(models.ApproveStatus, {
        foreignKey: 'approveStatus',
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
      approveStatus: {
        type: DataTypes.STRING,
        references: {
          model: {
            tableName: 'ApproveStatus'
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
      message1: { type: DataTypes.STRING, allowNull: true },
      approveUser2: { type: DataTypes.UUID, allowNull: true },
      approvalAt2: {
        type: DataTypes.DATE,
        allowNull: true,
        timestamps: true
      },
      message2: { type: DataTypes.STRING, allowNull: true },
      approveUser3: { type: DataTypes.UUID, allowNull: true },
      approvalAt3: {
        type: DataTypes.DATE,
        allowNull: true,
        timestamps: true
      },
      message3: { type: DataTypes.STRING, allowNull: true },
      approveUser4: { type: DataTypes.UUID, allowNull: true },
      approvalAt4: {
        type: DataTypes.DATE,
        allowNull: true,
        timestamps: true
      },
      message4: { type: DataTypes.STRING, allowNull: true },
      approveUser5: { type: DataTypes.UUID, allowNull: true },
      approvalAt5: {
        type: DataTypes.DATE,
        allowNull: true,
        timestamps: true
      },
      message5: { type: DataTypes.STRING, allowNull: true },
      approveUser6: { type: DataTypes.UUID, allowNull: true },
      approvalAt6: {
        type: DataTypes.DATE,
        allowNull: true,
        timestamps: true
      },
      message6: { type: DataTypes.STRING, allowNull: true },
      approveUser7: { type: DataTypes.UUID, allowNull: true },
      approvalAt7: {
        type: DataTypes.DATE,
        allowNull: true,
        timestamps: true
      },
      message7: { type: DataTypes.STRING, allowNull: true },
      approveUser8: { type: DataTypes.UUID, allowNull: true },
      approvalAt8: {
        type: DataTypes.DATE,
        allowNull: true,
        timestamps: true
      },
      message8: { type: DataTypes.STRING, allowNull: true },
      approveUser9: { type: DataTypes.UUID, allowNull: true },
      approvalAt9: {
        type: DataTypes.DATE,
        allowNull: true,
        timestamps: true
      },
      message9: { type: DataTypes.STRING, allowNull: true },
      approveUser10: { type: DataTypes.UUID, allowNull: true },
      approvalAt10: {
        type: DataTypes.DATE,
        allowNull: true,
        timestamps: true
      },
      message10: { type: DataTypes.STRING, allowNull: true },
      approveUserLast: { type: DataTypes.UUID, allowNull: false },
      approvalAtLast: {
        type: DataTypes.DATE,
        allowNull: true,
        timestamps: true
      },
      messageLast: { type: DataTypes.STRING, allowNull: true },
      approveUserCount: { type: DataTypes.INTEGER, allowNull: false },
      approvedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        timestamps: true,
        defaultValue: new Date()
      },
      rejectedUser: { type: DataTypes.UUID, allowNull: true },
      rejectedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        timestamps: true
      },
      rejectedMessage: { type: DataTypes.STRING, allowNull: true }
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
