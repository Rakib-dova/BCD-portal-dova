'use strict'
const { Model } = require('sequelize')
module.exports = (sequelize, DataTypes) => {
  class User extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      // https://qiita.com/NewGyu/items/83390aa17dce1ffb4cd3
      User.belongsTo(models.Tenant, {
        foreignKey: 'tenantId', // k1を指定
        targetKey: 'tenantId' // k2を指定
      })
    }
  }
  User.init(
    {
      userId: {
        type: DataTypes.UUID,
        primaryKey: true
      },
      tenantId: DataTypes.UUID,
      userRole: DataTypes.UUID,
      appVersion: DataTypes.STRING,
      refreshToken: DataTypes.STRING(840),
      subRefreshToken: DataTypes.STRING(840),
      userStatus: DataTypes.INTEGER,
      lastRefreshedAt: DataTypes.DATE
    },
    {
      sequelize,
      modelName: 'User'
    }
  )
  return User
}
