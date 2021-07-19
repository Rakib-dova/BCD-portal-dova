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
