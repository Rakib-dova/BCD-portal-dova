'use strict'

const tableName = 'ApproveStatus'
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
    const statusCode = ['90', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20', '00']
    const status = [
      '未処理',
      '処理依頼中',
      '１次承認済み',
      '２次承認済み',
      '３次承認済み',
      '４次承認済み',
      '５次承認済み',
      '６次承認済み',
      '７次承認済み',
      '８次承認済み',
      '９次承認済み',
      '１０次承認済み',
      '最終承認済み'
    ]
    const datas = []

    for (let idx = 0; idx < status.length; idx++) {
      datas.push({
        no: idx + 1,
        code: statusCode[idx],
        name: status[idx]
      })
    }

    return await queryInterface.bulkInsert(tableName, datas, {})
  },

  down: async (queryInterface, Sequelize) => {
    /**
     * Add commands to revert seed here.
     *
     * Example:
     * await queryInterface.bulkDelete('People', null, {});
     */
    return await queryInterface.bulkDelete(tableName, null, {})
  }
}
