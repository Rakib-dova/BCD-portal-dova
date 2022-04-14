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
    await queryInterface.bulkInsert('Tenants', [
      {
        userUuid: 'cdb928d1-ad66-4f34-95b8-55ec67b66c0c',
        tenantUuid: '9a924353-954a-4a08-b5ec-9209cf4f66d2',
        formatId: 1002
      },
      {
        userUuid: 'cdb928d1-ad66-4f34-95b8-55ec67b66c0c',
        tenantUuid: '2388ebb2-3dab-4e90-9378-d425cf2d46ad',
        formatId: 1001
      },
      {
        userUuid: 'cdb928d1-ad66-4f34-95b8-55ec67b66c0c',
        tenantUuid: 'b1ca2fe9-4a80-44b0-a6de-46ed7a2d7eba',
        formatId: 1002
      },
      {
        userUuid: '15d2f570-b942-4e94-ba60-97b5d0b0f0a0',
        tenantUuid: 'f1cbf995-abe3-4ba3-80b3-bcdd4cd0281b',
        formatId: 1003
      }
    ])
  },

  down: async (queryInterface, Sequelize) => {
    /**
     * Add commands to revert seed here.
     *
     * Example:
     * await queryInterface.bulkDelete('People', null, {});
     */
    await queryInterface.bulkDelete('Tenants', null, {})
  }
}
