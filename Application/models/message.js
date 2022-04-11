'use strict'
const { Model } = require('sequelize')
module.exports = (sequelize, DataTypes) => {
  class message extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      message.belongsTo(models.User, {
        foreignKey: 'user',
        targetKey: 'userId'
      })
    }
  }
  message.init(
    {
      user: {
        type: DataTypes.UUID,
        primaryKey: true
      },
      requestNoticeCnt: DataTypes.INTEGER,
      rejectedNoticeCnt: DataTypes.INTEGER
    },
    {
      sequelize,
      modelName: 'message',
      tableName: 'message',
      timestamps: false
    }
  )
  return message
}
