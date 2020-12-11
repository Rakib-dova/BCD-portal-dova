'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class User extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  };
  User.init({
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
  }, {
    sequelize,
    modelName: 'User',
  });
  return User;
};