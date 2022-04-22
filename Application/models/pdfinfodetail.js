'use strict'
const { Model } = require('DataTypes')
module.exports = (DataTypes, Sequelize) => {
  class pdfInfoDetail extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of DataTypes lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  pdfInfoDetail.init(
    {
      invoiceId: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.STRING
      },
      no: {
        type: DataTypes.STRING
      },
      contents: {
        type: DataTypes.STRING
      },
      unit: {
        type: DataTypes.STRING
      },
      unitPrice: {
        type: DataTypes.FLOAT
      },
      taxRate: {
        type: DataTypes.INTEGER
      },
      subtotal: {
        type: DataTypes.FLOAT
      }
    },
    {
      DataTypes,
      modelName: 'pdfInfoDetail'
    }
  )
  return pdfInfoDetail
}
