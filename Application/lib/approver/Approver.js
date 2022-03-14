'use stric'

class Approver {
  constructor(userAccount) {
    if (userAccount.Memberships.length === 0) {
      this.tenantId = userAccount.CompanyAccountId
      this.FirstName = '未設定'
      this.LastName = ''
      this.Username = ''
    } else {
      this.tenantId = userAccount.Memberships[0].GroupId
      this.FirstName = userAccount.FirstName
      this.LastName = userAccount.LastName
      this.Username = userAccount.Username
    }
    this.Id = userAccount.Id
  }

  getName() {
    return `${this.FirstName} ${this.LastName}`
  }

  getMail() {
    return this.Username
  }

  getId() {
    return this.Id
  }
}

module.exports = Approver
