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

    static async getUploadFormatList(tenantId) {
      try {
        // テナントで契約情報を取得
        const contractId = await sequelize.models.Contract.findOne({
          where: {
            tenantId: tenantId,
            deleteFlag: false
          }
        })
        // 契約情報でアップロードフォーマットのデータを取得
        // 作成日が優先順位にして並べる
        const uploadFormats = await sequelize.models.UploadFormat.findAll({
          where: {
            contractId: contractId.contractId
          },
          order: [['createdAt', 'DESC']]
        })

        return uploadFormats
      } catch (error) {
        // エラーが発生した場合、エラーObjectを渡す。
        return error
      }
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
      itemRowNo: {
        allowNull: false,
        type: DataTypes.INTEGER
      },
      dataStartRowNo: {
        allowNull: false,
        type: DataTypes.INTEGER
      },
      uploadType: {
        allowNull: false,
        type: DataTypes.STRING
      },
      uploadData: {
        allowNull: true,
        type: DataTypes.STRING(4000).BINARY
      },
      uploadFileName: {
        allowNull: true,
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
