'use strict'
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('pdfInvoiceUploadDetails', {
      invoiceUploadDetailId: {
        allowNull: false,
        primaryKey: true,
        type: Sequelize.UUID
      },
      invoiceUploadId: {
        allowNull: false,
        type: Sequelize.UUID,
        references: {
          model: { tableName: 'pdfInvoiceUploads' },
          key: 'invoiceUploadId'
        },
        onUpdate: 'cascade',
        onDelete: 'cascade'
      },
      lines: {
        allowNull: false,
        type: Sequelize.INTEGER
      },
      invoiceId: {
        allowNull: false,
        type: Sequelize.STRING
      },
      status: {
        allowNull: false,
        type: Sequelize.STRING
      },
      errorData: {
        type: Sequelize.STRING(4000)
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
    await queryInterface.dropTable('pdfInvoiceUploadDetails')
  }
}
