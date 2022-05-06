'use strict'
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('PdfInvoices', {
      invoiceId: {
        type: Sequelize.UUID,
        primaryKey: true,
        allowNull: false
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
      recCompany: {
        type: Sequelize.STRING(30)
      },
      recPost: {
        type: Sequelize.STRING(8)
      },
      recAddr1: {
        type: Sequelize.STRING(50)
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
      bankName: {
        type: Sequelize.STRING(50)
      },
      branchName: {
        type: Sequelize.STRING(30)
      },
      accountType: {
        type: Sequelize.STRING(30)
      },
      accountName: {
        type: Sequelize.STRING(30)
      },
      accountNumber: {
        type: Sequelize.STRING(30)
      },
      note: {
        type: Sequelize.STRING(150)
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
