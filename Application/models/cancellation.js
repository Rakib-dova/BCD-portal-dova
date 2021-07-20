<<<<<<< HEAD
'use strict'
const { Model } = require('sequelize')
module.exports = (sequelize, DataTypes) => {
  class Contract extends Model {
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
=======
'use strict'
const { Model } = require('sequelize')
module.exports = (sequelize, DataTypes) => {
  return sequelize.define(
    "Cancellations",
    {
      cancelId: {
        type: DataTypes.UUIDV4,
        allowNull: false,
        primaryKey: true
      },
      contractId: {
        type: DataTypes.UUIDV4,
        allowNull: false,
        references: { model: Model.Contracts, key: 'contractId' }
      },
      cancelData: {
        type: DataTypes.STRING(40000),
        allowNull: true
      },
      createdAt: {
        type: DataTypes.DATE
      },
      updatedAt: {
        type: DataTypes.DATE 
     }
   },
   {})
}
>>>>>>> e7770f21a97803b7b9eabb1277d5d7c584d9b361
