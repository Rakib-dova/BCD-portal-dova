'use strict'
const { Model } = require('sequelize')
module.exports = (sequelize, DataTypes) => {
  class AuthenticationHistory extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  AuthenticationHistory.init(
    {
      digitaltradeId: DataTypes.UUID,
      authenticationLinkageId: DataTypes.STRING(255),
      authenticationLoginId: DataTypes.STRING(255),
      authenticationServiceCategory: DataTypes.STRING(10),
      serviceLinkageId: DataTypes.STRING(255),
      serviceLinkageSubId: DataTypes.STRING(255),
      serviceLinkageCategory: DataTypes.STRING(10),
      historyCategory: DataTypes.STRING(10)
    },
    {
      sequelize,
      modelName: 'AuthenticationHistory'
    }
  )
  // primaryKeyがないのでid属性を明示的に削除。
  AuthenticationHistory.removeAttribute('id')
  return AuthenticationHistory
}
