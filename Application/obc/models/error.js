'use strict'
const { Model } = require('sequelize')
module.exports = (sequelize, DataTypes) => {
  class Error extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      Error.belongsTo(models.User, {
        foreignKey: 'userUuid',
        targetKey: 'uuid',
        onDelete: 'CASCADE'
      })
    }
  }
  Error.init(
    {
      userUuid: DataTypes.UUID,
      invoiceNo: DataTypes.STRING,
      message: DataTypes.STRING
    },
    {
      sequelize,
      timestamps: false,
      modelName: 'Error'
    }
  )
  return Error
}
