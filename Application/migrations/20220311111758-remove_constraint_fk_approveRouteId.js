'use strict'
/**
 * fkNameForRequestApproval : RequestApprovalテーブルに設定されている外部キーのNameを指定（「FK__RequestAp__appro__」で始まるキー）
 * fkNameForApproval : Approvalテーブルに設定されている外部キーのNameを指定（「FK__Approval__approv__」で始まるキー）
 *
 * ★★★★★★★★★★★★※「FK__Approval__approv__」で始まるキーが複数ある場合の指定方法
 *                             １．SQLServerのApprovaテーブルのキーフォルダ確認
 *                             ２．「FK__Approval__approv__」で始まるキーを右クリックし、「Script as Create」をクリック
 *                             ３．下記のSQLが表示されるキーのNameを指定。
 *                                   ALTER TABLE [dbo].[Approval]  WITH CHECK ADD FOREIGN KEY([approveRouteId]) REFERENCES [dbo].[ApproveRoute] ([approveRouteId])
 */
const fkNameForRequestApproval = 'FK__RequestAp__appro__37FA4C37'
const fkNameForApproval = 'FK__Approval__approv__1E05700A'
module.exports = {
  up: async (queryInterface, Sequelize) => {
    return [
      await queryInterface.removeConstraint('RequestApproval', fkNameForRequestApproval),
      await queryInterface.removeConstraint('Approval', fkNameForApproval),
      await queryInterface.removeColumn('Approval', 'approveRouteId')
    ]
  },

  down: async (queryInterface, Sequelize) => {
    return [
      await queryInterface.addColumn('Approval', 'approveRouteId', {
        type: Sequelize.DataTypes.UUID,
        allowNull: true
      }),
      await queryInterface.addConstraint('RequestApproval', {
        fields: ['approveRouteId'],
        type: 'foreign key',
        name: fkNameForRequestApproval,
        references: {
          table: 'ApproveRoute',
          field: 'approveRouteId'
        },
        onDelete: 'cascade',
        onUpdate: 'cascade'
      }),
      await queryInterface.addConstraint('Approval', {
        fields: ['approveRouteId'],
        type: 'foreign key',
        name: fkNameForApproval,
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
