'use strict'
const { Model } = require('sequelize')
module.exports = (sequelize, DataTypes) => {
  class SubAccountCode extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      // https://qiita.com/NewGyu/items/83390aa17dce1ffb4cd3
      SubAccountCode.belongsTo(models.AccountCode, {
        foreignKey: 'accountCodeId', // k1を指定
        targetKey: 'accountCodeId', // k2を指定
        onDelete: 'cascade',
        onUpdate: 'cascade'
      })
    }
  }
  SubAccountCode.init(
    {
      subAccountCodeId: {
        type: DataTypes.UUID,
        primaryKey: true,
        allowNull: false
      },
      accountCodeId: {
        allowNull: false,
        type: DataTypes.UUID
      },
      accountCode: {
        allowNull: false,
        type: DataTypes.STRING
      },
      subjectName: {
        allowNull: false,
        type: DataTypes.STRING
      },
      subjectCode: {
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
      modelName: 'SubAccountCode',
      tableName: 'SubAccountCode'
    }
  )
  return SubAccountCode
}
