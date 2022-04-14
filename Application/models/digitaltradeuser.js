'use strict'
const { Model } = require('sequelize')
module.exports = (sequelize, DataTypes) => {
  class DigitaltradeUser extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      DigitaltradeUser.hasOne(models.DigitaltradeToken, {
        foreignKey: 'digitaltradeId'
      })

      DigitaltradeUser.hasMany(models.ServiceLinkageIdManagement, {
        foreignKey: 'digitaltradeId'
      })

      DigitaltradeUser.hasMany(models.AuthenticationLinkageIdManagement, {
        foreignKey: 'digitaltradeId'
      })
    }
  }
  DigitaltradeUser.init(
    {
      digitaltradeId: {
        type: DataTypes.UUID,
        primaryKey: true
      },
      deleteFlag: DataTypes.BOOLEAN
    },
    {
      sequelize,
      modelName: 'DigitaltradeUser'
    }
  )
  return DigitaltradeUser
}
