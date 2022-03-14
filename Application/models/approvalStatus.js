'use strict'
const { Model } = require('sequelize')
module.exports = (sequelize, DataTypes) => {
  class ApprovalStatus extends Model {
    static associate(models) {}
  }
  ApprovalStatus.init(
    {
      code: {
        allowNull: false,
        type: DataTypes.STRING,
        primaryKey: true
      },
      name: {
        allowNull: false,
        type: DataTypes.STRING
      }
    },
    {
      sequelize,
      modelName: 'ApprovalStatus',
      tableName: 'ApprovalStatus',
      timestamps: false
    }
  )
  return ApprovalStatus
}
