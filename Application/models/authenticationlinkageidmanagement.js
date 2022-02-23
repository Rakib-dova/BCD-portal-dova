'use strict'
const { Model } = require('sequelize')
module.exports = (sequelize, DataTypes) => {
  class AuthenticationLinkageIdManagement extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      AuthenticationLinkageIdManagement.belongsTo(models.DigitaltradeUser, {
        foreignKey: 'digitaltradeId'
      })
    }
  }
  AuthenticationLinkageIdManagement.init(
    {
      digitaltradeId: {
        type: DataTypes.UUID,
        primaryKey: true
      },
      authenticationServiceCategory: {
        type: DataTypes.STRING(10),
        primaryKey: true
      },
      authenticationServiceUserId: DataTypes.STRING(255),
      authenticationServiceLoginId: DataTypes.STRING(255),
      authenticationServiceUserInfo: DataTypes.STRING(4000),
      deleteFlag: DataTypes.BOOLEAN
    },
    {
      sequelize,
      modelName: 'AuthenticationLinkageIdManagement'
    }
  )
  return AuthenticationLinkageIdManagement
}
