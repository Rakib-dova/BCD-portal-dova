'use strict'
const { Model } = require('sequelize')
module.exports = (sequelize, DataTypes) => {
  class Contract extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      Contract.belongsTo(models.Tenant, {
        foreignKey: 'tenantId', // k1を指定
        targetKey: 'tenantId', // k2を指定
        onDelete: 'cascade',
        onUpdate: 'cascade'
      })

      Contract.hasMany(models.RequestApproval, {
        foreignKey: 'contractId'
      })

      Contract.hasMany(models.JournalizeInvoice, {
        foreignKey: 'contractId'
      })
    }

    async getCoding(isCloedApproval, documentId) {
      const contractId = this.contractId
      const closedStatus = (
        await sequelize.models.ApproveStatus.findOne({
          where: {
            name: '最終承認済み'
          }
        })
      ).code

      if (isCloedApproval) {
        const resultOfClosedApproval = await sequelize.models.RequestApproval.findOne({
          where: {
            status: closedStatus,
            invoiceId: documentId,
            contractId: contractId
          }
        })

        if (!resultOfClosedApproval) {
          return null
        }
      }

      const codings = await sequelize.models.JournalizeInvoice.findAll({
        where: {
          contractId: contractId,
          invoiceId: documentId
        },
        order: [
          ['lineNo', 'ASC'],
          ['journalNo', 'ASC']
        ]
      })

      return codings.length !== 0 ? codings : null
    }
  }
  Contract.init(
    {
      contractId: {
        type: DataTypes.UUID,
        primaryKey: true
      },
      tenantId: DataTypes.UUID,
      serviceType: DataTypes.STRING,
      numberN: DataTypes.STRING,
      contractStatus: DataTypes.STRING,
      deleteFlag: DataTypes.BOOLEAN,
      createdAt: DataTypes.DATE,
      updatedAt: DataTypes.DATE
    },
    {
      sequelize,
      modelName: 'Contract'
    }
  )
  return Contract
}
