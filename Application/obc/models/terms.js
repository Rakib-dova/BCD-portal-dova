'use strict'
const { Model } = require('sequelize')
module.exports = (sequelize, DataTypes) => {
  class Terms extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  Terms.init(
    {
      version: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.INTEGER
      },
      content: DataTypes.STRING,
      effectiveAt: DataTypes.DATE
    },
    {
      sequelize,
      timestamps: false,
      modelName: 'Terms'
    }
  )
  return Terms
}
