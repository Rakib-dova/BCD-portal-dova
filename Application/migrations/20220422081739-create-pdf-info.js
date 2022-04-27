'use strict'
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('PdfInfos', {
      invoiceId: {
        allowNull: false,
        primaryKey: true,
        type: Sequelize.UUID
      },
      tmpFlg: {
        type: Sequelize.BOOLEAN,
        defaultValue: 'false'
      },
      outputDate: {
        type: Sequelize.DATE
      },
      billingDate: {
        type: Sequelize.DATE
      },
      currency: {
        type: Sequelize.STRING(5)
      },
      paymentDate: {
        type: Sequelize.DATE
      },
      deliveryDate: {
        type: Sequelize.DATE
      },
      destCompany: {
        type: Sequelize.STRING(30)
      },
      destPost: {
        type: Sequelize.STRING(8)
      },
      destAddr1: {
        type: Sequelize.STRING(50)
      },
      destAddr2: {
        type: Sequelize.STRING(50)
      },
      destAddr3: {
        type: Sequelize.STRING(50)
      },
      sendCompany: {
        type: Sequelize.STRING(30)
      },
      sendPost: {
        type: Sequelize.STRING(8)
      },
      sendAddr1: {
        type: Sequelize.STRING(50)
      },
      sendAddr2: {
        type: Sequelize.STRING(50)
      },
      sendAddr3: {
        type: Sequelize.STRING(50)
      },
      subtotal: {
        type: Sequelize.INTEGER
      },
      taxTotal: {
        type: Sequelize.INTEGER
      },
      total: {
        type: Sequelize.INTEGER
      },
      bankName: {
        type: Sequelize.STRING(50)
      },
      bankBranch: {
        type: Sequelize.STRING(30)
      },
      bnakSubject: {
        type: Sequelize.STRING(30)
      },
      bankAccount: {
        type: Sequelize.STRING(30)
      },
      bankNo: {
        type: Sequelize.STRING(30)
      },
      note: {
        type: Sequelize.STRING(150)
      },
      imprintPath: {
        type: Sequelize.STRING(255)
      }
    })
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('PdfInfos')
  }
}
