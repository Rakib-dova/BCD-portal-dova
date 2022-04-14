'use strict'
const { Model } = require('sequelize')
module.exports = (sequelize, DataTypes) => {
  class Address extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      // https://qiita.com/NewGyu/items/83390aa17dce1ffb4cd3
    }
  }
  Address.init(
    {
      addressKey: {
        type: DataTypes.STRING,
        primaryKey: true
      },
      state: { type: DataTypes.STRING },
      city: { type: DataTypes.STRING },
      address1: { type: DataTypes.STRING },
      address2: { type: DataTypes.STRING },
      postalCode: { type: DataTypes.STRING }
    },
    {
      sequelize,
      modelName: 'Address',
      timestamps: false
    }
  )
  return Address
}
