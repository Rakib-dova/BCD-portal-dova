'use strict'
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('PdfInvoices', {
      invoiceId: {
        type: Sequelize.UUID,
        primaryKey: true,
        allowNull: false
      },
      invoiceNo: {
        type: Sequelize.STRING(50)
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
        type: Sequelize.STRING(10)
      },
      paymentDate: {
        type: Sequelize.DATE
      },
      deliveryDate: {
        type: Sequelize.DATE
      },
      recCompany: {
        type: Sequelize.STRING(200)
      },
      recPost: {
        type: Sequelize.STRING(8)
      },
      recAddr1: {
        type: Sequelize.STRING(10)
      },
      recAddr2: {
        type: Sequelize.STRING(50)
      },
      recAddr3: {
        type: Sequelize.STRING(50)
      },
      sendTenantId: {
        type: Sequelize.UUID
      },
      sendCompany: {
        type: Sequelize.STRING(200)
      },
      sendPost: {
        type: Sequelize.STRING(8)
      },
      sendAddr1: {
        type: Sequelize.STRING(10)
      },
      sendAddr2: {
        type: Sequelize.STRING(50)
      },
      sendAddr3: {
        type: Sequelize.STRING(50)
      },
      bankName: {
        type: Sequelize.STRING(50)
      },
      branchName: {
        type: Sequelize.STRING(50)
      },
      accountType: {
        type: Sequelize.STRING(10)
      },
      accountName: {
        type: Sequelize.STRING(50)
      },
      accountNumber: {
        type: Sequelize.STRING(7)
      },
      note: {
        type: Sequelize.STRING(1500)
      },
      sealImpressionPath: {
        type: Sequelize.STRING(255),
        defaultValue: ''
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    })
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('PdfInvoices')
  }
}
