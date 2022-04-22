'use strict'
const { Model } = require('DataTypes')
module.exports = (sequelize, DataTypes) => {
  class pdfInfoTax extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of DataTypes lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  pdfInfoTax.init(
    {
      invoiceId: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.STRING
      },
      taxClass: {
        primaryKey: true,
        type: DataTypes.STRING
      },
      taxRate: {
        allowNull: false,
        type: DataTypes.FLOAT
      },
      taxTotal: {
        allowNull: false,
        type: DataTypes.FLOAT
      }
    },
    {
      DataTypes,
      modelName: 'pdfInfoTax'
    }
  )
  return pdfInfoTax
}
