'use strict'
const { Model, QueryTypes } = require('sequelize')
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

    static async getsubAccountCodeList(contract) {
      try {
        const result = await sequelize.query(
          'SELECT subjectName, subjectCode, accountCodeName, subAccountCodeId, dbo.SubAccountCode.updatedAt as updatedAt FROM dbo.SubAccountCode INNER JOIN dbo.AccountCode ON dbo.SubAccountCode.accountCodeId = dbo.AccountCode.accountCodeId  WHERE dbo.AccountCode.contractId = ?  ORDER BY subjectCode',
          { replacements: [contract.dataValues.contractId], type: QueryTypes.SELECT }
        )

        return result
      } catch (error) {
        // エラーが発生した場合、エラーObjectを渡す。
        return error
      }
    }

    static async test(contract) {
      return []
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
      subjectName: {
        allowNull: false,
        type: DataTypes.STRING,
        validate: {
          len: [1, 40]
        }
      },
      subjectCode: {
        allowNull: false,
        type: DataTypes.STRING,
        validate: {
          is: /^[a-zA-Z0-9]*$/i,
          len: [1, 10]
        }
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
