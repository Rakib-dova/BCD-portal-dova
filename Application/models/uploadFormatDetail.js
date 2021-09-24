'use strict'
const { Model } = require('sequelize')
module.exports = (sequelize, DataTypes) => {
  class UploadFormatDetail extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      // https://qiita.com/NewGyu/items/83390aa17dce1ffb4cd3
      UploadFormatDetail.belongsTo(models.UploadFormat, {
        foreignKey: 'uploadFormatId', // k1を指定
        targetKey: 'uploadFormatId', // k2を指定
        onDelete: 'cascade',
        onUpdate: 'cascade'
      })
    }
  }
  UploadFormatDetail.init(
    {
      uploadFormatId: {
        type: DataTypes.UUID,
        primaryKey: true,
        allowNull: false
      },
      serialNumber: {
        allowNull: false,
        primaryKey: true,
        type: DataTypes.STRING
      },
      uploadFormatItemName: {
        allowNull: false,
        type: DataTypes.STRING
      },
      uploadFormatNumber: {
        allowNull: false,
        type: DataTypes.INTEGER
      },
      defaultItemName: {
        allowNull: false,
        type: DataTypes.STRING
      },
      defaultNumber: {
        allowNull: false,
        type: DataTypes.INTEGER
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
      modelName: 'UploadFormatDetail'
    }
  )
  return UploadFormatDetail
}
