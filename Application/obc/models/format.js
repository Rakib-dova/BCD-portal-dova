'use strict'
const { Model } = require('sequelize')
module.exports = (sequelize, DataTypes) => {
  class Format extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      Format.belongsTo(models.User, {
        foreignKey: 'userUuid',
        targetKey: 'uuid',
        onDelete: 'CASCADE'
      })
      Format.hasMany(models.Item, {
        foreignKey: 'formatId'
      })
    }
  }
  Format.init(
    {
      userUuid: DataTypes.UUID,
      name: DataTypes.STRING,
      createdUser: DataTypes.STRING,
      updatedUser: DataTypes.STRING
    },
    {
      sequelize,
      modelName: 'Format'
    }
  )
  return Format
}
