// 'use strict'
// module.exports = {
//   up: async (queryInterface, Sequelize) => {
//     await queryInterface.createTable('pdfImprints', {
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
//         type: Sequelize.STRING(50)
//       },
//       imprint: {
//         type: Sequelize.STRING(512)
//       }
//     })
//   },
//   down: async (queryInterface, Sequelize) => {
//     await queryInterface.dropTable('pdfImprints')
//   }
// }
