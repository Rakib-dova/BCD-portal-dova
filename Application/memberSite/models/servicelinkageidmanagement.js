'use strict'
const { Model } = require('sequelize')
module.exports = (sequelize, DataTypes) => {
  class ServiceLinkageIdManagement extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      ServiceLinkageIdManagement.belongsTo(models.DigitaltradeUser, {
        foreignKey: 'digitaltradeId'
      })
    }
  }
  ServiceLinkageIdManagement.init(
    {
      digitaltradeId: {
        type: DataTypes.UUID,
        primaryKey: true
      },
      serviceCategory: {
        type: DataTypes.STRING(10),
        primaryKey: true
      },
      serviceUserId: DataTypes.STRING(255),
      serviceSubId: DataTypes.STRING(255),
      serviceUserInfo: DataTypes.STRING(4000),
      deleteFlag: DataTypes.BOOLEAN
    },
    {
      sequelize,
      modelName: 'ServiceLinkageIdManagement'
    }
  )
  return ServiceLinkageIdManagement
}
