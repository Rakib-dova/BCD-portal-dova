'use strict'
const { Model } = require('sequelize')
module.exports = (sequelize, DataTypes) => {
  class ChannelDepartment extends Model {
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
  ChannelDepartment.init(
    {
      code: {
        allowNull: false,
        type: DataTypes.STRING,
        primaryKey: true
      },
      name: {
        allowNull: false,
        type: DataTypes.STRING
      }
    },
    {
      sequelize,
      modelName: 'ChannelDepartment',
      tableName: 'ChannelDepartment',
      timestamps: false
    }
  )
  return ChannelDepartment
}
