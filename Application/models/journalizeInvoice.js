'use strict'
const { Model, UUIDV4 } = require('sequelize')
module.exports = (sequelize, DataTypes) => {
  class JournalizeInvoice extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      // https://qiita.com/NewGyu/items/83390aa17dce1ffb4cd3
      JournalizeInvoice.belongsTo(models.Contract, {
        foreignKey: 'contractId', // k1を指定
        targetKey: 'contractId' // k2を指定
      })
    }
  }
  JournalizeInvoice.init(
    {
      journalId: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: UUIDV4
      },
      contractId: {
        type: DataTypes.UUID,
        references: {
          model: {
            tableName: 'Contracts'
          },
          key: 'contractId'
        }
      },
      invoiceId: { type: DataTypes.UUID, allowNull: false },
      lineNo: { type: DataTypes.INTEGER, allowNull: false },
      lineId: { type: DataTypes.STRING, allowNull: false },
      accountCode: {
        type: DataTypes.STRING(10),
        allowNull: true
      },
      subAccountCode: {
        type: DataTypes.STRING(10),
        allowNull: true
      },
      departmentCode: {
        type: DataTypes.STRING(10),
        allowNull: true
      },
      installmentAmount: {
        type: DataTypes.DECIMAL(13, 4)
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false
      }
    },
    {
      sequelize,
      modelName: 'JournalizeInvoice',
      freezeTableName: true,
      tableName: 'Journalize_invoice',
      timestamps: true
    }
  )
  return JournalizeInvoice
}
