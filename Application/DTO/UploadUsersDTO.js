const { v4: uuid } = require('uuid')

const factory = (contract, bulkInsertUserDataList) => {
  const product = []
  const tenantId = contract.tenantId
  const userTemplate = {
    Id: null,
    CompanyAccountId: contract.tenantId,
    Username: '',
    FirstName: '',
    LastName: '',
    Language: 'ja',
    TimeZone: 'Asia/Tokyo',
    State: 'CREATED',
    RoleId: null,
    Memberships: null,
    Type: 'PERSON',
    Visible: 'true'
  }

  for (let user of bulkInsertUserDataList) {
    const register = { ...userTemplate }
    user = user.split(',')
    if (user.length !== 2) return -1
    register.Id = uuid()
    register.Username = user[0]
    register.Memberships = userRole.getUserRole(user[1], tenantId, register.Id)
    register.RoleId = register.Memberships[0].Role
    product.push(register)
  }

  return product
}

const userRole = {
  '01': 'a6a3edcd-00d9-427c-bf03-4ef0112ba16d', // テナント管理者(Company admin)
  // '02': '29827a1a-4ba6-46e1-a720-52d227653c2d', // 文書管理なしテナント管理者(Company admin without documents)
  // '03': 'bcd0f0d1-a4d3-4981-9ba2-568a960a09fd', // 経理部門管理者(Accounts payable manager)
  '02': 'fe888fbb-172f-467c-b9ad-efe0720fecf9', // 経理部門担当者(Accounts payable)
  // '04': '05479e46-91b0-4aa1-8d87-8281430b1030', // 購買要求者(Requester)
  // '06': 'f42a3d94-4e8e-4b2d-8acf-9cae58d23d9b', // サプライヤーオンボーダー
  // '07': '7a92b67a-5f50-45ea-9757-4c370f9bf937', // サプライヤーバリデーター
  // '05': '8370ee3e-5f31-47bf-a139-d4218fb7689f', // 読み取り専用(Read-only)
  // '06': 'e9eb8dde-9477-4076-aef6-7ce6577b6edb', // 文書管理付き読み取り専用(Read-only plus documents)
  // 10: '37a511e3-7269-4dd7-b80e-013f543589b7', // トーク付き読み取り専用(Read-only plus conversations)
  // '07': 'ad298300-ea11-11e4-b571-0800200c9a66', // 制限されたアクセス
  // '08': '509ac71b-66af-4799-b8eb-741c79d9635f', // タスク管理者(Queue Manager)
  // '09': '260cbffb-d59e-47bd-81ea-ae7bba81448d', // タスクリゾルバー
  '03': '4fc13d38-6a97-4b48-a2f2-f16733a5a8ea', // 経理部門文書担当者(Accounts payable documents handler)
  // 11: '7915f40a-7564-4c20-b97a-01e277d03039', // 見積書の閲覧専用(Quote documents view-only access)
  // 12: '3b4f89a5-f733-4661-90e3-df6d856c441e', // Proforma Plans Creator

  getUserRole: function (roleNumber, tenantId, userId) {
    return [
      {
        UserId: userId ?? '',
        GroupId: tenantId ?? '',
        Role: this[roleNumber]
      }
    ]
  }
}

module.exports = {
  factory: factory
}
