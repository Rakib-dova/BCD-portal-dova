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
      User.hasMany(models.Format, {
        foreignKey: 'userUuid'
      })
      User.hasMany(models.Tenant, {
        foreignKey: 'userUuid'
      })
      User.hasMany(models.Error, {
        foreignKey: 'userUuid'
      })
    }
  }
  User.init(
    {
      uuid: {
        allowNull: false,
        primaryKey: true,
        type: DataTypes.UUID
      },
      previewRecipientUuid: DataTypes.UUID,
      tosVersion: DataTypes.INTEGER,
      lastInvoiceNo: DataTypes.STRING
    },
    {
      sequelize,
      timestamps: false,
      modelName: 'User'
    }
  )
  return User
}
