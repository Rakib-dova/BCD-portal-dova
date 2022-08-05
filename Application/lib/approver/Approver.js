class Approver {
  constructor(userAccount) {
    if (userAccount.memberships.length === 0 || userAccount.state === 'LOCKED') {
      this.tenantId = userAccount.CompanyAccountId
      this.FirstName = '未設定'
      this.LastName = ''
      this.Username = ''
    } else {
      this.tenantId = userAccount.memberships[0].GroupId
      this.FirstName = userAccount.firstName
      this.LastName = userAccount.lastName
      this.Username = userAccount.email
    }
    this.Id = userAccount.id
  }

  getName() {
    return `${this.LastName} ${this.FirstName}`
  }

  getMail() {
    return this.Username
  }

  getId() {
    return this.Id
  }
}

module.exports = Approver
