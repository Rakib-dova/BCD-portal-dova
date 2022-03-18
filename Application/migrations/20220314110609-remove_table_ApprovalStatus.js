'use strict'

module.exports = {
  up: async (queryInterface, Sequelize) => {
    return [
      await queryInterface.bulkDelete('ApprovalStatus', null, {}),
      await queryInterface.dropTable('ApprovalStatus')
    ]
  },

  down: async (queryInterface, Sequelize) => {
    const statusCode = ['00', '10', '20']
    const status = ['承認済み', '承認待ち', '差し戻し']
    const datas = []

    for (let idx = 0; idx < status.length; idx++) {
      datas.push({
        code: statusCode[idx],
        name: status[idx]
      })
    }
    return [
      await queryInterface.createTable('ApprovalStatus', {
        code: {
          allowNull: false,
          primaryKey: true,
          type: Sequelize.DataTypes.STRING(2)
        },
        name: {
          allowNull: false,
          type: Sequelize.DataTypes.STRING(255)
        }
      }),
      await queryInterface.bulkInsert('ApprovalStatus', datas, {})
    ]
  }
}
