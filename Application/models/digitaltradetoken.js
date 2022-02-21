'use strict'
const { Model } = require('sequelize')
module.exports = (sequelize, DataTypes) => {
  class DigitaltradeToken extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      DigitaltradeToken.belongsTo(models.DigitaltradeUser, {
        foreignKey: 'digitaltradeId'
      })
    }
  }
  DigitaltradeToken.init(
    {
      dtToken: {
        type: DataTypes.STRING(255),
        primaryKey: true
      },
      digitaltradeId: DataTypes.UUID,
      fingerprint: DataTypes.STRING(255),
      tokenCategory: DataTypes.STRING(10),
      tokenFlg: DataTypes.BOOLEAN,
      expireDate: DataTypes.DATE
    },
    {
      sequelize,
      modelName: 'DigitaltradeToken'
    }
  )
  return DigitaltradeToken
}
