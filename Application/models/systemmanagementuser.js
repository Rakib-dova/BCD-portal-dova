'use strict'
const { Model } = require('sequelize')
module.exports = (sequelize, DataTypes) => {
  class SystemManagementUser extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  SystemManagementUser.init(
    {
      sysManagementUser: {
        type: DataTypes.STRING(255),
        primaryKey: true
      },
      hashPassword: DataTypes.STRING(255)
    },
    {
      sequelize,
      modelName: 'SystemManagementUser'
    }
  )
  return SystemManagementUser
}
