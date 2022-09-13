'use strict'
/**
 * tableNameApproval : RequestApprovalテーブル名
 * tableNameRequestApproval : Approvalテーブル名
 * columnName : 削除対処カラム名
 */
const tableNameRequestApproval = 'RequestApproval'
const tableNameApproval = 'Approval'
const columnName = 'approveRouteId'

// approveRouteIdのforeignkey解除
module.exports = {
  up: async (queryInterface, Sequelize) => {
    const sqlGetFKNameRequestApproval = await queryInterface.sequelize.query(
      `select CONSTRAINT_NAME from information_schema.KEY_COLUMN_USAGE where table_name='${tableNameRequestApproval}' and COLUMN_NAME='${columnName}'`
    )

    const sqlGetFKNameApproval = await queryInterface.sequelize.query(
      `select CONSTRAINT_NAME from information_schema.KEY_COLUMN_USAGE where table_name='${tableNameApproval}' and COLUMN_NAME='${columnName}'`
    )

    // マイグレーション時に取得したFK名を確認のためにログ表示
    console.log(sqlGetFKNameRequestApproval[0][0].CONSTRAINT_NAME)
    console.log(sqlGetFKNameApproval[0][0].CONSTRAINT_NAME)

    return [
      await queryInterface.removeConstraint(
        tableNameRequestApproval,
        sqlGetFKNameRequestApproval[0][0].CONSTRAINT_NAME
      ),
      await queryInterface.removeConstraint(tableNameApproval, sqlGetFKNameApproval[0][0].CONSTRAINT_NAME),
      await queryInterface.removeColumn(tableNameApproval, columnName)
    ]
  },

  down: async (queryInterface, Sequelize) => {
    return [
      await queryInterface.addColumn(tableNameApproval, columnName, {
        type: Sequelize.DataTypes.UUID,
        allowNull: true
      }),
      await queryInterface.addConstraint(tableNameRequestApproval, {
        fields: ['approveRouteId'],
        type: 'foreign key',
        references: {
          table: 'ApproveRoute',
          field: 'approveRouteId'
        },
        onDelete: 'cascade',
        onUpdate: 'cascade'
      }),
      await queryInterface.addConstraint(tableNameApproval, {
        fields: ['approveRouteId'],
        type: 'foreign key',
        references: {
          table: 'ApproveRoute',
          field: 'approveRouteId'
        },
        onDelete: 'cascade',
        onUpdate: 'cascade'
      })
    ]
  }
}
