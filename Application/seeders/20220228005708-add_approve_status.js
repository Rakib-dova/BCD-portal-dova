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
    const statusCode = ['90', '80', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20', '00']
    const status = [
      '差し戻し',
      '未処理',
      '承認依頼中',
      '一次承認済み',
      '二次承認済み',
      '三次承認済み',
      '四次承認済み',
      '五次承認済み',
      '六次承認済み',
      '七次承認済み',
      '八次承認済み',
      '九次承認済み',
      '十次承認済み',
      '最終承認済み'
    ]
    const datas = []

    for (let idx = 0; idx < status.length; idx++) {
      datas.push({
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
