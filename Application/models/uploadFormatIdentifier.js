'use strict'
const { Model } = require('sequelize')
module.exports = (sequelize, DataTypes) => {
  class UploadFormatIdentifier extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      // https://qiita.com/NewGyu/items/83390aa17dce1ffb4cd3
      UploadFormatIdentifier.belongsTo(models.UploadFormat, {
        foreignKey: 'uploadFormatId', // k1を指定
        targetKey: 'uploadFormatId', // k2を指定
        onDelete: 'cascade',
        onUpdate: 'cascade'
      })
    }

    static async getUploadFormatId(uploadFormatId) {
      try {
        const uploadFormatIds = await sequelize.models.UploadFormatIdentifier.findAll({
          where: {
            uploadFormatId: uploadFormatId
          }
        })
        return uploadFormatIds
      } catch (error) {
        return error
      }
    }
  }
  UploadFormatIdentifier.init(
    {
      uploadFormatId: {
        type: DataTypes.UUID,
        primaryKey: true,
        allowNull: false
      },
      serialNumber: {
        allowNull: false,
        primaryKey: true,
        type: DataTypes.INTEGER
      },
      extensionType: {
        allowNull: false,
        type: DataTypes.STRING
      },
      uploadFormatExtension: {
        allowNull: false,
        type: DataTypes.STRING
      },
      defaultExtension: {
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
      modelName: 'UploadFormatIdentifier',
      tableName: 'UploadFormatIdentifier'
    }
  )
  return UploadFormatIdentifier
}
