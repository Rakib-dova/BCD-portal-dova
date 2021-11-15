'use strict'
const { Model } = require('sequelize')
module.exports = (sequelize, DataTypes) => {
  class CodeAccount extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      // https://qiita.com/NewGyu/items/83390aa17dce1ffb4cd3
      CodeAccount.belongsTo(models.Contract, {
        foreignKey: 'contractId', // k1を指定
        targetKey: 'contractId', // k2を指定
        onDelete: 'cascade',
        onUpdate: 'cascade'
      })
    }

    static async getCodeAccountList(tenantId) {
      try {
        // テナントで契約情報を取得
        const contractId = await sequelize.models.Contract.findOne({
          where: {
            tenantId: tenantId,
            deleteFlag: false
          }
        })
        // 契約情報で勘定科目のデータを取得
        // 作成日が優先順位にして並べる
        const codeAccounts = await sequelize.models.CodeAccount.findAll({
          where: {
            contractId: contractId.contractId
          },
          order: [['createdAt', 'DESC']]
        })

        return codeAccounts
      } catch (error) {
        // エラーが発生した場合、エラーObjectを渡す。
        return error
      }
    }
  }
  CodeAccount.init(
    {
      codeAccountId: {
        type: DataTypes.UUID,
        primaryKey: true,
        allowNull: false
      },
      contractId: {
        allowNull: false,
        type: DataTypes.UUID
      },
      subjectName: {
        allowNull: false,
        type: DataTypes.STRING
      },
      subjectCode: {
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
      modelName: 'CodeAccount',
      tableName: 'CodeAccount'
    }
  )
  return CodeAccount
}
