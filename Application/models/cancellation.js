'use strict'
const { Model } = require('sequelize')
module.exports = (sequelize, DataTypes) => {
  class Cancellation extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      Cancellation.belongsTo(models.Contract, {
        foreignKey: 'contractId', // k1を指定
        targetKey: 'contractId' // k2を指定
      })
    }
  }
  Cancellation.init(
    {
      cancelId: {
        type: DataTypes.UUID,
        primaryKey: true
      },
      contractId: DataTypes.UUID,
      cancelData: DataTypes.STRING(4000),
      createdAt: DataTypes.DATE,
      updatedAt: DataTypes.DATE
    },
    {
      sequelize,
      modelName: 'Cancellation'
    }
  )
  return Cancellation
}
