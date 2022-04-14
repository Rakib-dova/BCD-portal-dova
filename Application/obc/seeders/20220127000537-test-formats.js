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
    let dt = new Date(2022, 0, 25, 12, 34, 56, 789)
    await queryInterface.bulkInsert(
      'Formats',
      [
        {
          id: 1001,
          userUuid: 'cdb928d1-ad66-4f34-95b8-55ec67b66c0c',
          name: 'テスト1',
          createdAt: dt,
          createdUser: '作成者',
          updatedAt: dt,
          updatedUser: '更新者'
        },
        {
          id: 1002,
          userUuid: 'cdb928d1-ad66-4f34-95b8-55ec67b66c0c',
          name: 'テスト2',
          createdAt: dt,
          createdUser: '作成者',
          updatedAt: dt,
          updatedUser: '更新者'
        },
        {
          id: 1003,
          userUuid: '0bcaf981-8d3a-4eb4-a68c-fe5a5dbbfa21',
          name: 'テスト3',
          createdAt: dt,
          createdUser: '作成者',
          updatedAt: dt,
          updatedUser: '更新者'
        },
        {
          id: 1004,
          userUuid: '0bcaf981-8d3a-4eb4-a68c-fe5a5dbbfa21',
          name: 'テスト4',
          createdAt: dt,
          createdUser: '作成者',
          updatedAt: dt,
          updatedUser: '更新者'
        },
        {
          id: 1005,
          userUuid: '0bcaf981-8d3a-4eb4-a68c-fe5a5dbbfa21',
          name: 'テスト5',
          createdAt: dt,
          createdUser: '作成者',
          updatedAt: dt,
          updatedUser: '更新者'
        },
        {
          id: 1006,
          userUuid: 'cdb928d1-ad66-4f34-95b8-55ec67b66c0c',
          name: 'テスト6',
          createdAt: dt,
          createdUser: '作成者',
          updatedAt: dt,
          updatedUser: '更新者'
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
