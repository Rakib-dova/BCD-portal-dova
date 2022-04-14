'use strict'

module.exports = {
  up: async (queryInterface, Sequelize) => {
    /**
     * Add seed commands here.
     *
     * Example:
     * await queryInterface.bulkInsert('People', [{
     *   name: 'John Doe',
     *   isBetaMember: false
     * }], {});
     */
    await queryInterface.bulkInsert('Errors', [
      { userUuid: 'cdb928d1-ad66-4f34-95b8-55ec67b66c0c', invoiceNo: '000009', message: 'エラー内容1' },
      { userUuid: 'cdb928d1-ad66-4f34-95b8-55ec67b66c0c', invoiceNo: '000010', message: 'エラー内容2' },
      { userUuid: 'cdb928d1-ad66-4f34-95b8-55ec67b66c0c', invoiceNo: '000019', message: 'エラー内容3' },
      { userUuid: 'cdb928d1-ad66-4f34-95b8-55ec67b66c0c', invoiceNo: '000020', message: 'エラー内容4' },
      { userUuid: '15d2f570-b942-4e94-ba60-97b5d0b0f0a0', invoiceNo: '000010', message: 'エラー内容5' }
    ])
  },

  down: async (queryInterface, Sequelize) => {
    /**
     * Add commands to revert seed here.
     *
     * Example:
     * await queryInterface.bulkDelete('People', null, {});
     */
    await queryInterface.bulkDelete('Errors', null, {})
  }
}
