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
    let now = new Date()
    await queryInterface.bulkInsert(
      'Formats',
      [
        {
          id: 0,
          userUuid: '4b27a864-c46b-4d1f-9d12-bf50c89189ca',
          name: 'デフォルト',
          createdAt: now,
          createdUser: '-',
          updatedAt: now,
          updatedUser: '-'
        }
      ],
      {},
      {
        id: {
          autoIncrement: true
        }
      }
    )
  },

  down: async (queryInterface, Sequelize) => {
    /**
     * Add commands to revert seed here.
     *
     * Example:
     * await queryInterface.bulkDelete('People', null, {});
     */
    await queryInterface.bulkDelete('Formats', null, {})
  }
}
