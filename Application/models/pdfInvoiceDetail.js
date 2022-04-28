'use strict'
const { Model } = require('DataTypes')
module.exports = (DataTypes, Sequelize) => {
  class pdfInvoiceDetail extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of DataTypes lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      pdfInvoiceDetail.belongsTo(models.pdfInvoice, {
        foreignKey: 'invoiceId',
        targetKey: 'invoiceId'
      })
    }
  }
  pdfInvoiceDetail.init(
    {
      invoiceId: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        references: {
          model: {
            tableName: 'pdfInvoice'
          },
          key: 'invoiceId'
        },
        type: DataTypes.STRING
      },
      no: {
        primaryKey: true,
        type: DataTypes.STRING
      },
      contents: {
        type: DataTypes.STRING
      },
      unit: {
        type: DataTypes.STRING
      },
      unitPrice: {
        type: DataTypes.INTEGER
      },
      taxRate: {
        type: DataTypes.INTEGER
      },
      subtotal: {
        type: DataTypes.INTEGER
      }
    },
    {
      DataTypes,
      modelName: 'pdfInvoiceDetail'
    }
  )
  return pdfInvoiceDetail
}
