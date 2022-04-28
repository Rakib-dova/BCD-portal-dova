'use strict'
const { Model } = require('sequelize')
module.exports = (sequelize, DataTypes) => {
  class pdfInvoice extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  pdfInvoice.init(
    {
      invoicesId: {
        type: DataTypes.UUID,
        primaryKey: true,
        allowNull: false
      },
      tmpFlg: {
        type: DataTypes.BOOLEAN
      },
      outputDate: {
        type: DataTypes.DATE
      },
      billingDate: {
        type: DataTypes.DATE
      },
      currency: {
        type: DataTypes.STRING
      },
      paymentDate: {
        type: DataTypes.DATE
      },
      deliveryDate: {
        type: DataTypes.DATE
      },
      destCompany: {
        type: DataTypes.STRING
      },
      destPost: {
        type: DataTypes.STRING
      },
      destAddr1: {
        type: DataTypes.STRING
      },
      destAddr2: {
        type: DataTypes.STRING
      },
      destAddr3: {
        type: DataTypes.STRING
      },
      sendCompany: {
        type: DataTypes.STRING
      },
      sendPost: {
        type: DataTypes.STRING
      },
      sendAddr1: {
        type: DataTypes.STRING
      },
      sendAddr2: {
        type: DataTypes.STRING
      },
      sendAddr3: {
        type: DataTypes.STRING
      },
      subtotal: {
        type: DataTypes.INTEGER
      },
      taxTotal: {
        type: DataTypes.INTEGER
      },
      total: {
        type: DataTypes.INTEGER
      },
      bankName: {
        type: DataTypes.STRING
      },
      bankBranch: {
        type: DataTypes.STRING
      },
      bnakSubject: {
        type: DataTypes.STRING
      },
      bankAccount: {
        type: DataTypes.STRING
      },
      bankNo: {
        type: DataTypes.STRING
      },
      note: {
        type: DataTypes.STRING
      },
      imprintPath: {
        type: DataTypes.STRING
      }
    },
    {
      sequelize,
      modelName: 'pdfInvoice'
    }
  )
  return pdfInvoice
}
