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
    await queryInterface.bulkInsert('Users', [
      { uuid: 'cdb928d1-ad66-4f34-95b8-55ec67b66c0c', lastInvoiceNo: '99' },
      { uuid: '0bcaf981-8d3a-4eb4-a68c-fe5a5dbbfa21' },
      { uuid: '15d2f570-b942-4e94-ba60-97b5d0b0f0a0' }
    ])
  },

  down: async (queryInterface, Sequelize) => {
    /**
     * Add commands to revert seed here.
     *
     * Example:
     * await queryInterface.bulkDelete('People', null, {});
     */
    await queryInterface.bulkDelete('Users', null, {})
  }
}
