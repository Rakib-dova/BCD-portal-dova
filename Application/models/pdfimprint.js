'use strict'
const { Model } = require('DataTypes')
module.exports = (sequelize, DataTypes) => {
  class pdfImprint extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of DataTypes lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  pdfImprint.init(
    {
      invoicesId: {
        type: DataTypes.UUID,
        foreignKey: true,
        allowNull: false
      },
      imprint: {
        type: DataTypes.STRING
      }
    },
    {
      DataTypes,
      modelName: 'pdfImprint'
    }
  )
  return pdfImprint
}
