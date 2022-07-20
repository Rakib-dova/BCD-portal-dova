'use strict'
const { Model } = require('sequelize')
module.exports = (sequelize, DataTypes) => {
  class PdfInvoice extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      PdfInvoice.hasMany(models.PdfInvoiceLine, {
        foreignKey: 'invoiceId',
        sourceKey: 'invoiceId'
      })
      PdfInvoice.hasOne(models.PdfSealImp, {
        foreignKey: 'invoiceId',
        sourceKey: 'invoiceId'
      })
    }
  }
  PdfInvoice.init(
    {
      invoiceId: {
        type: DataTypes.UUID,
        primaryKey: true,
        allowNull: false
      },
      invoiceNo: {
        type: DataTypes.STRING
      },
      tmpFlg: {
        type: DataTypes.BOOLEAN,
        defaultValue: 'false'
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
      recCompany: {
        type: DataTypes.STRING
      },
      recPost: {
        type: DataTypes.STRING
      },
      recAddr1: {
        type: DataTypes.STRING
      },
      recAddr2: {
        type: DataTypes.STRING
      },
      recAddr3: {
        type: DataTypes.STRING
      },
      sendTenantId: {
        type: DataTypes.UUID
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
      sendRegistrationNo: {
        type: DataTypes.STRING
      },
      bankName: {
        type: DataTypes.STRING
      },
      branchName: {
        type: DataTypes.STRING
      },
      accountType: {
        type: DataTypes.STRING
      },
      accountName: {
        type: DataTypes.STRING
      },
      accountNumber: {
        type: DataTypes.STRING
      },
      note: {
        type: DataTypes.STRING
      },
      sealImpressionPath: {
        type: DataTypes.STRING
      },
      discounts: {
        type: DataTypes.INTEGER
      },
      discountDescription1: {
        type: DataTypes.STRING
      },
      discountAmount1: {
        type: DataTypes.FLOAT
      },
      discountUnit1: {
        type: DataTypes.STRING
      },
      discountDescription2: {
        type: DataTypes.STRING
      },
      discountAmount2: {
        type: DataTypes.FLOAT
      },
      discountUnit2: {
        type: DataTypes.STRING
      },
      discountDescription3: {
        type: DataTypes.STRING
      },
      discountAmount3: {
        type: DataTypes.FLOAT
      },
      discountUnit3: {
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
      modelName: 'PdfInvoice'
    }
  )
  return PdfInvoice
}
