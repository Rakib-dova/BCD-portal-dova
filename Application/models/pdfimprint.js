// 'use strict'
// const { Model } = require('DataTypes')
// module.exports = (sequelize, DataTypes) => {
//   class pdfImprint extends Model {
//     /**
//      * Helper method for defining associations.
//      * This method is not a part of DataTypes lifecycle.
//      * The `models/index` file will call this method automatically.
//      */
//     static associate(models) {
//       // define association here
//       pdfImprint.belongsTo(models.pdfInfo, {
//         foreignKey: 'invoiceId',
//         targetKey: 'invoiceId'
//       })
//     }
//   }
//   pdfImprint.init(
//     {
//       invoiceId: {
//         allowNull: false,
//         autoIncrement: true,
//         primaryKey: true,
//         references: {
//           model: {
//             tableName: 'pdfInfo'
//           },
//           key: 'invoiceId'
//         },
//         type: DataTypes.STRING
//       },
//       imprint: {
//         type: DataTypes.STRING
//       }
//     },
//     {
//       DataTypes,
//       modelName: 'pdfImprint'
//     }
//   )
//   return pdfImprint
// }
