'use strict'
const { Model } = require('sequelize')
module.exports = (sequelize, DataTypes) => {
  class UploadFormat extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      // https://qiita.com/NewGyu/items/83390aa17dce1ffb4cd3
      UploadFormat.belongsTo(models.Contract, {
        foreignKey: 'contractId', // k1を指定
        targetKey: 'contractId', // k2を指定
        onDelete: 'cascade',
        onUpdate: 'cascade'
      })
      UploadFormat.hasMany(models.UploadFormatDetail, {
        foreignKey: 'uploadFormatId' // k1を指定
      })
      UploadFormat.hasMany(models.UploadFormatIdentifier, {
        foreignKey: 'uploadFormatId' // k1を指定
      })
    }
  }
  UploadFormat.init(
    {
      uploadFormatId: {
        type: DataTypes.UUID,
        primaryKey: true,
        allowNull: false
      },
      contractId: {
        allowNull: false,
        type: DataTypes.UUID
      },
      setName: {
        allowNull: false,
        type: DataTypes.STRING
      },
      uploadType: {
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
      modelName: 'UploadFormat',
      tableName: 'UploadFormat'
    }
  )
  return UploadFormat
}
