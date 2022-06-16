'use strict'
const { Model } = require('sequelize')
module.exports = (sequelize, DataTypes) => {
  class AccountCode extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      // https://qiita.com/NewGyu/items/83390aa17dce1ffb4cd3
      AccountCode.belongsTo(models.Contract, {
        foreignKey: 'contractId', // k1を指定
        targetKey: 'contractId', // k2を指定
        onDelete: 'cascade',
        onUpdate: 'cascade'
      })
      AccountCode.hasMany(models.SubAccountCode, {
        foreignKey: 'accountCodeId' // k1
      })
    }

    static async getAccountCodeList(tenantId) {
      try {
        // テナントで契約情報を取得
        const contractId = await sequelize.models.Contract.findOne({
          where: {
            tenantId: tenantId,
            serviceType: '010',
            deleteFlag: false
          }
        })
        // 契約情報で勘定科目のデータを取得
        // 作成日が優先順位にして並べる
        const accountCodes = await sequelize.models.AccountCode.findAll({
          where: {
            contractId: contractId.contractId
          },
          order: [['createdAt', 'DESC']]
        })

        return accountCodes
      } catch (error) {
        // エラーが発生した場合、エラーObjectを渡す。
        return error
      }
    }
  }
  AccountCode.init(
    {
      accountCodeId: {
        type: DataTypes.UUID,
        primaryKey: true,
        allowNull: false
      },
      contractId: {
        allowNull: false,
        type: DataTypes.UUID
      },
      accountCodeName: {
        allowNull: false,
        type: DataTypes.STRING,
        validate: {
          len: [1, 40]
        }
      },
      accountCode: {
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
      modelName: 'AccountCode',
      tableName: 'AccountCode'
    }
  )
  return AccountCode
}
