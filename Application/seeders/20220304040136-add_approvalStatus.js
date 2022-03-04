'use strict'

const tableName = 'ApprovalStatus'
module.exports = {
  up: async (queryInterface, Sequelize) => {
    const statusCode = ['00', '10', '20']
    const status = ['承認済み', '承認待ち', '差し戻し']
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
    return await queryInterface.bulkDelete(tableName, null, {})
  }
}
