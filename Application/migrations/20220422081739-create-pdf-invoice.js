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
      sendRegistrationNo: {
        type: Sequelize.STRING(14)
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
      discountDescription1: {
        type: Sequelize.STRING(100)
      },
      discountAmount1: {
        type: Sequelize.DECIMAL(12, 0)
      },
      discountUnit1: {
        type: Sequelize.STRING(10)
      },
      discountDescription2: {
        type: Sequelize.STRING(100)
      },
      discountAmount2: {
        type: Sequelize.DECIMAL(12, 0)
      },
      discountUnit2: {
        type: Sequelize.STRING(10)
      },
      discountDescription3: {
        type: Sequelize.STRING(100)
      },
      discountAmount3: {
        type: Sequelize.DECIMAL(12, 0)
      },
      discountUnit3: {
        type: Sequelize.STRING(10)
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
